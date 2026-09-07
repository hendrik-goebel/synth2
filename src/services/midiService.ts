type NavigatorWithMidi = Navigator & {
  requestMIDIAccess?: () => Promise<MIDIAccess>
}

type MidiNoteEvent = {
  channel: number
  note: number
  velocity: number
}

export type MidiControlChangeEvent = {
  channel: number
  controller: number
  value: number
}

type MidiState = {
  inputs: Array<{ id: string; name: string }>
  selectedInputId: string | null
  selectedNoteInputId: string | null
  statusText: string
}

type MidiServiceOptions = {
  onNoteOn: (event: MidiNoteEvent) => void
  onNoteOff: (event: MidiNoteEvent) => void
  onControlChange: (event: MidiControlChangeEvent) => void
  onClockTempo: (bpm: number) => void
  onStateChange: (state: MidiState) => void
}

const preferredInputName = /midi[\s_-]*mix/i
const preferredNoteInputName = /(?:iac|inter[-\s]?application)/i
const clockIntervalsForInitialTempo = 12
const clockIntervalsForTempoCorrection = 24
const clockTempoCorrectionFactor = 0.02

export class MidiService {
  private readonly onNoteOn: (event: MidiNoteEvent) => void
  private readonly onNoteOff: (event: MidiNoteEvent) => void
  private readonly onControlChange: (event: MidiControlChangeEvent) => void
  private readonly onClockTempo: (bpm: number) => void
  private readonly onStateChange: (state: MidiState) => void
  private midiAccess: MIDIAccess | null = null
  private selectedInputId: string | null = null
  private selectedNoteInputId: string | null = null
  private lastClockTimestamp: number | null = null
  private readonly clockIntervals: number[] = []
  private clockTicksSinceTempoUpdate = 0
  private lockedClockTempo: number | null = null

  constructor(options: MidiServiceOptions) {
    this.onNoteOn = options.onNoteOn
    this.onNoteOff = options.onNoteOff
    this.onControlChange = options.onControlChange
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

  setSelectedNoteInput(inputId: string | null): void {
    this.selectedNoteInputId = inputId
    this.refreshInputSubscription()
    this.publishState(inputId ? 'MIDI note input selected.' : 'No MIDI note input selected.')
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
      this.selectedNoteInputId = null
      return
    }

    const selectedExists = this.selectedInputId
      ? availableInputs.some((input) => input.id === this.selectedInputId)
      : false

    if (!selectedExists) {
      const preferredInput = availableInputs.find((input) => preferredInputName.test(input.name))
      this.selectedInputId = preferredInput?.id ?? availableInputs[0].id
    }

    const selectedNoteExists = this.selectedNoteInputId
      ? availableInputs.some((input) => input.id === this.selectedNoteInputId)
      : false

    if (!selectedNoteExists) {
      const preferredNoteInput = availableInputs.find((input) => preferredNoteInputName.test(input.name))
      this.selectedNoteInputId = preferredNoteInput?.id ?? availableInputs[0].id
    }

    const selectedInput = this.selectedInputId ? this.midiAccess.inputs.get(this.selectedInputId) : null
    const selectedNoteInput = this.selectedNoteInputId ? this.midiAccess.inputs.get(this.selectedNoteInputId) : null
    if (!selectedInput && !selectedNoteInput) {
      this.selectedInputId = null
      this.selectedNoteInputId = null
      return
    }

    if (selectedInput) {
      selectedInput.onmidimessage = (event: MIDIMessageEvent) => {
        this.handleMidiMessage(event, selectedInput === selectedNoteInput, true)
      }
    }
    if (selectedNoteInput && selectedNoteInput !== selectedInput) {
      selectedNoteInput.onmidimessage = (event: MIDIMessageEvent) => {
        this.handleMidiMessage(event, true, false)
      }
    }
  }

  private handleMidiMessage(event: MIDIMessageEvent, acceptNotes: boolean, acceptControls: boolean): void {
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

    if (command === 0xb0) {
      if (acceptControls) this.onControlChange({ channel, controller: note, value: velocity })
      return
    }

    if (command === 0x90 && velocity > 0) {
      if (acceptNotes) this.onNoteOn({ channel, note, velocity })
      return
    }

    if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      if (acceptNotes) this.onNoteOff({ channel, note, velocity })
    }
  }

  private handleClockTick(timestamp: number): void {
    if (this.lastClockTimestamp !== null) {
      const interval = timestamp - this.lastClockTimestamp
      // Ignore duplicate timestamps and clock gaps caused by a stopped or
      // disconnected transport. Valid tempos for this UI are 30–300 BPM.
      if (interval >= 8 && interval <= 84) {
        this.clockIntervals.push(interval)
        if (this.clockIntervals.length > clockIntervalsForTempoCorrection) this.clockIntervals.shift()
        this.clockTicksSinceTempoUpdate += 1

        if (this.lockedClockTempo === null && this.clockIntervals.length >= clockIntervalsForInitialTempo) {
          const averageInterval = this.clockIntervals.reduce((sum, value) => sum + value, 0) / this.clockIntervals.length
          this.lockedClockTempo = 60000 / (averageInterval * 24)
          this.onClockTempo(this.lockedClockTempo)
          this.clockTicksSinceTempoUpdate = 0
        } else if (
          this.lockedClockTempo !== null
          && this.clockIntervals.length >= clockIntervalsForTempoCorrection
          && this.clockTicksSinceTempoUpdate >= clockIntervalsForTempoCorrection
        ) {
          const averageInterval = this.clockIntervals.reduce((sum, value) => sum + value, 0) / this.clockIntervals.length
          const measuredTempo = 60000 / (averageInterval * 24)
          this.lockedClockTempo += (measuredTempo - this.lockedClockTempo) * clockTempoCorrectionFactor
          this.onClockTempo(this.lockedClockTempo)
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
    this.lockedClockTempo = null
  }

  private publishState(statusText: string): void {
    this.onStateChange({
      inputs: this.getInputs(),
      selectedInputId: this.selectedInputId,
      selectedNoteInputId: this.selectedNoteInputId,
      statusText,
    })
  }
}
