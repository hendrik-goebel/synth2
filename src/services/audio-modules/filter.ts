import type { FilterSettings } from './types'

export type FilterModule = { node: BiquadFilterNode; gainNode: GainNode; settings: FilterSettings }

export function createFilterSettings(): FilterSettings {
  return { bypassed: false, type: 'bandpass', cutoff: 12000, resonance: 0, gain: 0 }
}

export function createFilterModule(audioContext: AudioContext, settings: FilterSettings): FilterModule {
  return { node: audioContext.createBiquadFilter(), gainNode: audioContext.createGain(), settings: { ...settings } }
}

export function applyFilterSettings(audioContext: AudioContext, filter: FilterModule): void {
  filter.node.type = filter.settings.type
  filter.node.frequency.setTargetAtTime(filter.settings.cutoff, audioContext.currentTime, 0.01)
  filter.node.Q.setTargetAtTime(filter.settings.resonance, audioContext.currentTime, 0.01)
  filter.gainNode.gain.setTargetAtTime(10 ** (filter.settings.gain / 20), audioContext.currentTime, 0.01)
}

export function routeFilterModule(input: AudioNode, filter: FilterModule): AudioNode {
  filter.node.disconnect()
  filter.gainNode.disconnect()
  return filter.settings.bypassed ? input : input.connect(filter.node).connect(filter.gainNode)
}

export function destroyFilterModule(filter: FilterModule): void {
  filter.node.disconnect()
  filter.gainNode.disconnect()
}
