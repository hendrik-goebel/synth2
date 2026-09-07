import { createWarmOverdriveCurve } from './overdrive'
import type { ResonatorSettings } from './types'

export type ResonatorModule = {
  input: GainNode; driveGain: GainNode; filter: BiquadFilterNode; shaper: WaveShaperNode
  feedbackTone: BiquadFilterNode; feedbackDelay: DelayNode; feedbackGain: GainNode; wet: GainNode; dry: GainNode; output: GainNode
  settings: ResonatorSettings
}

export function createResonatorSettings(): ResonatorSettings {
  return { bypassed: false, frequency: 780, decay: 1.1, feedback: 0.52, damping: 0.7, drive: 0.08, mix: 0.38 }
}

export function createResonatorModule(audioContext: AudioContext, settings: ResonatorSettings): ResonatorModule {
  const module = {
    input: audioContext.createGain(), driveGain: audioContext.createGain(), filter: audioContext.createBiquadFilter(),
    shaper: audioContext.createWaveShaper(), feedbackTone: audioContext.createBiquadFilter(), feedbackDelay: audioContext.createDelay(0.05), feedbackGain: audioContext.createGain(),
    wet: audioContext.createGain(), dry: audioContext.createGain(), output: audioContext.createGain(), settings: { ...settings },
  }
  module.input.connect(module.driveGain).connect(module.filter).connect(module.shaper).connect(module.wet).connect(module.output)
  // A non-zero delay makes the feedback cycle stable across Web Audio render blocks.
  module.shaper.connect(module.feedbackTone).connect(module.feedbackDelay).connect(module.feedbackGain).connect(module.filter)
  module.input.connect(module.dry).connect(module.output)
  return module
}

export function applyResonatorSettings(audioContext: AudioContext, resonator: ResonatorModule): void {
  const { driveGain, filter, shaper, feedbackTone, feedbackDelay, feedbackGain, wet, dry, output, settings } = resonator
  const now = audioContext.currentTime
  filter.type = 'bandpass'
  filter.frequency.setTargetAtTime(settings.frequency, now, 0.02)
  filter.Q.setTargetAtTime(1 + settings.decay * 38, now, 0.02)
  driveGain.gain.setTargetAtTime(1 + settings.drive * 9, now, 0.02)
  shaper.curve = createWarmOverdriveCurve(settings.drive)
  shaper.oversample = '2x'
  feedbackTone.type = 'lowpass'
  feedbackTone.frequency.setTargetAtTime(18000 - settings.damping * 16500, now, 0.02)
  feedbackTone.Q.setTargetAtTime(0.5 + settings.damping * 2, now, 0.02)
  feedbackDelay.delayTime.setTargetAtTime(0.012, now, 0.02)
  feedbackGain.gain.setTargetAtTime(settings.feedback, now, 0.02)
  wet.gain.setTargetAtTime(settings.mix, now, 0.02)
  dry.gain.setTargetAtTime(1 - settings.mix, now, 0.02)
  output.gain.setTargetAtTime(1 / Math.max(1, 1 + settings.mix * (0.5 + settings.feedback * 2)), now, 0.02)
}

export function routeResonatorModule(input: AudioNode, resonator: ResonatorModule): AudioNode {
  resonator.output.disconnect()
  return resonator.settings.bypassed ? input : (input.connect(resonator.input), resonator.output)
}

export function destroyResonatorModule(module: ResonatorModule): void {
  module.input.disconnect(); module.driveGain.disconnect(); module.filter.disconnect(); module.shaper.disconnect()
  module.feedbackTone.disconnect(); module.feedbackDelay.disconnect(); module.feedbackGain.disconnect(); module.wet.disconnect(); module.dry.disconnect(); module.output.disconnect()
}
