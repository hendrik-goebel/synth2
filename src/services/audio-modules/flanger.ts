import { setWaveform } from './oscillator'
import type { FlangerSettings } from './types'

export type FlangerModule = { input: GainNode; lfo: OscillatorNode; lfoGain: GainNode; delay: DelayNode; feedback: GainNode; wet: GainNode; dry: GainNode; output: GainNode; settings: FlangerSettings }

export function createFlangerSettings(): FlangerSettings {
  return { bypassed: false, waveform: 'sine', rate: 0.35, depth: 0.5, delay: 0.003, feedback: 0.35, mix: 0.5 }
}

export function createFlangerModule(audioContext: AudioContext, settings: FlangerSettings): FlangerModule {
  const module = { input: audioContext.createGain(), lfo: audioContext.createOscillator(), lfoGain: audioContext.createGain(), delay: audioContext.createDelay(0.02), feedback: audioContext.createGain(), wet: audioContext.createGain(), dry: audioContext.createGain(), output: audioContext.createGain(), settings: { ...settings } }
  module.input.connect(module.delay).connect(module.wet).connect(module.output)
  module.input.connect(module.dry).connect(module.output)
  module.delay.connect(module.feedback).connect(module.delay)
  module.lfo.connect(module.lfoGain).connect(module.delay.delayTime)
  module.lfo.start()
  return module
}

export function applyFlangerSettings(audioContext: AudioContext, flanger: FlangerModule): void {
  const { lfo, lfoGain, delay, feedback, wet, dry, output, settings } = flanger
  const now = audioContext.currentTime
  setWaveform(audioContext, lfo, settings.waveform)
  lfo.frequency.setTargetAtTime(Math.max(0.01, Math.min(settings.rate, 10)), now, 0.02)
  delay.delayTime.setTargetAtTime(Math.max(0, Math.min(settings.delay, 0.01)), now, 0.02)
  lfoGain.gain.setTargetAtTime(Math.max(0, Math.min(settings.depth, 1)) * 0.002, now, 0.02)
  feedback.gain.setTargetAtTime(Math.max(0, Math.min(settings.feedback, 0.9)), now, 0.02)
  wet.gain.setTargetAtTime(Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
  dry.gain.setTargetAtTime(1 - Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
  output.gain.setTargetAtTime(1 / (1 + Math.max(0, Math.min(settings.feedback, 0.9)) * 0.35), now, 0.02)
}

export function routeFlangerModule(input: AudioNode, flanger: FlangerModule): AudioNode {
  flanger.output.disconnect()
  return flanger.settings.bypassed ? input : (input.connect(flanger.input), flanger.output)
}

export function destroyFlangerModule(module: FlangerModule): void {
  module.lfo.stop(); module.input.disconnect(); module.lfo.disconnect(); module.lfoGain.disconnect(); module.delay.disconnect(); module.feedback.disconnect(); module.wet.disconnect(); module.dry.disconnect(); module.output.disconnect()
}
