export type LeadCreatedEvent = {
  readonly leadId: string
  readonly garageSlug: string
  readonly vehicleSlug: string
}

export async function onLeadCreated(event: LeadCreatedEvent): Promise<void> {
  void event
  // Point d'extension volontairement sans provider pour GO-0061.4.
}
