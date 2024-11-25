# Анализ ошибок 502 на фронтенде и проблем с Elasticsearch на бэкенде

## Описание проблемы

В **7:55 по МСК** на фронтенде начали появляться ошибки со статусом **502**. Это может свидетельствовать о проблемах с Nginx, который не смог установить соединение с бэкендом и получить от него ответ.

![2_1.png](./screenshots/Screenshot_2_1.png)

На бэкенде эти ошибки могут быть связаны с взаимодействием с **Elasticsearch**, что подтверждает класс ошибки **`elasticsearch.exceptions.RequestError`** и время возникновения.

![2_2.png](./screenshots/Screenshot_2_2.png)

Ошибки взаимодействия с Elasticsearch возникали при работе транзакции **`Function/apps.store.rest.views:SearchAutoCompleteViewSet.list`**.

![2_3.png](./screenshots/Screenshot_2_3.png)

В результате наблюдалось увеличение работы класса **`EmailMultiAlternatives`** внутри модуля **`django.core.mail.message`**.

![2_4.png](./screenshots/Screenshot_2_4.png)

## Гипотеза

В **7:55** возникли ошибки на фронтенде со статусом **502**.

**Гипотеза**: проблема с Nginx, который не смог установить соединение с бэкендом и получить от него ответ.


На бэкенде эти ошибки могут быть связаны с взаимодействием с Elasticsearch, класс ошибки **`elasticsearch.exceptions.RequestError`**. По времени они совпадают с двумя очагами транзакции **`Function/apps.store.rest.views:SearchAutoCompleteViewSet.list`**.
