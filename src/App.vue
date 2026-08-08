<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { instrumentCategories, instrumentPresets, type InstrumentPreset } from './instruments'
import { MidiService } from './services/midiService'
import { decodeSeed, encodeSeed } from './services/seedService'
import { createChorusSettings, createDelaySettings, createEnvelopeSettings, createEqBandSettings, createFilterSettings, createFlangerSettings, createMultibandEqSettings, createNoiseSettings, createOutputSettings, createOverdriveSettings, createReverbSettings, createCompressorSettings, createGateSettings, createLimiterSettings, createOscillatorSettings, createSingleBandEqSettings, createTremoloSettings, type AmplitudeModulationSettings, type ChorusSettings, type DelaySettings, type DynamicsSettings, type DynamicsSettingsChanges, type EqBandSettings, type EqEnvelopeSettings, type EqLfoSettings, type EqModulationTarget, type EqParameter, type EqSettings, type EffectGroup, type EnvelopeDestination, type EnvelopeSettings, type FilterSettings, type FlangerSettings, type FlatAudioModule, type LfoSettings, type NoiseSettings, type OscillatorSettings, type OutputSettings, type OverdriveSettings, type ReverbSettings, type TremoloSettings, type Waveform, SynthEngine } from './services/synthEngine'
import OscillatorControls from './components/OscillatorControls.vue'
import NoiseControls from './components/NoiseControls.vue'
import FilterControls from './components/FilterControls.vue'
import SectionFrame from './components/SectionFrame.vue'
import DelayControls from './components/DelayControls.vue'
import OverdriveControls from './components/OverdriveControls.vue'
import EnvelopeControls from './components/EnvelopeControls.vue'
import ReverbControls from './components/ReverbControls.vue'
import LfoControls from './components/LfoControls.vue'
import CompressorControls from './components/CompressorControls.vue'
import GateControls from './components/GateControls.vue'
import LimiterControls from './components/LimiterControls.vue'
import OutputControls from './components/OutputControls.vue'
import EqControls from './components/EqControls.vue'
import ChorusControls from './components/ChorusControls.vue'
import FlangerControls from './components/FlangerControls.vue'
import TremoloControls from './components/TremoloControls.vue'

type EnvelopeModule = EnvelopeSettings & { bypassed: boolean }
type LfoControlModule = LfoSettings & { bypassed: boolean }
/** A processor type that can appear as a card in the module chain. Includes Amplitude Modulation, which never participates in audio routing. */
type ModuleKind = EffectGroup | 'amplitudeModulation'
/** A single instance of a module type, identified by its position within that type's own settings array. */
type ModuleOrderEntry = { type: ModuleKind; index: number }
type SynthSetup = Omit<InstrumentPreset, 'id' | 'name' | 'category' | 'effectOrder'> & { moduleOrder: ModuleOrderEntry[] }
type SeedChannel = Omit<SynthSetup, 'eqs' | 'choruses' | 'flangers' | 'tremolos' | 'moduleOrder'> & {
  eqs?: EqSettings[]
  choruses?: ChorusSettings[]
  flangers?: FlangerSettings[]
  tremolos?: TremoloSettings[]
  selectedInstrumentId: string
  moduleOrder?: ModuleOrderEntry[]
  effectOrder?: EffectGroup[]
}
type SeedState = {
  version: 1
  selectedChannel: number
  channels: SeedChannel[]
}
const effectGroups: EffectGroup[] = ['filters', 'overdrives', 'choruses', 'flangers', 'tremolos', 'delays', 'reverbs', 'eqs', 'dynamics']
const legacyEffectGroups: EffectGroup[] = ['filters', 'overdrives', 'delays', 'reverbs', 'dynamics']
const legacyEffectGroups6: EffectGroup[] = ['filters', 'overdrives', 'delays', 'reverbs', 'eqs', 'dynamics']
const MAX_SEED_MODULES = 16
const MAX_SEED_MODULATORS = 32
type ChannelState = {
  synth: SynthEngine
  oscillators: OscillatorSettings[]
  output: OutputSettings
  noise: NoiseSettings | null
  filters: FilterSettings[]
  delays: DelaySettings[]
  overdrives: OverdriveSettings[]
  choruses: ChorusSettings[]
  flangers: FlangerSettings[]
  tremolos: TremoloSettings[]
  bpm: number
  reverbs: ReverbSettings[]
  amplitudeModulation: AmplitudeModulationSettings | null
  envelopes: EnvelopeModule[]
  lfos: LfoControlModule[]
  dynamics: DynamicsSettings[]
  eqs: EqSettings[]
  moduleOrder: ModuleOrderEntry[]
  isAmplitudeModulationBypassed: boolean
  selectedInstrumentId: string
}


const waveforms: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square']
const initialOscillatorSettings = createRandomOscillatorSettings()
const initialOutputSettings = createOutputSettings()
const masterOutputSettings = createOutputSettings()
const masterSynth = new SynthEngine(createOscillatorSettings(), masterOutputSettings, { effectsOnly: true })
const createChannelSynth = (oscillatorSettings: OscillatorSettings, outputSettings: OutputSettings) => new SynthEngine(oscillatorSettings, outputSettings, {
  audioContext: masterSynth.getAudioContext(),
  destination: masterSynth.getInput(),
})
let activeSynth = createChannelSynth(initialOscillatorSettings, initialOutputSettings)
const selectedChannel = ref(1)
const selectedInputId = ref('')
const midiInputs = ref<{ id: string; name: string }[]>([])
const midiStatus = ref('MIDI not connected.')
const audioStatus = ref('Audio locked. Interact with the synth to enable audio.')
const activeVoices = ref(0)
const oscillators = ref<OscillatorSettings[]>([initialOscillatorSettings])
const output = ref<OutputSettings>(initialOutputSettings)
const noise = ref<NoiseSettings | null>(null)
const filters = ref<FilterSettings[]>([createFilterSettings()])
const delays = ref<DelaySettings[]>([])
const overdrives = ref<OverdriveSettings[]>([])
const choruses = ref<ChorusSettings[]>([])
const flangers = ref<FlangerSettings[]>([])
const tremolos = ref<TremoloSettings[]>([])
const bpm = ref(120)
const reverbs = ref<ReverbSettings[]>([])
const amplitudeModulation = ref<AmplitudeModulationSettings | null>(null)
const envelopes = ref<EnvelopeModule[]>([])
const lfos = ref<LfoControlModule[]>([])
const dynamics = ref<DynamicsSettings[]>([])
const eqs = ref<EqSettings[]>([])
const moduleOrder = ref<ModuleOrderEntry[]>([{ type: 'filters', index: 0 }])
const isAmplitudeModulationBypassed = ref(false)
const selectedInstrumentId = ref('')
const channels = shallowRef<ChannelState[]>([])
const masterChannel: ChannelState = {
  synth: masterSynth,
  oscillators: [],
  output: masterOutputSettings,
  noise: null,
  filters: [],
  delays: [],
  overdrives: [],
  choruses: [],
  flangers: [],
  tremolos: [],
  bpm: 120,
  reverbs: [],
  amplitudeModulation: null,
  envelopes: [],
  lfos: [],
  dynamics: [],
  eqs: [],
  moduleOrder: [],
  isAmplitudeModulationBypassed: false,
  selectedInstrumentId: '',
}
const isMasterChannel = computed(() => selectedChannel.value === 0)
const areOscillatorsCollapsed = ref(false)
const areModulationEnvelopesCollapsed = ref(true)
const addModuleDialog = ref<HTMLDialogElement | null>(null)
const seedInput = ref('')
const seedStatus = ref('')
let firstInteractionHandled = false
let midiConnectionStarted = false
let audioEnabled = false

function saveActiveChannel() {
  const channel = selectedChannel.value === 0 ? masterChannel : channels.value[selectedChannel.value - 1]
  if (!channel) return
  channel.synth = activeSynth
  channel.oscillators = oscillators.value
  channel.output = output.value
  channel.noise = noise.value
  channel.filters = filters.value
  channel.delays = delays.value
  channel.overdrives = overdrives.value
  channel.choruses = choruses.value
  channel.flangers = flangers.value
  channel.tremolos = tremolos.value
  channel.bpm = bpm.value
  channel.reverbs = reverbs.value
  channel.amplitudeModulation = amplitudeModulation.value
  channel.envelopes = envelopes.value
  channel.lfos = lfos.value
  channel.dynamics = dynamics.value
  channel.eqs = eqs.value
  channel.moduleOrder = moduleOrder.value
  channel.isAmplitudeModulationBypassed = isAmplitudeModulationBypassed.value
  channel.selectedInstrumentId = selectedInstrumentId.value
}

function loadChannel(channelNumber: number) {
  const channel = channelNumber === 0 ? masterChannel : channels.value[channelNumber - 1]
  if (!channel) return
  saveActiveChannel()
  selectedChannel.value = channelNumber
  loadChannelState(channel)
}

function loadChannelState(channel: ChannelState) {
  activeSynth = channel.synth
  oscillators.value = channel.oscillators
  output.value = channel.output
  noise.value = channel.noise
  filters.value = channel.filters
  delays.value = channel.delays
  overdrives.value = channel.overdrives
  choruses.value = channel.choruses
  flangers.value = channel.flangers
  tremolos.value = channel.tremolos
  bpm.value = channel.bpm
  reverbs.value = channel.reverbs
  amplitudeModulation.value = channel.amplitudeModulation
  envelopes.value = channel.envelopes
  lfos.value = channel.lfos
  dynamics.value = channel.dynamics
  eqs.value = channel.eqs
  moduleOrder.value = channel.moduleOrder
  isAmplitudeModulationBypassed.value = channel.isAmplitudeModulationBypassed
  selectedInstrumentId.value = channel.selectedInstrumentId
  activeVoices.value = activeSynth.getActiveVoiceCount()
}

function addChannel() {
  if (channels.value.length >= 16) return
  saveActiveChannel()
  const oscillatorSettings = createOscillatorSettings()
  const outputSettings = createOutputSettings()
  const channel: ChannelState = {
    synth: createChannelSynth(oscillatorSettings, outputSettings),
    oscillators: [oscillatorSettings],
    output: outputSettings,
    noise: null,
    filters: [createFilterSettings()],
    delays: [],
    overdrives: [],
    choruses: [],
    flangers: [],
    tremolos: [],
    bpm: 120,
    reverbs: [],
    amplitudeModulation: null,
    envelopes: [],
    lfos: [],
    dynamics: [],
    eqs: [],
    moduleOrder: [{ type: 'filters', index: 0 }],
    isAmplitudeModulationBypassed: false,
    selectedInstrumentId: '',
  }
  channels.value = [...channels.value, channel]
  if (audioEnabled) {
    void channel.synth.activate()
  }
  loadChannel(channels.value.length)
}

function handleChannelKey(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return

  const channelNumber = Number(event.key)
  if (!Number.isInteger(channelNumber) || channelNumber < 0 || channelNumber > 9 || (channelNumber > 0 && channelNumber > channels.value.length)) return

  event.preventDefault()
  loadChannel(channelNumber)
}

function handleKeydown(event: KeyboardEvent) {
  handleFirstInteraction()
  handleChannelKey(event)
}

channels.value.push({
  synth: activeSynth,
  oscillators: oscillators.value,
  output: output.value,
  noise: noise.value,
  filters: filters.value,
  delays: delays.value,
  overdrives: overdrives.value,
  choruses: choruses.value,
  flangers: flangers.value,
  tremolos: tremolos.value,
  bpm: bpm.value,
  reverbs: reverbs.value,
  amplitudeModulation: amplitudeModulation.value,
  envelopes: envelopes.value,
  lfos: lfos.value,
  dynamics: dynamics.value,
  eqs: eqs.value,
  moduleOrder: moduleOrder.value,
  isAmplitudeModulationBypassed: isAmplitudeModulationBypassed.value,
  selectedInstrumentId: selectedInstrumentId.value,
})

