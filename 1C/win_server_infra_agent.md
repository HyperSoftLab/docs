# Установка Infrastructure Agent на Windows Server (1С)

Данный документ описывает процесс установки и настройки инфраструктурного агента мониторинга (GMonit) на сервере под управлением Windows Server в изолированном контуре (без доступа в интернет).

**Целевая ОС:** Windows Server 2016 / 2019 / 2022 (64-bit)

> **Совместимость:** Инструкция также применима к Windows 10/11 (64-bit) для тестирования.


## Установка и настройка

Вы получили архив `newrelic-infra-windows-offline.zip` с агентом мониторинга для установки в закрытом контуре.

**Целевая среда:** Windows Server 2016/2019/2022, 64-bit.

### 0\. Предварительные требования

* Сетевой доступ от сервера до коллектора GMonit по порту **443 (HTTPS)**. Проверьте:
    ```powershell
    Test-NetConnection <<COLLECTOR_HOST>> -Port 443
    ```
    Поле `TcpTestSucceeded` должно быть `True`.

* Права **администратора** для установки MSI и управления службой.

### 1\. Распаковка архива

Перенесите файл `newrelic-infra-windows-offline.zip` на сервер и выполните распаковку:

```powershell
Expand-Archive -Path "C:\newrelic-infra-windows-offline.zip" -DestinationPath "C:\infra_agent_bundle"
cd C:\infra_agent_bundle
```

### 2\. Установка агента

Запустите установку MSI в тихом режиме (из PowerShell с правами администратора):

```powershell
msiexec.exe /qn /i "C:\infra_agent_bundle\newrelic-infra.msi"
```

> **Примечание:** Установка занимает 1-2 минуты. Агент, конфигурация и логи устанавливаются в `C:\Program Files\New Relic\newrelic-infra\`.

**Проверка установки:**

```powershell
& "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.exe" --version
# Ожидаемый вывод: New Relic Infrastructure Agent version: 1.72.8 ...
```

### 3\. Настройка конфигурации

Основной файл конфигурации: `C:\Program Files\New Relic\newrelic-infra\newrelic-infra.yml`

> **Примечание:** MSI-инсталлятор размещает конфигурацию, бинарники и логи в одной директории `C:\Program Files\New Relic\newrelic-infra\`.

Скопируйте шаблон из архива (заменив существующий файл):

```
xcopy C:\infra_agent_bundle\newrelic-infra.yml "C:\Program Files\New Relic\newrelic-infra\" /Y
```

Откройте файл для редактирования:

```powershell
notepad "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.yml"
```

**Замените плейсхолдеры** `<<...>>` на актуальные значения вашей инфраструктуры:

| Плейсхолдер | Описание | Пример |
| --- | --- | --- |
| `<<HOSTNAME>>` | Понятное имя сервера | `1C-AppServer-01` |
| `<<COLLECTOR_HOST>>` | Полный хост коллектора GMonit | `collector.company.com` |
| `ca_bundle_file` | Путь к CA-сертификату | `C:\Program Files\New Relic\newrelic-infra\ssl\ca_bundle.crt` |
| `<<SERVICE_GROUP>>` | Группа сервиса | `1c cluster` |
| `<<SERVICE_ROLE>>` | Роль сервиса | `app-server` |

**Итоговый пример конфигурации:**

```yaml
# Лицензионный ключ (заглушка, не меняем)
license_key: "0123456789012345678901234567890123456789"

# Имя хоста
display_name: "1C-AppServer-01"

# Сбор метрик процессов
enable_process_metrics: true

# Настройки подключения к коллектору GMonit
collector_url: https://collector.company.com/infra2/infra-api
identity_url: https://collector.company.com/infra2/identity-api
metric_url: https://collector.company.com/metrics
command_channel_url: https://collector.company.com/infra2/command-api

# Настройки самодиагностики
self_instrumentation: newrelic
self_instrumentation_apm_host: collector.company.com

# Путь к CA-сертификату (обязателен для самоподписанных сертификатов)
ca_bundle_file: C:\Program Files\New Relic\newrelic-infra\ssl\ca_bundle.crt

# Настройки логирования и ротации
log:
  level: info
  file: 'C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log'
  rotate:
    max_size_mb: 1000
    max_files: 5
    compression_enabled: true
    file_pattern: YYYY-MM-DD_hh-mm-ss.log

# Пользовательские метки
custom_attributes:
  label.environment: production
  label.group: 1c cluster
  label.role: app-server
```

> **Важно:**
> * Соблюдайте отступы — используйте **пробелы**, не Tab.
> * Лицензионный ключ — заглушка, менять не нужно.
> * Параметр `ca_bundle_file` — **обязателен** в закрытом контуре с самоподписанными сертификатами. Укажите путь к корневому CA-сертификату коллектора GMonit. Если сертификат валидный (выдан доверенным CA) — строку можно закомментировать символом `#`.

### 4\. Отключение сбора системных логов (опционально)

По умолчанию агент собирает системные логи Windows. Если это не требуется, переименуйте конфигурационные файлы в директории логирования:

```powershell
Get-ChildItem "C:\Program Files\New Relic\newrelic-infra\logging.d\*.yml" | Rename-Item -NewName { $_.Name + ".disabled" }
```

