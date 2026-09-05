import type { DelaySettings } from './types'

const OVERDRIVE_OUTPUT_ATTENUATION = 40

export type DelayModule = {
  node: DelayNode
  feedback: GainNode
  resonance: BiquadFilterNode
  drive: WaveShaperNode
  driveGain: GainNode
  wet: GainNode
  dry: GainNode
  output: GainNode
  settings: DelaySettings
}

export function createDelaySettings(): DelaySettings {
  return { bypassed: false, time: 0.25, noteTime: 16, feedback: 0.35, resonance: 0, mix: 0.3, overdrive: 0 }
}

export function createDelayModule(audioContext: AudioContext, settings: DelaySettings): DelayModule {
  const module = {
    node: audioContext.createDelay(2),
    feedback: audioContext.createGain(),
    resonance: audioContext.createBiquadFilter(),
    drive: audioContext.createWaveShaper(),
    driveGain: audioContext.createGain(),
    wet: audioContext.createGain(),
    dry: audioContext.createGain(),
    output: audioContext.createGain(),
    settings: { ...settings },
  }
  module.node.connect(module.feedback).connect(module.resonance).connect(module.node)
  return module
}

export function applyDelaySettings(audioContext: AudioContext, delay: DelayModule): void {
  const { node, feedback, resonance, drive, driveGain, wet, dry, output, settings } = delay
  const now = audioContext.currentTime
  node.delayTime.setTargetAtTime(settings.time, now, 0.08)
  const resonantFeedback = Math.min(0.98, settings.feedback + settings.resonance * 0.3)
  feedback.gain.setTargetAtTime(resonantFeedback, now, 0.08)
  resonance.type = 'lowpass'
  resonance.frequency.setTargetAtTime(3500 + (1 - settings.resonance) * 5500, now, 0.08)
  resonance.Q.setTargetAtTime(0.0001 + settings.resonance * 4, now, 0.08)
  wet.gain.setTargetAtTime(settings.mix, now, 0.01)
  dry.gain.setTargetAtTime(1 - settings.mix, now, 0.01)
  output.gain.setTargetAtTime(1 / ((1 - settings.mix) + settings.mix / (1 - resonantFeedback)), now, 0.01)
  const amount = settings.overdrive * 100
  driveGain.gain.setTargetAtTime(1 / (1 + settings.overdrive * OVERDRIVE_OUTPUT_ATTENUATION), now, 0.01)
  const curve = new Float32Array(1024)
  for (let index = 0; index < curve.length; index += 1) {
    const input = (index * 2) / (curve.length - 1) - 1
    curve[index] = amount === 0 ? input : Math.tanh(input * (1 + amount))
  }
  drive.curve = curve
}

export function routeDelayModule(input: AudioNode, delay: DelayModule): AudioNode {
  delay.node.disconnect()
  delay.driveGain.disconnect()
  delay.wet.disconnect()
  delay.dry.disconnect()
  delay.output.disconnect()
  delay.node.connect(delay.feedback)
  delay.feedback.disconnect()
  delay.feedback.connect(delay.resonance).connect(delay.node)
  if (delay.settings.bypassed) return input
  input.connect(delay.drive)
  input.connect(delay.dry)
  delay.drive.connect(delay.driveGain).connect(delay.node)
  delay.node.connect(delay.wet)
  delay.dry.connect(delay.output)
  delay.wet.connect(delay.output)
  return delay.output
}

export function destroyDelayModule(delay: DelayModule): void {
  delay.node.disconnect()
  delay.feedback.disconnect()
  delay.resonance.disconnect()
  delay.drive.disconnect()
  delay.driveGain.disconnect()
  delay.wet.disconnect()
  delay.dry.disconnect()
  delay.output.disconnect()
}
