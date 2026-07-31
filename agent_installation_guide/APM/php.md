# Установка агента New Relic для PHP

Вы получили архив `php-agent-offline.tar.gz`.

**Целевая среда:** PHP 8.x + Apache 2.4 + mod\_php.

### 0\. Предварительные требования

*   **PHP 8.x** и **Apache 2** установлены. Если нет:

DEB-based (Ubuntu / Astra Linux / Debian):

```
sudo apt-get update
sudo apt-get install -y php libapache2-mod-php apache2 php-cli
```

  

RPM-based (ALT Server / CentOS / RHEL):

```
sudo yum install php php-common httpd
```

  

*   Сетевой доступ от сервера до коллектора GMONIT по порту **443 (HTTPS)**. Проверьте:
    
    ```
    curl -sk https://gmonit-collector.<<DOMAIN>>/health
    ```
    
    `ok`.
*   Утилита `tar` (входит в базовую установку).

### 1\. Распаковка

Перенесите архив на целевой сервер (SCP/SFTP):

```
tar -xzf php-agent-offline.tar.gz
cd php-agent-bundle
```

### 2\. Установка пакета агента

**DEB-based (Ubuntu / Astra Linux / Debian):**

```
sudo dpkg -i newrelic-php5_12.5.0.30_amd64.deb
```

**RPM-based (ALT Server / CentOS / RHEL):**

```
sudo rpm -i newrelic-php5-12.5.0.30-1.x86_64.rpm
```

Запустите скрипт установки:

```
sudo NR_INSTALL_SILENT=1 NR_INSTALL_KEY=0123456789012345678901234567890123456789 newrelic-install install
```

**Проверка загрузки расширения:**

```
php -m | grep newrelic
# newrelic
```

### 3\. Настройка конфигурации агента

Найдите путь к конфигурационному файлу:

```
find /etc/php -name 'newrelic.ini'
# /etc/php/8.3/mods-available/newrelic.ini  (Ubuntu/Debian)
```

Или:

```
php -i 2>/dev/null | grep 'Scan this dir'
```

Откройте файл и измените параметры. **Минимальная рабочая конфигурация:**

```
; ---------------------------------------------------------------------------
; GMONIT APM — минимальная конфигурация PHP-агента
; ---------------------------------------------------------------------------

extension = "newrelic.so"

; Лицензионный ключ (заглушка, не менять)
newrelic.license = "0123456789012345678901234567890123456789"

; Имя приложения (отображается в UI GMONIT)
newrelic.appname = "My-PHP-App"

; Включение агента
newrelic.enabled = true

; Адрес коллектора GMONIT (заменить <<DOMAIN>> на ваш домен)
newrelic.daemon.collector_host = "gmonit-collector.<<DOMAIN>>"

; Логирование агента
newrelic.logfile = "/var/log/newrelic/php_agent.log"
newrelic.loglevel = "info"

; Логирование демона
newrelic.daemon.logfile = "/var/log/newrelic/newrelic-daemon.log"
newrelic.daemon.loglevel = "info"

; Самоподписанный сертификат (раскомментировать при необходимости)
; newrelic.daemon.ssl_ca_bundle = "/path/to/rootCA.crt"
```

Альтернативно — через `sed` (для автоматизации):

```
NR_INI=$(find /etc/php -name 'newrelic.ini' | head -1)

sudo sed -i 's/newrelic.license = ""/newrelic.license = "0123456789012345678901234567890123456789"/' "$NR_INI"
sudo sed -i 's/newrelic.appname = "PHP Application"/newrelic.appname = "My-PHP-App"/' "$NR_INI"
sudo sed -i 's/;newrelic.daemon.collector_host = ""/newrelic.daemon.collector_host = "gmonit-collector.<<DOMAIN>>"/' "$NR_INI"
```

> **Важно:** Параметр `newrelic.daemon.collector_host` по умолчанию **закомментирован** (`;` в начале строки). Обязательно раскомментируйте его и укажите адрес коллектора.

### 4\. Развёртывание приложения

Скопируйте тестовое приложение (или ваше приложение) в DocumentRoot:

```
sudo mkdir -p /var/www/php-test
sudo cp app/* /var/www/php-test/
```

Настройте VirtualHost Apache (если нужен отдельный порт):

```
sudo cp php-test.conf /etc/apache2/sites-available/
sudo a2ensite php-test.conf
```

### 5\. Перезапуск Apache

```
sudo systemctl restart apache2
```

Для RPM-based систем:

```
sudo systemctl restart httpd
```

### 6\. Проверка

**Проверка приложения:**

```
curl http://localhost:8083/
# Hello from PHP APM Test App!

curl http://localhost:8083/data.php
# {"status":"ok","language":"php",...,"php_version":"8.3.6"}
```

