import type { OutputSettings } from './types'

export function createOutputSettings(): OutputSettings {
  return { volume: 1, pan: 0 }
}

export function applyOutputSettings(audioContext: AudioContext, settings: OutputSettings, outputGain: GainNode, outputPanner: StereoPannerNode): void {
  outputGain.gain.setTargetAtTime(settings.volume, audioContext.currentTime, 0.01)
  outputPanner.pan.setTargetAtTime(settings.pan, audioContext.currentTime, 0.01)
}
