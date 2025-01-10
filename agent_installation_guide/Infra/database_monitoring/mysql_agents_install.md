# Мониторинг MySQL с использованием New Relic

Для инструментации MySQL с использованием агента New Relic выполните следующие шаги:


### Шаг 1: Установка агента New Relic

#### Для Ubuntu/Debian:
1. Добавьте ключ и репозиторий:
   ```bash
   wget -O - https://download.newrelic.com/infrastructure_agent/gpg/newrelic-infra.gpg | sudo apt-key add -
   printf "deb [arch=amd64] https://download.newrelic.com/infrastructure_agent/linux/apt focal main\n" | sudo tee /etc/apt/sources.list.d/newrelic-infra.list
   sudo apt-get update
   ```

2. Установите агент New Relic:
   ```bash
   sudo apt-get install newrelic-infra
   ```

#### Для RHEL/CentOS:
1. Добавьте репозиторий:
   ```bash
   sudo curl -o /etc/yum.repos.d/newrelic-infra.repo https://download.newrelic.com/infrastructure_agent/linux/yum/el/8/x86_64/newrelic-infra.repo
   ```

2. Установите агент New Relic:
   ```bash
   sudo yum install newrelic-infra -y
   ```


### Шаг 2: Создание конфигурационного файла для MySQL

1. Создайте конфигурационный файл `mysql-config.yml`:

   - **Для Ubuntu/Debian:**
     ```bash
     sudo touch /etc/newrelic-infra/integrations.d/mysql-config.yml
     ```

   - **Для RHEL/CentOS:**
     ```bash
     sudo touch /etc/newrelic-infra/integrations.d/mysql-config.yml
     ```

2. Добавьте следующие настройки в файл `mysql-config.yml`:
   ```yaml
   integrations:
   - name: nri-mysql
     env:
       HOSTNAME: db-mysql
       PORT: 3306
       USERNAME: root
       PASSWORD: password
     interval: 15s
     labels:
       env: production
       role: mysql
       db_hostname: db-mysql
     inventory_source: config/mysql
   ```


### Шаг 3: Перезапуск агента

#### Для Ubuntu/Debian:
```bash
sudo systemctl restart newrelic-infra
```

#### Для RHEL/CentOS:
```bash
sudo systemctl restart newrelic-infra
```


### Шаг 4: Проверка в интерфейсе GMonit

1. Перейдите в раздел инфраструктуры в GMonit.
2. Убедитесь, что данные из MySQL собираются и отображаются корректно.


### Решение проблем

Если возникли проблемы с установкой или отсутствуют данные:
- Проверьте корректность настроек в файле `mysql-config.yml`.
- Убедитесь, что агент New Relic успешно запущен (`systemctl status newrelic-infra`).
- Для более детальной информации о конфигурации агента обратитесь к [официальной документации New Relic](https://docs.newrelic.com/install/mysql/).


