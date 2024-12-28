# Установка APM-агента для Node.js

Для интеграции APM-агента New Relic в Node.js выполните следующие шаги:


### 1. Установка пакета New Relic

Установите агент через npm или Yarn:

```bash
# Через npm
npm install newrelic --save

# Через Yarn
yarn add newrelic
```

### 2. Копирование файла конфигурации

Скопируйте стандартный файл конфигурации агента в базовую папку вашего приложения:

```bash
cp ./node_modules/newrelic/newrelic.js ./<your-destination>
```

### 3. Настройка файла конфигурации

Откройте скопированный файл `newrelic.js` и добавьте или измените следующие параметры:

```javascript
exports.config = {
  app_name: ['My awesome application name. Not hostname'], // Название приложения
  license_key: '0123456789-123456789-123456789-123456789', // Ключ(заглушка, не меняем)
  host: 'gmonit-collector.<<DOMAIN>>.ru'                  // Домен коллектора
};
```


### 4. Запуск программы с модулем агента

Запустите ваше приложение, предварительно загрузив модуль APM-агента, используя флаг `-r` или `--require`:

```bash
node -r newrelic your-program.js
```

> **Примечание**: Если вы не можете контролировать запуск программы, загрузите модуль агента перед любым другим модулем в коде вашей программы:

```javascript
const newrelic = require('newrelic');
```

### 5. Настройка для исключения установки модуля Native Metrics

В стандартной поставке включён модуль Node.js VM, который использует `gyp` и требует установленного Python для сборки бинарных файлов. Если Python отсутствует на хосте, вы можете исключить установку модуля Native Metrics, определив переменную окружения:

```bash
export NR_NATIVE_METRICS_NO_DOWNLOAD=true
```

Подробнее о Node.js VM и связанных измерениях можно найти в [документации New Relic](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/extend-your-instrumentation/nodejs-vm-measurements/)


### Подробнее

Для более детальной информации о конфигурации агента и дополнительных настройках обратитесь к [официальной документации New Relic](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/)