**Проверка агента (daemon log):**

```
sudo cat /var/log/newrelic/newrelic-daemon.log | grep -i "gmonit\|connected"
```

**Критерии успеха:**

1.  В логах демона есть `~~~~ GMonit APM ~~~~`.
2.  В логах демона есть `app 'My-PHP-App' connected with run id`.
3.  Нет ошибок SSL или соединения с коллектором.

Ожидаемый вывод:

```
Info: ~~~~ GMonit APM ~~~~
Info: app 'My-PHP-App' connected with run id '...'
```

**Проверка агента (PHP agent log):**

```
sudo cat /var/log/newrelic/php_agent.log | grep -i "New Relic\|attempt daemon"
```

Ожидаемый вывод:

```
info: New Relic 12.5.0.30 ("peridot" - "...") [daemon='@newrelic' php='8.3.6' ... sapi='apache2handler' ...]
info: attempt daemon connection via '@newrelic'
```

**Типичные ошибки и решения:**

| Ошибка в логах | Причина | Решение |
| --- | --- | --- |
| `ConnectException: Connection refused` | Нет сетевого доступа до коллектора (порт 443) | Проверить firewall: `curl -sk https://gmonit-collector.<<DOMAIN>>/health` |
| `SSL_connect` / `certificate verify failed` | Самоподписанный сертификат коллектора | Добавить `newrelic.daemon.ssl_ca_bundle = "/path/to/rootCA.crt"` в `newrelic.ini` |
| `collector_host` пустой / не задан | Параметр закомментирован | Раскомментировать строку `newrelic.daemon.collector_host` в `newrelic.ini` |
| `A global default license has not been set` | Предупреждение при запуске PHP CLI | Некритичное — возникает только в CLI, агент через apache2handler работает |
| `php -m` не показывает `newrelic` | Расширение не установлено | Повторить `newrelic-install install` или проверить путь к `newrelic.so` |
| Нет файла логов `/var/log/newrelic/` | Директория не создана | `sudo mkdir -p /var/log/newrelic && sudo chown www-data:www-data /var/log/newrelic` |

* * *

## Часть 3: Docker

### Вариант А: Загрузка готового образа

Если в архиве есть готовый Docker-образ (`php-apache-apm.tar`):

```
docker load -i php-apache-apm.tar
docker run -d --name php-apache-app -p 8083:80 --restart unless-stopped php-apache-apm:latest
```

### Вариант Б: Сборка из архива

Если у клиента есть базовый образ `php:8.3-apache-bookworm` (загрузить из `php-8.3-apache-bookworm.tar`):

```
docker load -i php-8.3-apache-bookworm.tar
```

1.  Скорректируйте `<<DOMAIN>>` и имя приложения в `Dockerfile`:
    
    ```
    sed -i 's/gmonit-collector.<<DOMAIN>>/gmonit-collector.your-domain.ru/' Dockerfile
    sed -i 's/My-PHP-App/Your-App-Name/' Dockerfile
    ```
    
      
    
2.  Соберите и запустите:
    
    ```
    docker compose build
    docker compose up -d
    ```
    
      
    
3.  Проверьте:
    
    ```
    curl http://localhost:8083/
    # Hello from PHP APM Test App!
    
    docker exec php-apache-app cat /var/log/newrelic/newrelic-daemon.log | grep -i "gmonit\|connected"
    ```
    
      
    

Ожидаемый вывод:

```
Info: ~~~~ GMonit APM ~~~~
Info: app 'My-PHP-App' connected with run id '...'
```

  

1.  Остановка:
    
    ```
    docker compose down
    ```
    

> **Важно:** Базовый образ должен быть `php:8.3-apache-bookworm` (Debian 12). Образ на Debian Trixie (`php:8.3-apache`) **не работает** — SHA1-подписи GPG отклоняются начиная с февраля 2026.

* * *

## Часть 4: Установка на CentOS / RHEL / ALT (RPM-based)

Для RPM-based дистрибутивов процедура отличается на этапе установки пакета:

### 1\. Установка

```
sudo rpm -i newrelic-php5-12.5.0.30-1.x86_64.rpm
sudo NR_INSTALL_SILENT=1 NR_INSTALL_KEY=0123456789012345678901234567890123456789 newrelic-install install
```

### 2\. Настройка

Конфиг расположен в `/etc/php.d/newrelic.ini` или `/etc/php.ini`. Параметры аналогичны Части 2, шаг 3.

### 3\. Перезапуск

```
# Apache
sudo systemctl restart httpd

# Nginx + PHP-FPM
sudo systemctl restart nginx
sudo systemctl restart php-fpm
```

* * *

## Часть 5: Контрольный чек-лист

