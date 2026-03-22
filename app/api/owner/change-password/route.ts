import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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

    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Текущий и новый пароль обязательны' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Получаем владельца
    const owner = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { password_hash: true },
    });

    if (!owner) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(current_password, owner.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Неверный текущий пароль' },
        { status: 400 }
      );
    }

    // Хэшируем новый пароль
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        password_hash: newPasswordHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменен',
    });
  } catch (error: any) {
    console.error('Error changing owner password:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении пароля' },
      { status: 500 }
    );
  }
}
