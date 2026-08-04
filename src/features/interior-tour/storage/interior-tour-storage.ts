import type { MediaStorageProvider } from "@/features/media"
export const INTERIOR_TOUR_BUCKET = "vehicle-interior-tours"
export function interiorScenePath(garageId:string,vehicleId:string,tourId:string,sceneId:string,extension:string){return `${garageId}/${vehicleId}/${tourId}/${sceneId}.${extension}`}
export class InteriorTourStorage { constructor(private readonly provider:MediaStorageProvider){} upload(path:string,file:File){return this.provider.upload({bucket:INTERIOR_TOUR_BUCKET,path,body:file,contentType:file.type,upsert:false})} delete(paths:readonly string[]){return this.provider.delete(INTERIOR_TOUR_BUCKET,paths)} }
