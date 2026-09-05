import type { NoiseSettings } from './types'

const NOISE_BUFFER_DURATION = 2

export function createNoiseSettings(): NoiseSettings {
  return { bypassed: false, color: 'white', level: 0, stereoSpread: 0 }
}

export function createNoiseSource(audioContext: AudioContext, settings: NoiseSettings): AudioBufferSourceNode {
  const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * NOISE_BUFFER_DURATION), audioContext.sampleRate)
  const samples = buffer.getChannelData(0)
  let brown = 0
  const pink = [0, 0, 0, 0, 0, 0, 0]
  for (let index = 0; index < samples.length; index += 1) {
    const white = Math.random() * 2 - 1
    if (settings.color === 'white') samples[index] = white
    else if (settings.color === 'pink') {
      pink[0] = 0.99886 * pink[0] + white * 0.0555179
      pink[1] = 0.99332 * pink[1] + white * 0.0750759
      pink[2] = 0.96900 * pink[2] + white * 0.1538520
      pink[3] = 0.86650 * pink[3] + white * 0.3104856
      pink[4] = 0.55000 * pink[4] + white * 0.5329522
      pink[5] = -0.7616 * pink[5] - white * 0.0168980
      samples[index] = (pink[0] + pink[1] + pink[2] + pink[3] + pink[4] + pink[5] + pink[6] + white * 0.5362) * 0.11
      pink[6] = white * 0.115926
    } else {
      brown = (brown + white * 0.02) / 1.02
      samples[index] = brown * 3.5
    }
  }
  const source = audioContext.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}
