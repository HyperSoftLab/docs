# Инциденты — Настройка

## Подключение алертов Grafana

Для работы инцидентов коллектор GMONIT должен получать алерты из Grafana. Это требует настройки подключения коллектора к Grafana.

<!-- STEP_GUIDE:START Настройка подключения коллектора к Grafana для получения алертов: необходимые параметры, получение токена. -->

Коллектор получает алерты через Grafana Annotations API. Задайте переменные окружения коллектора:

| Переменная | Описание | Пример |
|---|---|---|
| `GRAFANA_API_URL` | URL к Grafana API | `http://grafana:3000/api` |
| `GRAFANA_API_AUTHORIZATION` | Заголовок авторизации | `Bearer glsa_xxxxxxxxxxxx` |

Дополнительные параметры детектирования (менять не обязательно, значения по умолчанию подходят для большинства случаев):

| Переменная | Описание | По умолчанию |
|---|---|---|
| `INCIDENT_MANAGER_DETECT_TIME_WINDOW_MINUTE` | Ширина временного окна, в котором ищутся аномалии при срабатывании алерта (мин) | `30` |
| `INCIDENT_MANAGER_DETECT_TIME_WINDOW_SHIFT` | На сколько минут сдвинуть окно в прошлое относительно момента алерта. Позволяет захватить аномалии, начавшиеся до срабатывания алерта | `15` |

Для получения `GRAFANA_API_AUTHORIZATION`:

1. Откройте Grafana → Administration → Service accounts
2. Создайте сервисный аккаунт с ролью Viewer
3. Сгенерируйте токен
4. Укажите значение в формате `Bearer <токен>`

<!-- STEP_GUIDE:END -->

## Статический движок корреляции

Статический движок (`[GMonit] Unified anomaly grouping`) включён по умолчанию и не требует дополнительных сервисов. При необходимости можно настроить его параметры через переменные окружения коллектора.

<!-- STEP_GUIDE:START Параметры статического движка корреляции: доступные настройки, влияние на поведение, значения по умолчанию. -->

| Переменная | Описание | По умолчанию |
|---|---|---|
| `ANOMALY_CORRELATION_STATIC_ENGINE_ENABLED` | Включить статический движок | `true` |
| `UNIFIED_ENGINE_MAX_INTERVAL_MINUTE` | Макс. интервал между алертами/выбросами для группировки в один инцидент (мин). Если два алерта произошли дальше друг от друга — они попадут в разные инциденты | `10` |
| `UNIFIED_ENGINE_BFS_DEPTH` | Глубина обхода графа связности сервисов. `0` — только прямые связи, `1` — сервисы через одного соседа и т.д. | `0` |
| `UNIFIED_ENGINE_TOP_OUTLIERS` | Сколько самых сильных выбросов использовать как ядро корреляции инцидента. Чем больше — тем шире охват, но больше шума | `20` |

<!-- STEP_GUIDE:END -->

## ML-движок корреляции

Для использования ML-алгоритма корреляции необходимо развернуть дополнительный сервис, который выполняет ML-логику. Сервис поставляется как Docker-образ и требует персистентного хранилища для сохранения параметров модели между перезапусками.

<!-- STEP_GUIDE:START Развёртывание и настройка ML-сервиса корреляции: необходимый сервис, процесс деплоя, параметры коллектора. -->

В результате будет развёрнуто два контейнера: ML-сервис корреляции и nginx-прокси перед ним. Прокси обеспечивает basic-авторизацию — её можно пропустить (шаги 4–5), если авторизация не нужна. Если nginx уже настроен снаружи, сервис `proxy` из `compose.yaml` и шаги 3–5 можно пропустить полностью.

### Развёртывание сервиса

1. Создайте директорию для сервиса и перейдите в неё:

```bash
mkdir anomaly-correlation && cd anomaly-correlation
```

2. Создайте файл `compose.yaml`:

```yaml
services:
  anomaly-correlation-ml-service:
    image: cr.yandex/crpih7d63vpcj5dfn8jj/anomaly-correlation-ml-service:main
    environment:
      - PYTHONUNBUFFERED=1
      - SERVICE_PARAMS_DIR=/data
      - NEW_RELIC_HOST=<адрес-коллектора-GMONIT>  # например, gmonit-collector.example.ru
      - NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789
      - NEW_RELIC_LOG=stdout
    volumes:
      - data:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M

  proxy:
    image: nginx:latest
    ports:
      - 1111:80
    volumes:
      - ./proxy/nginx.conf:/etc/nginx/nginx.conf
      - ./proxy/htpasswd:/etc/nginx/htpasswd
    depends_on:
      - anomaly-correlation-ml-service
    restart: unless-stopped

volumes:
  data:
```

