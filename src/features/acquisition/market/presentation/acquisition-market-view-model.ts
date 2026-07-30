export interface AcquisitionMarketViewModel {
  readonly title: string
  readonly description: string
  readonly available: boolean
  readonly metrics: readonly {
    readonly label: string
    readonly value: string
  }[]
  readonly signals: readonly {
    readonly code: string
    readonly label: string
    readonly explanation: string
    readonly tone: "positive" | "warning" | "neutral"
  }[]
  readonly comparables: readonly {
    readonly id: string
    readonly source: string
    readonly price: string
    readonly details: string
    readonly location: string
    readonly href: string | null
    readonly dataQuality: string
    readonly similarity: string
    readonly explanation: string
  }[]
  readonly emptyMessage: string | null
}
