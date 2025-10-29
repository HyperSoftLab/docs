# https://github.com/nginx/docker-nginx/issues/999

# Есть планы добавить этот модуль в поставку
# https://github.com/nginx/docker-nginx/pull/1007

# тут 3.22 это версия alpine
# видимо `--repository` должен быть синхронизирован с текущей версией alpine
# это если мы обновим базовый образ
FROM nginx:1.29.3-alpine3.22

RUN apk add nginx-module-acme --no-cache --repository=https://nginx.org/packages/mainline/alpine/v3.22/main
