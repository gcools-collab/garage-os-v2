import"server-only"
import{OpenAiCompatibleCopilotProvider}from"@/features/copilot/providers/openai-compatible-provider"
import{OpenAiCompatibleListingProvider}from"../providers"
import type{VehicleListingProvider}from"../types"
export function createVehicleListingProvider():VehicleListingProvider|null{if(process.env.LISTING_AI_ENABLED!=="true")return null;const key=process.env.LISTING_AI_API_KEY?.trim()||process.env.COPILOT_API_KEY?.trim(),model=process.env.LISTING_AI_MODEL?.trim()||process.env.COPILOT_MODEL?.trim(),url=process.env.LISTING_AI_API_URL?.trim()||process.env.COPILOT_API_URL?.trim();if(!key||!model)return null;return new OpenAiCompatibleListingProvider(model,new OpenAiCompatibleCopilotProvider(key,model,url))}
