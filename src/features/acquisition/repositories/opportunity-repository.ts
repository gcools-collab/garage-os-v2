import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type {
  AcquisitionDocument,
  AcquisitionOpportunity,
  AcquisitionSeller,
} from "../types/opportunity"

interface SellerRow {
  id: string; garage_id: string; type: AcquisitionSeller["type"]; name: string
  phone: string | null; email: string | null; city: string | null
  internal_comments: string | null
}
interface DocumentRow {
  id: string; category: AcquisitionDocument["category"]; label: string
  original_filename: string; storage_path: string; created_at: string
}
interface OpportunityRow {
  id: string; garage_id: string; creator_user_id: string; status: AcquisitionOpportunity["status"]
  provenance: AcquisitionOpportunity["provenance"]; confidence_level: AcquisitionOpportunity["confidenceLevel"]
  registration: string | null; vin: string | null; brand: string; model: string
  trim: string | null; year: number | null; fuel: string | null; gearbox: string | null
  mileage: number | null; color: string | null; options: string[] | null
  general_condition: AcquisitionOpportunity["generalCondition"]; asking_price: number | null
  repair_estimate: number | null; comments: string | null; source_url: string | null
  created_at: string; updated_at: string; acquisition_sellers: SellerRow | SellerRow[]
  acquisition_documents: DocumentRow[] | null
}

const OPPORTUNITY_SELECT = `
  id,garage_id,creator_user_id,status,provenance,confidence_level,registration,vin,
  brand,model,trim,year,fuel,gearbox,mileage,color,options,general_condition,
  asking_price,repair_estimate,comments,source_url,created_at,updated_at,
  acquisition_sellers!inner(id,garage_id,type,name,phone,email,city,internal_comments),
  acquisition_documents(id,category,label,original_filename,storage_path,created_at)
`

function mapRow(row: OpportunityRow): AcquisitionOpportunity {
  const sellerRow = Array.isArray(row.acquisition_sellers)
    ? row.acquisition_sellers[0]
    : row.acquisition_sellers
  if (!sellerRow) throw new Error("Vendeur de l'opportunité introuvable.")
  return {
    id: row.id, garageId: row.garage_id, creatorUserId: row.creator_user_id,
    status: row.status, provenance: row.provenance, confidenceLevel: row.confidence_level,
    registration: row.registration, vin: row.vin, brand: row.brand, model: row.model,
    trim: row.trim, year: row.year, fuel: row.fuel, gearbox: row.gearbox,
    mileage: row.mileage, color: row.color, options: row.options ?? [],
    generalCondition: row.general_condition, askingPrice: row.asking_price,
    repairEstimate: row.repair_estimate, comments: row.comments, sourceUrl: row.source_url,
    seller: {
      id: sellerRow.id, garageId: sellerRow.garage_id, type: sellerRow.type,
      name: sellerRow.name, phone: sellerRow.phone, email: sellerRow.email,
      city: sellerRow.city, internalComments: sellerRow.internal_comments,
    },
    documents: (row.acquisition_documents ?? []).map((document) => ({
      id: document.id, category: document.category, label: document.label,
      originalFilename: document.original_filename, storagePath: document.storage_path,
      createdAt: document.created_at,
    })),
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

export async function listAcquisitionOpportunities(
  session: ActiveGarageSession
): Promise<readonly AcquisitionOpportunity[]> {
  if (!session.garageId) return []
  const { data, error } = await (await createClient()).from("acquisition_opportunities")
    .select(OPPORTUNITY_SELECT).eq("garage_id", session.garageId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(`Lecture des opportunités impossible (${error.code}).`)
  return ((data ?? []) as unknown as OpportunityRow[]).map(mapRow)
}

export async function getAcquisitionOpportunity(
  session: ActiveGarageSession,
  id: string
): Promise<AcquisitionOpportunity | null> {
  if (!session.garageId) return null
  const { data, error } = await (await createClient()).from("acquisition_opportunities")
    .select(OPPORTUNITY_SELECT).eq("garage_id", session.garageId).eq("id", id).maybeSingle()
  if (error) throw new Error(`Lecture de l'opportunité impossible (${error.code}).`)
  return data ? mapRow(data as unknown as OpportunityRow) : null
}
