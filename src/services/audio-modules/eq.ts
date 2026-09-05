import { createLfoModule, destroyLfoModule, type LfoModule } from './lfo'
import type { EqBandSettings, EqBandType, EqSettings } from './types'

export type EqModule = { input: GainNode; bands: BiquadFilterNode[]; output: GainNode; settings: EqSettings; lfos: LfoModule[] }

export function createEqBandSettings(type: EqBandType = 'peaking', frequency = 1000): EqBandSettings {
  return { bypassed: false, type, frequency, gain: 0, q: 1 }
}

export function createSingleBandEqSettings(): EqSettings {
  return { kind: 'single', bypassed: false, bands: [createEqBandSettings()], envelopes: [], lfos: [] }
}

export function createMultibandEqSettings(): EqSettings {
  return {
    kind: 'multiband', bypassed: false,
    bands: [createEqBandSettings('peaking', 250), createEqBandSettings('peaking', 1000), createEqBandSettings('peaking', 4000)],
    envelopes: [], lfos: [],
  }
}

export function createEqModule(audioContext: AudioContext, settings: EqSettings): EqModule {
  const module: EqModule = {
    input: audioContext.createGain(), bands: settings.bands.map(() => audioContext.createBiquadFilter()), output: audioContext.createGain(),
    settings: { kind: settings.kind, bypassed: settings.bypassed, bands: settings.bands.map((band) => ({ ...band })), envelopes: (settings.envelopes ?? []).map((envelope) => ({ ...envelope })), lfos: (settings.lfos ?? []).map((lfo) => ({ ...lfo })) },
    lfos: [],
  }
  module.bands.forEach((_, index) => applyEqBandSettings(audioContext, module, index))
  module.settings.lfos.forEach((lfo) => module.lfos.push(createLfoModule(audioContext, lfo, lfo.bypassed)))
  return module
}

export function applyEqBandSettings(audioContext: AudioContext, eq: EqModule, bandIndex: number): void {
  const band = eq.bands[bandIndex]
  const settings = eq.settings.bands[bandIndex]
  if (!band || !settings) return
  const now = audioContext.currentTime
  band.type = settings.type
  band.frequency.setTargetAtTime(settings.frequency, now, 0.01)
  band.Q.setTargetAtTime(settings.q, now, 0.01)
  band.gain.setTargetAtTime(settings.gain, now, 0.01)
}

export function routeEqModule(input: AudioNode, eq: EqModule): AudioNode {
  eq.input.disconnect(); eq.output.disconnect(); eq.bands.forEach((band) => band.disconnect())
  if (eq.settings.bypassed) return input
  let eqOutput: AudioNode = eq.input
  eq.settings.bands.forEach((settings, index) => {
    const band = eq.bands[index]
    if (band && !settings.bypassed) eqOutput = eqOutput.connect(band)
  })
  input.connect(eq.input)
  eqOutput.connect(eq.output)
  return eq.output
}

export function destroyEqModule(eq: EqModule): void {
  eq.input.disconnect(); eq.bands.forEach((band) => band.disconnect()); eq.output.disconnect(); eq.lfos.forEach(destroyLfoModule)
}
