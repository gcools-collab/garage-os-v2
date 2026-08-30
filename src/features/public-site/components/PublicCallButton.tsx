import { Phone } from "lucide-react"

export function PublicCallButton({
  href,
  className,
  children = "Nous appeler",
}: {
  readonly href: string
  readonly className: string
  readonly children?: string
}) {
  return (
    <a href={href} className={className}>
      <Phone className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
      <span>{children}</span>
    </a>
  )
}
