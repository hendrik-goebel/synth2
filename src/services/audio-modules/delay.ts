import type { DelayModuleKind, DelayOverdriveSettings, DelaySettings } from './types'
import { createWarmOverdriveCurve } from './overdrive'
import { applyResonatorSettings, createResonatorModule, createResonatorSettings, destroyResonatorModule, routeResonatorModule, type ResonatorModule } from './resonator'

export type DelayModule = {
  node: DelayNode
  repetitions: GainNode
  filter: BiquadFilterNode
  overdriveGain: GainNode
  overdrive: WaveShaperNode
  overdriveFeedbackDelay: DelayNode
  overdriveFeedback: GainNode
  resonator: ResonatorModule
  wet: GainNode
  dry: GainNode
  output: GainNode
  settings: DelaySettings
}

export function createDelaySettings(): DelaySettings {
  return { bypassed: false, time: 0.5, noteTime: 4, repetitions: 4, mix: 0.3 }
}

function feedbackGainForRepetitions(repetitions: number): number {
  const count = Number.isFinite(repetitions) ? Math.max(1, Math.min(20, Math.round(repetitions))) : 4
  return count === 1 ? 0 : 0.01 ** (1 / (count - 1))
}

function delayOverdriveSettings(overdrive: DelaySettings['overdrive']): DelayOverdriveSettings | null {
  return overdrive ?? null
}

function delayModuleOrder(settings: DelaySettings): DelayModuleKind[] {
  const available = new Set<DelayModuleKind>()
  if (settings.filter) available.add('filter')
  if (settings.overdrive) available.add('overdrive')
  if (settings.resonator) available.add('resonator')
  const order = settings.moduleOrder?.filter((module, index, modules) => available.has(module) && modules.indexOf(module) === index) ?? []
  const fallbackOrder: DelayModuleKind[] = ['filter', 'overdrive', 'resonator']
  return [...order, ...fallbackOrder.filter((module) => available.has(module) && !order.includes(module))]
}

export function createDelayModule(audioContext: AudioContext, settings: DelaySettings): DelayModule {
  const module = {
    node: audioContext.createDelay(2),
    repetitions: audioContext.createGain(),
    filter: audioContext.createBiquadFilter(),
    overdriveGain: audioContext.createGain(),
    overdrive: audioContext.createWaveShaper(),
    overdriveFeedbackDelay: audioContext.createDelay(0.05),
    overdriveFeedback: audioContext.createGain(),
    resonator: createResonatorModule(audioContext, settings.resonator ?? { ...createResonatorSettings(), bypassed: true }),
    wet: audioContext.createGain(),
    dry: audioContext.createGain(),
    output: audioContext.createGain(),
    settings: { ...settings },
  }
  return module
}

export function applyDelaySettings(audioContext: AudioContext, delay: DelayModule): void {
  const { node, repetitions, filter, overdriveGain, overdrive, overdriveFeedbackDelay, overdriveFeedback, wet, dry, settings } = delay
  const now = audioContext.currentTime
  node.delayTime.setTargetAtTime(settings.time, now, 0.08)
  repetitions.gain.setTargetAtTime(feedbackGainForRepetitions(settings.repetitions), now, 0.08)
  const filterSettings = settings.filter
  filter.type = filterSettings?.type ?? 'lowpass'
  filter.frequency.setTargetAtTime(filterSettings?.cutoff ?? 20000, now, 0.02)
  filter.Q.setTargetAtTime(filterSettings?.resonance ?? 0, now, 0.02)
  filter.gain.setTargetAtTime(filterSettings?.gain ?? 0, now, 0.02)
  const overdriveSettings = delayOverdriveSettings(settings.overdrive)
  const gain = overdriveSettings?.gain ?? 0
  const feedback = overdriveSettings?.feedback ?? 0
  overdriveGain.gain.setTargetAtTime(1 + gain * 18, now, 0.02)
  overdrive.oversample = '4x'
  overdrive.curve = gain > 0 ? createWarmOverdriveCurve(gain) : null
  overdriveFeedbackDelay.delayTime.setTargetAtTime(0.012, now, 0.02)
  overdriveFeedback.gain.setTargetAtTime(Math.min(0.6, feedback), now, 0.03)
  delay.resonator.settings = { ...(settings.resonator ?? delay.resonator.settings), bypassed: settings.resonator?.bypassed ?? true }
  applyResonatorSettings(audioContext, delay.resonator)
  wet.gain.setTargetAtTime(settings.mix, now, 0.01)
  dry.gain.setTargetAtTime(1 - settings.mix, now, 0.01)
}

export function routeDelayModule(input: AudioNode, delay: DelayModule): AudioNode {
  delay.node.disconnect()
  delay.repetitions.disconnect()
  delay.filter.disconnect()
  delay.overdriveGain.disconnect()
  delay.overdrive.disconnect()
  delay.overdriveFeedbackDelay.disconnect()
  delay.overdriveFeedback.disconnect()
  delay.resonator.output.disconnect()
  delay.wet.disconnect()
  delay.dry.disconnect()
  delay.output.disconnect()
  if (delay.settings.bypassed) return input
  input.connect(delay.dry)
  input.connect(delay.node)
  delay.node.connect(delay.repetitions).connect(delay.node)
  let wetInput: AudioNode = delay.node
  for (const module of delayModuleOrder(delay.settings)) {
    if (module === 'filter') {
      const filterSettings = delay.settings.filter
      if (filterSettings && !filterSettings.bypassed) wetInput = wetInput.connect(delay.filter)
    } else if (module === 'overdrive') {
      const overdriveSettings = delayOverdriveSettings(delay.settings.overdrive)
      if (overdriveSettings && !overdriveSettings.bypassed && (overdriveSettings.gain > 0 || overdriveSettings.feedback > 0)) {
        wetInput = wetInput.connect(delay.overdriveGain).connect(delay.overdrive)
        delay.overdrive.connect(delay.overdriveFeedbackDelay).connect(delay.overdriveFeedback).connect(delay.overdriveGain)
      }
    } else if (delay.settings.resonator && !delay.settings.resonator.bypassed) {
      wetInput = routeResonatorModule(wetInput, delay.resonator)
    }
  }
  wetInput.connect(delay.wet)
  delay.dry.connect(delay.output)
  delay.wet.connect(delay.output)
  return delay.output
}

export function destroyDelayModule(delay: DelayModule): void {
  delay.node.disconnect()
  delay.repetitions.disconnect()
  delay.filter.disconnect()
  delay.overdriveGain.disconnect()
  delay.overdrive.disconnect()
  delay.overdriveFeedbackDelay.disconnect()
  delay.overdriveFeedback.disconnect()
  destroyResonatorModule(delay.resonator)
  delay.wet.disconnect()
  delay.dry.disconnect()
  delay.output.disconnect()
}
