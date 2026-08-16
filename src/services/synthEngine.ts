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
  layerIndex?: number
  baseDetune?: number
  stopping: boolean
}

type DelayModule = { node: DelayNode; feedback: GainNode; resonance: BiquadFilterNode; drive: WaveShaperNode; driveGain: GainNode; wet: GainNode; dry: GainNode; output: GainNode; settings: DelaySettings }
type OverdriveModule = {
  input: GainNode
  dcBlocker: BiquadFilterNode
  driveGain: GainNode
  shaper: WaveShaperNode
  tone: BiquadFilterNode
  feedbackTone: BiquadFilterNode
  feedbackDelay: DelayNode
  feedbackGain: GainNode
  wet: GainNode
  dry: GainNode
  output: GainNode
  settings: OverdriveSettings
}
type ChorusModule = {
  input: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
  delay: DelayNode
  wet: GainNode
  dry: GainNode
  output: GainNode
  settings: ChorusSettings
}
type FlangerModule = {
  input: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
  delay: DelayNode
  feedback: GainNode
  wet: GainNode
  dry: GainNode
  output: GainNode
  settings: FlangerSettings
}
type TremoloModule = {
  input: GainNode
  lfo: OscillatorNode
  lfoDepthGain: GainNode
  tremoloGain: GainNode
  wet: GainNode
  dry: GainNode
  output: GainNode
  settings: TremoloSettings
}
type ReverbModule = {
  input: GainNode
  preDelay: DelayNode
  convolver: ConvolverNode
  tone: BiquadFilterNode
  splitter: ChannelSplitterNode
  left: GainNode
  right: GainNode
  leftCross: GainNode
  rightCross: GainNode
  merger: ChannelMergerNode
  wet: GainNode
  dry: GainNode
  output: GainNode
  settings: ReverbSettings
}
type DynamicsModule = {
  input: GainNode
  output: GainNode
  compressor?: DynamicsCompressorNode
  makeupGain?: GainNode
  analyser?: AnalyserNode
  gateGain?: GainNode
  gateLevelData?: Float32Array<ArrayBuffer>
  gateTimer?: ReturnType<typeof setInterval>
  gateLastAboveThresholdTime: number
  gateOpen: boolean
  settings: DynamicsSettings
}
type EqModule = {
  input: GainNode
  bands: BiquadFilterNode[]
  output: GainNode
  settings: EqSettings
  lfos: LfoModule[]
}

const MAX_GAIN = 0.2
const UNISON_LAYER_COUNT = 3
const RANDOM_WAVE_HARMONIC_COUNT = 32
const NOISE_BUFFER_DURATION = 2
const ENVELOPE_ATTACK_MAX_MS = 300
const ENVELOPE_DECAY_MAX_MS = 150
const ENVELOPE_HOLD_MAX_MS = 150
const ENVELOPE_RELEASE_MAX_MS = 450
const ENVELOPE_BYPASS_RELEASE_MS = 20
const ENVELOPE_GAIN_EPSILON = 0.0001
const PITCH_ENVELOPE_DEPTH_CENTS = 240
const OVERDRIVE_OUTPUT_ATTENUATION = 40
const GATE_CLOSED_GAIN = 0.0001
const GATE_ANALYSIS_INTERVAL_MS = 20

export type Waveform = OscillatorType | 'random'
export type NoiseColor = 'white' | 'pink' | 'brown'

export type OscillatorSettings = {
  bypassed: boolean
  detune: number
  glide: number
  level: number
  waveform: Waveform
  unisonDetune: number
  stereoSpread: number
  fmAmount: number
  fmSource: Waveform
}

export type NoiseSettings = {
  bypassed: boolean
  color: NoiseColor
  level: number
  stereoSpread: number
}

