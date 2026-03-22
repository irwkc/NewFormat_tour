/**
 * Предобработка изображения для улучшения качества распознавания (из Roja id).
 */
export function preprocessImageData(imageData: ImageData): ImageData {
  const data = imageData.data
  const alpha = 1.2
  const beta = 10
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, alpha * data[i] + beta))
    data[i + 1] = Math.min(255, Math.max(0, alpha * data[i + 1] + beta))
    data[i + 2] = Math.min(255, Math.max(0, alpha * data[i + 2] + beta))
  }
  return imageData
}
