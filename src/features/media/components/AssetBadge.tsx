export function AssetBadge({ label }: { readonly label: string }) {
  return (
    <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
      {label}
    </span>
  )
}