| Шаг | Действие | Проверка |
| --- | --- | --- |
| 1   | Распаковать архив | `ls newrelic-php5*.deb` или `ls newrelic-php5*.rpm` |
| 2   | Установить пакет агента | `php -m \\| grep newrelic` |
| 3   | Настроить `newrelic.ini` (collector\_host, appname) | `grep collector_host <path>/newrelic.ini` |
| 4   | Развернуть приложение | `curl http://localhost:8083/` |
| 5   | Перезапустить Apache | `sudo systemctl restart apache2` |
| 6   | Проверить подключение к коллектору | `grep "GMonit APM" /var/log/newrelic/newrelic-daemon.log` |
| 7   | Проверить приложение в UI GMONIT | UI → APM → приложение |

* * *


# Добавление кастомного параметра

Для добавления пользовательских параметров в текущую транзакцию PHP можно использовать функцию `newrelic_add_custom_parameter`. Это позволяет добавлять дополнительные данные, такие как идентификаторы пользователей, чтобы они были доступны в трассировках транзакций и в событиях Transaction.

Пример использования функции:

```php
if (extension_loaded('newrelic')) {
    $user_id = 12345; // уникальный идентификатор пользователя
    newrelic_add_custom_parameter('user_id', $user_id);
}
```

### Описание функции

```php
newrelic_add_custom_parameter(string $key, scalar $value)
```

- **`key`** — имя пользовательского параметра (до 255 символов). Например, `user_id`, `client_name`.
- **`value`** — значение, связанное с этим параметром. Допустимы скалярные типы (строки, числа, логические значения). Для float значений `NaN`, `Infinity`, `denorm` или отрицательного нуля поведение функции не определено.

#### Применение
Вы можете использовать эту функцию для добавления данных, таких как:
- Идентификаторы пользователей
- Метки запросов
- Прочие специфичные данные

Эти параметры будут видны в трассировках транзакций в интерфейсе GMONIT.

#### Примечание
Убедитесь, что расширение New Relic для PHP загружено в вашу среду (проверьте через `phpinfo()` или `php -m`).

Подробности можно найти в официальной документации [New Relic](https://docs.newrelic.com/docs/apm/agents/php-agent/php-agent-api/newrelic_add_custom_parameter/)


# Именование и управление транзакциями

Для правильной идентификации и отслеживания транзакций в мониторинге вы можете задавать имена транзакций с помощью функции `newrelic_name_transaction`. Это позволяет организовать мониторинг и избежать избыточного числа уникальных имён транзакций, которые могут затруднить анализ данных.


#### Пример: Задание имени транзакции для `Uri/index.php`

Для задания имени транзакции добавьте следующий сниппет в код обработчика запросов (вместо `example` подставьте имя вашей функции, вызываемой при обращении к `Uri/index.php`):

```php
function example() { 
    if (extension_loaded('newrelic')) { // Проверка, что PHP-агент доступен
        newrelic_name_transaction("Custom/index/*");
    }
    // ... здесь остальной код функции
}
```

Таким образом, текущая транзакция станет называться `Custom/index/`.

> **Примечание**: Уникальных имён транзакций не должно быть слишком много, и они не должны содержать идентификаторы.

Примеры:
- `Custom/index/` — хорошо.
- `Custom/index/ + product.id` — нельзя.

Этот код безопасен и не вызовет ошибки при отключении агента, так как вызов функции обёрнут в проверку `if (extension_loaded('newrelic'))`.

Подробности можно найти в официальной документации [New Relic](https://docs.newrelic.com/docs/apm/agents/php-agent/php-agent-api/newrelic_name_transaction/)


### Пример: Добавление имени транзакции для конкретного URI

Для добавления транзакции, например для URI `https://test.ru/doc/estimation` следуйте этим шагам:

1. В коде обработчика запросов для нужного URI добавьте следующий сниппет:

   ```php
   function example() { 
       if (extension_loaded('newrelic')) { // Проверка, что PHP-агент доступен
           newrelic_name_transaction("Custom/estimation");
       }
       // ... здесь остальной код функции
   }
   ```

2. Таким образом, текущая транзакция станет называться `Custom/estimation`.

> **Примечание**: Как и в предыдущем примере, уникальных имён транзакций не должно быть слишком много, и они не должны содержать идентификаторы.

Примеры:
- `Custom/estimation` — хорошо.
- `Custom/estimation + product.id` — нельзя.

Этот код безопасен и не вызовет ошибки при отключении агента, так как вызов функции обёрнут в проверку `if (extension_loaded('newrelic'))`.

Подробности можно найти в официальной документации [New Relic](https://docs.newrelic.com/docs/apm/agents/php-agent/php-agent-api/newrelic_name_transaction/)