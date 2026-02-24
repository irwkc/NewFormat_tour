import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const PUZZLE_WIDTH = 300
const PUZZLE_HEIGHT = 150
const PIECE_WIDTH = 50
const PIECE_HEIGHT = 50
const PIECE_X_MIN = 50
const PIECE_X_MAX = PUZZLE_WIDTH - PIECE_WIDTH - 50
const PIECE_Y = Math.floor((PUZZLE_HEIGHT - PIECE_HEIGHT) / 2)
const TOLERANCE_PX = 6
const CAPTCHA_TTL_MS = 5 * 60 * 1000 // 5 min

const captchaStore = new Map<
  string,
  { correctX: number; expiresAt: number }
>()

function getLogoPath(): string {
  return path.join(process.cwd(), 'public', 'logo.png')
}

/** Создаёт изображение «дырки» (белый скруглённый прямоугольник) для наложения на фон */
function createHoleOverlay(): Promise<Buffer> {
  const svg = `<svg width="${PIECE_WIDTH}" height="${PIECE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${PIECE_WIDTH}" height="${PIECE_HEIGHT}" rx="10" ry="10" fill="white"/>
  </svg>`
  return sharp(Buffer.from(svg))
    .png()
    .toBuffer()
}

/**
 * Генерирует капчу-пазл на основе логотипа сайта.
 * Возвращает id капчи, правильную позицию X и два PNG в base64: фон с дыркой и отдельный фрагмент для перетаскивания.
 */
export async function createPuzzle(): Promise<{
  captchaId: string
  backgroundImage: string
  pieceImage: string
}> {
  const logoPath = getLogoPath()
  if (!fs.existsSync(logoPath)) {
    throw new Error('Logo not found')
  }

  const correctX =
    PIECE_X_MIN +
    Math.floor(Math.random() * (PIECE_X_MAX - PIECE_X_MIN + 1))

  const logoBuffer = await sharp(logoPath)
    .resize(PUZZLE_WIDTH, PUZZLE_HEIGHT, { fit: 'cover' })
    .png()
    .toBuffer()

  const holeOverlay = await createHoleOverlay()

  const backgroundPng = await sharp(logoBuffer)
    .composite([
      {
        input: holeOverlay,
        left: correctX,
        top: PIECE_Y,
      },
    ])
    .png()
    .toBuffer()

  const piecePng = await sharp(logoBuffer)
    .extract({
      left: correctX,
      top: PIECE_Y,
      width: PIECE_WIDTH,
      height: PIECE_HEIGHT,
    })
    .png()
    .toBuffer()

  const captchaId = crypto.randomUUID()
  captchaStore.set(captchaId, {
    correctX,
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
  })

  cleanupExpired()

  return {
    captchaId,
    backgroundImage: `data:image/png;base64,${backgroundPng.toString('base64')}`,
    pieceImage: `data:image/png;base64,${piecePng.toString('base64')}`,
  }
}

/** Проверяет ответ пользователя: позиция по X в пределах допуска */
export function verifyPuzzle(captchaId: string, userX: number): boolean {
  const entry = captchaStore.get(captchaId)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    captchaStore.delete(captchaId)
    return false
  }
  const ok = Math.abs(userX - entry.correctX) <= TOLERANCE_PX
  captchaStore.delete(captchaId)
  return ok
}

function cleanupExpired() {
  const now = Date.now()
  for (const [id, data] of captchaStore.entries()) {
    if (data.expiresAt < now) captchaStore.delete(id)
  }
}

export const PUZZLE_CONFIG = {
  width: PUZZLE_WIDTH,
  height: PUZZLE_HEIGHT,
  pieceWidth: PIECE_WIDTH,
  pieceHeight: PIECE_HEIGHT,
  pieceY: PIECE_Y,
} as const
