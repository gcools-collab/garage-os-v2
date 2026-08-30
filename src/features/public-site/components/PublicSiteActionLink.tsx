import Link from "next/link"
import type { ReactNode } from "react"
import type { PublicNavigationItemViewModel } from "../types"

function isExternalHref(href: string, external?: boolean) {
  return Boolean(external) || /^https?:\/\//i.test(href)
}

function isDirectHref(href: string) {
  return /^(tel:|mailto:)/i.test(href)
}

export function PublicSiteActionLink({
  item,
  className,
  children,
}: {
  readonly item: PublicNavigationItemViewModel
  readonly className: string
  readonly children?: ReactNode
}) {
  const content = children ?? item.label
  if (isDirectHref(item.href)) {
    return <a href={item.href} className={className}>{content}</a>
  }
  if (isExternalHref(item.href, item.external)) {
    return <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
  }
  return <Link href={item.href} className={className}>{content}</Link>
}
