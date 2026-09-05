import {
  applyChorusSettings, applyDelaySettings, applyDynamicsSettings, applyEqBandSettings, applyFilterSettings, applyFlangerSettings, applyOutputSettings, applyOverdriveSettings, applyResonatorSettings, applyReverbSettings, applyTremoloSettings,
  createAmplitudeModulation, createChorusModule, createChorusSettings, createCompressorSettings, createDelayModule, createDelaySettings, createDynamicsModule, createEnvelopeSettings, createEqBandSettings, createEqModule, createFilterModule, createFilterSettings, createFlangerModule, createFlangerSettings, createFrequencyModulator, createGateSettings, createHallImpulse, createLimiterSettings, createLfoModule, createNoiseSettings, createNoiseSource, createOscillatorSettings, createOscillatorSource, createOutputSettings, createOverdriveModule, createOverdriveSettings, createResonatorModule, createResonatorSettings, createReverbModule, createReverbSettings, createSingleBandEqSettings, createTremoloModule, createTremoloSettings,
  destroyAmplitudeModulation, destroyChorusModule, destroyDelayModule, destroyDynamicsModule, destroyEqModule, destroyFilterModule, destroyFlangerModule, destroyLfoModule, destroyOverdriveModule, destroyResonatorModule, destroyReverbModule, destroyTremoloModule,
  layerDetune, lfoDepth, routeChorusModule, routeDelayModule, routeDynamicsModule, routeEqModule, routeFilterModule, routeFlangerModule, routeOverdriveModule, routeResonatorModule, routeReverbModule, routeTremoloModule, setWaveform,
  type AmplitudeModulationSettings, type ChorusModule, type ChorusSettings, type CompressorSettings, type DelayModule, type DelaySettings, type DynamicsModule, type DynamicsSettings, type DynamicsSettingsChanges, type EffectGroup, type EnvelopeCurve, type EnvelopeDestination, type EnvelopeSettings, type EqBandSettings, type EqEnvelopeSettings, type EqLfoSettings, type EqModulationTarget, type EqModule, type EqParameter, type EqSettings, type FilterModule, type FilterSettings, type FlangerModule, type FlangerSettings, type FlatAudioModule, type GateSettings, type LfoModule, type LfoSettings, type LfoTarget, type LimiterSettings, type NoiseSettings, type OscillatorSettings, type OutputSettings, type OverdriveModule, type OverdriveSettings, type ResonatorModule, type ResonatorSettings, type ReverbModule, type ReverbSettings, type TremoloModule, type TremoloSettings,
} from './audio-modules'

export * from './audio-modules'

type Voice = {
  source: AudioScheduledSourceNode
  kind: 'oscillator' | 'noise'
  oscillator?: OscillatorNode
  modulator?: OscillatorNode
  fmGain?: GainNode
  amplitudeModulator?: OscillatorNode
  amplitudeModulationGain?: GainNode
  gainNode: GainNode
  envelopeGain: GainNode
  panner: StereoPannerNode
  velocity: number
  oscillatorIndex?: number
  noiseIndex?: number
  layerIndex?: number
  baseDetune?: number
  stopping: boolean
}

const MAX_GAIN = 0.2
const UNISON_LAYER_COUNT = 3
const ENVELOPE_ATTACK_MAX_MS = 300
const ENVELOPE_DECAY_MAX_MS = 150
const ENVELOPE_HOLD_MAX_MS = 150
const ENVELOPE_RELEASE_MAX_MS = 450
const ENVELOPE_BYPASS_RELEASE_MS = 20
const ENVELOPE_GAIN_EPSILON = 0.0001
const PITCH_ENVELOPE_DEPTH_CENTS = 240

export type SynthEngineOptions = {
  audioContext?: AudioContext
  destination?: AudioNode
  effectsOnly?: boolean
}

export class SynthEngine {
  private readonly audioContext: AudioContext
  private readonly destination: AudioNode
  private readonly mixBus: GainNode
  private readonly outputGain: GainNode
  private readonly outputPanner: StereoPannerNode
  private readonly ownsAudioContext: boolean
  private activeVoices: { note: number; velocity: number; voices: Voice[] }[] = []
  // MIDI permits the same pitch to be pressed again before the earlier press
  // has sent its note-off. Keep those presses balanced so the earlier note-off
  // cannot silence the freshly retriggered voice.
  private readonly heldNoteCounts = new Map<number, number>()
  private settings: OscillatorSettings[]
  private outputSettings: OutputSettings
  private noiseSettings: NoiseSettings[] = []
  private filters: FilterModule[] = []
  private dynamics: DynamicsModule[] = []
  private delays: DelayModule[] = []
  private overdrives: OverdriveModule[] = []
  private choruses: ChorusModule[] = []
  private flangers: FlangerModule[] = []
  private tremolos: TremoloModule[] = []
  private resonators: ResonatorModule[] = []
  private reverbs: ReverbModule[] = []
  private eqs: EqModule[] = []
  private amplitudeModulation?: AmplitudeModulationSettings
  private amplitudeModulationBypassed = false
  private lfos: LfoModule[] = []
  private envelopeSettings: { settings: EnvelopeSettings; bypassed: boolean }[] = []
  private flatAudioOrder: FlatAudioModule[] = []

  constructor(initialSettings: OscillatorSettings = createOscillatorSettings(), outputSettings: OutputSettings = createOutputSettings(), options: SynthEngineOptions = {}) {
    this.audioContext = options.audioContext ?? new AudioContext()
    this.destination = options.destination ?? this.audioContext.destination
    this.ownsAudioContext = options.audioContext === undefined
    this.mixBus = this.audioContext.createGain()
    this.outputGain = this.audioContext.createGain()
    this.outputPanner = this.audioContext.createStereoPanner()
    this.settings = [{ ...initialSettings }]
    this.outputSettings = { ...outputSettings }
    this.outputGain.connect(this.outputPanner).connect(this.destination)
    applyOutputSettings(this.audioContext, this.outputSettings, this.outputGain, this.outputPanner)
    if (options.effectsOnly) this.routeOutput()
    else this.addFilter()
  }

  getAudioContext(): AudioContext {
    return this.audioContext
  }

  getInput(): AudioNode {
    return this.mixBus
  }

  async activate(): Promise<void> {
    if (this.audioContext.state === 'suspended') await this.audioContext.resume()
  }

  noteOn(note: number, velocity: number): void {
    if (!this.hasAudibleSources() || velocity <= 0) {
      return
    }
    this.heldNoteCounts.set(note, (this.heldNoteCounts.get(note) ?? 0) + 1)
    const glideFromNote = this.activeVoices.at(-1)?.note
    if (this.activeVoices.some((active) => active.note === note)) this.stopNote(note)
    this.activeVoices.push({ note, velocity, voices: this.createVoices(note, velocity, glideFromNote) })
    this.refreshLfoConnections()
    this.applyEffectEnvelopes(this.audioContext.currentTime, velocity / 127)
  }

  noteOff(note: number): void {
    const heldCount = this.heldNoteCounts.get(note) ?? 0
    if (heldCount > 1) {
      this.heldNoteCounts.set(note, heldCount - 1)
      return
    }
    this.heldNoteCounts.delete(note)
    this.stopNote(note)
  }

