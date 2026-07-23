export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <header className="max-w-2xl">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--live-muted-foreground)]">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-4 text-3xl font-[var(--live-heading-weight)] tracking-[-0.03em] text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-7 text-[var(--live-muted-foreground)]">
          {description}
        </p>
      )}
    </header>
  )
}
