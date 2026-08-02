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

export type AmplitudeModulationSettings = {
  rate: number
  depth: number
  waveform: Waveform
}

export type EnvelopeSettings = {
  attack: number
  decay: number
  hold: number
  release: number
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

export function createEnvelopeSettings(): EnvelopeSettings {
  return { attack: 4, decay: 0, hold: 0, release: 80 }
}

export class SynthEngine {
  private readonly audioContext = new AudioContext()
  private readonly destination = this.audioContext.destination
  private activeVoices: { note: number; velocity: number; voices: Voice[] }[] = []
  private settings: OscillatorSettings[]
  private noiseSettings?: NoiseSettings
  private amplitudeModulation?: AmplitudeModulationSettings
  private amplitudeModulationBypassed = false
  private envelopeSettings?: EnvelopeSettings = createEnvelopeSettings()
  private envelopeBypassed = false

  constructor(initialSettings: OscillatorSettings = createOscillatorSettings()) {
    this.settings = [{ ...initialSettings }]
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
        oscillator.detune.setTargetAtTime(updated.detune + this.layerDetune(voice.layerIndex!, updated.unisonDetune), now, 0.01)
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

  setEnvelopeSettings(changes: Partial<EnvelopeSettings>): void {
    if (!this.envelopeSettings) throw new Error('Envelope is not enabled')
    this.envelopeSettings = {
      attack: this.clampEnvelopeTime(changes.attack, this.envelopeSettings.attack, ENVELOPE_ATTACK_MAX_MS),
      decay: this.clampEnvelopeTime(changes.decay, this.envelopeSettings.decay, ENVELOPE_DECAY_MAX_MS),
      hold: this.clampEnvelopeTime(changes.hold, this.envelopeSettings.hold, ENVELOPE_HOLD_MAX_MS),
      release: this.clampEnvelopeTime(changes.release, this.envelopeSettings.release, ENVELOPE_RELEASE_MAX_MS),
    }
  }

  addEnvelope(settings: EnvelopeSettings = createEnvelopeSettings()): void {
    if (this.envelopeSettings) throw new Error('Envelope is already enabled')
    this.envelopeSettings = {
      attack: this.clampEnvelopeTime(settings.attack, 0, ENVELOPE_ATTACK_MAX_MS),
      decay: this.clampEnvelopeTime(settings.decay, 0, ENVELOPE_DECAY_MAX_MS),
      hold: this.clampEnvelopeTime(settings.hold, 0, ENVELOPE_HOLD_MAX_MS),
      release: this.clampEnvelopeTime(settings.release, 0, ENVELOPE_RELEASE_MAX_MS),
    }
    this.envelopeBypassed = false
  }

  removeEnvelope(): void {
    if (!this.envelopeSettings) throw new Error('Envelope is not enabled')
    this.envelopeSettings = undefined
    this.envelopeBypassed = false
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => {
      voice.envelopeGain.gain.cancelScheduledValues(now)
      voice.envelopeGain.gain.setTargetAtTime(1, now, 0.01)
    }))
  }

  setEnvelopeBypassed(bypassed: boolean): void {
    if (!this.envelopeSettings) throw new Error('Envelope is not enabled')
    this.envelopeBypassed = bypassed
    if (!bypassed) return
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => {
      voice.envelopeGain.gain.cancelScheduledValues(now)
      voice.envelopeGain.gain.setTargetAtTime(1, now, 0.01)
    }))
  }

  destroy(): void {
    this.stopAllNotes()
    void this.audioContext.close()
  }

  private createVoices(note: number, velocity: number): Voice[] {
    const oscillators = this.settings.flatMap((_, index) => this.createVoicesForOscillator(note, velocity, index))
    return this.noiseSettings ? [...oscillators, this.createNoiseVoice(velocity)] : oscillators
  }

  private createVoicesForOscillator(note: number, velocity: number, oscillatorIndex: number): Voice[] {
    return Array.from({ length: UNISON_LAYER_COUNT }, (_, layerIndex) => this.createOscillatorVoice(note, velocity, oscillatorIndex, layerIndex))
  }

  private createOscillatorVoice(note: number, velocity: number, oscillatorIndex: number, layerIndex: number): Voice {
    const settings = this.settings[oscillatorIndex]
    const oscillator = this.audioContext.createOscillator()
    this.setWaveform(oscillator, settings.waveform)
    oscillator.frequency.setValueAtTime(this.midiNoteToFrequency(note), this.audioContext.currentTime)
    oscillator.detune.setValueAtTime(settings.detune + this.layerDetune(layerIndex, settings.unisonDetune), this.audioContext.currentTime)
    const voice = this.createVoice(oscillator, 'oscillator', velocity, oscillatorIndex, layerIndex)
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
    if (envelope) {
      envelopeGain.gain.setValueAtTime(0, now)
      const attackStart = now + envelope.decay / 1000
      const attackEnd = attackStart + envelope.attack / 1000
      envelopeGain.gain.setValueAtTime(0, attackStart)
      if (envelope.attack > 0) envelopeGain.gain.linearRampToValueAtTime(1, attackEnd)
      else envelopeGain.gain.setValueAtTime(1, attackStart)
    } else {
      envelopeGain.gain.setValueAtTime(1, now)
    }
    panner.pan.setValueAtTime(kind === 'noise' ? this.noiseSettings!.stereoSpread : this.layerPan(layerIndex!, this.settings[oscillatorIndex!].stereoSpread), now)
    source.connect(gainNode).connect(envelopeGain).connect(panner).connect(this.destination)
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
    const holdEnd = now + (envelope?.hold ?? 0) / 1000
    const releaseMs = envelope?.release ?? ENVELOPE_BYPASS_RELEASE_MS
    const stopAt = holdEnd + releaseMs / 1000
    voice.envelopeGain.gain.cancelScheduledValues(now)
    voice.envelopeGain.gain.setValueAtTime(voice.envelopeGain.gain.value, now)
    voice.envelopeGain.gain.setValueAtTime(voice.envelopeGain.gain.value, holdEnd)
    if (releaseMs > 0) voice.envelopeGain.gain.linearRampToValueAtTime(0, stopAt)
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
    gain.gain.setValueAtTime(this.amplitudeModulationBypassed ? 0 : this.amplitudeModulationGain(voice), this.audioContext.currentTime)
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

  private activeEnvelopeSettings(): EnvelopeSettings | undefined {
    if (!this.envelopeSettings || this.envelopeBypassed) return undefined
    return this.envelopeSettings
  }
}
