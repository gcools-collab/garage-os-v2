"use server"
import { revalidatePath } from "next/cache"
import { getActiveGarageSession } from "@/features/tenant"
import { saveServiceOffer } from "../repositories/service-catalog-repository"
import { serviceOfferInputSchema } from "../validation/service-catalog-validation"
export async function upsertServiceOffer(input:unknown){const session=await getActiveGarageSession();if(!session?.garageId||!(["owner","admin"] as const).includes(session.memberRole as "owner"|"admin"))return{ok:false,message:"Accès refusé."};const parsed=serviceOfferInputSchema.safeParse(input);if(!parsed.success)return{ok:false,message:"Vérifiez les informations de la prestation."};const id=parsed.data.id??crypto.randomUUID();const ok=await saveServiceOffer(session.garageId,{...parsed.data,id});if(ok){revalidatePath("/settings/services/catalog");revalidatePath(`/g/${session.garageSlug}/contact`)}return{ok,message:ok?"Prestation enregistrée.":"Enregistrement impossible."}}
