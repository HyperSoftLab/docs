# MS SQL инструкция для Windows

Данная инструкция описывает процесс установки интеграции для мониторинга Microsoft SQL Server.

## Шаг 1. Скачивание и установка агента

### 1\. Скачайте MSI-установщик

Ниже представлены прямые ссылки на загрузку последней актуальной версии агента.

> *Примечание: Ссылки ведут на последние стабильные версии (`latest`). Если вам нужна конкретная версия агента, вы можете выбрать её в [официальном репозитории](https://download.newrelic.com/infrastructure_agent/windows/integrations/nri-mssql/).*

*   **Для 64-битной системы (x64):**
    
    [Скачать nri-mssql-amd64.msi](https://download.newrelic.com/infrastructure_agent/windows/integrations/nri-mssql/nri-mssql-amd64.msi)
    
*   **Для 32-битной системы (x86):**
    
    [Скачать nri-mssql-386.msi](https://download.newrelic.com/infrastructure_agent/windows/integrations/nri-mssql/386/nri-mssql-386.msi)
    

### 2\. Запустите установку

Откройте командную строку (CMD) или PowerShell **от имени администратора**.

Замените `PATH_TO` на реальный путь к скачанному файлу (например, `C:\Downloads\`) и выполните команду:

**Для версии 64-bit:**

```
msiexec.exe /qn /i PATH_TO\nri-mssql-amd64.msi
```

**Для версии 32-bit:**

```
msiexec.exe /qn /i PATH_TO\nri-mssql-amd386.msi
```

* * *

## Шаг 2. Настройка конфигурации

1.  Перейдите в папку с интеграциями:
    
    `C:\Program Files\New Relic\newrelic-infra\integrations.d\`
    
2.  Найдите файл `mssql-config.yml.sample` и переименуйте его в **`mssql-config.yml`**.
    
3.  Откройте файл в любом текстовом редакторе (Блокнот, Notepad++), удалите всё содержимое и вставьте следующий текст:
    

**YAML**

```
integrations:
  - name: nri-mssql
    env:
      HOSTNAME: localhost
      PORT: 1433
      USERNAME: mssql_use
      PASSWORD: mssql_password
    interval: 15s
    labels:
      environment: production
    inventory_source: config/mssql
```


> **Важно:** Замените `mssql_use` и `mssql_password` на реальные логин и пароль пользователя, которого вы создадите на следующем шаге.

* * *

## Шаг 3. Создание пользователя и выдача прав в SQL Server

Агенту требуются права для сбора метрик. Выполните этот SQL-скрипт в **SQL Server Management Studio (SSMS)**:

## SQL

**SQL**

```
USE master;
GO

-- 1. Создание логина и пользователя
-- Важно: Пароль ниже должен совпадать с PASSWORD в файле mssql-config.yml
CREATE LOGIN mssql_use WITH PASSWORD = 'mssql_password';
CREATE USER mssql_use FOR LOGIN mssql_use;
GO

-- 2. Выдача системных прав
GRANT CONNECT SQL TO mssql_use;
GRANT VIEW SERVER STATE TO mssql_use;
GRANT CONNECT ANY DATABASE TO mssql_use;
GRANT VIEW ANY DEFINITION TO mssql_use;
GO

-- 3. Скрипт для добавления пользователя во все базы данных
DECLARE @name NVARCHAR(max)
DECLARE @sql NVARCHAR(max)
DECLARE db_cursor CURSOR FOR 
SELECT name FROM sys.databases 
WHERE name NOT IN ('master','msdb','tempdb','model') AND state = 0;

OPEN db_cursor
FETCH NEXT FROM db_cursor INTO @name

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = 'USE [' + @name + ']; IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = ''mssql_use'') CREATE USER mssql_use FOR LOGIN mssql_use;'
    EXEC sp_executesql @sql;
    FETCH NEXT FROM db_cursor INTO @name
END

CLOSE db_cursor
DEALLOCATE db_cursor;
```

* * *

## Шаг 4. Перезапуск агента

Чтобы применить настройки, перезапустите службу инфраструктурного агента.

Выполните в PowerShell (от имени администратора):

## PowerShell  

```
Stop-Service newrelic-infra -ErrorAction SilentlyContinue
Start-Service newrelic-infra
```

## Шаг 5. Проверка

Через 2-3 минуты проверьте интерфейс GMONIT (раздел **Инфраструктура**). Данные по MSSQL должны появиться в карточке хоста.

* * *

# MS SQL инструкция для Linux (Ubuntu)

Вы получили архив `nri-mssql-ubuntu-offline.tar.gz` с интеграцией мониторинга MSSQL для установки в закрытом контуре.

**Целевая среда:** Ubuntu 22.04 / 24.04 LTS (x86\_64). Microsoft SQL Server 2017+.

> ⚠️ **Предварительное условие:** Infrastructure Agent уже должен быть установлен и запущен (`systemctl is-active newrelic-infra` → `active`).

### Шаг  0\. Предварительные требования

*   **Infrastructure Agent** установлен и запущен:
    ```
    systemctl is-active newrelic-infra
    # Ожидаемый вывод: active
    
    ```
    
*   Доступ к MSSQL с правами **sysadmin** (учётная запись `sa` или эквивалент) для создания пользователя мониторинга.
*   Права **root / sudo** для установки `.deb` пакета и редактирования конфигов агента.
*   Сетевая доступность MSSQL: порт **1433/TCP** (или другой) с машины, где работает инфра-агент.
*   Утилита `sqlcmd` для подключения к MSSQL — либо локально на сервере с MSSQL, либо с любой машины, имеющей сетевой доступ к нему. Подойдёт также SQL Server Management Studio (SSMS) или Azure Data Studio с любого Windows-хоста.

### Шаг 1\. Распаковка архива

Перенесите файл `nri-mssql-ubuntu-offline.tar.gz` на сервер и выполните распаковку:

```
mkdir -p ~/mssql_integration_bundle
tar -xzvf nri-mssql-ubuntu-offline.tar.gz -C ~/
cd ~/mssql_integration_bundle
ls
# Должны быть видны:
#   nri-mssql_2.30.0-1_amd64.deb
#   mssql-config.yml
#   create_gmonit_user.sql

```

### Шаг 2\. Проверка доступности MSSQL

> **Примечание:** В отличие от Windows-версии, SQL Server для Linux (нативный пакет и Docker-образ) **по умолчанию** слушает на TCP/1433 и работает в **Mixed Mode Authentication** — отдельная настройка не требуется.

Проверьте сетевую доступность порта:

```
# Если MSSQL на этом же сервере:
ss -tlnp | grep 1433
# Ожидаемый вывод: LISTEN ... 0.0.0.0:1433  или  127.0.0.1:1433

# Если MSSQL на удалённой машине:
nc -zv <<MSSQL_HOST>> 1433
# Ожидаемый вывод: Connection to <<MSSQL_HOST>> 1433 port [tcp/ms-sql-s] succeeded!

```

### Шаг 3\. Создание пользователя мониторинга в MSSQL

**Перед выполнением:** замените `<<MSSQL_PASSWORD>>` в файле `create_gmonit_user.sql` на безопасный пароль.

> ⚠️ Избегайте спецсимволов `!`, `#`, `@` в пароле — они могут вызвать ошибки парсинга в Go-драйвере `nri-mssql`.

**Вариант А: sqlcmd установлен локально (Linux/Windows):**

```
sqlcmd -S <<MSSQL_HOST>>,1433 -U sa -P '<sa_password>' -C \
  -i ~/mssql_integration_bundle/create_gmonit_user.sql

```

**Вариант Б: запуск через SSMS** — открыть файл `create_gmonit_user.sql`, подключиться к серверу под `sa`, нажать `Execute`.

**Проверка созданного пользователя:**

```
sqlcmd -S <<MSSQL_HOST>>,1433 -U gmonit -P 'MonitorPass123' -C \
  -Q "SELECT @@SERVERNAME AS server, SUSER_NAME() AS [user]"
# Ожидаемый вывод:
# server      user
# ---------- ------
# <hostname>  gmonit

```

### Шаг 4\. Установка интеграции nri-mssql

```
cd ~/mssql_integration_bundle
sudo dpkg -i nri-mssql_2.30.0-1_amd64.deb

```

**Проверка установки:**

```
dpkg -l nri-mssql
# Ожидаемая строка: ii  nri-mssql  2.30.0  ...

ls -la /var/db/newrelic-infra/newrelic-integrations/bin/nri-mssql
# Файл существует, размер ~5-7 MB

```

> **Примечание:** Бинарник устанавливается в `/var/db/newrelic-infra/newrelic-integrations/bin/nri-mssql`. Definition-файл — в `/var/db/newrelic-infra/newrelic-integrations/mssql-definition.yml`. Sample-конфиг — в `/etc/newrelic-infra/integrations.d/mssql-config.yml.sample`.

### Шаг 5\. Настройка конфигурации

Скопируйте шаблон конфигурации из архива:

```
sudo cp ~/mssql_integration_bundle/mssql-config.yml \
  /etc/newrelic-infra/integrations.d/mssql-config.yml
sudo chmod 640 /etc/newrelic-infra/integrations.d/mssql-config.yml
sudo chown root:root /etc/newrelic-infra/integrations.d/mssql-config.yml

```

Откройте файл для редактирования:

```
sudo nano /etc/newrelic-infra/integrations.d/mssql-config.yml

```

**Замените плейсхолдеры** `<<...>>` на актуальные значения:

| Плейсхолдер | Описание | Пример |
| --- | --- | --- |
| `<<MSSQL_HOST>>` | Адрес MSSQL-сервера (IP или DNS-имя) | `localhost` или `10.0.0.15` |
| `<<MSSQL_PORT>>` | Порт MSSQL | `1433` |
| `<<MSSQL_USER>>` | Пользователь мониторинга | `gmonit` |
| `<<MSSQL_PASSWORD>>` | Пароль пользователя | `MonitorPass123` |

**Итоговый пример конфигурации:**

```
integrations:
- name: nri-mssql
  env:
    HOSTNAME: localhost
    PORT: 1433
    USERNAME: gmonit
    PASSWORD: MonitorPass123
    ENABLE_SSL: false
  interval: 15s
  labels:
    environment: production
  inventory_source: config/mssql

```

> **Важно:**
> 
> *   Соблюдайте отступы — используйте **пробелы** (2 пробела на уровень), не Tab.
> *   `ENABLE_SSL: false` обязателен, если на MSSQL нет настроенного TLS-сертификата (типичный случай для SQL Server на Linux/Docker «из коробки»).
> *   Файл `mssql-config.yml.sample` (от пакета) можно оставить — Infrastructure Agent читает только файлы с расширением `.yml`/`.yaml`, а не `.sample`.

### Шаг 6\. Перезапуск Infrastructure Agent

Перезапустите агент для подключения интеграции:

```
sudo systemctl restart newrelic-infra
sleep 5
sudo systemctl is-active newrelic-infra
# Ожидаемый вывод: active

```

### Шаг 7\. Проверка корректности работы

**A. Health check в логах агента:**

```
sudo journalctl -u newrelic-infra --since "1 minute ago" --no-pager | grep -i mssql

```

Ожидаемая строка (повторяется каждые 15 секунд):

```
level=info msg="Integration health check finished with success" integration_name=nri-mssql

```

**B. Ручной запуск интеграции (для диагностики):**

```
sudo /var/db/newrelic-infra/newrelic-integrations/bin/nri-mssql \
  -hostname localhost -port 1433 \
  -username gmonit -password 'MonitorPass123' \
  -enable_ssl=false -pretty | head -50

```

Ожидаемый вывод — JSON с метриками типов `MssqlInstanceSample`, `MssqlDatabaseSample`, `MssqlWaitSample`.

**C. Проверка в GMonit UI:**

Откройте UI GMonit → **Инфраструктура** → **Хосты** → выберите хост, на котором установлен `nri-mssql` → раздел **Интеграции** → должна появиться запись `MSSQL` с метриками.

### Шаг 8\. Критерии успеха

| Критерий | Как проверить |
| --- | --- |
| Интеграция установлена | `dpkg -l nri-mssql` → строка `ii nri-mssql 2.30.0` |
| Бинарник на месте | `test -x /var/db/newrelic-infra/newrelic-integrations/bin/nri-mssql && echo OK` |
| Конфигурация настроена | `test -f /etc/newrelic-infra/integrations.d/mssql-config.yml && echo OK` |
| Пользователь gmonit создан | `sqlcmd -S <host>,1433 -U gmonit -P <pass> -C -Q "SELECT 1"` → `1` |
| Health check проходит | В `journalctl -u newrelic-infra` строки `health check finished with success integration_name=nri-mssql` |
| Метрики в GMonit | UI → Инфраструктура → Хосты → <host> → Интеграции → MSSQL |

### Шаг 9\. Типичные ошибки и решения

| Ошибка в логах | Причина | Решение |
| --- | --- | --- |
| `Login failed for user 'gmonit'` | Неверный пароль, пользователь не создан, или Mixed Mode отключён | Проверьте login: `SELECT name FROM sys.server_principals WHERE name='gmonit'`. Проверьте пароль, при необходимости пересоздайте логин |
| `connection refused` или `i/o timeout` | MSSQL не слушает на указанном порту, или порт закрыт firewall'ом | `ss -tlnp \\| grep 1433`. Проверьте `ufw status` / `iptables -L`. На удалённом MSSQL — `nc -zv <host> 1433` |
| `TLS Handshake failed` | Агент пытается установить TLS, но сертификат не настроен | Убедитесь, что в конфиге задано `ENABLE_SSL: false` |
| `Error: ParseError ... unexpected character` | Спецсимволы в пароле (`!`, `#`, `@`) | Смените пароль на буквенно-цифровой |
| `integration not found` | `.deb`\-пакет не установлен или повреждён | Переустановить: `sudo dpkg -i nri-mssql_2.30.0-1_amd64.deb` |
| `yaml: line X: did not find expected key` | Неверные отступы в `mssql-config.yml` (TAB вместо пробелов) | Открыть редактор с подсветкой YAML, заменить табы на пробелы |
| `level=error ... newrelic-infra ... unable to load definition` | Файл `mssql-definition.yml` отсутствует | Переустановить пакет |

### Шаг 10\. Контрольный чек-лист

| #   | Действие | Команда проверки |
| --- | --- | --- |
| 1   | Infrastructure Agent запущен | `systemctl is-active newrelic-infra` → `active` |
| 2   | MSSQL доступен на 1433 | `nc -zv <host> 1433` → `succeeded` |
| 3   | Пользователь gmonit создан | `sqlcmd -S <host> -U gmonit -P <pass> -C -Q "SELECT 1"` |
| 4   | `.deb`\-пакет установлен | `dpkg -l nri-mssql` |
| 5   | Конфигурация на месте | `cat /etc/newrelic-infra/integrations.d/mssql-config.yml` |
| 6   | Агент перезапущен без ошибок | `systemctl is-active newrelic-infra` → `active` |
| 7   | Нет ошибок в логах | `journalctl -u newrelic-infra --since "1m ago" \\| grep -iE "(error\\|fatal).*mssql"` → пусто |
| 8   | Метрики MssqlInstanceSample отправляются | Health check в логах + JSON-вывод ручного запуска |

### Шаг 11\. Собираемые метрики

После успешной настройки интеграция собирает три типа событий (event types):

| Тип события | Что внутри |
| --- | --- |
| **MssqlInstanceSample** | Метрики экземпляра: `activeConnections`, `bufferpool.batchRequestsPerSecond`, `bufferpool.pageLifeExpectancyInMilliseconds`, `stats.deadlocksPerSecond`, `stats.sqlCompilationsPerSecond`, `system.bufferPoolHitPercent`, `memoryUtilization`, `instance.runningProcessesCount`, `instance.blockedProcessesCount` и др. |
| **MssqlDatabaseSample** | Метрики по каждой пользовательской БД: `bufferpool.sizeInBytes`, `log.transactionGrowth`, `pageFileTotal`, `pageFileAvailable`, `transactionLogFlushesPerSecond` |
| **MssqlWaitSample** | Wait statistics: типы ожиданий (`wait_type`), время ожидания (`wait_time_count`, `waiting_tasks_count`) — диагностика блокировок и узких мест |

> Интервал сбора метрик настраивается параметром `interval` в конфигурации (по умолчанию 15 секунд).