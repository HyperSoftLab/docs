# MS SQL

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