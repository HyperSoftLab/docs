# Инструкция по установке агента New Relic Java-агента в Docker

Вы получили архив `java-agent-docker.tar.gz`.

### 1\. Подготовка файлов

Положите архив `java-agent-docker.tar.gz` в корень вашего проекта, рядом с `Dockerfile`.

### 2\. Обновление Dockerfile

Добавьте шаги распаковки агента и настройки переменных окружения. В контейнерах рекомендуется использовать `ENV` вместо правки файла `newrelic.yml`.

Пример `Dockerfile`:

```
FROM openjdk:11-jre-slim

# --- УСТАНОВКА АГЕНТА ---
# 1. Копируем архив агента в контейнер
COPY java-agent-docker.tar.gz /tmp/agent.tar.gz

# 2. Распаковываем в /opt/newrelic и удаляем архив
RUN mkdir -p /opt && \
    tar -xzf /tmp/agent.tar.gz -C /opt && \
    rm /tmp/agent.tar.gz
# Теперь агент доступен по пути: /opt/newrelic/newrelic.jar

# --- ВАШЕ ПРИЛОЖЕНИЕ ---
COPY target/my-app.jar /app/my-app.jar
WORKDIR /app

# --- КОНФИГУРАЦИЯ АГЕНТА (Через ENV) ---
# Лицензионный ключ(заглушка, не меняем)
ENV NEW_RELIC_LICENSE_KEY="0123456789-123456789-123456789-123456789" \
    NEW_RELIC_APP_NAME="MY_DOCKER_APP" \
    NEW_RELIC_HOST="gmonit-collector.<DOMAIN>.ru" \
    NEW_RELIC_LOG="stdout"

# Если нужны кастомные сертификаты (раскомментировать при необходимости)
# COPY rootCA.crt /opt/newrelic/rootCA.crt
# ENV NEW_RELIC_CA_BUNDLE_PATH="/opt/newrelic/rootCA.crt"

# --- ЗАПУСК ---
# Добавляем -javaagent к запуску
ENTRYPOINT ["java", "-javaagent:/opt/newrelic/newrelic.jar", "-jar", "/app/my-app.jar"]
```

### 3\. Сборка образа

Выполните сборку:

```
docker build -t my-java-app:with-monitoring .
```

### 4\. Проверка (локальный запуск)

Запустите контейнер локально, чтобы убедиться в корректности подключения:

```
docker run --rm my-java-app:with-monitoring
```

Смотрите вывод в консоли (`stdout`).

**Критерии успеха:**

1.  Приложение стартует без ошибок.
    
2.  В логах есть сообщения от `com.newrelic`.
    
3.  Нет ошибок SSL (`SSLHandshakeException`) или соединения с хостом коллектора.


# Установка APM-агента для Java в K8S

Вы получили архив `java-apm-k8s-offline.tar.gz`.

**Целевая среда:** Kubernetes 1.25+ (любой дистрибутив), container runtime containerd или Docker, `kubectl` с доступом к кластеру, закрытый контур без выхода в интернет.

### 1\. Распаковка архива

```
tar -xzvf java-apm-k8s-offline.tar.gz
cd java-apm-k8s-bundle
```

### 2\. Загрузка образа-донора в containerd кластера

**Вариант А: импорт на каждую ноду кластера (containerd напрямую)**

Скопировать `images/newrelic-java-agent-9.1.0.tar` на каждую worker-ноду и выполнить:

```
# Для k3s:
sudo k3s ctr images import newrelic-java-agent-9.1.0.tar

# Для стандартного k8s с containerd:
sudo ctr -n k8s.io images import newrelic-java-agent-9.1.0.tar

# Для кластера на Docker (устарело, но встречается):
docker load -i newrelic-java-agent-9.1.0.tar
```

Проверка:

```
sudo k3s ctr images ls -q | grep newrelic-java-agent
# Ожидается: docker.io/library/newrelic-java-agent:9.1.0
```

**Вариант Б: push в приватный registry клиента (Harbor/Nexus/etc)**

На машине с доступом и к архиву, и к registry клиента:

```
docker load -i images/newrelic-java-agent-9.1.0.tar
docker tag newrelic-java-agent:9.1.0 <REGISTRY>/newrelic-java-agent:9.1.0
docker push <REGISTRY>/newrelic-java-agent:9.1.0
```

В `04-deployment-example.yaml` заменить `<REGISTRY>/newrelic-java-agent:9.1.0` на реальный путь и выставить `imagePullPolicy: IfNotPresent`.

### 3\. Подготовка манифестов

