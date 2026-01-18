# Настройка авто-деплоя через GitHub Actions

## Что уже сделано:

✅ Проект залит на GitHub: `git@github.com:irwkc/NewFormat_tour.git`
✅ Создан GitHub Actions workflow: `.github/workflows/deploy.yml`

## Что нужно настроить на GitHub:

### 1. Добавить SSH ключ в Secrets

1. Перейдите на страницу репозитория: https://github.com/irwkc/NewFormat_tour
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Добавьте:
   - **Name**: `SSH_PRIVATE_KEY`
   - **Value**: приватный SSH ключ для доступа к серверу 91.210.171.176

### 2. Как получить SSH ключ:

Если у вас нет SSH ключа для сервера, создайте его:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
```

Затем добавьте публичный ключ на сервер:

```bash
ssh-copy-id -i ~/.ssh/github_deploy.pub root@91.210.171.176
```

И добавьте приватный ключ (`~/.ssh/github_deploy`) в GitHub Secrets.

### 3. Настройка сервера для Git:

На сервере нужно инициализировать git репозиторий (если еще не сделано):

```bash
ssh root@91.210.171.176
cd /var/www/newformat_tour
git init
git remote add origin git@github.com:irwkc/NewFormat_tour.git
```

### 4. Автоматический деплой:

После настройки Secrets, каждый push в ветку `main` будет автоматически:
- Подключаться к серверу
- Получать последние изменения из Git
- Устанавливать зависимости
- Генерировать Prisma Client
- Применять миграции БД
- Пересобирать проект
- Перезапускать приложение через PM2

### 5. Ручной запуск деплоя:

Можно запустить деплой вручную через GitHub Actions:
1. Перейдите в **Actions** на странице репозитория
2. Выберите workflow **Deploy to Production**
3. Нажмите **Run workflow**

## Примечания:

- Убедитесь, что на сервере установлен Git
- Проверьте права доступа к файлам в `/var/www/newformat_tour`
- PM2 должен быть настроен для автоматического запуска при перезагрузке сервера
