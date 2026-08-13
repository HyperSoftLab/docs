# Установка интеграции nri-mssql на Windows Server (1С)

Данный документ описывает процесс установки и настройки интеграции мониторинга Microsoft SQL Server (nri-mssql) для инфраструктурного агента GMonit на сервере под управлением Windows Server в изолированном контуре (без доступа в интернет).

**Целевая ОС:** Windows Server 2016 / 2019 / 2022 (64-bit)

> **Совместимость:** Протестировано на Windows 11 Pro + SQL Server 2022 Express. Инструкция применима к SQL Server 2016/2017/2019/2022 (Standard, Enterprise, Express).

> ⚠️ **ВАЖНОЕ УСЛОВИЕ:** На сервере уже должен быть установлен Infrastructure Agent (см. инструкцию 1.1). Интеграция nri-mssql является расширением инфра-агента и без него не работает.

#### Установка и настройка

Вы получили архив `nri-mssql-windows-offline.zip` с интеграцией мониторинга MSSQL для установки в закрытом контуре.

**Целевая среда:** Windows Server 2016/2019/2022, 64-bit. SQL Server 2016+.

> ⚠️ **Предварительное условие:** Infrastructure Agent уже должен быть установлен и запущен (инструкция 1.1).

### 0\. Предварительные требования

* **Infrastructure Agent** установлен и запущен (`Get-Service newrelic-infra` → `Running`).
* Доступ к MSSQL с правами **sysadmin** или **sa** для создания пользователя мониторинга.
* Права **администратора** Windows для установки MSI.

### 1\. Распаковка архива

Перенесите файл `nri-mssql-windows-offline.zip` на сервер и выполните распаковку:

```powershell
Expand-Archive -Path "C:\nri-mssql-windows-offline.zip" -DestinationPath "C:\mssql_integration_bundle"
cd C:\mssql_integration_bundle
```

### 2\. Предварительная настройка MSSQL

> ⚠️ **Внимание:** Для подключения nri-mssql через TCP необходимо убедиться, что:
> 1. **TCP/IP включён** в SQL Server Configuration Manager (по умолчанию отключён в Express)
> 2. **Mixed Mode Authentication** включён (SQL Server + Windows Authentication)
> 3. Порт **1433** (или другой) назначен статически

**Включение TCP/IP и назначение порта:**

Откройте SQL Server Configuration Manager → SQL Server Network Configuration → Protocols for SQLEXPRESS (или ваш instance) → TCP/IP → Enable. В свойствах TCP/IP → IPAll → TCP Port = `1433`, TCP Dynamic Ports = пусто.

**Включение Mixed Mode Authentication:**

```sql
-- Выполнить через sqlcmd с Windows Authentication
EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'Software\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', REG_DWORD, 2;
```

После изменений **перезапустите SQL Server**.

### 3\. Создание пользователя мониторинга в MSSQL

Выполните SQL-скрипт из архива в SQL Server Management Studio (SSMS) или через `sqlcmd`:

```cmd
sqlcmd -S localhost -U sa -i C:\mssql_integration_bundle\create_gmonit_user.sql
```

> **Примечание:** Замените пароль `<<MSSQL_PASSWORD>>` в скрипте на безопасный пароль **до** выполнения. Избегайте спецсимволов `!`, `#`, `@` в пароле — они могут вызвать ошибки парсинга в Go-драйвере.

**Проверка созданного пользователя:**

```sql
SELECT name, type_desc FROM sys.server_principals WHERE name = 'gmonit';
-- Ожидаемый результат: gmonit | SQL_LOGIN
```

### 4\. Установка интеграции

Запустите установку MSI в тихом режиме:

```cmd
msiexec.exe /qn /i C:\mssql_integration_bundle\nri-mssql-amd64.msi
```

**Проверка установки:**

```cmd
dir "C:\Program Files\New Relic\newrelic-infra\newrelic-integrations\bin\nri-mssql.exe"
```

> **Примечание:** Бинарник устанавливается в подпапку `bin\`: `newrelic-integrations\bin\nri-mssql.exe`. Определение интеграции (`nri-mssql-definition.yml`) — в `newrelic-integrations\`.

### 5\. Настройка конфигурации

Скопируйте шаблон конфигурации из архива:

```
xcopy C:\mssql_integration_bundle\mssql-config.yml "C:\Program Files\New Relic\newrelic-infra\integrations.d\" /Y
```

Откройте файл для редактирования:

```cmd
notepad "C:\Program Files\New Relic\newrelic-infra\integrations.d\mssql-config.yml"
```

**Замените плейсхолдеры** `<<...>>` на актуальные значения:

| Плейсхолдер | Описание | Пример |
| --- | --- | --- |
| `<<MSSQL_HOST>>` | Адрес MSSQL-сервера | `localhost` |
| `<<MSSQL_PORT>>` | Порт MSSQL | `1433` |
| `<<MSSQL_USER>>` | Пользователь мониторинга | `gmonit` |
| `<<MSSQL_PASSWORD>>` | Пароль пользователя | `MonitorPass123` |
| `<<CLUSTER_NAMES>>` | Имя кластера 1С (или несколько через `===`) | `buh-cluster` |

> **Несколько кластеров 1С:** если MSSQL обслуживает несколько кластеров, перечислите их через разделитель `===`:
> ```
> one_c.cluster_names: cluster1===cluster2===cluster3
> ```

**Итоговый пример конфигурации:**

```yaml
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
    one_c.cluster_names: buh-cluster
  inventory_source: config/mssql
