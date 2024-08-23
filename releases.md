# Релизы GMonit

## Процесс

Поставка GMonit включает в себя два docker образа публикуемых в yandex container registry:
- `collector` — содержит java сервер принимающий данные мониторинга;
- `grafana` — содержит Grafana со встроенной визуализацией данных мониторинга.

Оба образа публикуются с тегами версий двух видов и содержат сборки, которые прошли наше ревью:
1. `v3` — самая свежая сборка;
2. `v3-12345` — сборка под конкретным номером.

В процессе релиза мы публикуем тег с номером сборки прошедшей наш staging процесс.

Например, релиз 11 июля 2024 имеет номер сборки 1740 и опубликован со следующими тегами:
```
cr.yandex/c...j/collector:v3
cr.yandex/c...j/collector:v3-1740
cr.yandex/c...j/grafana:v3
cr.yandex/c...j/grafana:v3-1740
```

Номерной тег `v3-1740` всегда будет содержать один и тот же образ и никогда не будет изменен. Тег `v3` через некоторое время начнёт указывать уже на другую более свежую сборку, проходящую staging процесс.

Для production систем рекомендуем использовать теги с номером сборки.


## Release notes

### `v3-2205` 23 августа 2024

- Обновлен Datomic. Замените образ сервиса `transactor`
  ```yaml
  transactor:
    # ...
    #было  cr.yandex/crpih7d63vpcj5dfn8jj/transactor:1.0.7021-8
    image: cr.yandex/crpih7d63vpcj5dfn8jj/transactor:1.0.7180-11
    # ...
  ```
- Обновлен браузерный агент до версии 1.262.0 (июль 2024). Для корректной работы новых функций необходимо обновить RUM loader сниппет в ваших браузерных приложениях
- Добавлена поддержка распределенной трассировки по протоколу OpenTelemetry. Бесшовная интеграция с существующими инструментами мониторинга распределенной трассировки. Приложения OpenTelemetry отображаются на экране Traces, а также внутри трейсов наравне с данными NewRelic. Настройте отправку трейсов по http в формате json в Collector GMonit:
  ```yaml
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
          include_metadata: true

  processors:
    batch:

  exporters:
    otlphttp/gmonit:
      endpoint: https://gmonit-collector-url/otlp
      encoding: json
    debug:

  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors:
          - batch
        exporters:
          - otlphttp/gmonit
  ```
- Добавлен мониторинг AJAX запросов браузерных приложений. Новые дашборды доступны на экранах приложений во вкладке Browser
- Добавлена обработка User-Agent браузерных приложений, сбор статистики по использованию различных браузеров, их версий и операционных систем
- Поддержан браузерный SDK. [Документация NewRelic](https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/using-browser-apis/). Позволяет расширять мониторинг браузерных приложений произвольными событиями и метриками
- Добавлена символикация ошибок минифицированных браузерных приложений.

  [Документация NewRelic](https://docs.newrelic.com/docs/browser/new-relic-browser/browser-pro-features/upload-source-maps-api/#questions).
  Для использования необходима настройка переменных окружения а также загрузка source-map вашего приложения:
  1. Для GMonit Collector:
  ```yaml
  environment:
      BASIC_AUTH_NAME: grafana-http-user # default is 'admin'
      BASIC_AUTH_PASS: пароль
  ```
  2. Для Grafana:
  ```yaml
  environment:
      GMONIT_GRAFANA_COLLECTOR_URL: http:/collector:8080/grafana
      GMONIT_GRAFANA_COLLECTOR_USER: grafana-http-user
      GMONIT_GRAFANA_COLLECTOR_PASSWORD: пароль
  ```
  3. Для каждой сборки вашего приложения отправлять source-map через POST запрос в Collector GMonit. Пример на `curl`:
  ```bash
  curl -F "sourcemap=%SOURCE_MAP_PATH%" \
       -F "javascriptUrl=JS_URL" \
       https://gmonit-collector/sourcemaps-service/v2/applications/YOUR_APP/sourcemaps
  ```
  `SOURCE_MAP_PATH` – соответствует пути до source-map на файловой системе
  `JS_URL` – соответствует аттрибуту `src` в HTML теге `script`.
- Браузерный мониторинг включен для веб-интерфейса GMonit. Для настройки необходимо добавить переменную окружения `GMONIT_GRAFANA_BROWSER_AGENT_COLLECTOR_URL` для Grafana. Например:
  ```yaml
  grafana:
    environment:
      GMONIT_GRAFANA_BROWSER_AGENT_COLLECTOR_URL: https://gmonit-collector/
  ```
- Исправления работы инструментов распределенной трассировки

### `v3-1740` 11 июля 2024

- Поддержан сбор метрик по протоколу OpenTelemetry:
  - GMonit можно указать в `exporters` otelcol-config.yml
    ```
    receivers: ...
    processors:
      cumulativetodelta:
      batch:
    exporters:
      otlphttp/gmonit:
        endpoint: https://gmonit-collector-url/otlp
        encoding: json
    service:
      pipelines:
        receivers: ...
        processors: [cumulativetodelta, batch]
        exporters: [otlphttp/gmonit]
    ```
    Или отправлять данные по http напрямую в коллектор GMonit с адресом API `/otlp`
  - Поддержана delta temporality, поэтому рекомендуется использование cumulativetodelta процессора
  - Поддержано сохранение всех основных типов метрик: gauge, counter, histogram, exponential histogram
- Поддержан мониторинг мобильных приложений на iOS и Android:
  - Мобильные метрики собираемые `newrelic-ios-agent` и `newrelic-android-agent`
  - Дебофускация обработанных ошибок и сбоев в Android
  - Символикация обработанных ошибок и сбоев в iOS
- Добавлены метрики медленных SQL в APM. Они представлены на страницах transaction и database item
- Поддержаны пользовательские события из APM SDK:
  - https://docs.newrelic.com/docs/data-apis/custom-data/custom-events/apm-report-custom-events-attributes/
  - Ваши данные будут находиться в таблице `nr_custom_event_data`
- Исправления работы с RUM (браузерными) агентами

### `v3-1433` 6 июня 2024

- Оптимизирована работа с данными веб агентов
- Оптимизирована работа с памятью http сервера коллектора
