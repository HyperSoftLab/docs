# Мониторинг Redis с использованием New Relic

Для настройки мониторинга Redis с использованием инфраструктурного агента New Relic выполните следующие шаги:


### Шаг 1: Создание файла конфигурации для Redis

1. Создайте файл конфигурации `redis-config.yml` в директории `/etc/newrelic-infra/integrations.d`.

2. Добавьте в файл следующий контент, откорректировав данные подключения к Redis:

```yaml
integrations:
  - name: nri-redis
    env:
      METRICS: true
      HOSTNAME: localhost
      PORT: 6379
      PASSWORD: "my_password" # Укажите пароль для подключения (если требуется)
      REMOTE_MONITORING: true
    interval: 15s
    labels:
      environment: production

  - name: nri-redis
    env:
      INVENTORY: true
      HOSTNAME: localhost
      PORT: 6379
      PASSWORD: "my_password" # Укажите пароль для подключения (если требуется)
      REMOTE_MONITORING: true
    interval: 60s
    labels:
      environment: production
    inventory_source: config/redis
```


### Шаг 2: Пример базового контейнера с инфраструктурным агентом

Если вы хотите использовать контейнер с инфраструктурным агентом для мониторинга Redis, выполните следующие действия:

1. Создайте папку `integrations.d`, в которую поместите файл конфигурации для Redis (`redis-config.yml`).
2. Создайте `compose.yaml` с описанием сервиса:

```yaml
infra_services:
  restart: unless-stopped
  image: newrelic/infrastructure-bundle:latest
  volumes:
    - ./integrations.d:/etc/newrelic-infra/integrations.d
  environment:
    NRIA_IS_FORWARD_ONLY: 'true'
    NRIA_LICENSE_KEY: "0123456789012345678901234567890123456789" # Ключ (заглушка, не меняем)
    NRIA_COLLECTOR_URL: https://gmonit-collector.name.com/infra/infra-api
    NRIA_COMMAND_CHANNEL_URL: https://gmonit-collector.name.com/infra/command-api
    NRIA_IDENTITY_URL: https://gmonit-collector.name.com/infra/identity-api
```


### Шаг 3: Добавление переменной PASSWORD (и опционально USERNAME для Redis 6+)

Если ваш Redis требует аутентификации, добавьте переменные `PASSWORD` и (опционально) `USERNAME` в конфигурацию:

```yaml
integrations:
  - name: nri-redis
    env:
      METRICS: true
      HOSTNAME: localhost
      PORT: 6379
      PASSWORD: "my_password" # Пароль для подключения
      REMOTE_MONITORING: true
    interval: 15s
    labels:
      environment: production

  - name: nri-redis
    env:
      INVENTORY: true
      HOSTNAME: localhost
      PORT: 6379
      PASSWORD: "my_password" # Пароль для подключения
      REMOTE_MONITORING: true
    interval: 60s
    labels:
      environment: production
    inventory_source: config/redis
```

### Шаг 4: Проверка данных

После добавления конфигурации перезапуск инфраструктурного агента не требуется. 


### Дополнительная информация

- Для получения дополнительной информации ознакомьтесь с [официальной документацией New Relic по интеграции Redis](https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/redis/redis-integration/).