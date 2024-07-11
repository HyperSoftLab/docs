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

Тег `v3-1740` всегда будет содержать один и тот же образ и никогда не будет изменен. Тег `v3` через некоторое время начнёт указывать уже на другую более свежую сборку, проходящую staging процесс.

Для production систем рекомендуем использовать теги с номером сборки.


## Release notes

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
- Добавлены метрики медленных SQL в APM
- Поддержаны пользовательские события из APM SDK:
  - https://docs.newrelic.com/docs/data-apis/custom-data/custom-events/apm-report-custom-events-attributes/
- Исправления работы с RUM (браузерными) агентами
