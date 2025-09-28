# Инструкция по установке экземпляра GMonitML

## Системные требования

### Минимальные требования к серверу
Для успешной установки и работы GMonitML необходимо обеспечить следующие минимальные системные требования:

- **Операционная система:** Linux Kernel 3.15 и новее (Ubuntu 20.04 LTS, Ubuntu 22.04 LTS, Debian 10, Debian 11, CentOS Stream 8 и новее)
- **Программное обеспечение:** Docker 20.10+ с плагином Compose
- **Процессор:** 8 ядер минимум
- **Оперативная память:** 8 ГБ минимум
- **Дисковое пространство:** 300 ГБ минимум

### Сетевые требования
- Два доменных имени с валидными SSL-сертификатами:
  - `gmonit.domain.ru` - для пользовательского интерфейса
  - `collector.gmonit.domain.ru` - для коллектора данных
- HTTPS доступ (порт 443) для агентов к серверу GMonitML
- DNS разрешение доменов или настройка hosts файлов для тестирования

> Все взаимодействие агентов с коллектором должно строиться по защищенному HTTPS протоколу.

## Подготовка к установке

### 1. Получение и распаковка дистрибутива

1. Получите архив с дистрибутивом GMonitML от поставщика
2. Распакуйте архив в целевую директорию на сервере:

```bash
cd /path/to/destination
tar -xzf gmonitml-archive.tar.gz
```

3. Загрузите Docker образы из tar-файлов:

```bash
for tarfile in *.tar; do
  docker load -i "$tarfile"
done
```

### 2. Установка Docker и Docker Compose

Проверьте наличие Docker и Docker Compose:

```bash
docker compose version
```

Если Docker не установлен, выполните следующие шаги:

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

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Перезагрузить сессию или выполнить: newgrp docker
```

## Настройка окружения

### 1. Создание файла .env

Создайте файл `.env` в корневой директории GMonitML и настройте следующие параметры:

```bash
# Версия GMonitML (актуальную версию см. в release notes)
TAG=v4-latest

# Лицензионный ключ (запросить у поставщика после установки)
LICENSE_KEY=your-license-key-here

# Секретный токен (32-значный алфавитно-цифровой токен)
SECRET_TOKEN=your-random-32-char-token-here

# Пароль администратора Grafana
GRAFANA_ADMIN_PASSWORD=your-admin-password

# Пароли для баз данных
CLICKHOUSE_PASSWORD=your-clickhouse-password
POSTGRES_PASSWORD=your-postgres-password
COLLECTOR_DATASOURCE_PASSWORD=your-collector-password

# Доменные имена
GRAFANA_DOMAIN=gmonit.domain.ru
COLLECTOR_DOMAIN=collector.gmonit.domain.ru
```

### 2. Настройка доменов

#### Через DNS
Убедитесь, что DNS записи созданы для обоих доменов и указывают на IP-адрес сервера.

#### Через hosts файл (для тестирования)
На Linux сервере:
```bash
sudo nano /etc/hosts
```

Добавьте строки:
```
192.168.1.100 gmonit.domain.ru
192.168.1.100 collector.gmonit.domain.ru
```

На Windows клиентах добавьте в `C:\Windows\System32\drivers\etc\hosts`:
```
192.168.1.100 gmonit.domain.ru
192.168.1.100 collector.gmonit.domain.ru
```

### 3. Настройка SSL-сертификатов

#### Вариант 1: Использование существующих сертификатов
Если у вас есть валидные SSL-сертификаты от доверенного CA, разместите их в директориях:
- `gmonit/ssl/` (для основного приложения)
- `nginx/ssl/` (для веб-сервера)

#### Вариант 2: Создание самоподписанных сертификатов

1. Создайте директорию для сертификатов:
```bash
mkdir ~/certificates
cd ~/certificates
```

2. Выпустите корневой сертификат (Root CA):
```bash
# Приватный ключ RootCA
openssl genrsa -out rootCA.key 4096

# Самоподписанный сертификат RootCA (10 лет)
openssl req -x509 -new -nodes -key rootCA.key \
  -sha256 -days 3650 \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=GMonitML/CN=GMonitML Local Root CA" \
  -out rootCA.crt