```

> **Важно:**
> * Соблюдайте отступы — используйте **пробелы**, не Tab.
> * Избегайте спецсимволов (`!`, `#`, `@`) в пароле — могут вызвать ошибки парсинга.

### 6\. Перезапуск агента

Перезапустите Infrastructure Agent для подключения интеграции:

```powershell
Restart-Service newrelic-infra
```

### 7\. Проверка корректности работы

**Проверка наличия MSSQL-метрик в логах:**

```cmd
findstr /i "mssql" "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log"
```

Ожидаемый вывод — строки с `integration=com.newrelic.mssql` без ошибок.

**Ручной запуск интеграции для диагностики:**

```powershell
& "C:\Program Files\New Relic\newrelic-infra\newrelic-integrations\bin\nri-mssql.exe" -hostname localhost -port 1433 -username gmonit -password MonitorPass123
```

Ожидаемый вывод: JSON с метриками (MssqlDatabaseSample, MssqlInstanceSample и др.).

### 8\. Критерии успеха

| Критерий | Как проверить |
| --- | --- |
| Интеграция установлена | `Test-Path "...\nri-mssql.exe"` → `True` |
| Конфигурация на месте | `Test-Path "...\integrations.d\mssql-config.yml"` → `True` |
| Пользователь gmonit создан | `sqlcmd -S localhost -U gmonit -P <pass> -Q "SELECT 1"` → `1` |
| Нет ошибок интеграции | В логах нет `error` рядом с `mssql` |
| Метрики MSSQL в GMonit | UI → Инфраструктура → Хосты → `<<HOSTNAME>>` → интеграции → MSSQL |

### 9\. Типичные ошибки и решения

| Ошибка | Причина | Решение |
| --- | --- | --- |
| `Login failed for user 'gmonit'` | Неверный пароль, пользователь не создан, или Mixed Mode отключён | Проверьте login: `SELECT name FROM sys.server_principals WHERE name='gmonit'`. Убедитесь что Mixed Mode включён (шаг 2) |
| `connection refused` | MSSQL не слушает на указанном порте | Проверьте: `Test-NetConnection localhost -Port 1433`. Убедитесь что TCP/IP включён (шаг 2) |
| `TCP/IP is disabled` | TCP/IP не включён в SQL Server (особенно Express) | Включите TCP/IP через SQL Server Configuration Manager (шаг 2) |
| `TLS handshake error` | Проблема с шифрованием | Добавьте `ENABLE_SSL: false` в env-секцию конфига |
| Ошибка парсинга пароля | Спецсимволы в пароле (`!`, `#`, `@`) | Смените пароль без спецсимволов |
| `integration not found` | MSI не установлен или путь неверный | Переустановите MSI, проверьте `nri-mssql.exe` |
| `Named Pipes Provider: Could not open a connection` | SQL Server Browser не запущен (для named instances) | Запустите SQL Server Browser или укажите порт явно |

### 10\. Контрольный чек-лист

| Шаг | Действие | Проверка |
| --- | --- | --- |
| 1 | Infrastructure Agent установлен | `Get-Service newrelic-infra` → `Running` |
| 2 | Пользователь gmonit создан в MSSQL | `sqlcmd -S localhost -U gmonit -P <pass> -Q "SELECT 1"` |
| 3 | MSI nri-mssql установлен | `Test-Path "...\nri-mssql.exe"` → `True` |
| 4 | Конфигурация настроена | Файл `mssql-config.yml` в `integrations.d\` |
| 5 | Агент перезапущен | `Restart-Service newrelic-infra` |
| 6 | Нет ошибок в логах | `findstr /i "mssql.*error" ...` → пусто |
| 7 | Метрики видны в GMonit | UI → Хосты → MSSQL-метрики |

### 11\. Собираемые метрики

После успешной настройки интеграция собирает следующие типы данных:

| Тип метрик | Описание |
| --- | --- |
| **MssqlInstanceSample** | Метрики экземпляра: подключения, batch requests/sec, buffer cache hit ratio, page life expectancy |
| **MssqlDatabaseSample** | Метрики по каждой БД: размер, транзакции/сек, active transactions |
| **MssqlWaitSample** | Wait statistics: типы ожиданий, время ожидания |

> Интервал сбора метрик настраивается параметром `interval` в конфигурации (по умолчанию 15 секунд).


