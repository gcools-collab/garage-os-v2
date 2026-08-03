"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login } from "./actions"
import { initialLoginState } from "./state"

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialLoginState)
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-describedby="email-error" />
        <p id="email-error" className="text-sm text-destructive">{state.fieldErrors?.email?.[0]}</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-describedby="password-error" />
        <p id="password-error" className="text-sm text-destructive">{state.fieldErrors?.password?.[0]}</p>
      </div>
      {state.message ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Nouveau sur Garage OS ?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Créer un compte
        </Link>
      </p>
    </form>
  )
}
