# OpenSSL

https://devopscube.com/create-self-signed-certificates-openssl/

```bash
openssl req -x509 \
            -sha256 -days 35600 \
            -nodes \
            -newkey rsa:2048 \
            -subj "/CN=ca.example" \
            -keyout rootCA.key -out rootCA.crt

openssl genrsa -out server.key 2048

openssl req -new -key server.key -out server.csr -config csr.conf

openssl x509 -req \
    -in server.csr \
    -CA rootCA.crt -CAkey rootCA.key \
    -CAcreateserial -out server.crt \
    -days 36500 \
    -sha256 -extfile cert.conf
```

# mkcert

Вместо OpenSSL вы можете воспользоваться [mkcert](https://github.com/FiloSottile/mkcert).
