import type { OverdriveSettings } from './types'

export type OverdriveModule = {
  input: GainNode; dcBlocker: BiquadFilterNode; driveGain: GainNode; shaper: WaveShaperNode
  tone: BiquadFilterNode; feedbackTone: BiquadFilterNode; feedbackDelay: DelayNode; feedbackGain: GainNode
  wet: GainNode; dry: GainNode; output: GainNode; settings: OverdriveSettings
}

export function createOverdriveSettings(): OverdriveSettings {
  return { bypassed: false, drive: 0.35, tone: 0.55, feedback: 0, mix: 1 }
}

export function createWarmOverdriveCurve(drive: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(2048)
  const gain = 1 + drive * 5
  for (let index = 0; index < curve.length; index += 1) {
    const input = (index * 2) / (curve.length - 1) - 1
    curve[index] = Math.tanh(input * gain) / Math.tanh(gain)
  }
  return curve
}

export function createOverdriveModule(audioContext: AudioContext, settings: OverdriveSettings): OverdriveModule {
  const module = {
    input: audioContext.createGain(), dcBlocker: audioContext.createBiquadFilter(), driveGain: audioContext.createGain(),
    shaper: audioContext.createWaveShaper(), tone: audioContext.createBiquadFilter(), feedbackTone: audioContext.createBiquadFilter(),
    feedbackDelay: audioContext.createDelay(0.05), feedbackGain: audioContext.createGain(), wet: audioContext.createGain(),
    dry: audioContext.createGain(), output: audioContext.createGain(), settings: { ...settings },
  }
  module.input.connect(module.dcBlocker).connect(module.driveGain).connect(module.shaper).connect(module.tone).connect(module.wet).connect(module.output)
  module.input.connect(module.dry).connect(module.output)
  module.tone.connect(module.feedbackTone).connect(module.feedbackDelay).connect(module.feedbackGain).connect(module.dcBlocker)
  return module
}

export function applyOverdriveSettings(audioContext: AudioContext, overdrive: OverdriveModule): void {
  const { dcBlocker, driveGain, shaper, tone, feedbackTone, feedbackDelay, feedbackGain, wet, dry, output, settings } = overdrive
  const now = audioContext.currentTime
  dcBlocker.type = 'highpass'
  dcBlocker.frequency.setTargetAtTime(35, now, 0.02)
  dcBlocker.Q.setTargetAtTime(0.7, now, 0.02)
  driveGain.gain.setTargetAtTime(1 + settings.drive * 18, now, 0.02)
  tone.type = 'lowpass'
  tone.frequency.setTargetAtTime(1800 + settings.tone * 10200, now, 0.03)
  tone.Q.setTargetAtTime(0.6, now, 0.03)
  feedbackTone.type = 'lowpass'
  feedbackTone.frequency.setTargetAtTime(900 + settings.tone * 4100, now, 0.03)
  feedbackTone.Q.setTargetAtTime(0.7, now, 0.03)
  feedbackDelay.delayTime.setTargetAtTime(0.012, now, 0.02)
  feedbackGain.gain.setTargetAtTime(Math.min(0.6, settings.feedback), now, 0.03)
  wet.gain.setTargetAtTime(settings.mix, now, 0.02)
  dry.gain.setTargetAtTime(1 - settings.mix, now, 0.02)
  output.gain.setTargetAtTime(1 / (1 + settings.drive * 0.8), now, 0.02)
  shaper.oversample = '4x'
  shaper.curve = createWarmOverdriveCurve(settings.drive)
}

export function routeOverdriveModule(input: AudioNode, overdrive: OverdriveModule): AudioNode {
  overdrive.output.disconnect()
  if (overdrive.settings.bypassed) return input
  input.connect(overdrive.input)
  overdrive.wet.connect(overdrive.output)
  overdrive.dry.connect(overdrive.output)
  return overdrive.output
}

export function destroyOverdriveModule(module: OverdriveModule): void {
  module.input.disconnect(); module.dcBlocker.disconnect(); module.driveGain.disconnect(); module.shaper.disconnect()
  module.tone.disconnect(); module.feedbackTone.disconnect(); module.feedbackDelay.disconnect(); module.feedbackGain.disconnect()
  module.wet.disconnect(); module.dry.disconnect(); module.output.disconnect()
}
