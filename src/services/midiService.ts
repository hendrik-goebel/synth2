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

export const broadcastChannelInputId = 'broadcastchannel'
export const supportsBroadcastChannel = typeof BroadcastChannel !== 'undefined'

type MidiServiceOptions = {
  onNoteOn: (event: MidiNoteEvent) => void
  onNoteOff: (event: MidiNoteEvent) => void
  onControlChange: (event: MidiControlChangeEvent) => void
  onClockTempo: (bpm: number) => void
  onClockStop: () => void
  onStateChange: (state: MidiState) => void
}

const preferredInputName = /midi[\s_-]*mix/i
const preferredNoteInputName = /(?:iac|inter[-\s]?application)/i
const clockBroadcastChannelName = 'arpeggiator-midi-clock-v1'
const notesBroadcastChannelName = 'arpeggiator-midi-events-v1'
const clockIntervalsForInitialTempo = 12
const clockIntervalsForTempoCorrection = 24
const clockTempoCorrectionFactor = 0.02

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMidiClockStatus(value: unknown): value is 0xf8 | 0xfa | 0xfb | 0xfc {
  return value === 0xf8 || value === 0xfa || value === 0xfb || value === 0xfc
}

function isMidiByteArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
}

export class MidiService {
  private readonly onNoteOn: (event: MidiNoteEvent) => void
  private readonly onNoteOff: (event: MidiNoteEvent) => void
  private readonly onControlChange: (event: MidiControlChangeEvent) => void
  private readonly onClockTempo: (bpm: number) => void
  private readonly onClockStop: () => void
  private readonly onStateChange: (state: MidiState) => void
  private midiAccess: MIDIAccess | null = null
  private clockBroadcastChannel: BroadcastChannel | null = null
  private notesBroadcastChannel: BroadcastChannel | null = null
  private selectedInputId: string | null = supportsBroadcastChannel ? broadcastChannelInputId : null
  private selectedNoteInputId: string | null = supportsBroadcastChannel ? broadcastChannelInputId : null
  private lastClockTimestamp: number | null = null
  private readonly clockIntervals: number[] = []
  private clockIntervalTotal = 0
  private clockTicksSinceTempoUpdate = 0
  private lockedClockTempo: number | null = null

  constructor(options: MidiServiceOptions) {
    this.onNoteOn = options.onNoteOn
    this.onNoteOff = options.onNoteOff
    this.onControlChange = options.onControlChange
    this.onClockTempo = options.onClockTempo
    this.onClockStop = options.onClockStop
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
    this.closeBroadcastChannels()
  }

  private refreshInputSubscription(): void {
    const availableInputs = this.getInputs()
    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = null
      }

