import { z } from "zod"

const currentYear = new Date().getFullYear()

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : value,
    z.string().trim().max(maxLength).optional()
  )

const optionalInteger = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(minimum).max(maximum).optional()
  )

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .date("La date de première mise en circulation est invalide.")
    .refine(
      (value) => new Date(`${value}T00:00:00`).getTime() <= Date.now(),
      "La date de première mise en circulation ne peut pas être future."
    )
    .optional()
)

export const vehicleSchema = z
  .object({
    brand: z.string().trim().min(1, "La marque est obligatoire.").max(80),
    model: z.string().trim().min(1, "Le modèle est obligatoire.").max(80),
    year: z.coerce
      .number()
      .int()
      .min(1886, "L'année est invalide.")
      .max(currentYear + 1, "L'année ne peut pas dépasser l'année prochaine."),
    mileage: z.coerce.number().int().min(0, "Le kilométrage doit être positif."),
    purchasePrice: z.coerce.number().min(0, "Le prix d'achat doit être positif."),
    vin: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === ""
          ? undefined
          : value,
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(
          /^[A-HJ-NPR-Z0-9]{17}$/,
          "Le VIN doit contenir 17 caractères valides, sans I, O ni Q."
        )
        .optional()
    ),
    registrationNumber: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === ""
          ? undefined
          : value,
      z.string().trim().toUpperCase().min(2).max(20).optional()
    ),
    color: optionalText(50),
    doors: optionalInteger(2, 6),
    seats: optionalInteger(1, 9),
    powerDin: optionalInteger(0, 3000),
    fiscalPower: optionalInteger(0, 1000),
    co2Emissions: optionalInteger(0, 1000),
    critAir: optionalInteger(0, 5),
    euroStandard: optionalText(20),
    trim: optionalText(120),
    engine: optionalText(120),
    fuel: optionalText(50),
    gearbox: optionalText(50),
    transmission: optionalText(50),
    ownersCount: optionalInteger(0, 99),
    firstRegistrationDate: optionalDate,
  })
  .superRefine((vehicle, context) => {
    if (
      vehicle.firstRegistrationDate &&
      new Date(`${vehicle.firstRegistrationDate}T00:00:00`).getFullYear() <
        vehicle.year - 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["firstRegistrationDate"],
        message:
          "La première mise en circulation n'est pas cohérente avec l'année du véhicule.",
      })
    }
  })

export type VehicleInput = z.infer<typeof vehicleSchema>

export type VehicleActionState = {
  success: boolean
  message?: string
  errors?: Record<string, string[] | undefined>
}

export const initialVehicleActionState: VehicleActionState = {
  success: false,
}

export function parseVehicleFormData(formData: FormData) {
  return vehicleSchema.safeParse({
    brand: formData.get("brand"),
    model: formData.get("model"),
    year: formData.get("year"),
    mileage: formData.get("mileage"),
    purchasePrice: formData.get("purchasePrice"),
    vin: formData.get("vin"),
    registrationNumber: formData.get("registrationNumber"),
    color: formData.get("color"),
    doors: formData.get("doors"),
    seats: formData.get("seats"),
    powerDin: formData.get("powerDin"),
    fiscalPower: formData.get("fiscalPower"),
    co2Emissions: formData.get("co2Emissions"),
    critAir: formData.get("critAir"),
    euroStandard: formData.get("euroStandard"),
    trim: formData.get("trim"),
    engine: formData.get("engine"),
    fuel: formData.get("fuel"),
    gearbox: formData.get("gearbox"),
    transmission: formData.get("transmission"),
    ownersCount: formData.get("ownersCount"),
    firstRegistrationDate: formData.get("firstRegistrationDate"),
  })
}
