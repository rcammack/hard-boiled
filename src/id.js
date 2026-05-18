function randomHex(length = 16) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const byteCount = Math.ceil(length / 2)
    const bytes = new Uint8Array(byteCount)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, length)
  }

  return `${Date.now().toString(16)}${performance.now().toString(16).replace('.', '')}`.slice(
    0,
    length,
  )
}

export function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${randomHex(24)}`
}
