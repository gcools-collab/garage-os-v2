"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { analyzeVehicle360MediaQuality } from "../actions"
import type { MediaQualityViewModel } from "../presentation"
import { MediaQualityReportCard } from "./MediaQualityReportCard"

export function MediaAiAnalysisPanel({ vehicleId }: { readonly vehicleId: string }) {
  const [report, setReport] = useState<MediaQualityViewModel | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  return <div className="space-y-4"><Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(async () => { const result = await analyzeVehicle360MediaQuality(vehicleId); if (result.success) { setReport(result.report); setMessage(null) } else setMessage(result.message) })}>{pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}{pending ? "Analyse en cours…" : "Analyser avec l’assistant média"}</Button>{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}{report ? <MediaQualityReportCard report={report} /> : null}</div>
}