### 5\. Запуск службы

Перезапустите службу агента для применения конфигурации:

```powershell
Restart-Service newrelic-infra
```

Если служба не запущена:

```powershell
Start-Service newrelic-infra
```

**Проверка статуса:**

```powershell
Get-Service newrelic-infra
```

Ожидаемый статус: `Running`.

### 6\. Проверка корректности работы

**Просмотр логов в реальном времени:**

```powershell
Get-Content "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log" -Tail 50 -Wait
```

**Проверка подключения к коллектору:**

```powershell
Select-String -Path "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log" -Pattern "connected|connect got id"
```

Ожидаемый вывод:

```
level=info msg="application connected" component=AgentInstrumentation
level=info msg="connect got id" agent-guid=... component=IdentityConnectService
```

**Проверка ошибок:**

```powershell
Select-String -Path "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log" -Pattern "error" -CaseSensitive:$false
```

### 7\. Критерии успеха

| Критерий | Как проверить |
| --- | --- |
| Служба запущена | `Get-Service newrelic-infra` → `Running` |
| Агент подключён к коллектору | В логах: `application connected` |
| Агент получил идентификатор | В логах: `connect got id` |
| Нет ошибок лицензии | Отсутствует `401 Unauthorized` |
| Нет ошибок сертификата | Отсутствует `x509: certificate signed by unknown authority` |
| Нет ошибок сети | Отсутствует `connection refused` |
| Хост виден в GMonit | UI → Инфраструктура → Хосты → `<<HOSTNAME>>` |

### 8\. Типичные ошибки и решения

| Ошибка | Причина | Решение |
| --- | --- | --- |
| `401 Unauthorized` | Неверный `license_key` | Проверьте, что ключ — заглушка `0123456789012345678901234567890123456789` |
| `x509: certificate signed by unknown authority` | Самоподписанный сертификат коллектора | Укажите корректный путь в `ca_bundle_file` |
| `connection refused` | Нет сетевого доступа до коллектора (порт 443) | Проверьте firewall: `Test-NetConnection <<COLLECTOR_HOST>> -Port 443` |
| Служба не стартует | Ошибка в YAML-конфиге (Tab вместо пробелов, неверный синтаксис) | Проверьте Event Viewer: `Get-EventLog -LogName Application -Source "newrelic-infra" -Newest 10` |
| `msiexec` завершается с ошибкой | Нет прав администратора | Запустите PowerShell от имени администратора |
| Логи пусты | Не создана директория или ошибка пути в конфиге | Проверьте путь в `log.file`, убедитесь что директория существует |
| `cannot build supervisor executor: failed to load log configs` | Log-forwarder не настроен | Некритично. Если системные логи не нужны — можно игнорировать |
| `unable to initialize docker/containerd client` | Docker/containerd не установлен | Некритично. Агент работает без контейнеров |

### 9\. Управление агентом (справочник команд)

| Действие | Команда |
| --- | --- |
| Запуск | `Start-Service newrelic-infra` |
| Остановка | `Stop-Service newrelic-infra` |
| Перезапуск | `Restart-Service newrelic-infra` |
| Статус | `Get-Service newrelic-infra` |
| Версия агента | `& "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.exe" --version` |
| Логи (последние 50 строк) | `Get-Content "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log" -Tail 50` |
| Логи (реальное время) | `Get-Content "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log" -Tail 50 -Wait` |
| Поиск ошибок в логах | `Select-String -Path "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.log" -Pattern "error"` |

> **Альтернатива (CMD):**
> * Запуск: `net start newrelic-infra`
> * Остановка: `net stop newrelic-infra`

### 10\. Контрольный чек-лист

| Шаг | Действие | Проверка |
| --- | --- | --- |
| 1 | Распаковать архив | `dir C:\infra_agent_bundle\` |
| 2 | Установить MSI | `& "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.exe" --version` |
| 3 | Настроить конфигурацию | `Get-Content "C:\Program Files\New Relic\newrelic-infra\newrelic-infra.yml"` |
| 4 | Перезапустить службу | `Get-Service newrelic-infra` → `Running` |
| 5 | Проверить подключение к коллектору | В логах: `application connected` |
| 6 | Убедиться в отсутствии ошибок | `Select-String ... -Pattern "error"` → пусто |
| 7 | Проверить хост в UI GMonit | Инфраструктура → Хосты → `<<HOSTNAME>>` |

### 11\. Собираемые метрики

После успешного запуска агент автоматически собирает следующие типы данных:

| Тип метрик | Описание |
| --- | --- |
| **SystemSample** | CPU, память, swap, load average |
| **ProcessSample** | Процессы: PID, CPU%, MEM%, имя, аргументы (при `enable_process_metrics: true`) |
| **NetworkSample** | Сетевые интерфейсы: трафик, ошибки, пакеты |
| **StorageSample** | Диски: использование, IOPS, файловые системы |

> Дополнительные интеграции (мониторинг MSSQL, PostgreSQL, Docker и др.) настраиваются отдельно через файлы в `C:\Program Files\New Relic\newrelic-infra\integrations.d\`.
