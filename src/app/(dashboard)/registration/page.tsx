import Link from "next/link"
import { redirect } from "next/navigation"
import { buildRegistrationCaseViewModel, getRegistrationCases, RegistrationCaseList } from "@/features/registration"
import { getActiveGarageSession } from "@/features/tenant"
export default async function RegistrationPage() { const session = await getActiveGarageSession(); if (!session?.garageId) redirect("/login"); const cases = (await getRegistrationCases(session.garageId)).map(buildRegistrationCaseViewModel); return <main className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold">Dossiers</h1><p className="mt-2 text-muted-foreground">Suivez les démarches carte grise et les pièces transmises.</p></div><Link href="/customers" className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium">Créer via un client</Link></header><RegistrationCaseList cases={cases}/></main> }