3. Создайте директорию для конфигурации прокси и файл `proxy/nginx.conf`:

```bash
mkdir proxy
```

```conf
worker_processes 1;
events { worker_connections 1024; }

http {
    include mime.types;
    default_type application/octet-stream;
    client_max_body_size 100m;
    sendfile on;
    keepalive_timeout 600;
    send_timeout 600;

    server {
        listen 80;
        server_name localhost;
        proxy_read_timeout 600;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;

        # Удалите эти строки, если basic-авторизация не нужна
        auth_basic           "Auth";
        auth_basic_user_file /etc/nginx/htpasswd;

        location / {
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://anomaly-correlation-ml-service:80;
        }
    }
}
```

4. Создайте файл с учётными данными для basic-авторизации *(пропустите этот шаг и шаг 5, если авторизация не нужна или nginx уже настроен)*:

```bash
# Сгенерировать htpasswd (пароль будет запрошен интерактивно)
printf "<username>:$(openssl passwd -apr1)\n" > ./proxy/htpasswd
```

5. *(Если настроена авторизация)* Закодируйте `<username>:<password>` в base64 — эта строка понадобится для подключения коллектора:

```bash
echo -n '<username>:<password>' | base64
```

Полученную строку использовать как значение `ANOMALY_CORRELATION_API_AUTH` в формате `Basic <base64-строка>`.

6. Запустите сервис:

```bash
docker compose up -d
```

Сервис будет доступен на порту `1111`. Параметры модели сохраняются в именованный volume `data` и переживают перезапуски контейнера.

7. Проверьте работоспособность:

```bash
# С авторизацией:
curl -u <username>:<password> http://<адрес-сервиса>:1111/healthcheck
# Без авторизации:
curl http://<адрес-сервиса>:1111/healthcheck
```

Ожидаемый ответ:

```json
{"success": true, "data": null, "message": "ok"}
```

Если сервис недоступен — проверьте, запущен ли контейнер (`docker ps`).

> При первом запуске сервис инициализируется без обученных параметров. Первый вызов анализа запустит обучение, которое может занять до нескольких минут.

### Подключение к коллектору

8. После развёртывания ML-сервиса задайте переменные окружения коллектора:

| Переменная | Описание | Пример |
|---|---|---|
| `ANOMALY_CORRELATION_ML_ENGINE_ENABLED` | Включить ML-движок корреляции | `true` |
| `ANOMALY_CORRELATION_API_URL` | URL развёрнутого ML-сервиса | `http://<адрес-сервиса>:1111` |
| `ANOMALY_CORRELATION_API_AUTH` | Авторизация (опционально — только если настроена basic-авторизация на прокси) | `Basic <base64-строка>` |

<!-- STEP_GUIDE:END -->

## Materialized Outliers

По умолчанию выбросы вычисляются «на лету» при каждом запросе — это тяжёлый запрос с агрегацией по всей истории метрик. Materialized Outliers переносит это вычисление в фоновый процесс: выбросы считаются при поступлении данных и сохраняются в отдельную таблицу. Запросы к инцидентам становятся быстрее, нагрузка на ClickHouse при детектировании снижается.

Подсистема создаёт:
- `nr_metric_quantiles_hourly` — почасовые квантили метрик (TTL 3 дня)
- `nr_metric_quantiles_hourly_mv` — MV, заполняющий квантили из входящих метрик
- `nr_metric_quantiles_dict` — словарь, кеширующий квантили (обновляется каждые 2–5 мин)
- `nr_metric_outliers` — таблица предвычисленных выбросов (TTL 30 дней)
- `nr_metric_outliers_mv` — MV, записывающий выбросы при поступлении метрик

<!-- STEP_GUIDE:START Включение флага MATERIALIZED_OUTLIERS_ENABLED: переменная окружения, что происходит при включении. Бэкфил: зачем нужен, три запроса по порядку (квантили → перезагрузка словаря → выбросы). Поведение без бэкфила: MVs собирают только новые данные, когда появятся первые результаты. -->

### Включение

Задайте переменную окружения коллектора и перезапустите его:

| Переменная | Значение |
|---|---|
| `MATERIALIZED_OUTLIERS_ENABLED` | `true` |

При старте коллектор создаст все необходимые таблицы, MV, UDF и словарь. С этого момента новые метрики автоматически попадают в `nr_metric_outliers`.

### Бэкфил