```

3. Создайте конфигурацию для серверного сертификата:
```bash
nano server.conf
```

Содержимое файла `server.conf`:
```ini
[req]
default_bits       = 4096
default_md         = sha256
distinguished_name = req_distinguished_name
req_extensions     = v3_req
prompt             = no

[req_distinguished_name]
C  = RU
ST = Moscow
L  = Moscow
O  = GMonitML
CN = gmonit.domain.ru

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = gmonit.domain.ru
DNS.2 = collector.gmonit.domain.ru
```

4. Выпустите серверный сертификат:
```bash
# Приватный ключ сервера
openssl genrsa -out server.key 4096

# Создать CSR
openssl req -new -key server.key -out server.csr -config server.conf

# Подписать у RootCA
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial \
  -out server.crt -days 1095 -sha256 \
  -extfile server.conf -extensions req_ext -copy_extensions none
```

5. Проверьте корректность сертификата:
```bash
openssl x509 -in server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

6. Скопируйте сертификаты в нужные директории:
```bash
cp rootCA.crt server.crt server.key gmonit/ssl/
cp rootCA.crt server.crt server.key nginx/ssl/
```

7. Добавьте пути к сертификатам в файл `.env`:
```bash
CA_FILE=/gmonit/ssl/rootCA.crt
CERT_FILE=/gmonit/ssl/server.crt
KEY_FILE=/gmonit/ssl/server.key
```

> Важно: Файл `rootCA.crt` необходимо добавить в доверенные сертификаты на рабочих местах пользователей и серверах, где будут работать агенты.

## Запуск системы

### 1. Запуск GMonitML

Перейдите в директорию с GMonitML и выполните запуск:

```bash
cd ~/gmonitml

# Обновить образы (опционально)
docker compose pull

# Запустить контейнеры
docker compose up --wait
```

### 2. Проверка работоспособности

1. Проверьте статус контейнеров:
```bash
docker compose ps
```

Все контейнеры должны быть в состоянии "running" или "healthy".

2. Проверьте доступность веб-интерфейса:
Откройте в браузере: `https://gmonit.domain.ru`

3. Проверьте API коллектора:
```bash
curl -k https://collector.gmonit.domain.ru/about
```

Должен вернуться JSON с информацией о версии.

4. Проверьте логи при необходимости:
```bash
docker compose logs
```

## Устранение неисправностей

### Распространенные проблемы

**Проблема: Контейнеры не запускаются**
- Решение: Проверьте логи `docker compose logs`
- Решение: Убедитесь в корректности файла `.env`
- Решение: Проверьте доступность портов 80 и 443

**Проблема: Недоступен веб-интерфейс**
- Решение: Проверьте DNS разрешение доменов
- Решение: Убедитесь в корректности SSL-сертификатов
- Решение: Проверьте настройки firewall

**Проблема: Ошибки SSL/TLS**
- Решение: Проверьте валидность сертификатов командой `openssl x509 -in server.crt -text -noout`
- Решение: Убедитесь, что rootCA.crt добавлен в доверенные
- Решение: Проверьте Subject Alternative Names в сертификате

**Проблема: Недостаточно ресурсов**
- Решение: Проверьте использование CPU, памяти и диска
- Решение: Увеличьте ресурсы сервера согласно требованиям
- Решение: Очистите дисковое пространство

### Проверка состояния системы

```bash
# Проверка загруженных образов
docker images | grep -E "(gmonitml|grafana|collector)"

# Детальная проверка контейнеров
docker compose ps -a

# Проверка использования ресурсов
docker stats

# Проверка доступности API
curl -k -w "%{http_code}" https://collector.gmonit.domain.ru/health
```

## Дополнительные ресурсы

- [Документация по поддержке жизненного цикла](/gmonitml/maintenance_and_support.md)
- [Системные требования](/system_requirements)
- [Релизы и обновления](/releases)

> После успешной установки можно приступить к настройке агентов сбора данных и интеграции с системами мониторинга.
