import { buildEmailHtml } from '../lib/email'

describe('email templates', () => {
  it('buildEmailHtml включает заголовок и превью', () => {
    const html = buildEmailHtml({
      title: 'Тестовое письмо',
      previewText: 'Короткое превью',
      bodyHtml: '<p>Содержимое</p>',
    })

    expect(html).toContain('Тестовое письмо')
    expect(html).toContain('Короткое превью')
    expect(html).toContain('<p>Содержимое</p>')
  })

  it('buildEmailHtml безопасно обрабатывает пустой previewText', () => {
    const html = buildEmailHtml({
      title: 'Без превью',
      bodyHtml: '<p>Текст</p>',
    })

    expect(html).toContain('Без превью')
    expect(html).toContain('<p>Текст</p>')
  })
})