const canSelectInput = computed(() => midiInputs.value.length > 0)
const oscillatorEnvelopeDestinations = [
  { value: 'oscillatorLevel', label: 'Level' },
  { value: 'oscillatorPitch', label: 'Pitch' },
] satisfies { value: EnvelopeDestination; label: string }[]
const noiseEnvelopeDestinations = [{ value: 'noiseLevel', label: 'Level' }] satisfies { value: EnvelopeDestination; label: string }[]
const filterEnvelopeDestinations = [
  { value: 'filterCutoff', label: 'Cutoff' },
  { value: 'filterResonance', label: 'Resonance' },
] satisfies { value: EnvelopeDestination; label: string }[]
const delayEnvelopeDestinations = [
  { value: 'delayTime', label: 'Time' },
  { value: 'delayFeedback', label: 'Feedback' },
  { value: 'delayMix', label: 'Mix' },
] satisfies { value: EnvelopeDestination; label: string }[]
const overdriveEnvelopeDestinations = [
  { value: 'overdriveDrive', label: 'Drive' },
  { value: 'overdriveTone', label: 'Tone' },
  { value: 'overdriveFeedback', label: 'Feedback' },
  { value: 'overdriveMix', label: 'Mix' },
] satisfies { value: EnvelopeDestination; label: string }[]
const chorusEnvelopeDestinations = [
  { value: 'chorusRate', label: 'LFO rate' },
  { value: 'chorusDepth', label: 'LFO depth' },
  { value: 'chorusDelay', label: 'Delay' },
  { value: 'chorusMix', label: 'Mix' },
] satisfies { value: EnvelopeDestination; label: string }[]
const flangerEnvelopeDestinations = [
  { value: 'flangerRate', label: 'LFO rate' },
  { value: 'flangerDepth', label: 'LFO depth' },
  { value: 'flangerDelay', label: 'Delay' },
  { value: 'flangerFeedback', label: 'Feedback' },
  { value: 'flangerMix', label: 'Mix' },
] satisfies { value: EnvelopeDestination; label: string }[]
const tremoloEnvelopeDestinations = [
  { value: 'tremoloRate', label: 'LFO rate' },
  { value: 'tremoloDepth', label: 'Depth' },
  { value: 'tremoloMix', label: 'Mix' },
] satisfies { value: EnvelopeDestination; label: string }[]
const reverbEnvelopeDestinations = [
  { value: 'reverbDecay', label: 'Decay' },
  { value: 'reverbMix', label: 'Mix' },
  { value: 'reverbPreDelay', label: 'Pre-delay' },
  { value: 'reverbDamping', label: 'Damping' },
  { value: 'reverbWidth', label: 'Width' },
] satisfies { value: EnvelopeDestination; label: string }[]

const midiService = new MidiService({
  onNoteOn: ({ channel, note, velocity }) => {
    const target = channels.value[channel - 1]
    if (!target) return
    target.synth.noteOn(note, velocity)
    activeVoices.value = channels.value.reduce((count, item) => count + item.synth.getActiveVoiceCount(), 0)
  },
  onNoteOff: ({ channel, note }) => {
    const target = channels.value[channel - 1]
    if (!target) return
    target.synth.noteOff(note)
    activeVoices.value = channels.value.reduce((count, item) => count + item.synth.getActiveVoiceCount(), 0)
  },
  onStateChange: (state) => {
    midiInputs.value = state.inputs
    midiStatus.value = state.statusText

    if (state.selectedInputId) {
      selectedInputId.value = state.selectedInputId
      return
    }

    selectedInputId.value = ''
  },
})

function handleEnableAudio() {
  masterSynth.activate()
    .then(() => {
      audioEnabled = true
      audioStatus.value = 'Audio enabled.'
    })
    .catch((error: unknown) => {
      audioStatus.value = error instanceof Error ? error.message : 'Failed to enable audio.'
    })
}

function connectMidi() {
  if (midiConnectionStarted) {
    return
  }

  midiConnectionStarted = true
  midiService
    .requestAccess()
    .then(() => {
      midiService.setChannel(selectedChannel.value)
      const firstInputId = midiService.getInputs()[0]?.id
      if (firstInputId) {
        selectedInputId.value = firstInputId
        midiService.setSelectedInput(firstInputId)
      }
    })
    .catch((error: unknown) => {
      midiConnectionStarted = false
      midiStatus.value = error instanceof Error ? error.message : 'Failed to connect MIDI.'
    })
}

function handleConnectMidi() {
  connectMidi()
}

function handleFirstInteraction() {
  if (firstInteractionHandled) {
    return
  }

  firstInteractionHandled = true
  handleEnableAudio()
  connectMidi()
}

function handleInputChange() {
  midiService.setSelectedInput(selectedInputId.value || null)
}

function handleChannelChange(event: Event) {
  const channelNumber = Number((event.target as HTMLSelectElement).value)
  loadChannel(channelNumber)
  if (channelNumber > 0) midiService.setChannel(channelNumber)
}

function handlePanic() {
  channels.value.forEach(({ synth }) => synth.stopAllNotes())
  activeVoices.value = 0
}

/** Returns the per-type instance counts of a setup's audio-routable modules, used to expand/validate module orders. */
function moduleCounts(setup: { filters: unknown[]; overdrives: unknown[]; choruses: unknown[]; flangers: unknown[]; tremolos: unknown[]; delays: unknown[]; reverbs: unknown[]; eqs: unknown[]; dynamics: unknown[] }): Record<EffectGroup, number> {
  return {
    filters: setup.filters.length,
    overdrives: setup.overdrives.length,
    choruses: setup.choruses.length,
    flangers: setup.flangers.length,
    tremolos: setup.tremolos.length,
    delays: setup.delays.length,
    reverbs: setup.reverbs.length,
    eqs: setup.eqs.length,
    dynamics: setup.dynamics.length,
  }
}

/** Expands a group-level order (one entry per processor type) into a flat, per-instance module order. */
function expandGroupOrderToModuleOrder(order: readonly EffectGroup[], counts: Record<EffectGroup, number>, hasAmplitudeModulation: boolean): ModuleOrderEntry[] {
  const expanded: ModuleOrderEntry[] = []
  order.forEach((type) => {
    for (let index = 0; index < counts[type]; index += 1) expanded.push({ type, index })
  })
  if (hasAmplitudeModulation) expanded.unshift({ type: 'amplitudeModulation', index: 0 })
  return expanded
}

function isModuleOrderEntry(value: unknown): value is ModuleOrderEntry {
  return isRecord(value)
    && typeof value.index === 'number' && Number.isInteger(value.index) && value.index >= 0
    && typeof value.type === 'string' && (value.type === 'amplitudeModulation' || (effectGroups as readonly string[]).includes(value.type))
}

/** Checks that a module order is a plausible shape (used for seed decoding, before exact coverage is known). */
function isModuleOrder(value: unknown): value is ModuleOrderEntry[] {
  return Array.isArray(value) && value.length <= MAX_SEED_MODULES * (effectGroups.length + 1) && value.every(isModuleOrderEntry)
}

/** Checks that a module order contains exactly one entry per existing module instance, with no duplicates or gaps. */
function moduleOrderCoversCounts(order: ModuleOrderEntry[], counts: Record<EffectGroup, number>, hasAmplitudeModulation: boolean): boolean {
  const seen = new Set<string>()
  for (const entry of order) {
    const key = `${entry.type}:${entry.index}`
    if (seen.has(key)) return false
    seen.add(key)
    const maxIndex = entry.type === 'amplitudeModulation' ? 1 : counts[entry.type]
    if (entry.index < 0 || entry.index >= maxIndex) return false
  }
  const expectedTotal = effectGroups.reduce((sum, group) => sum + counts[group], 0) + (hasAmplitudeModulation ? 1 : 0)
  return seen.size === expectedTotal
}

/** Resolves the best available module order for a setup: a precise candidate if valid, else an expanded legacy group order. */
function resolveModuleOrder(candidate: ModuleOrderEntry[] | undefined, fallbackGroupOrder: readonly EffectGroup[], counts: Record<EffectGroup, number>, hasAmplitudeModulation: boolean): ModuleOrderEntry[] {
  if (candidate && moduleOrderCoversCounts(candidate, counts, hasAmplitudeModulation)) {
    return candidate.map((entry) => ({ ...entry }))
  }
  return expandGroupOrderToModuleOrder(normalizeEffectOrder(fallbackGroupOrder), counts, hasAmplitudeModulation)
}

function createSynthFromSetup(setup: SynthSetup): SynthEngine {
  const [firstOscillator, ...additionalOscillators] = setup.oscillators
  if (!firstOscillator) {
    throw new Error('The setup has no oscillators.')
  }

  const synth = createChannelSynth(firstOscillator, setup.output)
  try {
    synth.setFilterSettings(0, setup.filters[0])
    additionalOscillators.forEach((settings) => synth.addOscillator(settings))
    setup.filters.slice(1).forEach((settings) => synth.addFilter(settings))
    if (setup.noise) synth.addNoise(setup.noise)
    setup.overdrives.forEach((settings) => synth.addOverdrive(settings))
    setup.choruses.forEach((settings) => synth.addChorus(settings))
    setup.flangers.forEach((settings) => synth.addFlanger(settings))
    setup.tremolos.forEach((settings) => synth.addTremolo(settings))
    setup.delays.forEach((settings) => synth.addDelay(settings))
    setup.reverbs.forEach((settings) => synth.addReverb(settings))
    setup.dynamics.forEach((settings) => {
      if (settings.type === 'compressor') synth.addCompressor(settings)
      else if (settings.type === 'gate') synth.addGate(settings)
      else synth.addLimiter(settings)
    })
    setup.eqs.forEach((settings) => synth.addEq(settings))
    if (setup.amplitudeModulation) {
      synth.addAmplitudeModulation(setup.amplitudeModulation)
      synth.setAmplitudeModulationBypassed(setup.isAmplitudeModulationBypassed)
    }
    setup.envelopes.forEach(({ bypassed, ...settings }) => {
      const index = synth.addEnvelope(settings)
      synth.setEnvelopeBypassed(index, bypassed)
    })
    setup.lfos.forEach(({ bypassed, ...settings }) => {
      const index = synth.addLfo(settings)
      synth.setLfoBypassed(index, bypassed)
    })
    const flatOrder: FlatAudioModule[] = setup.moduleOrder
      .filter((entry): entry is ModuleOrderEntry & { type: EffectGroup } => entry.type !== 'amplitudeModulation')
      .map((entry) => ({ type: entry.type, index: entry.index }))
    synth.setFlatAudioOrder(flatOrder)
    return synth
  } catch (error) {
    synth.destroy()
    throw error
  }
}

function applyInstrumentPreset(instrumentId: string) {
  const preset = instrumentPresets.find((instrument) => instrument.id === instrumentId)
  if (!preset) {
    return
  }

  const counts = moduleCounts(preset)
  const resolvedModuleOrder = expandGroupOrderToModuleOrder(normalizeEffectOrder(preset.effectOrder), counts, !!preset.amplitudeModulation)
  const previousSynth = activeSynth
  const synth = createSynthFromSetup({ ...preset, moduleOrder: resolvedModuleOrder })
  previousSynth.stopAllNotes()
  activeSynth = synth
  oscillators.value = preset.oscillators.map((settings) => ({ ...settings }))
  output.value = { ...preset.output }
  noise.value = preset.noise ? { ...preset.noise } : null
  filters.value = preset.filters.map((settings) => ({ ...settings }))
  delays.value = preset.delays.map((settings) => ({ ...settings }))
  overdrives.value = preset.overdrives.map((settings) => ({ ...settings }))
  choruses.value = preset.choruses.map((settings) => ({ ...settings }))
  flangers.value = preset.flangers.map((settings) => ({ ...settings }))
  tremolos.value = preset.tremolos.map((settings) => ({ ...settings }))
  bpm.value = preset.bpm
  reverbs.value = preset.reverbs.map((settings) => ({ ...settings }))
  amplitudeModulation.value = preset.amplitudeModulation ? { ...preset.amplitudeModulation } : null
  envelopes.value = preset.envelopes.map((settings) => ({ ...settings }))
  lfos.value = preset.lfos.map((settings) => ({ ...settings }))
  dynamics.value = preset.dynamics.map((settings) => ({ ...settings }))
  eqs.value = normalizeEqs(preset.eqs)
  moduleOrder.value = resolvedModuleOrder
  isAmplitudeModulationBypassed.value = preset.isAmplitudeModulationBypassed
  selectedInstrumentId.value = preset.id
  saveActiveChannel()
  previousSynth.destroy()

  if (audioEnabled) {
    void synth.activate().catch((error: unknown) => {
      audioStatus.value = error instanceof Error ? error.message : 'Failed to activate instrument.'
    })
  }
  activeVoices.value = channels.value.reduce((count, channel) => count + channel.synth.getActiveVoiceCount(), 0)
}

