import "server-only"

import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import type { Vehicle360Frame, Vehicle360Sequence, Vehicle360SequenceStatus } from "../types"

type FrameRow = { id: string; garage_id: string; vehicle_id: string; sequence_id: string; storage_path: string; position: number; status: Vehicle360Frame["status"]; width: number | null; height: number | null; file_size: number | null; mime_type: string; checksum: string | null; created_at: string; updated_at: string }
type SequenceRow = { id: string; garage_id: string; vehicle_id: string; status: Vehicle360SequenceStatus; frame_count: number; start_frame_index: number | null; is_public: boolean; created_by: string; created_at: string; updated_at: string; published_at: string | null; vehicle_360_frames: FrameRow[] | null }

function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  return base ? `${base}/storage/v1/object/public/vehicle-360/${path}` : null
}

function mapFrame(row: FrameRow): Vehicle360Frame {
  return { id: row.id, garageId: row.garage_id, vehicleId: row.vehicle_id, sequenceId: row.sequence_id, storagePath: row.storage_path, publicUrl: publicUrl(row.storage_path), position: row.position, status: row.status, width: row.width, height: row.height, fileSize: row.file_size, mimeType: row.mime_type, checksum: row.checksum, createdAt: row.created_at, updatedAt: row.updated_at }
}

function mapSequence(row: SequenceRow): Vehicle360Sequence {
  return { id: row.id, garageId: row.garage_id, vehicleId: row.vehicle_id, status: row.status, frameCount: row.frame_count, startFrameIndex: row.start_frame_index, isPublic: row.is_public, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, publishedAt: row.published_at, frames: (row.vehicle_360_frames ?? []).map(mapFrame) }
}

const SELECT = "id,garage_id,vehicle_id,status,frame_count,start_frame_index,is_public,created_by,created_at,updated_at,published_at,vehicle_360_frames(id,garage_id,vehicle_id,sequence_id,storage_path,position,status,width,height,file_size,mime_type,checksum,created_at,updated_at)"

export async function getVehicle360Sequence(vehicleId: string): Promise<Vehicle360Sequence | null> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from("vehicle_360_sequences").select(SELECT).eq("garage_id", session.garageId).eq("vehicle_id", vehicleId).neq("status", "ARCHIVED").maybeSingle()
  if (error) throw new Error(`Lecture de la visite 360° impossible (${error.code}).`)
  return data ? mapSequence(data as unknown as SequenceRow) : null
}

export async function getPublicVehicle360Sequence(garageId: string, vehicleId: string): Promise<Vehicle360Sequence | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("public_live_vehicle_360_frames").select("*").eq("garage_id", garageId).eq("vehicle_id", vehicleId).order("position")
  if (error || !data?.length) return null
  const rows = data as unknown as Array<{ sequence_id: string; garage_id: string; vehicle_id: string; start_frame_index: number | null; id: string; position: number; storage_path: string; width: number | null; height: number | null; mime_type: string }>
  const now = new Date(0).toISOString()
  return { id: rows[0].sequence_id, garageId, vehicleId, status: "PUBLISHED", frameCount: rows.length, startFrameIndex: rows[0].start_frame_index, isPublic: true, createdBy: "", createdAt: now, updatedAt: now, publishedAt: null, frames: rows.map((row) => ({ id: row.id, garageId, vehicleId, sequenceId: row.sequence_id, storagePath: row.storage_path, publicUrl: publicUrl(row.storage_path), position: row.position, status: "READY", width: row.width, height: row.height, fileSize: null, mimeType: row.mime_type, checksum: null, createdAt: now, updatedAt: now })) }
}
