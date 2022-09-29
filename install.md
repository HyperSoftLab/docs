# Инструкция по разворачиванию GMonit

## Разворачивание GMonit через Docker Compose
С помощью [Docker Compose](https://docs.docker.com/compose/) можно просто и удобно разворачивать, настраивать и обновлять GMonit в рамках одного хоста.

Шаги установки:

1. [Установить Docker](https://docs.docker.com/engine/install/)

2. [Установить Docker Compose](https://docs.docker.com/compose/install/)

3. Запросить у команды GMonit `ключ` для доступа к `docker-репозиторию` и залогититься выполнив на хосте команду:

```bash
cat key.json | docker login \
  --username json_key \
  --password-stdin \
  cr.yandex
```

4. Создать конфигурационный файл - `Caddyfile` для настройки реверсивного прокси-сервера Caddy:

```
gmonit.example.ru {
  reverse_proxy grafana:3000
  tls /gmonit/ssl/server.crt /gmonit/ssl/server.key # подключение TLS-сертификата на домен
}

gmonit-collector.example.ru {
  reverse_proxy collector:8080
  tls /gmonit/ssl/server.crt /gmonit/ssl/server.key # подключение TLS-сертификата на домен
}
```

> если удалить строчки с подключением сертификатов, [Caddy сгенерирует их черех Let's encrypt](https://caddyserver.com/docs/automatic-https).

>Все URL вида `*.example.ru` заменить на реальные адреса для Grafana и коллектора

5. Создать файл `docker-compose.yml`:

```yaml
services:
  clickhouse:
    restart: unless-stopped
    image: clickhouse/clickhouse-server:22.4
    environment:
      CLICKHOUSE_USER: <<SOME_CLICKHOUSE_USER>>
      CLICKHOUSE_PASSWORD: <<SOME_CLICKHOUSE_PASSWORD>>
    healthcheck:
      test: wget --spider -q localhost:8123/ping
      interval: 10s
      timeout: 5s
      retries: 10

  postgres:
    restart: unless-stopped
    image: postgres:13.1
    environment:
      - POSTGRES_PASSWORD=<<SOME_POSTGRES_PASSWORD>>
    healthcheck:
      test: pg_isready -U postgres
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    restart: unless-stopped
    image: redis:6
    healthcheck:
      test: redis-cli ping
      interval: 10s
      timeout: 5s
      retries: 10

  grafana:
    restart: unless-stopped
    image: cr.yandex/crpih7d63vpcj5dfn8jj/grafana:master
    environment:
      GF_SERVER_ROOT_URL: https://gmonit.example.ru

      GF_SECURITY_ADMIN_PASSWORD: <<SOME_GRAFANA_ADMIN_PASSWORD>>
      GMONIT_GRAFANA_TEMPO_URL: https://gmonit-collector.example.ru/tempo
      GMONIT_GRAFANA_TEMPO_CA_CERT__FILE: /gmonit/ssl/rootCA.crt

      GMONIT_GRAFANA_CLICKHOUSE_DATASOURCE_URL: http://clickhouse:8123
      GMONIT_GRAFANA_CLICKHOUSE_DATABASE: default
      GMONIT_GRAFANA_CLICKHOUSE_USER: <<SOME_CLICKHOUSE_USER>>
      GMONIT_GRAFANA_CLICKHOUSE_PASSWORD: <<SOME_CLICKHOUSE_PASSWORD>>

      GF_DATABASE_TYPE: postgres
      GF_DATABASE_HOST: postgres:5432
      GF_DATABASE_NAME: postgres
      GF_DATABASE_USER: postgres
      GF_DATABASE_PASSWORD: <<SOME_POSTGRES_PASSWORD>>

    healthcheck:
      test: wget --spider -q localhost:3000/api/health
      interval: 10s
      timeout: 5s
      retries: 10
    depends_on:
      clickhouse:
        condition: service_healthy
      postgres:
        condition: service_healthy
    volumes:
      - ./ssl:/gmonit/ssl
    # extra_hosts:
    #   - "gmonit-collector.example:<example docker0 ip>172.17.0.1</>"

  collector:
    restart: unless-stopped
    image: cr.yandex/crpih7d63vpcj5dfn8jj/collector:master
    environment:
      NEW_RELIC_LOG: stdout
      NEW_RELIC_LICENSE_KEY: 0123456789-123456789-123456789-123456789
      NEW_RELIC_HOST: gmonit-collector.example.ru
      NEW_RELIC_CA_BUNDLE_PATH: /gmonit/ssl/rootCA.crt
      NEW_RELIC_APP_NAME: "[GMonit] Collector"

      LICENSE_KEY: <<YOUR_LICENSE_KEY>>  # указать актуальный ключ лицензии GMonit

      PORT:               8080
      CLICKHOUSE_URL:     http://clickhouse:8123
      CLICKHOUSE_USER:    <<SOME_CLICKHOUSE_USER>>
      CLICKHOUSE_KEY:     <<SOME_CLICKHOUSE_PASSWORD>>
      CLICKHOUSE_DB:      default

      REDIS_HOST: redis
      REDIS_PORT: 6379

      SECRET_TOKEN: <<SOME_SECRET_TOKEN>>  # случайная последовательность из 128 символов (цифры и латинские буквы)

      # METRIC_DATA_TTL_DAY: 30
      # ANALYTIC_EVENT_DATA_TTL_DAY: 30
      # ERROR_DATA_TTL_DAY: 30
      # AGENTS_TTL_DAY: 30

      # SPAN_EVENT_DATA_TTL_DAY: 8
      # TRANSACTION_SAMPLE_DATA_TTL_DAY: 8
    healthcheck:
      test: curl -f localhost:8080/health
      interval: 10s
      timeout: 5s
      retries: 10
    depends_on:
      clickhouse:
        condition: service_healthy
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./ssl:/gmonit/ssl
    # extra_hosts:
    #   - "gmonit-collector.example:<example docker0 ip>172.17.0.1</>"

  caddy:
    restart: unless-stopped
    image: caddy:2.5.0
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./ssl:/gmonit/ssl
      - caddy_data:/data
    ports:
      - 80:80
      - 443:443
    networks:
      default:
        aliases:
          - gmonit.exampleс.ru
          - gmonit-collector.example.ru
    depends_on:
      grafana:
        condition: service_healthy
      collector:
        condition: service_healthy

# docker volume create gmonit_caddy_data
volumes:
  caddy_data:
    external: true
    name: gmonit_caddy_data
```

>Для всех заглушек вида `<<SOME_VALUE>>` нужно задать конкретные значения.

>Все URL вида `*.example.ru` заменить на реальные адреса для Grafana и коллектора

Список монтируемых директорий:

- ./ssl - сертификаты для выделенных доменов
- Caddyfile - файл с настройками для Caddy

Нужно создать внешние вольюмы:

- `docker volume create gmonit_caddy_data`

6. Запросить у команды GMonit актуальный `лицензионный колюч`.
