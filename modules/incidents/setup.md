# Инциденты — Настройка

## Подключение алертов Grafana

Для работы инцидентов коллектор GMonit должен получать алерты из Grafana. Это требует настройки подключения коллектора к Grafana.

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
      - NEW_RELIC_HOST=<адрес-коллектора-GMonit>  # например, gmonit-collector.example.ru
      - NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789
      - NEW_RELIC_LOG=stdout
    volumes:
      - data:/data
    restart: unless-stopped

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

4. Создайте файл с учётными данными для basic-авторизации:

```bash
# Сгенерировать htpasswd (пароль будет запрошен интерактивно)
printf "<username>:$(openssl passwd -apr1)\n" > ./proxy/htpasswd
```

5. Закодируйте `<username>:<password>` в base64 — эта строка понадобится для подключения коллектора:

```bash
echo -n '<username>:<password>' | base64
```

Полученную строку использовать как значение `ANOMALY_CORRELATION_API_AUTH` в формате `Basic <base64-строка>`.

6. Запустите сервис:

```bash
docker compose up -d
```

Сервис будет доступен на порту `1111`. Параметры модели сохраняются в именованный volume `data` и переживают перезапуски контейнера.

> При первом запуске сервис инициализируется без обученных параметров. Первый вызов анализа запустит обучение, которое может занять до нескольких минут.

7. Проверьте работоспособность:

```bash
curl -u <username>:<password> http://<адрес-сервиса>:1111/healthcheck
```

Ожидаемый ответ:

```json
{"success": true, "data": null, "message": "ok"}
```

Если сервис недоступен — проверьте, запущен ли контейнер (`docker ps`).

### Подключение к коллектору

8. После развёртывания ML-сервиса задайте переменные окружения коллектора:

| Переменная | Описание | Пример |
|---|---|---|
| `ANOMALY_CORRELATION_ML_ENGINE_ENABLED` | Включить ML-движок корреляции | `true` |
| `ANOMALY_CORRELATION_API_URL` | URL развёрнутого ML-сервиса | `http://<адрес-сервиса>:1111` |
| `ANOMALY_CORRELATION_API_AUTH` | Авторизация | `Basic <base64-строка>` |

<!-- STEP_GUIDE:END -->
