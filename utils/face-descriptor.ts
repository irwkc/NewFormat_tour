/**
 * Вычисление евклидова расстояния между двумя дескрипторами лица (128 измерений).
 * Используется для проверки совпадения лица на сервере без face-api.js.
 */
export function computeDescriptorDistance(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Infinity
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export function computeMinDistance(query: number[], descriptors: number[][]): number {
  if (!query || !descriptors?.length) return Infinity
  let min = Infinity
  for (const d of descriptors) {
    const dist = computeDescriptorDistance(query, d)
    min = Math.min(min, dist)
  }
  return min
}

export const FACE_MATCH_THRESHOLD = 0.6