  stopAllNotes(): void {
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => this.stopVoice(voice)))
    this.activeVoices = []
    this.heldNoteCounts.clear()
  }

  getActiveVoiceCount(): number {
    return this.activeVoices.length
  }

  setOutputSettings(changes: Partial<OutputSettings>): void {
    this.outputSettings = {
      volume: Math.max(0, Math.min(changes.volume ?? this.outputSettings.volume, 1)),
      pan: Math.max(-1, Math.min(changes.pan ?? this.outputSettings.pan, 1)),
    }
    applyOutputSettings(this.audioContext, this.outputSettings, this.outputGain, this.outputPanner)
  }

  addOscillator(settings: OscillatorSettings = createOscillatorSettings()): void {
    const oscillatorIndex = this.settings.push({ ...settings }) - 1
    this.activeVoices.forEach((active) => {
      active.voices.push(...this.createVoicesForOscillator(active.note, active.velocity, oscillatorIndex))
    })
    this.refreshLfoConnections()
  }

  removeOscillator(oscillatorIndex: number): void {
    if (oscillatorIndex < 0 || oscillatorIndex >= this.settings.length) throw new RangeError(`Unknown oscillator index: ${oscillatorIndex}`)
    this.settings.splice(oscillatorIndex, 1)
    this.activeVoices.forEach((active) => {
      active.voices.filter((voice) => voice.oscillatorIndex === oscillatorIndex).forEach((voice) => this.stopVoice(voice))
      active.voices = active.voices.filter((voice) => voice.oscillatorIndex !== oscillatorIndex)
      active.voices.forEach((voice) => {
        if (voice.oscillatorIndex !== undefined && voice.oscillatorIndex > oscillatorIndex) voice.oscillatorIndex -= 1
      })
    })
  }

  setOscillatorSettings(oscillatorIndex: number, changes: Partial<OscillatorSettings>): void {
    const settings = this.settings[oscillatorIndex]
    if (!settings) throw new RangeError(`Unknown oscillator index: ${oscillatorIndex}`)
    this.settings[oscillatorIndex] = { ...settings, ...changes }
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => voices.filter((voice) => voice.oscillatorIndex === oscillatorIndex).forEach((voice) => {
      const oscillator = voice.oscillator!
      const updated = this.settings[oscillatorIndex]
      if (changes.detune !== undefined || changes.unisonDetune !== undefined) {
        const baseDetune = updated.detune + layerDetune(voice.layerIndex!, updated.unisonDetune)
        voice.baseDetune = baseDetune
        oscillator.detune.setTargetAtTime(baseDetune, now, 0.01)
      }
      if (changes.level !== undefined || changes.bypassed !== undefined) {
        voice.gainNode.gain.setTargetAtTime(this.sourceGain(voice), now, 0.01)
        this.setAmplitudeModulationDepth(voice, now)
      }
      if (changes.stereoSpread !== undefined) voice.panner.pan.setTargetAtTime(this.layerPan(voice.layerIndex!, updated.stereoSpread), now, 0.01)
      if (changes.waveform !== undefined) setWaveform(this.audioContext, oscillator, updated.waveform)
      if (changes.fmSource !== undefined && voice.modulator) setWaveform(this.audioContext, voice.modulator, updated.fmSource)
    }))
    if (!this.hasAudibleSources()) this.stopAllNotes()
  }

  addNoise(settings: NoiseSettings = createNoiseSettings()): number {
    const noiseIndex = this.noiseSettings.push({ ...settings }) - 1
    this.activeVoices.forEach((active) => active.voices.push(this.createNoiseVoice(active.velocity, noiseIndex)))
    this.refreshLfoConnections()
    return noiseIndex
  }

  removeNoise(noiseIndex: number): void {
    if (noiseIndex < 0 || noiseIndex >= this.noiseSettings.length) throw new RangeError(`Unknown noise index: ${noiseIndex}`)
    this.activeVoices.forEach((active) => {
      active.voices.filter((voice) => voice.noiseIndex === noiseIndex).forEach((voice) => this.stopVoice(voice))
      active.voices = active.voices.filter((voice) => voice.noiseIndex !== noiseIndex)
      active.voices.forEach((voice) => {
        if (voice.noiseIndex !== undefined && voice.noiseIndex > noiseIndex) voice.noiseIndex -= 1
      })
    })
    this.noiseSettings.splice(noiseIndex, 1)
  }

  setNoiseSettings(noiseIndex: number, changes: Partial<NoiseSettings>): void {
    const settings = this.noiseSettings[noiseIndex]
    if (!settings) throw new RangeError(`Unknown noise index: ${noiseIndex}`)
    this.noiseSettings[noiseIndex] = { ...settings, ...changes }
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => voices.filter((voice) => voice.noiseIndex === noiseIndex).forEach((voice) => {
      if (changes.color !== undefined) this.replaceNoiseSource(voice)
      if (changes.level !== undefined || changes.bypassed !== undefined) {
        voice.gainNode.gain.setTargetAtTime(this.sourceGain(voice), now, 0.01)
        this.setAmplitudeModulationDepth(voice, now)
      }
      if (changes.stereoSpread !== undefined) voice.panner.pan.setTargetAtTime(this.noiseSettings[noiseIndex].stereoSpread, now, 0.01)
    }))
    if (!this.hasAudibleSources()) this.stopAllNotes()
  }

  addFilter(settings: FilterSettings = createFilterSettings()): void {
    const filter = createFilterModule(this.audioContext, settings)
    this.filters.push(filter)
    applyFilterSettings(this.audioContext, filter)
    this.appendFlatAudioModule('filters', this.filters.length - 1)
    this.routeOutput()
  }

  /** Returns the modules of an audio group in a form usable for validation and length lookups. */
  private audioGroupArrays(): Record<EffectGroup, unknown[]> {
    return {
      filters: this.filters,
      overdrives: this.overdrives,
      choruses: this.choruses,
      flangers: this.flangers,
      tremolos: this.tremolos,
      resonators: this.resonators,
      dynamics: this.dynamics,
      delays: this.delays,
      reverbs: this.reverbs,
      eqs: this.eqs,
    }
  }

  private appendFlatAudioModule(type: EffectGroup, index: number): void {
    this.flatAudioOrder = [...this.flatAudioOrder, { type, index }]
  }

  private removeFlatAudioModule(type: EffectGroup, index: number): void {
    this.flatAudioOrder = this.flatAudioOrder
      .filter((entry) => !(entry.type === type && entry.index === index))
      .map((entry) => (entry.type === type && entry.index > index ? { ...entry, index: entry.index - 1 } : entry))
  }

  /** Sets the exact processing order of individual audio modules across all groups. */
  setFlatAudioOrder(order: FlatAudioModule[]): void {
    const arrays = this.audioGroupArrays()
    const seen = new Set<string>()
    const counts: Partial<Record<EffectGroup, number>> = {}
    order.forEach((entry) => {
      const key = `${entry.type}:${entry.index}`
      if (seen.has(key)) throw new Error('Invalid flat audio order: duplicate entry')
      seen.add(key)
      const array = arrays[entry.type]
      if (!array || entry.index < 0 || entry.index >= array.length) throw new Error('Invalid flat audio order: index out of range')
      counts[entry.type] = (counts[entry.type] ?? 0) + 1
    })
    ;(Object.keys(arrays) as EffectGroup[]).forEach((group) => {
      if ((counts[group] ?? 0) !== arrays[group].length) throw new Error('Invalid flat audio order: missing modules')
    })
    this.flatAudioOrder = [...order]
    this.routeOutput()
  }

  removeFilter(index: number): void {
    const filter = this.filters[index]
    if (!filter) throw new RangeError(`Unknown filter index: ${index}`)
    destroyFilterModule(filter)
    this.filters.splice(index, 1)
    this.removeFlatAudioModule('filters', index)
    this.routeOutput()
  }

  setFilterSettings(index: number, changes: Partial<FilterSettings>): void {
    const filter = this.filters[index]
    if (!filter) throw new RangeError(`Unknown filter index: ${index}`)
    filter.settings = { ...filter.settings, ...changes }
    applyFilterSettings(this.audioContext, filter)
    this.routeOutput()
  }

  addCompressor(settings: CompressorSettings = createCompressorSettings()): void {
    this.addDynamics({ ...settings, type: 'compressor' })
  }

  addGate(settings: GateSettings = createGateSettings()): void {
    this.addDynamics({ ...settings, type: 'gate' })
  }

  addLimiter(settings: LimiterSettings = createLimiterSettings()): void {
    this.addDynamics({ ...settings, type: 'limiter' })
  }

  setDynamicsSettings(index: number, changes: DynamicsSettingsChanges): void {
    const dynamics = this.dynamics[index]
    if (!dynamics) throw new RangeError(`Unknown dynamics index: ${index}`)
    dynamics.settings = { ...dynamics.settings, ...changes } as DynamicsSettings
    applyDynamicsSettings(this.audioContext, dynamics)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeDynamics(index: number): void {
    const dynamics = this.dynamics[index]
    if (!dynamics) throw new RangeError(`Unknown dynamics index: ${index}`)
    destroyDynamicsModule(dynamics)
    this.dynamics.splice(index, 1)
    this.removeFlatAudioModule('dynamics', index)
    this.routeOutput()
  }

  setDynamicsBypassed(index: number, bypassed: boolean): void {
    this.setDynamicsSettings(index, { bypassed })
  }

  private addDynamics(settings: DynamicsSettings): void {
    const dynamics = createDynamicsModule(this.audioContext, settings)
    this.dynamics.push(dynamics)
    applyDynamicsSettings(this.audioContext, dynamics)
    this.appendFlatAudioModule('dynamics', this.dynamics.length - 1)
    this.routeOutput()
  }

  addDelay(settings: DelaySettings = createDelaySettings()): void {
    const delay = createDelayModule(this.audioContext, settings)
    this.delays.push(delay)
    applyDelaySettings(this.audioContext, delay)
    this.appendFlatAudioModule('delays', this.delays.length - 1)
    this.routeOutput()
  }

  setDelaySettings(index: number, changes: Partial<DelaySettings>): void {
    const delay = this.delays[index]
    if (!delay) throw new RangeError(`Unknown delay index: ${index}`)
    delay.settings = { ...delay.settings, ...changes }
    applyDelaySettings(this.audioContext, delay)
    if (Object.hasOwn(changes, 'overdrive') || Object.hasOwn(changes, 'filter') || Object.hasOwn(changes, 'resonator') || Object.hasOwn(changes, 'moduleOrder')) this.routeOutput()
  }

  removeDelay(index: number): void {
    const delay = this.delays[index]
    if (!delay) throw new RangeError(`Unknown delay index: ${index}`)
    destroyDelayModule(delay)
    this.delays.splice(index, 1)
    this.removeFlatAudioModule('delays', index)
    this.routeOutput()
  }

  setDelayBypassed(index: number, bypassed: boolean): void {
    const delay = this.delays[index]
    if (!delay) throw new RangeError(`Unknown delay index: ${index}`)
    delay.settings = { ...delay.settings, bypassed }
    this.routeOutput()
  }

  addOverdrive(settings: OverdriveSettings = createOverdriveSettings()): void {
    const overdrive = createOverdriveModule(this.audioContext, settings)
    this.overdrives.push(overdrive)
    applyOverdriveSettings(this.audioContext, overdrive)
    this.appendFlatAudioModule('overdrives', this.overdrives.length - 1)
    this.routeOutput()
  }

  setOverdriveSettings(index: number, changes: Partial<OverdriveSettings>): void {
    const overdrive = this.overdrives[index]
    if (!overdrive) throw new RangeError(`Unknown overdrive index: ${index}`)
    overdrive.settings = { ...overdrive.settings, ...changes }
    applyOverdriveSettings(this.audioContext, overdrive)
  }

  removeOverdrive(index: number): void {
    const overdrive = this.overdrives[index]
    if (!overdrive) throw new RangeError(`Unknown overdrive index: ${index}`)
    destroyOverdriveModule(overdrive)
    this.overdrives.splice(index, 1)
    this.removeFlatAudioModule('overdrives', index)
    this.routeOutput()
  }

  setOverdriveBypassed(index: number, bypassed: boolean): void {
    const overdrive = this.overdrives[index]
    if (!overdrive) throw new RangeError(`Unknown overdrive index: ${index}`)
    overdrive.settings = { ...overdrive.settings, bypassed }
    this.routeOutput()
  }

  addChorus(settings: ChorusSettings = createChorusSettings()): void {
    const chorus = createChorusModule(this.audioContext, settings)
    this.choruses.push(chorus)
    applyChorusSettings(this.audioContext, chorus)
    this.appendFlatAudioModule('choruses', this.choruses.length - 1)
    this.routeOutput()
  }

  setChorusSettings(index: number, changes: Partial<ChorusSettings>): void {
    const chorus = this.choruses[index]
    if (!chorus) throw new RangeError(`Unknown chorus index: ${index}`)
    chorus.settings = { ...chorus.settings, ...changes }
    applyChorusSettings(this.audioContext, chorus)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeChorus(index: number): void {
    const chorus = this.choruses[index]
    if (!chorus) throw new RangeError(`Unknown chorus index: ${index}`)
    destroyChorusModule(chorus)
    this.choruses.splice(index, 1)
    this.removeFlatAudioModule('choruses', index)
    this.routeOutput()
  }

  setChorusBypassed(index: number, bypassed: boolean): void {
    this.setChorusSettings(index, { bypassed })
  }

  addFlanger(settings: FlangerSettings = createFlangerSettings()): void {
    const flanger = createFlangerModule(this.audioContext, settings)
    this.flangers.push(flanger)
    applyFlangerSettings(this.audioContext, flanger)
    this.appendFlatAudioModule('flangers', this.flangers.length - 1)
    this.routeOutput()
  }

  setFlangerSettings(index: number, changes: Partial<FlangerSettings>): void {
    const flanger = this.flangers[index]
    if (!flanger) throw new RangeError(`Unknown flanger index: ${index}`)
    flanger.settings = { ...flanger.settings, ...changes }
    applyFlangerSettings(this.audioContext, flanger)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeFlanger(index: number): void {
    const flanger = this.flangers[index]
    if (!flanger) throw new RangeError(`Unknown flanger index: ${index}`)
    destroyFlangerModule(flanger)
    this.flangers.splice(index, 1)
    this.removeFlatAudioModule('flangers', index)
    this.routeOutput()
  }

  setFlangerBypassed(index: number, bypassed: boolean): void {
    this.setFlangerSettings(index, { bypassed })
  }

  addTremolo(settings: TremoloSettings = createTremoloSettings()): void {
    const tremolo = createTremoloModule(this.audioContext, settings)
    this.tremolos.push(tremolo)
    applyTremoloSettings(this.audioContext, tremolo)
    this.appendFlatAudioModule('tremolos', this.tremolos.length - 1)
    this.routeOutput()
  }

  setTremoloSettings(index: number, changes: Partial<TremoloSettings>): void {
    const tremolo = this.tremolos[index]
    if (!tremolo) throw new RangeError(`Unknown tremolo index: ${index}`)
    tremolo.settings = { ...tremolo.settings, ...changes }
    applyTremoloSettings(this.audioContext, tremolo)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeTremolo(index: number): void {
    const tremolo = this.tremolos[index]
    if (!tremolo) throw new RangeError(`Unknown tremolo index: ${index}`)
    destroyTremoloModule(tremolo)
    this.tremolos.splice(index, 1)
    this.removeFlatAudioModule('tremolos', index)
    this.routeOutput()
  }

  setTremoloBypassed(index: number, bypassed: boolean): void {
    this.setTremoloSettings(index, { bypassed })
  }

  addEq(settings: EqSettings = createSingleBandEqSettings()): void {
    const eq = createEqModule(this.audioContext, settings)
    this.eqs.push(eq)
    this.refreshLfoConnections()
    this.appendFlatAudioModule('eqs', this.eqs.length - 1)
    this.routeOutput()
  }

  removeEq(index: number): void {
    const eq = this.eqs[index]
    if (!eq) throw new RangeError(`Unknown EQ index: ${index}`)
    destroyEqModule(eq)
    this.eqs.splice(index, 1)
    this.reindexEqModulationTargets()
    this.refreshLfoConnections()
    this.removeFlatAudioModule('eqs', index)
    this.routeOutput()
  }

  setEqBypassed(index: number, bypassed: boolean): void {
    const eq = this.eqs[index]
    if (!eq) throw new RangeError(`Unknown EQ index: ${index}`)
    eq.settings = { ...eq.settings, bypassed }
    this.routeOutput()
  }

  addEqBand(eqIndex: number, settings: EqBandSettings = createEqBandSettings()): void {
    const eq = this.eqs[eqIndex]
    if (!eq) throw new RangeError(`Unknown EQ index: ${eqIndex}`)
    if (eq.settings.kind !== 'multiband') throw new Error('Single-band EQ modules cannot add bands')
    eq.settings = { ...eq.settings, bands: [...eq.settings.bands, { ...settings }] }
    eq.bands.push(this.audioContext.createBiquadFilter())
    applyEqBandSettings(this.audioContext, eq, eq.bands.length - 1)
    this.refreshLfoConnections()
    this.routeOutput()
  }

  removeEqBand(eqIndex: number, bandIndex: number): void {
    const eq = this.eqs[eqIndex]
    if (!eq) throw new RangeError(`Unknown EQ index: ${eqIndex}`)
    if (eq.settings.kind !== 'multiband') throw new Error('Single-band EQ modules cannot remove bands')
    const band = eq.bands[bandIndex]
    if (!band) throw new RangeError(`Unknown EQ band index: ${bandIndex}`)
    band.disconnect()
    eq.bands.splice(bandIndex, 1)
    eq.settings = { ...eq.settings, bands: eq.settings.bands.filter((_, index) => index !== bandIndex) }
    this.removeEqBandModulation(eq, eqIndex, bandIndex)
    this.refreshLfoConnections()
    this.routeOutput()
  }

  setEqBandSettings(eqIndex: number, bandIndex: number, changes: Partial<EqBandSettings>): void {
    const eq = this.eqs[eqIndex]
    if (!eq || !eq.bands[bandIndex] || !eq.settings.bands[bandIndex]) {
      throw new RangeError(`Unknown EQ band index: ${bandIndex}`)
    }
    eq.settings.bands[bandIndex] = { ...eq.settings.bands[bandIndex], ...changes }
    applyEqBandSettings(this.audioContext, eq, bandIndex)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  addEqEnvelope(eqIndex: number, settings: EqEnvelopeSettings): number {
    const eq = this.eqs[eqIndex]
    if (!eq) throw new RangeError(`Unknown EQ index: ${eqIndex}`)
    if (!this.isEqTargetForModule(settings.destination, eqIndex)) throw new Error('Invalid EQ envelope target')
    const normalized = this.normalizeEqEnvelopeSettings(eqIndex, settings, settings)
    eq.settings.envelopes.push(normalized)
    return eq.settings.envelopes.length - 1
  }

  setEqEnvelopeSettings(eqIndex: number, envelopeIndex: number, changes: Partial<EqEnvelopeSettings>): void {
    const eq = this.eqs[eqIndex]
    const envelope = eq?.settings.envelopes[envelopeIndex]
    if (!eq || !envelope) throw new RangeError(`Unknown EQ envelope index: ${envelopeIndex}`)
    eq.settings.envelopes[envelopeIndex] = this.normalizeEqEnvelopeSettings(eqIndex, changes, envelope)
  }

  setEqEnvelopeBypassed(eqIndex: number, envelopeIndex: number, bypassed: boolean): void {
    const eq = this.eqs[eqIndex]
    const envelope = eq?.settings.envelopes[envelopeIndex]
    if (!eq || !envelope) throw new RangeError(`Unknown EQ envelope index: ${envelopeIndex}`)
    eq.settings.envelopes[envelopeIndex] = { ...envelope, bypassed }
  }

  removeEqEnvelope(eqIndex: number, envelopeIndex: number): void {
    const eq = this.eqs[eqIndex]
    if (!eq?.settings.envelopes[envelopeIndex]) throw new RangeError(`Unknown EQ envelope index: ${envelopeIndex}`)
    eq.settings.envelopes.splice(envelopeIndex, 1)
  }

  addEqLfo(eqIndex: number, settings: EqLfoSettings): number {
    const eq = this.eqs[eqIndex]
    if (!eq) throw new RangeError(`Unknown EQ index: ${eqIndex}`)
    if (!this.isEqTargetForModule(settings.target, eqIndex)) throw new Error('Invalid EQ LFO target')
    const lfo = createLfoModule(this.audioContext, settings, settings.bypassed)
    eq.lfos.push(lfo)
    eq.settings.lfos.push({ ...settings })
    this.refreshLfoConnections()
    return eq.lfos.length - 1
  }

  setEqLfoSettings(eqIndex: number, lfoIndex: number, changes: Partial<EqLfoSettings>): void {
    const eq = this.eqs[eqIndex]
    const lfo = eq?.lfos[lfoIndex]
    const settings = eq?.settings.lfos[lfoIndex]
    if (!eq || !lfo || !settings) throw new RangeError(`Unknown EQ LFO index: ${lfoIndex}`)
    const target = changes.target ?? settings.target
    if (!this.isEqTargetForModule(target, eqIndex)) throw new Error('Invalid EQ LFO target')
    if (changes.bypassed !== undefined) lfo.bypassed = changes.bypassed
    lfo.settings = { ...lfo.settings, ...changes }
    eq.settings.lfos[lfoIndex] = { ...lfo.settings, target, bypassed: lfo.bypassed }
    const now = this.audioContext.currentTime
    if (changes.waveform !== undefined) setWaveform(this.audioContext, lfo.oscillator, lfo.settings.waveform)
    if (changes.rate !== undefined) lfo.oscillator.frequency.setTargetAtTime(lfo.settings.rate, now, 0.01)
    this.refreshLfoConnections()
  }

  setEqLfoBypassed(eqIndex: number, lfoIndex: number, bypassed: boolean): void {
    const lfo = this.eqs[eqIndex]?.lfos[lfoIndex]
    if (!lfo) throw new RangeError(`Unknown EQ LFO index: ${lfoIndex}`)
    lfo.bypassed = bypassed
    this.eqs[eqIndex].settings.lfos[lfoIndex] = { ...this.eqs[eqIndex].settings.lfos[lfoIndex], bypassed }
    lfo.gain.gain.setTargetAtTime(bypassed ? 0 : lfoDepth(lfo.settings), this.audioContext.currentTime, 0.01)
  }

  removeEqLfo(eqIndex: number, lfoIndex: number): void {
    const eq = this.eqs[eqIndex]
    const lfo = eq?.lfos[lfoIndex]
    if (!eq || !lfo) throw new RangeError(`Unknown EQ LFO index: ${lfoIndex}`)
    destroyLfoModule(lfo)
    eq.lfos.splice(lfoIndex, 1)
    eq.settings.lfos.splice(lfoIndex, 1)
  }

  addResonator(settings: ResonatorSettings = createResonatorSettings()): void {
    const resonator = createResonatorModule(this.audioContext, settings)
    this.resonators.push(resonator)
    applyResonatorSettings(this.audioContext, resonator)
    this.appendFlatAudioModule('resonators', this.resonators.length - 1)
    this.routeOutput()
  }

  setResonatorSettings(index: number, changes: Partial<ResonatorSettings>): void {
    const resonator = this.resonators[index]
    if (!resonator) throw new RangeError(`Unknown resonator index: ${index}`)
    resonator.settings = { ...resonator.settings, ...changes }
    applyResonatorSettings(this.audioContext, resonator)
  }

  removeResonator(index: number): void {
    const resonator = this.resonators[index]
    if (!resonator) throw new RangeError(`Unknown resonator index: ${index}`)
    destroyResonatorModule(resonator)
    this.resonators.splice(index, 1)
    this.removeFlatAudioModule('resonators', index)
    this.routeOutput()
  }

  setResonatorBypassed(index: number, bypassed: boolean): void {
    const resonator = this.resonators[index]
    if (!resonator) throw new RangeError(`Unknown resonator index: ${index}`)
    resonator.settings = { ...resonator.settings, bypassed }
    this.routeOutput()
  }

  addReverb(settings: ReverbSettings = createReverbSettings()): void {
    const reverb = createReverbModule(this.audioContext, settings)
    this.reverbs.push(reverb)
    applyReverbSettings(this.audioContext, reverb, true)
    this.appendFlatAudioModule('reverbs', this.reverbs.length - 1)
    this.routeOutput()
  }

  setReverbSettings(index: number, changes: Partial<ReverbSettings>): void {
    const reverb = this.reverbs[index]
    if (!reverb) throw new RangeError(`Unknown reverb index: ${index}`)
    reverb.settings = { ...reverb.settings, ...changes }
    applyReverbSettings(this.audioContext, reverb, changes.hallType !== undefined || changes.decay !== undefined)
    if (Object.hasOwn(changes, 'filter') || Object.hasOwn(changes, 'overdrive') || Object.hasOwn(changes, 'resonator') || Object.hasOwn(changes, 'moduleOrder')) this.routeOutput()
  }

  removeReverb(index: number): void {
    const reverb = this.reverbs[index]
    if (!reverb) throw new RangeError(`Unknown reverb index: ${index}`)
    destroyReverbModule(reverb)
    this.reverbs.splice(index, 1)
    this.removeFlatAudioModule('reverbs', index)
    this.routeOutput()
  }

  setReverbBypassed(index: number, bypassed: boolean): void {
    const reverb = this.reverbs[index]
    if (!reverb) throw new RangeError(`Unknown reverb index: ${index}`)
    reverb.settings = { ...reverb.settings, bypassed }
    this.routeOutput()
  }

  addAmplitudeModulation(settings: AmplitudeModulationSettings): void {
    if (this.amplitudeModulation) throw new Error('Amplitude modulation is already enabled')
    this.amplitudeModulation = { ...settings }
    this.amplitudeModulationBypassed = false
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => this.createAmplitudeModulation(voice)))
  }

  setAmplitudeModulationSettings(changes: Partial<AmplitudeModulationSettings>): void {
    if (!this.amplitudeModulation) throw new Error('Amplitude modulation is not enabled')
    this.amplitudeModulation = { ...this.amplitudeModulation, ...changes }
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => {
      if (changes.rate !== undefined) voice.amplitudeModulator?.frequency.setTargetAtTime(this.amplitudeModulation!.rate, now, 0.01)
      if (changes.depth !== undefined) this.setAmplitudeModulationDepth(voice, now)
      if (changes.waveform !== undefined && voice.amplitudeModulator) setWaveform(this.audioContext, voice.amplitudeModulator, this.amplitudeModulation!.waveform)
    }))
  }

  removeAmplitudeModulation(): void {
    if (!this.amplitudeModulation) throw new Error('Amplitude modulation is not enabled')
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => this.removeAmplitudeModulationFromVoice(voice)))
    this.amplitudeModulation = undefined
    this.amplitudeModulationBypassed = false
  }

  setAmplitudeModulationBypassed(bypassed: boolean): void {
    if (!this.amplitudeModulation) throw new Error('Amplitude modulation is not enabled')
    this.amplitudeModulationBypassed = bypassed
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => this.setAmplitudeModulationDepth(voice, now)))
  }

  addLfo(settings: LfoSettings): number {
    const lfo = createLfoModule(this.audioContext, settings, settings.bypassed ?? false)
    this.lfos.push(lfo)
    this.refreshLfoConnections()
    return this.lfos.length - 1
  }

  setLfoSettings(index: number, changes: Partial<LfoSettings>): void {
    const lfo = this.lfos[index]
    if (!lfo) throw new RangeError(`Unknown LFO index: ${index}`)
    lfo.settings = { ...lfo.settings, ...changes }
    const now = this.audioContext.currentTime
    if (changes.waveform !== undefined) setWaveform(this.audioContext, lfo.oscillator, lfo.settings.waveform)
    if (changes.rate !== undefined) lfo.oscillator.frequency.setTargetAtTime(lfo.settings.rate, now, 0.01)
    this.refreshLfoConnections()
  }

  setLfoBypassed(index: number, bypassed: boolean): void {
    const lfo = this.lfos[index]
    if (!lfo) throw new RangeError(`Unknown LFO index: ${index}`)
    lfo.bypassed = bypassed
    lfo.gain.gain.setTargetAtTime(bypassed ? 0 : lfoDepth(lfo.settings), this.audioContext.currentTime, 0.01)
  }

  removeLfo(index: number): void {
    const lfo = this.lfos[index]
    if (!lfo) throw new RangeError(`Unknown LFO index: ${index}`)
    destroyLfoModule(lfo)
    this.lfos.splice(index, 1)
  }

  setEnvelopeSettings(index: number, changes: Partial<EnvelopeSettings>): void {
    const envelope = this.envelopeSettings[index]
    if (!envelope) throw new RangeError(`Unknown envelope index: ${index}`)
    envelope.settings = this.normalizeEnvelopeSettings(changes, envelope.settings)
  }

  addEnvelope(settings: EnvelopeSettings & { bypassed?: boolean } = createEnvelopeSettings()): number {
    this.envelopeSettings.push({
      settings: this.normalizeEnvelopeSettings(settings, createEnvelopeSettings()),
      bypassed: settings.bypassed ?? false,
    })
    return this.envelopeSettings.length - 1
  }

  removeEnvelope(index: number): void {
    if (!this.envelopeSettings[index]) throw new RangeError(`Unknown envelope index: ${index}`)
    this.envelopeSettings.splice(index, 1)
  }

  setEnvelopeBypassed(index: number, bypassed: boolean): void {
    const envelope = this.envelopeSettings[index]
    if (!envelope) throw new RangeError(`Unknown envelope index: ${index}`)
    envelope.bypassed = bypassed
  }

  destroy(): void {
    this.stopAllNotes()
    this.lfos.forEach((lfo) => destroyLfoModule(lfo))
    this.lfos = []
    this.choruses.forEach((chorus) => chorus.lfo.stop())
    this.flangers.forEach((flanger) => flanger.lfo.stop())
    this.tremolos.forEach((tremolo) => tremolo.lfo.stop())
    this.choruses = []
    this.flangers = []
    this.tremolos = []
    this.resonators.forEach((resonator) => {
      resonator.input.disconnect()
      resonator.driveGain.disconnect()
      resonator.filter.disconnect()
      resonator.shaper.disconnect()
      resonator.feedbackTone.disconnect()
      resonator.feedbackGain.disconnect()
      resonator.wet.disconnect()
      resonator.dry.disconnect()
      resonator.output.disconnect()
    })
    this.resonators = []
    this.dynamics.forEach((dynamics) => destroyDynamicsModule(dynamics))
    this.dynamics = []
    this.eqs.forEach((eq) => destroyEqModule(eq))
    this.eqs = []
    this.mixBus.disconnect()
    this.outputGain.disconnect()
    this.outputPanner.disconnect()
    if (this.ownsAudioContext) void this.audioContext.close()
  }

  private refreshLfoConnections(): void {
    [...this.lfos, ...this.eqs.flatMap((eq) => eq.lfos)].forEach((lfo) => {
      lfo.gain.disconnect()
      lfo.gain.gain.setTargetAtTime(lfo.bypassed ? 0 : lfoDepth(lfo.settings), this.audioContext.currentTime, 0.01)
      this.lfoTargetParams(lfo.settings.target).forEach((param) => lfo.gain.connect(param))
    })
  }

  private lfoTargetParams(target: LfoTarget): AudioParam[] {
    const [module, rawIndex, possibleBandIndex, possibleParameter] = target.split(':')
    const parameter = module === 'eq' ? possibleParameter : possibleBandIndex
    const index = Number(rawIndex)
    if (!Number.isInteger(index) || index < 0) return []
    if (module === 'output') {
      return parameter === 'volume' ? [this.outputGain.gain] : parameter === 'pan' ? [this.outputPanner.pan] : []
    }
    if (module === 'oscillator') {
      return this.activeVoices
        .flatMap((active) => active.voices)
        .filter((voice) => voice.oscillatorIndex === index)
        .flatMap((voice) => parameter === 'detune' || parameter === 'unisonDetune' ? [voice.oscillator!.detune] : parameter === 'level' ? [voice.gainNode.gain] : parameter === 'stereoSpread' ? [voice.panner.pan] : parameter === 'fmAmount' && voice.fmGain ? [voice.fmGain.gain] : [])
    }
    if (module === 'noise') {
      return this.activeVoices.flatMap((active) => active.voices)
        .filter((voice) => voice.noiseIndex === index)
        .flatMap((voice) => parameter === 'level' ? [voice.gainNode.gain] : parameter === 'stereoSpread' ? [voice.panner.pan] : [])
    }
    if (module === 'filter') {
      const filter = this.filters[index]
      return !filter ? [] : parameter === 'cutoff' ? [filter.node.frequency] : parameter === 'resonance' ? [filter.node.Q] : parameter === 'gain' ? [filter.gainNode.gain] : []
    }
    if (module === 'delay') {
      const delay = this.delays[index]
      return !delay ? [] : parameter === 'time' ? [delay.node.delayTime] : parameter === 'repetitions' ? [delay.repetitions.gain] : parameter === 'mix' ? [delay.wet.gain] : []
    }
    if (module === 'overdrive') {
      const overdrive = this.overdrives[index]
      return !overdrive ? [] : parameter === 'drive' ? [overdrive.driveGain.gain] : parameter === 'tone' ? [overdrive.tone.frequency] : parameter === 'feedback' ? [overdrive.feedbackGain.gain] : parameter === 'mix' ? [overdrive.wet.gain] : []
    }
    if (module === 'chorus') {
      const chorus = this.choruses[index]
      return !chorus ? [] : parameter === 'rate' ? [chorus.lfo.frequency] : parameter === 'depth' ? [chorus.lfoGain.gain] : parameter === 'delay' ? [chorus.delay.delayTime] : parameter === 'mix' ? [chorus.wet.gain] : []
    }
    if (module === 'flanger') {
      const flanger = this.flangers[index]
      return !flanger ? [] : parameter === 'rate' ? [flanger.lfo.frequency] : parameter === 'depth' ? [flanger.lfoGain.gain] : parameter === 'delay' ? [flanger.delay.delayTime] : parameter === 'feedback' ? [flanger.feedback.gain] : parameter === 'mix' ? [flanger.wet.gain] : []
    }
    if (module === 'tremolo') {
      const tremolo = this.tremolos[index]
      return !tremolo ? [] : parameter === 'rate' ? [tremolo.lfo.frequency] : parameter === 'depth' ? [tremolo.lfoDepthGain.gain] : parameter === 'mix' ? [tremolo.wet.gain] : []
    }
    if (module === 'resonator') {
      const resonator = this.resonators[index]
      return !resonator ? [] : parameter === 'frequency' ? [resonator.filter.frequency] : parameter === 'decay' ? [resonator.filter.Q] : parameter === 'feedback' ? [resonator.feedbackGain.gain] : parameter === 'damping' ? [resonator.feedbackTone.frequency] : parameter === 'drive' ? [resonator.driveGain.gain] : parameter === 'mix' ? [resonator.wet.gain] : []
    }
    if (module === 'reverb') {
      const reverb = this.reverbs[index]
      return !reverb ? [] : parameter === 'preDelay' ? [reverb.preDelay.delayTime] : parameter === 'damping' ? [reverb.tone.frequency] : parameter === 'mix' ? [reverb.wet.gain] : parameter === 'width' ? [reverb.left.gain, reverb.right.gain, reverb.leftCross.gain, reverb.rightCross.gain] : []
    }
    if (module === 'eq') {
      const bandIndex = Number(possibleBandIndex)
      const eq = this.eqs[index]
      const band = Number.isInteger(bandIndex) && bandIndex >= 0 ? eq?.bands[bandIndex] : undefined
      return !band ? [] : parameter === 'frequency' ? [band.frequency] : parameter === 'q' ? [band.Q] : parameter === 'gain' ? [band.gain] : []
    }
    return []
  }

  private createVoices(note: number, velocity: number, glideFromNote?: number): Voice[] {
    const oscillators = this.settings.flatMap((_, index) => this.createVoicesForOscillator(note, velocity, index, glideFromNote))
    return [...oscillators, ...this.noiseSettings.map((_, index) => this.createNoiseVoice(velocity, index))]
  }

  private applyEffectEnvelopes(now: number, velocity: number): void {
    this.filters.forEach((filter, index) => {
      const cutoffEnvelope = this.activeEnvelopeSettings('filterCutoff', { type: 'filter', index })
      const resonanceEnvelope = this.activeEnvelopeSettings('filterResonance', { type: 'filter', index })
      if (cutoffEnvelope) this.applyPositiveEnvelopeOnNoteOn(filter.node.frequency, now, cutoffEnvelope, 20, filter.settings.cutoff * this.envelopePeakGain(velocity, cutoffEnvelope.velocity))
      if (resonanceEnvelope) this.applyPositiveEnvelopeOnNoteOn(filter.node.Q, now, resonanceEnvelope, 0, filter.settings.resonance * this.envelopePeakGain(velocity, resonanceEnvelope.velocity))
    })

    this.delays.forEach((delay, index) => {
      const timeEnvelope = this.activeEnvelopeSettings('delayTime', { type: 'delay', index })
      const repetitionsEnvelope = this.activeEnvelopeSettings('delayRepetitions', { type: 'delay', index })
      const mixEnvelope = this.activeEnvelopeSettings('delayMix', { type: 'delay', index })
      if (timeEnvelope) this.applyPositiveEnvelopeOnNoteOn(delay.node.delayTime, now, timeEnvelope, 0.01, delay.settings.time * this.envelopePeakGain(velocity, timeEnvelope.velocity))
      if (repetitionsEnvelope) this.applyPositiveEnvelopeOnNoteOn(delay.repetitions.gain, now, repetitionsEnvelope, 0, delay.settings.repetitions * this.envelopePeakGain(velocity, repetitionsEnvelope.velocity))
      if (mixEnvelope) this.applyPositiveEnvelopeOnNoteOn(delay.wet.gain, now, mixEnvelope, 0, delay.settings.mix * this.envelopePeakGain(velocity, mixEnvelope.velocity))
    })

    this.overdrives.forEach((overdrive, index) => {
      const driveEnvelope = this.activeEnvelopeSettings('overdriveDrive', { type: 'overdrive', index })
      const toneEnvelope = this.activeEnvelopeSettings('overdriveTone', { type: 'overdrive', index })
      const overdriveFeedbackEnvelope = this.activeEnvelopeSettings('overdriveFeedback', { type: 'overdrive', index })
      const overdriveMixEnvelope = this.activeEnvelopeSettings('overdriveMix', { type: 'overdrive', index })
      if (driveEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.driveGain.gain, now, driveEnvelope, 1, 1 + overdrive.settings.drive * 18 * this.envelopePeakGain(velocity, driveEnvelope.velocity))
      if (toneEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.tone.frequency, now, toneEnvelope, 1800, 1800 + overdrive.settings.tone * 10200 * this.envelopePeakGain(velocity, toneEnvelope.velocity))
      if (overdriveFeedbackEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.feedbackGain.gain, now, overdriveFeedbackEnvelope, 0, Math.min(0.6, overdrive.settings.feedback) * this.envelopePeakGain(velocity, overdriveFeedbackEnvelope.velocity))
      if (overdriveMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.wet.gain, now, overdriveMixEnvelope, 0, overdrive.settings.mix * this.envelopePeakGain(velocity, overdriveMixEnvelope.velocity))
    })

    this.resonators.forEach((resonator, index) => {
      const resonatorFrequencyEnvelope = this.activeEnvelopeSettings('resonatorFrequency', { type: 'resonator', index })
      const resonatorDecayEnvelope = this.activeEnvelopeSettings('resonatorDecay', { type: 'resonator', index })
      const resonatorFeedbackEnvelope = this.activeEnvelopeSettings('resonatorFeedback', { type: 'resonator', index })
      const resonatorDampingEnvelope = this.activeEnvelopeSettings('resonatorDamping', { type: 'resonator', index })
      const resonatorDriveEnvelope = this.activeEnvelopeSettings('resonatorDrive', { type: 'resonator', index })
      const resonatorMixEnvelope = this.activeEnvelopeSettings('resonatorMix', { type: 'resonator', index })
      if (resonatorFrequencyEnvelope) this.applyPositiveEnvelopeOnNoteOn(resonator.filter.frequency, now, resonatorFrequencyEnvelope, 40, resonator.settings.frequency * this.envelopePeakGain(velocity, resonatorFrequencyEnvelope.velocity))
      if (resonatorDecayEnvelope) this.applyPositiveEnvelopeOnNoteOn(resonator.filter.Q, now, resonatorDecayEnvelope, 1, 1 + resonator.settings.decay * 38 * this.envelopePeakGain(velocity, resonatorDecayEnvelope.velocity))
      if (resonatorFeedbackEnvelope) this.applyPositiveEnvelopeOnNoteOn(resonator.feedbackGain.gain, now, resonatorFeedbackEnvelope, 0, resonator.settings.feedback * this.envelopePeakGain(velocity, resonatorFeedbackEnvelope.velocity))
      if (resonatorDampingEnvelope) this.applyPositiveEnvelopeOnNoteOn(resonator.feedbackTone.frequency, now, resonatorDampingEnvelope, 1500, 18000 - resonator.settings.damping * 16500 * this.envelopePeakGain(velocity, resonatorDampingEnvelope.velocity))
      if (resonatorDriveEnvelope) this.applyPositiveEnvelopeOnNoteOn(resonator.driveGain.gain, now, resonatorDriveEnvelope, 1, 1 + resonator.settings.drive * 9 * this.envelopePeakGain(velocity, resonatorDriveEnvelope.velocity))
      if (resonatorMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(resonator.wet.gain, now, resonatorMixEnvelope, 0, resonator.settings.mix * this.envelopePeakGain(velocity, resonatorMixEnvelope.velocity))
    })

    this.reverbs.forEach((reverb, index) => {
      const reverbDecayEnvelope = this.activeEnvelopeSettings('reverbDecay', { type: 'reverb', index })
      const reverbMixEnvelope = this.activeEnvelopeSettings('reverbMix', { type: 'reverb', index })
      const reverbPreDelayEnvelope = this.activeEnvelopeSettings('reverbPreDelay', { type: 'reverb', index })
      const reverbDampingEnvelope = this.activeEnvelopeSettings('reverbDamping', { type: 'reverb', index })
      const reverbWidthEnvelope = this.activeEnvelopeSettings('reverbWidth', { type: 'reverb', index })
      if (reverbDecayEnvelope) {
        const peakGain = this.envelopePeakGain(velocity, reverbDecayEnvelope.velocity)
        reverb.convolver.buffer = createHallImpulse(this.audioContext, { ...reverb.settings, decay: 0.6 + (reverb.settings.decay - 0.6) * peakGain })
      }
      if (reverbMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(reverb.wet.gain, now, reverbMixEnvelope, 0, reverb.settings.mix * this.envelopePeakGain(velocity, reverbMixEnvelope.velocity))
      if (reverbPreDelayEnvelope) this.applyPositiveEnvelopeOnNoteOn(reverb.preDelay.delayTime, now, reverbPreDelayEnvelope, 0, reverb.settings.preDelay * this.envelopePeakGain(velocity, reverbPreDelayEnvelope.velocity))
      if (reverbDampingEnvelope) this.applyPositiveEnvelopeOnNoteOn(reverb.tone.frequency, now, reverbDampingEnvelope, 13000, 13000 - reverb.settings.damping * 9500 * this.envelopePeakGain(velocity, reverbDampingEnvelope.velocity))
      if (reverbWidthEnvelope) {
        const peakWidth = reverb.settings.width * this.envelopePeakGain(velocity, reverbWidthEnvelope.velocity)
        this.applyPositiveEnvelopeOnNoteOn(reverb.left.gain, now, reverbWidthEnvelope, 0.5, (1 + peakWidth) / 2)
        this.applyPositiveEnvelopeOnNoteOn(reverb.right.gain, now, reverbWidthEnvelope, 0.5, (1 + peakWidth) / 2)
        this.applyPositiveEnvelopeOnNoteOn(reverb.leftCross.gain, now, reverbWidthEnvelope, 0.5, (1 - peakWidth) / 2)
        this.applyPositiveEnvelopeOnNoteOn(reverb.rightCross.gain, now, reverbWidthEnvelope, 0.5, (1 - peakWidth) / 2)
      }
    })

    this.choruses.forEach((chorus, index) => {
      const chorusRateEnvelope = this.activeEnvelopeSettings('chorusRate', { type: 'chorus', index })
      const chorusDepthEnvelope = this.activeEnvelopeSettings('chorusDepth', { type: 'chorus', index })
      const chorusDelayEnvelope = this.activeEnvelopeSettings('chorusDelay', { type: 'chorus', index })
      const chorusMixEnvelope = this.activeEnvelopeSettings('chorusMix', { type: 'chorus', index })
      if (chorusRateEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.lfo.frequency, now, chorusRateEnvelope, 0.01, chorus.settings.rate * this.envelopePeakGain(velocity, chorusRateEnvelope.velocity))
      if (chorusDepthEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.lfoGain.gain, now, chorusDepthEnvelope, 0, chorus.settings.depth * 0.005 * this.envelopePeakGain(velocity, chorusDepthEnvelope.velocity))
      if (chorusDelayEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.delay.delayTime, now, chorusDelayEnvelope, 0, chorus.settings.delay * this.envelopePeakGain(velocity, chorusDelayEnvelope.velocity))
      if (chorusMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.wet.gain, now, chorusMixEnvelope, 0, chorus.settings.mix * this.envelopePeakGain(velocity, chorusMixEnvelope.velocity))
    })

    this.flangers.forEach((flanger, index) => {
      const flangerRateEnvelope = this.activeEnvelopeSettings('flangerRate', { type: 'flanger', index })
      const flangerDepthEnvelope = this.activeEnvelopeSettings('flangerDepth', { type: 'flanger', index })
      const flangerDelayEnvelope = this.activeEnvelopeSettings('flangerDelay', { type: 'flanger', index })
      const flangerFeedbackEnvelope = this.activeEnvelopeSettings('flangerFeedback', { type: 'flanger', index })
      const flangerMixEnvelope = this.activeEnvelopeSettings('flangerMix', { type: 'flanger', index })
      if (flangerRateEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.lfo.frequency, now, flangerRateEnvelope, 0.01, flanger.settings.rate * this.envelopePeakGain(velocity, flangerRateEnvelope.velocity))
      if (flangerDepthEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.lfoGain.gain, now, flangerDepthEnvelope, 0, flanger.settings.depth * 0.002 * this.envelopePeakGain(velocity, flangerDepthEnvelope.velocity))
      if (flangerDelayEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.delay.delayTime, now, flangerDelayEnvelope, 0, flanger.settings.delay * this.envelopePeakGain(velocity, flangerDelayEnvelope.velocity))
      if (flangerFeedbackEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.feedback.gain, now, flangerFeedbackEnvelope, 0, flanger.settings.feedback * this.envelopePeakGain(velocity, flangerFeedbackEnvelope.velocity))
      if (flangerMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.wet.gain, now, flangerMixEnvelope, 0, flanger.settings.mix * this.envelopePeakGain(velocity, flangerMixEnvelope.velocity))
    })

    this.tremolos.forEach((tremolo, index) => {
      const tremoloRateEnvelope = this.activeEnvelopeSettings('tremoloRate', { type: 'tremolo', index })
      const tremoloDepthEnvelope = this.activeEnvelopeSettings('tremoloDepth', { type: 'tremolo', index })
      const tremoloMixEnvelope = this.activeEnvelopeSettings('tremoloMix', { type: 'tremolo', index })
      if (tremoloRateEnvelope) this.applyPositiveEnvelopeOnNoteOn(tremolo.lfo.frequency, now, tremoloRateEnvelope, 0.01, tremolo.settings.rate * this.envelopePeakGain(velocity, tremoloRateEnvelope.velocity))
      if (tremoloDepthEnvelope) this.applyPositiveEnvelopeOnNoteOn(tremolo.lfoDepthGain.gain, now, tremoloDepthEnvelope, 0, tremolo.settings.depth / 2 * this.envelopePeakGain(velocity, tremoloDepthEnvelope.velocity))
      if (tremoloMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(tremolo.wet.gain, now, tremoloMixEnvelope, 0, tremolo.settings.mix * this.envelopePeakGain(velocity, tremoloMixEnvelope.velocity))
    })

    this.eqs.forEach((eq, eqIndex) => {
      eq.settings.envelopes.forEach((envelope) => {
        if (envelope.bypassed) return
        const target = this.parseEqTarget(envelope.destination)
        if (!target || target.eqIndex !== eqIndex) return
        const band = eq.bands[target.bandIndex]
        const bandSettings = eq.settings.bands[target.bandIndex]
        if (!band || !bandSettings) return
        const peakGain = this.envelopePeakGain(velocity, envelope.velocity)
        if (target.parameter === 'frequency') {
          this.applyPositiveEnvelopeOnNoteOn(band.frequency, now, envelope, 20, bandSettings.frequency * peakGain)
        } else if (target.parameter === 'q') {
          this.applyPositiveEnvelopeOnNoteOn(band.Q, now, envelope, 0, bandSettings.q * peakGain)
        } else {
          this.applyPositiveEnvelopeOnNoteOn(band.gain, now, envelope, bandSettings.gain, bandSettings.gain + 24 * peakGain)
        }
      })
    })
  }

  /** Rebuilds the audio graph by connecting each module in `flatAudioOrder`, one instance at a time. */
  private routeOutput(): void {
    this.mixBus.disconnect()
    let output: AudioNode = this.mixBus
    this.flatAudioOrder.forEach(({ type, index }) => {
      if (type === 'filters' && this.filters[index]) output = routeFilterModule(output, this.filters[index])
      else if (type === 'dynamics' && this.dynamics[index]) output = routeDynamicsModule(output, this.dynamics[index])
      else if (type === 'delays' && this.delays[index]) output = routeDelayModule(output, this.delays[index])
      else if (type === 'overdrives' && this.overdrives[index]) output = routeOverdriveModule(output, this.overdrives[index])
      else if (type === 'choruses' && this.choruses[index]) output = routeChorusModule(output, this.choruses[index])
      else if (type === 'flangers' && this.flangers[index]) output = routeFlangerModule(output, this.flangers[index])
      else if (type === 'tremolos' && this.tremolos[index]) output = routeTremoloModule(output, this.tremolos[index])
      else if (type === 'reverbs' && this.reverbs[index]) output = routeReverbModule(output, this.reverbs[index])
      else if (type === 'resonators' && this.resonators[index]) output = routeResonatorModule(output, this.resonators[index])
      else if (type === 'eqs' && this.eqs[index]) output = routeEqModule(output, this.eqs[index])
    })
    output.connect(this.outputGain)
  }

  private parseEqTarget(target: string): { eqIndex: number; bandIndex: number; parameter: EqParameter } | undefined {
    const match = /^eq:(\d+):(\d+):(frequency|q|gain)$/.exec(target)
    if (!match) return undefined
    return { eqIndex: Number(match[1]), bandIndex: Number(match[2]), parameter: match[3] as EqParameter }
  }

  private isEqTargetForModule(target: string, eqIndex: number): target is EqModulationTarget {
    const parsed = this.parseEqTarget(target)
    return !!parsed && parsed.eqIndex === eqIndex && parsed.bandIndex < this.eqs[eqIndex].bands.length
  }

  private eqTarget(eqIndex: number, bandIndex: number, parameter: EqParameter): EqModulationTarget {
    return `eq:${eqIndex}:${bandIndex}:${parameter}`
  }

  private reindexEqModulationTargets(): void {
    this.eqs.forEach((eq, eqIndex) => {
      eq.settings.envelopes = eq.settings.envelopes.map((envelope) => {
        const target = this.parseEqTarget(envelope.destination)
        return target ? { ...envelope, destination: this.eqTarget(eqIndex, target.bandIndex, target.parameter) } : envelope
      })
      eq.lfos.forEach((lfo, lfoIndex) => {
        const target = this.parseEqTarget(lfo.settings.target)
        if (!target) return
        const nextTarget = this.eqTarget(eqIndex, target.bandIndex, target.parameter)
        lfo.settings = { ...lfo.settings, target: nextTarget }
        eq.settings.lfos[lfoIndex] = { ...eq.settings.lfos[lfoIndex], target: nextTarget }
      })
    })
  }

  private removeEqBandModulation(eq: EqModule, eqIndex: number, bandIndex: number): void {
    eq.settings.envelopes = eq.settings.envelopes.flatMap((envelope) => {
      const target = this.parseEqTarget(envelope.destination)
      if (!target || target.bandIndex === bandIndex) return []
      return [{ ...envelope, destination: this.eqTarget(eqIndex, target.bandIndex > bandIndex ? target.bandIndex - 1 : target.bandIndex, target.parameter) }]
    })
    const retainedLfos: LfoModule[] = []
    const retainedSettings: EqLfoSettings[] = []
    eq.lfos.forEach((lfo, lfoIndex) => {
      const target = this.parseEqTarget(lfo.settings.target)
      if (!target || target.bandIndex === bandIndex) {
        destroyLfoModule(lfo)
        return
      }
      const nextTarget = this.eqTarget(eqIndex, target.bandIndex > bandIndex ? target.bandIndex - 1 : target.bandIndex, target.parameter)
      lfo.settings = { ...lfo.settings, target: nextTarget }
      retainedLfos.push(lfo)
      retainedSettings.push({ ...eq.settings.lfos[lfoIndex], target: nextTarget })
    })
    eq.lfos = retainedLfos
    eq.settings.lfos = retainedSettings
  }

  private createVoicesForOscillator(note: number, velocity: number, oscillatorIndex: number, glideFromNote?: number): Voice[] {
    return Array.from({ length: UNISON_LAYER_COUNT }, (_, layerIndex) => this.createOscillatorVoice(note, velocity, oscillatorIndex, layerIndex, glideFromNote))
  }

  private createOscillatorVoice(note: number, velocity: number, oscillatorIndex: number, layerIndex: number, glideFromNote?: number): Voice {
    const settings = this.settings[oscillatorIndex]
    const now = this.audioContext.currentTime
    const { oscillator, frequency, glideFromFrequency, baseDetune } = createOscillatorSource(this.audioContext, settings, note, layerIndex, glideFromNote)
    const voice = this.createVoice(oscillator, 'oscillator', velocity, oscillatorIndex, layerIndex)
    voice.baseDetune = baseDetune
    this.applyPitchEnvelopeOnNoteOn(voice, now)
    oscillator.start()
    const modulation = createFrequencyModulator(this.audioContext, settings, frequency, glideFromFrequency)
    if (modulation) {
      modulation.gain.connect(oscillator.frequency)
      modulation.modulator.start()
      voice.modulator = modulation.modulator
      voice.fmGain = modulation.gain
    }
    return voice
  }

  private createNoiseVoice(velocity: number, noiseIndex: number): Voice {
    const source = createNoiseSource(this.audioContext, this.noiseSettings[noiseIndex])
    const voice = this.createVoice(source, 'noise', velocity, undefined, undefined, noiseIndex)
    this.applyNoiseLevelEnvelopeOnNoteOn(voice, this.audioContext.currentTime)
    source.start()
    return voice
  }

  private createVoice(source: AudioScheduledSourceNode, kind: Voice['kind'], velocity: number, oscillatorIndex?: number, layerIndex?: number, noiseIndex?: number): Voice {
    const normalizedVelocity = Math.max(0, Math.min(velocity, 127)) / 127
    const gainNode = this.audioContext.createGain()
    const envelopeGain = this.audioContext.createGain()
    const panner = this.audioContext.createStereoPanner()
    const voice: Voice = { source, kind, oscillator: source instanceof OscillatorNode ? source : undefined, gainNode, envelopeGain, panner, velocity: normalizedVelocity, oscillatorIndex, noiseIndex, layerIndex, stopping: false }
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(this.sourceGain(voice), now)
    const envelope = kind === 'oscillator' ? this.activeEnvelopeSettings('oscillatorLevel', { type: 'oscillator', index: oscillatorIndex! }) : undefined
    if (envelope) {
      const peakGain = this.envelopePeakGain(voice.velocity, envelope.velocity)
      envelopeGain.gain.setValueAtTime(0, now)
      const attackStart = now + envelope.decay / 1000
      const attackEnd = attackStart + envelope.attack / 1000
      if (envelope.attackCurve === 'exponential' && envelope.attack > 0) {
        envelopeGain.gain.setValueAtTime(ENVELOPE_GAIN_EPSILON, attackStart)
        envelopeGain.gain.exponentialRampToValueAtTime(Math.max(peakGain, ENVELOPE_GAIN_EPSILON), attackEnd)
      } else {
        envelopeGain.gain.setValueAtTime(0, attackStart)
        if (envelope.attack > 0) envelopeGain.gain.linearRampToValueAtTime(peakGain, attackEnd)
        else envelopeGain.gain.setValueAtTime(peakGain, attackStart)
      }
    } else {
      envelopeGain.gain.setValueAtTime(1, now)
    }
    panner.pan.setValueAtTime(kind === 'noise' ? this.noiseSettings[noiseIndex!].stereoSpread : this.layerPan(layerIndex!, this.settings[oscillatorIndex!].stereoSpread), now)
    source.connect(gainNode).connect(envelopeGain).connect(panner).connect(this.mixBus)
    if (this.amplitudeModulation) this.createAmplitudeModulation(voice)
    return voice
  }

  private replaceNoiseSource(voice: Voice): void {
    const oldSource = voice.source
    const source = createNoiseSource(this.audioContext, this.noiseSettings[voice.noiseIndex!])
    source.connect(voice.gainNode)
    source.start()
    voice.source = source
    oldSource.stop()
    oldSource.disconnect()
  }

  private stopVoice(voice: Voice): void {
    if (voice.stopping) return
    voice.stopping = true
    const now = this.audioContext.currentTime
    const volumeEnvelope = this.activeEnvelopeSettings(
      voice.kind === 'oscillator' ? 'oscillatorLevel' : 'noiseLevel',
      voice.kind === 'oscillator'
        ? { type: 'oscillator', index: voice.oscillatorIndex! }
        : { type: 'noise', index: voice.noiseIndex! },
    )
    const holdEnd = now + (volumeEnvelope?.hold ?? 0) / 1000
    const releaseMs = volumeEnvelope?.release ?? ENVELOPE_BYPASS_RELEASE_MS
    const stopAt = holdEnd + releaseMs / 1000
    const currentGain = Math.max(voice.envelopeGain.gain.value, 0)
    voice.envelopeGain.gain.cancelScheduledValues(now)
    voice.envelopeGain.gain.setValueAtTime(currentGain, now)
    voice.envelopeGain.gain.setValueAtTime(currentGain, holdEnd)
    if (releaseMs > 0 && volumeEnvelope?.releaseCurve === 'exponential' && currentGain > ENVELOPE_GAIN_EPSILON) {
      voice.envelopeGain.gain.exponentialRampToValueAtTime(ENVELOPE_GAIN_EPSILON, stopAt)
      voice.envelopeGain.gain.setValueAtTime(0, stopAt)
    } else if (releaseMs > 0) voice.envelopeGain.gain.linearRampToValueAtTime(0, stopAt)
    else voice.envelopeGain.gain.setValueAtTime(0, holdEnd)
    voice.source.stop(stopAt)
    voice.source.onended = () => {
      voice.source.disconnect()
      voice.modulator?.stop()
      voice.modulator?.disconnect()
      this.removeAmplitudeModulationFromVoice(voice)
      voice.gainNode.disconnect()
      voice.envelopeGain.disconnect()
      voice.panner.disconnect()
    }
  }

  private stopNote(note: number): void {
    const active = this.activeVoices.find((voice) => voice.note === note)
    if (!active) return
    active.voices.forEach((voice) => this.stopVoice(voice))
    this.activeVoices = this.activeVoices.filter((voice) => voice !== active)
  }

  private createAmplitudeModulation(voice: Voice): void {
    const { modulator, gain } = createAmplitudeModulation(this.audioContext, this.amplitudeModulation!, this.amplitudeModulationBypassed, voice.gainNode, this.sourceGain(voice))
    voice.amplitudeModulator = modulator
    voice.amplitudeModulationGain = gain
  }

  private removeAmplitudeModulationFromVoice(voice: Voice): void {
    destroyAmplitudeModulation(voice.amplitudeModulator, voice.amplitudeModulationGain)
    voice.amplitudeModulator = undefined
    voice.amplitudeModulationGain = undefined
  }

  private setAmplitudeModulationDepth(voice: Voice, time: number): void {
    if (!voice.amplitudeModulationGain || !this.amplitudeModulation) return
    voice.amplitudeModulationGain.gain.setTargetAtTime(this.amplitudeModulationBypassed ? 0 : this.amplitudeModulationGain(voice), time, 0.01)
  }

  private amplitudeModulationGain(voice: Voice): number {
    return this.sourceGain(voice) * this.amplitudeModulation!.depth
  }

  private sourceGain(voice: Voice): number {
    if (voice.kind === 'noise') {
      const settings = this.noiseSettings[voice.noiseIndex!]
      return settings.bypassed ? 0 : voice.velocity * MAX_GAIN * settings.level
    }
    const settings = this.settings[voice.oscillatorIndex!]
    return settings.bypassed ? 0 : voice.velocity * MAX_GAIN * settings.level / UNISON_LAYER_COUNT
  }

  private hasAudibleSources(): boolean {
    const oscillatorAudible = this.settings.some((settings) => !settings.bypassed && settings.level > 0)
    const noiseAudible = this.noiseSettings.some((settings) => !settings.bypassed && settings.level > 0)
    return oscillatorAudible || noiseAudible
  }

  private layerPan(index: number, stereoSpread: number): number {
    return index === 0 ? -stereoSpread : index === 2 ? stereoSpread : 0
  }

  private clampEnvelopeTime(value: number | undefined, fallback: number, max: number): number {
    if (value === undefined) return fallback
    return Math.max(0, Math.min(value, max))
  }

  private clampUnit(value: number | undefined, fallback: number): number {
    if (value === undefined) return fallback
    return Math.max(0, Math.min(value, 1))
  }

  private clampEnvelopeCurve(value: EnvelopeCurve | undefined, fallback: EnvelopeCurve): EnvelopeCurve {
    return value === 'linear' || value === 'exponential' ? value : fallback
  }

  private clampEnvelopeDestination(value: EnvelopeDestination | undefined, fallback: EnvelopeDestination): EnvelopeDestination {
    return value === 'oscillatorLevel' || value === 'oscillatorPitch' || value === 'noiseLevel' || value === 'filterCutoff' || value === 'filterResonance' || value === 'delayTime' || value === 'delayRepetitions' || value === 'delayMix' || value === 'overdriveDrive' || value === 'overdriveTone' || value === 'overdriveFeedback' || value === 'overdriveMix' || value === 'chorusRate' || value === 'chorusDepth' || value === 'chorusDelay' || value === 'chorusMix' || value === 'flangerRate' || value === 'flangerDepth' || value === 'flangerDelay' || value === 'flangerFeedback' || value === 'flangerMix' || value === 'tremoloRate' || value === 'tremoloDepth' || value === 'tremoloMix' || value === 'resonatorFrequency' || value === 'resonatorDecay' || value === 'resonatorFeedback' || value === 'resonatorDamping' || value === 'resonatorDrive' || value === 'resonatorMix' || value === 'reverbDecay' || value === 'reverbMix' || value === 'reverbPreDelay' || value === 'reverbDamping' || value === 'reverbWidth' ? value : fallback
  }

  private envelopePeakGain(velocity: number, velocityAmount: number): number {
    return Math.max(0, Math.min(1, (1 - velocityAmount) + velocity * velocityAmount))
  }

  private applyPitchEnvelopeOnNoteOn(voice: Voice, now: number): void {
    const envelope = this.activeEnvelopeSettings('oscillatorPitch', { type: 'oscillator', index: voice.oscillatorIndex! })
    if (!envelope || !voice.oscillator || voice.baseDetune === undefined) {
      return
    }
    const depth = PITCH_ENVELOPE_DEPTH_CENTS * this.envelopePeakGain(voice.velocity, envelope.velocity)
    const baseDetune = voice.baseDetune
    const peakDetune = voice.baseDetune + depth
    const attackStart = now
    const attackDuration = envelope.attack / 1000
    const decayDuration = (envelope.decay > 0 ? envelope.decay : envelope.release) / 1000
    const holdDuration = envelope.hold / 1000
    const detune = voice.oscillator.detune

    detune.cancelScheduledValues(now)
    detune.setValueAtTime(baseDetune, now)
    if (attackDuration <= 0) {
      detune.setValueAtTime(peakDetune, attackStart)
    } else if (envelope.attackCurve === 'linear') {
      detune.linearRampToValueAtTime(peakDetune, attackStart + attackDuration)
    } else {
      const pointCount = 32
      const curve = new Float32Array(pointCount)
      for (let index = 0; index < pointCount; index += 1) {
        const t = index / (pointCount - 1)
        const eased = Math.pow(t, 2.5)
        curve[index] = baseDetune + (peakDetune - baseDetune) * eased
      }
      detune.setValueCurveAtTime(curve, attackStart, attackDuration)
    }

    const decayStart = attackStart + attackDuration
    const decayEnd = decayStart + holdDuration + decayDuration
    detune.setValueAtTime(peakDetune, decayStart + holdDuration)
    if (decayDuration <= 0) {
      detune.setValueAtTime(baseDetune, decayStart + holdDuration)
      return
    }

    if (envelope.releaseCurve === 'linear') {
      detune.linearRampToValueAtTime(baseDetune, decayEnd)
      return
    }

    const pointCount = 32
    const curve = new Float32Array(pointCount)
    for (let index = 0; index < pointCount; index += 1) {
      const t = index / (pointCount - 1)
      const eased = Math.pow(t, 2.5)
      curve[index] = peakDetune + (baseDetune - peakDetune) * eased
    }
    detune.setValueCurveAtTime(curve, decayStart + holdDuration, decayDuration)
  }

  private applyNoiseLevelEnvelopeOnNoteOn(voice: Voice, now: number): void {
    const envelope = this.activeEnvelopeSettings('noiseLevel', { type: 'noise', index: voice.noiseIndex! })
    if (!envelope || voice.kind !== 'noise') {
      return
    }
    const peak = this.sourceGain(voice) * this.envelopePeakGain(voice.velocity, envelope.velocity)
    this.applyPositiveEnvelopeOnNoteOn(voice.gainNode.gain, now, envelope, 0, peak)
  }

  private applyPositiveEnvelopeOnNoteOn(param: AudioParam, now: number, envelope: EnvelopeSettings, baseValue: number, peakValue: number): void {
    const attackDuration = envelope.attack / 1000
    const holdDuration = envelope.hold / 1000
    const decayDuration = (envelope.decay > 0 ? envelope.decay : envelope.release) / 1000
    const attackEnd = now + attackDuration
    const decayStart = attackEnd + holdDuration
    const decayEnd = decayStart + decayDuration
    const safeBase = Math.max(baseValue, ENVELOPE_GAIN_EPSILON)
    const safePeak = Math.max(peakValue, ENVELOPE_GAIN_EPSILON)

    param.cancelScheduledValues(now)
    if (attackDuration <= 0) {
      param.setValueAtTime(peakValue, now)
    } else if (envelope.attackCurve === 'exponential' && peakValue > ENVELOPE_GAIN_EPSILON) {
      param.setValueAtTime(safeBase, now)
      param.exponentialRampToValueAtTime(safePeak, attackEnd)
      if (baseValue === 0) param.setValueAtTime(0, now)
    } else {
      param.setValueAtTime(baseValue, now)
      param.linearRampToValueAtTime(peakValue, attackEnd)
    }

    param.setValueAtTime(peakValue, decayStart)
    if (decayDuration <= 0) {
      param.setValueAtTime(baseValue, decayStart)
      return
    }

    if (envelope.releaseCurve === 'exponential' && peakValue > ENVELOPE_GAIN_EPSILON) {
      param.exponentialRampToValueAtTime(safeBase, decayEnd)
      if (baseValue === 0) param.setValueAtTime(0, decayEnd)
      return
    }

    param.linearRampToValueAtTime(baseValue, decayEnd)
  }

  private normalizeEnvelopeSettings(changes: Partial<EnvelopeSettings>, fallback: EnvelopeSettings): EnvelopeSettings {
    return {
      attack: this.clampEnvelopeTime(changes.attack, fallback.attack, ENVELOPE_ATTACK_MAX_MS),
      decay: this.clampEnvelopeTime(changes.decay, fallback.decay, ENVELOPE_DECAY_MAX_MS),
      hold: this.clampEnvelopeTime(changes.hold, fallback.hold, ENVELOPE_HOLD_MAX_MS),
      release: this.clampEnvelopeTime(changes.release, fallback.release, ENVELOPE_RELEASE_MAX_MS),
      velocity: this.clampUnit(changes.velocity, fallback.velocity),
      attackCurve: this.clampEnvelopeCurve(changes.attackCurve, fallback.attackCurve),
      releaseCurve: this.clampEnvelopeCurve(changes.releaseCurve, fallback.releaseCurve),
      destination: this.clampEnvelopeDestination(changes.destination, fallback.destination),
      source: changes.source ?? fallback.source,
    }
  }

  private normalizeEqEnvelopeSettings(eqIndex: number, changes: Partial<EqEnvelopeSettings>, fallback: EqEnvelopeSettings): EqEnvelopeSettings {
    const destination = changes.destination ?? fallback.destination
    if (!this.isEqTargetForModule(destination, eqIndex)) throw new Error('Invalid EQ envelope target')
    return { ...this.normalizeEnvelopeSettings(changes, fallback), destination, bypassed: changes.bypassed ?? fallback.bypassed }
  }

  private activeEnvelopeSettings(destination?: EnvelopeDestination, source?: EnvelopeSettings['source']): EnvelopeSettings | undefined {
    const matching = this.envelopeSettings.filter((envelope) => (
      !envelope.bypassed && (!destination || envelope.settings.destination === destination)
    ))
    if (!source) return matching.find((envelope) => envelope.settings.source === undefined)?.settings
    return matching.find((envelope) => (
      envelope.settings.source?.type === source.type && envelope.settings.source.index === source.index
    ))?.settings ?? matching.find((envelope) => envelope.settings.source === undefined)?.settings
  }
}
