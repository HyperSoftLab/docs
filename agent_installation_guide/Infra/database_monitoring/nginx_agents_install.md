# Мониторинг Nginx с использованием New Relic

Для настройки мониторинга Nginx выполните следующие шаги:


### Шаг 1: Установка интеграции Nginx

1. **Установите пакет интеграции Nginx**:

   Для Ubuntu/Debian выполните:
   ```bash
   sudo apt-get update
   sudo apt-get install nri-nginx
   ```

2. **Создайте файл конфигурации**:
   Добавьте файл `/etc/newrelic-infra/integrations.d/nginx-config.yml` с содержимым:
   ```yaml
   integrations:
     - name: nri-nginx
       env:
         STATUS_URL: http://127.0.0.1/nginx_status
         METRICS: 1
         INVENTORY: 1
         EVENTS: 1
       labels:
         env: production
         role: nginx
   ```


### Шаг 2: Настройка Nginx для включения модуля статуса

1. Убедитесь, что в конфигурации Nginx (`nginx.conf`) включён модуль статуса. Добавьте следующий блок:
   ```nginx
   location /nginx_status {
       stub_status on;
       access_log off;
       allow 127.0.0.1;
       deny all;
   }
   ```

2. Перезагрузите Nginx, чтобы применить изменения:
   ```bash
   sudo systemctl reload nginx
   ```


### Шаг 3: Перезапуск инфраструктурного агента

После настройки интеграции перезапустите агент:
```bash
sudo systemctl restart newrelic-infra
```


### Дополнительно

- Для получения дополнительной информации, включая расширенные настройки и устранение неполадок, обратитесь к [официальной документации New Relic по интеграции Nginx](https://docs.newrelic.com/install/nginx/).