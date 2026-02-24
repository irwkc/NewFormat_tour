import { NextResponse } from 'next/server'
import { Document, Packer, Paragraph } from 'docx'
import { getBlankContent } from '@/app/rules/forms/blank-content'

const FILENAMES: Record<string, string> = {
  '1': 'zaiavlenie-vozvrat-po-iniciative-posetitelya.docx',
  '2': 'zaiavlenie-vozvrat-v-svyazi-s-boleznu.docx',
  '3': 'zaiavlenie-vozvrat-v-svyazi-so-smertyu-chlena-semji.docx',
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

  const paragraphs = content
    .split(/\n/)
    .map((line) => new Paragraph({ text: line, spacing: { after: 80 } }))

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
