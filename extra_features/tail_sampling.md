## Infinite tracing

Infinite Tracing — это подход к распределенной трассировке, который
использует tail-based сэмплирование для оптимизации анализа и управления
объемом данных.

Tail-based сэмплирование — это метод отбора данных, направленный на
сохранение более значимых или интересных транзакций, в отличие от
head-based сэмплирования, где данные выбираются произвольно с
фиксированной вероятностью. Этот подход специально оптимизирует хранение
и анализ таких транзаций, как длительные процессы или ошибки.

Для реализации Infinite Tracing в GMonit мы используем OpenTelemetry
Collector и специальный [tail_sampling
процессор](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md).

### Настройка
Помимо GMonit collector'а нам понадобится [дистрибутив otelcollector от
GMonit](https://github.com/HyperSoftLab/opentelemetry-collector)
настроенный следующим образом:
1. добавьте в `compose.yml` следующий сервис
```yaml
services:
...
  otelcollector:
    image: cr.yandex/crpih7d63vpcj5dfn8jj/otelcollector:master
    command: [ "--config=/etc/otelcol-config.yml" ]
    environment:
      GMONIT_API_URL: http://collector:8080/otlp
    volumes:
      - ./otelcollector/otelcol-config.yml:/etc/otelcol-config.yml
...
```

2. `otelcol-config.yml` должен выглядеть следующим образом
```yaml
receivers:
  nrinfinitetracing:
    secret_token: ${SECRET_TOKEN} # тот же самый что и в GMonit collector
    grpc:
      endpoint: "0.0.0.0:4317"
      transport: "tcp"

processors:
  tail_sampling:
    policies:
      # см. ссылку выше для более точной настройки
      # у нас пока нет экспертизы какой конкретно алгоритм сэмплинга
      # должен быть
      - name: test-policy
        type: always_sample

exporters:
  otlphttp/gmonit:
    tls:
      insecure: true
    endpoint: ${GMONIT_API_URL}
    encoding: json

service:
  pipelines:
    traces:
      receivers:
        - nrinfinitetracing
      processors:
        - tail_sampling
      exporters:
        - otlphttp/gmonit
```
