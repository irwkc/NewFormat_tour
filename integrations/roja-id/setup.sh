#!/bin/bash
# Скрипт установки Homebrew и Node.js для проекта аутентификации по лицу

set -e

echo "🚀 Настройка окружения для проекта аутентификации по лицу"
echo ""

# Проверка наличия Homebrew
if ! command -v brew >/dev/null 2>&1; then
    echo "📦 Установка Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Добавление Homebrew в PATH (для Apple Silicon)
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    echo "✅ Homebrew уже установлен"
    brew --version
fi

echo ""

# Проверка наличия Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "📦 Установка Node.js (включает npm)..."
    brew install node
else
    echo "✅ Node.js уже установлен"
    node --version
    npm --version
fi

echo ""
echo "📦 Установка зависимостей проекта..."
cd "$(dirname "$0")"
npm install

echo ""
echo "✅ Установка завершена!"
echo ""
echo "Для запуска сервера выполните:"
echo "  npm start"
echo ""
echo "Для разработки с автоперезагрузкой:"
echo "  npm run dev"
