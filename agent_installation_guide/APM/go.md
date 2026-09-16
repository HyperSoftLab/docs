# Установка APM-агента для Go

Для интеграции APM-агента в Go-приложение выполните следующие шаги:

Вы получили архив `go-agent-offline.tar.gz`.

### 0\. Предварительные требования

*   **Go 1.24+** установлен. Проверьте:
    
    ```
    go version
    # go version go1.24.1 linux/amd64
    ```
    
    ```
    sudo tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz
    export PATH=/usr/local/go/bin:$PATH
    echo 'export PATH=/usr/local/go/bin:$PATH' >> ~/.bashrc
    go version
    ```
    
*   Сетевой доступ от сервера до коллектора GMONIT по порту **443 (HTTPS)**. Проверьте:
    
    ```
    curl -sk https://gmonit-collector.<<DOMAIN>>/health
    ```
    
    `ok`.
    

### 1\. Распаковка

Перенесите архив на целевой сервер (SCP/SFTP):

```
tar -xzf go-agent-offline.tar.gz
cd go-agent-bundle
```

### Вариант А: Использование готового бинарника

Если в архиве есть скомпилированный бинарник `go-apm-test`:

```
chmod +x go-apm-test
./go-apm-test
```

> **Примечание:** Бинарник уже содержит все зависимости и не требует Go на целевом сервере. Однако адрес коллектора и имя приложения **зашиты в бинарник при сборке** и не могут быть изменены без пересборки.

### Вариант Б: Сборка из исходников (с vendor)

Если нужно изменить конфигурацию (адрес коллектора, имя приложения):

**2\. Настройка конфигурации**

Откройте `src/main.go` и измените:

```
// Имя приложения (отображается в UI GMONIT)
newrelic.ConfigAppName("My-Go-App"),

// Адрес коллектора GMONIT
func(cfg *newrelic.Config) {
    cfg.Host = "gmonit-collector.<<DOMAIN>>"
},
```

Замените `<<DOMAIN>>` на актуальный домен коллектора и `My-Go-App` на имя вашего приложения.

**3\. Сборка**

```
cd src
CGO_ENABLED=0 go build -mod=vendor -o go-apm-test .
```

> **Важно:** Флаг `-mod=vendor` указывает Go использовать локальную директорию `vendor/` вместо загрузки из интернета.

**4\. Запуск**

```
./go-apm-test
```

Для запуска в фоне:

```
nohup ./go-apm-test > app.log 2>&1 &
```

### 5\. Проверка

**Проверка приложения:**

```
curl http://localhost:8085/
# Hello from Go APM Test App!

curl http://localhost:8085/api/data
# {"framework":"net/http","language":"go",...}
```

**Проверка агента (в stdout/логах):**

```
grep -i "gmonit\|connected" app.log
```

**Критерии успеха:**

1.  В логах есть `application connected`.
2.  В логах есть `~~~~ GMonit APM ~~~~`.
3.  Нет ошибок SSL или соединения с коллектором.

Ожидаемый вывод:

```
{"level":"info","msg":"application connected","context":{"app":"My-Go-App","run":"..."}}
{"level":"info","msg":"collector message","context":{"msg":"~~~~ GMonit APM ~~~~"}}
```

**Типичные ошибки и решения:**

| Ошибка в логах | Причина | Решение |
| --- | --- | --- |
| `cannot find package` / `go: module lookup disabled` | Нет `vendor/` или не указан `-mod=vendor` | Собирать с флагом `-mod=vendor` |
| `ConnectException: Connection refused` | Нет сетевого доступа до коллектора (порт 443) | Проверить firewall: `curl -sk https://gmonit-collector.<<DOMAIN>>/health` |
| `x509: certificate signed by unknown authority` | Самоподписанный сертификат коллектора | Добавить CA в системное хранилище или настроить `cfg.Transport` |
| `go version go1.22...` + ошибки компиляции | Go < 1.24 | Обновить Go до 1.24+: `sudo tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz` |
| `ConfigHost is not defined` | Попытка использовать несуществующую функцию | Использовать `func(cfg *newrelic.Config) { cfg.Host = "..." }` |
| `cannot use log.Default() as io.Writer` | `ConfigInfoLogger` ожидает `io.Writer` | Использовать `os.Stdout` или `os.Stderr` |
| Docker: `x509: certificate signed by unknown authority` | Alpine без ca-certificates | Добавить `RUN apk add --no-cache ca-certificates` в Dockerfile |

* * *

## Часть 3: Инструментация существующего приложения

Если у вас уже есть Go-приложение и нужно добавить мониторинг GMONIT:

### 1\. Добавление зависимости (на машине с интернетом)

```
go get github.com/newrelic/go-agent/v3/newrelic
go mod vendor
```

### 2\. Импорт пакета

В файле с `main()` добавьте:

```
import "github.com/newrelic/go-agent/v3/newrelic"
```

### 3\. Инициализация агента

В начале `main()`:

```
app, err := newrelic.NewApplication(
    newrelic.ConfigAppName("My-App-Name"),
    newrelic.ConfigLicense("0123456789012345678901234567890123456789"),
    func(cfg *newrelic.Config) {
        cfg.Host = "gmonit-collector.<<DOMAIN>>"
    },
)
if err != nil {
    log.Fatal(err)
}
```

