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
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Проверяем, нет ли уже помощника
    const existingAssistant = await prisma.user.findFirst({
      where: {
        main_owner_id: payload.userId,
        role: 'owner_assistant',
      },
    });

    if (existingAssistant) {
      return NextResponse.json(
        { error: 'Помощник уже создан' },
        { status: 400 }
      );
    }

    // Получаем email владельца
    const owner = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });

    if (!owner || !owner.email) {
      return NextResponse.json(
        { error: 'У владельца должен быть email' },
        { status: 400 }
      );
    }

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);

    // Создаем помощника
    const assistant = await prisma.user.create({
      data: {
        email: owner.email, // Тот же email
        password_hash,
        role: 'owner_assistant',
        main_owner_id: payload.userId,
        email_confirmed: true, // Помощник наследует подтвержденный email
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Помощник успешно создан',
      assistant: {
        id: assistant.id,
        email: assistant.email,
      },
    });
  } catch (error: any) {
    console.error('Error creating assistant:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании помощника' },
      { status: 500 }
    );
  }
}
