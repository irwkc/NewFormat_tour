import QRCode from 'qrcode'

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
    })
    return qrDataURL
  } catch (error) {
    console.error('QR generation error:', error)
    throw error
  }
}

export async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    const qrSVG = await QRCode.toString(data, {
      type: 'svg',
      width: 300,
      margin: 1,
    })
    return qrSVG
  } catch (error) {
    console.error('QR SVG generation error:', error)
    throw error
  }
}
