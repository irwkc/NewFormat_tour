import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'partner') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Проверяем, нет ли уже контролера
    const existingController = await prisma.user.findFirst({
      where: {
        main_partner_id: payload.userId,
        role: 'partner_controller',
      },
    });

    if (existingController) {
      return NextResponse.json(
        { error: 'Контролер уже создан' },
        { status: 400 }
      );
    }

    // Получаем email партнера
    const partner = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });

    if (!partner || !partner.email) {
      return NextResponse.json(
        { error: 'У партнера должен быть email' },
        { status: 400 }
      );
    }

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);

    // Создаем контролера
    const controller = await prisma.user.create({
      data: {
        email: partner.email, // Тот же email
        password_hash,
        role: 'partner_controller',
        main_partner_id: payload.userId,
        email_confirmed: true, // Контролер наследует подтвержденный email
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Контролер успешно создан',
      controller: {
        id: controller.id,
        email: controller.email,
      },
    });
  } catch (error: any) {
    console.error('Error creating controller:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании контролера' },
      { status: 500 }
    );
  }
}
