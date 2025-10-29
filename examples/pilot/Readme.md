# Известные проблемы

## nginx после обновления gmonit перестает проксировать запросы

Это происходит из-за того, что у контейнера меняется ip адрес,
а nginx закэшировал его.

Решение:

```
http {
    resolver 127.0.0.11 ipv6=off valid=5s;
    #        ^^^^^^^^^^ dns от docker
    #                   ^^^^^^^^ нужно выключить, чтобы резолвился let's encrypt

    upstream collector {
        zone collector 64k; # нужно для `resolve`
        server collector:8080 resolve;
        #                     ^^^^^^^ будет обновлять ip адрес контейнера
        keepalive 128;
    }
}
```
