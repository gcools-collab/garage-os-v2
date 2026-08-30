import Link from "next/link"
import type { PublicStockViewModel } from "../types"
import { PublicSiteLayout } from "./PublicSiteLayout"
import { VehiclePublicCard } from "./VehiclePublicCard"

export function PublicStockPage({ stock }: { readonly stock: PublicStockViewModel }) {
  const filter = (name: string, label: string, options: readonly string[]) => (
    <label className="space-y-1 text-sm"><span>{label}</span><select name={name} defaultValue={String(stock.filters.values[name as keyof typeof stock.filters.values] ?? "")} className="min-h-11 w-full rounded-lg border border-[var(--live-border)] bg-transparent px-3"><option value="">Tous</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  )
  return (
    <PublicSiteLayout garage={stock.garage}>
      <header className="mx-auto max-w-7xl px-5 pb-8 pt-16 md:px-8">
        <h1 className="text-4xl font-semibold">{stock.title}</h1>
        <p className="mt-3 text-[var(--live-muted-foreground)]">{stock.description}</p>
        <nav aria-label="Catégories de véhicules" className="mt-6 flex flex-wrap gap-2">
          {stock.categories.map((category) => (
            <Link
              key={category.id}
              href={category.href}
              aria-current={category.active ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--live-border-strong)] px-4 text-sm font-medium aria-[current=page]:bg-[var(--live-primary)] aria-[current=page]:text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
            >
              {category.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-32 lg:grid-cols-[16rem_1fr] md:px-8 md:pb-28">
        <form action={stock.filters.action} className="grid content-start gap-4 rounded-2xl border border-[var(--live-border)] p-5">
          {stock.filters.values.category ? <input type="hidden" name="category" value={stock.filters.values.category} /> : null}
          {filter("brand", "Marque", stock.filters.brands)}
          {filter("model", "Modèle", stock.filters.models)}
          {filter("fuel", "Énergie", stock.filters.fuels)}
          {filter("gearbox", "Boîte", stock.filters.gearboxes)}
          {filter("bodyType", "Carrosserie", stock.filters.bodyTypes)}
          <label className="space-y-1 text-sm"><span>Prix maximum</span><input name="maxPrice" type="number" min="0" defaultValue={stock.filters.values.maxPrice} className="min-h-11 w-full rounded-lg border border-[var(--live-border)] bg-transparent px-3" /></label>
          <label className="space-y-1 text-sm"><span>Année minimum</span><input name="minYear" type="number" min="1886" defaultValue={stock.filters.values.minYear} className="min-h-11 w-full rounded-lg border border-[var(--live-border)] bg-transparent px-3" /></label>
          <label className="space-y-1 text-sm"><span>Kilométrage maximum</span><input name="maxMileage" type="number" min="0" defaultValue={stock.filters.values.maxMileage} className="min-h-11 w-full rounded-lg border border-[var(--live-border)] bg-transparent px-3" /></label>
          <button className="min-h-11 rounded-lg bg-[var(--live-primary)] px-4 text-[var(--live-primary-foreground)]">Appliquer</button>
        </form>
        <section aria-label="Résultats" className="space-y-6">
          <div className="flex items-center justify-between gap-4"><p>{stock.resultLabel}</p><form action={stock.filters.action}>{stock.filters.values.category ? <input type="hidden" name="category" value={stock.filters.values.category} /> : null}<select name="sort" defaultValue={stock.filters.values.sort ?? "newest"} aria-label="Trier" className="min-h-11 rounded-lg border border-[var(--live-border)] bg-transparent px-3"><option value="newest">Plus récents</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="year-desc">Année</option><option value="mileage-asc">Kilométrage</option></select></form></div>
          {stock.emptyMessage ? <p className="rounded-2xl border border-[var(--live-border)] p-8">{stock.emptyMessage}</p> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{stock.vehicles.map((vehicle) => <VehiclePublicCard key={vehicle.id} vehicle={vehicle} />)}</div>}
          <nav aria-label="Pagination" className="flex justify-between">{stock.pagination.previousHref ? <Link href={stock.pagination.previousHref}>Précédent</Link> : <span />}{stock.pagination.nextHref ? <Link href={stock.pagination.nextHref}>Suivant</Link> : null}</nav>
        </section>
      </div>
    </PublicSiteLayout>
  )
}
