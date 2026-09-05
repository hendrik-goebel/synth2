import { setWaveform } from './oscillator'
import type { TremoloSettings } from './types'

export type TremoloModule = { input: GainNode; lfo: OscillatorNode; lfoDepthGain: GainNode; tremoloGain: GainNode; wet: GainNode; dry: GainNode; output: GainNode; settings: TremoloSettings }

export function createTremoloSettings(): TremoloSettings {
  return { bypassed: false, waveform: 'sine', rate: 4, depth: 0.5, mix: 1 }
}

export function createTremoloModule(audioContext: AudioContext, settings: TremoloSettings): TremoloModule {
  const module = { input: audioContext.createGain(), lfo: audioContext.createOscillator(), lfoDepthGain: audioContext.createGain(), tremoloGain: audioContext.createGain(), wet: audioContext.createGain(), dry: audioContext.createGain(), output: audioContext.createGain(), settings: { ...settings } }
  module.input.connect(module.tremoloGain).connect(module.wet).connect(module.output)
  module.input.connect(module.dry).connect(module.output)
  module.lfo.connect(module.lfoDepthGain).connect(module.tremoloGain.gain)
  module.lfo.start()
  return module
}

export function applyTremoloSettings(audioContext: AudioContext, tremolo: TremoloModule): void {
  const { lfo, lfoDepthGain, tremoloGain, wet, dry, output, settings } = tremolo
  const now = audioContext.currentTime
  const depth = Math.max(0, Math.min(settings.depth, 1))
  const mix = Math.max(0, Math.min(settings.mix, 1))
  setWaveform(audioContext, lfo, settings.waveform)
  lfo.frequency.setTargetAtTime(Math.max(0.1, Math.min(settings.rate, 30)), now, 0.02)
  tremoloGain.gain.setTargetAtTime(1 - depth / 2, now, 0.02)
  lfoDepthGain.gain.setTargetAtTime(depth / 2, now, 0.02)
  wet.gain.setTargetAtTime(mix, now, 0.02)
  dry.gain.setTargetAtTime(1 - mix, now, 0.02)
  output.gain.setTargetAtTime(1, now, 0.02)
}

export function routeTremoloModule(input: AudioNode, tremolo: TremoloModule): AudioNode {
  tremolo.output.disconnect()
  return tremolo.settings.bypassed ? input : (input.connect(tremolo.input), tremolo.output)
}

export function destroyTremoloModule(module: TremoloModule): void {
  module.lfo.stop(); module.input.disconnect(); module.lfo.disconnect(); module.lfoDepthGain.disconnect(); module.tremoloGain.disconnect(); module.wet.disconnect(); module.dry.disconnect(); module.output.disconnect()
}
