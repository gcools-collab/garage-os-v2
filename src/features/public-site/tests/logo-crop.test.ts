import assert from "node:assert/strict"
import test from "node:test"

import { findLogoContentBox } from "../presentation/logo-crop"

function imageData(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y)
      const index = (y * width + x) * 4
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = a
    }
  }
  return data
}

test("recadre le blanc périphérique sans déformer le symbole", () => {
  const data = imageData(40, 20, (x, y) => (
    x >= 16 && x <= 23 && y >= 6 && y <= 13 ? [20, 20, 20, 255] : [255, 255, 255, 255]
  ))
  const box = findLogoContentBox(data, 40, 20)
  assert.ok(box)
  assert.equal(box.left, 14)
  assert.equal(box.top, 4)
  assert.equal(box.width, 12)
  assert.equal(box.height, 12)
})

test("recadre aussi un fond blanc sale de JPEG", () => {
  const data = imageData(40, 20, (x, y) => (
    x >= 16 && x <= 23 && y >= 6 && y <= 13 ? [20, 40, 180, 255] : [238, 236, 232, 255]
  ))
  const box = findLogoContentBox(data, 40, 20)
  assert.ok(box)
  assert.equal(box.left, 14)
  assert.equal(box.top, 4)
})

test("conserve le blanc intérieur et la bordure colorée d’un médaillon", () => {
  const data = imageData(24, 24, (x, y) => {
    const dx = x - 11.5
    const dy = y - 11.5
    const distance = Math.hypot(dx, dy)
    if (distance > 8) return [255, 255, 255, 255]
    if (distance > 6.5) return [210, 170, 30, 255]
    if (x >= 10 && x <= 13 && y >= 9 && y <= 14) return [12, 12, 12, 255]
    return [255, 255, 255, 255]
  })
  const box = findLogoContentBox(data, 24, 24)
  assert.ok(box)
  assert.ok(box.left <= 4)
  assert.ok(box.top <= 4)
  const innerWhite = ((12 * 24 + 8) * 4)
  assert.equal(data[innerWhite], 255)
  assert.equal(data[innerWhite + 3], 255)
  const gold = ((4 * 24 + 12) * 4)
  assert.equal(data[gold], 210)
})

test("laisse intact un logo déjà rempli", () => {
  const data = imageData(12, 12, () => [30, 80, 160, 255])
  assert.equal(findLogoContentBox(data, 12, 12), null)
})
