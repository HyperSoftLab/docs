# Мониторинг PostgreSQL с использованием New Relic

Для инструментации PostgreSQL с использованием агента New Relic выполните следующие шаги:


### Шаг 1: Установка и включение интеграции PostgreSQL

1. Установите пакет интеграции PostgreSQL.

#### Для Debian/Ubuntu:
```bash
sudo apt-get update
sudo apt-get install nri-postgresql
```

#### Для других систем:
Обратитесь к [официальной документации New Relic](https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/postgresql/postgresql-integration/) для получения инструкций.



### Шаг 2: Настройка интеграции

1. Создайте файл конфигурации для интеграции PostgreSQL:
   ```bash
   sudo touch /etc/newrelic-infra/integrations.d/postgresql-config.yml
   ```

2. Откройте файл `/etc/newrelic-infra/integrations.d/postgresql-config.yml` и добавьте следующие настройки:
   ```yaml
   integrations:
     - name: nri-postgresql
       env:
         HOSTNAME: localhost
         PORT: 5432
         DATABASE: postgres
         USERNAME: your_username
         PASSWORD: your_password
         COLLECTION_LIST: "ALL"
         METRICS: true
         INVENTORY: true
         EVENTS: true
       # (При наличии модуля мониторинга 1С и только на машинах с БД и приложениями 1С)
       # (Добавить в существующую секцию labels или создать её)
       labels:
         # Указывать нужно только тот кластер, к которыму относится данный хост (если их больше одного, обратитесь к продуктовой команде GMonit)
         one_c.cluster_names: <<ИМЯ КЛАСТЕРА>>
   ```

   - **Замените** `your_username` и `your_password` на имя пользователя и пароль для доступа к базе данных PostgreSQL.
   - **Важно**: Для обеспечения безопасности избегайте хранения паролей в файлах конфигурации. Используйте переменные окружения или ознакомьтесь с [рекомендациями по безопасности](https://docs.newrelic.com/docs/security/security-privacy/compliance/regulatory-audits-new-relic-services/).



### Шаг 3: Настройка PostgreSQL для мониторинга

1. Убедитесь, что пользователь, указанный в конфигурации, имеет доступ к статистическим данным PostgreSQL.
2. Предоставьте доступ, выполнив следующую команду SQL:
   ```sql
   GRANT SELECT ON ALL TABLES IN SCHEMA pg_stat_database TO your_username;
   ```



### Шаг 4: Перезапуск Infrastructure Agent

После настройки интеграции перезапустите инфраструктурный агент:

```bash
sudo systemctl restart newrelic-infra
```



### Шаг 5: Проверка и мониторинг

1. Перейдите в интерфейс GMonit.
2. Убедитесь, что метрики PostgreSQL начинают отображаться.



### Дополнительно

- Для получения дополнительной информации, таких как расширенные настройки и устранение неполадок, обратитесь к [официальной документации New Relic](https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/postgresql/postgresql-integration/).
- Для обеспечения безопасности убедитесь, что конфиденциальные данные защищены в соответствии с [рекомендациями New Relic](https://docs.newrelic.com/docs/security/security-privacy/compliance/regulatory-audits-new-relic-services/).
