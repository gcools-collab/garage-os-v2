const BLOCKED_PATTERNS = [
  /prompt\s+syst[eè]me/i,
  /cl[eé]\s+api/i,
  /ignore\s+(les|tes)\s+(r[eè]gles|instructions)/i,
  /autre\s+garage/i,
  /<script[\s>]/i,
  /javascript:/i,
] as const

export function sanitizeCopilotInput(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2_000)
}

export function detectCopilotInputRisk(input: string): {
  readonly blocked: boolean
  readonly reason: string | null
} {
  const blocked = input.length > 2_000 || BLOCKED_PATTERNS.some((pattern) => pattern.test(input))
  return {
    blocked,
    reason: blocked ? "Cette demande ne peut pas être traitée par le Copilote." : null,
  }
}

export function isAllowedCopilotHref(href: string): boolean {
  return /^\/(stock\/[0-9a-f-]+|leads\/[0-9a-f-]+|commercial|intelligence|notifications|buying|settings(?:\/branding)?)$/.test(href)
}
