import { NextResponse } from 'next/server'
import { getBlankContent } from '@/app/rules/forms/blank-content'

const FILENAMES: Record<string, string> = {
  '1': 'zaiavlenie-vozvrat-po-iniciative-posetitelya.html',
  '2': 'zaiavlenie-vozvrat-v-svyazi-s-boleznu.html',
  '3': 'zaiavlenie-vozvrat-v-svyazi-so-smertyu-chlena-semji.html',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id
  const content = getBlankContent(id)
  const filename = FILENAMES[id]

  if (!content || !filename) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Бланк заявления о возврате — Приложение № ${id}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 15mm; font-size: 12pt; line-height: 1.4; color: #000; }
    pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
    @media print { body { padding: 10mm; } }
  </style>
</head>
<body>
<pre>${escapeHtml(content)}</pre>
</body>
</html>`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
