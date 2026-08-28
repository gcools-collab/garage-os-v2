import Link from "next/link"
import { redirect } from "next/navigation"

import {
  buildCustomerListItems,
  CustomerList,
  getCustomerDirectory,
  getCustomerDirectorySummaries,
  getCustomersByIds,
  searchCustomersByRegistration,
} from "@/features/customers"
import { getActiveGarageSession } from "@/features/tenant"

type CustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")

  const params = await searchParams
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
  const q = first(params.q)?.trim().slice(0, 100) || undefined
  const sort = first(params.sort)
  const page = Math.max(1, Number(first(params.page)) || 1)

  let directory = await getCustomerDirectory(session, {
    q,
    sort: sort === "name" || sort === "activity" ? sort : "recent",
    page,
  })

  let customers = directory.customers
  let summaries = directory.summaries
  if (q && customers.length === 0) {
    const registrationMatches = await searchCustomersByRegistration(session.garageId, q)
    if (registrationMatches.length > 0) {
      customers = await getCustomersByIds(session, registrationMatches)
      summaries = await getCustomerDirectorySummaries(session.garageId, customers.map((item) => item.id))
      directory = { ...directory, customers, summaries, total: customers.length, page: 1 }
    }
  }

  const items = buildCustomerListItems(customers, summaries)
  const pageCount = Math.max(1, Math.ceil(directory.total / directory.pageSize))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-2 text-muted-foreground">
            {directory.total} client{directory.total > 1 ? "s" : ""} · vue CRM unifiée
          </p>
        </div>
        <Link href="/customers/new" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-primary-foreground">
          Nouveau client
        </Link>
      </header>

      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_12rem_auto]">
        <input name="q" defaultValue={q} placeholder="Nom, e-mail, téléphone, immatriculation…" className="min-h-11 rounded-md border px-3" />
        <select name="sort" defaultValue={sort ?? "recent"} className="min-h-11 rounded-md border px-3">
          <option value="recent">Plus récents</option>
          <option value="activity">Activité récente</option>
          <option value="name">Nom A→Z</option>
        </select>
        <button className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">Rechercher</button>
      </form>

      <CustomerList customers={items} />

      {pageCount > 1 ? (
        <nav className="flex justify-between text-sm">
          {directory.page > 1 ? <Link href={`/customers?page=${directory.page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>Précédent</Link> : <span />}
          {directory.page < pageCount ? <Link href={`/customers?page=${directory.page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>Suivant</Link> : null}
        </nav>
      ) : null}
    </div>
  )
}
