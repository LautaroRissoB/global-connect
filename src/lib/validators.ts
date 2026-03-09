// Dominios universitarios válidos
export const UNIVERSITY_DOMAINS = [
  // Latinoamérica
  '.edu.ar',
  '.edu.br',
  '.edu.mx',
  '.edu.co',
  '.edu.cl',
  '.edu.pe',
  '.edu.uy',
  '.edu.py',
  '.edu.bo',
  '.edu.ec',
  '.edu.ve',
  // Genérico
  '.edu',
  // Europa
  '.ac.uk',
  '.ac.at',
  '.ac.nz',
  '.ac.za',
  // Asia / Oceanía
  '.ac.jp',
  '.ac.kr',
  '.edu.au',
  '.edu.cn',
] as const

// Pattern para universidades alemanas: uni-*.de, tu-*.de, fh-*.de, hs-*.de
const GERMAN_UNI_PATTERN = /^[a-zA-Z0-9._%+-]+@(uni|tu|fh|hs)-[a-zA-Z-]+\.de$/

/**
 * Valida si un email pertenece a un dominio universitario reconocido.
 */
export function isUniversityEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase()

  if (!trimmed.includes('@')) return false

  // Verificar dominios alemanes (uni-*.de, tu-*.de, etc.)
  if (GERMAN_UNI_PATTERN.test(trimmed)) return true

  // Verificar dominios de la lista
  return UNIVERSITY_DOMAINS.some((domain) => trimmed.endsWith(domain))
}
