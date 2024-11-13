# Логи в GMonit

Логи — это системные сообщения, которые помогают понять активность системы и диагностировать возможные проблемы.

Сбор логов осуществляется в рамках распределенной трассировки. Если ваше приложение использует библиотеки логирования, которые поддерживают автоинструментацию агентами NewRelic, то логи в контексте трейса будут автоматически собраны и доступны для просмотра на экране анализа трейса.

## Поддерживаемые библиотеки логирования

Поддержка библиотек определяется агентами NewRelic. Самый надежный способ определить, поддерживается ли ваша библиотека автоинструментацией, — это проверить репозиторий агента на наличие вашей библиотеки в списке поддерживаемых.

Важно отметить, что покрытие автоинструментацией может быть не только в отношении логирования. Тем не менее, если библиотека логирования присутствует в списке автоинструментированных библиотек, то, вероятнее всего, она поддерживает и автоинструментацию логирования:
 
 - [Java](https://github.com/newrelic/newrelic-java-agent/tree/main/instrumentation)
 - [Python](https://github.com/newrelic/newrelic-python-agent/tree/main/newrelic/hooks)
 - [PHP](https://github.com/newrelic/newrelic-php-agent/tree/main/agent)
 - [Go](https://github.com/newrelic/go-agent/tree/master/v3/integrations)
 - [.NET](https://github.com/newrelic/newrelic-dotnet-agent/blob/main/src/Agent/NewRelic/Agent/Extensions/NewRelic.Agent.Extensions/Logging/LogProviders.cs#L15)
 - [Ruby](https://github.com/newrelic/newrelic-ruby-agent/tree/dev/lib/new_relic/agent/instrumentation)
 - [NodeJS](https://github.com/newrelic/node-newrelic/tree/main/lib/instrumentation)
