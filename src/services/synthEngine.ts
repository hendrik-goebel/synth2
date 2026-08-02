type Voice = {
  oscillator: OscillatorNode
  modulator?: OscillatorNode
  gainNode: GainNode
  panner: StereoPannerNode
  velocity: number
}

const MAX_GAIN = 0.2
type OscillatorSettings = {
  frequency: number
  detune: number
  glide: number
  level: number
  phase: number
  waveform: OscillatorType
  unisonDetune: number
  stereoSpread: number
  fmAmount: number
  fmSource: OscillatorType
}

export class SynthEngine {
  private readonly audioContext = new AudioContext()
  private readonly destination = this.audioContext.destination
  private activeVoices: { note: number; voices: Voice[] }[] = []
  private settings: OscillatorSettings = {
    frequency: 440,
    detune: 0,
    glide: 0,
    level: 1,
    phase: 0,
    waveform: 'sine',
    unisonDetune: 0,
    stereoSpread: 0,
    fmAmount: 0,
    fmSource: 'sine',
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
    this.activeVoices.push({ note, voices: this.createVoices(note, velocity) })
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

  setOscillatorSettings(settings: Partial<OscillatorSettings>): void {
    this.settings = { ...this.settings, ...settings }
    if (this.activeVoices.length === 0) {
      return
    }

    const now = this.audioContext.currentTime
    this.activeVoices.forEach(({ note, voices }) => {
      voices.forEach((voice, index) => {
        const layerDetune = this.layerDetune(index)
        if (settings.frequency !== undefined) {
          voice.oscillator.frequency.setTargetAtTime(this.midiNoteToFrequency(note) * (this.settings.frequency / 440), now, 0.01)
        }
        if (settings.detune !== undefined || settings.unisonDetune !== undefined) {
          voice.oscillator.detune.setTargetAtTime(this.settings.detune + layerDetune, now, 0.01)
        }
        if (settings.level !== undefined) {
          voice.gainNode.gain.setTargetAtTime(voice.velocity * MAX_GAIN * this.settings.level / voices.length, now, 0.01)
        }
        if (settings.stereoSpread !== undefined) {
          voice.panner.pan.setTargetAtTime(this.layerPan(index), now, 0.01)
        }
      })
    })
  }

  destroy(): void {
    this.stopAllNotes()
    void this.audioContext.close()
  }

  private createVoices(note: number, velocity: number): Voice[] {
    // Keep three layers allocated so unison controls can be changed while notes are held.
    const layerCount = 3
    return Array.from({ length: layerCount }, (_, index) => this.createVoice(note, velocity, index, layerCount))
  }

  private createVoice(note: number, velocity: number, index: number, layerCount: number): Voice {
    const oscillator = this.audioContext.createOscillator()
    oscillator.type = this.settings.waveform
    if (this.settings.waveform === 'sine' && this.settings.phase !== 0) {
      const phase = (this.settings.phase * Math.PI) / 180
      const real = new Float32Array([0, Math.sin(phase)])
      const imaginary = new Float32Array([0, Math.cos(phase)])
      oscillator.setPeriodicWave(this.audioContext.createPeriodicWave(real, imaginary))
    }
    oscillator.frequency.setValueAtTime(
      this.midiNoteToFrequency(note) * (this.settings.frequency / 440),
      this.audioContext.currentTime,
    )
    oscillator.detune.setValueAtTime(this.settings.detune + this.layerDetune(index), this.audioContext.currentTime)

    const gainNode = this.audioContext.createGain()
    const normalizedVelocity = Math.max(0, Math.min(velocity, 127)) / 127
    gainNode.gain.setValueAtTime(normalizedVelocity * MAX_GAIN * this.settings.level / layerCount, this.audioContext.currentTime)
    const panner = this.audioContext.createStereoPanner()
    panner.pan.setValueAtTime(this.layerPan(index), this.audioContext.currentTime)

    oscillator.connect(gainNode)
    gainNode.connect(panner)
    panner.connect(this.destination)
    oscillator.start()

    let modulator: OscillatorNode | undefined
    if (this.settings.fmAmount > 0) {
      modulator = this.audioContext.createOscillator()
      modulator.type = this.settings.fmSource
      modulator.frequency.setValueAtTime(this.midiNoteToFrequency(note), this.audioContext.currentTime)
      const modulationGain = this.audioContext.createGain()
      modulationGain.gain.setValueAtTime(this.settings.fmAmount * this.midiNoteToFrequency(note), this.audioContext.currentTime)
      modulator.connect(modulationGain)
      modulationGain.connect(oscillator.frequency)
      modulator.start()
    }

    return { oscillator, modulator, gainNode, panner, velocity: normalizedVelocity }
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

  private layerDetune(index: number): number {
    return index === 0 ? -this.settings.unisonDetune : index === 2 ? this.settings.unisonDetune : 0
  }

  private layerPan(index: number): number {
    return index === 0 ? -this.settings.stereoSpread : index === 2 ? this.settings.stereoSpread : 0
  }
}
