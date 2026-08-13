# Установка агента для чтения Технологического журнала 1С (Docker Compose)

Данный документ описывает процесс установки и настройки агента для чтения Технологического журнала (ТЖ) 1С с использованием Docker Compose. Агент построен на основе Vector — парсит файлы ТЖ и отправляет события напрямую в ClickHouse GMonit.

**Целевая среда:** Linux-сервер с Docker и Docker Compose (отдельная ВМ для агентов 1С).

> **Рекомендация:** Аналогично ЖР — расшарить папку с ТЖ на сервере 1С и смонтировать на ВМ с агентами, чтобы не нагружать серверы 1С.

> ⚠️ **ВАЖНЫЕ УСЛОВИЯ:**
> * Папка с Технологическим журналом должна быть доступна на сервере с агентом (NFS/CIFS/локально).
> * Доступ до **ClickHouse** GMonit по HTTP/HTTPS.
> * ТЖ должен быть включён на сервере 1С (через `logcfg.xml`).
> * Docker и Docker Compose установлены.

> **Поддерживаемые события ТЖ** (с готовыми дашбордами): `DBMSSQL`, `TLOCK`, `TTIMEOUT`, `SDBL`, `EXCP`, `CALL`.

### Структура файлов ТЖ

Агент ожидает стандартную структуру файлов ТЖ:

```
tech_log/
  ├── 1cv8_18708/
  │   ├── 25072411.log
  │   └── 25072412.log
  └── rphost_5708/
      └── 25072411.log
```

> Если между файлами `rphost` и родительской папкой ТЖ есть дополнительные подпапки, добавьте `/*` в переменную `FILES_INCLUDE` (см. ниже).


## Установка и настройка

Вы получили архив `tj-agent-offline.tar.gz` с агентом чтения Технологического журнала 1С.

**Целевая среда:** Linux-сервер с Docker и Docker Compose.

### 0\. Предварительные требования

* **Docker** и **Docker Compose** установлены.
* Папка с ТЖ смонтирована на сервер (NFS/CIFS) или доступна локально.
* ТЖ **включён** на сервере 1С через `logcfg.xml`.
* Сетевой доступ до **ClickHouse** GMonit (порт 8123/8443).
* Таблица `dev_one_c_tech_log_events` существует в ClickHouse (создаётся при установке GMonit).

### 1\. Распаковка архива

```bash
tar -xvzf tj-agent-offline.tar.gz
cd tj_agent_bundle/
```

### 2\. Загрузка Docker-образа

```bash
docker load -i vector.tar
```

**Проверка:**

```bash
docker images | grep vector
```

### 3\. Настройка

**Файл `.env`** — заполните параметры подключения:

```bash
nano .env
```

| Плейсхолдер | Описание | Пример |
| --- | --- | --- |
| `<<CLICKHOUSE_ENDPOINT>>` | HTTP(S) адрес ClickHouse GMonit | `http://clickhouse.company.com:8123` |
| `<<CLICKHOUSE_USER>>` | Пользователь ClickHouse | `gmonit` |
| `<<CLICKHOUSE_PASSWORD>>` | Пароль ClickHouse | `password` |
| `<<CLICKHOUSE_DATABASE>>` | Имя базы данных ClickHouse | `default` |
| `<<TECH_LOG_PATH>>` | Путь до директории с ТЖ | `/mnt/1c/tech_log` |
| `<<SERVER_ID>>` | Уникальный ID сервера 1С | `srv-erp-01` |
| `<<TIMEZONE>>` | Часовой пояс (UTC offset) | `+03:00` |

> **SSL-сертификат:** положите CA-сертификат ClickHouse в `./ssl/rootCA.crt`.

> **Структура файлов ТЖ:** если между папками процессов (`rphost_*`) и корнем ТЖ есть дополнительные подпапки, добавьте в `.env`: `FILES_INCLUDE=/var/log/one_c_tech_logs/*/*/*`

**Файл `compose.yml`** — замените имя контейнера:

| Плейсхолдер | Описание | Пример |
| --- | --- | --- |
| `<<CONTAINER_NAME>>` | Имя контейнера | `tj-agent-erp` |

### 4\. Запуск

```bash
docker compose up -d
```

### 5\. Проверка корректности работы

**Статус контейнера:**

```bash
docker compose ps
```

Ожидаемый результат: контейнер `running`.

**Логи Vector:**

```bash
docker compose logs -f vector --tail=50
```

**Проверка health check Vector API:**

```bash
curl -s http://localhost:8686/health
```

Ожидаемый ответ: `{"ok":true}`.

**Проверка данных в ClickHouse** (через GMonit UI → Explore):

```sql
SELECT *
FROM dev_one_c_tech_log_events
ORDER BY timestamp DESC
LIMIT 10
```

**Проверка ошибок:**

```bash
docker compose logs vector | grep -i "error\|failed"
```

### 6\. Критерии успеха