### 4\. Инструментация HTTP-хендлеров

Замените:

```
http.HandleFunc("/path", myHandler)
```

На:

```
http.HandleFunc(newrelic.WrapHandleFunc(app, "/path", myHandler))
```

### 5\. Инструментация произвольных операций

Для отслеживания не-HTTP операций (фоновые задачи, вызовы БД и т.д.):

```
txn := app.StartTransaction("my-operation")
defer txn.End()
// ... ваш код ...
```

### 6\. Вендоринг и пересборка

```
go mod tidy
go mod vendor
CGO_ENABLED=0 go build -mod=vendor -o myapp .
```

* * *

## Часть 4: Docker

### Вариант А: Загрузка готового образа

Если в архиве есть готовый Docker-образ (`go-apm.tar`):

```
docker load -i go-apm.tar
docker run -d --name go-apm-app -p 8085:8085 --restart unless-stopped go-apm:latest
```

### Вариант Б: Сборка из vendor-исходников

Загрузите базовые образы (если нет):

```
docker load -i golang-1.24.tar
docker load -i alpine-3.20.tar
```

1.  Скорректируйте `main.go` (host, app\_name) как описано в Части 2, шаг 2.
    
2.  Соберите и запустите:
    
    ```
    cd src
    docker compose build
    docker compose up -d
    ```
    
3.  Проверьте:
    
    ```
    curl http://localhost:8085/
    # Hello from Go APM Test App!
    
    docker compose logs | grep -i "gmonit\|connected"
    ```
    

Ожидаемый вывод:

```
{"level":"info","msg":"application connected","context":{"app":"My-Go-App",...}}
{"level":"info","msg":"collector message","context":{"msg":"~~~~ GMonit APM ~~~~"}}
```

1.  Остановка:
    
    ```
    docker compose down
    ```
    

> **Важно:**`ca-certificates` обязателен в runtime-образе (Alpine) — без него TLS-подключение к коллектору GMONIT не установится.
> 
> **Важно:**`CGO_ENABLED=0` — обязательно для сборки статического бинарника, который будет работать в Alpine.

* * *

## Часть 5: Контрольный чек-лист

| Шаг | Действие | Проверка |
| --- | --- | --- |
| 1   | Распаковать архив | `ls src/vendor/` — зависимости на месте |
| 2   | Установить Go 1.24+ (если нужно) | `go version` |
| 3   | Настроить `main.go` (host, app\_name) | `grep cfg.Host src/main.go` |
| 4   | Собрать бинарник | `go build -mod=vendor -o go-apm-test .` |
| 5   | Запустить приложение | `curl http://localhost:8085/` |
| 6   | Проверить подключение к коллектору | `grep "GMonit APM" app.log` |
| 7   | Проверить приложение в UI GMONIT | UI → APM → приложение |

* * *

## Часть 6: Отчёт о валидации

### Среда тестирования

| Параметр | Значение |
| --- | --- |
| Сервер | Yandex Cloud VM (158.160.94.195), 8 CPU, 16 GB RAM |
| ОС  | Ubuntu 24.04 LTS |
| Go  | 1.24.1 |
| APM-агент | go-agent/v3 v3.42.0 |
| Коллектор | collector.demo.gmonit.ru (GMONIT v4-6227) |
| Docker | 29.1.2 |
| Docker Compose | v5.0.0 |

### Результаты

| Сценарий | Статус | Имя приложения | Примечания |
| --- | --- | --- | --- |
| Bare-metal | OK  | Go-NetHTTP-Test | `application connected`, `~~~~ GMonit APM ~~~~` |
| Docker | OK  | Go-NetHTTP-Test | `application connected`, `~~~~ GMonit APM ~~~~` |

### Найденные проблемы и решения

| Проблема | Описание | Решение |
| --- | --- | --- |
| Go 1.22 не поддерживается | go-agent v3.42.0 требует Go >= 1.24 | Обновить Go до 1.24+ |
| `newrelic.ConfigHost()` не существует | В документации GMONIT указан `ConfigHost`, но такой функции нет в API | Использовать `func(cfg *newrelic.Config) { cfg.Host = "..." }` |
| `ConfigInfoLogger` принимает `io.Writer` | В документации GMONIT указан `log.Default()`, но `*log.Logger` не реализует `io.Writer` | Использовать `os.Stdout` или `os.Stderr` |
| Docker: нет ca-certificates | Alpine без ca-certificates не может установить TLS-соединение | Добавить `apk add --no-cache ca-certificates` в Dockerfile |
| Docker: `CGO_ENABLED=0` обязателен | Динамический бинарник не работает в Alpine | Собирать с `CGO_ENABLED=0` |

### Вывод

APM-агент Go (go-agent/v3 v3.42.0) корректно встраивается в приложение и подключается к коллектору GMONIT в обоих сценариях. Ключевые нюансы для оффлайн-установки: зависимости подготавливаются через `go mod vendor` на машине с интернетом, на целевом сервере сборка выполняется с флагом `-mod=vendor`. Требуется Go 1.24+, адрес коллектора задаётся через `cfg.Host` (не через `ConfigHost`), для Docker обязателен пакет `ca-certificates`.
