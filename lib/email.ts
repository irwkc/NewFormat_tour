import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mail.ru',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendConfirmationEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email/${token}`
  
  await sendEmail(
    email,
    'Подтверждение email',
    `Перейдите по ссылке для подтверждения: ${url}`,
    `<p>Перейдите по ссылке для подтверждения: <a href="${url}">${url}</a></p>`
  )
}

export async function sendPromoterIdEmail(email: string, promoterId: number): Promise<void> {
  await sendEmail(
    email,
    'Ваш ID промоутера',
    `Ваш уникальный ID промоутера: ${promoterId}\n\nВы можете использовать его для входа в систему.`,
    `<p>Ваш уникальный ID промоутера: <strong>${promoterId}</strong></p><p>Вы можете использовать его для входа в систему.</p>`
  )
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`
  
  await sendEmail(
    email,
    'Восстановление пароля',
    `Перейдите по ссылке для восстановления пароля: ${url}`,
    `<p>Перейдите по ссылке для восстановления пароля: <a href="${url}">${url}</a></p>`
  )
}

export async function sendTicketEmail(email: string, pdfUrl: string): Promise<void> {
  await sendEmail(
    email,
    'Ваш билет на экскурсию',
    `Ваш билет готов. Скачайте его по ссылке: ${pdfUrl}`,
    `<p>Ваш билет готов. <a href="${pdfUrl}">Скачать билет</a></p>`
  )
}
