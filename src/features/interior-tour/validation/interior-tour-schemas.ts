import { z } from "zod"
export const sceneUpdateSchema=z.object({name:z.string().trim().min(1).max(80),initialYaw:z.coerce.number().min(-180).max(180),initialPitch:z.coerce.number().min(-90).max(90),initialFov:z.coerce.number().min(30).max(120)})
export const hotspotSchema=z.object({sourceSceneId:z.string().uuid(),targetSceneId:z.string().uuid(),label:z.string().trim().min(1).max(80),yaw:z.coerce.number().min(-180).max(180),pitch:z.coerce.number().min(-90).max(90)}).refine(value=>value.sourceSceneId!==value.targetSceneId,{message:"Les scènes doivent être différentes."})
