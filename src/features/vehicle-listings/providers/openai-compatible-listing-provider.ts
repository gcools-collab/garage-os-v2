import"server-only"
import{OpenAiCompatibleCopilotProvider}from"@/features/copilot/providers/openai-compatible-provider"
import type{VehicleListingProvider}from"../types"
export class OpenAiCompatibleListingProvider implements VehicleListingProvider{readonly id="openai-compatible";constructor(readonly model:string,private readonly provider:OpenAiCompatibleCopilotProvider){}async generate(input:Parameters<VehicleListingProvider["generate"]>[0]){const result=await this.provider.generateResponse({systemPrompt:input.systemPrompt,messages:[],context:input.factsJson,responseSchema:input.responseSchema,temperature:0.25,maxTokens:5000,timeoutMs:input.timeoutMs});return result.structuredResponse}}
