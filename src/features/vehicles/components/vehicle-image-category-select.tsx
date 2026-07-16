"use client"

import { useState, useTransition } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateVehicleImageCategory } from "../image-actions"
import {
  vehicleImageCategories,
  vehicleImageCategoryLabels,
  type VehicleImageCategory,
} from "../image-category"

export function VehicleImageCategorySelect({
  imageId,
  category,
}: {
  imageId: string
  category: VehicleImageCategory
}) {
  const [selectedCategory, setSelectedCategory] = useState(category)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <Select
        value={selectedCategory}
        disabled={pending}
        onValueChange={(value) => {
          const previousCategory = selectedCategory
          const nextCategory = value as VehicleImageCategory
          setSelectedCategory(nextCategory)
          setError(null)
          startTransition(async () => {
            const result = await updateVehicleImageCategory(imageId, nextCategory)
            if (!result.success) {
              setSelectedCategory(previousCategory)
              setError(result.message ?? "Modification impossible.")
            }
          })
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-7 max-w-32 border-white/30 bg-black/55 px-2 text-xs text-white shadow-none hover:bg-black/70"
          aria-label="Catégorie de la photo"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {vehicleImageCategories.map((value) => (
            <SelectItem key={value} value={value}>
              {vehicleImageCategoryLabels[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="sr-only" role="alert">{error}</p>}
    </div>
  )
}
