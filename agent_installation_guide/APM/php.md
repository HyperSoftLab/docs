# Установка агента New Relic для PHP

Агент мониторинга PHP от New Relic состоит из двух взаимодействующих частей:  
1. **Расширение для PHP**, которое занимается сбором метрик и трейсов.  
2. **Прокси-демон (`newrelic-daemon`)**, который отвечает за взаимодействие с бэкендом мониторинга (в данном случае — с GMonit).

Ниже собрана полная инструкция по установке и настройке данного агента в различных окружениях (Ubuntu/Debian, CentOS, контейнерные среды). Если требуется дополнительная информация, обращайтесь к [официальной документации](https://docs.newrelic.com/docs/apm/agents/php-agent/installation/php-agent-installation-overview).

---

## Обязательные настройки агента

Независимо от окружения, в файле `newrelic.ini` (обычно располагается в `/etc/php/7.x/mods-available/newrelic.ini`, `/etc/php.d/newrelic.ini` или `/etc/php/.../conf.d/newrelic.ini`) **обязательно** должны быть прописаны (или эквивалентно заданы в переменных окружения) следующие параметры:

```ini
newrelic.license = 0123456789-123456789-123456789-123456789 #Ключ(заглушка, не меняем)
newrelic.daemon.collector_host = gmonit-collector.<DOMAIN>.ru #Домен коллектора GMonit
newrelic.appname = "MY_AWESOME_APP" #Название приложения
newrelic.logfile = stdout #Логирование агента в stdout
```

> Если вы настраиваете агент через переменные окружения, то эквивалентом будут:
> ```bash
> export NEW_RELIC_LICENSE_KEY=0123456789-123456789-123456789-123456789 #Ключ(заглушка, не меняем)
> export NEW_RELIC_HOST=gmonit-collector.name.ru #Домен коллектора GMonit
> export NEW_RELIC_APP_NAME="MY_AWESOME_APP" #Название приложения
> export NEW_RELIC_LOG=stdout #Логирование агента в stdout
> ```

---

## 1. Установка агента New Relic для PHP на Ubuntu и Debian

### Шаги:

1. **Добавление репозитория New Relic**:
   ```bash
   echo 'deb http://apt.newrelic.com/debian/ newrelic non-free' | sudo tee /etc/apt/sources.list.d/newrelic.list
   ```
2. **Обновление списка пакетов**:
   ```bash
   sudo apt-get update
   ```
3. **Установка PHP-агента**:
   ```bash
   sudo apt-get install newrelic-php5
   ```
   > Если вы используете вместо `glibc` библиотеку `musl libc` (например, в **Alpine Linux**), необходимо скачать и установить актуальную версию агента с поддержкой `musl` по [ссылке](https://download.newrelic.com/php_agent/release/).

4. **Настройка конфигурации агента**:  
   - Откройте файл `newrelic.ini` и пропишите **обязательные параметры**, указанные выше в разделе «Обязательные настройки агента».  
   - Если используются самоподписанные сертификаты (или Let's Encrypt) для коллектора, необходимо явно указать это при конфигурации демона. Например, добавляя ключ к команде запуска `newrelic-daemon`:
     ```bash
     newrelic-daemon --cafile /etc/ssl/certs/ca-certificates.crt
     ```
     или в конфигурационном файле `newrelic.cfg`:
     ```ini
     ssl_ca_bundle = /etc/ssl/certs/ca-certificates.crt
     ```

5. **Перезапуск веб-сервера**:
   ```bash
   # Для Apache
   sudo systemctl restart apache2

   # Для NGINX + PHP-FPM
   sudo systemctl restart nginx
   sudo systemctl restart php-fpm
   ```

6. **Проверка работы**  
   Сгенерируйте трафик к вашему приложению и проверьте метрики в интерфейсе GMonit.

---

## 2. Установка агента New Relic для PHP на CentOS

### Шаги:

1. **Добавление репозитория New Relic**:
   - Для 64-битных систем:
     ```bash
     sudo rpm -Uvh http://yum.newrelic.com/pub/newrelic/el5/x86_64/newrelic-repo-5-3.noarch.rpm
     ```
2. **Установка PHP-агента**:
   ```bash
   sudo yum install newrelic-php5
   ```
3. **Запуск скрипта установки**:
   ```bash
   sudo newrelic-install install
   ```
4. **Настройка конфигурации агента**:  
   - Откройте файл `newrelic.ini` и пропишите **обязательные параметры**, указанные выше в разделе «Обязательные настройки агента».  
   - Если используются самоподписанные сертификаты (или Let's Encrypt), укажите путь к сертификату в конфигурации `newrelic-daemon` или `newrelic.cfg` (аналогично Ubuntu/Debian).

5. **Перезапуск веб-сервера**:
   ```bash
   # Для Apache
   sudo systemctl restart httpd

   # Для NGINX + PHP-FPM
   sudo systemctl restart nginx
   sudo systemctl restart php-fpm
   ```

6. **Проверка работы**  
   Сгенерируйте трафик к вашему приложению и проверьте метрики в интерфейсе GMonit.

---

## 3. Установка агента New Relic для PHP в контейнерных средах (Docker и др.)

### Шаги:

1. **Выбор способа установки**:
   - **Установка в разных контейнерах** (рекомендуется):
     1. Настройте контейнер для демона:
        Используйте образ `newrelic/php-daemon` из Docker Hub или аналогичный подход, где `newrelic-daemon` работает в отдельном контейнере.
     2. Настройте контейнер для PHP-агента:
        Установите PHP и агент в контейнере:
        ```bash
        sudo apt-get install newrelic-php5
        sudo newrelic-install install
        ```
        Затем пропишите переменные окружения (или внесите настройки в `newrelic.ini`) при запуске контейнера или в Dockerfile. **Обязательные параметры** описаны в начале инструкции.
   - **Установка в одном контейнере**:
     1. Установите PHP и агент:
        ```bash
        sudo apt-get install newrelic-php5
        sudo newrelic-install install
        ```
     2. Настройте параметры в `newrelic.ini` или через переменные окружения. Не забудьте добавить **обязательные**:
        ```ini
        newrelic.license = 0123456789-123456789-123456789-123456789 #Ключ(заглушка, не меняем)
        newrelic.daemon.collector_host = gmonit-collector.<DOMAIN>.ru #Домен коллектора GMonit
        newrelic.appname = "MY_AWESOME_APP" #Название приложения
        newrelic.logfile = stdout #Логирование агента в stdout
        ```
     3. При использовании самоподписанных сертификатов (или Let's Encrypt) обязательно укажите путь к сертификату в конфигурации демона (либо с помощью ключа `--cafile`, либо через `ssl_ca_bundle` в `newrelic.cfg`).

2. **Дополнительные действия для Alpine Linux**  
   Если используется `musl libc` (в Alpine Linux), скачайте и установите версию агента для `musl` по [ссылке](https://download.newrelic.com/php_agent/release/).

3. **Перезапуск веб-сервера**  
   Убедитесь, что выбранный веб-сервер (Apache, NGINX, PHP-FPM) перезапущен после установки:
   ```bash
   sudo systemctl restart apache2 || sudo systemctl restart httpd
   sudo systemctl restart nginx
   sudo systemctl restart php-fpm
   ```

4. **Проверка работы**  
   Сгенерируйте трафик к вашему приложению и проверьте метрики в интерфейсе GMonit.

---

### Дополнительная информация

- Подробная документация по установке и настройке агента для PHP:  
  [PHP Agent Configuration — New Relic Documentation](https://docs.newrelic.com/docs/apm/agents/php-agent/installation/)

- Если требуются более тонкие настройки агента и прокси-демона (`newrelic-daemon`), в том числе указание кастомного `cafile`, использование дополнительных сетевых параметров и т. д., обратитесь к [разделу конфигурации демона](https://docs.newrelic.com/docs/apm/agents/php-agent/configuration/proxy-daemon-newreliccfg-settings/#proxy-settings).