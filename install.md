# Инструкция по разворачиванию GMonit

## Разворачивание GMonit через Docker Compose
С помощью [Docker Compose](https://docs.docker.com/compose/) можно просто и удобно разворачивать, настраивать и обновлять GMonit в рамках одного хоста.

Шаги установки:

1. [Установить Docker](https://docs.docker.com/engine/install/)

2. [Установить Docker Compose Plugin](https://docs.docker.com/compose/install/)

>Чтобы избежать постоянного использования команды sudo, вы можете добавить пользователя в группу docker с помощью следующей команды:

```
sudo usermod -aG docker user
```

3. Запросить у команды GMonit `ключ` для доступа к `docker-репозиторию` и залогититься выполнив на хосте команду:

```bash
cat key.json | docker login \
  --username json_key \
  --password-stdin \
  cr.yandex
```
4. Скачать репозиторий с шаблонами по [ссылке](https://github.com/HyperSoftLab/docs/archive/refs/heads/master.zip) или при помощи [Git Clone](https://github.com/HyperSoftLab/docs.git "Перейти по ссылке").

5. Выложить папку `examples` в дериктории `home/user`.

6. Для удобства, мы подготовили два шаблона: 
>`Pilot` - использует самоподписанный сертификат  
>`Pilot-letsencrypt` - требует подтверждения доменного имени
7. Запросить у команды GMonit актуальный `лицензионный ключ`.

8. В файле `.env.example` заполнить необходимые значения.
<details><summary>Для запуска шаблона "Pilot" потребуется:</summary>

>- Заполнить`LICENSE_KEY` и `SECRET_TOKEN`
>- Обновление файла `/etc/hosts` на устройстве, чтобы добавить новые домены и соответствующие им IP-адреса
>- Выпустить новый самоподписанный сертификат для новых доменов и заменить существующие сертификаты в директории `/gmonit/ssl`
>- Переконфигурировать DNS, чтобы перенаправить новые домены на соответствующие IP-адреса
</details>

<details><summary>Для запуска шаблона "Pilot-letsencrypt" потребуется:</summary>

>- Заполнить `LICENSE_KEY` и `SECRET_TOKEN`
>- Все URL вида `*.company.ru` заменить на реальные адреса для Grafana и коллектора
</details>

9. Выполнить команду:
```
docker compose up —wait
```
10. Введите доменное имя в браузер и убедитесь, что пользовательский интерфейс `GMonit` работает.