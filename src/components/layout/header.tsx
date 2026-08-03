import { LogOut, Settings, UserRound } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/features/auth/actions"
import type { GarageBrandingShellViewModel } from "@/features/branding"
import { NotificationCenter, type NotificationCenterViewModel } from "@/features/notifications"

type DashboardUserViewModel = {
  readonly displayName: string | null
  readonly email: string | null
  readonly garageName: string
  readonly role: string
}

const roleLabels: Readonly<Record<string, string>> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
}

export function Header({
  branding,
  notifications,
  user,
}: {
  readonly branding: GarageBrandingShellViewModel
  readonly notifications: NotificationCenterViewModel
  readonly user: DashboardUserViewModel
}) {
  const identity = user.displayName?.trim() || user.email || "Utilisateur"
  const role = roleLabels[user.role] ?? user.role
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 sm:px-8">
      <h2 className="font-semibold">Tableau de bord</h2>
      <div className="flex min-w-0 items-center gap-2">
        <NotificationCenter center={notifications} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto min-w-0 gap-2 px-2" aria-label="Ouvrir le menu utilisateur">
              <Avatar size="sm">
                {branding.logoUrl ? <AvatarImage src={branding.logoUrl} alt="" /> : null}
                <AvatarFallback>{branding.initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-48 truncate text-sm sm:block">{identity}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="space-y-1">
              <span className="block truncate font-medium text-foreground">{identity}</span>
              {user.email ? <span className="block truncate font-normal">{user.email}</span> : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <p className="truncate">{user.garageName}</p>
              <p>{role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings"><Settings aria-hidden="true" />Paramètres</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <UserRound aria-hidden="true" />Compte connecté
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logout}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-2">
                <LogOut className="size-4" aria-hidden="true" />Déconnexion
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