function createSeedChannel(channel: ChannelState): SeedChannel {
  return {
    oscillators: channel.oscillators,
    output: channel.output,
    noise: channel.noise,
    filters: channel.filters,
    delays: channel.delays,
    overdrives: channel.overdrives,
    choruses: channel.choruses,
    flangers: channel.flangers,
    tremolos: channel.tremolos,
    bpm: channel.bpm,
    reverbs: channel.reverbs,
    amplitudeModulation: channel.amplitudeModulation,
    envelopes: channel.envelopes,
    lfos: channel.lfos,
    dynamics: channel.dynamics,
    eqs: channel.eqs,
    moduleOrder: channel.moduleOrder,
    isAmplitudeModulationBypassed: channel.isAmplitudeModulationBypassed,
    selectedInstrumentId: channel.selectedInstrumentId,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isObjectArray(value: unknown, maximumLength: number, minimumLength = 0): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length >= minimumLength && value.length <= maximumLength && value.every(isRecord)
}

function isEqBandSettings(value: unknown): value is EqBandSettings {
  if (!isRecord(value)) return false
  const validTypes = ['peaking', 'lowshelf', 'highshelf', 'lowpass', 'highpass', 'notch']
  return typeof value.bypassed === 'boolean'
    && typeof value.type === 'string'
    && validTypes.some((type) => type === value.type)
    && typeof value.frequency === 'number'
    && Number.isFinite(value.frequency) && value.frequency >= 20 && value.frequency <= 20000
    && typeof value.gain === 'number'
    && Number.isFinite(value.gain) && value.gain >= -24 && value.gain <= 24
    && typeof value.q === 'number'
    && Number.isFinite(value.q) && value.q >= 0.1 && value.q <= 18
}

function isEqModulationTarget(value: unknown, eqIndex: number, bandCount: number): value is EqModulationTarget {
  const match = typeof value === 'string' ? /^eq:(\d+):(\d+):(frequency|q|gain)$/.exec(value) : null
  return !!match && Number(match[1]) === eqIndex && Number(match[2]) >= 0 && Number(match[2]) < bandCount
}

function isEqEnvelopeSettings(value: unknown, eqIndex: number, bandCount: number): value is EqEnvelopeSettings {
  return isRecord(value)
    && typeof value.bypassed === 'boolean'
    && typeof value.attack === 'number' && Number.isFinite(value.attack) && value.attack >= 0 && value.attack <= 300
    && typeof value.decay === 'number' && Number.isFinite(value.decay) && value.decay >= 0 && value.decay <= 150
    && typeof value.hold === 'number' && Number.isFinite(value.hold) && value.hold >= 0 && value.hold <= 150
    && typeof value.release === 'number' && Number.isFinite(value.release) && value.release >= 0 && value.release <= 450
    && typeof value.velocity === 'number' && Number.isFinite(value.velocity) && value.velocity >= 0 && value.velocity <= 1
    && (value.attackCurve === 'linear' || value.attackCurve === 'exponential')
    && (value.releaseCurve === 'linear' || value.releaseCurve === 'exponential')
    && isEqModulationTarget(value.destination, eqIndex, bandCount)
}

function isEqLfoSettings(value: unknown, eqIndex: number, bandCount: number): value is EqLfoSettings {
  return isRecord(value)
    && typeof value.bypassed === 'boolean'
    && (value.waveform === 'sine' || value.waveform === 'triangle' || value.waveform === 'sawtooth' || value.waveform === 'square' || value.waveform === 'random')
    && typeof value.rate === 'number' && Number.isFinite(value.rate) && value.rate >= 0.1 && value.rate <= 30
    && typeof value.depth === 'number' && Number.isFinite(value.depth) && value.depth >= 0 && value.depth <= 1
    && isEqModulationTarget(value.target, eqIndex, bandCount)
}

function isEqSettings(value: unknown, eqIndex: number): value is EqSettings {
  if (!isRecord(value) || (value.kind !== 'single' && value.kind !== 'multiband') || typeof value.bypassed !== 'boolean') return false
  const { bands, envelopes, lfos } = value
  if (!isObjectArray(bands, MAX_SEED_MODULES * 4) || !bands.every(isEqBandSettings) || (value.kind === 'single' && bands.length !== 1)) return false
  return isObjectArray(envelopes, MAX_SEED_MODULATORS)
    && envelopes.every((envelope) => isEqEnvelopeSettings(envelope, eqIndex, bands.length))
    && isObjectArray(lfos, MAX_SEED_MODULATORS)
    && lfos.every((lfo) => isEqLfoSettings(lfo, eqIndex, bands.length))
}

function isWaveform(value: unknown): value is Waveform {
  return value === 'sine' || value === 'triangle' || value === 'sawtooth' || value === 'square' || value === 'random'
}

function isChorusSettings(value: unknown): value is ChorusSettings {
  return isRecord(value)
    && typeof value.bypassed === 'boolean'
    && isWaveform(value.waveform)
    && typeof value.rate === 'number' && Number.isFinite(value.rate) && value.rate >= 0.01 && value.rate <= 20
    && typeof value.depth === 'number' && Number.isFinite(value.depth) && value.depth >= 0 && value.depth <= 1
    && typeof value.delay === 'number' && Number.isFinite(value.delay) && value.delay >= 0 && value.delay <= 0.045
    && typeof value.mix === 'number' && Number.isFinite(value.mix) && value.mix >= 0 && value.mix <= 1
}

function isFlangerSettings(value: unknown): value is FlangerSettings {
  return isRecord(value)
    && typeof value.bypassed === 'boolean'
    && isWaveform(value.waveform)
    && typeof value.rate === 'number' && Number.isFinite(value.rate) && value.rate >= 0.01 && value.rate <= 10
    && typeof value.depth === 'number' && Number.isFinite(value.depth) && value.depth >= 0 && value.depth <= 1
    && typeof value.delay === 'number' && Number.isFinite(value.delay) && value.delay >= 0 && value.delay <= 0.01
    && typeof value.feedback === 'number' && Number.isFinite(value.feedback) && value.feedback >= 0 && value.feedback <= 0.9
    && typeof value.mix === 'number' && Number.isFinite(value.mix) && value.mix >= 0 && value.mix <= 1
}

function isTremoloSettings(value: unknown): value is TremoloSettings {
  return isRecord(value)
    && typeof value.bypassed === 'boolean'
    && isWaveform(value.waveform)
    && typeof value.rate === 'number' && Number.isFinite(value.rate) && value.rate >= 0.1 && value.rate <= 30
    && typeof value.depth === 'number' && Number.isFinite(value.depth) && value.depth >= 0 && value.depth <= 1
    && typeof value.mix === 'number' && Number.isFinite(value.mix) && value.mix >= 0 && value.mix <= 1
}

function isEffectOrder(value: unknown): value is EffectGroup[] {
  if (!Array.isArray(value)) return false
  const groups = value.length === effectGroups.length
    ? effectGroups
    : value.length === legacyEffectGroups6.length
      ? legacyEffectGroups6
      : value.length === legacyEffectGroups.length ? legacyEffectGroups : null
  return groups !== null && groups.every((group) => value.filter((valueGroup) => valueGroup === group).length === 1)
}

function normalizeEffectOrder(order: readonly EffectGroup[]): EffectGroup[] {
  let normalized: EffectGroup[] = order.includes('eqs')
    ? [...order]
    : [...order.slice(0, order.indexOf('dynamics')), 'eqs', ...order.slice(order.indexOf('dynamics'))]
  const insertBefore: Record<'choruses' | 'flangers' | 'tremolos', EffectGroup> = {
    choruses: 'delays',
    flangers: 'delays',
    tremolos: 'delays',
  }
  ;(['choruses', 'flangers', 'tremolos'] as const).forEach((group) => {
    if (normalized.includes(group)) return
    const index = normalized.indexOf(insertBefore[group])
    normalized = [...normalized.slice(0, index), group, ...normalized.slice(index)]
  })
  return normalized
}

function normalizeEqs(eqs: EqSettings[] | undefined): EqSettings[] {
  return (eqs ?? []).map((eq) => ({
    ...eq,
    bands: eq.bands.map((band) => ({ ...band })),
    envelopes: eq.envelopes.map((envelope) => ({ ...envelope })),
    lfos: eq.lfos.map((lfo) => ({ ...lfo })),
  }))
}

function isSeedChannel(value: unknown): value is SeedChannel {
  if (!isRecord(value)) return false

  return typeof value.selectedInstrumentId === 'string'
    && typeof value.bpm === 'number'
    && isRecord(value.output)
    && (value.noise === null || isRecord(value.noise))
    && (value.amplitudeModulation === null || isRecord(value.amplitudeModulation))
    && typeof value.isAmplitudeModulationBypassed === 'boolean'
    && isObjectArray(value.oscillators, MAX_SEED_MODULES, 1)
    && isObjectArray(value.filters, MAX_SEED_MODULES, 1)
    && isObjectArray(value.delays, MAX_SEED_MODULES)
    && isObjectArray(value.overdrives, MAX_SEED_MODULES)
    && (value.choruses === undefined || (isObjectArray(value.choruses, MAX_SEED_MODULES) && value.choruses.every(isChorusSettings)))
    && (value.flangers === undefined || (isObjectArray(value.flangers, MAX_SEED_MODULES) && value.flangers.every(isFlangerSettings)))
    && (value.tremolos === undefined || (isObjectArray(value.tremolos, MAX_SEED_MODULES) && value.tremolos.every(isTremoloSettings)))
    && isObjectArray(value.reverbs, MAX_SEED_MODULES)
    && isObjectArray(value.envelopes, MAX_SEED_MODULATORS)
    && isObjectArray(value.lfos, MAX_SEED_MODULATORS)
    && isObjectArray(value.dynamics, MAX_SEED_MODULES)
    && (value.eqs === undefined || (isObjectArray(value.eqs, MAX_SEED_MODULES) && value.eqs.every((eq, index) => isEqSettings(eq, index))))
    && (value.moduleOrder === undefined || isModuleOrder(value.moduleOrder))
    && (value.moduleOrder !== undefined || isEffectOrder(value.effectOrder))
}

function isSeedState(value: unknown): value is SeedState {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.channels) || typeof value.selectedChannel !== 'number' || !Number.isInteger(value.selectedChannel)) return false

  const selectedChannel = value.selectedChannel
  return value.channels.length > 0
    && value.channels.length <= 16
    && selectedChannel >= 1
    && selectedChannel <= value.channels.length
    && value.channels.every(isSeedChannel)
}

function createChannelFromSeed(seedChannel: SeedChannel): ChannelState {
  const eqs = normalizeEqs(seedChannel.eqs)
  const choruses = seedChannel.choruses ?? []
  const flangers = seedChannel.flangers ?? []
  const tremolos = seedChannel.tremolos ?? []
  const counts = moduleCounts({ ...seedChannel, eqs, choruses, flangers, tremolos })
  const hasAmplitudeModulation = !!seedChannel.amplitudeModulation
  const resolvedModuleOrder = resolveModuleOrder(seedChannel.moduleOrder, seedChannel.effectOrder ?? effectGroups, counts, hasAmplitudeModulation)
  const synth = createSynthFromSetup({ ...seedChannel, eqs, choruses, flangers, tremolos, moduleOrder: resolvedModuleOrder })

  return {
    synth,
    oscillators: seedChannel.oscillators.map((settings) => ({ ...settings })),
    output: { ...seedChannel.output },
    noise: seedChannel.noise ? { ...seedChannel.noise } : null,
    filters: seedChannel.filters.map((settings) => ({ ...settings })),
    delays: seedChannel.delays.map((settings) => ({ ...settings })),
    overdrives: seedChannel.overdrives.map((settings) => ({ ...settings })),
    choruses: choruses.map((settings) => ({ ...settings })),
    flangers: flangers.map((settings) => ({ ...settings })),
    tremolos: tremolos.map((settings) => ({ ...settings })),
    bpm: seedChannel.bpm,
    reverbs: seedChannel.reverbs.map((settings) => ({ ...settings })),
    amplitudeModulation: seedChannel.amplitudeModulation ? { ...seedChannel.amplitudeModulation } : null,
    envelopes: seedChannel.envelopes.map((settings) => ({ ...settings })),
    lfos: seedChannel.lfos.map((settings) => ({ ...settings })),
    dynamics: seedChannel.dynamics.map((settings) => ({ ...settings })),
    eqs,
    moduleOrder: resolvedModuleOrder,
    isAmplitudeModulationBypassed: seedChannel.isAmplitudeModulationBypassed,
    selectedInstrumentId: seedChannel.selectedInstrumentId,
  }
}

function generateSeed() {
  saveActiveChannel()
  seedInput.value = encodeSeed({
    version: 1,
    selectedChannel: selectedChannel.value,
    channels: channels.value.map(createSeedChannel),
  } satisfies SeedState)
  seedStatus.value = 'Seed generated.'
}

async function copySeed() {
  if (!seedInput.value) {
    seedStatus.value = 'Generate or paste a seed first.'
    return
  }

  if (!navigator.clipboard) {
    seedStatus.value = 'Clipboard access is unavailable. Copy the seed from the field.'
    return
  }

  try {
    await navigator.clipboard.writeText(seedInput.value)
    seedStatus.value = 'Seed copied.'
  } catch (error: unknown) {
    seedStatus.value = error instanceof Error ? error.message : 'Failed to copy the seed.'
  }
}

