"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { Vehicle360SequenceEngine, Vehicle360ValidationEngine } from "../engine"
import { getVehicle360Sequence } from "../repositories"
import type { Vehicle360SequenceStatus } from "../types"

const MIME_EXTENSIONS: Readonly<Record<string, string>> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
async function editableSession() {
  const session = await getActiveGarageSession()
  return session?.garageId && (session.memberRole === "owner" || session.memberRole === "admin") ? session : null
}

export async function createVehicle360Sequence(vehicleId: string) {
  const session = await editableSession()
  if (!session?.garageId) return
  const supabase = await createClient()
  const { data: vehicle } = await supabase.from("vehicles").select("id").eq("id", vehicleId).eq("garage_id", session.garageId).maybeSingle()
  if (!vehicle) return
  await supabase.from("vehicle_360_sequences").insert({ garage_id: session.garageId, vehicle_id: vehicleId, created_by: session.userId })
  redirect(`/stock/${vehicleId}/360`)
}

export async function deleteVehicle360Frame(vehicleId: string, frameId: string) {
  const session = await editableSession()
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!session?.garageId || !sequence || sequence.garageId !== session.garageId) return
  const frame = sequence.frames.find((item) => item.id === frameId)
  if (!frame) return
  const supabase = await createClient()
  const { error } = await supabase
    .from("vehicle_360_frames")
    .delete()
    .eq("id", frameId)
    .eq("sequence_id", sequence.id)
    .eq("garage_id", session.garageId)
  if (error) return
  await supabase.storage.from("vehicle-360").remove([frame.storagePath])
  revalidatePath(`/stock/${vehicleId}/360`)
  revalidatePath(`/stock/${vehicleId}`)
}

export type Vehicle360UploadResult = {
  uploaded: number
  skipped: number
  errors: string[]
}

export async function uploadVehicle360Frames(vehicleId: string, formData: FormData): Promise<Vehicle360UploadResult> {
  const session = await editableSession()
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!session?.garageId || !sequence || sequence.garageId !== session.garageId) {
    return { uploaded: 0, skipped: 0, errors: ["Séquence 360° inaccessible."] }
  }
  const files = formData.getAll("frames").filter((item): item is File => item instanceof File && item.size > 0)
  const supabase = await createClient()
  let position = sequence.frames.length + 1
  const result: Vehicle360UploadResult = { uploaded: 0, skipped: 0, errors: [] }
  const remaining = Math.max(0, 48 - sequence.frames.length)

  for (const file of files.slice(0, remaining)) {
    const extension = MIME_EXTENSIONS[file.type]
    if (!extension || file.size > 15 * 1024 * 1024) {
      result.skipped += 1
      result.errors.push(`${file.name} : format ou taille non accepté.`)
      continue
    }
    const frameId = randomUUID()
    const path = `${session.garageId}/${vehicleId}/${sequence.id}/${frameId}.${extension}`
    const { error: uploadError } = await supabase.storage.from("vehicle-360").upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      result.skipped += 1
      result.errors.push(`${file.name} : ${uploadError.message}`)
      continue
    }
    const { error } = await supabase.from("vehicle_360_frames").insert({
      id: frameId, garage_id: session.garageId, vehicle_id: vehicleId, sequence_id: sequence.id,
      storage_path: path, position, status: "READY", file_size: file.size, mime_type: file.type,
    })
    if (error) {
      await supabase.storage.from("vehicle-360").remove([path])
      result.skipped += 1
      result.errors.push(`${file.name} : enregistrement impossible.`)
      continue
    }
    result.uploaded += 1
    position += 1
  }

  if (files.length > remaining) {
    result.errors.push(`Limite de 48 vues atteinte — ${files.length - remaining} fichier(s) ignoré(s).`)
  }

  const { count } = await supabase.from("vehicle_360_frames").select("id", { count: "exact", head: true }).eq("sequence_id", sequence.id).eq("status", "READY")
  if ((count ?? 0) >= 12 && sequence.status === "DRAFT") {
    await supabase.from("vehicle_360_sequences").update({ status: "READY", start_frame_index: 0 }).eq("id", sequence.id).eq("garage_id", session.garageId)
  }
  revalidatePath(`/stock/${vehicleId}/360`)
  revalidatePath(`/stock/${vehicleId}`)
  return result
}

export async function reorderVehicle360Frame(vehicleId: string, frameId: string, direction: -1 | 1) {
  const session = await editableSession()
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!session?.garageId || !sequence || sequence.garageId !== session.garageId) return
  const reordered = new Vehicle360SequenceEngine().move(sequence.frames, frameId, direction)
  const supabase = await createClient()
  await supabase.rpc("reorder_vehicle_360_frames", { p_sequence_id: sequence.id, p_frame_ids: reordered.map((frame) => frame.id) })
  revalidatePath(`/stock/${vehicleId}/360`)
}

export async function reverseVehicle360Frames(vehicleId: string) {
  const session = await editableSession()
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!session?.garageId || !sequence || sequence.garageId !== session.garageId) return
  const reversed = new Vehicle360SequenceEngine().reverse(sequence.frames)
  const supabase = await createClient()
  await supabase.rpc("reorder_vehicle_360_frames", { p_sequence_id: sequence.id, p_frame_ids: reversed.map((frame) => frame.id) })
  revalidatePath(`/stock/${vehicleId}/360`)
}

export async function setVehicle360StartFrame(vehicleId: string, frameId: string) {
  const session = await editableSession()
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!session?.garageId || !sequence || sequence.garageId !== session.garageId) return
  const index = new Vehicle360SequenceEngine().order(sequence.frames.filter((frame) => frame.status === "READY")).findIndex((frame) => frame.id === frameId)
  if (index < 0) return
  const supabase = await createClient()
  await supabase.from("vehicle_360_sequences").update({ start_frame_index: index }).eq("id", sequence.id).eq("garage_id", session.garageId)
  revalidatePath(`/stock/${vehicleId}/360`)
}

export async function setVehicle360FrameExcluded(vehicleId: string, frameId: string, excluded: boolean) {
  const session = await editableSession()
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!session?.garageId || !sequence || sequence.garageId !== session.garageId) return
  const supabase = await createClient()
  await supabase.from("vehicle_360_frames").update({ status: excluded ? "EXCLUDED" : "READY" }).eq("id", frameId).eq("sequence_id", sequence.id).eq("garage_id", session.garageId)
  revalidatePath(`/stock/${vehicleId}/360`)
}

export async function setVehicle360Status(vehicleId: string, target: Vehicle360SequenceStatus) {
  const session = await editableSession()
  const sequence = await getVehicle360Sequence(vehicleId)
  if (!session?.garageId || !sequence || sequence.garageId !== session.garageId) return
  new Vehicle360SequenceEngine().assertTransition(sequence.status, target)
  if (target === "PUBLISHED" && !new Vehicle360ValidationEngine().validate(sequence).ready) return
  const supabase = await createClient()
  await supabase.from("vehicle_360_sequences").update({ status: target, is_public: target === "PUBLISHED", published_at: target === "PUBLISHED" ? new Date().toISOString() : sequence.publishedAt }).eq("id", sequence.id).eq("garage_id", session.garageId)
  revalidatePath(`/stock/${vehicleId}/360`)
  revalidatePath(`/stock/${vehicleId}`)
  revalidatePath("/g", "layout")
}
