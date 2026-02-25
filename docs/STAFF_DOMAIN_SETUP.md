# Домен staff.nf-travel.ru

## Что уже сделано на сервере

- Nginx: создан конфиг для `staff.nf-travel.ru`, проксирование на приложение (порт 3000).
- Сайт доступен по HTTP: `http://staff.nf-travel.ru` после настройки DNS.
- В `/var/www/newformat_tour/.env` выставлено `NEXT_PUBLIC_APP_URL=https://staff.nf-travel.ru` (при следующем деплое подставится в сборку).
- Cloudflare Turnstile: в `.env` добавлены `NEXT_PUBLIC_TURNSTILE_SITE_KEY` и `TURNSTILE_SECRET_KEY` (виджет на странице входа после следующего деплоя).
- Скрипт для включения SSL: `/root/ssl-staff.nf-travel.ru.sh` — запускать **после** появления A-записи в DNS.

## Cloudflare

1. Войти в [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Выбрать зону **nf-travel.ru**.
3. **DNS** → **Records** → **Add record**:
   - **Type:** A  
   - **Name:** `staff` (будет staff.nf-travel.ru)  
   - **IPv4 address:** `91.210.171.176`  
   - **Proxy status:** включён (оранжевое облако) или только DNS (серое) — оба варианта допустимы.  
   - **Save**.
4. Подождать 1–5 минут, проверить: `dig staff.nf-travel.ru` или открыть в браузере `http://staff.nf-travel.ru`.

## Включение HTTPS (Let's Encrypt)

После того как `staff.nf-travel.ru` резолвится в 91.210.171.176, на сервере выполнить:

```bash
ssh root@91.210.171.176
/root/ssl-staff.nf-travel.ru.sh
```

Скрипт получит сертификат и переведёт Nginx на HTTPS с редиректом с HTTP.

## Health check в GitHub Actions

В `.github/workflows/deploy.yml` проверка после деплоя идёт на `https://staff.nf-travel.ru` (или оставлен старый домен — при необходимости заменить в шаге Health check).

## Если домен на Cloudflare с Proxy (оранжевое облако)

- В Cloudflare: **SSL/TLS** → **Overview** → режим **Full** или **Full (strict)**.
- Origin-сертификат на сервере — Let's Encrypt (скрипт выше его запрашивает).
