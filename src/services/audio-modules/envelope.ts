import type { EnvelopeSettings } from './types'

export function createEnvelopeSettings(): EnvelopeSettings {
  return { attack: 4, decay: 0, hold: 0, release: 80, velocity: 0, attackCurve: 'linear', releaseCurve: 'linear', destination: 'oscillatorLevel' }
}
