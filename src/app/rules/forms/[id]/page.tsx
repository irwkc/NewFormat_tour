'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getBlankContent } from '../blank-content'
import { notFound } from 'next/navigation'

export default function RuleFormPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const content = getBlankContent(id)
  if (!content) notFound()

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Панель действий — скрывается при печати */}
      <div className="print:hidden bg-slate-800 text-white p-4 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/rules"
          className="text-white/80 hover:text-white text-sm"
        >
          ← К правилам продажи и возврата
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">
            Сохраните бланк в PDF через меню браузера: Печать → Сохранить как PDF
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
          >
            Печать / Сохранить как PDF
          </button>
        </div>
      </div>

      {/* Бланк — печатаемая область */}
      <div className="max-w-[210mm] mx-auto p-8 md:p-12 print:p-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-black">
          {content}
        </pre>
      </div>
    </div>
  )
}