В каждом файле `manifests/*.yaml` заменить плейсхолдеры:

| Плейсхолдер | На что заменить | Пример |
| --- | --- | --- |
| `<NAMESPACE>` | Namespace вашего приложения | `payments` |
| `<APP_NAME>` | Имя приложения в GMONIT | `eldic-payment-service` |
| `<COLLECTOR_HOST>` | FQDN коллектора GMONIT | `collector.gmonit.internal` |
| `<REGISTRY>` | Путь к вашему registry (или `docker.io/library` для локального импорта в containerd) | `registry.bank.kg/library` |
| `<ВАШЕ_ПРИЛОЖЕНИЕ>:<TAG>` | Образ вашего Java-приложения | `eldic-payment:1.0.0` |

Заменить license\_key в `02-secret-license.yaml` на выданный инженером GMONIT (в кавычках, как в шаблоне).

### 4\. Применение манифестов

```
kubectl apply -f manifests/01-namespace.yaml
kubectl apply -f manifests/02-secret-license.yaml
kubectl apply -f manifests/03-configmap-newrelic.yaml
kubectl apply -f manifests/04-deployment-example.yaml
```

### 5\. Проверка

**Статус пода:**

```
kubectl get pods -n <NAMESPACE>
# STATUS должен быть Running, READY 1/1
```

**Логи initContainer (агент скопирован в том):**

```
kubectl logs -n <NAMESPACE> -l app=<APP_NAME> -c nr-agent-init
```

**Логи приложения (агент подключился к коллектору):**

```
kubectl logs -n <NAMESPACE> -l app=<APP_NAME> -c app | grep -i "new relic"
```

Ожидаемые строки:

```
Picked up JAVA_TOOL_OPTIONS: -javaagent:/opt/nr/newrelic.jar
New Relic Agent: Loading configuration file "/opt/nr/./newrelic.yml"
Using configured collector host: <COLLECTOR_HOST>
New Relic Agent v9.1.0 is initializing...
Agent 1@<pod-name>/<APP_NAME> connected to <COLLECTOR_HOST>:443
New Relic Agent v9.1.0 has started
```

**Проверка в UI GMONIT:**

Открыть UI GMONIT → APM → убедиться что приложение `<APP_NAME>` появилось в списке и метрики идут.

## Часть 3: Минимальная рабочая конфигурация

Ниже приведена минимально необходимая конфигурация `newrelic.yml` (внутри ConfigMap):

```
common: &default_settings
  agent_enabled: true
  app_name: <APP_NAME>
  host: <COLLECTOR_HOST>
  log_level: info
  log_file_name: STDOUT
  distributed_tracing:
    enabled: true
  transaction_tracer:
    enabled: true
production:
  <<: *default_settings
```

**Параметры:**

| Параметр | Назначение |
| --- | --- |
| `agent_enabled: true` | Включение агента |
| `app_name` | Имя приложения в UI GMONIT |
| `host` | FQDN коллектора GMONIT (без схемы) |
| `log_level: info` | Уровень логирования агента |
| `log_file_name: STDOUT` | Вывод логов агента в stdout пода (видны через `kubectl logs`) |
| `distributed_tracing.enabled` | Distributed tracing между сервисами |
| `transaction_tracer.enabled` | Детализация медленных транзакций |

Если коллектор работает с самоподписанным SSL, добавьте в ConfigMap:

```
  ca_bundle_path: /opt/nr/cacert.pem
```

И примонтировать CA-сертификат как дополнительный ConfigMap/Secret в `/opt/nr/cacert.pem`.

**License\_key передаётся через Secret как env-переменная `NEW_RELIC_LICENSE_KEY`** (не в `newrelic.yml`). Значение в Secret должно быть **обёрнуто в двойные кавычки** (см. грабли ниже).

## Часть 4: Контрольный чек-лист

* [ ] Архив распакован
* [ ] Образ `newrelic-java-agent:9.1.0` импортирован в containerd всех нод (или push в приватный registry)
* [ ] Плейсхолдеры в манифестах заменены (`<NAMESPACE>`, `<APP_NAME>`, `<COLLECTOR_HOST>`, `<REGISTRY>`, образ приложения)
* [ ] License\_key в Secret: в двойных кавычках
* [ ] `kubectl apply` выполнен для всех 4 манифестов без ошибок
* [ ] Под `READY 1/1 Running`
* [ ] В логах приложения: `New Relic Agent v9.1.0 has started` + `Agent ... connected to <COLLECTOR_HOST>:443`
* [ ] Приложение появилось в UI GMONIT, метрики отображаются