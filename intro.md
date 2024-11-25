GMonit использует [APM агенты NewRelic](https://docs.newrelic.com/docs/apm/new-relic-apm/getting-started/introduction-apm/).

Нужно задать хост `NEW_RELIC_HOST=collector.tseries.ru` и
ключ лицензии `NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789`.



# install

получить доступы в docker registry.

Положить докер-композ файл и миграции.


# SSL

Как правило, агенты не используют системные корневые сертификаты. И нужно явно указать путь.
Например, let's encrypt нет в зашитых сертификатах.

Вообще стоит расписать по каждой платформе приседания с SSL


# Миграции

Из-за особенностей clickhouse миграции - часть конфигурации.
Чтобы настроить репликацию или шардирование пока нужно явно указывать это в схеме.

# Отказоустойчивость

## Clickhouse

Реплики
Используем http(s) протокол, можно использовать любой балансер.

В Яндекс облаке не так, там доступны по адресам каждая нода
и отдельно текущий мастер.
Т.е. используется в работе только мастер, а реплика в резерве без нагрузки.

Не знаю какую модель нам нужно выбрать.

Шардинг Clickhouse не используется.
Наверное мы или не будем использовать шардинг совсем или
сделаем его на уровне приложения.

## Postgres

он пока не нагруженный, обычная репликация

## Redis

Нужно смотреть по нагрузке, думаю нам не нужен Redis Cluster.

Для того, чтобы сделать Redis Sentinel, наверное придется изменить код коллектора.
Пока не прорабатывался этот вариант.


# FAQ

Есть версия протокола и версия агента.
Версия протокола меняется очень редко.

версии протокола / версии агента

# Полезные настройки

https://docs.newrelic.com/docs/apm/agents/php-agent/configuration/php-agent-configuration/#inivar-tt-sql
Нужно newrelic.transaction_tracer.record_sql выставить в raw.

Это покажет в трейсах sql запросы с параметрами.

# PHP

Alpine использует musl, для него есть отдельный вариант:

https://download.newrelic.com/php_agent/archive/${NEW_RELIC_AGENT_VERSION}/newrelic-php5-${NEW_RELIC_AGENT_VERSION}-linux-musl.tar.gz


## SSL

newrelic-daemon считает, что let's encrypt - это не доверенный поставщик сертификатов.

Нужно ему подсунуть бандл с сертификатами
https://docs.newrelic.com/docs/apm/agents/php-agent/configuration/proxy-daemon-newreliccfg-settings/#proxy-settings

`ssl_ca_bundle`

и у графена на хосте не было `/etc/ssl/certs/ca-certificates.crt`.
а тот bundle, что был не сработал. Я скопировал из докер образа `newrelic/php-daemon`.

потом нужно перезапустить демона

`service newrelic-daemon restart`
