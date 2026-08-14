"use client"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { uploadRegistrationDocument,type PublicRegistrationUploadState } from "../actions/public-registration-actions"
const initial:PublicRegistrationUploadState={status:"idle",message:""}
function Submit(){const{pending}=useFormStatus();return <button disabled={pending} className="rounded-md bg-[var(--live-primary)] px-4 py-2 text-sm font-semibold text-[var(--live-primary-foreground)] disabled:opacity-60">{pending?"Transmission…":"Ajouter un document"}</button>}
export function PublicRegistrationUpload({garageSlug,token,requirementId}:{readonly garageSlug:string;readonly token:string;readonly requirementId:string}){const[state,action]=useActionState(uploadRegistrationDocument,initial);return <form action={action} className="mt-3 flex flex-wrap items-center gap-3"><input type="hidden" name="garageSlug" value={garageSlug}/><input type="hidden" name="token" value={token}/><input type="hidden" name="requirementId" value={requirementId}/><input type="file" name="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="max-w-full text-sm"/><Submit/>{state.message?<p aria-live="polite" className="w-full text-sm">{state.message}</p>:null}</form>}