Без бэкфила MV накапливают данные только с момента включения. Данных в словаре квантилей не будет несколько часов — выбросы не будут обнаруживаться, пока не накопится достаточная история.

Чтобы заполнить таблицы историческими данными, выполните три запроса **по порядку** в ClickHouse.

> Рекомендуемый период бэкфила — 1–2 дня. Этого достаточно для формирования базовой статистики квантилей. Если требуется заполнение за более длительный период — обратитесь к команде разработки.

**1. Заполнить квантили:**

```sql
-- Задайте период бэкфила (не превышайте TTL таблицы — 3 дня).
-- Если нужно, добавьте фильтр по account_id.
INSERT INTO nr_metric_quantiles_hourly
SELECT
    account_id,
    cityHash64(account_id, app_name, language, host, pid, name, scope) AS key,
    toStartOfHour(start) AS hour,
    quantilesState(0.25, 0.75, 0.5)(call_count) AS call_count_state,
    quantilesState(0.25, 0.75, 0.5)(
        toFloat32(if(call_count = 0, 0, total_call_time / call_count))
    ) AS avg_state
FROM nr_metric_data_by_name_by_minute_v2
WHERE scope = ''
  AND NOT (
    startsWith(name, 'GMonit/')         OR
    startsWith(name, 'Supportability/') OR
    startsWith(name, 'Custom/')         OR
    startsWith(name, 'Instrument/')
  )
  AND start >= '<BACKFILL_FROM>'  -- например: '2025-01-20 00:00:00'
  AND start <  '<BACKFILL_TO>'    -- например: '2025-01-23 00:00:00'
GROUP BY account_id, key, hour
```

**2. Перезагрузить словарь** (не ждать авто-обновления):

```sql
SYSTEM RELOAD DICTIONARY nr_metric_quantiles_dict
```

**3. Заполнить выбросы:**

```sql
-- Задайте тот же период, что и для квантилей (не превышайте TTL — 30 дней).
-- Если нужно, добавьте фильтр по account_id.
INSERT INTO nr_metric_outliers
WITH
    dictGet('nr_metric_quantiles_dict', 'call_count_qs',
        cityHash64(account_id, app_name, language, host, pid, name, scope)) AS call_count_qs,
    dictGet('nr_metric_quantiles_dict', 'avg_qs',
        cityHash64(account_id, app_name, language, host, pid, name, scope)) AS avg_qs,
    if(call_count = 0, 0, total_call_time / call_count) AS average
SELECT
    account_id, app_name, language, host, pid, name, scope, start,
    outlier_check(
        outlier_score(call_count, call_count_qs[1], call_count_qs[2]),
        call_count, call_count_qs[3], 3, 0.1
    ) AS call_count_score,
    call_count                                                        AS call_count_value,
    call_count_qs[2] + 3 * (call_count_qs[2] - call_count_qs[1])     AS call_count_threshold,
    call_count_qs[1] - 3 * (call_count_qs[2] - call_count_qs[1])     AS call_count_threshold_lower,
    outlier_check(
        outlier_score(average, avg_qs[1], avg_qs[2]),
        average, avg_qs[3], 3, 0.1
    ) AS avg_score,
    average                                                           AS avg_value,
    avg_qs[2] + 3 * (avg_qs[2] - avg_qs[1])                          AS avg_threshold,
    avg_qs[1] - 3 * (avg_qs[2] - avg_qs[1])                          AS avg_threshold_lower,
    agent_version,
    labels
FROM nr_metric_data_null_v2
WHERE start >= '<BACKFILL_FROM>'  -- например: '2025-01-20 00:00:00'
  AND start <  '<BACKFILL_TO>'    -- например: '2025-01-23 00:00:00'
  AND scope = ''
  AND NOT (
    startsWith(name, 'GMonit/')         OR
    startsWith(name, 'Supportability/') OR
    startsWith(name, 'Custom/')         OR
    startsWith(name, 'Instrument/')
  )
  AND dictHas('nr_metric_quantiles_dict',
        cityHash64(account_id, app_name, language, host, pid, name, scope))
  AND (call_count_score > 0 OR avg_score > 0)
SETTINGS allow_experimental_analyzer = 1
```

### Без бэкфила

Если бэкфил не выполнялся:
- Квантили накапливаются по мере поступления новых метрик — по одной записи на метрику в час
- Словарь использует последние 48 часов квантилей; пока они не накопились, выбросы не обнаруживаются
- Первые выбросы появятся через несколько часов после включения, стабильное качество — через 1–2 дня

<!-- STEP_GUIDE:END -->
