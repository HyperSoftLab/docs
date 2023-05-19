# Инструкция по включению браузерного мониторинга

1. Отредактировать файл `docker-compose.yml`:

```yaml
services:
  collector:
    environment:
      # ...
      # другие параметры
      
      # включен браузерный мониторинг для "catalog" и "shop frontend" 
      APPLICATIONS_WITH_BROWSER_INSTRUMENTATION: 'catalog,shop frontend'
      AGENT_ID_VERSION: 1

```

>`AGENT_ID_VERSION: 1` увеличить на единицу при изменении значения переменной `APPLICATIONS_WITH_BROWSER_INSTRUMENTATION: ''`, чтобы агенты увидели изменения.

> Имена добавляются через запятую. Пример: `APPLICATIONS_WITH_BROWSER_INSTRUMENTATION: 'catalog,shop frontend'`

2. Перезапустить коллектор 
- `docker compose up -d`
