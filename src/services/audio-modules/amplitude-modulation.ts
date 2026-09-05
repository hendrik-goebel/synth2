import { setWaveform } from './oscillator'
import type { AmplitudeModulationSettings } from './types'

export function createAmplitudeModulation(audioContext: AudioContext, settings: AmplitudeModulationSettings, bypassed: boolean, gainNode: GainNode, sourceGain: number): { modulator: OscillatorNode; gain: GainNode } {
  const modulator = audioContext.createOscillator()
  setWaveform(audioContext, modulator, settings.waveform)
  modulator.frequency.setValueAtTime(settings.rate, audioContext.currentTime)
  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(bypassed ? 0 : sourceGain * settings.depth, audioContext.currentTime)
  modulator.connect(gain).connect(gainNode.gain)
  modulator.start()
  return { modulator, gain }
}

export function destroyAmplitudeModulation(modulator?: OscillatorNode, gain?: GainNode): void {
  modulator?.stop()
  modulator?.disconnect()
  gain?.disconnect()
}
