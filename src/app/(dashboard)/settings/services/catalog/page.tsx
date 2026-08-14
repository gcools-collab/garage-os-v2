import Link from "next/link"
import { redirect } from "next/navigation"
import { getActiveGarageSession } from "@/features/tenant"
import { getServiceCatalog,ServiceCatalogSettings } from "@/features/service-catalog"
export default async function ServiceCatalogPage(){const session=await getActiveGarageSession();if(!session?.garageId)redirect("/login");const catalog=await getServiceCatalog(session.garageId);return <main className="mx-auto max-w-5xl space-y-8 pb-8"><header><Link href="/settings/services" className="text-sm underline">Retour aux services</Link><h1 className="mt-3 text-3xl font-semibold">Catalogue de prestations</h1><p className="mt-2 text-muted-foreground">Configurez les prestations réellement réservables et leurs conditions commerciales.</p></header><ServiceCatalogSettings {...catalog} canEdit={session.memberRole==="owner"||session.memberRole==="admin"}/></main>}
