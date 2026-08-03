export function normalizedHistogram(values: readonly number[]) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0)
  return total === 0 ? values.map(() => 0) : values.map((value) => Math.max(0, value) / total)
}

export function histogramDistance(left: readonly number[], right: readonly number[]) {
  if (!left.length || left.length !== right.length) return null
  const a = normalizedHistogram(left)
  const b = normalizedHistogram(right)
  return a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / 2
}

export function hammingDistance(left: string, right: string) {
  if (!left || left.length !== right.length) return null
  return [...left].reduce((distance, character, index) => distance + Number(character !== right[index]), 0)
}
