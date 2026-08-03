"use server"

import { MediaAiInsightEngine } from "../ai"
import { MediaQualityEngine } from "../engine"
import { createMediaAiProvider } from "../repositories"
import { MediaQualityReportBuilder } from "../builders"
import { buildMediaQualityViewModel, type MediaQualityViewModel } from "../presentation"
import { getVehicle360Sequence } from "@/features/vehicle-360/repositories"

export async function analyzeVehicle360MediaQuality(vehicleId: string): Promise<{ readonly success: true; readonly report: MediaQualityViewModel } | { readonly success: false; readonly message: string }> {
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!sequence) return { success: false, message: "Aucune séquence 360° à analyser." }
  const items = sequence.frames.map((frame) => ({ id: frame.id, position: frame.position, url: frame.publicUrl, width: frame.width, height: frame.height, fileSize: frame.fileSize, mimeType: frame.mimeType, hash: frame.checksum, ready: frame.status === "READY" }))
  const deterministic = new MediaQualityEngine().analyze(items, "360")
  const ai = await new MediaAiInsightEngine().analyze(items, createMediaAiProvider())
  if (!ai.available) return { success: false, message: ai.message }
  return { success: true, report: buildMediaQualityViewModel(new MediaQualityReportBuilder().build(deterministic, ai.insight)) }
}
