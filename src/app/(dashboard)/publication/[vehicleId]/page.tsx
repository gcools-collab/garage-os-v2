import { notFound } from "next/navigation"

import {
  PublicationWorkspace,
  PublicationWorkspaceBuilder,
} from "@/features/publication"
import { getPublicationWorkspaceSource } from "@/features/publication/repositories"

export default async function PublicationWorkspacePage({
  params,
}: {
  readonly params: Promise<{ vehicleId: string }>
}) {
  const { vehicleId } = await params
  const source = await getPublicationWorkspaceSource(vehicleId)
  if (!source) notFound()

  const workspace = new PublicationWorkspaceBuilder().build(source)
  return <PublicationWorkspace workspace={workspace} />
}
