# Инструкция по разворачиванию GMonit-Lite в Yandex.Cloud
## Перед установкой
1. Добавить 2 DNS записи на 2 под-домена (1 для графаны, 1 для
   коллектора).

   Пример:
   A - [Address Record](https://en.wikipedia.org/wiki/List_of_DNS_record_types)
   ```
   gmonit.your-company.ru IN A <vm-ip-address>
   gmonit-collector.your-company.ru IN А <vm-ip-address>
   ```

## Установка
1. Залогиниться по SSH в виртуальную машину
```sh
ssh gmonit@<vm-ip-address>
```
2. Запросить у команды GMonit `ключ` для доступа к `docker-репозиторию`
и залогититься выполнив на хосте команду:
```sh
cat </path/to/key.json> | docker login \
  --username json_key \
  --password-stdin \
  cr.yandex
```
3. Зайти в каталог с GMonit
```sh
cd ~/gmonit-lite
```
4. Скопировать `.env.example` как `.env`
```sh
cp .env.example .env
```
5. Заполнить .env
6. Запустить GMonit
```sh
docker compose up -d
```
