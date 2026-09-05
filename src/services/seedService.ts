const SEED_PREFIX = 'osc1.'
const SEED_TOKEN_PATTERN = /osc1\.[A-Za-z0-9_-]+/

export function encodeSeed(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return `${SEED_PREFIX}${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

export function decodeSeed(seed: string): unknown {
  const token = seed.replace(/\s+/g, '').match(SEED_TOKEN_PATTERN)?.[0]
  if (!token) {
    throw new Error('This seed is not recognized.')
  }

  const encoded = token.slice(SEED_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - encoded.length % 4) % 4)
  const binary = atob(encoded + padding)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}
