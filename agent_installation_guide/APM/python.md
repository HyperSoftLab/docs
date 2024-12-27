# Установка Python-агента для Django

Для установки и настройки Python-агента New Relic в Django выполните следующие шаги:

---

### 1. Установка пакета New Relic

Установите агент из PyPi, выполнив следующую команду:

```bash
pip install newrelic
```

---

### 2. Настройка агента

Для начала работы агенту Python необходимы базовые настройки. Их можно задать двумя способами: через конфигурационный файл или переменные окружения.

---

#### Способ 1: Использование конфигурационного файла

1. Перейдите в рабочий каталог, в котором вы можете сохранить файл, и выполните команду:

   ```bash
   newrelic-admin generate-config 0123456789-123456789-123456789-123456789 newrelic.ini
   ```

2. Откройте файл `newrelic.ini` и внесите изменения в следующие параметры:

   ```ini
   license_key = 0123456789-123456789-123456789-123456789 # Ключ (заглушка, не меняем)
   host = gmonit-collector.<<DOMAIN>>.ru # Домен коллектора
   app_name = "MY_AWESOME_APP" # Название приложения
   ```

---

#### Способ 2: Использование переменных окружения

Для настройки без конфигурационного файла можно задать переменные окружения. Выполните следующие команды:

```bash
NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789
NEW_RELIC_HOST=gmonit-collector.<DOMAIN>.ru # Домен коллектора
NEW_RELIC_APP_NAME="MY_AWESOME_APP" # Название приложения
```

---

### Подробнее

Для более детальной информации о конфигурации агента обратитесь к [официальной документации New Relic](https://docs.newrelic.com/install/python/).

---

# Установка Python-агента для FastAPI

Для установки и настройки Python-агента New Relic в FastAPI выполните следующие шаги:

---

### 1. Установка пакета New Relic

Установите агент из PyPi, выполнив следующую команду:

```bash
pip install newrelic
```

---

### 2. Настройка агента

Агенту Python необходимы базовые настройки. Их можно задать через конфигурационный файл или переменные окружения.

---

#### Способ 1: Использование конфигурационного файла

1. Перейдите в рабочий каталог, в котором вы можете сохранить файл, и выполните команду:

   ```bash
   newrelic-admin generate-config 0123456789-123456789-123456789-123456789 newrelic.ini
   ```

2. Откройте файл `newrelic.ini` и внесите изменения в следующие параметры:

   ```ini
   license_key = 0123456789-123456789-123456789-123456789 # Ключ (заглушка, не меняем)
   host = gmonit-collector.<<DOMAIN>>.ru # Домен коллектора
   app_name = "MY_FAST_API_APP" # Название приложения
   ```

---

#### Способ 2: Использование переменных окружения

Для настройки без конфигурационного файла можно задать переменные окружения. Выполните следующие команды:

```bash
NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789
NEW_RELIC_HOST=gmonit-collector.<DOMAIN>.ru # Домен коллектора
NEW_RELIC_APP_NAME= "MY_FAST_API_APP" # Название приложения
```

---

### 3. Интеграция агента с FastAPI

Для запуска вашего приложения FastAPI с агентом New Relic необходимо использовать команду `newrelic-admin run-program` перед командой запуска вашего приложения.

#### Пример запуска приложения с Uvicorn:

```bash
newrelic-admin run-program uvicorn main:app --host 0.0.0.0 --port 8000
```

- **`main:app`** — путь к вашему приложению FastAPI. Если ваш файл называется `main.py` и содержит объект приложения `app`, то этот синтаксис корректен.
- **`--host 0.0.0.0`** — слушать на всех интерфейсах.
- **`--port 8000`** — порт, на котором будет доступно ваше приложение.

---

#### Пример запуска приложения с Gunicorn:

```bash
newrelic-admin run-program gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

- **`-w 4`** — количество рабочих процессов.
- **`-k uvicorn.workers.UvicornWorker`** — использование `UvicornWorker` для асинхронной обработки.

---

### Подробнее

Для более детальной информации о конфигурации агента обратитесь к [официальной документации New Relic](https://docs.newrelic.com/install/python/).