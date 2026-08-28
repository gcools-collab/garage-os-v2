"use server"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { getActiveGarageSession } from "@/features/tenant"
import { SupabaseMediaStorageProvider, type SupabaseStorageClient } from "@/features/media"
import { createClient } from "@/lib/supabase/server"
import { InteriorTourEngine } from "../engine"
import { getInteriorTour } from "../repositories"
import { InteriorTourStorage, interiorScenePath } from "../storage"
import type { InteriorTourStatus } from "../types"
import { hotspotSchema, InteriorTourValidationEngine, sceneUpdateSchema } from "../validation"

const EXTENSIONS:Readonly<Record<string,string>>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}
async function editable(){const session=await getActiveGarageSession();return session?.garageId&&(session.memberRole==="owner"||session.memberRole==="admin")?session:null}
function refresh(vehicleId:string){revalidatePath(`/stock/${vehicleId}/interior-tour`);revalidatePath(`/stock/${vehicleId}`);revalidatePath("/g","layout")}
export async function createInteriorTour(vehicleId:string){const session=await editable();if(!session?.garageId)return;const supabase=await createClient();const {data:vehicle}=await supabase.from("vehicles").select("id").eq("id",vehicleId).eq("garage_id",session.garageId).maybeSingle();if(!vehicle)return;await supabase.from("interior_tours").insert({garage_id:session.garageId,vehicle_id:vehicleId,created_by:session.userId});refresh(vehicleId)}
export async function uploadInteriorScenes(vehicleId:string,formData:FormData){const session=await editable();const tour=await getInteriorTour(vehicleId);if(!session?.garageId||!tour||tour.garageId!==session.garageId)return;const supabase=await createClient();const storage=new InteriorTourStorage(new SupabaseMediaStorageProvider(supabase as unknown as SupabaseStorageClient));const files=formData.getAll("scenes").filter((item):item is File=>item instanceof File&&item.size>0);let position=tour.scenes.length+1;for(const file of files.slice(0,12)){const extension=EXTENSIONS[file.type];if(!extension||file.size>20*1024*1024)continue;const id=randomUUID();const path=interiorScenePath(session.garageId,vehicleId,tour.id,id,extension);try{await storage.upload(path,file);const {error}=await supabase.from("interior_tour_scenes").insert({id,garage_id:session.garageId,vehicle_id:vehicleId,tour_id:tour.id,name:`Scène ${position}`,storage_path:path,position,status:"READY",file_size:file.size,mime_type:file.type,initial_yaw:0,initial_pitch:0,initial_fov:90});if(error)await storage.delete([path]);else position+=1}catch{/* Le fichier suivant reste importable. */}}const updated=await getInteriorTour(vehicleId);if(updated?.scenes.length&&!updated.startSceneId){await supabase.from("interior_tours").update({start_scene_id:updated.scenes[0].id,status:"READY"}).eq("id",tour.id).eq("garage_id",session.garageId)}refresh(vehicleId)}
export async function deleteInteriorScene(vehicleId: string, sceneId: string) {
  const session = await editable()
  const tour = await getInteriorTour(vehicleId)
  if (!session?.garageId || !tour || tour.garageId !== session.garageId) return
  const scene = tour.scenes.find((item) => item.id === sceneId)
  if (!scene) return
  const supabase = await createClient()
  const storage = new InteriorTourStorage(new SupabaseMediaStorageProvider(supabase as unknown as SupabaseStorageClient))
  await supabase.from("interior_tour_hotspots").delete().eq("source_scene_id", sceneId).eq("tour_id", tour.id).eq("garage_id", session.garageId)
  await supabase.from("interior_tour_hotspots").delete().eq("target_scene_id", sceneId).eq("tour_id", tour.id).eq("garage_id", session.garageId)
  const { error } = await supabase.from("interior_tour_scenes").delete().eq("id", sceneId).eq("tour_id", tour.id).eq("garage_id", session.garageId)
  if (error) return
  try {
    await storage.delete([scene.storagePath])
  } catch {
    /* Le fichier storage peut déjà être absent. */
  }
  if (tour.startSceneId === sceneId) {
    const remaining = tour.scenes.filter((item) => item.id !== sceneId && item.status === "READY")
    await supabase.from("interior_tours").update({ start_scene_id: remaining[0]?.id ?? null }).eq("id", tour.id).eq("garage_id", session.garageId)
  }
  refresh(vehicleId)
}

