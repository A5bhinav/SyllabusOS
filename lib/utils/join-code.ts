/**
 * Generate a random 6-character alphanumeric join code
 * Format: Uppercase letters and numbers (excluding ambiguous characters like 0, O, I, 1)
 */
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes 0, O, I, 1
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Validate join code format (6 alphanumeric characters)
 */
export function isValidJoinCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase())
}
