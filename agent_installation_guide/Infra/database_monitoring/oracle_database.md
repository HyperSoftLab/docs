# Мониторинг Oracle Database с использованием New Relic + `nri-oracledb`

Для мониторинга Oracle Database с использованием агента New Relic выполните следующие шаги
---

### Шаг 1: Установка агента инфраструктуры

Убедитесь, что ваш сервер работает на поддерживаемой версии Linux. Инструкции для установки инфраструктурного агента можно найти [здесь](https://docs.newrelic.com/docs/infrastructure/host-integrations/installation/install-infrastructure-host-integrations/#tarball).

Пример установки для RHEL/CentOS:

```bash
sudo yum install newrelic-infra -y
```

---

### Шаг 2: Установка Oracle Instant Client

Для работы интеграции требуется **Oracle Instant Client** (OCI-библиотеки). Пример для Linux x64:

1. Перейдите на [страницу загрузки Oracle Instant Client](https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html).
2. Скачайте RPM-пакет **Basic** и установите его:

   ```bash
   sudo yum install oracle-instantclient-basic-21.1.0.0.0-1.x86_64.rpm
   ```

3. Если вы используете Oracle Instant Client версии 19 или выше, путь к библиотекам настроится автоматически. Для более старых версий (или если агент не видит библиотеки) добавьте путь в `LD_LIBRARY_PATH`:

   ```bash
   sudo sh -c 'echo /usr/lib/oracle/21/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf'
   sudo ldconfig
   ```

   Альтернатива — вручную через переменную окружения:

   ```bash
   export LD_LIBRARY_PATH=/usr/lib/oracle/21/client64/lib:$LD_LIBRARY_PATH
   ```

---

### Шаг 3: Настройка базы данных Oracle

> **Рекомендация:** перед созданием пользователя **остановите infra agent**. Если агент уже запущен с некорректным конфигом, он может заблокировать создаваемую учетную запись множественными попытками входа (неверный пароль).

```bash
sudo systemctl stop newrelic-infra
```

1. Проверка типа базы (CDB или Non-CDB)

Перед созданием пользователя определите, используется ли мультитенантная архитектура (CDB) — от этого зависит синтаксис (`c##USERNAME` vs `USERNAME`).

На сервере БД:

```bash
# 1) Переключаемся на пользователя владельца БД
sudo su - oracle

# 2) Входим в SQL-консоль под админом
sqlplus / as sysdba
```

Внутри SQL*Plus выполните:

```sql
SELECT CDB FROM V$DATABASE;
```

- Если ответ `YES` — используйте синтаксис для CDB (пользователь `c##USERNAME`).
- Если ответ `NO` — используйте обычный синтаксис (пользователь `USERNAME`).

2. Создание пользователя и выдача прав

Необходимо создать пользователя Oracle с правами **CONNECT** и **SELECT** на необходимые глобальные представления.

**Вариант A — автономная (Non-CDB)**, замените имя и пароль на ваши:

```sql
ALTER SESSION set "_Oracle_SCRIPT"=true;
CREATE USER USERNAME IDENTIFIED BY "USER_PASSWORD";
```

**Вариант B — мультитенантная база (CDB/PDB)**, замените имя и пароль на ваши:

```sql
CREATE USER c##USERNAME IDENTIFIED BY "USER_PASSWORD";
ALTER USER c##USERNAME SET CONTAINER_DATA=ALL CONTAINER=CURRENT;
```

**Выдача прав** (замените `USERNAME` на выбранное вами имя):

```sql
-- Базовые права
GRANT CONNECT TO USERNAME;
GRANT SELECT ON gv_$sysmetric TO USERNAME;
GRANT SELECT ON v_$database   TO USERNAME;
GRANT SELECT ON gv_$session   TO USERNAME;

-- Права, необходимые для панелей вкладки "Активность" (см. Шаг 6):
GRANT SELECT ON v_$sqlarea TO USERNAME; -- Нужно для Top SQL
GRANT SELECT ON v_$lock    TO USERNAME; -- Нужно для блокировок

EXIT;
```

3. Проверка имени сервиса (Service Name)

Убедитесь, что Listener настроен для удалённых подключений, и определите **точное** имя сервиса (важен регистр).

```bash
lsnrctl status
```

Запишите `SERVICE_NAME` **с учетом регистра**.

---

### Шаг 4: Установка и активация интеграции OracleDB

1. Установите интеграцию:

```bash
sudo yum install nri-oracledb
```

2. Скопируйте шаблон конфигурационного файла или создайте новый файл:

```bash
sudo cp /etc/newrelic-infra/integrations.d/oracledb-config.yml.sample \
        /etc/newrelic-infra/integrations.d/oracledb-config.yml
```

3. Откройте файл `/etc/newrelic-infra/integrations.d/oracledb-config.yml` и добавьте следующие настройки:

```yaml
integrations:
  - name: nri-oracledb
    env:
      # Имя сервиса из lsnrctl status. ВАЖНО: регистр должен совпадать
      SERVICE_NAME: SERVICE_NAME

      # Хост БД (localhost или IP удаленного сервера)
      HOSTNAME: 127.0.0.1

      # Порт подключения (обычно 1521)
      PORT: 1521

      # Учетные данные пользователя, созданного на Шаге 3
      USERNAME: USERNAME
      PASSWORD: USER_PASSWORD

      # Путь к папке, в которой лежит файл библиотеки 'libclntsh.so'.
      # Чтобы узнать точный путь: find / -name "libclntsh.so" 2>/dev/null
      # Пример для Instant Client: /usr/lib/oracle/21/client64/lib
      ORACLE_HOME: /usr/lib/oracle/21/client64/lib

      # Указать false, если мониторим не из-под sysdba
      IS_SYS_DBA: false

      # Путь к файлу кастомных метрик (опционально, см. Шаг 6)
      CUSTOM_METRICS_CONFIG: /etc/newrelic-infra/integrations.d/oracle-custom-metrics.yml

    interval: 15s
    labels:
      environment: production
    inventory_source: config/oracledb
```

4. Перезапустите агент:

```bash
sudo systemctl restart newrelic-infra
```

---

### Шаг 5: Проверка

1. Проверка логов

**Вариант 1 (systemd journal):**

```bash
journalctl -u newrelic-infra -f | grep nri-oracledb
```

**Вариант 2 (файл логов):**

```bash
grep "nri-oracledb" /var/log/messages | tail -n 20
```

После успешной настройки в логах агента появится следующая запись:

```
time="YYYY-MM-DDTHH:MM:SS+03:00" level=info msg="Integration health check finished with success" component=integrations.runner.Runner environment=production integration_name=nri-oracledb runner_uid=
```

2. Частые ошибки и решения

- **DPI-1047**: агент не видит OCI-библиотеки (Instant Client).
  - Проверьте `ORACLE_HOME` в конфиге и наличие `libclntsh.so*` в этой директории.
  - Выполните `ldconfig` (см. Шаг 2).
  - Подробнее см. [документацию Oracle](https://oracle.github.io/odpi/doc/installation.html#linux).

- **ORA-01017: invalid username/password**
  - Проверьте пользователя/пароль (например, через `sqlplus`).

- **ORA-12514: TNS:listener does not currently know of service**
  - Проверьте `SERVICE_NAME` в конфиге через `lsnrctl status` (см. Шаг 3.3).

---

### Шаг 6: Настройка кастомных метрик (опционально)

Для наполнения данными панелей **Топ 10 тяжелых SQL запросов**, **Активные сессии** и **Блокировки и влияние** из вкладки "Активность" создайте отдельный файл с SQL-запросами.

1. Создайте файл:

```bash
sudo nano /etc/newrelic-infra/integrations.d/oracle-custom-metrics.yml
```

2. Скопируйте конфигурацию

```yaml
queries:
  # 1) Топ запросов (Top SQL)
  - name: TopSQLQuery
    query: >-
      SELECT
        'TOP_SQL' as METRIC_TYPE,
        s.sql_id as SQL_ID,
        substr(s.sql_text, 1, 100) as SQL_TEXT,
        s.executions as EXECUTIONS,
        s.elapsed_time/1000000 as ELAPSED_TIME_SEC,
        s.cpu_time/1000000 as CPU_TIME_SEC
      FROM v$sqlarea s
      WHERE s.executions > 0
      ORDER BY s.elapsed_time DESC
      FETCH FIRST 10 ROWS ONLY

  # 2) Активные сессии (Active Sessions)
  - name: SessionQuery
    query: >-
      SELECT
        'SESSION' as METRIC_TYPE,
        sid as SESSION_ID,
        serial# as SERIAL_NUMBER,
        username as USERNAME,
        status as STATUS,
        nvl(module, program) as PROGRAM,
        action as ACTION_NAME,
        sql_id as SQL_ID,
        blocking_session as BLOCKING_SESSION
      FROM v$session
      WHERE type != 'BACKGROUND'
      AND status = 'ACTIVE'

  # 3) Блокировки (Locks)
  - name: LockQuery
    query: >-
      SELECT
        'LOCK' as METRIC_TYPE,
        s.sid as WAITER_SID,
        s.username as WAITER_USER,
        nvl(s.module, s.program) as WAITER_PROGRAM,
        substr(sq.sql_text, 1, 100) as WAITING_SQL,
        s.blocking_session as BLOCKER_SID,
        bs.username as BLOCKER_USER,
        nvl(bs.module, bs.program) as BLOCKER_PROGRAM,
        substr(bq.sql_text, 1, 100) as BLOCKING_SQL,
        s.seconds_in_wait as WAIT_TIME_SEC
      FROM v$session s
      JOIN v$session bs ON s.blocking_session = bs.sid
      LEFT JOIN v$sqlarea sq ON sq.sql_id = s.sql_id
      LEFT JOIN v$sqlarea bq ON bq.sql_id = nvl(bs.sql_id, bs.prev_sql_id)
      WHERE s.blocking_session IS NOT NULL
```

3. Убедитесь, что параметр `CUSTOM_METRICS_CONFIG` в основном конфиге (Шаг 4.2) указан, и перезапустите агент:

```bash
sudo systemctl restart newrelic-infra
```

### Дополнительная информация

- Подробная документация по настройке и устранению неполадок: [New Relic OracleDB Integration](https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/oracle-database/oracle-database-integration/).
- Обратите внимание на безопасность при хранении паролей, используя переменные окружения вместо прямой записи в конфигурации.
