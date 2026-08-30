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

test("laisse intact un logo déjà rempli", () => {
  const data = imageData(12, 12, () => [30, 80, 160, 255])
  assert.equal(findLogoContentBox(data, 12, 12), null)
})