export type OutputSettings = {
  volume: number
  pan: number
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass'

export type FilterSettings = {
  bypassed: boolean
  type: FilterType
  cutoff: number
  resonance: number
  gain: number
}

export type DelaySettings = {
  bypassed: boolean
  time: number
  noteTime: number
  feedback: number
  resonance: number
  mix: number
  overdrive: number
}

export type OverdriveSettings = {
  bypassed: boolean
  drive: number
  tone: number
  feedback: number
  mix: number
}

export type ChorusSettings = {
  bypassed: boolean
  waveform: Waveform
  rate: number
  depth: number
  delay: number
  mix: number
}

export type FlangerSettings = {
  bypassed: boolean
  waveform: Waveform
  rate: number
  depth: number
  delay: number
  feedback: number
  mix: number
}

export type TremoloSettings = {
  bypassed: boolean
  waveform: Waveform
  rate: number
  depth: number
  mix: number
}

export type HallType = 'small-hall' | 'wooden-hall' | 'concert-hall' | 'opera-house' | 'cathedral' | 'arena'

export type ReverbSettings = {
  bypassed: boolean
  hallType: HallType
  decay: number
  preDelay: number
  damping: number
  width: number
  mix: number
}

export type CompressorSettings = {
  type: 'compressor'
  bypassed: boolean
  threshold: number
  knee: number
  ratio: number
  attack: number
  release: number
  makeupGain: number
}

export type GateSettings = {
  type: 'gate'
  bypassed: boolean
  threshold: number
  attack: number
  hold: number
  release: number
}

export type LimiterSettings = {
  type: 'limiter'
  bypassed: boolean
  ceiling: number
  release: number
  makeupGain: number
}

export type DynamicsSettings = CompressorSettings | GateSettings | LimiterSettings
export type DynamicsSettingsChanges = Partial<{
  threshold: number
  knee: number
  ratio: number
  attack: number
  hold: number
  release: number
  makeupGain: number
  ceiling: number
  bypassed: boolean
}>

export type EqBandType = 'peaking' | 'lowshelf' | 'highshelf' | 'lowpass' | 'highpass' | 'notch'

export type EqBandSettings = {
  bypassed: boolean
  type: EqBandType
  frequency: number
  gain: number
  q: number
}

export type EqParameter = 'frequency' | 'q' | 'gain'
export type EqModulationTarget = `eq:${number}:${number}:${EqParameter}`

export type EqSettings = {
  kind: 'single' | 'multiband'
  bypassed: boolean
  bands: EqBandSettings[]
  envelopes: EqEnvelopeSettings[]
  lfos: EqLfoSettings[]
}

export type EffectGroup = 'filters' | 'overdrives' | 'choruses' | 'flangers' | 'tremolos' | 'dynamics' | 'delays' | 'reverbs' | 'eqs'

/** A single audio module identified by its group and its index within that group's settings array. */
export type FlatAudioModule = { type: EffectGroup; index: number }

export type AmplitudeModulationSettings = {
  rate: number
  depth: number
  waveform: Waveform
}

export type LfoTarget =
  | `oscillator:${number}:detune`
  | `oscillator:${number}:level`
  | `oscillator:${number}:unisonDetune`
  | `oscillator:${number}:stereoSpread`
  | `oscillator:${number}:fmAmount`
  | `noise:${number}:level`
  | `noise:${number}:stereoSpread`
  | `filter:${number}:cutoff`
  | `filter:${number}:resonance`
  | `filter:${number}:gain`
  | `delay:${number}:time`
  | `delay:${number}:feedback`
  | `delay:${number}:mix`
  | `delay:${number}:overdrive`
  | `overdrive:${number}:drive`
  | `overdrive:${number}:tone`
  | `overdrive:${number}:feedback`
  | `overdrive:${number}:mix`
  | `chorus:${number}:rate`
  | `chorus:${number}:depth`
  | `chorus:${number}:delay`
  | `chorus:${number}:mix`
  | `flanger:${number}:rate`
  | `flanger:${number}:depth`
  | `flanger:${number}:delay`
  | `flanger:${number}:feedback`
  | `flanger:${number}:mix`
  | `tremolo:${number}:rate`
  | `tremolo:${number}:depth`
  | `tremolo:${number}:mix`
  | `reverb:${number}:preDelay`
  | `reverb:${number}:damping`
  | `reverb:${number}:mix`
  | `reverb:${number}:width`
  | `output:0:volume`
  | `output:0:pan`
  | EqModulationTarget
export type LfoSettings = {
  waveform: Waveform
  rate: number
  depth: number
  target: LfoTarget
}

type LfoModule = {
  oscillator: OscillatorNode
  gain: GainNode
  settings: LfoSettings
  bypassed: boolean
}

export type EnvelopeCurve = 'linear' | 'exponential'
export type EnvelopeDestination =
  | 'oscillatorLevel'
  | 'oscillatorPitch'
  | 'noiseLevel'
  | 'filterCutoff'
  | 'filterResonance'
  | 'delayTime'
  | 'delayFeedback'
  | 'delayMix'
  | 'overdriveDrive'
  | 'overdriveTone'
  | 'overdriveFeedback'
  | 'overdriveMix'
  | 'chorusRate'
  | 'chorusDepth'
  | 'chorusDelay'
  | 'chorusMix'
  | 'flangerRate'
  | 'flangerDepth'
  | 'flangerDelay'
  | 'flangerFeedback'
  | 'flangerMix'
  | 'tremoloRate'
  | 'tremoloDepth'
  | 'tremoloMix'
  | 'reverbDecay'
  | 'reverbMix'
  | 'reverbPreDelay'
  | 'reverbDamping'
  | 'reverbWidth'
  | EqModulationTarget

export type EnvelopeSettings = {
  attack: number
  decay: number
  hold: number
  release: number
  velocity: number
  attackCurve: EnvelopeCurve
  releaseCurve: EnvelopeCurve
  destination: EnvelopeDestination
}

export type EqEnvelopeSettings = EnvelopeSettings & { destination: EqModulationTarget; bypassed: boolean }
export type EqLfoSettings = LfoSettings & { target: EqModulationTarget; bypassed: boolean }

export function createOscillatorSettings(): OscillatorSettings {
  return {
    bypassed: false,
    detune: 0,
    glide: 0,
    level: 1,
    waveform: 'sine',
    unisonDetune: 0,
    stereoSpread: 0,
    fmAmount: 0,
    fmSource: 'sine',
  }
}

export function createNoiseSettings(): NoiseSettings {
  return { bypassed: false, color: 'white', level: 0, stereoSpread: 0 }
}

export function createOutputSettings(): OutputSettings {
  return { volume: 1, pan: 0 }
}

export function createFilterSettings(): FilterSettings {
  return { bypassed: false, type: 'bandpass', cutoff: 12000, resonance: 0, gain: 0 }
}

export function createDelaySettings(): DelaySettings {
  return { bypassed: false, time: 0.25, noteTime: 16, feedback: 0.35, resonance: 0, mix: 0.3, overdrive: 0 }
}

export function createOverdriveSettings(): OverdriveSettings {
  return { bypassed: false, drive: 0.35, tone: 0.55, feedback: 0, mix: 1 }
}

export function createChorusSettings(): ChorusSettings {
  return { bypassed: false, waveform: 'sine', rate: 0.8, depth: 0.5, delay: 0.018, mix: 0.45 }
}

export function createFlangerSettings(): FlangerSettings {
  return { bypassed: false, waveform: 'sine', rate: 0.35, depth: 0.5, delay: 0.003, feedback: 0.35, mix: 0.5 }
}

export function createTremoloSettings(): TremoloSettings {
  return { bypassed: false, waveform: 'sine', rate: 4, depth: 0.5, mix: 1 }
}

export function createReverbSettings(): ReverbSettings {
  return { bypassed: false, hallType: 'concert-hall', decay: 3.5, preDelay: 0.025, damping: 0.6, width: 0.9, mix: 0.25 }
}

export function createCompressorSettings(): CompressorSettings {
  return { type: 'compressor', bypassed: false, threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25, makeupGain: 0 }
}

export function createGateSettings(): GateSettings {
  return { type: 'gate', bypassed: false, threshold: -60, attack: 0.005, hold: 0.075, release: 0.08 }
}

export function createLimiterSettings(): LimiterSettings {
  return { type: 'limiter', bypassed: false, ceiling: -1, release: 0.1, makeupGain: 0 }
}

export function createEqBandSettings(type: EqBandType = 'peaking', frequency = 1000): EqBandSettings {
  return { bypassed: false, type, frequency, gain: 0, q: 1 }
}

export function createSingleBandEqSettings(): EqSettings {
  return { kind: 'single', bypassed: false, bands: [createEqBandSettings()], envelopes: [], lfos: [] }
}

export function createMultibandEqSettings(): EqSettings {
  return {
    kind: 'multiband',
    bypassed: false,
    bands: [
      createEqBandSettings('peaking', 250),
      createEqBandSettings('peaking', 1000),
      createEqBandSettings('peaking', 4000),
    ],
    envelopes: [],
    lfos: [],
  }
}

export function createEnvelopeSettings(): EnvelopeSettings {
  return { attack: 4, decay: 0, hold: 0, release: 80, velocity: 0, attackCurve: 'linear', releaseCurve: 'linear', destination: 'oscillatorLevel' }
}

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
  private noiseSettings?: NoiseSettings
  private filters: { node: BiquadFilterNode; gainNode: GainNode; settings: FilterSettings }[] = []
  private dynamics: DynamicsModule[] = []
  private delays: DelayModule[] = []
  private overdrives: OverdriveModule[] = []
  private choruses: ChorusModule[] = []
  private flangers: FlangerModule[] = []
  private tremolos: TremoloModule[] = []
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
    this.applyOutputSettings()
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
    this.applyOutputSettings()
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
        voice.baseDetune = updated.detune + this.layerDetune(voice.layerIndex!, updated.unisonDetune)
        oscillator.detune.setTargetAtTime(voice.baseDetune, now, 0.01)
      }
      if (changes.level !== undefined || changes.bypassed !== undefined) {
        voice.gainNode.gain.setTargetAtTime(this.sourceGain(voice), now, 0.01)
        this.setAmplitudeModulationDepth(voice, now)
      }
      if (changes.stereoSpread !== undefined) voice.panner.pan.setTargetAtTime(this.layerPan(voice.layerIndex!, updated.stereoSpread), now, 0.01)
      if (changes.waveform !== undefined) this.setWaveform(oscillator, updated.waveform)
      if (changes.fmSource !== undefined && voice.modulator) this.setWaveform(voice.modulator, updated.fmSource)
    }))
    if (!this.hasAudibleSources()) this.stopAllNotes()
  }

  addNoise(settings: NoiseSettings = createNoiseSettings()): void {
    if (this.noiseSettings) throw new Error('Noise is already enabled')
    this.noiseSettings = { ...settings }
    this.activeVoices.forEach((active) => active.voices.push(this.createNoiseVoice(active.velocity)))
    this.refreshLfoConnections()
  }

  removeNoise(): void {
    if (!this.noiseSettings) throw new Error('Noise is not enabled')
    this.activeVoices.forEach((active) => {
      active.voices.filter((voice) => voice.kind === 'noise').forEach((voice) => this.stopVoice(voice))
      active.voices = active.voices.filter((voice) => voice.kind !== 'noise')
    })
    this.noiseSettings = undefined
  }

  setNoiseSettings(changes: Partial<NoiseSettings>): void {
    if (!this.noiseSettings) throw new Error('Noise is not enabled')
    this.noiseSettings = { ...this.noiseSettings, ...changes }
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => voices.filter((voice) => voice.kind === 'noise').forEach((voice) => {
      if (changes.color !== undefined) this.replaceNoiseSource(voice)
      if (changes.level !== undefined || changes.bypassed !== undefined) {
        voice.gainNode.gain.setTargetAtTime(this.sourceGain(voice), now, 0.01)
        this.setAmplitudeModulationDepth(voice, now)
      }
      if (changes.stereoSpread !== undefined) voice.panner.pan.setTargetAtTime(this.noiseSettings!.stereoSpread, now, 0.01)
    }))
    if (!this.hasAudibleSources()) this.stopAllNotes()
  }

  addFilter(settings: FilterSettings = createFilterSettings()): void {
    const filter = this.audioContext.createBiquadFilter()
    const gainNode = this.audioContext.createGain()
    this.filters.push({ node: filter, gainNode, settings: { ...settings } })
    this.applyFilterSettings(this.filters.length - 1)
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
    if (!this.filters[index]) throw new RangeError(`Unknown filter index: ${index}`)
    this.filters[index].node.disconnect()
    this.filters[index].gainNode.disconnect()
    this.filters.splice(index, 1)
    this.removeFlatAudioModule('filters', index)
    this.routeOutput()
  }

  setFilterSettings(index: number, changes: Partial<FilterSettings>): void {
    const filter = this.filters[index]
    if (!filter) throw new RangeError(`Unknown filter index: ${index}`)
    filter.settings = { ...filter.settings, ...changes }
    this.applyFilterSettings(index)
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
    this.applyDynamicsSettings(dynamics)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeDynamics(index: number): void {
    const dynamics = this.dynamics[index]
    if (!dynamics) throw new RangeError(`Unknown dynamics index: ${index}`)
    this.destroyDynamicsModule(dynamics)
    this.dynamics.splice(index, 1)
    this.removeFlatAudioModule('dynamics', index)
    this.routeOutput()
  }

  setDynamicsBypassed(index: number, bypassed: boolean): void {
    this.setDynamicsSettings(index, { bypassed })
  }

  addDelay(settings: DelaySettings = createDelaySettings()): void {
    const node = this.audioContext.createDelay(2)
    const feedback = this.audioContext.createGain()
    const resonance = this.audioContext.createBiquadFilter()
    const drive = this.audioContext.createWaveShaper()
    const driveGain = this.audioContext.createGain()
    const wet = this.audioContext.createGain()
    const dry = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    this.delays.push({ node, feedback, resonance, drive, driveGain, wet, dry, output, settings: { ...settings } })
    node.connect(feedback).connect(resonance).connect(node)
    this.applyDelaySettings(this.delays[this.delays.length - 1])
    this.appendFlatAudioModule('delays', this.delays.length - 1)
    this.routeOutput()
  }

  setDelaySettings(index: number, changes: Partial<DelaySettings>): void {
    const delay = this.delays[index]
    if (!delay) throw new RangeError(`Unknown delay index: ${index}`)
    delay.settings = { ...delay.settings, ...changes }
    this.applyDelaySettings(delay)
  }

  removeDelay(index: number): void {
    const delay = this.delays[index]
    if (!delay) throw new RangeError(`Unknown delay index: ${index}`)
    delay.node.disconnect()
    delay.feedback.disconnect()
    delay.resonance.disconnect()
    delay.drive.disconnect()
    delay.driveGain.disconnect()
    delay.wet.disconnect()
    delay.dry.disconnect()
    delay.output.disconnect()
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
    const input = this.audioContext.createGain()
    const dcBlocker = this.audioContext.createBiquadFilter()
    const driveGain = this.audioContext.createGain()
    const shaper = this.audioContext.createWaveShaper()
    const tone = this.audioContext.createBiquadFilter()
    const feedbackTone = this.audioContext.createBiquadFilter()
    const feedbackDelay = this.audioContext.createDelay(0.05)
    const feedbackGain = this.audioContext.createGain()
    const wet = this.audioContext.createGain()
    const dry = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const overdrive = { input, dcBlocker, driveGain, shaper, tone, feedbackTone, feedbackDelay, feedbackGain, wet, dry, output, settings: { ...settings } }

    input.connect(dcBlocker).connect(driveGain).connect(shaper).connect(tone).connect(wet).connect(output)
    input.connect(dry).connect(output)
    tone.connect(feedbackTone).connect(feedbackDelay).connect(feedbackGain).connect(dcBlocker)
    this.overdrives.push(overdrive)
    this.applyOverdriveSettings(overdrive)
    this.appendFlatAudioModule('overdrives', this.overdrives.length - 1)
    this.routeOutput()
  }

  setOverdriveSettings(index: number, changes: Partial<OverdriveSettings>): void {
    const overdrive = this.overdrives[index]
    if (!overdrive) throw new RangeError(`Unknown overdrive index: ${index}`)
    overdrive.settings = { ...overdrive.settings, ...changes }
    this.applyOverdriveSettings(overdrive)
  }

  removeOverdrive(index: number): void {
    const overdrive = this.overdrives[index]
    if (!overdrive) throw new RangeError(`Unknown overdrive index: ${index}`)
    overdrive.input.disconnect()
    overdrive.dcBlocker.disconnect()
    overdrive.driveGain.disconnect()
    overdrive.shaper.disconnect()
    overdrive.tone.disconnect()
    overdrive.feedbackTone.disconnect()
    overdrive.feedbackDelay.disconnect()
    overdrive.feedbackGain.disconnect()
    overdrive.wet.disconnect()
    overdrive.dry.disconnect()
    overdrive.output.disconnect()
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
    const input = this.audioContext.createGain()
    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()
    const delay = this.audioContext.createDelay(0.05)
    const wet = this.audioContext.createGain()
    const dry = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const chorus = { input, lfo, lfoGain, delay, wet, dry, output, settings: { ...settings } }

    input.connect(delay).connect(wet).connect(output)
    input.connect(dry).connect(output)
    lfo.connect(lfoGain).connect(delay.delayTime)
    this.choruses.push(chorus)
    this.applyChorusSettings(chorus)
    lfo.start()
    this.appendFlatAudioModule('choruses', this.choruses.length - 1)
    this.routeOutput()
  }

  setChorusSettings(index: number, changes: Partial<ChorusSettings>): void {
    const chorus = this.choruses[index]
    if (!chorus) throw new RangeError(`Unknown chorus index: ${index}`)
    chorus.settings = { ...chorus.settings, ...changes }
    this.applyChorusSettings(chorus)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeChorus(index: number): void {
    const chorus = this.choruses[index]
    if (!chorus) throw new RangeError(`Unknown chorus index: ${index}`)
    chorus.lfo.stop()
    chorus.input.disconnect()
    chorus.lfo.disconnect()
    chorus.lfoGain.disconnect()
    chorus.delay.disconnect()
    chorus.wet.disconnect()
    chorus.dry.disconnect()
    chorus.output.disconnect()
    this.choruses.splice(index, 1)
    this.removeFlatAudioModule('choruses', index)
    this.routeOutput()
  }

  setChorusBypassed(index: number, bypassed: boolean): void {
    this.setChorusSettings(index, { bypassed })
  }

  addFlanger(settings: FlangerSettings = createFlangerSettings()): void {
    const input = this.audioContext.createGain()
    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()
    const delay = this.audioContext.createDelay(0.02)
    const feedback = this.audioContext.createGain()
    const wet = this.audioContext.createGain()
    const dry = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const flanger = { input, lfo, lfoGain, delay, feedback, wet, dry, output, settings: { ...settings } }

    input.connect(delay).connect(wet).connect(output)
    input.connect(dry).connect(output)
    delay.connect(feedback).connect(delay)
    lfo.connect(lfoGain).connect(delay.delayTime)
    this.flangers.push(flanger)
    this.applyFlangerSettings(flanger)
    lfo.start()
    this.appendFlatAudioModule('flangers', this.flangers.length - 1)
    this.routeOutput()
  }

  setFlangerSettings(index: number, changes: Partial<FlangerSettings>): void {
    const flanger = this.flangers[index]
    if (!flanger) throw new RangeError(`Unknown flanger index: ${index}`)
    flanger.settings = { ...flanger.settings, ...changes }
    this.applyFlangerSettings(flanger)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeFlanger(index: number): void {
    const flanger = this.flangers[index]
    if (!flanger) throw new RangeError(`Unknown flanger index: ${index}`)
    flanger.lfo.stop()
    flanger.input.disconnect()
    flanger.lfo.disconnect()
    flanger.lfoGain.disconnect()
    flanger.delay.disconnect()
    flanger.feedback.disconnect()
    flanger.wet.disconnect()
    flanger.dry.disconnect()
    flanger.output.disconnect()
    this.flangers.splice(index, 1)
    this.removeFlatAudioModule('flangers', index)
    this.routeOutput()
  }

  setFlangerBypassed(index: number, bypassed: boolean): void {
    this.setFlangerSettings(index, { bypassed })
  }

  addTremolo(settings: TremoloSettings = createTremoloSettings()): void {
    const input = this.audioContext.createGain()
    const lfo = this.audioContext.createOscillator()
    const lfoDepthGain = this.audioContext.createGain()
    const tremoloGain = this.audioContext.createGain()
    const wet = this.audioContext.createGain()
    const dry = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const tremolo = { input, lfo, lfoDepthGain, tremoloGain, wet, dry, output, settings: { ...settings } }

    input.connect(tremoloGain).connect(wet).connect(output)
    input.connect(dry).connect(output)
    lfo.connect(lfoDepthGain).connect(tremoloGain.gain)
    this.tremolos.push(tremolo)
    this.applyTremoloSettings(tremolo)
    lfo.start()
    this.appendFlatAudioModule('tremolos', this.tremolos.length - 1)
    this.routeOutput()
  }

  setTremoloSettings(index: number, changes: Partial<TremoloSettings>): void {
    const tremolo = this.tremolos[index]
    if (!tremolo) throw new RangeError(`Unknown tremolo index: ${index}`)
    tremolo.settings = { ...tremolo.settings, ...changes }
    this.applyTremoloSettings(tremolo)
    if (changes.bypassed !== undefined) this.routeOutput()
  }

  removeTremolo(index: number): void {
    const tremolo = this.tremolos[index]
    if (!tremolo) throw new RangeError(`Unknown tremolo index: ${index}`)
    tremolo.lfo.stop()
    tremolo.input.disconnect()
    tremolo.lfo.disconnect()
    tremolo.lfoDepthGain.disconnect()
    tremolo.tremoloGain.disconnect()
    tremolo.wet.disconnect()
    tremolo.dry.disconnect()
    tremolo.output.disconnect()
    this.tremolos.splice(index, 1)
    this.removeFlatAudioModule('tremolos', index)
    this.routeOutput()
  }

  setTremoloBypassed(index: number, bypassed: boolean): void {
    this.setTremoloSettings(index, { bypassed })
  }

  addEq(settings: EqSettings = createSingleBandEqSettings()): void {
    const input = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const eq: EqModule = {
      input,
      bands: settings.bands.map(() => this.audioContext.createBiquadFilter()),
      output,
      settings: {
        kind: settings.kind,
        bypassed: settings.bypassed,
        bands: settings.bands.map((band) => ({ ...band })),
        envelopes: (settings.envelopes ?? []).map((envelope) => ({ ...envelope })),
        lfos: (settings.lfos ?? []).map((lfo) => ({ ...lfo })),
      },
      lfos: [],
    }
    eq.bands.forEach((_, index) => this.applyEqBandSettings(eq, index))
    eq.settings.lfos.forEach((lfo) => eq.lfos.push(this.createLfoModule(lfo, lfo.bypassed)))
    this.eqs.push(eq)
    this.refreshLfoConnections()
    this.appendFlatAudioModule('eqs', this.eqs.length - 1)
    this.routeOutput()
  }

  removeEq(index: number): void {
    const eq = this.eqs[index]
    if (!eq) throw new RangeError(`Unknown EQ index: ${index}`)
    this.destroyEqModule(eq)
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
    this.applyEqBandSettings(eq, eq.bands.length - 1)
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
    this.applyEqBandSettings(eq, bandIndex)
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
    const lfo = this.createLfoModule(settings, settings.bypassed)
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
    if (changes.waveform !== undefined) this.setWaveform(lfo.oscillator, lfo.settings.waveform)
    if (changes.rate !== undefined) lfo.oscillator.frequency.setTargetAtTime(lfo.settings.rate, now, 0.01)
    this.refreshLfoConnections()
  }

  setEqLfoBypassed(eqIndex: number, lfoIndex: number, bypassed: boolean): void {
    const lfo = this.eqs[eqIndex]?.lfos[lfoIndex]
    if (!lfo) throw new RangeError(`Unknown EQ LFO index: ${lfoIndex}`)
    lfo.bypassed = bypassed
    this.eqs[eqIndex].settings.lfos[lfoIndex] = { ...this.eqs[eqIndex].settings.lfos[lfoIndex], bypassed }
    lfo.gain.gain.setTargetAtTime(bypassed ? 0 : this.lfoDepth(lfo.settings), this.audioContext.currentTime, 0.01)
  }

  removeEqLfo(eqIndex: number, lfoIndex: number): void {
    const eq = this.eqs[eqIndex]
    const lfo = eq?.lfos[lfoIndex]
    if (!eq || !lfo) throw new RangeError(`Unknown EQ LFO index: ${lfoIndex}`)
    this.destroyLfoModule(lfo)
    eq.lfos.splice(lfoIndex, 1)
    eq.settings.lfos.splice(lfoIndex, 1)
  }

  addReverb(settings: ReverbSettings = createReverbSettings()): void {
    const input = this.audioContext.createGain()
    const preDelay = this.audioContext.createDelay(0.25)
    const convolver = this.audioContext.createConvolver()
    const tone = this.audioContext.createBiquadFilter()
    const splitter = this.audioContext.createChannelSplitter(2)
    const left = this.audioContext.createGain()
    const right = this.audioContext.createGain()
    const leftCross = this.audioContext.createGain()
    const rightCross = this.audioContext.createGain()
    const merger = this.audioContext.createChannelMerger(2)
    const wet = this.audioContext.createGain()
    const dry = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const reverb = { input, preDelay, convolver, tone, splitter, left, right, leftCross, rightCross, merger, wet, dry, output, settings: { ...settings } }

    input.connect(preDelay).connect(convolver).connect(tone).connect(splitter)
    splitter.connect(left, 0).connect(merger, 0, 0)
    splitter.connect(right, 1).connect(merger, 0, 1)
    splitter.connect(leftCross, 0).connect(merger, 0, 1)
    splitter.connect(rightCross, 1).connect(merger, 0, 0)
    merger.connect(wet).connect(output)
    input.connect(dry).connect(output)

    this.reverbs.push(reverb)
    this.applyReverbSettings(reverb, true)
    this.appendFlatAudioModule('reverbs', this.reverbs.length - 1)
    this.routeOutput()
  }

  setReverbSettings(index: number, changes: Partial<ReverbSettings>): void {
    const reverb = this.reverbs[index]
    if (!reverb) throw new RangeError(`Unknown reverb index: ${index}`)
    reverb.settings = { ...reverb.settings, ...changes }
    this.applyReverbSettings(reverb, changes.hallType !== undefined || changes.decay !== undefined)
  }

  removeReverb(index: number): void {
    const reverb = this.reverbs[index]
    if (!reverb) throw new RangeError(`Unknown reverb index: ${index}`)
    reverb.input.disconnect()
    reverb.preDelay.disconnect()
    reverb.convolver.disconnect()
    reverb.tone.disconnect()
    reverb.splitter.disconnect()
    reverb.left.disconnect()
    reverb.right.disconnect()
    reverb.leftCross.disconnect()
    reverb.rightCross.disconnect()
    reverb.merger.disconnect()
    reverb.wet.disconnect()
    reverb.dry.disconnect()
    reverb.output.disconnect()
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
      if (changes.waveform !== undefined && voice.amplitudeModulator) this.setWaveform(voice.amplitudeModulator, this.amplitudeModulation!.waveform)
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
    const lfo = this.createLfoModule(settings)
    this.lfos.push(lfo)
    this.refreshLfoConnections()
    return this.lfos.length - 1
  }

  setLfoSettings(index: number, changes: Partial<LfoSettings>): void {
    const lfo = this.lfos[index]
    if (!lfo) throw new RangeError(`Unknown LFO index: ${index}`)
    lfo.settings = { ...lfo.settings, ...changes }
    const now = this.audioContext.currentTime
    if (changes.waveform !== undefined) this.setWaveform(lfo.oscillator, lfo.settings.waveform)
    if (changes.rate !== undefined) lfo.oscillator.frequency.setTargetAtTime(lfo.settings.rate, now, 0.01)
    this.refreshLfoConnections()
  }

  setLfoBypassed(index: number, bypassed: boolean): void {
    const lfo = this.lfos[index]
    if (!lfo) throw new RangeError(`Unknown LFO index: ${index}`)
    lfo.bypassed = bypassed
    lfo.gain.gain.setTargetAtTime(bypassed ? 0 : this.lfoDepth(lfo.settings), this.audioContext.currentTime, 0.01)
  }

  removeLfo(index: number): void {
    const lfo = this.lfos[index]
    if (!lfo) throw new RangeError(`Unknown LFO index: ${index}`)
    this.destroyLfoModule(lfo)
    this.lfos.splice(index, 1)
  }

  setEnvelopeSettings(index: number, changes: Partial<EnvelopeSettings>): void {
    const envelope = this.envelopeSettings[index]
    if (!envelope) throw new RangeError(`Unknown envelope index: ${index}`)
    envelope.settings = this.normalizeEnvelopeSettings(changes, envelope.settings)
  }

  addEnvelope(settings: EnvelopeSettings = createEnvelopeSettings()): number {
    this.envelopeSettings.push({ settings: this.normalizeEnvelopeSettings(settings, createEnvelopeSettings()), bypassed: false })
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
    this.lfos.forEach((lfo) => this.destroyLfoModule(lfo))
    this.lfos = []
    this.choruses.forEach((chorus) => chorus.lfo.stop())
    this.flangers.forEach((flanger) => flanger.lfo.stop())
    this.tremolos.forEach((tremolo) => tremolo.lfo.stop())
    this.choruses = []
    this.flangers = []
    this.tremolos = []
    this.dynamics.forEach((dynamics) => this.destroyDynamicsModule(dynamics))
    this.dynamics = []
    this.eqs.forEach((eq) => this.destroyEqModule(eq))
    this.eqs = []
    this.mixBus.disconnect()
    this.outputGain.disconnect()
    this.outputPanner.disconnect()
    if (this.ownsAudioContext) void this.audioContext.close()
  }

  private refreshLfoConnections(): void {
    [...this.lfos, ...this.eqs.flatMap((eq) => eq.lfos)].forEach((lfo) => {
      lfo.gain.disconnect()
      lfo.gain.gain.setTargetAtTime(lfo.bypassed ? 0 : this.lfoDepth(lfo.settings), this.audioContext.currentTime, 0.01)
      this.lfoTargetParams(lfo.settings.target).forEach((param) => lfo.gain.connect(param))
    })
  }

  private createLfoModule(settings: LfoSettings, bypassed = false): LfoModule {
    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const lfo = { oscillator, gain, settings: { ...settings }, bypassed }
    this.setWaveform(oscillator, settings.waveform)
    oscillator.frequency.setValueAtTime(settings.rate, this.audioContext.currentTime)
    oscillator.connect(gain)
    oscillator.start()
    return lfo
  }

  private destroyLfoModule(lfo: LfoModule): void {
    lfo.oscillator.stop()
    lfo.oscillator.disconnect()
    lfo.gain.disconnect()
  }

  private lfoDepth(settings: LfoSettings): number {
    const [module, , possibleBandIndex, possibleParameter] = settings.target.split(':')
    const parameter = module === 'eq' ? possibleParameter : possibleBandIndex
    const ranges: Record<string, number> = {
      detune: 1200, level: MAX_GAIN, unisonDetune: 100, stereoSpread: 1, fmAmount: 1000, cutoff: 19980, resonance: 3,
      gain: 24, time: 1.99, feedback: 0.95, mix: 1, overdrive: 1,
      drive: 18, tone: 10200, decay: 9.4, preDelay: 0.2, damping: 9500, width: 1,
      rate: 30, depth: 1, delay: 0.03,
      volume: 1, pan: 1, frequency: 19980, q: 17.9,
    }
    const normalizedDepth = Math.max(0, Math.min(1, settings.depth))
    const range = module === 'overdrive' && parameter === 'feedback'
      ? 0.6
      : module === 'flanger' && parameter === 'feedback'
        ? 0.9
        : module === 'chorus' && parameter === 'depth'
          ? 0.005
          : module === 'flanger' && parameter === 'depth'
            ? 0.002
            : module === 'tremolo' && parameter === 'depth'
              ? 0.5
              : (ranges[parameter] ?? 1)
    return normalizedDepth ** 2 * range
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
        .filter((voice) => voice.kind === 'noise')
        .flatMap((voice) => parameter === 'level' ? [voice.gainNode.gain] : parameter === 'stereoSpread' ? [voice.panner.pan] : [])
    }
    if (module === 'filter') {
      const filter = this.filters[index]
      return !filter ? [] : parameter === 'cutoff' ? [filter.node.frequency] : parameter === 'resonance' ? [filter.node.Q] : parameter === 'gain' ? [filter.gainNode.gain] : []
    }
    if (module === 'delay') {
      const delay = this.delays[index]
      return !delay ? [] : parameter === 'time' ? [delay.node.delayTime] : parameter === 'feedback' ? [delay.feedback.gain] : parameter === 'mix' ? [delay.wet.gain] : parameter === 'overdrive' ? [delay.driveGain.gain] : []
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
    return this.noiseSettings ? [...oscillators, this.createNoiseVoice(velocity)] : oscillators
  }

  private applyFilterSettings(index: number): void {
    const filter = this.filters[index]
    if (!filter) return
    filter.node.type = filter.settings.type
    filter.node.frequency.setTargetAtTime(filter.settings.cutoff, this.audioContext.currentTime, 0.01)
    filter.node.Q.setTargetAtTime(filter.settings.resonance, this.audioContext.currentTime, 0.01)
    filter.gainNode.gain.setTargetAtTime(10 ** (filter.settings.gain / 20), this.audioContext.currentTime, 0.01)
  }

  private applyEqBandSettings(eq: EqModule, bandIndex: number): void {
    const band = eq.bands[bandIndex]
    const settings = eq.settings.bands[bandIndex]
    if (!band || !settings) return
    const now = this.audioContext.currentTime
    band.type = settings.type
    band.frequency.setTargetAtTime(settings.frequency, now, 0.01)
    band.Q.setTargetAtTime(settings.q, now, 0.01)
    band.gain.setTargetAtTime(settings.gain, now, 0.01)
  }

  private applyOutputSettings(): void {
    const now = this.audioContext.currentTime
    this.outputGain.gain.setTargetAtTime(this.outputSettings.volume, now, 0.01)
    this.outputPanner.pan.setTargetAtTime(this.outputSettings.pan, now, 0.01)
  }

  private applyEffectEnvelopes(now: number, velocity: number): void {
    const cutoffEnvelope = this.activeEnvelopeSettings('filterCutoff')
    const resonanceEnvelope = this.activeEnvelopeSettings('filterResonance')
    this.filters.forEach((filter) => {
      if (cutoffEnvelope) this.applyPositiveEnvelopeOnNoteOn(filter.node.frequency, now, cutoffEnvelope, 20, filter.settings.cutoff * this.envelopePeakGain(velocity, cutoffEnvelope.velocity))
      if (resonanceEnvelope) this.applyPositiveEnvelopeOnNoteOn(filter.node.Q, now, resonanceEnvelope, 0, filter.settings.resonance * this.envelopePeakGain(velocity, resonanceEnvelope.velocity))
    })

    const timeEnvelope = this.activeEnvelopeSettings('delayTime')
    const feedbackEnvelope = this.activeEnvelopeSettings('delayFeedback')
    const mixEnvelope = this.activeEnvelopeSettings('delayMix')
    this.delays.forEach((delay) => {
      if (timeEnvelope) this.applyPositiveEnvelopeOnNoteOn(delay.node.delayTime, now, timeEnvelope, 0.01, delay.settings.time * this.envelopePeakGain(velocity, timeEnvelope.velocity))
      if (feedbackEnvelope) this.applyPositiveEnvelopeOnNoteOn(delay.feedback.gain, now, feedbackEnvelope, 0, Math.min(0.98, delay.settings.feedback + delay.settings.resonance * 0.3) * this.envelopePeakGain(velocity, feedbackEnvelope.velocity))
      if (mixEnvelope) this.applyPositiveEnvelopeOnNoteOn(delay.wet.gain, now, mixEnvelope, 0, delay.settings.mix * this.envelopePeakGain(velocity, mixEnvelope.velocity))
    })

    const driveEnvelope = this.activeEnvelopeSettings('overdriveDrive')
    const toneEnvelope = this.activeEnvelopeSettings('overdriveTone')
    const overdriveFeedbackEnvelope = this.activeEnvelopeSettings('overdriveFeedback')
    const overdriveMixEnvelope = this.activeEnvelopeSettings('overdriveMix')
    this.overdrives.forEach((overdrive) => {
      if (driveEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.driveGain.gain, now, driveEnvelope, 1, 1 + overdrive.settings.drive * 18 * this.envelopePeakGain(velocity, driveEnvelope.velocity))
      if (toneEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.tone.frequency, now, toneEnvelope, 1800, 1800 + overdrive.settings.tone * 10200 * this.envelopePeakGain(velocity, toneEnvelope.velocity))
      if (overdriveFeedbackEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.feedbackGain.gain, now, overdriveFeedbackEnvelope, 0, Math.min(0.6, overdrive.settings.feedback) * this.envelopePeakGain(velocity, overdriveFeedbackEnvelope.velocity))
      if (overdriveMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(overdrive.wet.gain, now, overdriveMixEnvelope, 0, overdrive.settings.mix * this.envelopePeakGain(velocity, overdriveMixEnvelope.velocity))
    })

    const reverbDecayEnvelope = this.activeEnvelopeSettings('reverbDecay')
    const reverbMixEnvelope = this.activeEnvelopeSettings('reverbMix')
    const reverbPreDelayEnvelope = this.activeEnvelopeSettings('reverbPreDelay')
    const reverbDampingEnvelope = this.activeEnvelopeSettings('reverbDamping')
    const reverbWidthEnvelope = this.activeEnvelopeSettings('reverbWidth')
    this.reverbs.forEach((reverb) => {
      if (reverbDecayEnvelope) {
        const peakGain = this.envelopePeakGain(velocity, reverbDecayEnvelope.velocity)
        reverb.convolver.buffer = this.createHallImpulse({ ...reverb.settings, decay: 0.6 + (reverb.settings.decay - 0.6) * peakGain })
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

    const chorusRateEnvelope = this.activeEnvelopeSettings('chorusRate')
    const chorusDepthEnvelope = this.activeEnvelopeSettings('chorusDepth')
    const chorusDelayEnvelope = this.activeEnvelopeSettings('chorusDelay')
    const chorusMixEnvelope = this.activeEnvelopeSettings('chorusMix')
    this.choruses.forEach((chorus) => {
      if (chorusRateEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.lfo.frequency, now, chorusRateEnvelope, 0.01, chorus.settings.rate * this.envelopePeakGain(velocity, chorusRateEnvelope.velocity))
      if (chorusDepthEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.lfoGain.gain, now, chorusDepthEnvelope, 0, chorus.settings.depth * 0.005 * this.envelopePeakGain(velocity, chorusDepthEnvelope.velocity))
      if (chorusDelayEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.delay.delayTime, now, chorusDelayEnvelope, 0, chorus.settings.delay * this.envelopePeakGain(velocity, chorusDelayEnvelope.velocity))
      if (chorusMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(chorus.wet.gain, now, chorusMixEnvelope, 0, chorus.settings.mix * this.envelopePeakGain(velocity, chorusMixEnvelope.velocity))
    })

    const flangerRateEnvelope = this.activeEnvelopeSettings('flangerRate')
    const flangerDepthEnvelope = this.activeEnvelopeSettings('flangerDepth')
    const flangerDelayEnvelope = this.activeEnvelopeSettings('flangerDelay')
    const flangerFeedbackEnvelope = this.activeEnvelopeSettings('flangerFeedback')
    const flangerMixEnvelope = this.activeEnvelopeSettings('flangerMix')
    this.flangers.forEach((flanger) => {
      if (flangerRateEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.lfo.frequency, now, flangerRateEnvelope, 0.01, flanger.settings.rate * this.envelopePeakGain(velocity, flangerRateEnvelope.velocity))
      if (flangerDepthEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.lfoGain.gain, now, flangerDepthEnvelope, 0, flanger.settings.depth * 0.002 * this.envelopePeakGain(velocity, flangerDepthEnvelope.velocity))
      if (flangerDelayEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.delay.delayTime, now, flangerDelayEnvelope, 0, flanger.settings.delay * this.envelopePeakGain(velocity, flangerDelayEnvelope.velocity))
      if (flangerFeedbackEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.feedback.gain, now, flangerFeedbackEnvelope, 0, flanger.settings.feedback * this.envelopePeakGain(velocity, flangerFeedbackEnvelope.velocity))
      if (flangerMixEnvelope) this.applyPositiveEnvelopeOnNoteOn(flanger.wet.gain, now, flangerMixEnvelope, 0, flanger.settings.mix * this.envelopePeakGain(velocity, flangerMixEnvelope.velocity))
    })

    const tremoloRateEnvelope = this.activeEnvelopeSettings('tremoloRate')
    const tremoloDepthEnvelope = this.activeEnvelopeSettings('tremoloDepth')
    const tremoloMixEnvelope = this.activeEnvelopeSettings('tremoloMix')
    this.tremolos.forEach((tremolo) => {
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
      if (type === 'filters') {
        const filter = this.filters[index]
        if (!filter) return
        const { node, gainNode, settings } = filter
        node.disconnect()
        gainNode.disconnect()
        if (!settings.bypassed) output = output.connect(node).connect(gainNode)
      } else if (type === 'dynamics') {
        const dynamics = this.dynamics[index]
        if (!dynamics) return
        this.connectDynamicsModule(dynamics)
        if (!dynamics.settings.bypassed) {
          output.connect(dynamics.input)
          output = dynamics.output
        }
      } else if (type === 'delays') {
        const delay = this.delays[index]
        if (!delay) return
        delay.node.disconnect()
        delay.driveGain.disconnect()
        delay.wet.disconnect()
        delay.dry.disconnect()
        delay.output.disconnect()
        delay.node.connect(delay.feedback)
        delay.feedback.disconnect()
        delay.feedback.connect(delay.resonance).connect(delay.node)
        if (!delay.settings.bypassed) {
          output.connect(delay.drive)
          output.connect(delay.dry)
          delay.drive.connect(delay.driveGain).connect(delay.node)
          delay.node.connect(delay.wet)
          delay.dry.connect(delay.output)
          delay.wet.connect(delay.output)
          output = delay.output
        }
      } else if (type === 'overdrives') {
        const overdrive = this.overdrives[index]
        if (!overdrive) return
        overdrive.output.disconnect()
        if (!overdrive.settings.bypassed) {
          output.connect(overdrive.input)
          overdrive.wet.connect(overdrive.output)
          overdrive.dry.connect(overdrive.output)
          output = overdrive.output
        }
      } else if (type === 'choruses') {
        const chorus = this.choruses[index]
        if (!chorus) return
        chorus.output.disconnect()
        if (!chorus.settings.bypassed) {
          output.connect(chorus.input)
          output = chorus.output
        }
      } else if (type === 'flangers') {
        const flanger = this.flangers[index]
        if (!flanger) return
        flanger.output.disconnect()
        if (!flanger.settings.bypassed) {
          output.connect(flanger.input)
          output = flanger.output
        }
      } else if (type === 'tremolos') {
        const tremolo = this.tremolos[index]
        if (!tremolo) return
        tremolo.output.disconnect()
        if (!tremolo.settings.bypassed) {
          output.connect(tremolo.input)
          output = tremolo.output
        }
      } else if (type === 'reverbs') {
        const reverb = this.reverbs[index]
        if (!reverb) return
        reverb.output.disconnect()
        if (!reverb.settings.bypassed) {
          output.connect(reverb.input)
          output = reverb.output
        }
      } else if (type === 'eqs') {
        const eq = this.eqs[index]
        if (!eq) return
        eq.input.disconnect()
        eq.output.disconnect()
        eq.bands.forEach((band) => band.disconnect())
        if (!eq.settings.bypassed) {
          let eqOutput: AudioNode = eq.input
          eq.settings.bands.forEach((bandSettings, bandIndex) => {
            const band = eq.bands[bandIndex]
            if (band && !bandSettings.bypassed) eqOutput = eqOutput.connect(band)
          })
          output.connect(eq.input)
          eqOutput.connect(eq.output)
          output = eq.output
        }
      }
    })
    output.connect(this.outputGain)
  }

  private addDynamics(settings: DynamicsSettings): void {
    const input = this.audioContext.createGain()
    const output = this.audioContext.createGain()
    const dynamics: DynamicsModule = {
      input,
      output,
      gateLastAboveThresholdTime: this.audioContext.currentTime,
      gateOpen: false,
      settings: { ...settings },
    }

    if (settings.type === 'gate') {
      const analyser = this.audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.7
      dynamics.analyser = analyser
      dynamics.gateGain = this.audioContext.createGain()
      dynamics.gateLevelData = new Float32Array(analyser.fftSize)
      dynamics.gateGain.gain.setValueAtTime(GATE_CLOSED_GAIN, this.audioContext.currentTime)
      dynamics.gateTimer = setInterval(() => this.updateGate(dynamics), GATE_ANALYSIS_INTERVAL_MS)
    } else {
      dynamics.compressor = this.audioContext.createDynamicsCompressor()
      dynamics.makeupGain = this.audioContext.createGain()
    }

    this.dynamics.push(dynamics)
    this.applyDynamicsSettings(dynamics)
    this.appendFlatAudioModule('dynamics', this.dynamics.length - 1)
    this.routeOutput()
  }

  private connectDynamicsModule(dynamics: DynamicsModule): void {
    dynamics.input.disconnect()
    dynamics.output.disconnect()
    if (dynamics.settings.type === 'gate') {
      dynamics.analyser!.disconnect()
      dynamics.gateGain!.disconnect()
      dynamics.input.connect(dynamics.analyser!).connect(dynamics.gateGain!).connect(dynamics.output)
      return
    }

    dynamics.compressor!.disconnect()
    dynamics.makeupGain!.disconnect()
    if (dynamics.settings.type === 'limiter') {
      dynamics.input.connect(dynamics.makeupGain!).connect(dynamics.compressor!).connect(dynamics.output)
      return
    }
    dynamics.input.connect(dynamics.compressor!).connect(dynamics.makeupGain!).connect(dynamics.output)
  }

  private applyDynamicsSettings(dynamics: DynamicsModule): void {
    const now = this.audioContext.currentTime
    const { settings } = dynamics
    if (settings.type === 'gate') {
      this.updateGate(dynamics)
      return
    }

    const compressor = dynamics.compressor!
    const makeupGain = dynamics.makeupGain!
    if (settings.type === 'compressor') {
      compressor.threshold.setTargetAtTime(settings.threshold, now, 0.01)
      compressor.knee.setTargetAtTime(settings.knee, now, 0.01)
      compressor.ratio.setTargetAtTime(settings.ratio, now, 0.01)
      compressor.attack.setTargetAtTime(settings.attack, now, 0.01)
      compressor.release.setTargetAtTime(settings.release, now, 0.02)
    } else {
      compressor.threshold.setTargetAtTime(settings.ceiling, now, 0.01)
      compressor.knee.setTargetAtTime(0, now, 0.01)
      compressor.ratio.setTargetAtTime(20, now, 0.01)
      compressor.attack.setTargetAtTime(0.003, now, 0.01)
      compressor.release.setTargetAtTime(settings.release, now, 0.02)
    }
    makeupGain.gain.setTargetAtTime(10 ** (settings.makeupGain / 20), now, 0.01)
  }

  private updateGate(dynamics: DynamicsModule): void {
    if (dynamics.settings.type !== 'gate' || !dynamics.analyser || !dynamics.gateGain || !dynamics.gateLevelData) return
    dynamics.analyser.getFloatTimeDomainData(dynamics.gateLevelData)
    let sum = 0
    for (const sample of dynamics.gateLevelData) sum += sample * sample
    const level = 20 * Math.log10(Math.max(Math.sqrt(sum / dynamics.gateLevelData.length), Number.EPSILON))
    const now = this.audioContext.currentTime
    if (level >= dynamics.settings.threshold) {
      dynamics.gateLastAboveThresholdTime = now
      this.setGateOpen(dynamics, true, now)
    } else if (now - dynamics.gateLastAboveThresholdTime >= dynamics.settings.hold) {
      this.setGateOpen(dynamics, false, now)
    }
  }

  private setGateOpen(dynamics: DynamicsModule, open: boolean, now: number): void {
    if (dynamics.settings.type !== 'gate' || !dynamics.gateGain || dynamics.gateOpen === open) return
    dynamics.gateOpen = open
    const timeConstant = open ? dynamics.settings.attack : dynamics.settings.release
    dynamics.gateGain.gain.setTargetAtTime(open ? 1 : GATE_CLOSED_GAIN, now, Math.max(0.001, timeConstant))
  }

  private destroyDynamicsModule(dynamics: DynamicsModule): void {
    if (dynamics.gateTimer !== undefined) clearInterval(dynamics.gateTimer)
    dynamics.input.disconnect()
    dynamics.output.disconnect()
    dynamics.compressor?.disconnect()
    dynamics.makeupGain?.disconnect()
    dynamics.analyser?.disconnect()
    dynamics.gateGain?.disconnect()
  }

  private destroyEqModule(eq: EqModule): void {
    eq.input.disconnect()
    eq.bands.forEach((band) => band.disconnect())
    eq.output.disconnect()
    eq.lfos.forEach((lfo) => this.destroyLfoModule(lfo))
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
        this.destroyLfoModule(lfo)
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

  private applyDelaySettings(delay: DelayModule): void {
    const { node, feedback, resonance, drive, driveGain, wet, dry, output, settings } = delay
    const now = this.audioContext.currentTime
    node.delayTime.setTargetAtTime(settings.time, now, 0.08)
    const resonantFeedback = Math.min(0.98, settings.feedback + settings.resonance * 0.3)
    feedback.gain.setTargetAtTime(resonantFeedback, now, 0.08)
    resonance.type = 'lowpass'
    resonance.frequency.setTargetAtTime(3500 + (1 - settings.resonance) * 5500, now, 0.08)
    resonance.Q.setTargetAtTime(0.0001 + settings.resonance * 4, now, 0.08)
    wet.gain.setTargetAtTime(settings.mix, now, 0.01)
    dry.gain.setTargetAtTime(1 - settings.mix, now, 0.01)
    const maximumOutputGain = (1 - settings.mix) + settings.mix / (1 - resonantFeedback)
    output.gain.setTargetAtTime(1 / maximumOutputGain, now, 0.01)
    const amount = settings.overdrive * 100
    const compensation = 1 / (1 + settings.overdrive * OVERDRIVE_OUTPUT_ATTENUATION)
    driveGain.gain.setTargetAtTime(compensation, now, 0.01)
    const curve = new Float32Array(1024)
    for (let index = 0; index < curve.length; index += 1) {
      const input = (index * 2) / (curve.length - 1) - 1
      curve[index] = amount === 0 ? input : Math.tanh(input * (1 + amount))
    }
    drive.curve = curve
  }

  private applyOverdriveSettings(overdrive: OverdriveModule): void {
    const { dcBlocker, driveGain, shaper, tone, feedbackTone, feedbackDelay, feedbackGain, wet, dry, output, settings } = overdrive
    const now = this.audioContext.currentTime
    dcBlocker.type = 'highpass'
    dcBlocker.frequency.setTargetAtTime(35, now, 0.02)
    dcBlocker.Q.setTargetAtTime(0.7, now, 0.02)
    driveGain.gain.setTargetAtTime(1 + settings.drive * 18, now, 0.02)
    tone.type = 'lowpass'
    tone.frequency.setTargetAtTime(1800 + settings.tone * 10200, now, 0.03)
    tone.Q.setTargetAtTime(0.6, now, 0.03)
    feedbackTone.type = 'lowpass'
    feedbackTone.frequency.setTargetAtTime(900 + settings.tone * 4100, now, 0.03)
    feedbackTone.Q.setTargetAtTime(0.7, now, 0.03)
    feedbackDelay.delayTime.setTargetAtTime(0.012, now, 0.02)
    feedbackGain.gain.setTargetAtTime(Math.min(0.6, settings.feedback), now, 0.03)
    wet.gain.setTargetAtTime(settings.mix, now, 0.02)
    dry.gain.setTargetAtTime(1 - settings.mix, now, 0.02)
    output.gain.setTargetAtTime(1 / (1 + settings.drive * 0.8), now, 0.02)
    shaper.oversample = '4x'
    shaper.curve = this.createWarmOverdriveCurve(settings.drive)
  }

  private applyChorusSettings(chorus: ChorusModule): void {
    const { lfo, lfoGain, delay, wet, dry, output, settings } = chorus
    const now = this.audioContext.currentTime
    this.setWaveform(lfo, settings.waveform)
    lfo.frequency.setTargetAtTime(Math.max(0.01, Math.min(settings.rate, 20)), now, 0.02)
    delay.delayTime.setTargetAtTime(Math.max(0, Math.min(settings.delay, 0.045)), now, 0.02)
    lfoGain.gain.setTargetAtTime(Math.max(0, Math.min(settings.depth, 1)) * 0.005, now, 0.02)
    wet.gain.setTargetAtTime(Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
    dry.gain.setTargetAtTime(1 - Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
    output.gain.setTargetAtTime(1, now, 0.02)
  }

  private applyFlangerSettings(flanger: FlangerModule): void {
    const { lfo, lfoGain, delay, feedback, wet, dry, output, settings } = flanger
    const now = this.audioContext.currentTime
    this.setWaveform(lfo, settings.waveform)
    lfo.frequency.setTargetAtTime(Math.max(0.01, Math.min(settings.rate, 10)), now, 0.02)
    delay.delayTime.setTargetAtTime(Math.max(0, Math.min(settings.delay, 0.01)), now, 0.02)
    lfoGain.gain.setTargetAtTime(Math.max(0, Math.min(settings.depth, 1)) * 0.002, now, 0.02)
    feedback.gain.setTargetAtTime(Math.max(0, Math.min(settings.feedback, 0.9)), now, 0.02)
    wet.gain.setTargetAtTime(Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
    dry.gain.setTargetAtTime(1 - Math.max(0, Math.min(settings.mix, 1)), now, 0.02)
    output.gain.setTargetAtTime(1 / (1 + Math.max(0, Math.min(settings.feedback, 0.9)) * 0.35), now, 0.02)
  }

  private applyTremoloSettings(tremolo: TremoloModule): void {
    const { lfo, lfoDepthGain, tremoloGain, wet, dry, output, settings } = tremolo
    const now = this.audioContext.currentTime
    const depth = Math.max(0, Math.min(settings.depth, 1))
    const mix = Math.max(0, Math.min(settings.mix, 1))
    this.setWaveform(lfo, settings.waveform)
    lfo.frequency.setTargetAtTime(Math.max(0.1, Math.min(settings.rate, 30)), now, 0.02)
    tremoloGain.gain.setTargetAtTime(1 - depth / 2, now, 0.02)
    lfoDepthGain.gain.setTargetAtTime(depth / 2, now, 0.02)
    wet.gain.setTargetAtTime(mix, now, 0.02)
    dry.gain.setTargetAtTime(1 - mix, now, 0.02)
    output.gain.setTargetAtTime(1, now, 0.02)
  }

  private createWarmOverdriveCurve(drive: number): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(2048)
    const gain = 1 + drive * 5
    for (let index = 0; index < curve.length; index += 1) {
      const input = (index * 2) / (curve.length - 1) - 1
      curve[index] = Math.tanh(input * gain) / Math.tanh(gain)
    }
    return curve
  }

  private applyReverbSettings(reverb: ReverbModule, replaceImpulse: boolean): void {
    const { preDelay, convolver, tone, left, right, leftCross, rightCross, wet, dry, output, settings } = reverb
    const now = this.audioContext.currentTime
    preDelay.delayTime.setTargetAtTime(settings.preDelay, now, 0.02)
    tone.type = 'lowpass'
    tone.frequency.setTargetAtTime(13000 - settings.damping * 9500, now, 0.04)
    tone.Q.setTargetAtTime(0.35 + settings.damping * 0.5, now, 0.04)
    const directGain = (1 + settings.width) / 2
    const crossGain = (1 - settings.width) / 2
    left.gain.setTargetAtTime(directGain, now, 0.02)
    right.gain.setTargetAtTime(directGain, now, 0.02)
    leftCross.gain.setTargetAtTime(crossGain, now, 0.02)
    rightCross.gain.setTargetAtTime(crossGain, now, 0.02)
    wet.gain.setTargetAtTime(settings.mix, now, 0.02)
    dry.gain.setTargetAtTime(1 - settings.mix, now, 0.02)
    output.gain.setTargetAtTime(1 / Math.max(1, (1 - settings.mix) + settings.mix * 1.4), now, 0.02)
    if (replaceImpulse) convolver.buffer = this.createHallImpulse(settings)
  }

  private createHallImpulse(settings: ReverbSettings): AudioBuffer {
    const hallTypes: Record<HallType, { duration: number; density: number; reflections: number; reflectionWindow: number }> = {
      'small-hall': { duration: 0.72, density: 0.8, reflections: 56, reflectionWindow: 0.055 },
      'wooden-hall': { duration: 0.88, density: 0.9, reflections: 72, reflectionWindow: 0.075 },
      'concert-hall': { duration: 1, density: 1, reflections: 96, reflectionWindow: 0.095 },
      'opera-house': { duration: 1.12, density: 1.05, reflections: 124, reflectionWindow: 0.115 },
      cathedral: { duration: 1.45, density: 1.2, reflections: 160, reflectionWindow: 0.16 },
      arena: { duration: 1.8, density: 1.35, reflections: 196, reflectionWindow: 0.2 },
    }
    const hall = hallTypes[settings.hallType]
    const duration = Math.min(12, Math.max(0.6, settings.decay * hall.duration))
    const frameCount = Math.ceil(this.audioContext.sampleRate * duration)
    const impulse = this.audioContext.createBuffer(2, frameCount, this.audioContext.sampleRate)
    const channels = Array.from({ length: impulse.numberOfChannels }, (_, channel) => impulse.getChannelData(channel))

    for (const data of channels) {
      let filteredNoise = 0
      for (let frame = 0; frame < frameCount; frame += 1) {
        const progress = frame / frameCount
        const envelope = Math.pow(1 - progress, 1.35 + 2.4 / settings.decay)
        const onset = Math.min(1, frame / (this.audioContext.sampleRate * 0.032))
        filteredNoise = filteredNoise * 0.94 + (Math.random() * 2 - 1) * 0.06
        data[frame] = filteredNoise * envelope * onset * hall.density * 0.42
      }
    }

    for (let reflection = 0; reflection < hall.reflections; reflection += 1) {
      const position = (reflection + Math.random() * 0.85) / hall.reflections
      const time = 0.004 + position * position * hall.reflectionWindow
      const frame = Math.floor(time * this.audioContext.sampleRate)
      if (frame >= frameCount) continue
      const gain = 0.22 * hall.density * Math.exp(-time / (hall.reflectionWindow * 0.8))
      const pan = Math.random()
      channels[0][frame] += gain * Math.sqrt(1 - pan)
      channels[1][frame] += gain * Math.sqrt(pan)
      for (let tap = 1; tap <= 3; tap += 1) {
        const diffuseFrame = frame + Math.floor((0.0006 + Math.random() * 0.0028) * tap * this.audioContext.sampleRate)
        if (diffuseFrame >= frameCount) continue
        const diffuseGain = gain * Math.pow(0.42, tap)
        channels[0][diffuseFrame] += diffuseGain * Math.sqrt(1 - pan)
        channels[1][diffuseFrame] += diffuseGain * Math.sqrt(pan)
      }
    }

    return impulse
  }

  private createVoicesForOscillator(note: number, velocity: number, oscillatorIndex: number, glideFromNote?: number): Voice[] {
    return Array.from({ length: UNISON_LAYER_COUNT }, (_, layerIndex) => this.createOscillatorVoice(note, velocity, oscillatorIndex, layerIndex, glideFromNote))
  }

  private createOscillatorVoice(note: number, velocity: number, oscillatorIndex: number, layerIndex: number, glideFromNote?: number): Voice {
    const settings = this.settings[oscillatorIndex]
    const oscillator = this.audioContext.createOscillator()
    this.setWaveform(oscillator, settings.waveform)
    const now = this.audioContext.currentTime
    const frequency = this.midiNoteToFrequency(note)
    const glideFromFrequency = glideFromNote === undefined ? undefined : this.midiNoteToFrequency(glideFromNote)
    this.scheduleGlide(oscillator.frequency, glideFromFrequency, frequency, settings.glide, now)
    const baseDetune = settings.detune + this.layerDetune(layerIndex, settings.unisonDetune)
    oscillator.detune.setValueAtTime(baseDetune, now)
    const voice = this.createVoice(oscillator, 'oscillator', velocity, oscillatorIndex, layerIndex)
    voice.baseDetune = baseDetune
    this.applyPitchEnvelopeOnNoteOn(voice, now)
    oscillator.start()
    if (settings.fmAmount > 0) {
      const modulator = this.audioContext.createOscillator()
      this.setWaveform(modulator, settings.fmSource)
      this.scheduleGlide(modulator.frequency, glideFromFrequency, frequency, settings.glide, now)
      const modulationGain = this.audioContext.createGain()
      this.scheduleGlide(modulationGain.gain, glideFromFrequency === undefined ? undefined : settings.fmAmount * glideFromFrequency, settings.fmAmount * frequency, settings.glide, now)
      modulator.connect(modulationGain).connect(oscillator.frequency)
      modulator.start()
      voice.modulator = modulator
      voice.fmGain = modulationGain
    }
    return voice
  }

  private scheduleGlide(parameter: AudioParam, from: number | undefined, to: number, glideMs: number, now: number): void {
    if (from === undefined || glideMs <= 0) {
      parameter.setValueAtTime(to, now)
      return
    }
    parameter.setValueAtTime(from, now)
    parameter.linearRampToValueAtTime(to, now + glideMs / 1000)
  }

  private createNoiseVoice(velocity: number): Voice {
    const source = this.createNoiseSource()
    const voice = this.createVoice(source, 'noise', velocity)
    this.applyNoiseLevelEnvelopeOnNoteOn(voice, this.audioContext.currentTime)
    source.start()
    return voice
  }

  private createVoice(source: AudioScheduledSourceNode, kind: Voice['kind'], velocity: number, oscillatorIndex?: number, layerIndex?: number): Voice {
    const normalizedVelocity = Math.max(0, Math.min(velocity, 127)) / 127
    const gainNode = this.audioContext.createGain()
    const envelopeGain = this.audioContext.createGain()
    const panner = this.audioContext.createStereoPanner()
    const voice: Voice = { source, kind, oscillator: source instanceof OscillatorNode ? source : undefined, gainNode, envelopeGain, panner, velocity: normalizedVelocity, oscillatorIndex, layerIndex, stopping: false }
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(this.sourceGain(voice), now)
    const envelope = kind === 'oscillator' ? this.activeEnvelopeSettings('oscillatorLevel') : undefined
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
    panner.pan.setValueAtTime(kind === 'noise' ? this.noiseSettings!.stereoSpread : this.layerPan(layerIndex!, this.settings[oscillatorIndex!].stereoSpread), now)
    source.connect(gainNode).connect(envelopeGain).connect(panner).connect(this.mixBus)
    if (this.amplitudeModulation) this.createAmplitudeModulation(voice)
    return voice
  }

  private createNoiseSource(): AudioBufferSourceNode {
    const buffer = this.audioContext.createBuffer(1, Math.floor(this.audioContext.sampleRate * NOISE_BUFFER_DURATION), this.audioContext.sampleRate)
    const samples = buffer.getChannelData(0)
    let brown = 0
    let pink = [0, 0, 0, 0, 0, 0, 0]
    for (let index = 0; index < samples.length; index += 1) {
      const white = Math.random() * 2 - 1
      if (this.noiseSettings!.color === 'white') samples[index] = white
      else if (this.noiseSettings!.color === 'pink') {
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
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    return source
  }

  private replaceNoiseSource(voice: Voice): void {
    const oldSource = voice.source
    const source = this.createNoiseSource()
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
    const volumeEnvelope = this.activeEnvelopeSettings(voice.kind === 'oscillator' ? 'oscillatorLevel' : 'noiseLevel')
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
    const modulator = this.audioContext.createOscillator()
    this.setWaveform(modulator, this.amplitudeModulation!.waveform)
    modulator.frequency.setValueAtTime(this.amplitudeModulation!.rate, this.audioContext.currentTime)
    const gain = this.audioContext.createGain()
    const initialDepth = this.amplitudeModulationBypassed ? 0 : this.amplitudeModulationGain(voice)
    gain.gain.setValueAtTime(initialDepth, this.audioContext.currentTime)
    modulator.connect(gain).connect(voice.gainNode.gain)
    modulator.start()
    voice.amplitudeModulator = modulator
    voice.amplitudeModulationGain = gain
  }

  private removeAmplitudeModulationFromVoice(voice: Voice): void {
    voice.amplitudeModulator?.stop()
    voice.amplitudeModulator?.disconnect()
    voice.amplitudeModulationGain?.disconnect()
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
    if (voice.kind === 'noise') return this.noiseSettings!.bypassed ? 0 : voice.velocity * MAX_GAIN * this.noiseSettings!.level
    const settings = this.settings[voice.oscillatorIndex!]
    return settings.bypassed ? 0 : voice.velocity * MAX_GAIN * settings.level / UNISON_LAYER_COUNT
  }

  private hasAudibleSources(): boolean {
    const oscillatorAudible = this.settings.some((settings) => !settings.bypassed && settings.level > 0)
    const noiseAudible = !!this.noiseSettings && !this.noiseSettings.bypassed && this.noiseSettings.level > 0
    return oscillatorAudible || noiseAudible
  }

  private midiNoteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12)
  }

  private layerDetune(index: number, unisonDetune: number): number {
    return index === 0 ? -unisonDetune : index === 2 ? unisonDetune : 0
  }

  private layerPan(index: number, stereoSpread: number): number {
    return index === 0 ? -stereoSpread : index === 2 ? stereoSpread : 0
  }

  private setWaveform(oscillator: OscillatorNode, waveform: Waveform): void {
    if (waveform !== 'random') {
      oscillator.type = waveform
      return
    }
    oscillator.setPeriodicWave(this.createRandomPeriodicWave())
  }

  private createRandomPeriodicWave(): PeriodicWave {
    const real = new Float32Array(RANDOM_WAVE_HARMONIC_COUNT)
    const imaginary = new Float32Array(RANDOM_WAVE_HARMONIC_COUNT)
    for (let harmonic = 1; harmonic < RANDOM_WAVE_HARMONIC_COUNT; harmonic += 1) {
      real[harmonic] = Math.random() * 2 - 1
      imaginary[harmonic] = Math.random() * 2 - 1
    }
    return this.audioContext.createPeriodicWave(real, imaginary)
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
    return value === 'oscillatorLevel' || value === 'oscillatorPitch' || value === 'noiseLevel' || value === 'filterCutoff' || value === 'filterResonance' || value === 'delayTime' || value === 'delayFeedback' || value === 'delayMix' || value === 'overdriveDrive' || value === 'overdriveTone' || value === 'overdriveFeedback' || value === 'overdriveMix' || value === 'chorusRate' || value === 'chorusDepth' || value === 'chorusDelay' || value === 'chorusMix' || value === 'flangerRate' || value === 'flangerDepth' || value === 'flangerDelay' || value === 'flangerFeedback' || value === 'flangerMix' || value === 'tremoloRate' || value === 'tremoloDepth' || value === 'tremoloMix' || value === 'reverbDecay' || value === 'reverbMix' || value === 'reverbPreDelay' || value === 'reverbDamping' || value === 'reverbWidth' ? value : fallback
  }

  private envelopePeakGain(velocity: number, velocityAmount: number): number {
    return Math.max(0, Math.min(1, (1 - velocityAmount) + velocity * velocityAmount))
  }

  private applyPitchEnvelopeOnNoteOn(voice: Voice, now: number): void {
    const envelope = this.activeEnvelopeSettings('oscillatorPitch')
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
    const envelope = this.activeEnvelopeSettings('noiseLevel')
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
    }
  }

  private normalizeEqEnvelopeSettings(eqIndex: number, changes: Partial<EqEnvelopeSettings>, fallback: EqEnvelopeSettings): EqEnvelopeSettings {
    const destination = changes.destination ?? fallback.destination
    if (!this.isEqTargetForModule(destination, eqIndex)) throw new Error('Invalid EQ envelope target')
    return { ...this.normalizeEnvelopeSettings(changes, fallback), destination, bypassed: changes.bypassed ?? fallback.bypassed }
  }

  private activeEnvelopeSettings(destination?: EnvelopeDestination): EnvelopeSettings | undefined {
    return this.envelopeSettings.find((envelope) => !envelope.bypassed && (!destination || envelope.settings.destination === destination))?.settings
  }
}