| Критерий | Как проверить |
| --- | --- |
| Контейнер запущен | `docker compose ps` → `running` |
| Vector API отвечает | `curl http://localhost:8686/health` → `{"ok":true}` |
| ClickHouse подключён | В логах нет `connection refused` для ClickHouse |
| Данные поступают | SQL-запрос к `dev_one_c_tech_log_events` возвращает строки |
| Нет ошибок парсинга | В логах нет массовых `ERROR` от DLQ |

### 7\. Типичные ошибки и решения

| Ошибка | Причина | Решение |
| --- | --- | --- |
| `connection refused` (ClickHouse) | Нет сети или неверный endpoint | Проверьте: `curl -s <<CLICKHOUSE_ENDPOINT>>` |
| `Authentication failed` (ClickHouse) | Неверные логин/пароль | Проверьте `CLICKHOUSE_USER` и `CLICKHOUSE_PASSWORD` |
| `Table not found: dev_one_c_tech_log_events` | Таблица не создана в ClickHouse | Убедитесь что GMonit версии с поддержкой 1С ТЖ |
| `No files matched` | Неверный путь к ТЖ или нет файлов `.log` | Проверьте `TECH_LOG_LOCATION`, убедитесь что ТЖ включён в `logcfg.xml` |
| DLQ `ERROR` в логах | Ошибка парсинга отдельных событий | Единичные ошибки нормальны. Массовые — проверьте формат ТЖ |
| `certificate verify failed` | Проблема с SSL-сертификатом ClickHouse | Проверьте `./ssl/rootCA.crt` |
| `Connection reset by peer` / `proxy error` | HTTPS-прокси на хосте перехватывает трафик к ClickHouse | Добавьте `NO_PROXY` и `no_proxy` в environment контейнера (см. ниже) |
| Контейнер перезапускается | Ошибка конфигурации Vector | `docker compose logs vector --tail=100` |

> **При наличии HTTPS-прокси на хосте:** Docker-контейнеры наследуют прокси-настройки. Если ClickHouse недоступен из-за прокси, добавьте в секцию `environment` файла `compose.yml`:
> ```yaml
> NO_PROXY: "<<CLICKHOUSE_HOST>>"
> no_proxy: "<<CLICKHOUSE_HOST>>"
> ```

### 8\. Управление агентом (справочник команд)

| Действие | Команда |
| --- | --- |
| Запуск | `docker compose up -d` |
| Остановка | `docker compose down` |
| Перезапуск | `docker compose restart vector` |
| Статус | `docker compose ps` |
| Логи (реальное время) | `docker compose logs -f vector --tail=50` |
| Health check | `curl -s http://localhost:8686/health` |
| Сброс позиции чтения | `docker compose down && docker volume rm <volume_name> && docker compose up -d` |

### 9\. Контрольный чек-лист

| Шаг | Действие | Проверка |
| --- | --- | --- |
| 1 | Docker-образ загружен | `docker images \| grep vector` |
| 2 | `.env` заполнен | `cat .env` — все плейсхолдеры заменены |
| 3 | SSL-сертификат на месте | `ls ./ssl/rootCA.crt` |
| 4 | ТЖ доступен | `ls <<TECH_LOG_PATH>>` — есть папки процессов |
| 5 | Контейнер запущен | `docker compose ps` → `running` |
| 6 | Vector API отвечает | `curl http://localhost:8686/health` |
| 7 | Данные в ClickHouse | SQL: `SELECT count() FROM dev_one_c_tech_log_events` |
| 8 | Данные в GMonit UI | Explore → запрос к `dev_one_c_tech_log_events` |

### 10\. Подключение нескольких ТЖ (несколько кластеров 1С)

Один экземпляр агента читает один каталог ТЖ. Для **каждого дополнительного кластера 1С** или **каждого дополнительного ТЖ** запускается отдельный экземпляр Vector в своей папке.

**Структура:**

```
/opt/gmonit-agents/
├── tj-erp/
│   ├── compose.yml
│   ├── .env
│   └── vector/vector.yml
├── tj-zup/
│   ├── compose.yml
│   ├── .env
│   └── vector/vector.yml
└── ...
```

**Что меняется между экземплярами (в `.env`):**

| Параметр | Зачем разный |
| --- | --- |
| `TECH_LOG_PATH` | Путь до каталога ТЖ конкретного кластера 1С |
| `SERVER_ID` | Уникальный идентификатор источника в ClickHouse (например `srv-erp-01`, `srv-zup-01`) |
| `CONTAINER_NAME` | Имя docker-контейнера (должно быть уникальным на хосте, например `tj-agent-erp`, `tj-agent-zup`) |

**Что остаётся одинаковым:** `CLICKHOUSE_*` параметры, `TIMEZONE`, путь к SSL-сертификату.

**Запуск каждого экземпляра:**

```bash
cd /opt/gmonit-agents/tj-erp && docker compose up -d
cd /opt/gmonit-agents/tj-zup && docker compose up -d
```

В GMonit UI данные с разных ТЖ разделяются по полю `SERVER_ID`.


