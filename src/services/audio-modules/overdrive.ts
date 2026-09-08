import type { OverdriveSettings } from './types'
import { hasChanged, setSmoothedValue } from './audio-control'

const curveCache = new Map<number, Float32Array<ArrayBuffer>>()

export type OverdriveModule = {
  input: GainNode; dcBlocker: BiquadFilterNode; driveGain: GainNode; shaper: WaveShaperNode
  tone: BiquadFilterNode; feedbackTone: BiquadFilterNode; feedbackDelay: DelayNode; feedbackGain: GainNode
  wet: GainNode; dry: GainNode; output: GainNode; settings: OverdriveSettings
}

export function createOverdriveSettings(): OverdriveSettings {
  return { bypassed: false, drive: 0, tone: 0.55, feedback: 0, mix: 1 }
}

export function createWarmOverdriveCurve(drive: number): Float32Array<ArrayBuffer> {
  const key = Math.round(drive * 1000)
  const cached = curveCache.get(key)
  if (cached) return cached
  const curve = new Float32Array(2048)
  const gain = 1 + (key / 1000) * 5
  for (let index = 0; index < curve.length; index += 1) {
    const input = (index * 2) / (curve.length - 1) - 1
    curve[index] = Math.tanh(input * gain) / Math.tanh(gain)
  }
  curveCache.set(key, curve)
  if (curveCache.size > 256) curveCache.delete(curveCache.keys().next().value!)
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

export function applyOverdriveSettings(audioContext: AudioContext, overdrive: OverdriveModule, changes?: Partial<OverdriveSettings>): void {
  const { dcBlocker, driveGain, shaper, tone, feedbackTone, feedbackDelay, feedbackGain, wet, dry, output, settings } = overdrive
  const now = audioContext.currentTime
  if (changes === undefined) {
    dcBlocker.type = 'highpass'
    setSmoothedValue(dcBlocker.frequency, 35, now, 0.02)
    setSmoothedValue(dcBlocker.Q, 0.7, now, 0.02)
    tone.type = 'lowpass'
    setSmoothedValue(tone.Q, 0.6, now, 0.03)
    feedbackTone.type = 'lowpass'
    setSmoothedValue(feedbackTone.Q, 0.7, now, 0.03)
    setSmoothedValue(feedbackDelay.delayTime, 0.012, now, 0.02)
    shaper.oversample = '4x'
  }
  if (hasChanged(changes, 'drive')) {
    setSmoothedValue(driveGain.gain, 1 + settings.drive * 18, now, 0.02)
    setSmoothedValue(output.gain, 1 / (1 + settings.drive * 0.8), now, 0.02)
    shaper.curve = createWarmOverdriveCurve(settings.drive)
  }
  if (hasChanged(changes, 'tone')) {
    setSmoothedValue(tone.frequency, 1800 + settings.tone * 10200, now, 0.03)
    setSmoothedValue(feedbackTone.frequency, 900 + settings.tone * 4100, now, 0.03)
  }
  if (hasChanged(changes, 'feedback')) setSmoothedValue(feedbackGain.gain, Math.min(0.6, settings.feedback), now, 0.03)
  if (hasChanged(changes, 'mix')) {
    setSmoothedValue(wet.gain, settings.mix, now, 0.02)
    setSmoothedValue(dry.gain, 1 - settings.mix, now, 0.02)
  }
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
