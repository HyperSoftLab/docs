# Логи в GMonit

Логи — это системные сообщения, которые помогают понять активность системы и диагностировать возможные проблемы.

Сбор логов осуществляется в рамках распределенной трассировки. Если ваше приложение использует библиотеки логирования, которые поддерживают автоинструментацию агентами NewRelic, то логи в контексте трейса будут автоматически собраны и доступны для просмотра на экране анализа трейса.

## Поддерживаемые библиотеки логирования

Библиотеки зависят от языка программирования тк там разные агенты

И самый веарный вариант это пискать покрыта ли ваша библиотека автоинструментацией в репе агента. Имейте ввиду, что там также покрытие не только про логирование, но в целом, если библиотека логирования есть в списке автоинструментации, то скорее всего она покрыта автоинструментацией логировния
 
java https://github.com/newrelic/newrelic-java-agent/tree/main/instrumentation
python https://github.com/newrelic/newrelic-python-agent/tree/main/newrelic/hooks
php https://github.com/newrelic/newrelic-php-agent/tree/main/agent
go https://github.com/newrelic/go-agent/tree/master/v3/integrations

dot net core dot net framework 


в node js надо убедиться https://github.com/newrelic/node-newrelic/tree/main/lib
и в руби чото удивительное, похоже по какой-то крутой другой схеме работает https://github.com/newrelic/newrelic-ruby-agent/tree/dev/lib/new_relic/agent
