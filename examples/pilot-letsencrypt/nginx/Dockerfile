# https://github.com/nginx/docker-nginx/issues/999

# Есть планы добавить этот модуль в поставку
# https://github.com/nginx/docker-nginx/pull/1007

# пока нет готового образа собрал сам:
# docker build . -t cr.yandex/crpih7d63vpcj5dfn8jj/nginx:1.29.3-alpine3.22-acme
# docker push cr.yandex/crpih7d63vpcj5dfn8jj/nginx:1.29.3-alpine3.22-acme

FROM nginx:1.29.3-alpine3.22

# тут 3.22 это версия alpine
# `--repository` должен быть синхронизирован с версией alpine из образа
RUN apk add nginx-module-acme --no-cache --repository=https://nginx.org/packages/mainline/alpine/v3.22/main
