# Инструкция по деплою на сервер

## Требования

- Node.js 18+ 
- PostgreSQL 12+
- npm или yarn

## Шаги деплоя

### 1. Подключение к серверу

```bash
ssh user@your-server-ip
```

### 2. Установка зависимостей системы

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib

# Или установка Node.js через nvm (рекомендуется)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 3. Клонирование проекта

```bash
cd /var/www
git clone <your-repo-url> newformat_tour
cd newformat_tour
```

### 4. Настройка базы данных PostgreSQL

```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Создать базу данных и пользователя
CREATE DATABASE newformat_tour;
CREATE USER newformat_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE newformat_tour TO newformat_user;
\q
```

### 5. Настройка переменных окружения

```bash
# Скопировать пример файла
cp .env.example .env

# Отредактировать файл
nano .env
```

Установите следующие переменные:

```env
DATABASE_URL="postgresql://newformat_user:your_secure_password@localhost:5432/newformat_tour?schema=public"
JWT_SECRET="ваш-очень-длинный-случайный-секретный-ключ-для-jwt"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
SMTP_HOST="smtp.mail.ru"
SMTP_PORT="465"
SMTP_USER="your-email@mail.ru"
SMTP_PASS="your-password"
YOOKASSA_SHOP_ID="your-shop-id"
YOOKASSA_SECRET_KEY="your-secret-key"
```

### 6. Установка зависимостей и сборка

```bash
npm install
npx prisma generate
npx prisma migrate deploy
# Или если миграций нет: npx prisma db push
npm run build
```

### 7. Создание первого владельца

```bash
npm run create-owner
# Или тестового: npm run create-test-owner
```

### 8. Запуск приложения

#### Вариант 1: PM2 (рекомендуется)

```bash
# Установка PM2
npm install -g pm2

# Запуск приложения
pm2 start npm --name "newformat-tour" -- start

# Сохранение конфигурации PM2
pm2 save
pm2 startup
```

#### Вариант 2: systemd service

Создайте файл `/etc/systemd/system/newformat-tour.service`:

```ini
[Unit]
Description=NewFormat Tour Next.js App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/newformat_tour
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable newformat-tour
sudo systemctl start newformat-tour
```

### 9. Настройка Nginx (опционально, для проксирования)

Создайте файл `/etc/nginx/sites-available/newformat-tour`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/newformat-tour /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10. Настройка SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 11. Настройка папки для загрузок

```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

## Обновление приложения

```bash
cd /var/www/newformat_tour
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# Перезапуск (PM2)
pm2 restart newformat-tour

# Или (systemd)
sudo systemctl restart newformat-tour
```

## Мониторинг

### PM2
```bash
pm2 status
pm2 logs newformat-tour
pm2 monit
```

### systemd
```bash
sudo systemctl status newformat-tour
sudo journalctl -u newformat-tour -f
```

## Важные замечания

1. **Безопасность**: 
   - Измените JWT_SECRET на сложный случайный ключ
   - Используйте надежные пароли для базы данных
   - Настройте firewall

2. **Резервное копирование базы данных**:
   ```bash
   pg_dump -U newformat_user newformat_tour > backup.sql
   ```

3. **Логи**: Проверяйте логи регулярно для выявления ошибок

4. **Производительность**: Рассмотрите использование Redis для сессий и кэширования
