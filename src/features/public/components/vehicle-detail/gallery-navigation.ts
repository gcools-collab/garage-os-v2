export function getPreviousImageIndex(current: number, length: number) {
  return length <= 1 ? 0 : (current - 1 + length) % length
}

export function getNextImageIndex(current: number, length: number) {
  return length <= 1 ? 0 : (current + 1) % length
}
