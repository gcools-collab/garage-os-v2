export const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024
export const MIN_LOGO_DIMENSION = 32
export const MAX_LOGO_DIMENSION = 4096

export const ALLOWED_LOGO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const

export type AllowedLogoMimeType = keyof typeof ALLOWED_LOGO_TYPES

export function isAllowedLogoMimeType(type: string): type is AllowedLogoMimeType {
  return type in ALLOWED_LOGO_TYPES
}

export function getLogoExtension(type: AllowedLogoMimeType): string {
  return ALLOWED_LOGO_TYPES[type]
}

export function validateLogoFile(file: Pick<File, "name" | "type" | "size">): string | null {
  if (!file.name || file.size <= 0) return "Sélectionnez un fichier."
  if (!isAllowedLogoMimeType(file.type)) return "Seuls les fichiers PNG, JPEG et WebP sont acceptés."
  if (file.size > MAX_LOGO_FILE_SIZE) return "Le logo ne doit pas dépasser 2 Mo."
  return null
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

export function hasValidLogoSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/png") {
    return bytes.length >= 8 && PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  }
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    )
  }
  return false
}

export type ImageDimensions = { readonly width: number; readonly height: number }

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
const JPEG_STANDALONE_MARKERS = new Set([0x01, 0xd8, 0xd9, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7])

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let pos = 2
  while (pos + 3 < bytes.length) {
    if (bytes[pos] !== 0xff) return null
    const marker = bytes[pos + 1]
    if (JPEG_STANDALONE_MARKERS.has(marker)) {
      pos += 2
      continue
    }
    const length = (bytes[pos + 2] << 8) | bytes[pos + 3]
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (pos + 8 >= bytes.length) return null
      const height = (bytes[pos + 5] << 8) | bytes[pos + 6]
      const width = (bytes[pos + 7] << 8) | bytes[pos + 8]
      if (width <= 0 || height <= 0) return null
      return { width, height }
    }
    pos += 2 + length
  }
  return null
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30) return null
  if (String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return null
  const fourCc = String.fromCharCode(...bytes.slice(12, 16))
  const payload = bytes.slice(20)
  if (fourCc === "VP8 ") {
    if (payload.length < 10) return null
    const width = (payload[6] | (payload[7] << 8)) & 0x3fff
    const height = (payload[8] | (payload[9] << 8)) & 0x3fff
    if (width <= 0 || height <= 0) return null
    return { width, height }
  }
  if (fourCc === "VP8L") {
    if (payload.length < 5 || payload[0] !== 0x2f) return null
    const bits = payload[1] | (payload[2] << 8) | (payload[3] << 16) | (payload[4] << 24)
    const width = (bits & 0x3fff) + 1
    const height = ((bits >>> 14) & 0x3fff) + 1
    return { width, height }
  }
  if (fourCc === "VP8X") {
    if (payload.length < 10) return null
    const width = (payload[4] | (payload[5] << 8) | (payload[6] << 16)) + 1
    const height = (payload[7] | (payload[8] << 8) | (payload[9] << 16)) + 1
    return { width, height }
  }
  return null
}

export function readLogoDimensions(type: string, bytes: Uint8Array): ImageDimensions | null {
  if (type === "image/png") return readPngDimensions(bytes)
  if (type === "image/jpeg") return readJpegDimensions(bytes)
  if (type === "image/webp") return readWebpDimensions(bytes)
  return null
}

export function validateLogoDimensions(dimensions: ImageDimensions | null): string | null {
  if (!dimensions) return "Impossible de lire les dimensions de l’image."
  if (dimensions.width < MIN_LOGO_DIMENSION || dimensions.height < MIN_LOGO_DIMENSION) {
    return `Le logo doit mesurer au moins ${MIN_LOGO_DIMENSION}×${MIN_LOGO_DIMENSION} px.`
  }
  if (dimensions.width > MAX_LOGO_DIMENSION || dimensions.height > MAX_LOGO_DIMENSION) {
    return `Le logo ne doit pas dépasser ${MAX_LOGO_DIMENSION}×${MAX_LOGO_DIMENSION} px.`
  }
  return null
}
