# Мониторинг RabbitMQ с использованием New Relic

Для настройки мониторинга RabbitMQ выполните следующие шаги:


### Предварительные действия

1. Убедитесь, что установлен и настроен плагин [RabbitMQ Management](https://www.rabbitmq.com/management.html). Этот плагин обеспечивает доступ к метрикам и событиям RabbitMQ через HTTP API.
   
2. Убедитесь, что инструмент командной строки RabbitMQ (`rabbitmqctl`) находится в `PATH` пользователя `root`.


### Шаг 1: Создание файла конфигурации

1. Создайте файл `rabbitmq-config.yml` в директории `/etc/newrelic-infra/integrations.d`:

   ```bash
   sudo touch /etc/newrelic-infra/integrations.d/rabbitmq-config.yml
   ```

2. Откройте файл `rabbitmq-config.yml` и добавьте конфигурацию в зависимости от того, какие данные вы хотите собирать: события, метрики, или оба типа данных.


### Пример конфигурации для сбора событий

```yaml
integrations:
  - name: nri-rabbitmq
    env:
      EVENTS: true
      HOSTNAME: localhost
      PORT: 15672
      USERNAME: "admin"
      PASSWORD: "my_password" # Замените на ваш пароль
      NODE_NAME_OVERRIDE: local_node_name@localhost
    interval: 15s
    labels:
      env: production
      role: rabbitmq
    inventory_source: config/rabbitmq
```

### Пример конфигурации для сбора метрик

```yaml
integrations:
  - name: nri-rabbitmq
    env:
      METRICS: true
      HOSTNAME: localhost
      PORT: 15672
      USERNAME: "admin"
      PASSWORD: "my_password" # Замените на ваш пароль
      NODE_NAME_OVERRIDE: local_node_name@localhost
      
      # Укажите конкретные очереди, которые нужно мониторить
      QUEUES: '["myQueue1","myQueue2"]'
      QUEUES_REGEXES: '["queue[0-9]+",".*"]'
      
      # Укажите конкретные обменники
      EXCHANGES: '["exchange1","exchange2"]'
      EXCHANGES_REGEXES: '["exchange[0-9]+",".*"]'
      
      # Укажите виртуальные хосты
      VHOSTS: '["vhost1","vhost2"]'
      VHOSTS_REGEXES: '["vhost[0-9]+",".*"]'
    interval: 15s
    labels:
      env: production
      role: rabbitmq
    inventory_source: config/rabbitmq
```

### Шаг 2: Проверка данных

После добавления конфигурации перезапуск инфраструктурного агента не требуется. 


### Дополнительно
- Для получения дополнительной информации об интеграции ознакомьтесь с [официальной документацией New Relic](https://docs.newrelic.com/install/rabbitmq/#config).