function loadSeed() {
  const createdChannels: ChannelState[] = []

  try {
    const decoded = decodeSeed(seedInput.value.trim())
    if (!isSeedState(decoded)) throw new Error('This seed has an invalid setup.')

    decoded.channels.forEach((channel) => createdChannels.push(createChannelFromSeed(channel)))
    const previousChannels = channels.value
    previousChannels.forEach(({ synth }) => synth.stopAllNotes())
    channels.value = createdChannels
    selectedChannel.value = decoded.selectedChannel
    loadChannelState(createdChannels[decoded.selectedChannel - 1])
    midiService.setChannel(selectedChannel.value)
    previousChannels.forEach(({ synth }) => synth.destroy())
    activeVoices.value = 0
    seedStatus.value = 'Seed loaded.'

    if (audioEnabled) {
      void Promise.all(createdChannels.map(({ synth }) => synth.activate())).catch((error: unknown) => {
        audioStatus.value = error instanceof Error ? error.message : 'Failed to activate the loaded setup.'
      })
    }
  } catch (error: unknown) {
    createdChannels.forEach(({ synth }) => synth.destroy())
    seedStatus.value = error instanceof Error ? error.message : 'Failed to load the seed.'
  }
}

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createRandomOscillatorSettings(): OscillatorSettings {
  return {
    bypassed: false,
    detune: 0,
    glide: randomInteger(0, 2000),
    level: randomInteger(10, 100) / 100,
    waveform: waveforms[randomInteger(0, waveforms.length - 1)],
    unisonDetune: randomInteger(0, 100),
    stereoSpread: randomInteger(0, 100) / 100,
    fmAmount: randomInteger(0, 100) / 100,
    fmSource: waveforms[randomInteger(0, waveforms.length - 1)],
  }
}

/** Appends a new module instance to the end of the unified module order (mirrors the engine's own internal ordering). */
function appendModuleOrderEntry(type: ModuleKind, index: number) {
  moduleOrder.value = [...moduleOrder.value, { type, index }]
}

/** Removes a module instance from the unified module order, reindexing later same-type entries (mirrors array splice semantics). */
function removeModuleOrderEntry(type: ModuleKind, index: number) {
  moduleOrder.value = moduleOrder.value
    .filter((entry) => !(entry.type === type && entry.index === index))
    .map((entry) => (entry.type === type && entry.index > index ? { ...entry, index: entry.index - 1 } : entry))
}

/** Pushes the current module order's audio-routable entries (i.e. excluding Amplitude Modulation) to the active synth. */
function syncFlatAudioOrder() {
  const flatOrder = moduleOrder.value
    .filter((entry): entry is ModuleOrderEntry & { type: EffectGroup } => entry.type !== 'amplitudeModulation')
    .map((entry) => ({ type: entry.type, index: entry.index }))
  activeSynth.setFlatAudioOrder(flatOrder)
}

function canMoveModule(type: ModuleKind, index: number, direction: -1 | 1): boolean {
  const position = moduleOrder.value.findIndex((entry) => entry.type === type && entry.index === index)
  const targetPosition = position + direction
  return position >= 0 && targetPosition >= 0 && targetPosition < moduleOrder.value.length
}

function canMoveModuleUp(type: ModuleKind, index: number): boolean {
  return canMoveModule(type, index, -1)
}

function canMoveModuleDown(type: ModuleKind, index: number): boolean {
  return canMoveModule(type, index, 1)
}

/** Reorders a module relative to every other module in the chain, regardless of type (supports cross-type ordering). */
function moveModule(type: ModuleKind, index: number, direction: -1 | 1) {
  const position = moduleOrder.value.findIndex((entry) => entry.type === type && entry.index === index)
  const targetPosition = position + direction
  if (position < 0 || targetPosition < 0 || targetPosition >= moduleOrder.value.length) return
  const nextOrder = [...moduleOrder.value]
  ;[nextOrder[position], nextOrder[targetPosition]] = [nextOrder[targetPosition], nextOrder[position]]
  moduleOrder.value = nextOrder
  syncFlatAudioOrder()
}

function addOscillator() {
  const settings = createRandomOscillatorSettings()
  oscillators.value.push(settings)
  activeSynth.addOscillator(settings)
}

function removeOscillator(index: number) {
  removeLfosForModule('oscillator', index)
  activeSynth.removeOscillator(index)
  oscillators.value.splice(index, 1)
}

function addNoise() {
  const settings = createNoiseSettings()
  noise.value = settings
  activeSynth.addNoise(settings)
}

function removeNoise() {
  removeLfosForModule('noise', 0)
  activeSynth.removeNoise()
  noise.value = null
}

function addFilter() {
  const settings = createFilterSettings()
  filters.value.push(settings)
  activeSynth.addFilter(settings)
  appendModuleOrderEntry('filters', filters.value.length - 1)
}

function removeFilter(index: number) {
  removeLfosForModule('filter', index)
  activeSynth.removeFilter(index)
  filters.value.splice(index, 1)
  removeModuleOrderEntry('filters', index)
}

function updateFilterSettings(index: number, settings: Partial<FilterSettings>) {
  filters.value[index] = { ...filters.value[index], ...settings }
  activeSynth.setFilterSettings(index, settings)
}

function toggleFilterBypass(index: number) {
  updateFilterSettings(index, { bypassed: !filters.value[index].bypassed })
}

function addDelay() {
  const settings = createDelaySettings()
  delays.value.push(settings)
  activeSynth.addDelay(settings)
  appendModuleOrderEntry('delays', delays.value.length - 1)
}

function removeDelay(index: number) {
  removeLfosForModule('delay', index)
  activeSynth.removeDelay(index)
  delays.value.splice(index, 1)
  removeModuleOrderEntry('delays', index)
}

function updateDelaySettings(index: number, settings: Partial<DelaySettings>) {
  if (settings.noteTime !== undefined) {
    settings = { ...settings, time: delayTimeForBpm(settings.noteTime, bpm.value) }
  }
  delays.value[index] = { ...delays.value[index], ...settings }
  activeSynth.setDelaySettings(index, settings)
}

function delayTimeForBpm(noteTime: number, tempo: number) {
  return (60 / tempo) * (4 / noteTime)
}

function updateBpm(value: number) {
  bpm.value = Math.min(300, Math.max(30, Number.isFinite(value) ? value : 120))
  delays.value.forEach((delay, index) => {
    const time = delayTimeForBpm(delay.noteTime, bpm.value)
    delays.value[index] = { ...delay, time }
    activeSynth.setDelaySettings(index, { time })
  })
}

function toggleDelayBypass(index: number) {
  const bypassed = !delays.value[index].bypassed
  delays.value[index] = { ...delays.value[index], bypassed }
  activeSynth.setDelayBypassed(index, bypassed)
}

function addOverdrive() {
  const settings = createOverdriveSettings()
  overdrives.value.push(settings)
  activeSynth.addOverdrive(settings)
  appendModuleOrderEntry('overdrives', overdrives.value.length - 1)
}

function removeOverdrive(index: number) {
  removeLfosForModule('overdrive', index)
  activeSynth.removeOverdrive(index)
  overdrives.value.splice(index, 1)
  removeModuleOrderEntry('overdrives', index)
}

function updateOverdriveSettings(index: number, settings: Partial<OverdriveSettings>) {
  overdrives.value[index] = { ...overdrives.value[index], ...settings }
  activeSynth.setOverdriveSettings(index, settings)
}

function toggleOverdriveBypass(index: number) {
  const bypassed = !overdrives.value[index].bypassed
  overdrives.value[index] = { ...overdrives.value[index], bypassed }
  activeSynth.setOverdriveBypassed(index, bypassed)
}

function addChorus() {
  const settings = createChorusSettings()
  choruses.value.push(settings)
  activeSynth.addChorus(settings)
  appendModuleOrderEntry('choruses', choruses.value.length - 1)
}

function removeChorus(index: number) {
  removeLfosForModule('chorus', index)
  activeSynth.removeChorus(index)
  choruses.value.splice(index, 1)
  removeModuleOrderEntry('choruses', index)
}

function updateChorusSettings(index: number, settings: Partial<ChorusSettings>) {
  choruses.value[index] = { ...choruses.value[index], ...settings }
  activeSynth.setChorusSettings(index, settings)
}

function toggleChorusBypass(index: number) {
  const bypassed = !choruses.value[index].bypassed
  choruses.value[index] = { ...choruses.value[index], bypassed }
  activeSynth.setChorusBypassed(index, bypassed)
}

function addFlanger() {
  const settings = createFlangerSettings()
  flangers.value.push(settings)
  activeSynth.addFlanger(settings)
  appendModuleOrderEntry('flangers', flangers.value.length - 1)
}

function removeFlanger(index: number) {
  removeLfosForModule('flanger', index)
  activeSynth.removeFlanger(index)
  flangers.value.splice(index, 1)
  removeModuleOrderEntry('flangers', index)
}

function updateFlangerSettings(index: number, settings: Partial<FlangerSettings>) {
  flangers.value[index] = { ...flangers.value[index], ...settings }
  activeSynth.setFlangerSettings(index, settings)
}

function toggleFlangerBypass(index: number) {
  const bypassed = !flangers.value[index].bypassed
  flangers.value[index] = { ...flangers.value[index], bypassed }
  activeSynth.setFlangerBypassed(index, bypassed)
}

function addTremolo() {
  const settings = createTremoloSettings()
  tremolos.value.push(settings)
  activeSynth.addTremolo(settings)
  appendModuleOrderEntry('tremolos', tremolos.value.length - 1)
}

function removeTremolo(index: number) {
  removeLfosForModule('tremolo', index)
  activeSynth.removeTremolo(index)
  tremolos.value.splice(index, 1)
  removeModuleOrderEntry('tremolos', index)
}

function updateTremoloSettings(index: number, settings: Partial<TremoloSettings>) {
  tremolos.value[index] = { ...tremolos.value[index], ...settings }
  activeSynth.setTremoloSettings(index, settings)
}

function toggleTremoloBypass(index: number) {
  const bypassed = !tremolos.value[index].bypassed
  tremolos.value[index] = { ...tremolos.value[index], bypassed }
  activeSynth.setTremoloBypassed(index, bypassed)
}

function addSingleBandEq() {
  const settings = createSingleBandEqSettings()
  eqs.value.push(settings)
  activeSynth.addEq(settings)
  appendModuleOrderEntry('eqs', eqs.value.length - 1)
}

function addMultibandEq() {
  const settings = createMultibandEqSettings()
  eqs.value.push(settings)
  activeSynth.addEq(settings)
  appendModuleOrderEntry('eqs', eqs.value.length - 1)
}

function removeEq(index: number) {
  activeSynth.removeEq(index)
  eqs.value = eqs.value.filter((_, eqIndex) => eqIndex !== index).map(reindexEqModulationTargets)
  removeModuleOrderEntry('eqs', index)
}

function toggleEqBypass(index: number) {
  const bypassed = !eqs.value[index].bypassed
  eqs.value[index] = { ...eqs.value[index], bypassed }
  activeSynth.setEqBypassed(index, bypassed)
}

function addEqBand(eqIndex: number) {
  const eq = eqs.value[eqIndex]
  if (!eq || eq.kind !== 'multiband') return
  const band = createEqBandSettings()
  eqs.value[eqIndex] = { ...eq, bands: [...eq.bands, band] }
  activeSynth.addEqBand(eqIndex, band)
}

function removeEqBand(eqIndex: number, bandIndex: number) {
  const eq = eqs.value[eqIndex]
  if (!eq || eq.kind !== 'multiband' || !eq.bands[bandIndex]) return
  activeSynth.removeEqBand(eqIndex, bandIndex)
  const bands = eq.bands.filter((_, index) => index !== bandIndex)
  eqs.value[eqIndex] = {
    ...eq,
    bands,
    envelopes: eq.envelopes.flatMap((envelope) => {
      const target = parseEqModulationTarget(envelope.destination)
      if (!target || target.bandIndex === bandIndex) return []
      return [{ ...envelope, destination: createEqModulationTarget(eqIndex, target.bandIndex > bandIndex ? target.bandIndex - 1 : target.bandIndex, target.parameter) }]
    }),
    lfos: eq.lfos.flatMap((lfo) => {
      const target = parseEqModulationTarget(lfo.target)
      if (!target || target.bandIndex === bandIndex) return []
      return [{ ...lfo, target: createEqModulationTarget(eqIndex, target.bandIndex > bandIndex ? target.bandIndex - 1 : target.bandIndex, target.parameter) }]
    }),
  }
}

