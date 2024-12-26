# Мониторинг инфраструктуры
Концепция построения инфраструктурного мониторинга GMonit предполагает, что система поддерживает различные источники для сбора метрик и событий. На данный момент, реализована поддержка протокола NewRelic, что позволяет использовать всю экосистему NewRelic для сбора данных по инфраструктуре. В частности, инфраструктурные агенты, распространяемые по открытой лицензии Apache 2.0.

## Инструкция по установке инфраструктурного агента NewRelic

1. Установить инфраструктурный агент по инструкции для соответствующей версии операционной системы:
    * [Linux](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/linux-installation/install-infrastructure-monitoring-agent-linux/)
    * [Windows](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/windows-installation/install-infrastructure-monitoring-agent-windows/)

2. Изменить настройки в файле `C:\%ProgramData%\New Relic\newrelic-infra\newrelic-infra.yml` для __Windows__ или `/etc/newrelic-infra.yml` для __Linux__.

```yaml
# проверить что значение установлено в true
enable_process_metrics: true

log:
  level: info
  file: '<<PATH_TO_LOGFILE>>'   # newrelic-infra.yml должен лежать в папке newrelic-infra, а не в папке с интеграциями
  rotate:
    max_size_mb: 1000 # параметр для включения ротации
    max_files: 5 # максимальное количество файлов логов
    compression_enabled: true # включение сжатия архивных логов
    file_pattern: YYYY-MM-DD_hh-mm-ss.log  # шаблон имени архивного лог-файла

license_key: "0123456789012345678901234567890123456789" #Ключ(заглушка, не меняем)

# добавить значения:
collector_url: https://gmonit-collector.<<DOMAIN>>.com/infra/infra-api
identity_url: https://gmonit-collector.<<DOMAIN>>.com/infra/identity-api
metric_url: https://gmonit-collector.<<DOMAIN>>.com/metrics
command_channel_url: https://gmonit-collector.<<DOMAIN>>.com/infra/command-api

self_instrumentation: newrelic
self_instrumentation_apm_host: gmonit-collector.<<DOMAIN>>.com

# указать путь к сертификатам SSL
ca_bundle_file: %path_to_ssl%
```
Более подробную информацию о настройке ротации можно найти в [официальной документации](https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/infrastructure-agent-configuration-settings/#rotate).


3. Также можно использовать переменные окружения

Параметры, указанные в файле `newrelic-infra.yml`, как правило, можно переопределять с помощью переменных окружения (environment variables). Ниже приведены примеры основных настроек для INFRA-агента New Relic, в том числе параметры ротации логов.

> **Важно**: Названия переменных могут отличаться в зависимости от версии агента. Если ваш INFRA-агент не распознаёт эти переменные или вы не видите изменений в поведении агента, настраивайте ротацию напрямую в `newrelic-infra.yml` (как описано в официальной документации).

### Пример переменных окружения

```bash
# -- Основные настройки --

# Включение сбора метрик процессов
NRIA_ENABLE_PROCESS_METRICS=true

# Уровень логирования
NRIA_LOG_LEVEL=info

# Лицензионный ключ
NRIA_LICENSE_KEY="0123456789012345678901234567890123456789" # Ключ (заглушка, не меняем)

# URL-адреса для взаимодействия с GMonit
NRIA_COLLECTOR_URL="https://gmonit-collector.<<DOMAIN>>.com/infra/infra-api"
NRIA_IDENTITY_URL="https://gmonit-collector.<<DOMAIN>>.com/infra/identity-api"
NRIA_METRIC_URL="https://gmonit-collector.<<DOMAIN>>.com/metrics"
NRIA_COMMAND_CHANNEL_URL="https://gmonit-collector.<<DOMAIN>>.com/infra/command-api"

# Самоинструментация
NRIA_SELF_INSTRUMENTATION="newrelic"
NRIA_SELF_INSTRUMENTATION_APM_HOST="gmonit-collector.<<DOMAIN>>.com"

# Путь к сертификатам SSL, если используется самоподписанный сертификат
NRIA_CA_BUNDLE_PATH="%path_to_ssl%"

# -- Ротация логов --

# Максимальный размер лога (в МБ), по достижении которого включается ротация
NRIA_LOG_ROTATE_MAX_SIZE_MB=1000

# Максимальное количество сохраняемых лог-файлов
NRIA_LOG_ROTATE_MAX_FILES=5

# Включение сжатия архивных логов
NRIA_LOG_ROTATE_COMPRESSION_ENABLED=true

# Шаблон имени архивного лог-файла
NRIA_LOG_ROTATE_FILE_PATTERN="YYYY-MM-DD_hh-mm-ss.log"
```


4. По умолчанию агент может собирать системные логи. Если по каким-либо причинам необходимо отключить их сбор, то в каталоге:`C:\%ProgramData%\New Relic\newrelic-infra\logging.d\` для __Windows__ или `/etc/newrelic-infra/logging.d/` для __Linux__ добавить всем файлам `*.yml` расширение `.disabled`. Например: `foo.yml.disabled`.

5. Перезапустить инфраструктурный агент выполнив команду:

```bash
systemctl restart newrelic-infra
```
