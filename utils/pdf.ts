import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { generateQRCode } from './qr'

export async function generateTicketPDF(ticket: any): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tickets-pdf')
      await fs.promises.mkdir(uploadDir, { recursive: true })
      
      // Использовать правильный ID билета для имени файла
      const ticketId = ticket.id.replace('temp-', '')
      const filename = `ticket-${ticketId}.pdf`
      const filepath = path.join(uploadDir, filename)
      
      // Если файл уже существует, удалить старый
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }
      
      const stream = fs.createWriteStream(filepath)

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      })

      doc.pipe(stream)

      // Логотип (если есть)
      const logoPath = path.join(process.cwd(), 'public', 'logo.png')
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 100 })
      }

      // Заголовок
      doc.fontSize(24).text('БИЛЕТ НА ЭКСКУРСИЮ', 50, 170, { align: 'center' })

      // Информация об экскурсии
      doc.fontSize(16).text(`Компания: ${ticket.sale.tour.company}`, 50, 250)
      doc.text(`Рейс: ${ticket.sale.tour.flight_number}`, 50, 280)
      doc.text(`Дата: ${new Date(ticket.sale.tour.date).toLocaleDateString('ru-RU')}`, 50, 310)
      doc.text(`Время отправления: ${new Date(ticket.sale.tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`, 50, 340)

      // Информация о билете
      doc.fontSize(14).text('Детали билета:', 50, 390)
      doc.text(`Взрослых мест: ${ticket.adult_count}`, 70, 420)
      if (ticket.child_count > 0) {
        doc.text(`Детских мест: ${ticket.child_count}`, 70, 450)
      }

      // Цены
      doc.text(`Цена взрослого билета: ${ticket.sale.adult_price}₽`, 70, ticket.child_count > 0 ? 480 : 450)
      if (ticket.child_count > 0 && ticket.sale.child_price) {
        doc.text(`Цена детского билета: ${ticket.sale.child_price}₽`, 70, 510)
        doc.text(`Общая сумма: ${ticket.sale.total_amount}₽`, 70, 540)
      } else {
        doc.text(`Общая сумма: ${ticket.sale.total_amount}₽`, 70, ticket.child_count > 0 ? 540 : 480)
      }

      // QR код
      if (ticket.qr_code_data) {
        const qrDataURL = await generateQRCode(ticket.qr_code_data)
        const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64')
        doc.image(qrBuffer, 400, 250, { width: 150, height: 150 })
        doc.fontSize(10).text('QR код для контроля', 400, 410, { align: 'center', width: 150 })
      }

      // Номер билета
      doc.fontSize(12).text(`Номер билета: ${ticket.id}`, 50, 600)

      doc.end()

      stream.on('finish', () => {
        resolve(`/uploads/tickets-pdf/${filename}`)
      })
      
      stream.on('error', reject)
    } catch (error) {
      reject(error)
    }
  })
}
