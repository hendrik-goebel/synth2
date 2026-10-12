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
  selectedControlInputId: string | null
  selectedClockInputId: string | null
  selectedNoteInputId: string | null
  statusText: string
}

export const broadcastChannelInputId = 'broadcastchannel'
export const autoInputId = 'auto'
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
// MIDI clock sends 24 ticks per quarter note. Tempo estimation is deliberately
// lazy: ticks are counted over a multi-beat window (robust against jitter,
// bursts and dropped ticks), corrections run at most once per beat, tiny
// discrepancies are ignored entirely, and the locked tempo only ever creeps
// toward the measurement so external timing noise cannot make it jump.
const clockTicksForInitialTempo = 24
const clockTicksForTempoMeasurement = 96
const clockTicksBetweenTempoCorrections = 24
const clockTempoDeadbandBpm = 0.5
const clockTempoCorrectionBaseFactor = 0.01
const clockTempoCorrectionGain = 0.5
const clockTempoCorrectionMaxFactor = 0.25
const clockMinPlausibleTempo = 20
const clockMaxPlausibleTempo = 400
const clockGapResetMs = 400

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
  private selectedControlInputId: string | null = autoInputId
  private selectedClockInputId: string | null = autoInputId
  private selectedNoteInputId: string | null = autoInputId
  private lastClockTimestamp: number | null = null
  private readonly clockTickTimestamps: number[] = []
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

  setSelectedControlInput(inputId: string | null): void {
    this.selectedControlInputId = inputId
    this.refreshInputSubscription()
    this.publishState(inputId ? 'MIDI control input selected.' : 'No MIDI control input selected.')
  }

  setSelectedClockInput(inputId: string | null): void {
    if (this.selectedClockInputId !== inputId) this.resetClockTracking()
    this.selectedClockInputId = inputId
    this.refreshInputSubscription()
    this.publishState(inputId ? 'MIDI clock input selected.' : 'No MIDI clock input selected.')
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
        if (this.selectedControlInputId !== broadcastChannelInputId && this.selectedControlInputId !== autoInputId && !availableInputs.some((input) => input.id === this.selectedControlInputId)) {
          const preferredInput = availableInputs.find((input) => preferredInputName.test(input.name))
          this.selectedControlInputId = preferredInput?.id ?? availableInputs[0].id
        }

        if (this.selectedClockInputId !== broadcastChannelInputId && this.selectedClockInputId !== autoInputId && !availableInputs.some((input) => input.id === this.selectedClockInputId)) {
          this.selectedClockInputId = availableInputs[0].id
          this.resetClockTracking()
        }

        if (this.selectedNoteInputId !== broadcastChannelInputId && this.selectedNoteInputId !== autoInputId && !availableInputs.some((input) => input.id === this.selectedNoteInputId)) {
          const preferredNoteInput = availableInputs.find((input) => preferredNoteInputName.test(input.name))
          this.selectedNoteInputId = preferredNoteInput?.id ?? availableInputs[0].id
        }
      } else {
        if (this.selectedControlInputId !== broadcastChannelInputId && this.selectedControlInputId !== autoInputId) this.selectedControlInputId = null
        if (this.selectedClockInputId !== broadcastChannelInputId && this.selectedClockInputId !== autoInputId) this.selectedClockInputId = null
        if (this.selectedNoteInputId !== broadcastChannelInputId && this.selectedNoteInputId !== autoInputId) this.selectedNoteInputId = null
      }
    }

    this.refreshBroadcastChannelSubscriptions()
    if (!this.midiAccess) return

    const selectedControlInput = this.selectedControlInputId ? this.midiAccess.inputs.get(this.selectedControlInputId) : null
    const selectedClockInput = this.selectedClockInputId ? this.midiAccess.inputs.get(this.selectedClockInputId) : null
    const selectedNoteInput = this.selectedNoteInputId ? this.midiAccess.inputs.get(this.selectedNoteInputId) : null
    const inputRoles = new Map<MIDIInput, { acceptNotes: boolean; acceptControls: boolean; acceptClock: boolean; autoNotes: boolean; autoControls: boolean; autoClock: boolean }>()
    const addInputRole = (
      input: MIDIInput | null | undefined,
      role: keyof { acceptNotes: boolean; acceptControls: boolean; acceptClock: boolean; autoNotes: boolean; autoControls: boolean; autoClock: boolean },
    ) => {
      if (!input) return
      const roles = inputRoles.get(input) ?? { acceptNotes: false, acceptControls: false, acceptClock: false, autoNotes: false, autoControls: false, autoClock: false }
      roles[role] = true
      inputRoles.set(input, roles)
    }
    addInputRole(selectedControlInput, 'acceptControls')
    addInputRole(selectedClockInput, 'acceptClock')
    addInputRole(selectedNoteInput, 'acceptNotes')
    for (const input of this.midiAccess.inputs.values()) {
      if (this.selectedControlInputId === autoInputId) addInputRole(input, 'autoControls')
      if (this.selectedClockInputId === autoInputId) addInputRole(input, 'autoClock')
      if (this.selectedNoteInputId === autoInputId) addInputRole(input, 'autoNotes')
    }
    inputRoles.forEach((roles, input) => {
      input.onmidimessage = (event: MIDIMessageEvent) => {
        this.handleMidiMessage(event, input.id, roles)
      }
    })
  }

  private handleMidiMessage(
    event: MIDIMessageEvent,
    inputId: string,
    roles: { acceptNotes: boolean; acceptControls: boolean; acceptClock: boolean; autoNotes: boolean; autoControls: boolean; autoClock: boolean },
  ): void {
    if (!event.data) {
      return
    }

    this.handleMidiData(event.data, event.timeStamp, inputId, roles)
  }

  private handleMidiData(
    data: ArrayLike<number>,
    timestamp: number,
    inputId: string | null,
    roles: { acceptNotes: boolean; acceptControls: boolean; acceptClock: boolean; autoNotes: boolean; autoControls: boolean; autoClock: boolean },
  ): void {
    const status = data[0]
    const note = data[1]
    const velocity = data[2]
    if (status === undefined) {
      return
    }

    // MIDI clock is a one-byte realtime message sent 24 times per quarter note.
    if (status === 0xf8) {
      if (roles.acceptClock || roles.autoClock) {
        if (roles.autoClock && inputId) this.selectAutoInput('clock', inputId)
        this.handleClockTick(timestamp)
      }
      return
    }

    // Start and stop delimit separate clock runs, so a long gap cannot affect
    // the next tempo estimate.
    if (status === 0xfa || status === 0xfb || status === 0xfc) {
      if (roles.acceptClock || roles.autoClock) {
        if (roles.autoClock && inputId) this.selectAutoInput('clock', inputId)
        this.resetClockTracking()
        if (status === 0xfc) this.onClockStop()
      }
      return
    }

    if (note === undefined || velocity === undefined) {
      return
    }

    const command = status & 0xf0
    const channel = (status & 0x0f) + 1

    if (command === 0xb0) {
      if (roles.acceptControls || roles.autoControls) {
        if (roles.autoControls && inputId) this.selectAutoInput('control', inputId)
        this.onControlChange({ channel, controller: note, value: velocity })
      }
      return
    }

    if (command === 0x90 && velocity > 0) {
      if (roles.acceptNotes || roles.autoNotes) {
        if (roles.autoNotes && inputId) this.selectAutoInput('note', inputId)
        this.onNoteOn({ channel, note, velocity })
      }
      return
    }

    if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      if (roles.acceptNotes || roles.autoNotes) {
        if (roles.autoNotes && inputId) this.selectAutoInput('note', inputId)
        this.onNoteOff({ channel, note, velocity })
      }
    }
  }

  private refreshBroadcastChannelSubscriptions(): void {
    if (!supportsBroadcastChannel) return

    if ((this.selectedClockInputId === broadcastChannelInputId || this.selectedClockInputId === autoInputId) && !this.clockBroadcastChannel) {
      this.clockBroadcastChannel = new BroadcastChannel(clockBroadcastChannelName)
      this.clockBroadcastChannel.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data
        if (!isRecord(message) || message.type !== 'midi-clock' || !isMidiClockStatus(message.status)) return
        const isAuto = this.selectedClockInputId === autoInputId
        this.handleMidiData(
          [message.status],
          performance.now(),
          isAuto ? broadcastChannelInputId : null,
          { acceptNotes: false, acceptControls: false, acceptClock: !isAuto, autoNotes: false, autoControls: false, autoClock: isAuto },
        )
      }
    } else if (this.selectedClockInputId !== broadcastChannelInputId && this.selectedClockInputId !== autoInputId && this.clockBroadcastChannel) {
      this.clockBroadcastChannel.close()
      this.clockBroadcastChannel = null
      this.resetClockTracking()
    }

    if ((this.selectedNoteInputId === broadcastChannelInputId || this.selectedNoteInputId === autoInputId) && !this.notesBroadcastChannel) {
      this.notesBroadcastChannel = new BroadcastChannel(notesBroadcastChannelName)
      this.notesBroadcastChannel.onmessage = (event: MessageEvent<unknown>) => {
        console.log('BroadcastChannel MIDI message received', event.data)
        const message = event.data
        if (!isRecord(message) || message.type !== 'midi-message' || !isMidiByteArray(message.data)) return
        const isAuto = this.selectedNoteInputId === autoInputId
        this.handleMidiData(
          message.data,
          performance.now(),
          isAuto ? broadcastChannelInputId : null,
          { acceptNotes: !isAuto, acceptControls: false, acceptClock: false, autoNotes: isAuto, autoControls: false, autoClock: false },
        )
      }
    } else if (this.selectedNoteInputId !== broadcastChannelInputId && this.selectedNoteInputId !== autoInputId && this.notesBroadcastChannel) {
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

  private selectAutoInput(type: 'control' | 'clock' | 'note', inputId: string): void {
    if (type === 'control' && this.selectedControlInputId === autoInputId) {
      this.selectedControlInputId = inputId
    } else if (type === 'clock' && this.selectedClockInputId === autoInputId) {
      this.selectedClockInputId = inputId
    } else if (type === 'note' && this.selectedNoteInputId === autoInputId) {
      this.selectedNoteInputId = inputId
    } else {
      return
    }
    this.refreshInputSubscription()
    this.publishState(`Automatically selected MIDI ${type} input.`)
  }

  private handleClockTick(timestamp: number): void {
    // A gap this long means the transport stopped or disconnected without a
    // stop message; start a fresh estimate instead of mixing separate runs.
    if (this.lastClockTimestamp !== null && timestamp - this.lastClockTimestamp > clockGapResetMs) {
      this.resetClockTracking()
    }

    this.lastClockTimestamp = timestamp
    this.clockTickTimestamps.push(timestamp)
    if (this.clockTickTimestamps.length > clockTicksForTempoMeasurement) {
      this.clockTickTimestamps.shift()
    }
    this.clockTicksSinceTempoUpdate += 1

    if (this.lockedClockTempo === null) {
      if (this.clockTickTimestamps.length < clockTicksForInitialTempo) return
      const measuredTempo = this.measureClockTempo()
      if (!this.isPlausibleClockTempo(measuredTempo)) {
        // Garbage timestamps (e.g. a whole window delivered in one burst);
        // retry with a fresh window instead of locking onto noise.
        this.clockTickTimestamps.length = 0
        return
      }
      this.lockedClockTempo = measuredTempo
      this.onClockTempo(this.lockedClockTempo)
      this.clockTicksSinceTempoUpdate = 0
      return
    }

    if (this.clockTickTimestamps.length < clockTicksForTempoMeasurement || this.clockTicksSinceTempoUpdate < clockTicksBetweenTempoCorrections) return

    this.clockTicksSinceTempoUpdate = 0
    const measuredTempo = this.measureClockTempo()
    if (!this.isPlausibleClockTempo(measuredTempo)) {
      this.clockTickTimestamps.length = 0
      return
    }

    const tempoError = measuredTempo - this.lockedClockTempo
    // Ignore discrepancies smaller than the resolution of the tempo display;
    // reacting to them just makes the timing fidget.
    if (Math.abs(tempoError) <= clockTempoDeadbandBpm) return

    // Correction speed scales with the size of the discrepancy: jitter and
    // slow drift are followed very lazily, while a real tempo change on the
    // external source converges within a few beats. The tempo never jumps.
    const relativeError = Math.abs(tempoError) / this.lockedClockTempo
    const correctionFactor = Math.min(clockTempoCorrectionMaxFactor, clockTempoCorrectionBaseFactor + relativeError * clockTempoCorrectionGain)
    this.lockedClockTempo += tempoError * correctionFactor
    this.onClockTempo(this.lockedClockTempo)
  }

  private measureClockTempo(): number | null {
    const tickTimestamps = this.clockTickTimestamps
    if (tickTimestamps.length < 2) return null
    const span = tickTimestamps[tickTimestamps.length - 1] - tickTimestamps[0]
    if (span <= 0) return null
    return (60000 * (tickTimestamps.length - 1)) / (span * 24)
  }

  private isPlausibleClockTempo(tempo: number | null): tempo is number {
    return tempo !== null && Number.isFinite(tempo) && tempo >= clockMinPlausibleTempo && tempo <= clockMaxPlausibleTempo
  }

  private resetClockTracking(): void {
    this.lastClockTimestamp = null
    this.clockTickTimestamps.length = 0
    this.clockTicksSinceTempoUpdate = 0
    this.lockedClockTempo = null
  }

  private publishState(statusText: string): void {
    this.onStateChange({
      inputs: this.getInputs(),
      selectedControlInputId: this.selectedControlInputId,
      selectedClockInputId: this.selectedClockInputId,
      selectedNoteInputId: this.selectedNoteInputId,
      statusText,
    })
  }
}
