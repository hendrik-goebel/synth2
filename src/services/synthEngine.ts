type Voice = {
  oscillator: OscillatorNode
  modulator?: OscillatorNode
  amplitudeModulator?: OscillatorNode
  amplitudeModulationGain?: GainNode
  gainNode: GainNode
  panner: StereoPannerNode
  velocity: number
  oscillatorIndex: number
  layerIndex: number
}

const MAX_GAIN = 0.2
const UNISON_LAYER_COUNT = 3
const RANDOM_WAVE_HARMONIC_COUNT = 32

export type Waveform = OscillatorType | 'random'

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

export type AmplitudeModulationSettings = {
  rate: number
  depth: number
  waveform: Waveform
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

export class SynthEngine {
  private readonly audioContext = new AudioContext()
  private readonly destination = this.audioContext.destination
  private activeVoices: { note: number; velocity: number; voices: Voice[] }[] = []
  private settings: OscillatorSettings[]
  private amplitudeModulation?: AmplitudeModulationSettings
  private amplitudeModulationBypassed = false

  constructor(initialSettings: OscillatorSettings = createOscillatorSettings()) {
    this.settings = [{ ...initialSettings }]
  }

  async activate(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  noteOn(note: number, velocity: number): void {
    const existing = this.activeVoices.find((active) => active.note === note)
    if (existing) {
      this.stopNote(note)
    }
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
    this.activeVoices.forEach((activeVoice) => {
      activeVoice.voices.push(...this.createVoicesForOscillator(activeVoice.note, activeVoice.velocity, oscillatorIndex))
    })
  }

  addAmplitudeModulation(settings: AmplitudeModulationSettings): void {
    if (this.amplitudeModulation) {
      throw new Error('Amplitude modulation is already enabled')
    }

    this.amplitudeModulation = { ...settings }
    this.amplitudeModulationBypassed = false
    this.activeVoices.forEach(({ voices }) => voices.forEach((voice) => this.createAmplitudeModulation(voice)))
  }

  setAmplitudeModulationSettings(settings: Partial<AmplitudeModulationSettings>): void {
    if (!this.amplitudeModulation) {
      throw new Error('Amplitude modulation is not enabled')
    }

    this.amplitudeModulation = { ...this.amplitudeModulation, ...settings }
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => {
      voices.forEach((voice) => {
        if (settings.rate !== undefined) {
          voice.amplitudeModulator?.frequency.setTargetAtTime(this.amplitudeModulation!.rate, now, 0.01)
        }
        if (settings.depth !== undefined) {
          this.setAmplitudeModulationDepth(voice, now)
        }
        if (settings.waveform !== undefined && voice.amplitudeModulator) {
          this.setWaveform(voice.amplitudeModulator, this.amplitudeModulation!.waveform)
        }
      })
    })
  }

  removeAmplitudeModulation(): void {
    if (!this.amplitudeModulation) {
      throw new Error('Amplitude modulation is not enabled')
    }

    this.activeVoices.forEach(({ voices }) => {
      voices.forEach((voice) => {
        voice.amplitudeModulator?.stop()
        voice.amplitudeModulator?.disconnect()
        voice.amplitudeModulationGain?.disconnect()
        voice.amplitudeModulator = undefined
        voice.amplitudeModulationGain = undefined
      })
    })
    this.amplitudeModulation = undefined
    this.amplitudeModulationBypassed = false
  }

  setAmplitudeModulationBypassed(bypassed: boolean): void {
    if (!this.amplitudeModulation) {
      throw new Error('Amplitude modulation is not enabled')
    }

    this.amplitudeModulationBypassed = bypassed
    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => {
      voices.forEach((voice) => this.setAmplitudeModulationDepth(voice, now))
    })
  }

  removeOscillator(oscillatorIndex: number): void {
    if (oscillatorIndex < 0 || oscillatorIndex >= this.settings.length) {
      throw new RangeError(`Unknown oscillator index: ${oscillatorIndex}`)
    }

    this.settings.splice(oscillatorIndex, 1)
    this.activeVoices.forEach((activeVoice) => {
      const removedVoices = activeVoice.voices.filter((voice) => voice.oscillatorIndex === oscillatorIndex)
      removedVoices.forEach((voice) => this.stopVoice(voice))
      activeVoice.voices = activeVoice.voices.filter((voice) => voice.oscillatorIndex !== oscillatorIndex)
      activeVoice.voices.forEach((voice) => {
        if (voice.oscillatorIndex > oscillatorIndex) {
          voice.oscillatorIndex -= 1
        }
      })
    })
  }

  setOscillatorSettings(oscillatorIndex: number, settings: Partial<OscillatorSettings>): void {
    const oscillatorSettings = this.settings[oscillatorIndex]
    if (!oscillatorSettings) {
      throw new RangeError(`Unknown oscillator index: ${oscillatorIndex}`)
    }

    this.settings[oscillatorIndex] = { ...oscillatorSettings, ...settings }
    if (this.activeVoices.length === 0) {
      return
    }

    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ voices }) => {
      voices.filter((voice) => voice.oscillatorIndex === oscillatorIndex).forEach((voice) => {
        const layerDetune = this.layerDetune(voice.layerIndex, this.settings[oscillatorIndex].unisonDetune)
        if (settings.detune !== undefined || settings.unisonDetune !== undefined) {
          voice.oscillator.detune.setTargetAtTime(this.settings[oscillatorIndex].detune + layerDetune, now, 0.01)
        }
        if (settings.level !== undefined || settings.bypassed !== undefined) {
          voice.gainNode.gain.setTargetAtTime(this.oscillatorGain(voice), now, 0.01)
          this.setAmplitudeModulationDepth(voice, now)
        }
        if (settings.stereoSpread !== undefined) {
          voice.panner.pan.setTargetAtTime(this.layerPan(voice.layerIndex, this.settings[oscillatorIndex].stereoSpread), now, 0.01)
        }
        if (settings.waveform !== undefined) {
          this.setWaveform(voice.oscillator, this.settings[oscillatorIndex].waveform)
        }
        if (settings.fmSource !== undefined && voice.modulator) {
          this.setWaveform(voice.modulator, this.settings[oscillatorIndex].fmSource)
        }
      })
    })
  }

  destroy(): void {
    this.stopAllNotes()
    void this.audioContext.close()
  }

  private createVoices(note: number, velocity: number): Voice[] {
    return this.settings.flatMap((_, oscillatorIndex) => this.createVoicesForOscillator(note, velocity, oscillatorIndex))
  }

  private createVoicesForOscillator(note: number, velocity: number, oscillatorIndex: number): Voice[] {
    return Array.from(
      { length: UNISON_LAYER_COUNT },
      (_, layerIndex) => this.createVoice(note, velocity, oscillatorIndex, layerIndex),
    )
  }

  private createVoice(note: number, velocity: number, oscillatorIndex: number, layerIndex: number): Voice {
    const settings = this.settings[oscillatorIndex]
    const oscillator = this.audioContext.createOscillator()
    this.setWaveform(oscillator, settings.waveform)
    oscillator.frequency.setValueAtTime(
      this.midiNoteToFrequency(note),
      this.audioContext.currentTime,
    )
    oscillator.detune.setValueAtTime(settings.detune + this.layerDetune(layerIndex, settings.unisonDetune), this.audioContext.currentTime)

    const gainNode = this.audioContext.createGain()
    const normalizedVelocity = Math.max(0, Math.min(velocity, 127)) / 127
    gainNode.gain.setValueAtTime(this.oscillatorGain({ velocity: normalizedVelocity, oscillatorIndex }), this.audioContext.currentTime)
    const panner = this.audioContext.createStereoPanner()
    panner.pan.setValueAtTime(this.layerPan(layerIndex, settings.stereoSpread), this.audioContext.currentTime)

    oscillator.connect(gainNode)
    gainNode.connect(panner)
    panner.connect(this.destination)
    oscillator.start()

    let modulator: OscillatorNode | undefined
    if (settings.fmAmount > 0) {
      modulator = this.audioContext.createOscillator()
      this.setWaveform(modulator, settings.fmSource)
      modulator.frequency.setValueAtTime(this.midiNoteToFrequency(note), this.audioContext.currentTime)
      const modulationGain = this.audioContext.createGain()
      modulationGain.gain.setValueAtTime(settings.fmAmount * this.midiNoteToFrequency(note), this.audioContext.currentTime)
      modulator.connect(modulationGain)
      modulationGain.connect(oscillator.frequency)
      modulator.start()
    }

    const voice: Voice = {
      oscillator,
      modulator,
      gainNode,
      panner,
      velocity: normalizedVelocity,
      oscillatorIndex,
      layerIndex,
    }
    if (this.amplitudeModulation) {
      this.createAmplitudeModulation(voice)
    }

    return voice
  }

  private midiNoteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12)
  }

  private stopVoice(voice: Voice): void {
    const stopAt = this.audioContext.currentTime + 0.02
    voice.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime)
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, this.audioContext.currentTime)
    voice.gainNode.gain.linearRampToValueAtTime(0, stopAt)
    voice.oscillator.stop(stopAt)
    voice.oscillator.onended = () => {
      voice.oscillator.disconnect()
      voice.modulator?.stop()
      voice.modulator?.disconnect()
      voice.amplitudeModulator?.stop()
      voice.amplitudeModulator?.disconnect()
      voice.amplitudeModulationGain?.disconnect()
      voice.gainNode.disconnect()
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
    const settings = this.amplitudeModulation
    if (!settings) {
      return
    }

    const modulator = this.audioContext.createOscillator()
    this.setWaveform(modulator, settings.waveform)
    modulator.frequency.setValueAtTime(settings.rate, this.audioContext.currentTime)
    const modulationGain = this.audioContext.createGain()
    voice.amplitudeModulator = modulator
    voice.amplitudeModulationGain = modulationGain
    modulationGain.gain.setValueAtTime(
      this.amplitudeModulationBypassed ? 0 : this.amplitudeModulationGain(voice),
      this.audioContext.currentTime,
    )
    modulator.connect(modulationGain)
    modulationGain.connect(voice.gainNode.gain)
    modulator.start()
  }

  private setAmplitudeModulationDepth(voice: Voice, time: number): void {
    const depth = this.amplitudeModulation?.depth
    const modulationGain = voice.amplitudeModulationGain
    if (depth === undefined || !modulationGain) {
      return
    }

    modulationGain.gain.setTargetAtTime(this.amplitudeModulationBypassed ? 0 : this.amplitudeModulationGain(voice), time, 0.01)
  }

  private amplitudeModulationGain(voice: Voice): number {
    const settings = this.settings[voice.oscillatorIndex]
    return settings.bypassed ? 0 : voice.velocity * MAX_GAIN * settings.level * this.amplitudeModulation!.depth / UNISON_LAYER_COUNT
  }

  private oscillatorGain(voice: Pick<Voice, 'velocity' | 'oscillatorIndex'>): number {
    const settings = this.settings[voice.oscillatorIndex]
    return settings.bypassed ? 0 : voice.velocity * MAX_GAIN * settings.level / UNISON_LAYER_COUNT
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
}