function updateEqBandSettings(eqIndex: number, bandIndex: number, changes: Partial<EqBandSettings>) {
  const eq = eqs.value[eqIndex]
  const band = eq?.bands[bandIndex]
  if (!eq || !band) return
  const bands = eq.bands.map((currentBand, index) => index === bandIndex ? { ...currentBand, ...changes } : currentBand)
  eqs.value[eqIndex] = { ...eq, bands }
  activeSynth.setEqBandSettings(eqIndex, bandIndex, changes)
}

function toggleEqBandBypass(eqIndex: number, bandIndex: number) {
  const band = eqs.value[eqIndex]?.bands[bandIndex]
  if (!band) return
  updateEqBandSettings(eqIndex, bandIndex, { bypassed: !band.bypassed })
}

function createEqModulationTarget(eqIndex: number, bandIndex: number, parameter: EqParameter): EqModulationTarget {
  return `eq:${eqIndex}:${bandIndex}:${parameter}`
}

function parseEqModulationTarget(target: EqModulationTarget): { bandIndex: number; parameter: EqParameter } | undefined {
  const match = /^eq:\d+:(\d+):(frequency|q|gain)$/.exec(target)
  return match ? { bandIndex: Number(match[1]), parameter: match[2] as EqParameter } : undefined
}

function reindexEqModulationTargets(eq: EqSettings, eqIndex: number): EqSettings {
  return {
    ...eq,
    envelopes: eq.envelopes.map((envelope) => {
      const target = parseEqModulationTarget(envelope.destination)
      return target ? { ...envelope, destination: createEqModulationTarget(eqIndex, target.bandIndex, target.parameter) } : envelope
    }),
    lfos: eq.lfos.map((lfo) => {
      const target = parseEqModulationTarget(lfo.target)
      return target ? { ...lfo, target: createEqModulationTarget(eqIndex, target.bandIndex, target.parameter) } : lfo
    }),
  }
}

function eqModulationTargetOptions(eqIndex: number) {
  const eq = eqs.value[eqIndex]
  return (eq?.bands ?? []).flatMap((_, bandIndex) => [
    { value: createEqModulationTarget(eqIndex, bandIndex, 'frequency'), label: `Band ${bandIndex + 1} frequency` },
    { value: createEqModulationTarget(eqIndex, bandIndex, 'q'), label: `Band ${bandIndex + 1} Q` },
    { value: createEqModulationTarget(eqIndex, bandIndex, 'gain'), label: `Band ${bandIndex + 1} gain` },
  ])
}

function eqEnvelopes(eqIndex: number) {
  return eqs.value[eqIndex]?.envelopes.map((envelope, index) => ({ ...envelope, index })) ?? []
}

function eqLfos(eqIndex: number) {
  return eqs.value[eqIndex]?.lfos.map((lfo, index) => ({ ...lfo, index })) ?? []
}

function addEqEnvelope(eqIndex: number) {
  const target = eqModulationTargetOptions(eqIndex)[0]?.value
  const eq = eqs.value[eqIndex]
  if (!eq || !target) return
  const settings: EqEnvelopeSettings = { ...createEnvelopeSettings(), destination: target, bypassed: false }
  activeSynth.addEqEnvelope(eqIndex, settings)
  eqs.value[eqIndex] = { ...eq, envelopes: [...eq.envelopes, settings] }
}

function updateEqEnvelope(eqIndex: number, envelopeIndex: number, settings: Partial<EqEnvelopeSettings>) {
  const eq = eqs.value[eqIndex]
  const envelope = eq?.envelopes[envelopeIndex]
  if (!eq || !envelope) return
  activeSynth.setEqEnvelopeSettings(eqIndex, envelopeIndex, settings)
  eqs.value[eqIndex] = { ...eq, envelopes: eq.envelopes.map((current, index) => index === envelopeIndex ? { ...current, ...settings } : current) }
}

function updateEqEnvelopeFromControls(eqIndex: number, envelopeIndex: number, settings: Partial<EnvelopeSettings>) {
  if (settings.destination !== undefined && !isEqModulationTarget(settings.destination, eqIndex, eqs.value[eqIndex]?.bands.length ?? 0)) return
  updateEqEnvelope(eqIndex, envelopeIndex, settings as Partial<EqEnvelopeSettings>)
}

function toggleEqEnvelopeBypass(eqIndex: number, envelopeIndex: number) {
  const envelope = eqs.value[eqIndex]?.envelopes[envelopeIndex]
  if (!envelope) return
  updateEqEnvelope(eqIndex, envelopeIndex, { bypassed: !envelope.bypassed })
  activeSynth.setEqEnvelopeBypassed(eqIndex, envelopeIndex, !envelope.bypassed)
}

function removeEqEnvelope(eqIndex: number, envelopeIndex: number) {
  const eq = eqs.value[eqIndex]
  if (!eq?.envelopes[envelopeIndex]) return
  activeSynth.removeEqEnvelope(eqIndex, envelopeIndex)
  eqs.value[eqIndex] = { ...eq, envelopes: eq.envelopes.filter((_, index) => index !== envelopeIndex) }
}

function addEqLfo(eqIndex: number) {
  const target = eqModulationTargetOptions(eqIndex)[0]?.value
  const eq = eqs.value[eqIndex]
  if (!eq || !target) return
  const settings: EqLfoSettings = { waveform: 'sine', rate: 5, depth: 0.25, target, bypassed: false }
  activeSynth.addEqLfo(eqIndex, settings)
  eqs.value[eqIndex] = { ...eq, lfos: [...eq.lfos, settings] }
}

function updateEqLfo(eqIndex: number, lfoIndex: number, settings: Partial<EqLfoSettings>) {
  const eq = eqs.value[eqIndex]
  const lfo = eq?.lfos[lfoIndex]
  if (!eq || !lfo) return
  activeSynth.setEqLfoSettings(eqIndex, lfoIndex, settings)
  eqs.value[eqIndex] = { ...eq, lfos: eq.lfos.map((current, index) => index === lfoIndex ? { ...current, ...settings } : current) }
}

function updateEqLfoFromControls(eqIndex: number, lfoIndex: number, settings: Partial<LfoSettings>) {
  if (settings.target !== undefined && !isEqModulationTarget(settings.target, eqIndex, eqs.value[eqIndex]?.bands.length ?? 0)) return
  updateEqLfo(eqIndex, lfoIndex, settings as Partial<EqLfoSettings>)
}

function toggleEqLfoBypass(eqIndex: number, lfoIndex: number) {
  const lfo = eqs.value[eqIndex]?.lfos[lfoIndex]
  if (!lfo) return
  updateEqLfo(eqIndex, lfoIndex, { bypassed: !lfo.bypassed })
  activeSynth.setEqLfoBypassed(eqIndex, lfoIndex, !lfo.bypassed)
}

function removeEqLfo(eqIndex: number, lfoIndex: number) {
  const eq = eqs.value[eqIndex]
  if (!eq?.lfos[lfoIndex]) return
  activeSynth.removeEqLfo(eqIndex, lfoIndex)
  eqs.value[eqIndex] = { ...eq, lfos: eq.lfos.filter((_, index) => index !== lfoIndex) }
}

function addReverb() {
  const settings = createReverbSettings()
  reverbs.value.push(settings)
  activeSynth.addReverb(settings)
  appendModuleOrderEntry('reverbs', reverbs.value.length - 1)
}

function removeReverb(index: number) {
  removeLfosForModule('reverb', index)
  activeSynth.removeReverb(index)
  reverbs.value.splice(index, 1)
  removeModuleOrderEntry('reverbs', index)
}

function updateReverbSettings(index: number, settings: Partial<ReverbSettings>) {
  reverbs.value[index] = { ...reverbs.value[index], ...settings }
  activeSynth.setReverbSettings(index, settings)
}

function toggleReverbBypass(index: number) {
  const bypassed = !reverbs.value[index].bypassed
  reverbs.value[index] = { ...reverbs.value[index], bypassed }
  activeSynth.setReverbBypassed(index, bypassed)
}

function addCompressor() {
  const settings = createCompressorSettings()
  dynamics.value.push(settings)
  activeSynth.addCompressor(settings)
  appendModuleOrderEntry('dynamics', dynamics.value.length - 1)
}

function addGate() {
  const settings = createGateSettings()
  dynamics.value.push(settings)
  activeSynth.addGate(settings)
  appendModuleOrderEntry('dynamics', dynamics.value.length - 1)
}

function addLimiter() {
  const settings = createLimiterSettings()
  dynamics.value.push(settings)
  activeSynth.addLimiter(settings)
  appendModuleOrderEntry('dynamics', dynamics.value.length - 1)
}

function updateDynamicsSettings(index: number, settings: DynamicsSettingsChanges) {
  dynamics.value[index] = { ...dynamics.value[index], ...settings } as DynamicsSettings
  activeSynth.setDynamicsSettings(index, settings)
}

function removeDynamics(index: number) {
  activeSynth.removeDynamics(index)
  dynamics.value.splice(index, 1)
  removeModuleOrderEntry('dynamics', index)
}

function toggleDynamicsBypass(index: number) {
  const bypassed = !dynamics.value[index].bypassed
  dynamics.value[index] = { ...dynamics.value[index], bypassed } as DynamicsSettings
  activeSynth.setDynamicsBypassed(index, bypassed)
}

function updateNoiseSettings(settings: Partial<NoiseSettings>) {
  if (!noise.value) {
    return
  }

  noise.value = { ...noise.value, ...settings }
  activeSynth.setNoiseSettings(settings)
}

function updateOutputSettings(settings: Partial<OutputSettings>) {
  output.value = { ...output.value, ...settings }
  activeSynth.setOutputSettings(settings)
}

function toggleNoiseBypass() {
  if (!noise.value) {
    return
  }

  updateNoiseSettings({ bypassed: !noise.value.bypassed })
}

function addAmplitudeModulation() {
  const settings: AmplitudeModulationSettings = { rate: 5, depth: 0.5, waveform: 'sine' }
  amplitudeModulation.value = settings
  isAmplitudeModulationBypassed.value = false
  activeSynth.addAmplitudeModulation(settings)
  appendModuleOrderEntry('amplitudeModulation', 0)
}

function updateAmplitudeModulation(settings: Partial<AmplitudeModulationSettings>) {
  if (!amplitudeModulation.value) {
    return
  }

  amplitudeModulation.value = { ...amplitudeModulation.value, ...settings }
  activeSynth.setAmplitudeModulationSettings(settings)
}

function removeAmplitudeModulation() {
  activeSynth.removeAmplitudeModulation()
  amplitudeModulation.value = null
  isAmplitudeModulationBypassed.value = false
  removeModuleOrderEntry('amplitudeModulation', 0)
}

function toggleAmplitudeModulationBypass() {
  const bypassed = !isAmplitudeModulationBypassed.value
  activeSynth.setAmplitudeModulationBypassed(bypassed)
  isAmplitudeModulationBypassed.value = bypassed
}

function addEnvelope(destination: EnvelopeDestination) {
  const settings = { ...createEnvelopeSettings(), destination, bypassed: false }
  activeSynth.addEnvelope(settings)
  envelopes.value.push(settings)
}

function removeEnvelope(index: number) {
  activeSynth.removeEnvelope(index)
  envelopes.value.splice(index, 1)
}

function toggleEnvelopeBypass(index: number) {
  const bypassed = !envelopes.value[index].bypassed
  activeSynth.setEnvelopeBypassed(index, bypassed)
  envelopes.value[index] = { ...envelopes.value[index], bypassed }
}

function updateEnvelopeSettings(index: number, settings: Partial<EnvelopeSettings>) {
  envelopes.value[index] = { ...envelopes.value[index], ...settings }
  activeSynth.setEnvelopeSettings(index, settings)
}

function lfoTargetOptions(module: 'oscillator' | 'noise' | 'filter' | 'delay' | 'overdrive' | 'chorus' | 'flanger' | 'tremolo' | 'reverb' | 'output', index: number): { value: LfoSettings['target']; label: string }[] {
  const targets = {
    oscillator: [['detune', 'Detune'], ['level', 'Level'], ['stereoSpread', 'Stereo spread']],
    noise: [['level', 'Level'], ['stereoSpread', 'Stereo spread']],
    filter: [['cutoff', 'Cutoff'], ['resonance', 'Resonance'], ['gain', 'Gain']],
    delay: [['time', 'Time'], ['feedback', 'Feedback'], ['mix', 'Mix'], ['overdrive', 'Overdrive']],
    overdrive: [['drive', 'Drive'], ['tone', 'Tone'], ['feedback', 'Feedback'], ['mix', 'Mix']],
    chorus: [['rate', 'LFO rate'], ['depth', 'LFO depth'], ['delay', 'Delay'], ['mix', 'Mix']],
    flanger: [['rate', 'LFO rate'], ['depth', 'LFO depth'], ['delay', 'Delay'], ['feedback', 'Feedback'], ['mix', 'Mix']],
    tremolo: [['rate', 'LFO rate'], ['depth', 'Depth'], ['mix', 'Mix']],
    reverb: [['preDelay', 'Pre-delay'], ['damping', 'Damping'], ['mix', 'Mix'], ['width', 'Width']],
    output: [['volume', 'Volume'], ['pan', 'Pan']],
  } as const
  return targets[module].map(([parameter, label]) => ({ value: `${module}:${index}:${parameter}` as LfoSettings['target'], label }))
}

