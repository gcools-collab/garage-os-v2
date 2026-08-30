import assert from "node:assert/strict"
import test from "node:test"

import { parseVehicleFormData } from "../schema"

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries({
    brand: "Peugeot",
    model: "308",
    year: "2020",
    mileage: "45000",
    purchasePrice: "12000",
    sellingPrice: "",
    vin: "",
    registrationNumber: "",
    color: "",
    doors: "",
    seats: "",
    powerDin: "",
    fiscalPower: "",
    co2Emissions: "",
    critAir: "",
    euroStandard: "",
    trim: "",
    engine: "",
    fuel: "",
    gearbox: "",
    transmission: "",
    ownersCount: "",
    firstRegistrationDate: "",
    ...values,
  })) {
    data.set(name, value)
  }
  return parseVehicleFormData(data)
}

test("la catégorie de stock est obligatoire à la création", () => {
  const result = form({ stockCategory: "" })
  assert.equal(result.success, false)
  if (!result.success) {
    assert.match(result.error.flatten().fieldErrors.stockCategory?.[0] ?? "", /obligatoire/)
  }
})

test("accepte uniquement PARTICULIER et UTILITAIRE", () => {
  const particulier = form({ stockCategory: "PARTICULIER" })
  const utilitaire = form({ stockCategory: "UTILITAIRE" })
  const invalid = form({ stockCategory: "SUV" })
  assert.equal(particulier.success, true)
  assert.equal(utilitaire.success, true)
  assert.equal(invalid.success, false)
  if (particulier.success) assert.equal(particulier.data.stockCategory, "PARTICULIER")
  if (utilitaire.success) assert.equal(utilitaire.data.stockCategory, "UTILITAIRE")
})
