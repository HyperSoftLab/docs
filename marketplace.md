# Инструкция по разворачиванию GMonit-Lite в Yandex.Cloud
## Перед установкой
1. Добавить 2 DNS записи на 2 под-домена (1 для графаны, 1 для
   коллектора)

## Установка
1. Залогиниться по SSH в виртуальную машину
```sh
ssh gmonit@<vm-ip-address>
```
2. Зайти в каталог с GMonit
```sh
cd ~/gmonit-lite
```
3. Скопировать `.env.example` как `.env`
```sh
cp .env.example .env
```
4. Заполнить .env
5. Запустить GMonit
```sh
docker compose up -d
```
