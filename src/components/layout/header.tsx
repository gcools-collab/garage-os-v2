import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { GarageBrandingShellViewModel } from "@/features/branding"

export function Header({ branding }: { readonly branding: GarageBrandingShellViewModel }) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 sm:px-8">
      <h2 className="font-semibold">Tableau de bord</h2>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar size="sm">
          {branding.logoUrl ? <AvatarImage src={branding.logoUrl} alt="" /> : null}
          <AvatarFallback>{branding.initials}</AvatarFallback>
        </Avatar>
        <span className="max-w-48 truncate text-sm text-muted-foreground" title={branding.displayName}>
          {branding.displayName}
        </span>
      </div>
    </header>
  )
}
