import { redirect } from "next/navigation"

import {
  buildCopilotConversationListViewModel,
  buildCopilotConversationViewModel,
  CopilotConversationPanel,
  getCopilotConversation,
  listCopilotConversations,
} from "@/features/copilot"
import { getActiveGarageSession } from "@/features/tenant"

export default async function CopilotPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly conversation?: string }>
}) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const params = await searchParams
  const conversations = await listCopilotConversations(session)
  const selected = params.conversation
    ? await getCopilotConversation(session, params.conversation)
    : null
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Copilote Garage OS</h1>
        <p className="mt-2 text-muted-foreground">Posez vos questions sur votre stock, vos prospects et vos priorités.</p>
      </header>
      <CopilotConversationPanel
        initialConversation={buildCopilotConversationViewModel(selected?.conversation ?? null, selected?.messages ?? [])}
        conversationList={buildCopilotConversationListViewModel(conversations)}
      />
    </div>
  )
}
