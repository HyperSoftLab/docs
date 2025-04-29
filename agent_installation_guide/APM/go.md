# Установка APM-агента для Go

Для интеграции APM-агента в Go-приложение выполните следующие шаги:


### 1. **Загрузка и установка агента**

Установите пакет агента с помощью команды `go get`:

```bash
go get github.com/newrelic/go-agent/v3/newrelic
```


### 2. **Импорт пакета в приложение**

Добавьте следующий импорт в код вашего приложения:

```go
import "github.com/newrelic/go-agent/v3/newrelic"
```


### 3. **Инициализация агента**

Инициализируйте агент в функции `main()` или в блоке `init()` вашего приложения:

```go
app, err := newrelic.NewApplication(
    newrelic.ConfigAppName("MY_AWESOME_APP"),                   // название вашего приложения
    newrelic.ConfigLicense("0123456789-123456789-123456789-123456789"), // заглушка, не изменять
    newrelic.ConfigHost("gmonit-collector.<DOMAIN>.ru"),       // адрес коллектора GMonit
)

if err != nil {
    log.Fatal(err)
}
```


### 4. **Инструментация транзакций**

Используйте метод `newrelic.WrapHandleFunc` для автоматической инструментализации HTTP-хендлеров:

```go
http.HandleFunc(newrelic.WrapHandleFunc(app, "/users", usersHandler))
```

Для других транзакций используйте ручную инструментализацию:

```go
txn := app.StartTransaction("название транзакции")
defer txn.End()
```


### 5. **Компиляция и запуск приложения**

Соберите и запустите ваше Go-приложение:

```bash
go build -o myapp ./...
./myapp
```


### 6. **Проверка работы агента**

После запуска приложения убедитесь, что агент успешно подключился:
- Проверьте логи вашего приложения на наличие сообщений о подключении агента.
- В интерфейсе мониторинга GMonit появятся метрики вашего приложения.


### 7. **Дополнительная информация**

Для дополнительной информации по настройке агента ознакомьтесь с [официальной документацией New Relic](https://docs.newrelic.com/docs/apm/agents/go-agent/installation/install-new-relic-go/).