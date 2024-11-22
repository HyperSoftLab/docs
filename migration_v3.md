# Миграция GMonit с версии 2 на версию 3
Переход с версии 2 на версию 3 является подготовительным этапом для запуска новой системы работы с конфигурациями в GMonit.

## Инструкция по миграции:
1. Cоздать в Postgres базу данных `datomic`
2. Cоздать в ней пользователя `datomic` и владельца БД `datomic`
    или назначить права существующему пользователю PG для Grafana для доступа к БД `datomic`.
3. В базе данных `datomic` создать таблицу `datomic_kvs`
```sql
CREATE TABLE datomic_kvs
(
 id text NOT NULL,
 rev integer,
 map text,
 val bytea,
 CONSTRAINT pk_id PRIMARY KEY (id)
)
WITH (
 OIDS=FALSE
);
```
4. Добавить сервис `transactor` в `docker-compose.yml` или запустить его в виде отдельного docker-контейнера
```yaml
  transactor:
    restart: unless-stopped
    image: cr.yandex/crpih7d63vpcj5dfn8jj/transactor:1.0.6735
    environment:
      # `collector` должен иметь доступ по этому имени к `transactor`.
      # Если `collector` и `transactor` развернуты не в одном docker-compose,
      # то укажите доменное имя или ip адрес.
      # Раскомментируйте секцию `ports` чтобы пробросить порт на хост.
      HOST: transactor
      PORT: 4334

      # Замените $PG_HOST, $PG_USER, $PG_PASS на реальные значения сервера с БД `datomic`
      # с шага №1.
      SQL_URL: "jdbc:postgresql://$PG_HOST:5432/datomic?user=$PG_USER&password=$PG_PASS"

      NEW_RELIC_LICENSE_KEY: 0123456789-123456789-123456789-123456789
      # Замените на адрес коллектора
      NEW_RELIC_HOST: ${COLLECTOR_DOMAIN}
      # Замените на путь до самоподписанного сертификата
      # или закомментируйте, если используете Let's encrypt или аналоги.
      NEW_RELIC_CA_BUNDLE_PATH: ${CA_FILE}
      NEW_RELIC_LOG: stdout
      NEW_RELIC_APP_NAME: "[GMonit] Transactor"
    logging:
      driver: json-file
      options:
        max-size: 100m
        max-file: 5
    healthcheck:
      test: curl -f localhost:9999/health
      interval: 10s
      timeout: 5s
      retries: 10
    volumes:
      - ./ssl:/gmonit/ssl
    # ports:
    #   - "4334:4334"
    depends_on:
      postgres:
        condition: service_healthy
```
5. Заменить образ для `grafana`
```yaml
image: cr.yandex/crpih7d63vpcj5dfn8jj/grafana:v3
```
6. Заменить образ для `collector`
```yaml
image: cr.yandex/crpih7d63vpcj5dfn8jj/collector:v3
```
7. Если GMonit развернут через `docker-compose.yml`, добавить сервису `collector` зависимость от сервиса `transactor`
```yaml
  collector:
    depends_on:
      # ...
      transactor:
        condition: service_healthy
```
8. Установить коллектору переменную окружения `DATOMIC_URI`
```yaml
# Замените $PG_HOST, $PG_USER, $PG_PASS на реальные значения сервера с БД `datomic`
# с шага №1.
DATOMIC_URI: "datomic:sql://base?jdbc:postgresql://$PG_HOST:5432/datomic?user=$PG_USER&password=$PG_USER"
```
9. Увеличить на 1 значениние переменой коллектора `AGENT_ID_VERSION`. Если переменная не задана,
то установить `AGENT_ID_VERSION: 1`.
