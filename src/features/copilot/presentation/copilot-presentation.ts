import type {
  CopilotConversation,
  CopilotConversationListViewModel,
  CopilotConversationViewModel,
  CopilotMessage,
  CopilotMessageViewModel,
  CopilotStructuredResponse,
} from "../types"
import type { CopilotActionProposalViewModel } from "@/features/copilot-actions/types"
import { buildCopilotSuggestions } from "../engine"

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
})

export function buildCopilotMessageViewModel(message: CopilotMessage): CopilotMessageViewModel {
  const payload = message.structuredPayload
  return {
    id: message.id,
    role: message.role === "USER" ? "user" : "assistant",
    text: payload?.answer ?? message.content,
    status: message.status,
    references: payload?.references ?? [],
    actions: payload?.suggestedActions ?? [],
    warnings: payload?.warnings ?? [],
    followUpSuggestions: payload?.followUpSuggestions ?? [],
    createdAtLabel: dateFormatter.format(new Date(message.createdAt)),
    canRetry: message.status === "FAILED",
  }
}

export function buildCopilotConversationViewModel(
  conversation: CopilotConversation | null,
  messages: readonly CopilotMessage[],
  contextGeneratedAt?: string,
  actionProposals: readonly CopilotActionProposalViewModel[] = []
): CopilotConversationViewModel {
  return {
    id: conversation?.id ?? null,
    title: conversation?.title ?? "Nouvelle conversation",
    messages: messages.map(buildCopilotMessageViewModel),
    suggestions: buildCopilotSuggestions(),
    contextGeneratedAtLabel: contextGeneratedAt
      ? `Analyse basée sur les données du garage à ${new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
        }).format(new Date(contextGeneratedAt))}.`
      : null,
    actionProposals,
  }
}

export function buildCopilotConversationListViewModel(
  conversations: readonly CopilotConversation[]
): CopilotConversationListViewModel {
  return {
    conversations: conversations.map((item) => ({
      id: item.id,
      title: item.title ?? "Conversation sans titre",
      href: `/copilot?conversation=${item.id}`,
      dateLabel: dateFormatter.format(new Date(item.lastMessageAt ?? item.createdAt)),
    })),
  }
}

export function toStoredAssistantMessage(
  id: string,
  conversationId: string,
  response: CopilotStructuredResponse,
  createdAt: string
): CopilotMessage {
  return {
    id,
    conversationId,
    role: "ASSISTANT",
    status: "COMPLETED",
    content: response.answer,
    structuredPayload: response,
    createdAt,
  }
}
