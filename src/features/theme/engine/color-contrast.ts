function rgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const
}

function linear(channel: number) {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function getRelativeLuminance(color: string) {
  const channels = rgb(color)
  if (!channels) return null
  return 0.2126 * linear(channels[0]) + 0.7152 * linear(channels[1]) + 0.0722 * linear(channels[2])
}

export function getContrastRatio(first: string, second: string) {
  const firstLuminance = getRelativeLuminance(first)
  const secondLuminance = getRelativeLuminance(second)
  if (firstLuminance === null || secondLuminance === null) return null
  const light = Math.max(firstLuminance, secondLuminance)
  const dark = Math.min(firstLuminance, secondLuminance)
  return (light + 0.05) / (dark + 0.05)
}

export function getReadableForegroundColor(background: string) {
  const dark = "#111111"
  const light = "#FFFFFF"
  const darkRatio = getContrastRatio(background, dark) ?? 0
  const lightRatio = getContrastRatio(background, light) ?? 0
  return darkRatio >= lightRatio ? dark : light
}
