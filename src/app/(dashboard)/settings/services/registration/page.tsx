import Link from "next/link"
import { redirect } from "next/navigation"
import { getRegistrationProcedures, RegistrationProcedureSettings } from "@/features/registration"
import { getActiveGarageSession } from "@/features/tenant"
export default async function RegistrationSettingsPage() { const session = await getActiveGarageSession(); if (!session?.garageId) redirect("/login"); const procedures = await getRegistrationProcedures(session.garageId); return <main className="space-y-6"><header><Link href="/settings/services" className="text-sm underline">Retour aux services</Link><h1 className="mt-3 text-3xl font-semibold">Démarches carte grise</h1><p className="mt-2 text-muted-foreground">Configurez uniquement les démarches et pièces réellement proposées par votre garage.</p></header><RegistrationProcedureSettings procedures={procedures} canEdit={["owner","admin"].includes(session.memberRole ?? "")}/></main> }
