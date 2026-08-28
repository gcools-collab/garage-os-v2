import type { PublicRequestField, PublicRequestType } from "../types"

export type ServiceFormFieldRule = Readonly<{
  readonly include?: readonly string[]
  readonly exclude?: readonly string[]
  readonly overrides?: Readonly<Record<string, Partial<PublicRequestField>>>
}>

const engineCleaning: ServiceFormFieldRule = {
  include: ["vehicle", "reason", "firstName", "lastName", "phone", "email"],
  overrides: {
    vehicle: { label: "Marque et modèle", required: true },
    reason: { label: "Symptôme ou raison", required: false },
    phone: { required: true },
    email: { required: true },
  },
}

const rules: Partial<Readonly<Record<PublicRequestType, ServiceFormFieldRule>>> = {
  ENGINE_CLEANING: engineCleaning,
}

export function applyServiceFormConfig(
  type: PublicRequestType,
  fields: readonly PublicRequestField[],
): readonly PublicRequestField[] {
  const rule = rules[type]
  if (!rule) return fields
  const filtered = fields.filter((field) => {
    if (rule.include?.length) return rule.include.includes(field.name)
    if (rule.exclude?.length) return !rule.exclude.includes(field.name)
    return true
  })
  return filtered.map((field) => ({
    ...field,
    ...rule.overrides?.[field.name],
  }))
}

export function serviceFormRequiresPhoneAndEmail(type: PublicRequestType): boolean {
  return type === "ENGINE_CLEANING"
}
