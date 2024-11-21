# Поддержка протокола OpenTelemetry

GMonit поддерживает протокол OpenTelemetry для сбора метрик и трейсов. Для интеграции следует использовать JSON HTTP эндпоинт: https://gmonit-collector-url/otlp.

## Поддерживаемые типы данных

- **Метрики**: поддерживаются только в режиме delta.
- **Трейсы**

## Пример конфигурации

Для настройки интеграции GMonit с OpenTelemetry можно использовать следующий пример конфигурационного файла:

```yaml
receivers: # Укажите конфигурацию ваших ресиверов
processors:
  cumulativetodelta: 
  batch:
exporters:
  otlphttp/gmonit:
    endpoint: https://gmonit-collector-url/otlp
    encoding: json
service:
  pipelines:
    metrics:
      receivers: # Укажите ресиверы для метрик
      processors: [cumulativetodelta, batch]
      exporters: [otlphttp/gmonit]
    traces:
      receivers: # Укажите ресиверы для трейсов
      processors: [batch]
      exporters: [otlphttp/gmonit]
```

- receivers: здесь указываются все необходимые ресиверы для получения данных.
- processors:
  - cumulativetodelta: преобразует кумулятивные метрики в дельта-метрики.
  - batch: обеспечивает обработку данных пакетами для оптимального экспорта.
- exporters: отвечает за экспорт данных на заданный эндпоинт.
- service: описывает пайплайны для обработки и экспорта метрик и трейсов.
