import { setWaveform } from './oscillator'
import type { LfoSettings } from './types'

export type LfoModule = { oscillator: OscillatorNode; gain: GainNode; settings: LfoSettings; bypassed: boolean }

export function createLfoModule(audioContext: AudioContext, settings: LfoSettings, bypassed = false): LfoModule {
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const lfo = { oscillator, gain, settings: { ...settings }, bypassed }
  setWaveform(audioContext, oscillator, settings.waveform)
  oscillator.frequency.setValueAtTime(settings.rate, audioContext.currentTime)
  oscillator.connect(gain)
  oscillator.start()
  return lfo
}

export function destroyLfoModule(lfo: LfoModule): void {
  lfo.oscillator.stop()
  lfo.oscillator.disconnect()
  lfo.gain.disconnect()
}

export function lfoDepth(settings: LfoSettings): number {
  const [module, , possibleBandIndex, possibleParameter] = settings.target.split(':')
  const parameter = module === 'eq' ? possibleParameter : possibleBandIndex
  const ranges: Record<string, number> = {
    detune: 1200, level: 0.2, unisonDetune: 100, stereoSpread: 1, fmAmount: 1000, cutoff: 19980, resonance: 3,
    gain: 24, time: 1.99, feedback: 0.95, repetitions: 0.95, mix: 1, overdrive: 1, drive: 18, tone: 10200, decay: 38,
    preDelay: 0.2, damping: 16500, width: 1, rate: 30, depth: 1, delay: 0.03, volume: 1, pan: 1,
    frequency: 19980, q: 17.9,
  }
  const normalizedDepth = Math.max(0, Math.min(1, settings.depth))
  const range = module === 'overdrive' && parameter === 'feedback' ? 0.6
    : module === 'resonator' && parameter === 'feedback' ? 0.3
      : module === 'resonator' && parameter === 'drive' ? 9
        : module === 'flanger' && parameter === 'feedback' ? 0.9
          : module === 'chorus' && parameter === 'depth' ? 0.005
            : module === 'flanger' && parameter === 'depth' ? 0.002
              : module === 'tremolo' && parameter === 'depth' ? 0.5 : (ranges[parameter] ?? 1)
  return normalizedDepth ** 2 * range
}
