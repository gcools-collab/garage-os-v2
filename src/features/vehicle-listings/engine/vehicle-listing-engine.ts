import { createHash } from "node:crypto"
import { LISTING_PROMPT_ID, LISTING_PROMPT_VERSION, VehicleListingPromptBuilder } from "../prompts"
import type { VehicleListingContent, VehicleListingFacts, VehicleListingProvider } from "../types"
import { vehicleListingContentSchema, VehicleListingValidationEngine } from "../validation"

async function withTimeout(value:Promise<unknown>,milliseconds:number){let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([value,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new DOMException("Timeout","TimeoutError")),milliseconds)})])}finally{if(timer)clearTimeout(timer)}}
export class VehicleListingEngine{
 async generate(facts:VehicleListingFacts,provider:VehicleListingProvider|null){
  if(!provider)return{ok:false as const,error:"AI_DISABLED" as const}
  const prompt=new VehicleListingPromptBuilder().build(facts)
  let raw:unknown
  try{raw=await withTimeout(provider.generate({...prompt,timeoutMs:25000}),26000)}catch(error){return{ok:false as const,error:error instanceof DOMException&&error.name==="TimeoutError"?"TIMEOUT" as const:"PROVIDER_ERROR" as const}}
  const parsed=vehicleListingContentSchema.safeParse(raw)
  if(!parsed.success)return{ok:false as const,error:"INVALID_RESPONSE" as const}
  const content:VehicleListingContent=parsed.data
  const validation=new VehicleListingValidationEngine().validate(facts,content)
  if(validation.state==="BLOCKER")return{ok:false as const,error:"FACT_VALIDATION_FAILED" as const,validation}
  return{ok:true as const,content,validation,provider:provider.id,model:provider.model,promptId:LISTING_PROMPT_ID,promptVersion:LISTING_PROMPT_VERSION,hash:createHash("sha256").update(JSON.stringify(content)).digest("hex")}
 }
}
