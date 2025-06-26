## 1. Для развертывания сервиса мониторинга необходимо создать файл docker-compose.yml со следующей конфигурацией:

**Примечание:** Дополнительные сведения по настройке инфраструктурных агентов New Relic смотрите в [инструкции по установке инфраструктурного агента NewRelic](../../../agent_installation_guide/Infra/infra_install.md).

```yaml
services:
  urlcheck:
    image: newrelic/infrastructure-bundle:latest
    volumes:
      - ./urlcheck.yml:/etc/newrelic-infra/integrations.d/urlcheck.yml
      - ./urlcheck.json:/etc/newrelic-infra/integrations.d/urlcheck.json
    environment:
      NRIA_LICENSE_KEY: "0123456789012345678901234567890123456789"
      NRIA_COLLECTOR_URL: https://${COLLECTOR_DOMAIN}/infra/infra-api
      NRIA_IDENTITY_URL: https://${COLLECTOR_DOMAIN}/infra/identity-api
      NRIA_COMMAND_CHANNEL_URL: https://${COLLECTOR_DOMAIN}/infra/command-api
```
- Замените ${COLLECTOR_DOMAIN} на актуальный домен коллектора или используйте переменную окружения
- Для существующих конфигураций достаточно добавить только volumes
  

## 2. Создайте файл urlcheck.json в той же директории следующего формата:

```json
[
  {"name":"имя системы", "network_path":"тип маршрута", "url":"адрес для проверки"},
  {"name":"имя системы 2", "network_path":"тип маршрута", "url":"адрес для проверки 2"}
]
```

- name - идентификатор системы
- network_path - тип сетевого маршрута
- url - полный URL для проверки

## 3. Создайте файл urlcheck.yml содержащий настройки интеграции:
```yaml
integrations:
  - name: nri-flex
    interval: 5s
    config:
      name: URLCheck
      lookup_file: /etc/newrelic-infra/integrations.d/urlcheck.json
      apis:
        - event_type: URLCheck
          commands:
            - run: printf "${lf:network_path}~${lf:name}~${lf:url}~$(curl --connect-timeout 5 -s -o /dev/null -I -w "%{http_code}~%{time_total}~%{url_effective}~%{content_type}~%{size_download}~%{size_upload}~%{speed_download}~%{speed_upload}~%{time_connect}~%{time_namelookup}~%{time_pretransfer}~%{time_redirect}~%{num_connects}~%{num_redirects}~%{ssl_verify_result}~%{redirect_url}" ${lf:url})"
              split_by: "~"
              split: horizontal
              set_header: [
                urlcheck.networkPath,
                urlcheck.targetName,
                urlcheck.targetURL,
                urlcheck.httpResponseCode,
                urlcheck.totalTimeSec,
                urlcheck.urlEffective,
                urlcheck.contentType,
                urlcheck.sizeDownload,
                urlcheck.sizeUpload,
                urlcheck.speedDownload,
                urlcheck.speedUpload,
                urlcheck.timeConnectSec,
                urlcheck.timeNamelookupSec,
                urlcheck.timePretransferSec,
                urlcheck.timeRedirectSec,
                urlcheck.numConnects,
                urlcheck.numRedirects,
                urlcheck.sslVerifyResult,
                urlcheck.redirectURL
              ]
```

## 4. Для запуска выполните команду
```bash
docker-compose up -d
```
