/**
 * Генерирует app/icon.png и app/apple-icon.png из public/logo.png
 * Запуск: npx tsx scripts/generate-favicon.ts
 */
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const logoPath = path.join(process.cwd(), 'public', 'logo.png')
const iconPath = path.join(process.cwd(), 'app', 'icon.png')
const appleIconPath = path.join(process.cwd(), 'app', 'apple-icon.png')

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error('Не найден public/logo.png')
    process.exit(1)
  }

  await sharp(logoPath)
    .resize(32, 32)
    .png()
    .toFile(iconPath)
  console.log('Создан app/icon.png (32x32)')

  await sharp(logoPath)
    .resize(180, 180)
    .png()
    .toFile(appleIconPath)
  console.log('Создан app/apple-icon.png (180x180)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
