# Инструкция по подготовке и запуску GMonit

В этой инструкции описывается процесс подготовки и запуска GMonit с использованием самоподписанных сертификатов. Используется Docker Compose.

## Содержание  
- Настройка доменов и файла `.env` с параметрами GMonit.  
- Добавление доменов в файлы `hosts`, если отсутствует DNS.  
- Генерация самоподписанныч сертификаты и настроить их использование.  
- Установка Docker и Docker Compose.  
- Авторизация в Yandex Container Registry.  
- Скачивание и подготовка базы данных GeoIP.  
- Запуск GMonit и проверка его работоспособности.  

После завершения всех шагов можно приступить к установке агентов сбора данных.

## Шаги настройки

### 1. Настройка доменов
Прописать в файле `.env` заранее созданные домены:
- Для коллектора
- Для Grafana

### 2. Настроить .env файл
- `TAG` — версия GMonit
- `LICENSE_KEY` — ключ лицензии GMonit.
- `SECRET_TOKEN` — случайная строка (например, 32-значный алфавитно-цифровой токен).  
- `GRAFANA_ADMIN_PASSWORD` — пароль для авторизации в UI GMonit.  
- `CLICKHOUSE_PASSWORD` — пароль для базы данных ClickHouse.
- `POSTGRES_PASSWORD` — пароль для базы данных PostgreSQL.
- `COLLECTOR_DATASOURCE_PASSWORD` — пароль для доступа к источнику данных коллектора.
- `GRAFANA_DOMAIN` — grafana.address домен пользовательского интерфейса.
- `COLLECTOR_DOMAIN` — collector.address домен коллектора сбора данных.

### 3. Добавить домены для разрешения (если без DNS)
- На машине пользователя (Windows) добавить домены в `C:\Windows\System32\drivers\etc\hosts`.
- На Linux машине: `sudo nano /etc/hosts`.

### 4. Выпустить Root Certificate Authority (CA) 
- Если используются существующие сертификаты, пропустите этот и следующий шаги.
```bash
# Всё на Linux машине
# Создать директорию для сертификатов
mkdir ~/certificates
cd ~/certificates

# Сгенерировать Root CA private key
openssl genrsa -out rootCA.key 2048

# Выпустить Root CA certificate с увеличенным сроком действия
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1825 -out rootCA.pem -config cert.conf

# Сделать Root CA certificate в crt
openssl x509 -in rootCA.pem -outform pem -out rootCA.crt
```

### 5. Выпустить SSL-сертификат
- Создать конфигурационный файл.
```bash
nano cert.conf

# Пример содержимого:

[req]
default_bits = 2048
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = GMonitOrg
CN = *.ubuntu24

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = *.ubuntu24
DNS.2 = ubuntu24
DNS.3 = ui.ubuntu24
DNS.4 = collector.ubuntu24
```

- Выпустить сертификат.
```bash
# Сгенерировать server private key
openssl genrsa -out server.key 2048

# Создать Certificate Signing Request (CSR) с использованием cert.conf
openssl req -new -key server.key -out server.csr -config cert.conf

# Подписать CSR созданным Root CA с увеличенным сроком действия
openssl x509 -req -in server.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial -out server.crt -days 1825 -sha256 -extfile cert.conf -extensions v3_req
```

### 6. Разместить файлы сертификатов
- Скопировать созданные сертификаты в директорию `gmonit/ssl` дистрибутива GMonit.
- Файл `rootCA.crt` на сервере `sudo cp rootCA.crt /usr/local/share/ca-certificates/` -> `sudo update-ca-certificates`.
- Файл `rootCA.crt` скопировать на Windows-машину пользователя и установить (Install Certificate -> Local Machine -> Trusted Root Certification Authorities).

### 7. Прописать пути к сертификатам
- Проверить, что эти сертификаты есть в `gmonit/ssl` папке.
```bash
# Файл .env
CA_FILE=/gmonit/ssl/rootCA.pem
CERT_FILE=/gmonit/ssl/server.crt
KEY_FILE=/gmonit/ssl/server.key
```

### 8. Установить Docker+Compose
- Проверить установку, если есть, пропускаем этот шаг.
```bash
docker compose version
```
- Установить докер.
```bash
# Подготовить систему
sudo apt-get update
sudo apt-get install \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

# Добавить GPG-ключ Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавить репозиторий Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установить Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io

# Добавить пользователя в группу docker (выйдите из системы и зайдите снова после этого)
sudo usermod -aG docker $USER

# Проверить плагин Docker Compose 
docker compose version
```

### 9. Авторизация в Yandex Container Registry
- Скопировать ключ Яндекс в файл `/home/user/key.json`.
- Произвести логин.
```bash
cat key.json | docker login \
  --username json_key \
  --password-stdin \
  cr.yandex
```
- Проверить, что ключ сохранился.
```bash
cat ~/.docker/config.json
```
- После успешного выполнения key.json можно с машины удалить.

### 10. Скопировать gmonit каталог на сервер
- `gmonit` скопировать в `/home/user/`.

### 11. Загрузить базу данных GeoIP
- Проверить текущую версию базы данных и ссылку на `https://db-ip.com/db/download/ip-to-city-lite`.
- Скачать базу данных на сервере.
```bash
# Зайти в папку gmonit
cd ~/gmonit

# Загрузить базу данных GeoIP
wget https://download.db-ip.com/free/dbip-city-lite-2025-01.mmdb.gz

# Распаковать скачанный файл
gzip -d *.mmdb.gz

# Переименование файла для использования в GMonit
mv "$(find . -maxdepth 1 -name '*.mmdb' | head -n 1)" geoip.mmdb
```

### 12. Запуск приложения
```bash
cd ~/gmonit

# Обновить образы Docker (опционально)
docker compose pull

# Запустить контейнеры и ожидать их готовности
docker compose up --wait
```
## Проверить, что работает
- Проверить статус контейнеров.
```bash
docker compose ps
```
- Зайти на сервер, убедиться, что открывается.
```bash
https://grafana.address
```
- Такой запрос к коллектору должен вернуть JSON с версией.
```bash
https://collector.address/about
```

## Редкации и проверка
Редакция инструкции от 18 января 2025 года.
Проверено на Ubuntu 24.04.1 LTS. 18 января 2025 года.
 
