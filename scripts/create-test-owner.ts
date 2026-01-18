import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Создание тестового владельца системы')
    console.log('=====================================\n')

    // Проверить, существует ли уже владелец
    const existingOwner = await prisma.user.findFirst({
      where: { role: 'owner' },
    })

    if (existingOwner) {
      console.log('⚠️  Владелец уже существует!')
      console.log(`Email: ${existingOwner.email}`)
      process.exit(0)
    }

    // Тестовые данные
    const email = 'admin@test.com'
    const password = 'admin123'

    // Хэшировать пароль
    const ownerPasswordHash = await bcrypt.hash(password, 10)

    // Создать владельца
    const owner = await prisma.user.create({
      data: {
        email,
        password_hash: ownerPasswordHash,
        role: 'owner',
        email_confirmed: true,
        is_active: true,
      },
    })

    // Помощник создается через ЛК владельца в разделе Настройки

    console.log('\n✅ Владелец создан успешно!')
    console.log(`Owner ID: ${owner.id}`)
    console.log('\n📝 Вы можете войти в систему используя:')
    console.log('═══════════════════════════════════════')
    console.log(`Email: ${email}`)
    console.log(`Пароль владельца: ${password}`)
    console.log('═══════════════════════════════════════')
    console.log('\n💡 Помощник можно создать через ЛК владельца в разделе Настройки\n')
  } catch (error) {
    console.error('❌ Ошибка при создании владельца:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()