# Метрики в Gmonit

Метрика представляет собой набор агрегированных значений, собранных за определённый временной интервал и имеющих уникальное имя. В системе GMonit используются минутные интервалы для агрегации данных. Например, одно из агрегированных значений — количество вызовов функции за минуту.

Каждая метрика идентифицируется комбинацией скоупа и имени. Пустой скоуп указывает на то, что метрика относится к приложению в целом, а не к конкретной транзакции. Для упрощения сейчас рассмотрим метрики с пустым скоупом. Например, метрика с параметрами `scope = '' и name = 'HttpDispatcher'` содержит данные о количестве и длительности входящих HTTP-запросов.

## Структура хранения данных

Данные метрик хранятся в следующих таблицах:

+ ` nr_metric_data_by_name_by_minute_v2`
+ ` nr_metric_data_by_scope_by_minute_v2`

Данные хранимые в этих таблицах идентичны, но для удобства поиска необходимых данных Primary Key у них разные.
Рассмотрим основные столбцы этих таблиц:

|Колонка             |Описание  |
|--------------------|----------|
|account_id          |  | 
|name                | имя метрики|                       
|point               | дата и время с минутной точностью|
|call_count          | |
|total_call_time     | |
|total_exclusive_time| |
|min_call_time       | |
|max_call_time       | |



## Пользовательские функции(UDF)
+ MetricHits
+ MetricSum
+ MetricMax
+ MetricMin
+ MetricRPM
+ MetricAverage
+ MetricApdex
+ MetricApdexSatisfied
+ MetricApdexTolerated
+ MetricApdexFrustrated
+ MetricApdexSatisfiedRPM
+ MetricApdexToleratedRPM
+ MetricApdexFrustratedRPM


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
select
  $__timeInterval(point) as time,
  MetricRPM($__interval_s, name = 'HttpDispatcher') as Throughput
from nr_metric_data_by_name_by_minute_v2
where
  $__timeFilter(point)
  and AppMetric(name in ('HttpDispatcher')
group by time
order by time with fill step $__interval_s

```
