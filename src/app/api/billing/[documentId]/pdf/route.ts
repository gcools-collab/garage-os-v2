import { NextResponse } from "next/server"
import { buildBillingPdf, getBillingDocumentBundle } from "@/features/billing"
import { getActiveGarageSession } from "@/features/tenant"

type RouteProps = { params: Promise<{ documentId: string }> }

export async function GET(_request: Request, { params }: RouteProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { documentId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 })
  }

  const bundle = await getBillingDocumentBundle(session, documentId)
  if (!bundle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const pdfBytes = await buildBillingPdf(bundle)
  const filename = `${bundle.document.document_number ?? "brouillon"}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  })
}
