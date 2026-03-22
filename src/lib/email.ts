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

type EmailLayoutOptions = {
  title: string
  previewText?: string
  bodyHtml: string
}

export function buildEmailHtml({ title, previewText, bodyHtml }: EmailLayoutOptions): string {
  const safePreview = previewText || ''

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      /* Clients like Gmail ignore most CSS, поэтому минимальный набор + инлайны */
      body {
        margin: 0;
        padding: 0;
        background: #020617;
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }
      a {
        color: #38bdf8;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#020617;color:#e5e7eb;">
    <!-- preview text (скрытый) -->
    <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#020617;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${safePreview}
    </span>

    <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="background:#020617;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" border="0" cellPadding="0" cellSpacing="0" style="max-width:640px;background:linear-gradient(180deg,#0f172a,#020617);border-radius:24px;border:1px solid rgba(148,163,184,0.35);overflow:hidden;box-shadow:0 24px 80px rgba(15,23,42,0.9);">
            <tr>
              <td style="padding:20px 24px 12px 24px;border-bottom:1px solid rgba(148,163,184,0.3);">
                <table role="presentation" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" style="font-size:14px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#a5b4fc;">
                      НОВЫЙ ФОРМАТ ПУТЕШЕСТВИЙ
                    </td>
                    <td align="right" style="font-size:12px;color:#9ca3af;">
                      ${title}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#f9fafb;font-weight:600;">
                  ${title}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px 24px;font-size:14px;line-height:1.6;color:#e5e7eb;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 20px 24px;border-top:1px solid rgba(148,163,184,0.3);font-size:11px;line-height:1.5;color:#9ca3af;">
                Это письмо отправлено автоматически сервисом «Новый формат путешествий». Если вы не ожидали этого письма — просто проигнорируйте его.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

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
  const subject = 'Подтверждение email'
  const preview = 'Подтвердите адрес электронной почты, чтобы активировать доступ.'

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Вы указали этот адрес для входа в систему «Новый формат путешествий».
    </p>
    <p style="margin:0 0 16px 0;">
      Нажмите на кнопку ниже, чтобы подтвердить email и завершить регистрацию.
    </p>
    <p style="margin:0 0 20px 0;" align="center">
      <a href="${url}" style="display:inline-block;padding:10px 20px;border-radius:999px;background:#4f46e5;color:#f9fafb;font-size:14px;font-weight:600;text-decoration:none;">
        Подтвердить email
      </a>
    </p>
    <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
      Если кнопка не нажимается, скопируйте и вставьте ссылку в адресную строку браузера:
    </p>
    <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">
      <a href="${url}" style="color:#38bdf8;text-decoration:none;">${url}</a>
    </p>
  `

  const html = buildEmailHtml({ title: subject, previewText: preview, bodyHtml })

  await sendEmail(
    email,
    subject,
    `Перейдите по ссылке для подтверждения: ${url}`,
    html
  )
}

export async function sendPromoterIdEmail(email: string, promoterId: number): Promise<void> {
  const subject = 'Ваш ID промоутера'
  const preview = `Ваш уникальный промо‑ID: ${promoterId}`

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Для работы в системе вам назначен уникальный идентификатор промоутера:
    </p>
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#bef264;">
      ${promoterId}
    </p>
    <p style="margin:0 0 12px 0;">
      Используйте этот ID при входе в личный кабинет или сообщайте его менеджеру при продаже билетов за вас.
    </p>
  `

  const html = buildEmailHtml({ title: subject, previewText: preview, bodyHtml })

  await sendEmail(
    email,
    subject,
    `Ваш уникальный ID промоутера: ${promoterId}\n\nВы можете использовать его для входа в систему.`,
    html
  )
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`
  
  const subject = 'Восстановление пароля'
  const preview = 'Сбросьте пароль для входа в систему.'

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Поступил запрос на смену пароля для этого адреса электронной почты.
    </p>
    <p style="margin:0 0 16px 0;">
      Если это были вы, нажмите кнопку ниже и задайте новый пароль.
    </p>
    <p style="margin:0 0 20px 0;" align="center">
      <a href="${url}" style="display:inline-block;padding:10px 22px;border-radius:999px;background:#f97316;color:#0f172a;font-size:14px;font-weight:600;text-decoration:none;">
        Сбросить пароль
      </a>
    </p>
    <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
      Если вы не запрашивали смену пароля, просто проигнорируйте это письмо.
    </p>
  `

  const html = buildEmailHtml({ title: subject, previewText: preview, bodyHtml })

  await sendEmail(
    email,
    subject,
    `Перейдите по ссылке для восстановления пароля: ${url}`,
    html
  )
}

export async function sendTicketEmail(email: string, pdfUrl: string): Promise<void> {
  const subject = 'Ваш билет на экскурсию'
  const preview = 'Ваш электронный билет готов. Сохраните его перед поездкой.'

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Спасибо за покупку! Ваш электронный билет готов.
    </p>
    <p style="margin:0 0 16px 0;">
      Сохраните билет на телефон или распечатайте его, чтобы предъявить при посадке.
    </p>
    <p style="margin:0 0 20px 0;" align="center">
      <a href="${pdfUrl}" style="display:inline-block;padding:10px 24px;border-radius:999px;background:#22c55e;color:#022c22;font-size:14px;font-weight:600;text-decoration:none;">
        Скачать билет (PDF)
      </a>
    </p>
  `

  const html = buildEmailHtml({ title: subject, previewText: preview, bodyHtml })

  await sendEmail(
    email,
    subject,
    `Ваш билет готов. Скачайте его по ссылке: ${pdfUrl}`,
    html
  )
}

export async function sendNewLoginFromIpEmail(
  email: string,
  ip: string,
  userAgent?: string | null
): Promise<void> {
  const subject = 'Новый вход в систему'
  const preview = `Новый вход в систему с IP: ${ip}`
  const agentSafe = userAgent || 'Неизвестное устройство'

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">
      Мы зафиксировали новый вход в ваш аккаунт «Новый формат путешествий».
    </p>
    <p style="margin:0 0 8px 0;">
      <strong>IP:</strong> ${ip}<br/>
      <strong>Устройство/браузер:</strong> ${agentSafe}
    </p>
    <p style="margin:12px 0 0 0;font-size:12px;color:#fca5a5;">
      Если это были не вы, срочно смените пароль в настройках и свяжитесь с владельцем системы.
    </p>
  `

  const html = buildEmailHtml({ title: subject, previewText: preview, bodyHtml })

  await sendEmail(
    email,
    subject,
    `Обнаружен новый вход в систему с IP: ${ip}\nУстройство/браузер: ${agentSafe}`,
    html
  )
}
