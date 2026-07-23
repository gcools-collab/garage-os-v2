import type { ReactNode } from "react"
import { getGarageConfig, PublicLayout } from "@/features/public"

export default function LiveLayout({ children }: { children: ReactNode }) {
  return (
    <PublicLayout garage={getGarageConfig()}>
      {children}
    </PublicLayout>
  )
}