export async function updateInteriorScene(vehicleId:string,sceneId:string,formData:FormData){const session=await editable();const tour=await getInteriorTour(vehicleId);const parsed=sceneUpdateSchema.safeParse({name:formData.get("name"),initialYaw:formData.get("initialYaw"),initialPitch:formData.get("initialPitch"),initialFov:formData.get("initialFov")});if(!session?.garageId||!tour||!parsed.success)return;const supabase=await createClient();await supabase.from("interior_tour_scenes").update({name:parsed.data.name,initial_yaw:parsed.data.initialYaw,initial_pitch:parsed.data.initialPitch,initial_fov:parsed.data.initialFov}).eq("id",sceneId).eq("tour_id",tour.id).eq("garage_id",session.garageId);refresh(vehicleId)}
export async function setInteriorStartScene(vehicleId:string,sceneId:string){const session=await editable();const tour=await getInteriorTour(vehicleId);if(!session?.garageId||!tour||!tour.scenes.some(scene=>scene.id===sceneId&&scene.status==="READY"))return;const supabase=await createClient();await supabase.from("interior_tours").update({start_scene_id:sceneId}).eq("id",tour.id).eq("garage_id",session.garageId);refresh(vehicleId)}
export async function setInteriorSceneExcluded(vehicleId:string,sceneId:string,excluded:boolean){const session=await editable();const tour=await getInteriorTour(vehicleId);if(!session?.garageId||!tour)return;const supabase=await createClient();await supabase.from("interior_tour_scenes").update({status:excluded?"EXCLUDED":"READY"}).eq("id",sceneId).eq("tour_id",tour.id).eq("garage_id",session.garageId);refresh(vehicleId)}
export async function moveInteriorScene(vehicleId:string,sceneId:string,direction:-1|1){const session=await editable();const tour=await getInteriorTour(vehicleId);if(!session?.garageId||!tour)return;const ordered=new InteriorTourEngine().move(tour.scenes,sceneId,direction);const supabase=await createClient();await supabase.rpc("reorder_interior_tour_scenes",{p_tour_id:tour.id,p_scene_ids:ordered.map(scene=>scene.id)});refresh(vehicleId)}
export async function createInteriorHotspot(vehicleId:string,formData:FormData){const session=await editable();const tour=await getInteriorTour(vehicleId);const parsed=hotspotSchema.safeParse({sourceSceneId:formData.get("sourceSceneId"),targetSceneId:formData.get("targetSceneId"),label:formData.get("label"),yaw:formData.get("yaw"),pitch:formData.get("pitch")});if(!session?.garageId||!tour||!parsed.success)return;const ids=new Set(tour.scenes.filter(scene=>scene.status==="READY").map(scene=>scene.id));if(!ids.has(parsed.data.sourceSceneId)||!ids.has(parsed.data.targetSceneId))return;const supabase=await createClient();await supabase.from("interior_tour_hotspots").insert({garage_id:session.garageId,tour_id:tour.id,source_scene_id:parsed.data.sourceSceneId,target_scene_id:parsed.data.targetSceneId,label:parsed.data.label,yaw:parsed.data.yaw,pitch:parsed.data.pitch});refresh(vehicleId)}
export async function updateInteriorHotspot(vehicleId:string,hotspotId:string,formData:FormData){const session=await editable();const tour=await getInteriorTour(vehicleId);const current=tour?.hotspots.find(item=>item.id===hotspotId);const parsed=hotspotSchema.safeParse({sourceSceneId:current?.sourceSceneId,targetSceneId:formData.get("targetSceneId"),label:formData.get("label"),yaw:formData.get("yaw"),pitch:formData.get("pitch")});if(!session?.garageId||!tour||!current||!parsed.success)return;const ids=new Set(tour.scenes.filter(scene=>scene.status==="READY").map(scene=>scene.id));if(!ids.has(parsed.data.sourceSceneId)||!ids.has(parsed.data.targetSceneId))return;const supabase=await createClient();await supabase.from("interior_tour_hotspots").update({target_scene_id:parsed.data.targetSceneId,label:parsed.data.label,yaw:parsed.data.yaw,pitch:parsed.data.pitch}).eq("id",hotspotId).eq("tour_id",tour.id).eq("garage_id",session.garageId);refresh(vehicleId)}
export async function deleteInteriorHotspot(vehicleId:string,hotspotId:string){const session=await editable();const tour=await getInteriorTour(vehicleId);if(!session?.garageId||!tour)return;const supabase=await createClient();await supabase.from("interior_tour_hotspots").delete().eq("id",hotspotId).eq("tour_id",tour.id).eq("garage_id",session.garageId);refresh(vehicleId)}
export async function setInteriorTourStatus(vehicleId:string,target:InteriorTourStatus){const session=await editable();const tour=await getInteriorTour(vehicleId);if(!session?.garageId||!tour)return;new InteriorTourEngine().assertTransition(tour.status,target);if(target==="PUBLISHED"&&!new InteriorTourValidationEngine().validate(tour).ready)return;const supabase=await createClient();await supabase.from("interior_tours").update({status:target,is_public:target==="PUBLISHED",published_at:target==="PUBLISHED"?new Date().toISOString():tour.publishedAt}).eq("id",tour.id).eq("garage_id",session.garageId);refresh(vehicleId)}
