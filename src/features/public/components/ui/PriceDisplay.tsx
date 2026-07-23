export function formatPrice(price: number | undefined) {
  if (price === undefined || !Number.isFinite(price)) return "Prix sur demande"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price)
}

export function PriceDisplay({ price }: { price?: number }) {
  return (
    <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
      {formatPrice(price)}
    </p>
  )
}
