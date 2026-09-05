import type { OscillatorSettings, Waveform } from './types'

const RANDOM_WAVE_HARMONIC_COUNT = 32

export function createOscillatorSettings(): OscillatorSettings {
  return { bypassed: false, detune: 0, steppedDetune: false, glide: 0, level: 1, waveform: 'sine', unisonDetune: 0, stereoSpread: 0, fmAmount: 0, fmSource: 'sine' }
}

export function setWaveform(audioContext: AudioContext, oscillator: OscillatorNode, waveform: Waveform): void {
  if (waveform !== 'random') {
    oscillator.type = waveform
    return
  }
  const real = new Float32Array(RANDOM_WAVE_HARMONIC_COUNT)
  const imaginary = new Float32Array(RANDOM_WAVE_HARMONIC_COUNT)
  for (let harmonic = 1; harmonic < RANDOM_WAVE_HARMONIC_COUNT; harmonic += 1) {
    real[harmonic] = Math.random() * 2 - 1
    imaginary[harmonic] = Math.random() * 2 - 1
  }
  oscillator.setPeriodicWave(audioContext.createPeriodicWave(real, imaginary))
}

export function createOscillatorSource(audioContext: AudioContext, settings: OscillatorSettings, note: number, layerIndex: number, glideFromNote?: number): { oscillator: OscillatorNode; frequency: number; glideFromFrequency: number | undefined; baseDetune: number } {
  const oscillator = audioContext.createOscillator()
  setWaveform(audioContext, oscillator, settings.waveform)
  const now = audioContext.currentTime
  const frequency = midiNoteToFrequency(note)
  const glideFromFrequency = glideFromNote === undefined ? undefined : midiNoteToFrequency(glideFromNote)
  scheduleGlide(oscillator.frequency, glideFromFrequency, frequency, settings.glide, now)
  const baseDetune = settings.detune + layerDetune(layerIndex, settings.unisonDetune)
  oscillator.detune.setValueAtTime(baseDetune, now)
  return { oscillator, frequency, glideFromFrequency, baseDetune }
}

export function createFrequencyModulator(audioContext: AudioContext, settings: OscillatorSettings, frequency: number, glideFromFrequency: number | undefined): { modulator: OscillatorNode; gain: GainNode } | undefined {
  if (settings.fmAmount <= 0) return undefined
  const modulator = audioContext.createOscillator()
  setWaveform(audioContext, modulator, settings.fmSource)
  const now = audioContext.currentTime
  scheduleGlide(modulator.frequency, glideFromFrequency, frequency, settings.glide, now)
  const gain = audioContext.createGain()
  scheduleGlide(gain.gain, glideFromFrequency === undefined ? undefined : settings.fmAmount * glideFromFrequency, settings.fmAmount * frequency, settings.glide, now)
  modulator.connect(gain)
  return { modulator, gain }
}

export function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12)
}

export function scheduleGlide(parameter: AudioParam, from: number | undefined, to: number, glideMs: number, now: number): void {
  if (from === undefined || glideMs <= 0) {
    parameter.setValueAtTime(to, now)
    return
  }
  parameter.setValueAtTime(from, now)
  parameter.linearRampToValueAtTime(to, now + glideMs / 1000)
}

export function layerDetune(index: number, unisonDetune: number): number {
  return index === 0 ? -unisonDetune : index === 2 ? unisonDetune : 0
}
