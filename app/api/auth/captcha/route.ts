import { NextResponse } from 'next/server'
import { createPuzzle, PUZZLE_CONFIG } from '@/lib/captcha-puzzle'

export async function GET() {
  try {
    const { captchaId, backgroundImage, pieceImage } = await createPuzzle()
    return NextResponse.json({
      success: true,
      data: {
        captchaId,
        backgroundImage,
        pieceImage,
        config: {
          width: PUZZLE_CONFIG.width,
          height: PUZZLE_CONFIG.height,
          pieceWidth: PUZZLE_CONFIG.pieceWidth,
          pieceHeight: PUZZLE_CONFIG.pieceHeight,
          pieceY: PUZZLE_CONFIG.pieceY,
        },
      },
    })
  } catch (e) {
    console.error('Captcha error:', e)
    return NextResponse.json(
      { success: false, error: 'Не удалось создать капчу' },
      { status: 500 }
    )
  }
}
