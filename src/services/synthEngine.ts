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

export type FilterType = 'lowpass' | 'highpass' | 'bandpass'

export type FilterSettings = {
  bypassed: boolean
  type: FilterType
  cutoff: number
  resonance: number
  gain: number
}

export type AmplitudeModulationSettings = {
  rate: number
  depth: number
  waveform: Waveform
}

export type EnvelopeCurve = 'linear' | 'exponential'
export type EnvelopeDestination = 'volume' | 'pitch' | 'amDepth' | 'noiseLevel'

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

export function createFilterSettings(): FilterSettings {
  return { bypassed: false, type: 'bandpass', cutoff: 12000, resonance: 0, gain: 0 }
}

export function createEnvelopeSettings(): EnvelopeSettings {
  return { attack: 4, decay: 0, hold: 0, release: 80, velocity: 0, attackCurve: 'linear', releaseCurve: 'linear', destination: 'volume' }
}

export class SynthEngine {
  private readonly audioContext = new AudioContext()
  private readonly destination = this.audioContext.destination
  private readonly mixBus = this.audioContext.createGain()
  private activeVoices: { note: number; velocity: number; voices: Voice[] }[] = []
  private settings: OscillatorSettings[]
  private noiseSettings?: NoiseSettings
  private filters: { node: BiquadFilterNode; gainNode: GainNode; settings: FilterSettings }[] = []
  private amplitudeModulation?: AmplitudeModulationSettings
  private amplitudeModulationBypassed = false
  private envelopeSettings: { settings: EnvelopeSettings; bypassed: boolean }[] = [{ settings: createEnvelopeSettings(), bypassed: false }]

  constructor(initialSettings: OscillatorSettings = createOscillatorSettings()) {
    this.settings = [{ ...initialSettings }]
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

  addOscillator(settings: OscillatorSettings = createOscillatorSettings()): void {
    const oscillatorIndex = this.settings.push({ ...settings }) - 1
    this.activeVoices.forEach((active) => {
      active.voices.push(...this.createVoicesForOscillator(active.note, active.velocity, oscillatorIndex))
    })
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
    if (this.envelopeSettings.length === 0) this.envelopeSettings.push({ settings: createEnvelopeSettings(), bypassed: false })
  }

  setEnvelopeBypassed(index: number, bypassed: boolean): void {
    const envelope = this.envelopeSettings[index]
    if (!envelope) throw new RangeError(`Unknown envelope index: ${index}`)
    envelope.bypassed = bypassed
  }

  destroy(): void {
    this.stopAllNotes()
    void this.audioContext.close()
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

  private routeOutput(): void {
    this.mixBus.disconnect()
    let output: AudioNode = this.mixBus
    this.filters.forEach(({ node, gainNode, settings }) => {
      node.disconnect()
      gainNode.disconnect()
      if (!settings.bypassed) {
        output = output.connect(node).connect(gainNode)
      }
    })
    output.connect(this.destination)
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
    const envelope = this.activeEnvelopeSettings()
    if (envelope?.destination === 'volume') {
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
    const envelope = this.activeEnvelopeSettings()
    const volumeEnvelope = envelope?.destination === 'volume' ? envelope : undefined
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
    const envelope = this.activeEnvelopeSettings()
    const initialDepth = this.amplitudeModulationBypassed || envelope?.destination === 'amDepth' ? 0 : this.amplitudeModulationGain(voice)
    gain.gain.setValueAtTime(initialDepth, this.audioContext.currentTime)
    modulator.connect(gain).connect(voice.gainNode.gain)
    modulator.start()
    voice.amplitudeModulator = modulator
    voice.amplitudeModulationGain = gain
    this.applyAmplitudeModulationDepthEnvelopeOnNoteOn(voice, this.audioContext.currentTime)
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
    return value === 'volume' || value === 'pitch' || value === 'amDepth' || value === 'noiseLevel' ? value : fallback
  }

  private envelopePeakGain(velocity: number, velocityAmount: number): number {
    return Math.max(0, Math.min(1, (1 - velocityAmount) + velocity * velocityAmount))
  }

  private applyPitchEnvelopeOnNoteOn(voice: Voice, now: number): void {
    const envelope = this.activeEnvelopeSettings()
    if (!envelope || envelope.destination !== 'pitch' || !voice.oscillator || voice.baseDetune === undefined) {
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

  private applyAmplitudeModulationDepthEnvelopeOnNoteOn(voice: Voice, now: number): void {
    const envelope = this.activeEnvelopeSettings()
    if (!envelope || envelope.destination !== 'amDepth' || !voice.amplitudeModulationGain || this.amplitudeModulationBypassed) {
      return
    }
    const peak = this.amplitudeModulationGain(voice) * this.envelopePeakGain(voice.velocity, envelope.velocity)
    this.applyPositiveEnvelopeOnNoteOn(voice.amplitudeModulationGain.gain, now, envelope, 0, peak)
  }

  private applyNoiseLevelEnvelopeOnNoteOn(voice: Voice, now: number): void {
    const envelope = this.activeEnvelopeSettings()
    if (!envelope || envelope.destination !== 'noiseLevel' || voice.kind !== 'noise') {
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
