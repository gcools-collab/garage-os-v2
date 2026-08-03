import type { Vehicle360Frame, Vehicle360SequenceStatus } from "../types"

const TRANSITIONS: Readonly<Record<Vehicle360SequenceStatus, readonly Vehicle360SequenceStatus[]>> = {
  DRAFT: ["PROCESSING", "READY", "FAILED", "ARCHIVED"],
  PROCESSING: ["DRAFT", "READY", "FAILED", "ARCHIVED"],
  READY: ["DRAFT", "PUBLISHED", "FAILED", "ARCHIVED"],
  PUBLISHED: ["READY", "ARCHIVED"],
  FAILED: ["DRAFT", "PROCESSING", "ARCHIVED"],
  ARCHIVED: [],
}

export class Vehicle360SequenceEngine {
  canTransition(from: Vehicle360SequenceStatus, to: Vehicle360SequenceStatus) {
    return TRANSITIONS[from].includes(to)
  }

  assertTransition(from: Vehicle360SequenceStatus, to: Vehicle360SequenceStatus) {
    if (!this.canTransition(from, to)) throw new Error(`Invalid 360 sequence transition: ${from} -> ${to}`)
  }

  order(frames: readonly Vehicle360Frame[]) {
    return [...frames].sort((left, right) =>
      left.position - right.position
      || left.createdAt.localeCompare(right.createdAt)
      || left.id.localeCompare(right.id)
    )
  }

  reverse(frames: readonly Vehicle360Frame[]) {
    return this.order(frames).reverse().map((frame, index) => ({ ...frame, position: index + 1 }))
  }

  move(frames: readonly Vehicle360Frame[], frameId: string, direction: -1 | 1) {
    const ordered = this.order(frames)
    const index = ordered.findIndex((frame) => frame.id === frameId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return ordered
    const mutable = [...ordered]
    ;[mutable[index], mutable[target]] = [mutable[target], mutable[index]]
    return mutable.map((frame, position) => ({ ...frame, position: position + 1 }))
  }
}
