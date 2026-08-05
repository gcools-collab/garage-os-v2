export type PublicRouteDiagnostic = {
  readonly route: string
  readonly slug: string | null
  readonly garageId: string | null
  readonly liveSlug: string | null
  readonly activeGarageId: string | null
  readonly serviceCount: number
  readonly repositoryResult: "FOUND" | "NOT_FOUND" | "DEGRADED"
  readonly reason: string
}

export function logPublicRouteDiagnostic(diagnostic: PublicRouteDiagnostic) {
  if (process.env.NODE_ENV !== "development") return
  console.info("Public route diagnostic", diagnostic)
}

