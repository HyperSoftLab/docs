# Установка APM-агента для Java

Для интеграции APM-агента в Java-приложение выполните следующие шаги:

---

### 1. **Загрузка агента**
1. Скачайте архив с агентом с официального сайта New Relic:

   ```bash
   curl -O https://download.newrelic.com/newrelic/java-agent/newrelic-agent/current/newrelic-java.zip
   ```

2. (Опционально) Ознакомьтесь с [официальной инструкцией по установке APM-агента для Java](https://docs.newrelic.com/install/java/) для получения дополнительных подробностей.

---

### 2. **Распаковка агента**
Распакуйте загруженный архив в предпочтительный каталог. Например:

```bash
sudo mkdir -p /opt/newrelic
sudo unzip newrelic-java.zip -d /opt/newrelic
```

> **Важно:** Убедитесь, что файлы `.jar` агента **не находятся** в пути к классам или в каталогах, перечисленных в `java.endorsed.dirs`.

---

### 3. **Настройка конфигурации агента**
Настройте файл `newrelic.yml` или используйте переменные окружения для конфигурации агента.

1. **Основные настройки** (через переменные окружения или в `newrelic.yml`):

   ```bash
   NEW_RELIC_LOG=stdout #Логирование агента в stdout
   NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789 #Ключ(заглушка, не меняем)
   NEW_RELIC_HOST=gmonit-collector.<DOMAIN>.ru #Домен коллектора GMonit
   NEW_RELIC_APP_NAME="MY_AWESOME_APP" #Название приложения
   ```

2. **Если используются самоподписанные сертификаты**  
   Необходимо явно указать путь до бандла сертификатов (через `newrelic.yml` или переменную окружения):

   ```bash
   NEW_RELIC_CA_BUNDLE_PATH=/gmonit/ssl/rootCA.crt #Путь до файла с бандлом сертификатов
   ```
   Или в `newrelic.yml`:

   ```yaml
   ca_bundle_path: /gmonit/ssl/rootCA.crt
   ```

> При необходимости более тонкой настройки параметров агента смотрите также официальную [документацию по конфигурации агента для Java](https://docs.newrelic.com/docs/apm/agents/java-agent/configuration/java-agent-configuration-config-file/).

---

### 4. **Интеграция агента с приложением**
Добавьте флаг запуска агента в команду запуска вашего Java-приложения:

```bash
-javaagent:/opt/newrelic/newrelic.jar
```

Пример команды запуска:
```bash
java -javaagent:/opt/newrelic/newrelic.jar -jar my-app.jar
```

---

### 5. **Проверка работы агента**
После запуска приложения убедитесь, что агент успешно подключился:
- В логах агента (`stdout`) должно появиться сообщение об успешном подключении.
- В интерфейсе мониторинга GMonit появятся метрики приложения.

---

### 6. **Подробнее**
Для более детальной информации о конфигурации и настройке агента обратитесь к [официальной документации New Relic](https://docs.newrelic.com/docs/apm/agents/java-agent/configuration/java-agent-configuration-config-file/).