import type { AssetPlaceholderViewModel } from "../types"

export function AssetPlaceholder({
  placeholder,
}: {
  readonly placeholder: AssetPlaceholderViewModel
}) {
  return (
    <div
      role="img"
      aria-label={placeholder.description}
      className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border bg-muted p-6 text-center"
    >
      <p className="font-medium">{placeholder.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{placeholder.description}</p>
    </div>
  )
}
