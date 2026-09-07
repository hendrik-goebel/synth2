import type { FilterSettings } from './types'

const PARAMETER_SMOOTHING_SECONDS = 0.04
const MIN_CUTOFF_HZ = 20
const MIN_BANDPASS_Q = 0.1

export type FilterModule = {
  node: BiquadFilterNode
  gainNode: GainNode
  settings: FilterSettings
}

export function createFilterSettings(): FilterSettings {
  return { bypassed: false, type: 'lowpass', cutoff: 20000, resonance: 0, gain: 0 }
}

export function createFilterModule(audioContext: AudioContext, settings: FilterSettings): FilterModule {
  return {
    node: audioContext.createBiquadFilter(),
    gainNode: audioContext.createGain(),
    settings: { ...settings },
  }
}

function cutoffForContext(audioContext: AudioContext, cutoff: number): number {
  const maximum = Math.max(MIN_CUTOFF_HZ, audioContext.sampleRate / 2 - 100)
  return Math.min(maximum, Math.max(MIN_CUTOFF_HZ, cutoff))
}

function qForFilter(settings: FilterSettings): number {
  const q = Math.max(0, settings.resonance)
  return settings.type === 'bandpass' ? Math.max(MIN_BANDPASS_Q, q) : q
}

function smoothParameter(parameter: AudioParam, value: number, now: number): void {
  parameter.cancelAndHoldAtTime(now)
  parameter.setTargetAtTime(value, now, PARAMETER_SMOOTHING_SECONDS)
}

export function applyFilterSettings(audioContext: AudioContext, filter: FilterModule): void {
  const now = audioContext.currentTime
  filter.node.type = filter.settings.type
  smoothParameter(filter.node.frequency, cutoffForContext(audioContext, filter.settings.cutoff), now)
  smoothParameter(filter.node.Q, qForFilter(filter.settings), now)
  smoothParameter(filter.gainNode.gain, 10 ** (filter.settings.gain / 20), now)
}

export function routeFilterModule(input: AudioNode, filter: FilterModule): AudioNode {
  filter.node.disconnect()
  filter.gainNode.disconnect()
  if (filter.settings.bypassed) return input
  input.connect(filter.node).connect(filter.gainNode)
  return filter.gainNode
}

export function destroyFilterModule(filter: FilterModule): void {
  filter.node.disconnect()
  filter.gainNode.disconnect()
}
