# Инструкция по установке GMonit-Lite в Yandex Cloud
## Перед установкой
1. Для установки необходимо наличие 2 доменных имен - для коллектора GMonit и для UI GMonit (Grafana).

   **Пример**:

   Коллетор GMonit
   ```
   gmonit-collector.your-company.ru
   ```
   UI Gmonit (Grafana)
   ```
   gmonit.your-company.ru
   ```
Где “your-company” - ваш домен второго уровня.


## Установка
1. Создайте виртуальную машину из образа GMonit на Yandex Cloud Marketplace. Важно создать пользователя `gmonit` и подключаться с помощью него. Пользователь с этим логином содержит необходимые права для запуска.
2. [Подключитесь к ВМ](https://cloud.yandex.ru/docs/compute/operations/dsvm/quickstart#first-login) по SSH.
```sh
ssh gmonit@<vm-ip-address>
```
3. Перейдите в каталог с образом GMonit.
 ```sh
 cd /home/gmonit/gmonit-lite
 ```
4. Создайте файл `.env` с помощью примера `.env.example`.
```sh
cp .env.example .env
```
5. Заполните файл `.env`.
- SECRET_TOKEN - случайная строка длиной 32 символа. Используйте свой вариант или сгенерируйте случайно командой
   ```
   openssl rand -base64 24 | head -c 32
   ```
- GRAFANA_DOMAIN - домен для UI GMonit (Grafana)
  
   Пример: 
   ```
   gmonit.your-company.ru
   ```
- COLLECTOR_DOMAIN - домен для коллектора GMonit
  
   Пример:
   ```
   gmonit-collector.your-company.ru
   ```
- GRAFANA_ADMIN_PASSWORD - пароль для логина `admin` в Grafana. Используйте свой вариант или сгенерируйте случайно, например, командой
   ```
   openssl rand -base64 15 | head -c 20
   ```
- BASIC_AUTH_PASS - пароль для авторизации Grafana в коллекторе. Используйте свой вариант или сгенерируйте случайно, например, командой
   ```
   openssl rand -base64 15 | head -c 20
   ```
- LETSENCRYPT_EMAIL - email для получения сообщений о проблемах с сертификатами letsencrypt
6. Запустите GMonit.
```sh
docker compose up -d
```