export type PayPlugConfig = Readonly<{
  enabled: boolean
  mode: "test"
  secretKey: string
  apiUrl: string
  apiVersion: string
}>

export function getPayPlugConfig(env: Readonly<Record<string, string | undefined>> = process.env): PayPlugConfig {
  const requestedMode = env.PAYPLUG_MODE?.trim()
  if (requestedMode !== "test") throw new Error(requestedMode === "live" ? "PAYPLUG_LIVE_DISABLED" : "PAYPLUG_MODE_REQUIRED")
  return {
    enabled: env.PAYPLUG_ENABLED === "true",
    mode: "test",
    secretKey: env.PAYPLUG_TEST_KEY ?? "",
    apiUrl: env.PAYPLUG_API_URL ?? "https://api.payplug.com",
    apiVersion: env.PAYPLUG_API_VERSION ?? "2019-08-06",
  }
}

export function validatePayPlugConfig(config: PayPlugConfig): void {
  if (!config.enabled) throw new Error("PAYPLUG_DISABLED")
  if (!config.secretKey) throw new Error("PAYPLUG_TEST_KEY_MISSING")
  if (!config.secretKey.startsWith("sk_test_")) throw new Error("PAYPLUG_TEST_KEY_INVALID")
  if (!config.apiUrl.startsWith("https://")) throw new Error("PAYPLUG_HTTPS_REQUIRED")
}

export class PayPlugClient {
  constructor(private readonly config = getPayPlugConfig(), private readonly request: typeof fetch = fetch) {
    validatePayPlugConfig(config)
  }

  async call(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.request(`${this.config.apiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.config.secretKey}`, "PayPlug-Version": this.config.apiVersion, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`PAYPLUG_HTTP_${response.status}`)
    return response.json() as Promise<unknown>
  }
}
