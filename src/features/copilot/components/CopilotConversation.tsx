"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Archive, Bot, Plus, Send, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CopilotActionProposalCard } from "@/features/copilot-actions/components"
import {
  archiveCopilotConversation,
  createCopilotConversation,
  sendCopilotMessage,
} from "../actions"
import type {
  CopilotConversationListViewModel,
  CopilotConversationViewModel,
  CopilotMessageViewModel,
} from "../types"

function Message({ message }: { readonly message: CopilotMessageViewModel }) {
  const assistant = message.role === "assistant"
  return (
    <article className={`flex gap-3 ${assistant ? "" : "justify-end"}`} aria-label={assistant ? "Réponse du Copilote" : "Votre question"}>
      {assistant ? <Bot className="mt-2 size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
      <div className={`max-w-3xl rounded-2xl px-4 py-3 ${assistant ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
        {message.references.length ? (
          <div className="mt-3 border-t pt-3">
            <p className="mb-2 text-xs font-medium">Sources Garage OS</p>
            <div className="flex flex-wrap gap-2">
              {message.references.map((reference) => (
                <Link key={`${reference.entityType}-${reference.entityId}`} href={reference.href} className="rounded-md border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent">
                  {reference.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {message.actions.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <Button key={`${action.type}-${action.href}`} asChild size="sm" variant="outline">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        ) : null}
        {message.warnings.map((warning) => <p key={warning} className="mt-2 text-xs opacity-80">{warning}</p>)}
        <p className="mt-2 text-[11px] opacity-60">{message.createdAtLabel}</p>
      </div>
      {!assistant ? <UserRound className="mt-2 size-5 shrink-0" aria-hidden="true" /> : null}
    </article>
  )
}

export function CopilotConversationPanel({
  initialConversation,
  conversationList,
}: {
  readonly initialConversation: CopilotConversationViewModel
  readonly conversationList: CopilotConversationListViewModel
}) {
  const router = useRouter()
  const [conversation, setConversation] = useState(initialConversation)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function newConversation() {
    startTransition(async () => {
      const result = await createCopilotConversation()
      if (result.success) router.push(`/copilot?conversation=${result.conversationId}`)
      else setError(result.error)
    })
  }

  function submit(question = message) {
    if (!conversation.id || !question.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await sendCopilotMessage({ conversationId: conversation.id, message: question })
      if (!result.success) {
        setError(result.error)
        return
      }
      if (result.message) {
        const assistantMessage = result.message
        setConversation((current) => ({
          ...current,
          messages: [
            ...current.messages,
            {
              id: `local-${Date.now()}`,
              role: "user",
              text: question,
              status: "COMPLETED",
              references: [],
              actions: [],
              warnings: [],
              followUpSuggestions: [],
              createdAtLabel: "À l’instant",
              canRetry: false,
            },
            assistantMessage,
          ],
        }))
      }
      if (result.actionProposals?.length) {
        const proposals = result.actionProposals
        setConversation((current) => ({
          ...current,
          actionProposals: [...current.actionProposals, ...proposals],
        }))
      }
      setMessage("")
    })
  }

  function archive() {
    if (!conversation.id) return
    startTransition(async () => {
      const result = await archiveCopilotConversation(conversation.id!)
      if (result.success) router.push("/copilot")
      else setError(result.error)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Button onClick={newConversation} disabled={pending} className="w-full">
          <Plus aria-hidden="true" /> Nouvelle conversation
        </Button>
        <nav aria-label="Conversations récentes" className="space-y-1">
          {conversationList.conversations.map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
              <span className="block truncate font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.dateLabel}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <Card className="min-h-[36rem]">
        <CardContent className="flex min-h-[36rem] flex-col gap-5 pt-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-semibold">{conversation.title}</h2>
              {conversation.contextGeneratedAtLabel ? <p className="text-xs text-muted-foreground">{conversation.contextGeneratedAtLabel}</p> : null}
            </div>
            {conversation.id ? <Button variant="ghost" size="sm" onClick={archive} disabled={pending}><Archive aria-hidden="true" /> Archiver</Button> : null}
          </div>
          <div className="flex-1 space-y-5" aria-live="polite">
            {conversation.messages.length
              ? conversation.messages.map((item) => <Message key={item.id} message={item} />)
              : <p className="py-10 text-center text-sm text-muted-foreground">Posez votre première question au Copilote Garage OS.</p>}
            {conversation.actionProposals.map((proposal) => (
              <CopilotActionProposalCard key={proposal.id} initialProposal={proposal} />
            ))}
          </div>
          {!conversation.id ? (
            <Button onClick={newConversation} disabled={pending} className="self-center">Démarrer une conversation</Button>
          ) : (
            <div className="space-y-3 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                {conversation.suggestions.slice(0, 4).map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => submit(suggestion)} disabled={pending} className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted">
                    {suggestion}
                  </button>
                ))}
              </div>
              <label htmlFor="copilot-message" className="sr-only">Votre question</label>
              <div className="flex items-end gap-2">
                <textarea id="copilot-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={3} disabled={pending} placeholder="Posez une question sur votre garage…" className="min-h-20 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <Button onClick={() => submit()} disabled={pending || message.trim().length < 2}>
                  <Send aria-hidden="true" /> {pending ? "Analyse…" : "Envoyer"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{message.length}/2000 — Le Copilote propose des actions, mais ne modifie aucune donnée.</p>
            </div>
          )}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
