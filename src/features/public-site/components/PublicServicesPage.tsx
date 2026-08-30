import { Car, CheckCircle2, FileText, Gauge, KeyRound, MapPin, Phone, ShieldCheck, Wrench } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { PublicProgramPageViewModel, PublicServicesPageViewModel } from "../types"
import type { PublicServiceIcon } from "../services"
import { PublicSiteActionLink } from "./PublicSiteActionLink"
import { PublicSiteLayout } from "./PublicSiteLayout"

const icons = {
  CAR: Car,
  KEY: KeyRound,
  FILE: FileText,
  ENGINE: Gauge,
  TOOLS: Wrench,
  SHIELD: ShieldCheck,
} satisfies Readonly<Record<PublicServiceIcon, typeof Car>>

const registrationProcedures = [
  "Carte grise",
  "Cession",
  "Changement d’adresse",
  "Duplicata après perte",
  "Fiche d’identification",
  "Première immatriculation française",
  "WW provisoire",
  "Déclaration d’achat professionnelle",
  "Plaques",
] as const

const plateTariffs = [
  { label: "Aluminium", value: "10 € par plaque" },
  { label: "Provisoire rose", value: "15 €" },
  { label: "Plexiglas", value: "26,60 € par plaque" },
] as const

export function PublicServicesPage({ page }: { readonly page: PublicServicesPageViewModel }) {
  return (
    <PublicSiteLayout garage={page.garage}>
      <main className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">Services</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{page.title}</h1>
          <p className="mt-5 text-lg text-[var(--live-muted-foreground)]">{page.description}</p>
        </header>
        {page.services.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {page.services.map((service) => {
              const Icon = icons[service.icon]
              return (
                <article key={service.id} className="rounded-3xl border border-[var(--live-border)] bg-[var(--live-surface)] p-7">
                  <span className="grid size-12 place-items-center rounded-xl bg-[var(--live-primary)] text-[var(--live-primary-foreground)]"><Icon aria-hidden="true" /></span>
                  <h2 className="mt-6 text-2xl font-semibold">{service.title}</h2>
                  <p className="mt-3 text-[var(--live-muted-foreground)]">{service.description}</p>
                  {service.id === "REGISTRATION" ? (
                    <div className="mt-5 space-y-4">
                      <ul className="grid gap-2 text-sm sm:grid-cols-2">
                        {registrationProcedures.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <dl className="grid gap-2 rounded-2xl border border-[var(--live-border)] p-4 text-sm">
                        {plateTariffs.map((tariff) => (
                          <div key={tariff.label} className="flex items-baseline justify-between gap-3">
                            <dt className="text-[var(--live-muted-foreground)]">{tariff.label}</dt>
                            <dd className="font-medium">{tariff.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                  {service.id === "ENGINE_CLEANING" ? (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl border border-[var(--live-border)] p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--live-primary)]">Décalaminage</h3>
                        <p className="mt-2 text-sm text-[var(--live-muted-foreground)]">Nettoyage préventif du moteur.</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--live-border)] p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--live-primary)]">Diagnostic électronique</h3>
                        <ul className="mt-3 grid gap-2 text-sm">
                          {["Passage de la valise", "Lecture des défauts et voyants", "Effacement lorsque cela est possible", "Remise d’un rapport"].map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                              {item}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-sm text-[var(--live-muted-foreground)]">Un défaut ne peut pas toujours être effacé.</p>
                      </div>
                    </div>
                  ) : null}
                  <Link href={service.href} className="mt-7 inline-flex min-h-11 items-center rounded-xl border border-[var(--live-border-strong)] px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">{service.actionLabel}</Link>
                </article>
              )
            })}
          </div>
        ) : <p className="mt-12 rounded-2xl border p-6 text-[var(--live-muted-foreground)]">Aucun service complémentaire n’est actuellement proposé.</p>}
      </main>
    </PublicSiteLayout>
  )
}

export function PublicProgramPage({ page }: { readonly page: PublicProgramPageViewModel }) {
  const actionClassName = "inline-flex min-h-12 items-center rounded-xl bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
  const secondaryClassName = "inline-flex min-h-12 items-center rounded-xl border border-[var(--live-border-strong)] px-6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
  return (
    <PublicSiteLayout garage={page.garage}>
      <main className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">{page.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{page.title}</h1>
        {page.description ? <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--live-muted-foreground)]">{page.description}</p> : null}

        {page.media ? (
          <figure className="mt-8 overflow-hidden rounded-3xl border border-[var(--live-border)] bg-[var(--live-surface)]">
            <Image src={page.media.src} alt={page.media.alt} width={1600} height={520} className="h-auto w-full object-contain" />
            <figcaption className="px-5 py-3 text-sm text-[var(--live-muted-foreground)]">{page.media.attribution}</figcaption>
          </figure>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <PublicSiteActionLink item={page.action} className={actionClassName} />
          {page.secondaryAction ? <PublicSiteActionLink item={page.secondaryAction} className={secondaryClassName} /> : null}
        </div>

        {page.steps.length ? (
          <section className="mt-12" aria-labelledby="program-steps-heading">
            <h2 id="program-steps-heading" className="text-2xl font-semibold">Comment ça marche</h2>
            <ol className="mt-6 grid gap-5 sm:grid-cols-2">
              {page.steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface)] p-6">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--live-primary)] text-sm font-semibold text-[var(--live-primary-foreground)]">{index + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--live-muted-foreground)]">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {page.benefits.length ? (
          <ul className="mt-8 flex flex-wrap gap-2">
            {page.benefits.map((benefit) => (
              <li key={benefit} className="rounded-full border border-[var(--live-border)] px-3 py-1.5 text-sm font-medium">
                {benefit}
              </li>
            ))}
          </ul>
        ) : null}

        {page.details.length ? (
          <section className="mt-16" aria-labelledby="program-details-heading">
            <h2 id="program-details-heading" className="text-2xl font-semibold">Informations pratiques</h2>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {page.details.map((detail) => (
                <div key={detail.label} className="rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface)] p-5">
                  <dt className="text-sm font-semibold uppercase tracking-wide text-[var(--live-primary)]">{detail.label}</dt>
                  <dd className="mt-2 text-[var(--live-muted-foreground)]">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {page.reassurance.length ? (
          <section className="mt-16" aria-labelledby="program-reassurance-heading">
            <h2 id="program-reassurance-heading" className="text-2xl font-semibold">Nos engagements</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {page.reassurance.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-2xl border border-[var(--live-border)] p-5">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                  <span className="text-sm font-medium leading-6">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.contact.phoneHref || page.contact.address ? (
          <section className="mt-16 rounded-3xl border border-[var(--live-border)] bg-[var(--live-surface)] p-7" aria-labelledby="program-contact-heading">
            <h2 id="program-contact-heading" className="text-xl font-semibold">Nous joindre pour ce service</h2>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {page.contact.phoneHref ? (
                <a href={page.contact.phoneHref} className="flex items-center gap-2 font-medium hover:underline">
                  <Phone className="size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />{page.contact.phoneLabel}
                </a>
              ) : null}
              {page.contact.address ? (
                <span className="flex items-center gap-2 text-[var(--live-muted-foreground)]">
                  <MapPin className="size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />{page.contact.address}
                </span>
              ) : null}
              {page.contact.mapHref ? (
                <a href={page.contact.mapHref} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Obtenir mon itinéraire</a>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </PublicSiteLayout>
  )
}
