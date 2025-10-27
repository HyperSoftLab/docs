# https://github.com/nginx/docker-nginx/issues/999

# тут 3.22 это версия alpine
# видимо `--repository` должен быть синхронизирован с текущей версией alpine
# это если мы обновим базовый образ
FROM nginx:1.29.2-alpine3.22

RUN apk add nginx-module-acme --no-cache --repository=https://nginx.org/packages/mainline/alpine/v3.22/main
