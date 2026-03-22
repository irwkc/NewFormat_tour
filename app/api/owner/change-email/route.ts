import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { new_email } = await request.json();

    if (!new_email || !new_email.includes('@')) {
      return NextResponse.json(
        { error: 'Некорректный email' },
        { status: 400 }
      );
    }

    // Проверяем, не занят ли email
    const emailExists = await prisma.user.findUnique({
      where: { email: new_email },
    });

    if (emailExists) {
      return NextResponse.json(
        { error: 'Email уже используется' },
        { status: 400 }
      );
    }

    // Генерируем токен подтверждения
    const emailConfirmationToken = crypto.randomBytes(32).toString('hex');

    // Обновляем email и токен подтверждения
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        email: new_email,
        email_confirmed: false,
        email_confirmation_token: emailConfirmationToken,
      },
    });

    // Отправляем письмо для подтверждения
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.mail.ru',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const confirmationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/verify-email/${emailConfirmationToken}`;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: new_email,
        subject: 'Подтверждение нового email',
        html: `
          <h2>Подтверждение нового email</h2>
          <p>Для подтверждения нового email перейдите по ссылке:</p>
          <a href="${confirmationUrl}">${confirmationUrl}</a>
          <p>Если вы не запрашивали изменение email, проигнорируйте это письмо.</p>
        `,
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Не прерываем процесс, если письмо не отправилось
    }

    return NextResponse.json({
      success: true,
      message: 'Email успешно изменен. Проверьте новую почту для подтверждения.',
    });
  } catch (error: any) {
    console.error('Error changing owner email:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении email' },
      { status: 500 }
    );
  }
}
