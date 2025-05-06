# Мониторинг MongoDB с использованием New Relic

Для настройки мониторинга MongoDB с использованием инфраструктурного агента New Relic выполните следующие шаги:

### Шаг 1: Установка пакета интеграции MongoDB

1. **Обновите пакеты**:
   ```bash
   sudo apt-get update
   ```
2. **Установите пакет `nri-mongodb`**:
   ```bash
   sudo apt-get install nri-mongodb
   ```
   > **Примечание**: Если вы используете очень старую версию MongoDB (3.x) и пакет `nri-mongodb` недоступен, попробуйте установить `nri-mongodb3`:
   > ```bash
   > sudo apt-get install nri-mongodb3
   > ```
   > Этот пакет ориентирован на устаревшие версии MongoDB (3.x).

3. **Альтернативно**, вы можете установить сразу набор интеграций New Relic (в том числе для MongoDB) через пакет `nri-bundle`:
   ```bash
   sudo apt-get install nri-bundle
   ```


### Шаг 2: Настройка интеграции MongoDB

1. **Создайте файл конфигурации** `mongodb-config.yml` в директории `/etc/newrelic-infra/integrations.d/`.

2. **Добавьте в файл** следующий контент (пример с переменными окружения `env:`). Замените `your_username` и `your_password` на актуальные данные пользователя MongoDB:

   ```yaml
   integrations:
     - name: nri-mongodb
       env:
         HOSTNAME: localhost
         PORT: 27017
         DATABASE: admin
         USERNAME: your_username
         PASSWORD: your_password
         COLLECTION_LIST: "ALL"
         METRICS: true
         INVENTORY: true
         EVENTS: true
   ```

   > **Примечание**:  
   > - Если вам нужно шифрованное соединение (SSL/TLS), добавьте соответствующие параметры (например, `ssl: true`, `tls_ca_cert:`, `tls_cert:`, `tls_private_key:`, и т. д.).  
   > - В официальной документации New Relic пример иногда выглядит иначе (через `config:` и `arguments:`). Оба варианта рабочие. Пример с `command: all` и аргументами может выглядеть так:
   >   ```yaml
   >   integrations:
   >     - name: nri-mongodb
   >       config:
   >         command: all
   >         arguments:
   >           host: localhost
   >           port: 27017
   >           username: your_username
   >           password: your_password
   >           database: admin
   >           collection_list: "ALL"
   >           ssl: false
   >           metrics: true
   >           inventory: true
   >           events: true
   >   ```


### Шаг 3: Настройка пользователя в MongoDB

1. **Убедитесь**, что в MongoDB существует пользователь с необходимыми правами.
2. Если такого пользователя ещё нет, создайте его (к примеру, на базе данных `admin`) с ролями `clusterMonitor` и `readAnyDatabase`:

   ```javascript
   use admin
   db.createUser({
     user: "your_username",
     pwd: "your_password",
     roles: [
       { role: "clusterMonitor", db: "admin" },
       { role: "readAnyDatabase", db: "admin" },
     ],
   });
   ```

   Эти роли обычно достаточны для доступа к системной информации, необходимой для мониторинга MongoDB.


### Шаг 4: Перезапуск Infrastructure Agent

После создания файла конфигурации и настройки MongoDB **перезапустите** инфраструктурный агент:
```bash
sudo systemctl restart newrelic-infra
```

Проверьте, что служба запущена без ошибок:
```bash
systemctl status newrelic-infra
```

### Шаг 5: Проверка и мониторинг

1. Перейдите в интерфейс GMonit.
2. Убедитесь, что данные из MongoDB собираются и отображаются корректно.


### Дополнительные замечания

1. **Удалённый доступ**: Если MongoDB находится на другом сервере, проверьте, что порт (по умолчанию `27017`) открыт в брандмауэре и в настройках MongoDB (`bindIp`) разрешён соответствующий IP-адрес New Relic инфраструктурного агента.
2. **TLS/SSL**: При использовании шифрованных соединений добавьте и настройте параметры SSL/TLS в конфигурационном файле New Relic.
3. **Подробнее**: Для расширенных настроек (репликация, настройка сертификатов, запросы к конкретным коллекциям и т. д.) обратитесь к [официальной документации по MongoDB](https://docs.newrelic.com/install/mongodb/) от New Relic.
4. **Устаревшие версии MongoDB**: Если вы используете MongoDB 3.x и видите сложности при установке, возможно, вам нужен пакет `nri-mongodb3` (см. примечание в первом шаге).  
5. **Мониторинг реплик**: Если у вас кластер или реплика-сет MongoDB, то в конфигурации New Relic можно указать адрес и порт primary-реплики (или балансировщика). Главное – дать интеграции доступ к статистике всего кластера.
