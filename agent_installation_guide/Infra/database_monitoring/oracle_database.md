# Мониторинг Oracle Database с использованием New Relic

Для мониторинга Oracle Database с использованием агента New Relic выполните следующие шаги.

---

### Шаг 1: Установка агента инфраструктуры

Убедитесь, что ваш сервер работает на поддерживаемой версии Linux. Инструкции для установки инфраструктурного агента можно найти [здесь](https://docs.newrelic.com/docs/infrastructure/host-integrations/installation/install-infrastructure-host-integrations/#tarball).

Пример установки для RHEL/CentOS:

```bash
sudo yum install newrelic-infra -y
```

---

### Шаг 2: Установка Oracle Instant Client

Для работы интеграции необходим Oracle Instant Client. Пример для Linux x64:

1. Перейдите на [страницу загрузки Oracle Instant Client](https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html).
2. Скачайте RPM-пакет и установите его:

   ```bash
   sudo yum install oracle-instantclient-basic-21.1.0.0.0-1.x86_64.rpm
   ```

3. Если вы используете Oracle Instant Client версии 19 или выше, путь к библиотекам настроится автоматически. Для более старых версий добавьте библиотеку в `LD_LIBRARY_PATH`:

   ```bash
   sudo sh -c "echo /usr/lib/oracle/21.1/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
   sudo ldconfig
   ```

   Или настройте переменную окружения:

   ```bash
   export LD_LIBRARY_PATH=/usr/lib/oracle/18.5/client64/lib:$LD_LIBRARY_PATH
   ```

---

### Шаг 3: Настройка базы данных Oracle

1. **Создайте пользователя с необходимыми привилегиями**:
   - Для автономной базы данных:

     ```sql
     ALTER SESSION set "_Oracle_SCRIPT"=true;
     CREATE USER USERNAME IDENTIFIED BY "USER_PASSWORD";
     ```

   - Для мультитенантной базы данных:

     ```sql
     CREATE USER c##USERNAME IDENTIFIED BY "USER_PASSWORD";
     ALTER USER c##USERNAME SET CONTAINER_DATA=ALL CONTAINER=CURRENT;
     ```

2. **Предоставьте необходимые привилегии**:

   ```sql
   GRANT CONNECT TO USERNAME;
   GRANT SELECT ON gv_$sysmetric TO USERNAME;
   GRANT SELECT ON v_$database TO USERNAME;
   GRANT SELECT ON gv_$session TO USERNAME;
   -- Добавьте остальные необходимые представления из вашего сценария
   ```

3. **Настройте файл Listener.ora**:
   Убедитесь, что база данных настроена для удалённого подключения. По умолчанию база данных слушает только локальный хост.

---

### Шаг 4: Установка и активация интеграции OracleDB

1. Установите интеграцию:

   ```bash
   sudo yum install nri-oracledb
   ```

2. Скопируйте шаблон конфигурационного файла или создайте новый файл:

   ```bash
   sudo cp /etc/newrelic-infra/integrations.d/oracledb-config.yml.sample /etc/newrelic-infra/integrations.d/oracledb-config.yml
   ```

3. Откройте файл `/etc/newrelic-infra/integrations.d/oracledb-config.yml` и добавьте следующие настройки:

   ```yaml
   integrations:
     - name: nri-oracledb
       env:
         SERVICE_NAME: ORACLE
         HOSTNAME: 127.0.0.1
         PORT: 1521
         USERNAME: oracledb_user
         PASSWORD: oracledb_password
         ORACLE_HOME: /app/oracle/product/version/database
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

После успешной настройки в логах агента появится следующая запись:

```
time="YYYY-MM-DDTHH:MM:SS+03:00" level=info msg="Integration health check finished with success" component=integrations.runner.Runner environment=production integration_name=nri-oracledb runner_uid=
```

Если возникает ошибка **ORA-00000: DPI-1047**, убедитесь в корректности установки Oracle Instant Client. Подробнее см. [документацию Oracle](https://oracle.github.io/odpi/doc/installation.html#linux).

---

### Шаг 6: Настройка кастомных метрик (опционально)

Для наполнения данными панелей **Топ 10 тяжелых SQL запросов**, **Активные сессии** и **Блокировки и влияние** из вкладки "Кастомные метрики" создайте отдельный файл с SQL-запросами.

1. Создайте файл `oracle-custom-metric.yml`

```
sudo nano /etc/newrelic-infra/integrations.d/oracle-custom-metrics.yml
```

2. Скопируйте данную конфигурацию

```
queries:
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

3. Убедитесь, что параметр `CUSTOM_METRICS_CONFIG` в основном конфиге (Шаг 4.3) указан, и перезапустите агент:

```
sudo systemctl restart newrelic-infra
```

---

### Дополнительная информация

- Подробная документация по настройке и устранению неполадок: [New Relic OracleDB Integration](https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/oracle-database/oracle-database-integration/).
- Обратите внимание на безопасность при хранении паролей, используя переменные окружения вместо прямой записи в конфигурации.