      if (availableInputs.length > 0) {
        if (this.selectedInputId !== broadcastChannelInputId && !availableInputs.some((input) => input.id === this.selectedInputId)) {
          const preferredInput = availableInputs.find((input) => preferredInputName.test(input.name))
          this.selectedInputId = preferredInput?.id ?? availableInputs[0].id
        }

        if (this.selectedNoteInputId !== broadcastChannelInputId && !availableInputs.some((input) => input.id === this.selectedNoteInputId)) {
          const preferredNoteInput = availableInputs.find((input) => preferredNoteInputName.test(input.name))
          this.selectedNoteInputId = preferredNoteInput?.id ?? availableInputs[0].id
        }
      } else {
        if (this.selectedInputId !== broadcastChannelInputId) this.selectedInputId = null
        if (this.selectedNoteInputId !== broadcastChannelInputId) this.selectedNoteInputId = null
      }
    }

    this.refreshBroadcastChannelSubscriptions()
    if (!this.midiAccess) return

    const selectedInput = this.selectedInputId ? this.midiAccess.inputs.get(this.selectedInputId) : null
    const selectedNoteInput = this.selectedNoteInputId ? this.midiAccess.inputs.get(this.selectedNoteInputId) : null
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

    this.handleMidiData(event.data, event.timeStamp, acceptNotes, acceptControls)
  }

  private handleMidiData(data: ArrayLike<number>, timestamp: number, acceptNotes: boolean, acceptControls: boolean): void {
    const status = data[0]
    const note = data[1]
    const velocity = data[2]
    if (status === undefined) {
      return
    }

    // MIDI clock is a one-byte realtime message sent 24 times per quarter note.
    if (status === 0xf8) {
      this.handleClockTick(timestamp)
      return
    }

    // Start and stop delimit separate clock runs, so a long gap cannot affect
    // the next tempo estimate.
    if (status === 0xfa || status === 0xfb || status === 0xfc) {
      this.resetClockTracking()
      if (status === 0xfc) this.onClockStop()
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

  private refreshBroadcastChannelSubscriptions(): void {
    if (!supportsBroadcastChannel) return

    if (this.selectedInputId === broadcastChannelInputId && !this.clockBroadcastChannel) {
      this.clockBroadcastChannel = new BroadcastChannel(clockBroadcastChannelName)
      this.clockBroadcastChannel.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data
        if (!isRecord(message) || message.type !== 'midi-clock' || !isMidiClockStatus(message.status)) return
        this.handleMidiData([message.status], performance.now(), false, false)
      }
    } else if (this.selectedInputId !== broadcastChannelInputId && this.clockBroadcastChannel) {
      this.clockBroadcastChannel.close()
      this.clockBroadcastChannel = null
      this.resetClockTracking()
    }

    if (this.selectedNoteInputId === broadcastChannelInputId && !this.notesBroadcastChannel) {
      this.notesBroadcastChannel = new BroadcastChannel(notesBroadcastChannelName)
      this.notesBroadcastChannel.onmessage = (event: MessageEvent<unknown>) => {
        console.log('BroadcastChannel MIDI message received', event.data)
        const message = event.data
        if (!isRecord(message) || message.type !== 'midi-message' || !isMidiByteArray(message.data)) return
        this.handleMidiData(message.data, performance.now(), true, false)
      }
    } else if (this.selectedNoteInputId !== broadcastChannelInputId && this.notesBroadcastChannel) {
      this.notesBroadcastChannel.close()
      this.notesBroadcastChannel = null
      this.onClockStop()
    }
  }

  private closeBroadcastChannels(): void {
    this.clockBroadcastChannel?.close()
    this.notesBroadcastChannel?.close()
    this.clockBroadcastChannel = null
    this.notesBroadcastChannel = null
    this.resetClockTracking()
  }

  private handleClockTick(timestamp: number): void {
    if (this.lastClockTimestamp !== null) {
      const interval = timestamp - this.lastClockTimestamp
      // Ignore duplicate timestamps and clock gaps caused by a stopped or
      // disconnected transport. Valid tempos for this UI are 30–300 BPM.
      if (interval >= 8 && interval <= 84) {
        this.clockIntervals.push(interval)
        this.clockIntervalTotal += interval
        if (this.clockIntervals.length > clockIntervalsForTempoCorrection) {
          this.clockIntervalTotal -= this.clockIntervals.shift()!
        }
        this.clockTicksSinceTempoUpdate += 1

        if (this.lockedClockTempo === null && this.clockIntervals.length >= clockIntervalsForInitialTempo) {
          const averageInterval = this.clockIntervalTotal / this.clockIntervals.length
          this.lockedClockTempo = 60000 / (averageInterval * 24)
          this.onClockTempo(this.lockedClockTempo)
          this.clockTicksSinceTempoUpdate = 0
        } else if (
          this.lockedClockTempo !== null
          && this.clockIntervals.length >= clockIntervalsForTempoCorrection
          && this.clockTicksSinceTempoUpdate >= clockIntervalsForTempoCorrection
        ) {
          const averageInterval = this.clockIntervalTotal / this.clockIntervals.length
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
    this.clockIntervalTotal = 0
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
