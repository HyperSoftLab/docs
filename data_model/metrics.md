# Метрики в Gmonit

Метрика представляет собой набор агрегированных значений, собранных за определённый временной интервал и имеющих уникальное имя. В системе GMonit используются минутные интервалы для агрегации данных. Основные типы метрик:

- **Агрегированные данные** — Например, количество событий за одну минуту или частота событий в минуту.
- **Числовое значение в момент времени** — например, текущая температура CPU или загрузка CPU.

Метрики легко собирать и хранить: в GMonit одна запись метрики в базе данных охватывает одну минуту, независимо от количества событий за этот период — будь то одно событие или тысяча.

Метрики хорошо подходят для анализа трендов и изменения общего состояния. Однако для детализированного анализа прошлых данных, уже агрегированных, может потребоваться информация из событий.

Собираемые метрики можно поделить на категории:
- **Метрики приложения**: включают количество обработанных запросов, длительность обработки, число ошибок, Apdex. Эти метрики собираются для всего приложения и для отдельных транзакций.
- **Метрики транзакций**: фиксируют длительность операций внутри каждой транзакции.

Важно различать: метрики о самих транзакциях относятся к метрикам приложения, тогда как метрики об операциях внутри транзакций — к метрикам транзакций.

## Структура хранения метрик

Данные метрик хранятся в следующих таблицах:
- `nr_metric_data_by_name_by_minute_v2` для агрегаций по метрикам приложения
- `nr_metric_data_by_scope_by_minute_v2` для агрегаций по метрикам транзакций
Структура данных в этих таблицах почти одинакова, но способы поиска по этим таблицам разные. Отличия поиска описаны в следующей секции.

Поля, которые необходимо указывать в каждом запросе:
| Колонка    | Описание                                                          |
|------------|-------------------------------------------------------------------|
| account_id | текущая организации, указывается с помощью макроса графаны $__org |
| language   | название платформы исполнения кода                                |
| app_name   | название приложения                                               |
| point      | дата и время с минутной точностью                                 |

Поля идентифицирующие метрику
| Колонка       | Описание                                                                                                                                                    |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| name          | Название метрики, есть у всех метрик. Для метрик транзакций поле `name` указывает название операции, чья длительность агрегируется в этой метрике.          |
| scope         | Для метрик транзакций также указывается `scope` обозначающий имя транзакции, в рамках которой выполняется эта операция. У метрик приложения это поле пустое.|

Дополнительная мета-информация
| Колонка       | Описание                                                                                                        |
|---------------|-----------------------------------------------------------------------------------------------------------------|
| app_id        |идентификатор приложения                                                                                         |
| host          |имя хоста                                                                                                        |
| display_host  |имя хоста, который может быть переопределен, используя переменную `NEW_RELIC_PROCESS_HOST_DISPLAY_NAME`          |
| pid           |идентификатор процесса на хосте                                                                                  |
| instances     |количество экземпляров приложения на одном хосте                                                                 |
| agent_version |версия new relic агента                                                                                          |
| labels        |позволяет отметить метрики определенного приложения собственной информацией, например билдом. Задается переменной `NEW_RELIC_LABELS`|

## Обращения к метрикам

Рассмотрим принципы обращения на примере:
```sql
select
  $__timeInterval(point) as time,
  MetricRPM($__interval_s, name = 'HttpDispatcher') as Throughput
from nr_metric_data_by_name_by_minute_v2
where
  $__timeFilter(point)
  and account_id = $__org
  and language = '$language'
  and app_name = '$app_name'
  and AppMetric(name = 'HttpDispatcher')
group by time
order by time with fill step $__interval_s
```

Для поиска метрик всегда необходимо указывать временной диапазон поиска, язык платформы и название приложения. Это обязательная часть запроса, которая обеспечивает производительность агрегации
```
where
  $__timeFilter(point)
  and account_id = $__org
  and language = '$language'
  and app_name = '$app_name'
```

