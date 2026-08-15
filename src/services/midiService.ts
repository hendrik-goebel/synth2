type NavigatorWithMidi = Navigator & {
  requestMIDIAccess?: () => Promise<MIDIAccess>
}

type MidiNoteEvent = {
  channel: number
  note: number
  velocity: number
}

type MidiState = {
  inputs: Array<{ id: string; name: string }>
  selectedInputId: string | null
  statusText: string
}

type MidiServiceOptions = {
  onNoteOn: (event: MidiNoteEvent) => void
  onNoteOff: (event: MidiNoteEvent) => void
  onClockTempo: (bpm: number) => void
  onStateChange: (state: MidiState) => void
}

export class MidiService {
  private readonly onNoteOn: (event: MidiNoteEvent) => void
  private readonly onNoteOff: (event: MidiNoteEvent) => void
  private readonly onClockTempo: (bpm: number) => void
  private readonly onStateChange: (state: MidiState) => void
  private midiAccess: MIDIAccess | null = null
  private selectedInputId: string | null = null
  private lastClockTimestamp: number | null = null
  private readonly clockIntervals: number[] = []
  private clockTicksSinceTempoUpdate = 0

  constructor(options: MidiServiceOptions) {
    this.onNoteOn = options.onNoteOn
    this.onNoteOff = options.onNoteOff
    this.onClockTempo = options.onClockTempo
    this.onStateChange = options.onStateChange
  }

  async requestAccess(): Promise<void> {
    const navigatorWithMidi = navigator as NavigatorWithMidi
    if (!navigatorWithMidi.requestMIDIAccess) {
      throw new Error('This browser does not support Web MIDI API.')
    }

    const midiAccess = await navigatorWithMidi.requestMIDIAccess()
    this.midiAccess = midiAccess
    midiAccess.onstatechange = () => {
      this.refreshInputSubscription()
      this.publishState('MIDI connected.')
    }
    this.refreshInputSubscription()
    this.publishState('MIDI connected.')
  }

  getInputs(): Array<{ id: string; name: string }> {
    if (!this.midiAccess) {
      return []
    }

    return Array.from(this.midiAccess.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name?.trim() || 'Unknown input',
    }))
  }

  setSelectedInput(inputId: string | null): void {
    this.selectedInputId = inputId
    this.refreshInputSubscription()
    this.publishState(inputId ? 'MIDI input selected.' : 'No MIDI input selected.')
  }

  setChannel(channel: number): void {
    const selectedChannel = Math.min(Math.max(channel, 1), 16)
    this.publishState(`Selected MIDI channel ${selectedChannel}.`)
  }

  destroy(): void {
    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = null
      }
      this.midiAccess.onstatechange = null
    }
  }

  private refreshInputSubscription(): void {
    if (!this.midiAccess) {
      return
    }

    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = null
    }

    const availableInputs = this.getInputs()
    if (availableInputs.length === 0) {
      this.selectedInputId = null
      return
    }

    const selectedExists = this.selectedInputId
      ? availableInputs.some((input) => input.id === this.selectedInputId)
      : false

    if (!selectedExists) {
      this.selectedInputId = availableInputs[0].id
    }

    if (!this.selectedInputId) {
      return
    }

    const selectedInput = this.midiAccess.inputs.get(this.selectedInputId)
    if (!selectedInput) {
      this.selectedInputId = null
      return
    }

    selectedInput.onmidimessage = (event: MIDIMessageEvent) => {
      this.handleMidiMessage(event)
    }
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    if (!event.data) {
      return
    }

    const [status, note, velocity] = event.data
    if (status === undefined) {
      return
    }

    // MIDI clock is a one-byte realtime message sent 24 times per quarter note.
    if (status === 0xf8) {
      this.handleClockTick(event.timeStamp)
      return
    }

    // Start and stop delimit separate clock runs, so a long gap cannot affect
    // the next tempo estimate.
    if (status === 0xfa || status === 0xfb || status === 0xfc) {
      this.resetClockTracking()
      return
    }

    if (note === undefined || velocity === undefined) {
      return
    }

    const command = status & 0xf0
    const channel = (status & 0x0f) + 1

    if (command === 0x90 && velocity > 0) {
      this.onNoteOn({ channel, note, velocity })
      return
    }

    if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      this.onNoteOff({ channel, note, velocity })
    }
  }

  private handleClockTick(timestamp: number): void {
    if (this.lastClockTimestamp !== null) {
      const interval = timestamp - this.lastClockTimestamp
      // Ignore duplicate timestamps and clock gaps caused by a stopped or
      // disconnected transport. Valid tempos for this UI are 30–300 BPM.
      if (interval >= 8 && interval <= 84) {
        this.clockIntervals.push(interval)
        if (this.clockIntervals.length > 24) this.clockIntervals.shift()
        this.clockTicksSinceTempoUpdate += 1

        if (this.clockIntervals.length >= 12 && this.clockTicksSinceTempoUpdate >= 6) {
          const averageInterval = this.clockIntervals.reduce((sum, value) => sum + value, 0) / this.clockIntervals.length
          this.onClockTempo(60000 / (averageInterval * 24))
          this.clockTicksSinceTempoUpdate = 0
        }
      } else {
        this.resetClockTracking()
      }
    }

    this.lastClockTimestamp = timestamp
  }

  private resetClockTracking(): void {
    this.lastClockTimestamp = null
    this.clockIntervals.length = 0
    this.clockTicksSinceTempoUpdate = 0
  }

  private publishState(statusText: string): void {
    this.onStateChange({
      inputs: this.getInputs(),
      selectedInputId: this.selectedInputId,
      statusText,
    })
  }
}
