import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { generateQRCode } from './qr'

export async function generateTicketPDF(ticketData: any): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tickets-pdf')
      await fs.promises.mkdir(uploadDir, { recursive: true })
      
      // Использовать правильный ID билета для имени файла
      const ticketId = ticketData.id.replace('temp-', '')
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

      const sale = ticketData.sale || ticketData
      const tour = sale.tour || ticketData.tour

      // Информация об экскурсии
      doc.fontSize(16).text(`Компания: ${tour.company}`, 50, 250)
      doc.text(`Рейс: ${tour.flight_number}`, 50, 280)
      doc.text(`Дата: ${new Date(tour.date).toLocaleDateString('ru-RU')}`, 50, 310)
      doc.text(`Время отправления: ${new Date(tour.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`, 50, 340)
      
      // Ссылка на Яндекс.Карты (если есть)
      if (tour.boarding_location_url) {
        yPos = 370
        doc.fontSize(12).fillColor('blue').text('Точка посадки: Яндекс.Карты', 50, yPos, {
          link: tour.boarding_location_url,
          underline: true
        })
        doc.fillColor('black')
      }

      // Информация о билете
      doc.fontSize(14).text('Детали билета:', 50, 390)
      let yPos = 420
      doc.text(`Взрослых мест: ${ticketData.adult_count}`, 70, yPos)
      
      if (ticketData.child_count > 0) {
        yPos += 30
        doc.text(`Детских мест: ${ticketData.child_count}`, 70, yPos)
      }
      
      if (ticketData.concession_count > 0) {
        yPos += 30
        doc.text(`Льготных мест: ${ticketData.concession_count}`, 70, yPos)
      }

      // Цены
      yPos += 30
      doc.text(`Цена взрослого билета: ${sale.adult_price}₽`, 70, yPos)
      
      if (ticketData.child_count > 0 && sale.child_price) {
        yPos += 30
        doc.text(`Цена детского билета: ${sale.child_price}₽`, 70, yPos)
      }
      
      if (ticketData.concession_count > 0 && sale.concession_price) {
        yPos += 30
        doc.text(`Цена льготного билета: ${sale.concession_price}₽`, 70, yPos)
      }
      
      yPos += 30
      doc.text(`Общая сумма: ${sale.total_amount}₽`, 70, yPos)

      // QR код
      if (ticketData.qr_code_data) {
        const qrDataURL = await generateQRCode(ticketData.qr_code_data)
        const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64')
        doc.image(qrBuffer, 400, 250, { width: 150, height: 150 })
        doc.fontSize(10).text('QR код для контроля', 400, 410, { align: 'center', width: 150 })
      }

      // Номер билета
      doc.fontSize(12).text(`Номер билета: ${ticketData.id}`, 50, 600)

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
