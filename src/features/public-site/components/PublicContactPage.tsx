import type { PublicContactViewModel } from "../types"
import { PublicSiteLayout } from "./PublicSiteLayout"

export function PublicContactPage({ contact }: { readonly contact: PublicContactViewModel }) {
  return (
    <PublicSiteLayout garage={contact.garage}>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-2 md:px-8">
        <section><h1 className="text-4xl font-semibold">{contact.title}</h1><p className="mt-4 text-[var(--live-muted-foreground)]">{contact.description}</p><div className="mt-8 space-y-3">{contact.phoneHref ? <a className="block underline" href={contact.phoneHref}>{contact.garage.phone}</a> : null}{contact.emailHref ? <a className="block underline" href={contact.emailHref}>{contact.garage.email}</a> : null}</div><div className="mt-8 flex aspect-video items-center justify-center rounded-2xl bg-[var(--live-muted)] text-[var(--live-muted-foreground)]">Carte — {contact.mapLabel}</div></section>
        <section className="rounded-2xl border border-[var(--live-border)] p-6">
          <h2 className="text-2xl font-semibold">Comment pouvons-nous vous aider ?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{contact.journeys.map((journey) => <a key={journey.href} href={journey.href} className="rounded-xl border border-[var(--live-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]">{journey.label}</a>)}</div>
          <form className="mt-8 space-y-5" aria-label="Formulaire de contact">
          <fieldset disabled aria-disabled="true" className="space-y-5 disabled:opacity-60">
            {contact.form.fields.map((field) => <label key={field.name} className="block space-y-2"><span>{field.label}</span>{field.type === "textarea" ? <textarea name={field.name} rows={6} className="w-full rounded-lg border border-[var(--live-border)] bg-transparent p-3" /> : <input name={field.name} type={field.type} className="min-h-11 w-full rounded-lg border border-[var(--live-border)] bg-transparent px-3" />}</label>)}
            <button type="button" disabled aria-disabled="true" title="Formulaire non disponible dans cette version" className="min-h-11 rounded-lg bg-[var(--live-primary)] px-5 text-[var(--live-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60">{contact.form.submitLabel}</button>
          </fieldset>
          <p role="status" className="text-xs text-[var(--live-muted-foreground)]">Le formulaire n’est pas encore disponible. Utilisez le téléphone ou l’e-mail affiché sur cette page.</p>
          </form>
        </section>
      </div>
    </PublicSiteLayout>
  )
}
