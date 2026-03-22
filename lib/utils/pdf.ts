import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { generateQRCode } from './qr'

export async function generateTicketPDF(ticketData: any): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tickets-pdf')
      await fs.promises.mkdir(uploadDir, { recursive: true })

      const ticketId = ticketData.id.replace('temp-', '')
      const filename = `ticket-${ticketId}.pdf`
      const filepath = path.join(uploadDir, filename)

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }

      const stream = fs.createWriteStream(filepath)

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      })

      const fontPath = path.join(process.cwd(), 'lib', 'fonts', 'DejaVuSans.ttf')
      if (fs.existsSync(fontPath)) {
        doc.font(fontPath)
      }

      doc.pipe(stream)

      const pageWidth = doc.page.width
      const margin = 50

      const logoPath = path.join(process.cwd(), 'public', 'logo.png')
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, 50, { width: 100 })
      }

      doc.fontSize(24).text('БИЛЕТ НА ЭКСКУРСИЮ', 0, 170, { align: 'center', width: pageWidth })

      const sale = ticketData.sale || ticketData
      const tour = sale.tour || ticketData.tour
      const flight = sale.flight || ticketData.flight

      let yPos = 250
      doc.fontSize(16).text(`Компания: ${tour.company}`, 50, yPos)
      yPos += 30
      if (flight) {
        doc.text(`Рейс: ${flight.flight_number}`, 50, yPos)
        yPos += 30
        doc.text(`Дата: ${new Date(flight.date).toLocaleDateString('ru-RU')}`, 50, yPos)
        yPos += 30
        doc.text(`Время отправления: ${new Date(flight.departure_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`, 50, yPos)
        if (flight.duration_minutes) {
          yPos += 30
          doc.text(`Длительность: ${flight.duration_minutes} мин`, 50, yPos)
        }
        if (flight.boarding_location_url) {
          yPos += 30
          doc.fontSize(12).fillColor('blue').text('Точка посадки: Яндекс.Карты', 50, yPos, {
            link: flight.boarding_location_url,
            underline: true
          })
          doc.fillColor('black')
        }
      }

      yPos += 50
      doc.fontSize(14).text('Детали билета:', 50, yPos)
      yPos += 30
      doc.text(`Взрослых мест: ${ticketData.adult_count}`, 70, yPos)
      if (ticketData.child_count > 0) {
        yPos += 30
        doc.text(`Детских мест: ${ticketData.child_count}`, 70, yPos)
      }
      if (ticketData.concession_count > 0) {
        yPos += 30
        doc.text(`Льготных мест: ${ticketData.concession_count}`, 70, yPos)
      }

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

      if (ticketData.qr_code_data) {
        const qrDataURL = await generateQRCode(ticketData.qr_code_data)
        const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64')
        doc.image(qrBuffer, pageWidth - margin - 150, 220, { width: 150, height: 150 })
        doc.fontSize(10).text('QR для проверки на посадке', pageWidth - margin - 150, 375, { align: 'center', width: 150 })
      }

      yPos += 40
      if (sale.sale_number) {
        doc.fontSize(16).text(`Код заказа: ${sale.sale_number}`, 50, yPos)
        doc.fontSize(10).text('(укажите при проверке билета)', 50, yPos + 22)
        yPos += 50
      }
      doc.fontSize(10).fillColor('#666').text(`ID билета: ${ticketData.id}`, 50, yPos)

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
