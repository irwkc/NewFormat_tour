/**
 * Приводит тексты ошибок API и клиента к понятному русскому виду.
 * Сообщения уже на русском возвращаются без изменений.
 */
export function normalizeUserFacingMessage(raw: string | undefined | null): string {
  if (raw == null || String(raw).trim() === '') {
    return 'Произошла ошибка. Попробуйте позже.'
  }
  const s = String(raw).trim()

  const rules: [RegExp, string][] = [
    [/^(internal server error|internal server error\.)$/i, 'Внутренняя ошибка сервера. Попробуйте позже.'],
    [/internal server error/i, 'Внутренняя ошибка сервера. Попробуйте позже.'],
    [/^(bad request)$/i, 'Неверный запрос.'],
    [/^(unauthorized|401)$/i, 'Сессия истекла. Войдите снова.'],
    [/^(forbidden|403)$/i, 'Недостаточно прав для этого действия.'],
    [/^(not found|404)$/i, 'Не найдено.'],
    [/tour not found/i, 'Экскурсия не найдена.'],
    [/user not found/i, 'Пользователь не найден.'],
    [/sale not found/i, 'Продажа не найдена.'],
    [/ticket not found/i, 'Билет не найден.'],
    [/invalid (input|credentials|token)/i, 'Неверные данные или сессия истекла.'],
    [/network error|failed to fetch|load failed/i, 'Нет соединения с сервером. Проверьте интернет.'],
    [/timeout|timed out/i, 'Превышено время ожидания. Попробуйте снова.'],
  ]

  for (const [re, ru] of rules) {
    if (re.test(s)) return ru
  }

  // Одна строка целиком на латинице без пробелов — часто код ошибки
  if (/^[A-Z_]+$/.test(s) && s.length < 80) {
    return 'Произошла ошибка. Попробуйте позже.'
  }

  return s
}
