type Voice = {
  oscillator: OscillatorNode
  gainNode: GainNode
}

const MAX_GAIN = 0.2

export class SynthEngine {
  private readonly audioContext = new AudioContext()
  private readonly destination = this.audioContext.destination
  private activeVoice: { note: number; voice: Voice } | null = null

  async activate(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  noteOn(note: number, velocity: number): void {
    if (this.activeVoice) {
      this.stopVoice(this.activeVoice.voice)
      this.activeVoice = null
    }

    const voice = this.createVoice(note, velocity)
    this.activeVoice = { note, voice }
  }

  noteOff(note: number): void {
    if (!this.activeVoice || this.activeVoice.note !== note) {
      return
    }

    this.stopVoice(this.activeVoice.voice)
    this.activeVoice = null
  }

  getActiveVoiceCount(): number {
    return this.activeVoice ? 1 : 0
  }

  destroy(): void {
    if (this.activeVoice) {
      this.stopVoice(this.activeVoice.voice)
      this.activeVoice = null
    }
    void this.audioContext.close()
  }

  private createVoice(note: number, velocity: number): Voice {
    const oscillator = this.audioContext.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(this.midiNoteToFrequency(note), this.audioContext.currentTime)

    const gainNode = this.audioContext.createGain()
    const normalizedVelocity = Math.max(0, Math.min(velocity, 127)) / 127
    gainNode.gain.setValueAtTime(normalizedVelocity * MAX_GAIN, this.audioContext.currentTime)

    oscillator.connect(gainNode)
    gainNode.connect(this.destination)
    oscillator.start()

    return { oscillator, gainNode }
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
      voice.gainNode.disconnect()
    }
  }
}