function lfosForModule(module: 'oscillator' | 'noise' | 'filter' | 'delay' | 'overdrive' | 'chorus' | 'flanger' | 'tremolo' | 'reverb' | 'output', index: number) {
  const prefix = `${module}:${index}:`
  return lfos.value.flatMap((lfo, lfoIndex) => lfo.target.startsWith(prefix) ? [{ ...lfo, index: lfoIndex }] : [])
}

function addLfo(module: 'oscillator' | 'noise' | 'filter' | 'delay' | 'overdrive' | 'chorus' | 'flanger' | 'tremolo' | 'reverb' | 'output', index: number) {
  const target = lfoTargetOptions(module, index)[0].value
  const settings: LfoControlModule = { waveform: 'sine', rate: 5, depth: 0.25, target, bypassed: false }
  activeSynth.addLfo(settings)
  lfos.value.push(settings)
}

function updateLfo(index: number, settings: Partial<LfoSettings>) {
  lfos.value[index] = { ...lfos.value[index], ...settings }
  activeSynth.setLfoSettings(index, settings)
}

function toggleLfoBypass(index: number) {
  const bypassed = !lfos.value[index].bypassed
  lfos.value[index] = { ...lfos.value[index], bypassed }
  activeSynth.setLfoBypassed(index, bypassed)
}

function removeLfo(index: number) {
  activeSynth.removeLfo(index)
  lfos.value.splice(index, 1)
}

function removeLfosForModule(module: string, index: number) {
  const exactPrefix = `${module}:${index}:`
  for (let lfoIndex = lfos.value.length - 1; lfoIndex >= 0; lfoIndex -= 1) {
    if (lfos.value[lfoIndex].target.startsWith(exactPrefix)) removeLfo(lfoIndex)
  }
  lfos.value.forEach((lfo, lfoIndex) => {
    const [targetModule, rawIndex, parameter] = lfo.target.split(':')
    if (targetModule === module && Number(rawIndex) > index) updateLfo(lfoIndex, { target: `${module}:${Number(rawIndex) - 1}:${parameter}` as LfoSettings['target'] })
  })
}

function envelopesFor(destinations: readonly { value: EnvelopeDestination }[]) {
  return envelopes.value.flatMap((envelope, index) => destinations.some((destination) => destination.value === envelope.destination) ? [{ ...envelope, index }] : [])
}

function toggleOscillatorBypass(index: number) {
  updateOscillatorSettings(index, { bypassed: !oscillators.value[index].bypassed })
}

function updateOscillatorSettings(index: number, settings: Partial<OscillatorSettings>) {
  oscillators.value[index] = { ...oscillators.value[index], ...settings }
  activeSynth.setOscillatorSettings(index, settings)
}

function openAddModuleDialog() {
  addModuleDialog.value?.showModal()
}

function closeAddModuleDialog() {
  addModuleDialog.value?.close()
}

/** Runs an add-module action and closes the dialog, so every "Add Module" button reuses the existing addX() handlers. */
function addModuleFromDialog(action: () => void) {
  action()
  closeAddModuleDialog()
}

