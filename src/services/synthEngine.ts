type Voice = {
  source: AudioScheduledSourceNode
  kind: 'oscillator' | 'noise'
  oscillator?: OscillatorNode
  modulator?: OscillatorNode
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

export type EffectGroup = 'filters' | 'overdrives' | 'dynamics' | 'delays' | 'reverbs'

export type AmplitudeModulationSettings = {
  rate: number
  depth: number
  waveform: Waveform
}

export type LfoTarget = string
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
  | 'reverbDecay'
  | 'reverbMix'
  | 'reverbPreDelay'
  | 'reverbDamping'
  | 'reverbWidth'

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

export function createEnvelopeSettings(): EnvelopeSettings {
  return { attack: 4, decay: 0, hold: 0, release: 80, velocity: 0, attackCurve: 'linear', releaseCurve: 'linear', destination: 'oscillatorLevel' }
}

export class SynthEngine {
  private readonly audioContext = new AudioContext()
  private readonly destination = this.audioContext.destination
  private readonly mixBus = this.audioContext.createGain()
  private readonly outputGain = this.audioContext.createGain()
  private readonly outputPanner = this.audioContext.createStereoPanner()
  private activeVoices: { note: number; velocity: number; voices: Voice[] }[] = []
  private settings: OscillatorSettings[]
  private outputSettings: OutputSettings
  private noiseSettings?: NoiseSettings
  private filters: { node: BiquadFilterNode; gainNode: GainNode; settings: FilterSettings }[] = []
  private dynamics: DynamicsModule[] = []
  private delays: DelayModule[] = []
  private overdrives: OverdriveModule[] = []
  private reverbs: ReverbModule[] = []
  private amplitudeModulation?: AmplitudeModulationSettings
  private amplitudeModulationBypassed = false
  private lfos: LfoModule[] = []
  private envelopeSettings: { settings: EnvelopeSettings; bypassed: boolean }[] = []
  private effectOrder: EffectGroup[] = ['filters', 'overdrives', 'delays', 'reverbs', 'dynamics']

  constructor(initialSettings: OscillatorSettings = createOscillatorSettings(), outputSettings: OutputSettings = createOutputSettings()) {
    this.settings = [{ ...initialSettings }]
    this.outputSettings = { ...outputSettings }
    this.outputGain.connect(this.outputPanner).connect(this.destination)
    this.applyOutputSettings()
    this.addFilter()
  }

  async activate(): Promise<void> {
    if (this.audioContext.state === 'suspended') await this.audioContext.resume()
  }

  noteOn(note: number, velocity: number): void {
    if (!this.hasAudibleSources() || velocity <= 0) {
      return
    }
    if (this.activeVoices.some((active) => active.note === note)) this.stopNote(note)
    this.activeVoices.push({ note, velocity, voices: this.createVoices(note, velocity) })
    this.refreshLfoConnections()
    this.applyEffectEnvelopes(this.audioContext.currentTime, velocity / 127)
  }

  noteOff(note: number): void {
    this.stopNote(note)
  }

  stopAllNotes(): void {
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => this.stopVoice(voice)))
    this.activeVoices = []
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
    this.routeOutput()
  }

  setEffectOrder(order: EffectGroup[]): void {
    if (order.length !== this.effectOrder.length || new Set(order).size !== order.length || order.some((group) => !this.effectOrder.includes(group))) {
      throw new Error('Invalid effect order')
    }
    this.effectOrder = [...order]
    this.routeOutput()
  }

  removeFilter(index: number): void {
    if (!this.filters[index]) throw new RangeError(`Unknown filter index: ${index}`)
    this.filters[index].node.disconnect()
    this.filters[index].gainNode.disconnect()
    this.filters.splice(index, 1)
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
    this.routeOutput()
  }

  setDynamicsBypassed(index: number, bypassed: boolean): void {
    this.setDynamicsSettings(index, { bypassed })
  }

  moveDynamics(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction
    if (!this.dynamics[index]) throw new RangeError(`Unknown dynamics index: ${index}`)
    if (targetIndex < 0 || targetIndex >= this.dynamics.length) return
    ;[this.dynamics[index], this.dynamics[targetIndex]] = [this.dynamics[targetIndex], this.dynamics[index]]
    this.routeOutput()
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
    this.routeOutput()
  }

  setOverdriveBypassed(index: number, bypassed: boolean): void {
    const overdrive = this.overdrives[index]
    if (!overdrive) throw new RangeError(`Unknown overdrive index: ${index}`)
    overdrive.settings = { ...overdrive.settings, bypassed }
    this.routeOutput()
  }

  moveOverdrive(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction
    if (!this.overdrives[index]) throw new RangeError(`Unknown overdrive index: ${index}`)
    if (targetIndex < 0 || targetIndex >= this.overdrives.length) return
    ;[this.overdrives[index], this.overdrives[targetIndex]] = [this.overdrives[targetIndex], this.overdrives[index]]
    this.routeOutput()
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
    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const lfo = { oscillator, gain, settings: { ...settings }, bypassed: false }
    this.setWaveform(oscillator, settings.waveform)
    oscillator.frequency.setValueAtTime(settings.rate, this.audioContext.currentTime)
    oscillator.connect(gain)
    oscillator.start()
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
    lfo.oscillator.stop()
    lfo.oscillator.disconnect()
    lfo.gain.disconnect()
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
    this.lfos.forEach((lfo) => {
      lfo.oscillator.stop()
      lfo.oscillator.disconnect()
      lfo.gain.disconnect()
    })
    this.lfos = []
    this.dynamics.forEach((dynamics) => this.destroyDynamicsModule(dynamics))
    this.dynamics = []
    void this.audioContext.close()
  }

  private refreshLfoConnections(): void {
    this.lfos.forEach((lfo) => {
      lfo.gain.disconnect()
      lfo.gain.gain.setTargetAtTime(lfo.bypassed ? 0 : this.lfoDepth(lfo.settings), this.audioContext.currentTime, 0.01)
      this.lfoTargetParams(lfo.settings.target).forEach((param) => lfo.gain.connect(param))
    })
  }

  private lfoDepth(settings: LfoSettings): number {
    const [module, , parameter] = settings.target.split(':')
    const ranges: Record<string, number> = {
      detune: 1200, level: MAX_GAIN, stereoSpread: 1, cutoff: 19980, resonance: 3,
      gain: 24, time: 1.99, feedback: 0.95, mix: 1, overdrive: 1,
      drive: 18, tone: 10200, decay: 9.4, preDelay: 0.2, damping: 9500, width: 1,
    }
    const normalizedDepth = Math.max(0, Math.min(1, settings.depth))
    const range = module === 'overdrive' && parameter === 'feedback' ? 0.6 : (ranges[parameter] ?? 1)
    return normalizedDepth ** 2 * range
  }

  private lfoTargetParams(target: LfoTarget): AudioParam[] {
    const [module, rawIndex, parameter] = target.split(':')
    const index = Number(rawIndex)
    if (!Number.isInteger(index) || index < 0) return []
    if (module === 'oscillator') {
      return this.activeVoices
        .flatMap((active) => active.voices)
        .filter((voice) => voice.oscillatorIndex === index)
        .flatMap((voice) => parameter === 'detune' ? [voice.oscillator!.detune] : parameter === 'level' ? [voice.gainNode.gain] : parameter === 'stereoSpread' ? [voice.panner.pan] : [])
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
    if (module === 'reverb') {
      const reverb = this.reverbs[index]
      return !reverb ? [] : parameter === 'preDelay' ? [reverb.preDelay.delayTime] : parameter === 'damping' ? [reverb.tone.frequency] : parameter === 'mix' ? [reverb.wet.gain] : parameter === 'width' ? [reverb.left.gain, reverb.right.gain, reverb.leftCross.gain, reverb.rightCross.gain] : []
    }
    return []
  }

  private createVoices(note: number, velocity: number): Voice[] {
    const oscillators = this.settings.flatMap((_, index) => this.createVoicesForOscillator(note, velocity, index))
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
  }

  private routeOutput(): void {
    this.mixBus.disconnect()
    let output: AudioNode = this.mixBus
    this.effectOrder.forEach((group) => {
      if (group === 'filters') {
        this.filters.forEach(({ node, gainNode, settings }) => {
          node.disconnect()
          gainNode.disconnect()
          if (!settings.bypassed) output = output.connect(node).connect(gainNode)
        })
      }
      if (group === 'dynamics') {
        this.dynamics.forEach((dynamics) => {
          this.connectDynamicsModule(dynamics)
          if (!dynamics.settings.bypassed) {
            output.connect(dynamics.input)
            output = dynamics.output
          }
        })
      }
      if (group === 'delays') {
        this.delays.forEach((delay) => {
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
        })
      }
      if (group === 'overdrives') {
        this.overdrives.forEach((overdrive) => {
          overdrive.output.disconnect()
          if (!overdrive.settings.bypassed) {
            output.connect(overdrive.input)
            overdrive.wet.connect(overdrive.output)
            overdrive.dry.connect(overdrive.output)
            output = overdrive.output
          }
        })
      }
      if (group === 'reverbs') {
        this.reverbs.forEach((reverb) => {
          reverb.output.disconnect()
          if (!reverb.settings.bypassed) {
            output.connect(reverb.input)
            output = reverb.output
          }
        })
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

  private createVoicesForOscillator(note: number, velocity: number, oscillatorIndex: number): Voice[] {
    return Array.from({ length: UNISON_LAYER_COUNT }, (_, layerIndex) => this.createOscillatorVoice(note, velocity, oscillatorIndex, layerIndex))
  }

  private createOscillatorVoice(note: number, velocity: number, oscillatorIndex: number, layerIndex: number): Voice {
    const settings = this.settings[oscillatorIndex]
    const oscillator = this.audioContext.createOscillator()
    this.setWaveform(oscillator, settings.waveform)
    oscillator.frequency.setValueAtTime(this.midiNoteToFrequency(note), this.audioContext.currentTime)
    const baseDetune = settings.detune + this.layerDetune(layerIndex, settings.unisonDetune)
    oscillator.detune.setValueAtTime(baseDetune, this.audioContext.currentTime)
    const voice = this.createVoice(oscillator, 'oscillator', velocity, oscillatorIndex, layerIndex)
    voice.baseDetune = baseDetune
    this.applyPitchEnvelopeOnNoteOn(voice, this.audioContext.currentTime)
    oscillator.start()
    if (settings.fmAmount > 0) {
      const modulator = this.audioContext.createOscillator()
      this.setWaveform(modulator, settings.fmSource)
      modulator.frequency.setValueAtTime(this.midiNoteToFrequency(note), this.audioContext.currentTime)
      const modulationGain = this.audioContext.createGain()
      modulationGain.gain.setValueAtTime(settings.fmAmount * this.midiNoteToFrequency(note), this.audioContext.currentTime)
      modulator.connect(modulationGain).connect(oscillator.frequency)
      modulator.start()
      voice.modulator = modulator
    }
    return voice
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
    return value === 'oscillatorLevel' || value === 'oscillatorPitch' || value === 'noiseLevel' || value === 'filterCutoff' || value === 'filterResonance' || value === 'delayTime' || value === 'delayFeedback' || value === 'delayMix' || value === 'reverbDecay' || value === 'reverbMix' || value === 'reverbPreDelay' || value === 'reverbDamping' || value === 'reverbWidth' ? value : fallback
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

  private activeEnvelopeSettings(destination?: EnvelopeDestination): EnvelopeSettings | undefined {
    return this.envelopeSettings.find((envelope) => !envelope.bypassed && (!destination || envelope.settings.destination === destination))?.settings
  }
}