Также для поиска метрик в таблице `nr_metric_data_by_name_by_minute_v2` всегда необходимо указывать `AppMetric(...)` или `TransactionMetric(...)`. В этом примере это:
```
  and AppMetric(name = 'HttpDispatcher')
```

Для поиска метрик в таблице `nr_metric_data_by_scope_by_minute_v2` всегда необходимо указывать `scope = ...`. Это будет рассмотрено в другом примере

Агрегация в этом примере это подсчет частоты HTTP запросов:
```
  MetricRPM($__interval_s, name = 'HttpDispatcher') as Throughput
```
Тут есть 2 важных момента: возможные имена метрик (`name`) и доступные агрегации.

Список доступных агрегаций представлен в виде пользовательских функций. 

### Пользовательские функции(UDF)

+ **MetricAverage** — среднее значение метрики за период
+ **MetricMax** —  максимальное значение метрики 
+ **MetricMin** —  минимальное значение метрики 
+ **MetricHits** —  количество замеров метрики за период, например количество HTTP запросов или количество замеров памяти/CPU.
  `MetricHits(name='HttpDispatcher')`, `MetricHits(name='CPU/User Time')` 
  `MetricSum(name='HttpDispatcher')`, `MetricSum(name='Memory/User Time')` 
+ **MetricRPM** — частота замеров метрики за указанный интервал времени
  `MetricRPM($__interval_s, name = 'HttpDispatcher')` 
+ **MetricSum** — сумма значений метрик за период. Более низкоуровневая агрегация, часто используемая в пропорциях, например суммарное время обработки HTTP запросов или суммарная используемая память. 
+ **MetricExсlusiveSum** — для метрик с вложенным разбиением сумма значений, включающих только текущий сегмент. Чаще всего используется для определения времени, занятого операцией внутри транзакции
  
  Для подсчета значений Apdex приложения или отдельной транзакции выделен специальный блок пользовательских функций:

+ **MetricApdex** — подсчитывает значение Apdex для всего приложения или транзакции
+ **MetricApdexSatisfied** — количество запросов, чье время заняло от 0 до T
+ **MetricApdexTolerated** — количество запросов, время которых было от T до 4T
+ **MetricApdexFrustrated** — количество запросов, время исполнения которых превысило 4T
   
  T - предел допустимого времени операции. По умолчанию составляет 0.5 секунд. Данный лимит можно изменить в настройках APM агента переменной `NEW_RELIC_APDEX_T`.
  
  Также существуют специальные функции для подсчета частоты запросов за интервал времени:
+ **MetricApdexSatisfiedRPM** —  частота satisfied запросов
+ **MetricApdexToleratedRPM** — частота tolerated запросов
+ **MetricApdexFrustratedRPM** — частота frustrated запросов
  
  Например, функция `MetricApdexSatisfiedRPM( $__interval_s, name = 'Apdex')` подсчитает частоту удовлетворенных запросов всего приложения за интервал времени, указанный в секундах.


## Примеры

В данном разделе представлены примеры использования макросов плагина и пользовательских функций для создания графиков, отображающих индекс и пропускную способность вашего приложения.

```sql
select
  $__timeInterval(point) as time,
  MetricApdex(name = 'Apdex') as Apdex
from nr_metric_data_by_name_by_minute_v2
where
  $__timeFilter(point)
  and AppMetric(name = 'Apdex')
group by time
order by time with fill
  step $__interval_s
```


```sql
with
  gMonitIsWebTxName('$language', name) as web_tx_time_metric
select
  gMonitHumanTxName('$language', name) as tx_name,
  MetricAverage(web_tx_time_metric) as avg
from nr_metric_data_by_name_by_minute_v2
where
  $__timeFilter(point)
  and account_id = $__org
  and language = '$language'
  and app_name = '$app_name'
  and AppMetric(web_tx_time_metric)
group by name
```