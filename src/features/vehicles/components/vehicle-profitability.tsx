import type { VehicleProfitability } from "../utils"

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export function VehicleProfitabilityCard({
  purchasePrice,
  sellingPrice,
  profitability,
}: {
  purchasePrice: number
  sellingPrice: number | null
  profitability: VehicleProfitability
}) {
  const rows = [
    ["Prix d’achat", currency.format(purchasePrice)],
    ["Frais engagés", currency.format(profitability.totalCosts)],
    ["Capital investi", currency.format(profitability.capitalInvested)],
    ["Prix de vente affiché", sellingPrice == null ? "Non renseigné" : currency.format(sellingPrice)],
  ] as const

  return (
    <article className="rounded-xl border bg-white p-6 ring-1 ring-primary/5">
      <h2 className="mb-5 text-lg font-semibold">Rentabilité</h2>
      <dl className="space-y-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="font-semibold">Marge potentielle</dt>
            <dd
              className={
                profitability.potentialMargin == null
                  ? "text-xl font-bold text-muted-foreground"
                  : profitability.potentialMargin >= 0
                    ? "text-xl font-bold text-emerald-600"
                    : "text-xl font-bold text-red-600"
              }
            >
              {profitability.potentialMargin == null
                ? "Non renseignée"
                : currency.format(profitability.potentialMargin)}
            </dd>
          </div>
        </div>
      </dl>
    </article>
  )
}
