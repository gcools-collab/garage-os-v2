import { redirect } from "next/navigation"
import { buildRegistrationCaseViewModel, getRegistrationCases, RegistrationCaseList } from "@/features/registration"
import { getActiveGarageSession } from "@/features/tenant"
export default async function RegistrationPage() { const session = await getActiveGarageSession(); if (!session?.garageId) redirect("/login"); const cases = (await getRegistrationCases(session.garageId)).map(buildRegistrationCaseViewModel); return <main className="space-y-6"><header><h1 className="text-3xl font-semibold">Dossiers</h1><p className="mt-2 text-muted-foreground">Suivez les démarches carte grise et les pièces transmises.</p></header><RegistrationCaseList cases={cases}/></main> }
