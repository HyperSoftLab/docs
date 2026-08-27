# Kubernetes — Настройка

Раздел не требует включения на коллекторе, и отдельного агента для Kubernetes тоже нет: данные собирает [инфраструктурный агент](/agent_installation_guide/Infra/infra_install.md), развёрнутый в кластере. Настройка сводится к его развёртыванию и проверке, что данные дошли.

## Развёртывание агента в кластере

Тот же инфраструктурный агент, что ставится на обычные хосты, в кластере разворачивается по-другому: он опрашивает API-сервер и kubelet, поэтому ему нужны права на чтение объектов кластера и по экземпляру на каждом узле.

<!-- STEP_GUIDE:START Развёртывание инфраструктурного агента в кластере Kubernetes: способ установки, обязательные параметры подключения к коллектору, откуда берётся имя кластера в интерфейсе, необходимые права в кластере, проверка что агент запустился. -->

Агент ставится официальным Helm-чартом New Relic `nri-bundle` — GMONIT не требует ни своего чарта, ни своей сборки агента. Настройка сводится к тому, чтобы переопределить адреса, по которым агент отправляет данные, и подложить ключ лицензии.

### Перед установкой

- **Поддерживаемые версия и дистрибутив Kubernetes** — см. [требования совместимости New Relic](https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/get-started/kubernetes-integration-compatibility-requirements/) и отдельно [требования для установки через Helm](https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/get-started/kubernetes-integration-compatibility-requirements/#req-helm).
- **Helm и `kubectl`,** настроенные на работу с нужным кластером.
- **Права на создание Role и ClusterRole** в кластере. В GKE для этого нужна роль Kubernetes Engine Cluster Admin, в OpenShift — добавление сервисных аккаунтов интеграции в privileged Security Context Constraints; и то и другое описано в [руководстве New Relic](https://docs.newrelic.com/install/kubernetes/?dropdown1=helm).
- **Сетевой доступ из кластера до коллектора по HTTPS.** Если коллектор за самоподписанным сертификатом, потребуется дополнительно смонтировать CA-бандл — см. [установку инфраструктурного агента](/agent_installation_guide/Infra/infra_install.md).

### Установка

Общий порядок установки через Helm описан в [документации New Relic](https://docs.newrelic.com/install/kubernetes/?dropdown1=helm). Ниже — то, что специфично для GMONIT. Проверено на `nri-bundle` 8.0.x.

**1. Создайте пространство имён, секрет с ключом и ConfigMap с метками APM-приложения:**

```bash
kubectl create namespace newrelic

kubectl -n newrelic create secret generic newrelic-license \
  --from-literal=licenseKey=0123456789012345678901234567890123456789

kubectl -n newrelic create configmap agent-apm-config \
  --from-literal=NEW_RELIC_LABELS=environment:gmonit
```

**2. Сохраните конфигурацию в `values.yaml`:**

```yaml
global:
  # Имя кластера в интерфейсе GMONIT: под ним кластер виден во всех списках раздела и в фильтре по кластеру.
  cluster: <имя-кластера>
  # Секрет и ключ из него, созданные выше.
  customSecretName: newrelic-license
  customSecretLicenseKey: licenseKey

newrelic-infrastructure:
  enabled: true
  common:
    agentConfig:
      collector_url: https://collector.example.ru/infra2/infra-api
      command_channel_url: https://collector.example.ru/infra2/command-api
      identity_url: https://collector.example.ru/infra2/identity-api
      self_instrumentation: newrelic
      self_instrumentation_apm_host: collector.example.ru
      enable_process_metrics: true
  kubelet:
    extraEnv:
    - name: NEW_RELIC_APP_NAME
      value: '[GMonit] Infrastructure Agent (kubelet)'
    extraEnvFrom:
    - configMapRef:
        name: agent-apm-config
  ksm:
    env:
    - name: NEW_RELIC_APP_NAME
      value: '[GMonit] Infrastructure Agent (ksm)'
    extraEnvFrom:
    - configMapRef:
        name: agent-apm-config
# Установка kube-state-metrics. По умолчанию выключена, но KSM обязателен:
# без него не будет данных о рабочих нагрузках. Если KSM в кластере уже есть, оставьте false.
kube-state-metrics:
  enabled: true
```

**3. Добавьте репозиторий чартов и проверьте конфигурацию, ничего не устанавливая:**

```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm upgrade --install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic -f values.yaml \
  --dry-run --debug
```

**4. Установите чарт — та же команда без `--dry-run` и `--debug`:**

```bash
helm upgrade --install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic -f values.yaml
```

Что важно в этой конфигурации:

- **`global.cluster` — это имя, под которым кластер появится в интерфейсе.** Оно должно быть говорящим и не повторять имя другого кластера, уже заведённого в GMONIT: переименование задним числом создаст второй кластер вместо переименования первого.
- **`kube-state-metrics` обязателен.** Без KSM интеграция не работает — не будет данных о рабочих нагрузках. Ставить его чартом нужно всегда, кроме случая, когда KSM в кластере уже есть; тогда оставьте `false`, даже если он живёт в другом пространстве имён.
- **`controlPlane` включён по умолчанию.** Его поды планируются только на узлы с меткой `node-role.kubernetes.io/control-plane` или `node-role.kubernetes.io/etcd`. В управляемых кластерах — Yandex Cloud, EKS, GKE, AKS — управляющий контур скрыт провайдером, и интеграция собирает данные только с рабочих узлов: DaemonSet останется с нулём подов, ничего не сломав. Выключать компонент (`controlPlane.enabled: false`) имеет смысл, только чтобы не держать лишний объект. Что собирается с управляющего контура там, где он доступен, описано в [Configure control plane monitoring](https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/advanced-configuration/configure-control-plane-monitoring/).

### Права в кластере

Отдельно раздавать права не нужно — чарт создаёт ServiceAccount и ClusterRole сам. Стоит знать, что именно он запросит, если в кластере действуют политики безопасности подов:

- Чтение объектов кластера через API-сервер: узлы, поды, пространства имён, рабочие нагрузки.
- Обращение к kubelet каждого узла — отсюда метрики потребления ресурсов подами и контейнерами.
- Привилегированный режим и монтирование `/proc` узла для сбора таблицы процессов (`enable_process_metrics`).
- `hostNetwork` на управляющих узлах: компоненты управляющего контура принимают подключения только с localhost, поэтому сборщик работает в сети узла.

### Проверка, что агент запустился

```bash
kubectl -n newrelic get pods -w
```

Ожидается:

- `newrelic-bundle-nrk8s-kubelet` — по поду на каждый узел кластера;
- `newrelic-bundle-nrk8s-ksm` — один под;
- `newrelic-bundle-kube-state-metrics` — один под, если KSM ставили вместе с чартом;
- `newrelic-bundle-nri-metadata-injection` — один под; вебхук включён по умолчанию и проставляет APM-агентам в подах переменные окружения, по которым приложение связывается с объектами Kubernetes;
- `newrelic-bundle-nrk8s-controlplane` — по поду на каждый управляющий узел, если такие узлы в кластере есть. Их отсутствие — не ошибка, см. выше.

В каждом поде агента два контейнера: первый (`kubelet`, `ksm` или `controlplane`) собирает данные, `agent` отправляет их в коллектор. Ошибки подключения к GMONIT ищите в логах второго:

```bash
kubectl -n newrelic logs -l app.kubernetes.io/component=kubelet -c agent --tail=50
```

Запустившийся агент — ещё не гарантия, что данные дошли: это проверяется в интерфейсе, см. следующий раздел.

<!-- STEP_GUIDE:END -->

## Проверка, что данные пошли

Первый экран раздела отвечает на вопрос, дошли ли данные, ещё до того как в них разбираться.

<!-- STEP_GUIDE:START Проверка поступления данных из кластера: где смотреть счётчики объектов, через какое время появляются данные, трактовка пустого раздела и частично заполненного, влияние выбранного периода. -->

1. Откройте **Kubernetes → Обзор**.
2. Проверьте счётчики в верхнем ряду: **Кластеры**, **Узлы**, **Пространства имен**, **Рабочие нагрузки**, **Поды**, **Контейнеры**. Если агент отчитывается, заполнены все шесть.
3. Убедитесь, что выбранный в правом верхнем углу период включает настоящее время. Все счётчики считаются за период, а не на текущий момент, поэтому окно в прошлом даст пустые значения при живом агенте.
4. Проверьте, что кластер называется так, как вы ожидаете: имя приходит от агента и используется во всех списках раздела и в фильтре по кластеру.

Что означают неполные данные:

- **Пустой раздел при живом кластере** — агент не запущен, не дошёл до коллектора или не получил доступ к API-серверу. Сбор идёт непрерывно, поэтому пустота означает проблему со сбором, а не пустой кластер.
- **Есть узлы, но нет подов и контейнеров** — агент видит API-сервер, но не kubelet. Показатели потребления ресурсов приходят именно от kubelet.
- **Заполнен только один кластер из нескольких** — проверьте агент в остальных: каждый кластер отчитывается своим агентом, и отсутствие кластера в списке ничем не отличается от кластера, в котором всё хорошо.

<!-- STEP_GUIDE:END -->
