import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  addLeadNote,
  assignLead,
  assignLeadToCurrentUser,
  closeCommercialLead,
  createCommercialTask,
  logLeadCall,
  logLeadEmail,
  updateCommercialTaskStatus,
} from "../actions"
import { COMMERCIAL_TASK_TYPES, LEAD_LOSS_REASONS, type CommercialLeadWorkspaceViewModel } from "../types"
import { commercialTaskTypeLabels, leadLossReasonLabels } from "../presentation"

export function CommercialLeadWorkspace({
  workspace,
}: {
  readonly workspace: CommercialLeadWorkspaceViewModel
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Prochaine action</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2"><Badge>{workspace.nextAction.priorityLabel}</Badge><span className="font-medium">{workspace.nextAction.label}</span></div>
          <p className="text-sm text-muted-foreground">{workspace.nextAction.reason}{workspace.nextAction.dueLabel ? ` · ${workspace.nextAction.dueLabel}` : ""}</p>
          <p className="text-sm">Responsable : {workspace.assignedUserLabel}</p>
          <div className="flex flex-wrap gap-2">
            <form action={assignLeadToCurrentUser}><input type="hidden" name="leadId" value={workspace.leadId} /><Button size="sm">Prendre en charge</Button></form>
            <form action={assignLead} className="flex gap-2">
              <input type="hidden" name="leadId" value={workspace.leadId} />
              <select name="assignedUserId" defaultValue={workspace.assignedUserId ?? ""} className="min-h-8 rounded-md border bg-background px-2 text-sm" aria-label="Attribuer à">
                <option value="" disabled>Attribuer à…</option>
                {workspace.members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
              </select>
              <Button size="sm" variant="outline">Attribuer</Button>
            </form>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Journaliser un contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <form action={logLeadCall} className="grid gap-2">
            <input type="hidden" name="leadId" value={workspace.leadId} />
            <label className="text-sm font-medium">Résultat de l’appel
              <select name="outcome" className="mt-1 min-h-9 w-full rounded-md border bg-background px-2">
                <option value="ANSWERED">A répondu</option><option value="NO_ANSWER">Sans réponse</option><option value="MESSAGE_LEFT">Message laissé</option>
              </select>
            </label>
            <input name="note" placeholder="Note facultative" className="min-h-9 rounded-md border px-3" />
            <Button size="sm">Enregistrer l’appel</Button>
          </form>
          <form action={logLeadEmail} className="grid gap-2">
            <input type="hidden" name="leadId" value={workspace.leadId} />
            <input type="hidden" name="outcome" value="SENT" />
            <label className="text-sm font-medium">Objet
              <input name="subject" className="mt-1 min-h-9 w-full rounded-md border px-3" />
            </label>
            <input name="note" placeholder="Note facultative" className="min-h-9 rounded-md border px-3" />
            <Button size="sm" variant="outline">Enregistrer l’e-mail</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Tâches commerciales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {workspace.tasks.length ? workspace.tasks.map((task) => (
            <div key={task.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{task.title}</p><Badge variant="outline">{task.statusLabel}</Badge></div>
              <p className="text-sm text-muted-foreground">{task.dueLabel ?? "Sans échéance"} · {task.assigneeLabel}</p>
              {!["Terminée", "Annulée"].includes(task.statusLabel) ? (
                <form action={updateCommercialTaskStatus} className="mt-2 flex gap-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <select name="status" className="min-h-8 rounded-md border bg-background px-2 text-sm" aria-label="Nouveau statut">
                    <option value="IN_PROGRESS">Commencer</option><option value="COMPLETED">Terminer</option><option value="CANCELLED">Annuler</option>
                  </select>
                  <Button size="sm" variant="outline">Appliquer</Button>
                </form>
              ) : null}
            </div>
          )) : <p className="text-muted-foreground">Aucune tâche ouverte.</p>}
          <form action={createCommercialTask} className="grid gap-2 border-t pt-4">
            <input type="hidden" name="leadId" value={workspace.leadId} />
            <label className="text-sm font-medium">Type
              <select name="type" className="mt-1 min-h-9 w-full rounded-md border bg-background px-2">{COMMERCIAL_TASK_TYPES.map((type) => <option key={type} value={type}>{commercialTaskTypeLabels[type]}</option>)}</select>
            </label>
            <input name="title" required maxLength={160} placeholder="Action à réaliser" className="min-h-9 rounded-md border px-3" />
            <label className="text-sm font-medium">Échéance<input name="dueAt" type="datetime-local" required className="mt-1 min-h-9 w-full rounded-md border px-3" /></label>
            <Button size="sm">Créer la tâche</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Notes internes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form action={addLeadNote} className="grid gap-2">
            <input type="hidden" name="leadId" value={workspace.leadId} />
            <label className="text-sm font-medium">Nouvelle note<textarea name="content" required maxLength={4000} rows={3} className="mt-1 w-full rounded-md border p-3" /></label>
            <Button size="sm">Ajouter la note</Button>
          </form>
          {workspace.notes.map((note) => <div key={note.id} className="rounded-lg bg-muted/60 p-3"><p>{note.content}</p><p className="mt-2 text-xs text-muted-foreground">{note.authorLabel} · {note.dateLabel}</p></div>)}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Clôturer le prospect</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <form action={closeCommercialLead}><input type="hidden" name="leadId" value={workspace.leadId} /><input type="hidden" name="outcome" value="WON" /><Button className="w-full">Marquer comme gagné</Button></form>
          <form action={closeCommercialLead} className="grid gap-2">
            <input type="hidden" name="leadId" value={workspace.leadId} /><input type="hidden" name="outcome" value="LOST" />
            <label className="text-sm font-medium">Raison de perte<select name="lossReason" required className="mt-1 min-h-9 w-full rounded-md border bg-background px-2">{LEAD_LOSS_REASONS.map((reason) => <option key={reason} value={reason}>{leadLossReasonLabels[reason]}</option>)}</select></label>
            <input name="lossNote" maxLength={1000} placeholder="Précision si nécessaire" className="min-h-9 rounded-md border px-3" />
            <Button variant="destructive">Marquer comme perdu</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
