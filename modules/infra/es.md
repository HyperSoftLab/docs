# Мониторинг Elasticsearch

На дашбордах Elasticsearch отображается информация об имеющихся нодах и кластерах, поставленных на мониторинг. GMonit строит графики состояния по индексам и производительности (Indices и Perfomance), а так же JVM, heap memory, индексации и операциям слияния (merge). Они помогают отслеживать состояние системы и ее производительность.
На дашборде **Indices** располагаются графики:

Indexing Operations Failed: Количество неудачных операций индексирования. Неудачные операции индексирования могут быть вызваны различными причинами, такими как отсутствие прав доступа, ошибки в документе или внутренние ошибки Elasticsearch. Этот показатель помогает выявить проблемы с индексированием и принять меры для их устранения.

Number Indices: Количество индексов в кластере. Этот показатель отражает общее число индексов, созданных в кластере Elasticsearch. Он может быть полезен для понимания структуры данных и оценки нагрузки на кластер.

Memory Query Cache: Память, использованная кэшем запросов. Кэш запросов используется для хранения результатов часто выполняемых запросов, что позволяет сократить время их выполнения в будущем. Этот показатель помогает оценить эффективность кэширования и необходимость его оптимизации.

Indexing Waited Throttling: Время, проведенное в ожидании ограничения индексирования. Этот показатель указывает на время, в течение которого индексирующие процессы находились в режиме ожидания из-за ограничений, наложенных на индексирование. Это может быть связано с настройками кластера или чрезмерной нагрузкой на индексирование.

Query cache: Кэш запросов. Используется для хранения результатов часто выполняемых запросов, что позволяет сократить время их выполнения в будущем. Этот показатель помогает оценить эффективность кэширования и необходимость его оптимизации.

Recovery Ongoing Shard Source: Текущий статус восстановления разделов источника. Этот показатель отражает текущий статус восстановления разделов источника данных. Он может быть полезен для понимания состояния кластера и необходимости вмешательства для обеспечения бесперебойной работы.

Recovery Ongoing Shard Target: Текущий статус восстановления разделов целевого. Этот показатель отражает текущий статус восстановления разделов целевого узла кластера. Он может быть полезен для понимания состояния кластера и необходимости вмешательства для обеспечения бесперебойной работы.

Recovery Waited Throttling: Время, проведенное в ожидании ограничения восстановления. Этот показатель указывает на время, в течение которого процессы восстановления находились в режиме ожидания из-за ограничений, наложенных на восстановление. Это может быть связано с настройками кластера или чрезмерной нагрузкой на восстановление.

Segments Index Shard: Разделы индекса разделов. Этот показатель отражает количество и размер разделов индекса разделов в кластере. Он может быть полезен для понимания структуры данных и оценки нагрузки на кластер.

Request cache: Кэш запросов. Кэш запросов используется для хранения результатов часто выполняемых запросов, что позволяет сократить время их выполнения в будущем. Этот показатель помогает оценить эффективность кэширования и необходимость его оптимизации.

Memory Used метрики: Использование памяти. Этот показатель отражает объем памяти, используемой Elasticsearch. Он может быть полезен для оценки нагрузки на оперативную память и необходимости ее увеличения или оптимизации.

Translog Operations (MB): Объем операций в журнале транзакций. Этот показатель отражает объем данных, записанных в журнал транзакций. Он может быть полезен для оценки нагрузки на журнал транзакций и необходимости его оптимизации.

**Метрики производительности:**

Heap memory usage (MB): Elasticsearch использует JVM (Java Virtual Machine), и память Heap — это область, выделенная JVM для выполнения операций, таких как индексация, кэширование и запросы.

File System: показывает состояние файловой системы узла Elasticsearch, включая использование дискового пространства, чтение и запись на диск.

Transport Connections opened: показывает количество открытых транспортных соединений. Транспортный уровень в Elasticsearch используется для связи между узлами в кластере.

Transport Packets: показывает объем переданных данных (пакетов) по транспортному уровню. Помогает отслеживать объем переданных данных по сети между узлами кластера.

Queries: количество запросов, которые обрабатываются или были обработаны узлом Elasticsearch

Refreshes time: время, затраченное на обновление индекса (refresh) — это процесс, когда новые документы становятся доступными для поиска.

**Threadpool:**
Elasticsearch использует пулы потоков для управления выполнением различных задач (например, запросы, индексирование и репликация). Ниже — описание метрик, связанных с пулом потоков:

Fetch shard started: количество задач, которые начали процесс fetch shard (процесс получения данных шардов). Эта операция важна для репликации и восстановления данных.

Fetch shard store: количество задач в пуле потоков для получения данных шардов из хранилища.

Flush: количество операций flush, выполняемых узлом. Flush — это процесс записи данных с диска на постоянное хранилище, который помогает поддерживать консистентность данных.

Snapshot: количество активных задач, связанных с созданием snapshot (снимка) индекса.

Force merge: принудительное объединение сегментов индекса для уменьшения их числа. Это помогает оптимизировать хранение и производительность поиска.