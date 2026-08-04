import "server-only"
import { getActiveGarageBranding } from "@/features/branding"
import { getInteriorTour } from "@/features/interior-tour/repositories"
import { getActiveGarageSession } from "@/features/tenant"
import { getVehicle360Sequence } from "@/features/vehicle-360/repositories"
import { createClient } from "@/lib/supabase/server"
import { VehicleFactsBuilder, type VehicleFactsSource } from "../builders"
import type { VehicleListingContent, VehicleListingFacts, VehicleListingValidation, VehicleListingVersion } from "../types"

type VersionRow = { id:string;garage_id:string;vehicle_id:string;created_by:string;provider:string;model:string;prompt_id:string;prompt_version:string;content_hash:string;format:"BUNDLE";content:VehicleListingContent;validation:VehicleListingValidation;created_at:string }
const mapVersion=(row:VersionRow):VehicleListingVersion=>({id:row.id,garageId:row.garage_id,vehicleId:row.vehicle_id,createdBy:row.created_by,provider:row.provider,model:row.model,promptId:row.prompt_id,promptVersion:row.prompt_version,contentHash:row.content_hash,format:row.format,content:row.content,validation:row.validation,createdAt:row.created_at})

export async function getVehicleListingFacts(vehicleId:string):Promise<VehicleListingFacts|null>{
 const session=await getActiveGarageSession();if(!session?.garageId)return null
 const supabase=await createClient()
 const [{data:vehicle,error},{data:costs},{data:market},{count:photoCount},branding,exterior360,interiorTour]=await Promise.all([
  supabase.from("vehicles").select("id,garage_id,brand,model,version,year,first_registration_date,mileage,fuel,gearbox,power_din,fiscal_power,color,owners_count,selling_price").eq("id",vehicleId).eq("garage_id",session.garageId).maybeSingle(),
  supabase.from("vehicle_costs").select("label,type").eq("vehicle_id",vehicleId),
  supabase.from("vehicle_market_analyses").select("median_price,positioning,comparable_count").eq("vehicle_id",vehicleId).order("analyzed_at",{ascending:false}).limit(1).maybeSingle(),
  supabase.from("vehicle_images").select("id",{head:true,count:"exact"}).eq("vehicle_id",vehicleId).eq("garage_id",session.garageId),getActiveGarageBranding(),getVehicle360Sequence(vehicleId),getInteriorTour(vehicleId)
 ])
 if(error)throw new Error(`Lecture des faits véhicule impossible (${error.code}).`);if(!vehicle||!branding)return null
 const source:VehicleFactsSource={vehicle:{id:vehicle.id,garageId:vehicle.garage_id,brand:vehicle.brand,model:vehicle.model,version:vehicle.version,year:vehicle.year,firstRegistrationDate:vehicle.first_registration_date,mileageKm:vehicle.mileage===null?null:Number(vehicle.mileage),fuel:vehicle.fuel,gearbox:vehicle.gearbox,powerDin:vehicle.power_din===null?null:Number(vehicle.power_din),fiscalPower:vehicle.fiscal_power===null?null:Number(vehicle.fiscal_power),color:vehicle.color,ownersCount:vehicle.owners_count,sellingPriceEuros:vehicle.selling_price===null?null:Number(vehicle.selling_price),equipment:[]},completedWork:(costs??[]).map(cost=>cost.label).filter(Boolean),market:{medianPriceEuros:market?.median_price===null||market?.median_price===undefined?null:Number(market.median_price),score:null,summary:market?`${market.comparable_count} comparable(s), positionnement ${market.positioning}.`:null},media:{photoCount:photoCount??0,exterior360:exterior360?.status==="PUBLISHED"&&exterior360.isPublic,interiorTour:interiorTour?.status==="PUBLISHED"&&interiorTour.isPublic},garage:{name:branding.branding.displayName,phone:branding.branding.contact.phone,email:branding.branding.contact.email,city:branding.branding.address.city,brandingSummary:branding.branding.shortDescription}}
 return new VehicleFactsBuilder().build(source)
}
export async function getVehicleListingVersions(vehicleId:string):Promise<readonly VehicleListingVersion[]>{const session=await getActiveGarageSession();if(!session?.garageId)return[];const supabase=await createClient();const{data,error}=await supabase.from("vehicle_listing_versions").select("id,garage_id,vehicle_id,created_by,provider,model,prompt_id,prompt_version,content_hash,format,content,validation,created_at").eq("garage_id",session.garageId).eq("vehicle_id",vehicleId).order("created_at",{ascending:false});if(error)throw new Error(`Lecture de l’historique impossible (${error.code}).`);return(data??[]).map(row=>mapVersion(row as unknown as VersionRow))}
export async function saveVehicleListingVersion(input:Omit<VehicleListingVersion,"id"|"createdAt"|"garageId"|"vehicleId"|"createdBy">&{readonly vehicleId:string;readonly sourceVersionId?:string|null}):Promise<string|null>{const session=await getActiveGarageSession();if(!session?.garageId)return null;const supabase=await createClient();const{data,error}=await supabase.from("vehicle_listing_versions").insert({garage_id:session.garageId,vehicle_id:input.vehicleId,created_by:session.userId,provider:input.provider,model:input.model,prompt_id:input.promptId,prompt_version:input.promptVersion,content_hash:input.contentHash,format:input.format,content:input.content,validation:input.validation,source_version_id:input.sourceVersionId??null}).select("id").single();if(error)throw new Error(`Enregistrement de l’annonce impossible (${error.code}).`);return data.id}
