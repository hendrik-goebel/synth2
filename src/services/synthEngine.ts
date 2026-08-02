type Voice = {
  oscillator: OscillatorNode
  modulator?: OscillatorNode
  gainNode: GainNode
  panner: StereoPannerNode
  velocity: number
  oscillatorIndex: number
  layerIndex: number
}

const MAX_GAIN = 0.2
const UNISON_LAYER_COUNT = 3

export type OscillatorSettings = {
  detune: number
  glide: number
  level: number
  waveform: OscillatorType
  unisonDetune: number
  stereoSpread: number
  fmAmount: number
  fmSource: OscillatorType
}

export function createOscillatorSettings(): OscillatorSettings {
  return {
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

  removeOscillator(oscillatorIndex: number): void {
    if (oscillatorIndex < 0 || oscillatorIndex >= this.settings.length) {
      throw new RangeError(`Unknown oscillator index: ${oscillatorIndex}`)
    }

    if (this.settings.length === 1) {
      throw new RangeError('At least one oscillator is required')
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
        if (settings.level !== undefined) {
          voice.gainNode.gain.setTargetAtTime(voice.velocity * MAX_GAIN * this.settings[oscillatorIndex].level / UNISON_LAYER_COUNT, now, 0.01)
        }
        if (settings.stereoSpread !== undefined) {
          voice.panner.pan.setTargetAtTime(this.layerPan(voice.layerIndex, this.settings[oscillatorIndex].stereoSpread), now, 0.01)
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
    oscillator.type = settings.waveform
    oscillator.frequency.setValueAtTime(
      this.midiNoteToFrequency(note),
      this.audioContext.currentTime,
    )
    oscillator.detune.setValueAtTime(settings.detune + this.layerDetune(layerIndex, settings.unisonDetune), this.audioContext.currentTime)

    const gainNode = this.audioContext.createGain()
    const normalizedVelocity = Math.max(0, Math.min(velocity, 127)) / 127
    gainNode.gain.setValueAtTime(normalizedVelocity * MAX_GAIN * settings.level / UNISON_LAYER_COUNT, this.audioContext.currentTime)
    const panner = this.audioContext.createStereoPanner()
    panner.pan.setValueAtTime(this.layerPan(layerIndex, settings.stereoSpread), this.audioContext.currentTime)

    oscillator.connect(gainNode)
    gainNode.connect(panner)
    panner.connect(this.destination)
    oscillator.start()

    let modulator: OscillatorNode | undefined
    if (settings.fmAmount > 0) {
      modulator = this.audioContext.createOscillator()
      modulator.type = settings.fmSource
      modulator.frequency.setValueAtTime(this.midiNoteToFrequency(note), this.audioContext.currentTime)
      const modulationGain = this.audioContext.createGain()
      modulationGain.gain.setValueAtTime(settings.fmAmount * this.midiNoteToFrequency(note), this.audioContext.currentTime)
      modulator.connect(modulationGain)
      modulationGain.connect(oscillator.frequency)
      modulator.start()
    }

    return { oscillator, modulator, gainNode, panner, velocity: normalizedVelocity, oscillatorIndex, layerIndex }
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

  private layerDetune(index: number, unisonDetune: number): number {
    return index === 0 ? -unisonDetune : index === 2 ? unisonDetune : 0
  }

  private layerPan(index: number, stereoSpread: number): number {
    return index === 0 ? -stereoSpread : index === 2 ? stereoSpread : 0
  }
}
