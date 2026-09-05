import { setWaveform } from './oscillator'
import type { ChorusSettings } from './types'

export type ChorusModule = { input: GainNode; lfo: OscillatorNode; lfoGain: GainNode; delay: DelayNode; wet: GainNode; dry: GainNode; output: GainNode; settings: ChorusSettings }

export function createChorusSettings(): ChorusSettings {
  return { bypassed: false, waveform: 'sine', rate: 0.8, depth: 0.5, delay: 0.018, mix: 0.45 }
}

export function createChorusModule(audioContext: AudioContext, settings: ChorusSettings): ChorusModule {
  const module = { input: audioContext.createGain(), lfo: audioContext.createOscillator(), lfoGain: audioContext.createGain(), delay: audioContext.createDelay(0.05), wet: audioContext.createGain(), dry: audioContext.createGain(), output: audioContext.createGain(), settings: { ...settings } }
  module.input.connect(module.delay).connect(module.wet).connect(module.output)
  module.input.connect(module.dry).connect(module.output)
  module.lfo.connect(module.lfoGain).connect(module.delay.delayTime)
  module.lfo.start()
  return module
}

export function applyChorusSettings(audioContext: AudioContext, chorus: ChorusModule): void {
  const { lfo, lfoGain, delay, wet, dry, output, settings } = chorus
  const now = audioContext.currentTime
  setWaveform(audioContext, lfo, settings.waveform)
  lfo.frequency.setTargetAtTime(Math.max(0.01, Math.min(settings.rate, 20)), now, 0.02)
  delay.delayTime.setTargetAtTime(Math.max(0, Math.min(settings.delay, 0.045)), now, 0.02)
  lfoGain.gain.setTargetAtTime(Math.max(0, Math.min(settings.depth, 1)) * 0.005, now, 0.02)
  wet.gain.setTargetAtTime(Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
  dry.gain.setTargetAtTime(1 - Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
  output.gain.setTargetAtTime(1, now, 0.02)
}

export function routeChorusModule(input: AudioNode, chorus: ChorusModule): AudioNode {
  chorus.output.disconnect()
  return chorus.settings.bypassed ? input : (input.connect(chorus.input), chorus.output)
}

export function destroyChorusModule(module: ChorusModule): void {
  module.lfo.stop(); module.input.disconnect(); module.lfo.disconnect(); module.lfoGain.disconnect(); module.delay.disconnect(); module.wet.disconnect(); module.dry.disconnect(); module.output.disconnect()
}
