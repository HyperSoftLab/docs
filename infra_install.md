# Мониторинг инфраструктуры
Концепция построения ифраструктурного мониторинга GMonit предполагает, что система поддерживает различные источники для сбора метрик и событий. На данный момент, реализована поддержка протокола NewRelic, что позволяет использовать всю экосистему NewRelic для сбора данных по инфраструктуре. В частности, инфраструктурные агенты, распространяемые по открытой лицензии Apache 2.0.

## Инструкция по установке инфраструктурного агента NewRelic

1. Установить инфраструктурный агент по инструкции для соответствующей версии операционной системы:
    * [Linux](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/linux-installation/install-infrastructure-monitoring-agent-linux/)
    * [Windows](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/windows-installation/install-infrastructure-monitoring-agent-windows/)

2. Изменить настройки в файле `C:\%ProgramData%\New Relic\newrelic-infra\newrelic-infra.yml` для __Windows__ или `/etc/newrelic-infra.yml` для __Linux__.

```yaml
# проверить что значение установлено в true
enable_process_metrics: true

# проверить наличие указанного раздела
log:
  level: info
  file: '<<PATH_TO_LOGFILE>>'

# изменить лицензию на указанную в примере
license_key: "0123456789012345678901234567890123456789"

# добавить значения:
collector_url: https://gmonit-collector.<<DOMAIN>>.com/infra/infra-api
identity_url: https://gmonit-collector.<<DOMAIN>>.com/infra/identity-api
metric_url: https://gmonit-collector.<<DOMAIN>>.com/metrics 
command_channel_url: https://gmonit-collector.<<DOMAIN>>.com/infra/command-api

self_instrumentation: newrelic
self_instrumentation_apm_host: gmonit-collector.<<DOMAIN>>.com

# указать путь к сертефикатам SSL
ca_bundle_file: %path_to_ssl%
```

3. Выключить сбор системных логов. Для этого, в директории `C:\%ProgramData%\New Relic\newrelic-infra\logging.d\` для __Windows__ или `/etc/newrelic-infra/logging.d/` для __Linux__ добавить всем файлам `*.yml` расширение `.disabled`. Например: `foo.yml.disabled`.

4. Перезапустить инфраструктурный агент по [инструкции](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/manage-your-agent/start-stop-restart-infrastructure-agent/).
