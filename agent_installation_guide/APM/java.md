# Установка APM-агента для Java

Для интеграции APM-агента в Java-приложение выполните следующие шаги:


### 1. **Загрузка агента**
1. Скачайте архив с агентом с официального сайта New Relic:

   ```bash
   curl -O https://download.newrelic.com/newrelic/java-agent/newrelic-agent/current/newrelic-java.zip
   ```

2. (Опционально) Ознакомьтесь с [официальной инструкцией по установке APM-агента для Java](https://docs.newrelic.com/install/java/) для получения дополнительных подробностей.



### 2. **Распаковка агента**
Распакуйте загруженный архив в предпочтительный каталог. Например:

```bash
sudo mkdir -p /opt/newrelic
sudo unzip newrelic-java.zip -d /opt/newrelic
```

> **Важно:** Убедитесь, что файлы `.jar` агента **не находятся** в пути к классам или в каталогах, перечисленных в `java.endorsed.dirs`.



### 3. **Настройка конфигурации агента**
Настройте файл `newrelic.yml` или используйте переменные окружения для конфигурации агента.

1. **Основные настройки** (через переменные окружения или в `newrelic.yml`):

   ```bash
   NEW_RELIC_LOG=stdout #Логирование агента в stdout
   NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789 #Ключ(заглушка, не меняем)
   NEW_RELIC_HOST=gmonit-collector.<DOMAIN>.ru #Домен коллектора GMonit
   NEW_RELIC_APP_NAME="MY_AWESOME_APP" #Название приложения - замените на своё
   ```
   Или в `newrelic.yml` (блок common):

   ```yaml
   log_file_path: stdout
   license_key: '0123456789-123456789-123456789-123456789'
   app_name: MY_AWESOME_APP
   host: gmonit-collector.<DOMAIN>.ru
   ```

2. **Если используются самоподписанные сертификаты**  
   Необходимо явно указать путь до бандла сертификатов (через `newrelic.yml` или переменную окружения):

   ```bash
   NEW_RELIC_CA_BUNDLE_PATH=/gmonit/ssl/rootCA.crt #Путь до файла с бандлом сертификатов
   ```
   Или в `newrelic.yml` (блок common):

   ```yaml
   ca_bundle_path: /gmonit/ssl/rootCA.crt
   ```

> При необходимости более тонкой настройки параметров агента смотрите также официальную [документацию по конфигурации агента для Java](https://docs.newrelic.com/docs/apm/agents/java-agent/configuration/java-agent-configuration-config-file/).


### 4. **Интеграция агента с приложением**
Добавьте флаг запуска агента в команду запуска вашего Java-приложения:

```bash
-javaagent:/opt/newrelic/newrelic.jar
```

Пример команды запуска:
```bash
java -javaagent:/opt/newrelic/newrelic.jar -jar my-app.jar
```

### 5. **Проверка работы агента**
После запуска приложения убедитесь, что агент успешно подключился:
- В логах агента (`stdout`) должно появиться сообщение об успешном подключении.
- В интерфейсе мониторинга GMonit появятся метрики приложения.


### 6. **Подробнее**
Для более детальной информации о конфигурации и настройке агента обратитесь к [официальной документации New Relic](https://docs.newrelic.com/docs/apm/agents/java-agent/configuration/java-agent-configuration-config-file/).


# Установка APM-агента для Java в K8S

Для интеграции агента New Relic в Java-приложение, работающее в Kubernetes, выполните следующие шаги:


### Шаг 1: Загрузка и распаковка агента New Relic

1. **Скачать Java-агент**:
   ```bash
   curl -O https://download.newrelic.com/newrelic/java-agent/newrelic-agent/current/newrelic-java.zip
   ```

2. **Распаковать агент**:
   ```bash
   unzip newrelic-java.zip -d /opt/newrelic
   ```
   Агент Java нужно распаковать в директорию внутри контейнера, которая будет доступна во время выполнения приложения.

   > **Важно**: Если агент будет расположен в другом месте, убедитесь, что `.jar` файлы агента **не находятся** в директориях, указанных в `java.endorsed.dirs` или в пути к классам.


### Шаг 2: Настройка агента New Relic

1. **Откройте файл `newrelic.yml`** и внесите следующие изменения:

   ```yaml
   common: &default_settings
     license_key: '0123456789-123456789-123456789-123456789' #Ключ(заглушка, не меняем)
     app_name: "MY_AWESOME_APP" #Название приложения - замените на своё
     host: "gmonit-collector.<DOMAIN>.ru" #Домен коллектора GMonit
     agent_enabled: true
     log_level: info
     log_file_path: stdout #Логирование агента в stdout
   ```

2. Если используются самоподписанные сертификаты, убедитесь, что путь к бандлу сертификатов добавлен в настройки (см. предыдущие разделы).


### Шаг 3: Подготовка Docker-образа с агентом

1. **Обновите `Dockerfile`** для вашего Java-приложения. Пример конфигурации:

   ```dockerfile
   FROM openjdk:11-jre-slim
   COPY opt/newrelic/ /opt/newrelic/ #Копируем агента New Relic в контейнер
   COPY out/ /app                     #Копируем ваше Java-приложение в контейнер
   WORKDIR /app
   ENTRYPOINT ["java", "-javaagent:/opt/newrelic/newrelic.jar", "com.example.HelloWorldServer"]
   ```

2. **Пересоберите Docker-образ**:
   ```bash
   docker build -t my-java-app-with-newrelic:latest .
   ```

3. **Загрузите Docker-образ в кластер Kubernetes**. Пример для использования с `kind`:
   ```bash
   kind load docker-image my-java-app-with-newrelic:latest
   ```

После выполнения этих шагов ваш Docker-образ с интегрированным APM-агентом готов для развертывания в Kubernetes. Убедитесь, что поды с приложением запускаются корректно, а метрики появляются в интерфейсе GMonit.
