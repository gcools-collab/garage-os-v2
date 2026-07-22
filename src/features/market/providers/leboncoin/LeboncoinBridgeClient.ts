import { z } from "zod"

import type { LeboncoinClient, LeboncoinListing, LeboncoinSearchRequest } from "./types"

const attributeSchema = z.object({
  key: z.string(), keyLabel: z.string().nullable().default(null),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable().transform((value) => value === null ? null : String(value)),
  valueLabel: z.string().nullable().default(null), values: z.array(z.string()).default([]), valuesLabel: z.array(z.string()).default([]),
})
const listingSchema: z.ZodType<LeboncoinListing> = z.object({
  id: z.string(), subject: z.string(), body: z.string().nullable(), brand: z.string().nullable(), model: z.string().nullable().default(null), url: z.string(),
  price: z.number().nullable(), images: z.array(z.string()), attributes: z.record(z.string(), attributeSchema),
  location: z.object({ city: z.string().nullable(), cityLabel: z.string().nullable(), zipcode: z.string().nullable(), departmentName: z.string().nullable(), regionName: z.string().nullable() }).nullable(),
  ownerType: z.enum(["professional", "private", "unknown"]), firstPublicationDate: z.string().nullable(), favoriteCount: z.number().int().nonnegative().nullable(),
})

export class LeboncoinBridgeClient implements LeboncoinClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly timeoutMs = 15_000) {}

  private async request(path: string, body: object): Promise<unknown> {
    const targetUrl = `${this.baseUrl.replace(/\/$/, "")}${path}`
    const response = await fetch(targetUrl, {
      method: "POST", headers: { "Content-Type": "application/json", "X-Internal-Api-Key": this.apiKey },
      body: JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs), cache: "no-store",
    })
    const rawResponse = await response.text()
    let payload: unknown = null
    try {
      payload = rawResponse ? JSON.parse(rawResponse) : null
    } catch (error) {
      console.error("Market bridge returned invalid JSON", {
        provider: "leboncoin",
        operation: path,
        status: response.status,
        errorType: error instanceof Error ? error.constructor.name : "UnknownError",
      })
    }
    if (!response.ok) {
      console.error("Market bridge request failed", {
        provider: "leboncoin",
        operation: path,
        status: response.status,
      })
      const message = z.object({ error: z.object({ message: z.string() }) }).safeParse(payload)
      throw new Error(message.success ? message.data.error.message : `Le bridge Leboncoin a répondu avec le statut ${response.status}.`)
    }
    return payload
  }

  async search(request: LeboncoinSearchRequest): Promise<LeboncoinListing[]> {
    const payload = await this.request("/search", {
      brand: request.brand, model: request.model, min_price: request.price?.[0], max_price: request.price?.[1],
      min_year: request.registrationYear?.[0], max_year: request.registrationYear?.[1],
      min_mileage: request.mileage?.[0], max_mileage: request.mileage?.[1], fuel: request.fuel,
      gearbox: request.gearbox, limit: Math.min(request.limit ?? 20, 35),
    })
    return z.array(listingSchema).parse(payload)
  }

  async getListing(listingId: string): Promise<LeboncoinListing> {
    return listingSchema.parse(await this.request("/listing", { url: `https://www.leboncoin.fr/ad/voitures/${listingId}` }))
  }
}
