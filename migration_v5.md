# Обновление до v5

v5 — мажорная версия GMONIT: обновление с v4 требует действий на стороне инсталляции. Пока подготовка не сделана, collector и grafana v5 не запустятся и напишут в лог, что исправить.

!> **Перед обновлением обязательно сделайте бэкап базы Grafana.** При первом запуске Grafana 13 мигрирует свою базу данных, после этого вернуться на v4 можно только из бэкапа. Как сделать бэкап — в разделе [Бэкап базы Grafana](#Бэкап-базы-grafana).

## Что изменилось

| Изменение | Что сделать |
|---|---|
| Grafana обновлена с 12.4 до 13.3 | [Сделать бэкап базы Grafana](#Бэкап-базы-grafana) |
| Лицензионный ключ в формате JWT в переменной `GMONIT_LICENSE_KEY` у collector и grafana | [Получить новый ключ](#Лицензионный-ключ) |
| ClickHouse не ниже 26.8.16.41 (26.8 LTS) | [Обновить ClickHouse](#clickhouse-и-keeper) |
| ClickHouse Keeper не ниже 26.8.16.41 обязателен, переменная `KEEPER_CONNECT` у collector обязательна | [Развернуть Keeper](#clickhouse-и-keeper), если его ещё нет |
| Таблица `nr_infra_metrics_events` обязательно партиционирована по дням | [Перевести таблицу на v4](#Таблица-инфраструктурных-метрик), если она ещё не переведена |
| Браузерные агенты старше 1.259.0 не принимаются | [Обновить агент на сайтах](#Браузерные-агенты) |
| Плагин Altinity ClickHouse удалён из образа grafana | Если на нём есть свои дашборды или алерты, [поставить плагин переменной окружения](#Датасорс-altinity-clickhouse) `GF_PLUGINS_PREINSTALL` |

## Подготовка

Всё из этого раздела делается до обновления, пока работает v4.

### Бэкап базы Grafana

Сделайте бэкап обязательно: без него вернуться на v4 после обновления не получится.

- Обычно Grafana хранит данные в Postgres из настроек `GF_DATABASE_*`. Сделайте дамп `pg_dump`. Для [примера пилота](https://github.com/HyperSoftLab/docs/tree/master/examples/pilot):
  ```sh
  docker compose exec postgres pg_dump -U postgres postgres | gzip > grafana.sql.gz
  ```
- Если внешняя база не настроена, Grafana хранит всё в SQLite: остановите Grafana и скопируйте файл `/var/lib/grafana/data/grafana.db`.

### Лицензионный ключ

Ключи старого формата v5 не принимает: с ними не запустятся ни collector, ни grafana. Получите новый ключ в поддержке — support@gmonit.ru.

### ClickHouse и Keeper

Минимальная версия ClickHouse — 26.8.16.41 (26.8 LTS). Со старой версией collector не запустится.

- Обновите ClickHouse до 26.8.16.41 или новее.
- После обновления ClickHouse проверьте [пользовательские дашборды](/modules/custom-dashboards.md): запросы с `WITH` на новой версии ClickHouse могут сломаться. Если сломались, обращайтесь в поддержку — support@gmonit.ru.

Collector v5 не работает без ClickHouse Keeper: если не задана переменная `KEEPER_CONNECT`, он не запустится. Keeper нужен версии 26.8.16.41 или новее.

- Если Keeper ещё не развёрнут, проще всего включить встроенный Keeper в сервере ClickHouse, как в [примере для пилота](https://github.com/HyperSoftLab/docs/tree/master/examples/pilot): конфигурация `clickhouse/keeper.xml` и `KEEPER_CONNECT: clickhouse:9181` у collector. За развёртыванием Keeper под вашу инсталляцию обращайтесь в поддержку.
- Версию Keeper collector узнаёт командой `srvr`. Если `srvr` выключен в `four_letter_word_white_list`, collector версию Keeper не проверяет.

### Таблица инфраструктурных метрик

Collector v5 требует, чтобы `nr_infra_metrics_events` была Merge-фасадом над таблицами с партициями по дням. Если таблица ещё не переведена, collector v5 не запустится. Перевести её можно только на v4, сборке `v4-7353` или новее.

Запросы ниже выполняются в ClickHouse, в базе GMONIT (`CLICKHOUSE_DB` у collector). В примере пилота консоль ClickHouse открывается так:

```sh
docker compose exec clickhouse sh -c 'clickhouse-client -u "$CLICKHOUSE_USER" --password "$CLICKHOUSE_PASSWORD"'
```

1. Проверьте движок таблицы:
   ```sql
   select engine from system.tables
   where database = currentDatabase() and name = 'nr_infra_metrics_events'
   ```
   Если движок `Merge` или таблицы нет, переход уже сделан, дальше ничего делать не нужно. Иначе продолжайте.
2. Добавьте collector переменную окружения `INFRA_METRICS_EVENTS_ENGINE_MERGE=true` и перезапустите его. Collector создаст партиционированную таблицу `nr_infra_metrics_events_v2` и фасад `nr_infra_metrics_events_merge` и начнёт писать новые метрики в `nr_infra_metrics_events_v2`.
3. Сразу после перезапуска переименуйте таблицы. Пока этого не сделать, новые метрики не видны на дашбордах: они читают старую таблицу.
   ```sql
   rename table nr_infra_metrics_events to nr_infra_metrics_events_v1, nr_infra_metrics_events_merge to nr_infra_metrics_events
   ```
4. Повторите запрос из шага 1: движок должен быть `Merge`.

После переименования фасад `nr_infra_metrics_events` показывает и старые данные из `nr_infra_metrics_events_v1`, и новые из `nr_infra_metrics_events_v2`. Переменная `INFRA_METRICS_EVENTS_ENGINE_MERGE` больше не нужна: пока `nr_infra_metrics_events` — фасад, collector пишет в `nr_infra_metrics_events_v2` и без неё.

Таблицу `nr_infra_metrics_events_v1` можно удалить, когда истечёт срок хранения инфраструктурных метрик (`INFRA_METRICS_EVENTS_TTL_DAY`, по умолчанию 30 дней): `drop table nr_infra_metrics_events_v1`.

### Браузерные агенты

Collector v5 отклоняет браузерные агенты старше 1.259.0 (май 2024), в том числе версии старого формата вроде `1223.PROD`. Он отвечает `400` с текстом `Browser agent <версия> is not supported, update it to 1.259.0 or later`, ответ виден во вкладке Network в DevTools браузера. Без ответа на первый запрос агент выключается, и данные с сайта перестают приходить.

Проверьте, какие версии присылают сайты: в боковом меню откройте «Браузерный мониторинг» — в списке приложений есть колонка «Версия агента».

Сайты со старым агентом переведите на 1.259.0 или новее. Подходят агент из [инструкции по установке](/agent_installation_guide/RUM/real_user_monitoring.md) (1.262.0) и loader, который collector отдаёт APM-агентам (1.278.2).

### Датасорс Altinity ClickHouse

Плагин `vertamedia-clickhouse-datasource` (датасорс `Clickhouse`) больше не входит в образ grafana. Датасорс по умолчанию теперь `GrafanaClickHouse` — официальный плагин ClickHouse. Встроенные дашборды и алерты GMONIT от Altinity не зависят.

Датасорс `Clickhouse` остаётся в базе grafana со всеми настройками и тем же uid, но без плагина не работает. Если своих дашбордов и алертов на нём нет, этот шаг можно пропустить. Иначе поставьте плагин сами — после этого дашборды на `Clickhouse` заработают без правок.

Плагин ставится переменной окружения grafana:

```yaml
grafana:
  environment:
    GF_PLUGINS_PREINSTALL: vertamedia-clickhouse-datasource@3.5.0
```

Grafana ставит плагин в фоне после старта и запуск не задерживает, нужен доступ к grafana.com. Ставьте именно так, а не из каталога плагинов в интерфейсе: установленный оттуда плагин пропадёт при обновлении образа.

В закрытом контуре, без доступа к grafana.com, соберите образ поверх нашего:

```dockerfile
FROM cr.yandex/gmonit.ru/grafana:<тег v5>
RUN grafana cli plugins install vertamedia-clickhouse-datasource 3.5.0
```

Панели и переменные, где датасорс не выбран явно, а взят по умолчанию, переключатся на `GrafanaClickHouse` даже с установленным плагином, и запросы в формате Altinity в них сломаются. Такие панели переведите на `Clickhouse` явно или перепишите запросы под официальный плагин.

## Обновление

1. Убедитесь, что бэкап базы Grafana сделан.
2. Задайте `GMONIT_LICENSE_KEY` с новым ключом и у collector, и у grafana. Старые `LICENSE_KEY` у collector и `GMONIT_LICENSE` у grafana v5 не читает, их можно удалить.
3. Проверьте, что у collector задан `KEEPER_CONNECT`.
4. Если нужен датасорс Altinity, задайте у grafana `GF_PLUGINS_PREINSTALL=vertamedia-clickhouse-datasource@3.5.0`.
5. Удалите у collector переменные `INFRA_METRICS_EVENTS_ENGINE_MERGE` и `INFRA_1_ACTS_AS_INFRA_2`, если они заданы: в v5 их больше нет.
6. Обновите теги образов collector и grafana на сборку v5 из [релизов](/releases.md).
7. Перезапустите контейнеры.

## После обновления

Таблицу `dev_infra_metrics_events` collector v5 больше не создаёт, и её никто не читает. На обновлённых инсталляциях она остаётся, её можно удалить: `drop table dev_infra_metrics_events`.
