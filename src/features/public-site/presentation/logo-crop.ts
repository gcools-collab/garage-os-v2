export type LogoCropBox = {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export function isLogoMarginPixel(r: number, g: number, b: number, a: number) {
  if (a < 24) return true
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max >= 228 && min >= 208 && max - min <= 36
}

export function findLogoContentBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): LogoCropBox | null {
  if (width < 1 || height < 1 || data.length < width * height * 4) return null
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      if (isLogoMarginPixel(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0, data[index + 3] ?? 0)) {
        continue
      }
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null
  const pad = 2
  const left = Math.max(0, minX - pad)
  const top = Math.max(0, minY - pad)
  const right = Math.min(width, maxX + 1 + pad)
  const bottom = Math.min(height, maxY + 1 + pad)
  const box = { left, top, width: right - left, height: bottom - top }
  if (box.width < 8 || box.height < 8) return null
  if (box.width * box.height > width * height * 0.92) return null
  return box
}
