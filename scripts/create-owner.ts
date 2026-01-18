import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function main() {
  try {
    console.log('Создание первого владельца системы')
    console.log('=====================================\n')

    const email = await question('Email владельца: ')
    const password = await question('Пароль владельца: ')
    // Помощник создается через ЛК владельца
    // const assistantPassword = await question('Пароль помощника владельца: ')

    // Проверить, существует ли уже владелец
    const existingOwner = await prisma.user.findFirst({
      where: { role: 'owner' },
    })

    if (existingOwner) {
      console.log('Владелец уже существует!')
      process.exit(1)
    }

    // Хэшировать пароли
    const ownerPasswordHash = await bcrypt.hash(password, 10)
    // Помощник создается через ЛК владельца
    // const assistantPasswordHash = await bcrypt.hash(assistantPassword, 10)

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
    console.log('\nВы можете войти в систему используя:')
    console.log(`Email: ${email}`)
    console.log(`Пароль владельца: ${password}`)
    console.log('\n💡 Помощник можно создать через ЛК владельца в разделе Настройки')
  } catch (error) {
    console.error('Ошибка при создании владельца:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    rl.close()
  }
}

main()