onMounted(() => {
  midiService.setChannel(selectedChannel.value)
  window.addEventListener('keydown', handleKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  midiService.destroy()
  channels.value.forEach(({ synth }) => synth.destroy())
  masterSynth.destroy()
})
</script>

<template>
  <main class="app" @pointerdown.capture="handleFirstInteraction">
    <section class="panel">
      <header class="topbar">
        <div>
          <h1>Synth2</h1>
        </div>
        <div class="topbar-actions">
          <output class="voice-count" title="Active voices">{{ activeVoices }}</output>
          <label class="bpm-control">
            <span class="bpm-label">BPM</span>
            <input aria-label="Global tempo in beats per minute" type="number" min="30" max="300" step="1" :value="bpm" @input="updateBpm(Number(($event.target as HTMLInputElement).value))">
          </label>
          <button type="button" class="panic-button" @click="handlePanic">Panic</button>
        </div>
      </header>

      <section class="channel-bar" aria-label="Synth channels">
        <div>
          <p class="eyebrow">Channel</p>
          <strong class="channel-number">{{ isMasterChannel ? 'MASTER' : `MIDI ${selectedChannel}` }}</strong>
        </div>
        <div class="channel-actions">
          <button
            type="button"
            class="channel-button"
            :class="{ 'channel-button-active': isMasterChannel }"
            @click="loadChannel(0)"
          >
            0
          </button>
          <button
            v-for="(channel, index) in channels"
            :key="index"
            type="button"
            class="channel-button"
            :class="{ 'channel-button-active': channel === channels[selectedChannel - 1] }"
            @click="loadChannel(index + 1)"
          >
            {{ index + 1 }}
          </button>
          <button v-if="channels.length < 16" type="button" class="add-channel-button" @click="addChannel">Add Channel</button>
        </div>
      </section>

      <label v-if="!isMasterChannel" class="instrument-selector">
        <span>Instrument</span>
        <select :value="selectedInstrumentId" @change="applyInstrumentPreset(($event.target as HTMLSelectElement).value)">
          <option value="" disabled>Select instrument</option>
          <optgroup v-for="category in instrumentCategories" :key="category" :label="category">
            <option v-for="instrument in instrumentPresets.filter((item) => item.category === category)" :key="instrument.id" :value="instrument.id">
              {{ instrument.name }}
            </option>
          </optgroup>
        </select>
      </label>

      <OutputControls
        :volume="output.volume"
        :pan="output.pan"
        :lfos="lfosForModule('output', 0)"
        @update:volume="updateOutputSettings({ volume: $event })"
        @update:pan="updateOutputSettings({ pan: $event })"
        @update-lfo="updateLfo($event.index, $event.settings)"
        @toggle-lfo-bypass="toggleLfoBypass"
        @remove-lfo="removeLfo"
        @add-lfo="addLfo('output', 0)"
      />

      <section v-if="!isMasterChannel" class="synth-section oscillators-section" aria-labelledby="oscillators-heading">
        <h2 id="oscillators-heading">
          <button
            type="button"
            class="oscillators-toggle"
            :aria-expanded="!areOscillatorsCollapsed"
            aria-controls="oscillators-content"
            @click="areOscillatorsCollapsed = !areOscillatorsCollapsed"
          >
            Oscillators
          </button>
        </h2>
        <div v-show="!areOscillatorsCollapsed" id="oscillators-content" class="oscillators-content">
          <template v-for="(oscillator, index) in oscillators" :key="index">
          <OscillatorControls
            :oscillator-index="index"
            v-bind="oscillator"
            @update:detune="updateOscillatorSettings(index, { detune: $event })"
            @update:glide="updateOscillatorSettings(index, { glide: $event })"
            @update:level="updateOscillatorSettings(index, { level: $event })"
            @update:waveform="updateOscillatorSettings(index, { waveform: $event })"
            @update:unison-detune="updateOscillatorSettings(index, { unisonDetune: $event })"
            @update:stereo-spread="updateOscillatorSettings(index, { stereoSpread: $event })"
            @update:fm-amount="updateOscillatorSettings(index, { fmAmount: $event })"
            @update:fm-source="updateOscillatorSettings(index, { fmSource: $event })"
            @toggle-bypass="toggleOscillatorBypass(index)"
            @remove="removeOscillator(index)"
          />
          <LfoControls
            :lfos="lfosForModule('oscillator', index)"
            :target-options="lfoTargetOptions('oscillator', index)"
            :id-prefix="`oscillator-${index}`"
            @update="updateLfo($event.index, $event.settings)"
            @toggle-bypass="toggleLfoBypass"
            @remove="removeLfo"
            @add="addLfo('oscillator', index)"
          />
          </template>
          <div class="module-actions">
            <button type="button" class="add-oscillator-button" @click="addOscillator">Add OSC</button>
            <button v-if="!noise" type="button" class="add-oscillator-button" @click="addNoise">Add Noise</button>
            <button v-if="!amplitudeModulation" type="button" class="add-am-button" @click="addAmplitudeModulation">Add AM</button>
          </div>
          <EnvelopeControls
            :envelopes="envelopesFor(oscillatorEnvelopeDestinations)"
            :destination-options="oscillatorEnvelopeDestinations"
            id-prefix="oscillator"
            @update="updateEnvelopeSettings($event.index, $event.settings)"
            @toggle-bypass="toggleEnvelopeBypass"
            @remove="removeEnvelope"
            @add="addEnvelope('oscillatorLevel')"
          />
        </div>
      </section>

      <template v-if="!isMasterChannel && noise">
        <NoiseControls
          class="synth-section"
          v-bind="noise"
          @update:color="updateNoiseSettings({ color: $event })"
          @update:level="updateNoiseSettings({ level: $event })"
          @update:stereo-spread="updateNoiseSettings({ stereoSpread: $event })"
          @toggle-bypass="toggleNoiseBypass"
          @remove="removeNoise"
        >
          <LfoControls
            :lfos="lfosForModule('noise', 0)"
            :target-options="lfoTargetOptions('noise', 0)"
            id-prefix="noise"
            @update="updateLfo($event.index, $event.settings)"
            @toggle-bypass="toggleLfoBypass"
            @remove="removeLfo"
            @add="addLfo('noise', 0)"
          />
          <EnvelopeControls
            :envelopes="envelopesFor(noiseEnvelopeDestinations)"
            :destination-options="noiseEnvelopeDestinations"
            id-prefix="noise"
            @update="updateEnvelopeSettings($event.index, $event.settings)"
            @toggle-bypass="toggleEnvelopeBypass"
            @remove="removeEnvelope"
            @add="addEnvelope('noiseLevel')"
          />
        </NoiseControls>
      </template>

      <section v-if="!isMasterChannel" class="synth-section oscillators-section" aria-labelledby="modulation-envelopes-heading">
        <h2 id="modulation-envelopes-heading">
          <button
            type="button"
            class="oscillators-toggle"
            :aria-expanded="!areModulationEnvelopesCollapsed"
            aria-controls="modulation-envelopes-content"
            @click="areModulationEnvelopesCollapsed = !areModulationEnvelopesCollapsed"
          >
            Modulation Envelopes
          </button>
        </h2>
        <div v-show="!areModulationEnvelopesCollapsed" id="modulation-envelopes-content" class="oscillators-content">
          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Filter</h3>
            </div>
            <EnvelopeControls
              :envelopes="envelopesFor(filterEnvelopeDestinations)"
              :destination-options="filterEnvelopeDestinations"
              id-prefix="filter"
              @update="updateEnvelopeSettings($event.index, $event.settings)"
              @toggle-bypass="toggleEnvelopeBypass"
              @remove="removeEnvelope"
              @add="addEnvelope('filterCutoff')"
            />
          </div>

          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Overdrive</h3>
            </div>
            <EnvelopeControls
              :envelopes="envelopesFor(overdriveEnvelopeDestinations)"
              :destination-options="overdriveEnvelopeDestinations"
              id-prefix="overdrive"
              @update="updateEnvelopeSettings($event.index, $event.settings)"
              @toggle-bypass="toggleEnvelopeBypass"
              @remove="removeEnvelope"
              @add="addEnvelope('overdriveDrive')"
            />
          </div>

          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Chorus</h3>
            </div>
            <EnvelopeControls
              :envelopes="envelopesFor(chorusEnvelopeDestinations)"
              :destination-options="chorusEnvelopeDestinations"
              id-prefix="chorus"
              @update="updateEnvelopeSettings($event.index, $event.settings)"
              @toggle-bypass="toggleEnvelopeBypass"
              @remove="removeEnvelope"
              @add="addEnvelope('chorusRate')"
            />
          </div>

          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Flanger</h3>
            </div>
            <EnvelopeControls
              :envelopes="envelopesFor(flangerEnvelopeDestinations)"
              :destination-options="flangerEnvelopeDestinations"
              id-prefix="flanger"
              @update="updateEnvelopeSettings($event.index, $event.settings)"
              @toggle-bypass="toggleEnvelopeBypass"
              @remove="removeEnvelope"
              @add="addEnvelope('flangerRate')"
            />
          </div>

          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Tremolo</h3>
            </div>
            <EnvelopeControls
              :envelopes="envelopesFor(tremoloEnvelopeDestinations)"
              :destination-options="tremoloEnvelopeDestinations"
              id-prefix="tremolo"
              @update="updateEnvelopeSettings($event.index, $event.settings)"
              @toggle-bypass="toggleEnvelopeBypass"
              @remove="removeEnvelope"
              @add="addEnvelope('tremoloDepth')"
            />
          </div>

          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Delay</h3>
            </div>
            <EnvelopeControls
              :envelopes="envelopesFor(delayEnvelopeDestinations)"
              :destination-options="delayEnvelopeDestinations"
              id-prefix="delay"
              @update="updateEnvelopeSettings($event.index, $event.settings)"
              @toggle-bypass="toggleEnvelopeBypass"
              @remove="removeEnvelope"
              @add="addEnvelope('delayTime')"
            />
          </div>

          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Reverb</h3>
            </div>
            <EnvelopeControls
              :envelopes="envelopesFor(reverbEnvelopeDestinations)"
              :destination-options="reverbEnvelopeDestinations"
              id-prefix="reverb"
              @update="updateEnvelopeSettings($event.index, $event.settings)"
              @toggle-bypass="toggleEnvelopeBypass"
              @remove="removeEnvelope"
              @add="addEnvelope('reverbMix')"
            />
          </div>
        </div>
      </section>

      <section class="synth-section module-chain-section" aria-labelledby="module-chain-heading">
        <div class="module-chain-heading">
          <h2 id="module-chain-heading">Module Chain</h2>
          <button type="button" class="add-module-button" @click="openAddModuleDialog">+ Add Module</button>
        </div>
        <p v-if="moduleOrder.length === 0" class="module-chain-empty">No modules yet. Use “Add Module” to build the signal chain.</p>
        <div v-else class="effect-chain">
          <template v-for="entry in moduleOrder" :key="`${entry.type}:${entry.index}`">
            <template v-if="entry.type === 'filters' && filters[entry.index]">
              <FilterControls
                :filter-index="entry.index"
                v-bind="filters[entry.index]"
                :can-move-up="canMoveModule('filters', entry.index, -1)"
                :can-move-down="canMoveModule('filters', entry.index, 1)"
                @update:type="updateFilterSettings(entry.index, { type: $event })"
                @update:cutoff="updateFilterSettings(entry.index, { cutoff: $event })"
                @update:resonance="updateFilterSettings(entry.index, { resonance: $event })"
                @update:gain="updateFilterSettings(entry.index, { gain: $event })"
                @toggle-bypass="toggleFilterBypass(entry.index)"
                @move-up="moveModule('filters', entry.index, -1)"
                @move-down="moveModule('filters', entry.index, 1)"
                @remove="removeFilter(entry.index)"
              />
              <LfoControls
                :lfos="lfosForModule('filter', entry.index)"
                :target-options="lfoTargetOptions('filter', entry.index)"
                :id-prefix="`filter-${entry.index}`"
                @update="updateLfo($event.index, $event.settings)"
                @toggle-bypass="toggleLfoBypass"
                @remove="removeLfo"
                @add="addLfo('filter', entry.index)"
              />
              <EnvelopeControls :envelopes="envelopesFor(filterEnvelopeDestinations)" :destination-options="filterEnvelopeDestinations" :id-prefix="`filter-${entry.index}`" @update="updateEnvelopeSettings($event.index, $event.settings)" @toggle-bypass="toggleEnvelopeBypass" @remove="removeEnvelope" @add="addEnvelope('filterCutoff')" />
            </template>

            <template v-else-if="entry.type === 'eqs' && eqs[entry.index]">
              <EqControls
                :eq-index="entry.index"
                v-bind="eqs[entry.index]"
                :can-move-up="canMoveModule('eqs', entry.index, -1)"
                :can-move-down="canMoveModule('eqs', entry.index, 1)"
                @update:band="updateEqBandSettings(entry.index, $event.index, $event.changes)"
                @toggle-bypass="toggleEqBypass(entry.index)"
                @toggle-band-bypass="toggleEqBandBypass(entry.index, $event)"
                @add-band="addEqBand(entry.index)"
                @remove-band="removeEqBand(entry.index, $event)"
                @move-up="moveModule('eqs', entry.index, -1)"
                @move-down="moveModule('eqs', entry.index, 1)"
                @remove="removeEq(entry.index)"
              />
              <EnvelopeControls
                :envelopes="eqEnvelopes(entry.index)"
                :destination-options="eqModulationTargetOptions(entry.index)"
                :id-prefix="`eq-${entry.index}`"
                @update="updateEqEnvelopeFromControls(entry.index, $event.index, $event.settings)"
                @toggle-bypass="toggleEqEnvelopeBypass(entry.index, $event)"
                @remove="removeEqEnvelope(entry.index, $event)"
                @add="addEqEnvelope(entry.index)"
              />
              <LfoControls
                :lfos="eqLfos(entry.index)"
                :target-options="eqModulationTargetOptions(entry.index)"
                :id-prefix="`eq-${entry.index}`"
                @update="updateEqLfoFromControls(entry.index, $event.index, $event.settings)"
                @toggle-bypass="toggleEqLfoBypass(entry.index, $event)"
                @remove="removeEqLfo(entry.index, $event)"
                @add="addEqLfo(entry.index)"
              />
            </template>

            <template v-else-if="entry.type === 'overdrives' && overdrives[entry.index]">
              <OverdriveControls
                :overdrive-index="entry.index"
                v-bind="overdrives[entry.index]"
                :can-move-up="canMoveModule('overdrives', entry.index, -1)"
                :can-move-down="canMoveModule('overdrives', entry.index, 1)"
                @update:drive="updateOverdriveSettings(entry.index, { drive: $event })"
                @update:tone="updateOverdriveSettings(entry.index, { tone: $event })"
                @update:feedback="updateOverdriveSettings(entry.index, { feedback: $event })"
                @update:mix="updateOverdriveSettings(entry.index, { mix: $event })"
                @toggle-bypass="toggleOverdriveBypass(entry.index)"
                @move-up="moveModule('overdrives', entry.index, -1)"
                @move-down="moveModule('overdrives', entry.index, 1)"
                @remove="removeOverdrive(entry.index)"
              />
              <LfoControls
                :lfos="lfosForModule('overdrive', entry.index)"
                :target-options="lfoTargetOptions('overdrive', entry.index)"
                :id-prefix="`overdrive-${entry.index}`"
                @update="updateLfo($event.index, $event.settings)"
                @toggle-bypass="toggleLfoBypass"
                @remove="removeLfo"
                @add="addLfo('overdrive', entry.index)"
              />
              <EnvelopeControls :envelopes="envelopesFor(overdriveEnvelopeDestinations)" :destination-options="overdriveEnvelopeDestinations" :id-prefix="`overdrive-${entry.index}`" @update="updateEnvelopeSettings($event.index, $event.settings)" @toggle-bypass="toggleEnvelopeBypass" @remove="removeEnvelope" @add="addEnvelope('overdriveDrive')" />
            </template>

            <template v-else-if="entry.type === 'choruses' && choruses[entry.index]">
              <ChorusControls
                :chorus-index="entry.index"
                v-bind="choruses[entry.index]"
                :can-move-up="canMoveModule('choruses', entry.index, -1)"
                :can-move-down="canMoveModule('choruses', entry.index, 1)"
                @update:waveform="updateChorusSettings(entry.index, { waveform: $event })"
                @update:rate="updateChorusSettings(entry.index, { rate: $event })"
                @update:depth="updateChorusSettings(entry.index, { depth: $event })"
                @update:delay="updateChorusSettings(entry.index, { delay: $event })"
                @update:mix="updateChorusSettings(entry.index, { mix: $event })"
                @toggle-bypass="toggleChorusBypass(entry.index)"
                @move-up="moveModule('choruses', entry.index, -1)"
                @move-down="moveModule('choruses', entry.index, 1)"
                @remove="removeChorus(entry.index)"
              />
              <LfoControls
                :lfos="lfosForModule('chorus', entry.index)"
                :target-options="lfoTargetOptions('chorus', entry.index)"
                :id-prefix="`chorus-${entry.index}`"
                @update="updateLfo($event.index, $event.settings)"
                @toggle-bypass="toggleLfoBypass"
                @remove="removeLfo"
                @add="addLfo('chorus', entry.index)"
              />
              <EnvelopeControls :envelopes="envelopesFor(chorusEnvelopeDestinations)" :destination-options="chorusEnvelopeDestinations" :id-prefix="`chorus-${entry.index}`" @update="updateEnvelopeSettings($event.index, $event.settings)" @toggle-bypass="toggleEnvelopeBypass" @remove="removeEnvelope" @add="addEnvelope('chorusRate')" />
            </template>

            <template v-else-if="entry.type === 'flangers' && flangers[entry.index]">
              <FlangerControls
                :flanger-index="entry.index"
                v-bind="flangers[entry.index]"
                :can-move-up="canMoveModule('flangers', entry.index, -1)"
                :can-move-down="canMoveModule('flangers', entry.index, 1)"
                @update:waveform="updateFlangerSettings(entry.index, { waveform: $event })"
                @update:rate="updateFlangerSettings(entry.index, { rate: $event })"
                @update:depth="updateFlangerSettings(entry.index, { depth: $event })"
                @update:delay="updateFlangerSettings(entry.index, { delay: $event })"
                @update:feedback="updateFlangerSettings(entry.index, { feedback: $event })"
                @update:mix="updateFlangerSettings(entry.index, { mix: $event })"
                @toggle-bypass="toggleFlangerBypass(entry.index)"
                @move-up="moveModule('flangers', entry.index, -1)"
                @move-down="moveModule('flangers', entry.index, 1)"
                @remove="removeFlanger(entry.index)"
              />
              <LfoControls
                :lfos="lfosForModule('flanger', entry.index)"
                :target-options="lfoTargetOptions('flanger', entry.index)"
                :id-prefix="`flanger-${entry.index}`"
                @update="updateLfo($event.index, $event.settings)"
                @toggle-bypass="toggleLfoBypass"
                @remove="removeLfo"
                @add="addLfo('flanger', entry.index)"
              />
              <EnvelopeControls :envelopes="envelopesFor(flangerEnvelopeDestinations)" :destination-options="flangerEnvelopeDestinations" :id-prefix="`flanger-${entry.index}`" @update="updateEnvelopeSettings($event.index, $event.settings)" @toggle-bypass="toggleEnvelopeBypass" @remove="removeEnvelope" @add="addEnvelope('flangerRate')" />
            </template>

            <template v-else-if="entry.type === 'tremolos' && tremolos[entry.index]">
              <TremoloControls
                :tremolo-index="entry.index"
                v-bind="tremolos[entry.index]"
                :can-move-up="canMoveModule('tremolos', entry.index, -1)"
                :can-move-down="canMoveModule('tremolos', entry.index, 1)"
                @update:waveform="updateTremoloSettings(entry.index, { waveform: $event })"
                @update:rate="updateTremoloSettings(entry.index, { rate: $event })"
                @update:depth="updateTremoloSettings(entry.index, { depth: $event })"
                @update:mix="updateTremoloSettings(entry.index, { mix: $event })"
                @toggle-bypass="toggleTremoloBypass(entry.index)"
                @move-up="moveModule('tremolos', entry.index, -1)"
                @move-down="moveModule('tremolos', entry.index, 1)"
                @remove="removeTremolo(entry.index)"
              />
              <LfoControls
                :lfos="lfosForModule('tremolo', entry.index)"
                :target-options="lfoTargetOptions('tremolo', entry.index)"
                :id-prefix="`tremolo-${entry.index}`"
                @update="updateLfo($event.index, $event.settings)"
                @toggle-bypass="toggleLfoBypass"
                @remove="removeLfo"
                @add="addLfo('tremolo', entry.index)"
              />
              <EnvelopeControls :envelopes="envelopesFor(tremoloEnvelopeDestinations)" :destination-options="tremoloEnvelopeDestinations" :id-prefix="`tremolo-${entry.index}`" @update="updateEnvelopeSettings($event.index, $event.settings)" @toggle-bypass="toggleEnvelopeBypass" @remove="removeEnvelope" @add="addEnvelope('tremoloRate')" />
            </template>

            <template v-else-if="entry.type === 'delays' && delays[entry.index]">
              <DelayControls
                :delay-index="entry.index"
                v-bind="delays[entry.index]"
                :can-move-up="canMoveModule('delays', entry.index, -1)"
                :can-move-down="canMoveModule('delays', entry.index, 1)"
                @update:note-time="updateDelaySettings(entry.index, { noteTime: $event })"
                @update:feedback="updateDelaySettings(entry.index, { feedback: $event })"
                @update:resonance="updateDelaySettings(entry.index, { resonance: $event })"
                @update:mix="updateDelaySettings(entry.index, { mix: $event })"
                @update:overdrive="updateDelaySettings(entry.index, { overdrive: $event })"
                @toggle-bypass="toggleDelayBypass(entry.index)"
                @move-up="moveModule('delays', entry.index, -1)"
                @move-down="moveModule('delays', entry.index, 1)"
                @remove="removeDelay(entry.index)"
              />
              <LfoControls
                :lfos="lfosForModule('delay', entry.index)"
                :target-options="lfoTargetOptions('delay', entry.index)"
                :id-prefix="`delay-${entry.index}`"
                @update="updateLfo($event.index, $event.settings)"
                @toggle-bypass="toggleLfoBypass"
                @remove="removeLfo"
                @add="addLfo('delay', entry.index)"
              />
              <EnvelopeControls
                :envelopes="envelopesFor(delayEnvelopeDestinations)"
                :destination-options="delayEnvelopeDestinations"
                :id-prefix="`delay-${entry.index}`"
                @update="updateEnvelopeSettings($event.index, $event.settings)"
                @toggle-bypass="toggleEnvelopeBypass"
                @remove="removeEnvelope"
                @add="addEnvelope('delayTime')"
              />
            </template>

            <template v-else-if="entry.type === 'reverbs' && reverbs[entry.index]">
              <ReverbControls
                :reverb-index="entry.index"
                v-bind="reverbs[entry.index]"
                :can-move-up="canMoveModule('reverbs', entry.index, -1)"
                :can-move-down="canMoveModule('reverbs', entry.index, 1)"
                @update:hall-type="updateReverbSettings(entry.index, { hallType: $event })"
                @update:decay="updateReverbSettings(entry.index, { decay: $event })"
                @update:pre-delay="updateReverbSettings(entry.index, { preDelay: $event })"
                @update:damping="updateReverbSettings(entry.index, { damping: $event })"
                @update:width="updateReverbSettings(entry.index, { width: $event })"
                @update:mix="updateReverbSettings(entry.index, { mix: $event })"
                @toggle-bypass="toggleReverbBypass(entry.index)"
                @move-up="moveModule('reverbs', entry.index, -1)"
                @move-down="moveModule('reverbs', entry.index, 1)"
                @remove="removeReverb(entry.index)"
              />
              <LfoControls
                :lfos="lfosForModule('reverb', entry.index)"
                :target-options="lfoTargetOptions('reverb', entry.index)"
                :id-prefix="`reverb-${entry.index}`"
                @update="updateLfo($event.index, $event.settings)"
                @toggle-bypass="toggleLfoBypass"
                @remove="removeLfo"
                @add="addLfo('reverb', entry.index)"
              />
              <EnvelopeControls :envelopes="envelopesFor(reverbEnvelopeDestinations)" :destination-options="reverbEnvelopeDestinations" :id-prefix="`reverb-${entry.index}`" @update="updateEnvelopeSettings($event.index, $event.settings)" @toggle-bypass="toggleEnvelopeBypass" @remove="removeEnvelope" @add="addEnvelope('reverbDecay')" />
            </template>

            <template v-else-if="entry.type === 'dynamics' && dynamics[entry.index]">
              <template v-for="dynamicsItem in [dynamics[entry.index]]" :key="entry.index">
                <CompressorControls
                  v-if="dynamicsItem.type === 'compressor'"
                  :dynamics-index="entry.index"
                  v-bind="dynamicsItem"
                  :can-move-up="canMoveModule('dynamics', entry.index, -1)"
                  :can-move-down="canMoveModule('dynamics', entry.index, 1)"
                  @update:threshold="updateDynamicsSettings(entry.index, { threshold: $event })"
                  @update:knee="updateDynamicsSettings(entry.index, { knee: $event })"
                  @update:ratio="updateDynamicsSettings(entry.index, { ratio: $event })"
                  @update:attack="updateDynamicsSettings(entry.index, { attack: $event })"
                  @update:release="updateDynamicsSettings(entry.index, { release: $event })"
                  @update:makeup-gain="updateDynamicsSettings(entry.index, { makeupGain: $event })"
                  @toggle-bypass="toggleDynamicsBypass(entry.index)"
                  @move-up="moveModule('dynamics', entry.index, -1)"
                  @move-down="moveModule('dynamics', entry.index, 1)"
                  @remove="removeDynamics(entry.index)"
                />
                <GateControls
                  v-else-if="dynamicsItem.type === 'gate'"
                  :dynamics-index="entry.index"
                  v-bind="dynamicsItem"
                  :can-move-up="canMoveModule('dynamics', entry.index, -1)"
                  :can-move-down="canMoveModule('dynamics', entry.index, 1)"
                  @update:threshold="updateDynamicsSettings(entry.index, { threshold: $event })"
                  @update:attack="updateDynamicsSettings(entry.index, { attack: $event })"
                  @update:hold="updateDynamicsSettings(entry.index, { hold: $event })"
                  @update:release="updateDynamicsSettings(entry.index, { release: $event })"
                  @toggle-bypass="toggleDynamicsBypass(entry.index)"
                  @move-up="moveModule('dynamics', entry.index, -1)"
                  @move-down="moveModule('dynamics', entry.index, 1)"
                  @remove="removeDynamics(entry.index)"
                />
                <LimiterControls
                  v-else-if="dynamicsItem.type === 'limiter'"
                  :dynamics-index="entry.index"
                  v-bind="dynamicsItem"
                  :can-move-up="canMoveModule('dynamics', entry.index, -1)"
                  :can-move-down="canMoveModule('dynamics', entry.index, 1)"
                  @update:ceiling="updateDynamicsSettings(entry.index, { ceiling: $event })"
                  @update:release="updateDynamicsSettings(entry.index, { release: $event })"
                  @update:makeup-gain="updateDynamicsSettings(entry.index, { makeupGain: $event })"
                  @toggle-bypass="toggleDynamicsBypass(entry.index)"
                  @move-up="moveModule('dynamics', entry.index, -1)"
                  @move-down="moveModule('dynamics', entry.index, 1)"
                  @remove="removeDynamics(entry.index)"
                />
              </template>
            </template>

            <SectionFrame
              v-else-if="entry.type === 'amplitudeModulation' && amplitudeModulation"
              class="synth-section modulation-section"
              title="Amplitude modulation"
              heading-id="am-heading"
              content-id="am-content"
              :bypassed="isAmplitudeModulationBypassed"
              :can-move-up="canMoveModule('amplitudeModulation', 0, -1)"
              :can-move-down="canMoveModule('amplitudeModulation', 0, 1)"
              @toggle-bypass="toggleAmplitudeModulationBypass"
              @move-up="moveModule('amplitudeModulation', 0, -1)"
              @move-down="moveModule('amplitudeModulation', 0, 1)"
              @remove="removeAmplitudeModulation"
            >
              <div class="modulation-controls">
                <label class="control">
                  <span>Wave</span>
                  <select :value="amplitudeModulation.waveform" @change="updateAmplitudeModulation({ waveform: ($event.target as HTMLSelectElement).value as Waveform })">
                    <option value="sine">Sine</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="square">Square</option>
                    <option value="random">Random</option>
                  </select>
                </label>
                <label class="control">
                  <span>Rate</span>
                  <output>{{ amplitudeModulation.rate }} Hz</output>
                  <input type="range" min="1" max="30" step="1" :value="amplitudeModulation.rate" @input="updateAmplitudeModulation({ rate: Number(($event.target as HTMLInputElement).value) })">
                </label>
                <label class="control">
                  <span>Depth</span>
                  <output>{{ Math.round(amplitudeModulation.depth * 100) }}%</output>
                  <input type="range" min="0" max="1" step="0.01" :value="amplitudeModulation.depth" @input="updateAmplitudeModulation({ depth: Number(($event.target as HTMLInputElement).value) })">
                </label>
              </div>
            </SectionFrame>
          </template>
        </div>
      </section>

      <dialog ref="addModuleDialog" class="add-module-dialog" aria-labelledby="add-module-heading" @click="($event.target as HTMLElement).closest('.add-module-dialog-content') || closeAddModuleDialog()">
        <div class="add-module-dialog-content">
          <div class="add-module-dialog-heading">
            <h2 id="add-module-heading">Add module</h2>
            <button type="button" class="add-module-dialog-close" aria-label="Close dialog" @click="closeAddModuleDialog">✕</button>
          </div>
          <div class="add-module-categories">
            <section class="add-module-category" aria-labelledby="add-module-filters-heading">
              <h3 id="add-module-filters-heading">Filters</h3>
              <button type="button" @click="addModuleFromDialog(addFilter)">Add Filter</button>
            </section>

            <section class="add-module-category" aria-labelledby="add-module-eq-heading">
              <h3 id="add-module-eq-heading">EQ</h3>
              <button type="button" @click="addModuleFromDialog(addSingleBandEq)">Add EQ</button>
              <button type="button" @click="addModuleFromDialog(addMultibandEq)">Add Parametric EQ</button>
            </section>

            <section class="add-module-category" aria-labelledby="add-module-overdrive-heading">
              <h3 id="add-module-overdrive-heading">Overdrive</h3>
              <button type="button" @click="addModuleFromDialog(addOverdrive)">Add Overdrive</button>
            </section>

            <section class="add-module-category" aria-labelledby="add-module-modulation-fx-heading">
              <h3 id="add-module-modulation-fx-heading">Modulation FX</h3>
              <button type="button" @click="addModuleFromDialog(addChorus)">Add Chorus</button>
              <button type="button" @click="addModuleFromDialog(addFlanger)">Add Flanger</button>
              <button type="button" @click="addModuleFromDialog(addTremolo)">Add Tremolo</button>
            </section>

            <section class="add-module-category" aria-labelledby="add-module-time-heading">
              <h3 id="add-module-time-heading">Time-based</h3>
              <button type="button" @click="addModuleFromDialog(addDelay)">Add Delay</button>
              <button type="button" @click="addModuleFromDialog(addReverb)">Add Reverb</button>
            </section>

            <section class="add-module-category" aria-labelledby="add-module-dynamics-heading">
              <h3 id="add-module-dynamics-heading">Dynamics</h3>
              <button type="button" @click="addModuleFromDialog(addCompressor)">Add Compressor</button>
              <button type="button" @click="addModuleFromDialog(addGate)">Add Gate</button>
              <button type="button" @click="addModuleFromDialog(addLimiter)">Add Limiter</button>
            </section>

            <section v-if="!isMasterChannel && !amplitudeModulation" class="add-module-category" aria-labelledby="add-module-am-heading">
              <h3 id="add-module-am-heading">Modulation</h3>
              <button type="button" @click="addModuleFromDialog(addAmplitudeModulation)">Add Amplitude Modulation</button>
            </section>
          </div>
        </div>
      </dialog>

      <div class="audio-bar">
        <button type="button" class="audio-button" @click="handleEnableAudio">Audio</button>
        <span class="status" aria-live="polite">{{ audioStatus }}</span>
      </div>

      <section class="midi-controls" aria-labelledby="midi-heading">
        <div class="section-heading">
          <h2 id="midi-heading">MIDI</h2>
          <button type="button" class="connect-button" @click="handleConnectMidi">Connect</button>
        </div>
        <div class="midi-fields">
          <label class="field">
            <span>Input</span>
            <select v-model="selectedInputId" :disabled="!canSelectInput" @change="handleInputChange">
              <option value="" disabled>Select input</option>
              <option v-for="input in midiInputs" :key="input.id" :value="input.id">
                {{ input.name }}
              </option>
            </select>
          </label>

          <label class="field channel-field">
            <span>Ch</span>
            <select :value="selectedChannel" @change="handleChannelChange">
              <option :value="0">Master</option>
              <option v-for="channel in channels.length" :key="channel" :value="channel">
                {{ channel }}
              </option>
            </select>
          </label>
        </div>
        <span class="status midi-status" aria-live="polite">{{ midiStatus }}</span>
      </section>

      <section class="seed-panel" aria-label="Setup seed">
        <div class="seed-panel-content">
          <label class="seed-field">
            <span>Setup seed</span>
            <input v-model="seedInput" spellcheck="false" autocomplete="off" aria-label="Setup seed">
          </label>
          <div class="seed-actions">
            <button type="button" @click="generateSeed">Generate</button>
            <button type="button" :disabled="!seedInput" @click="copySeed">Copy</button>
            <button type="button" :disabled="!seedInput" @click="loadSeed">Load</button>
          </div>
          <span class="seed-status" aria-live="polite">{{ seedStatus }}</span>
        </div>
      </section>
    </section>
  </main>
</template>
