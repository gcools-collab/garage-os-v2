import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function AppShell({
  children,
}: {
  children: React.ReactNode
}) {

  return (

    <div className="flex min-h-screen">

      <Sidebar />

      <main className="flex-1">

        <Header />

        <div className="p-6">
          {children}
        </div>

      </main>

    </div>

  )

}