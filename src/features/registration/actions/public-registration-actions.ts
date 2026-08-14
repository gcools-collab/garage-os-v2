"use server"
import { revalidatePath } from "next/cache"
import { uploadPublicRegistrationDocument } from "../storage"
export type PublicRegistrationUploadState = Readonly<{ status:"idle"|"success"|"error";message:string }>
export async function uploadRegistrationDocument(_state:PublicRegistrationUploadState,formData:FormData):Promise<PublicRegistrationUploadState>{const file=formData.get("file");if(!(file instanceof File))return{status:"error",message:"Sélectionnez un fichier."};const garageSlug=String(formData.get("garageSlug")??"");const token=String(formData.get("token")??"");const result=await uploadPublicRegistrationDocument({garageSlug,token,requirementId:String(formData.get("requirementId")??""),file});if(result.ok)revalidatePath(`/g/${garageSlug}/registration/${token}`);return{status:result.ok?"success":"error",message:result.message}}
