<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { instrumentCategories, instrumentPresets, type InstrumentPreset } from './instruments'
import { MidiService } from './services/midiService'
import { decodeSeed, encodeSeed } from './services/seedService'
import { createChorusSettings, createDelaySettings, createEnvelopeSettings, createEqBandSettings, createFilterSettings, createFlangerSettings, createMultibandEqSettings, createNoiseSettings, createOutputSettings, createOverdriveSettings, createReverbSettings, createCompressorSettings, createGateSettings, createLimiterSettings, createOscillatorSettings, createSingleBandEqSettings, createTremoloSettings, type AmplitudeModulationSettings, type ChorusSettings, type DelaySettings, type DynamicsSettings, type DynamicsSettingsChanges, type EqBandSettings, type EqEnvelopeSettings, type EqLfoSettings, type EqModulationTarget, type EqParameter, type EqSettings, type EffectGroup, type EnvelopeDestination, type EnvelopeSettings, type FilterSettings, type FlangerSettings, type LfoSettings, type NoiseSettings, type OscillatorSettings, type OutputSettings, type OverdriveSettings, type ReverbSettings, type TremoloSettings, type Waveform, SynthEngine } from './services/synthEngine'
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
type SynthSetup = Omit<InstrumentPreset, 'id' | 'name' | 'category'>
type SeedChannel = Omit<SynthSetup, 'eqs' | 'choruses' | 'flangers' | 'tremolos'> & { eqs?: EqSettings[]; choruses?: ChorusSettings[]; flangers?: FlangerSettings[]; tremolos?: TremoloSettings[]; selectedInstrumentId: string }
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
  effectOrder: EffectGroup[]
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
const effectOrder = ref<EffectGroup[]>([...effectGroups])
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
  effectOrder: [...effectGroups],
  isAmplitudeModulationBypassed: false,
  selectedInstrumentId: '',
}
const isMasterChannel = computed(() => selectedChannel.value === 0)
const areOscillatorsCollapsed = ref(false)
const areFiltersCollapsed = ref(true)
const areDynamicsCollapsed = ref(true)
const areDelaysCollapsed = ref(true)
const areOverdrivesCollapsed = ref(true)
const areEffectsCollapsed = ref(true)
const areReverbsCollapsed = ref(true)
const areEqsCollapsed = ref(true)
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
  channel.effectOrder = effectOrder.value
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
  effectOrder.value = channel.effectOrder
  isAmplitudeModulationBypassed.value = channel.isAmplitudeModulationBypassed
  selectedInstrumentId.value = channel.selectedInstrumentId
  activeVoices.value = activeSynth.getActiveVoiceCount()
  syncEffectCollapseStates()
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
    effectOrder: [...effectGroups],
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
  effectOrder: effectOrder.value,
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
    synth.setEffectOrder(normalizeEffectOrder(setup.effectOrder))
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

  const previousSynth = activeSynth
  const synth = createSynthFromSetup(preset)
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
  effectOrder.value = normalizeEffectOrder(preset.effectOrder)
  isAmplitudeModulationBypassed.value = preset.isAmplitudeModulationBypassed
  selectedInstrumentId.value = preset.id
  syncEffectCollapseStates()
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
    effectOrder: channel.effectOrder,
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
    && isEffectOrder(value.effectOrder)
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
  const effectOrder = normalizeEffectOrder(seedChannel.effectOrder)
  const synth = createSynthFromSetup({ ...seedChannel, eqs, choruses, flangers, tremolos, effectOrder })

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
    effectOrder,
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

function settingsEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => settingsEqual(value, right[index]))
  }

  const leftSettings = left as Record<string, unknown>
  const rightSettings = right as Record<string, unknown>
  const leftKeys = Object.keys(leftSettings)
  const rightKeys = Object.keys(rightSettings)
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => key in rightSettings && settingsEqual(leftSettings[key], rightSettings[key]))
}

function containsChangedSettings<T>(settings: readonly T[], createDefaults: () => T): boolean {
  return settings.some((setting) => !settingsEqual(setting, createDefaults()))
}

function syncEffectCollapseStates() {
  areFiltersCollapsed.value = !containsChangedSettings(filters.value, createFilterSettings)
  areOverdrivesCollapsed.value = !containsChangedSettings(overdrives.value, createOverdriveSettings)
  areEffectsCollapsed.value = !(
    containsChangedSettings(choruses.value, createChorusSettings)
    || containsChangedSettings(flangers.value, createFlangerSettings)
    || containsChangedSettings(tremolos.value, createTremoloSettings)
  )
  areDelaysCollapsed.value = !containsChangedSettings(delays.value, createDelaySettings)
  areReverbsCollapsed.value = !containsChangedSettings(reverbs.value, createReverbSettings)
  areEqsCollapsed.value = !eqs.value.some((eq) => !settingsEqual(eq, eq.kind === 'single' ? createSingleBandEqSettings() : createMultibandEqSettings()))
  areDynamicsCollapsed.value = !dynamics.value.some((dynamicsSettings) => {
    const defaults = dynamicsSettings.type === 'compressor'
      ? createCompressorSettings()
      : dynamicsSettings.type === 'gate' ? createGateSettings() : createLimiterSettings()
    return !settingsEqual(dynamicsSettings, defaults)
  })
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
}

function removeFilter(index: number) {
  removeLfosForModule('filter', index)
  activeSynth.removeFilter(index)
  filters.value.splice(index, 1)
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
}

function removeDelay(index: number) {
  removeLfosForModule('delay', index)
  activeSynth.removeDelay(index)
  delays.value.splice(index, 1)
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
}

function removeOverdrive(index: number) {
  removeLfosForModule('overdrive', index)
  activeSynth.removeOverdrive(index)
  overdrives.value.splice(index, 1)
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

function moveOverdrive(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (!overdrives.value[targetIndex]) return
  ;[overdrives.value[index], overdrives.value[targetIndex]] = [overdrives.value[targetIndex], overdrives.value[index]]
  activeSynth.moveOverdrive(index, direction)
  const sourcePrefix = `overdrive:${index}:`
  const targetPrefix = `overdrive:${targetIndex}:`
  lfos.value.forEach((lfo, lfoIndex) => {
    if (lfo.target.startsWith(sourcePrefix)) updateLfo(lfoIndex, { target: lfo.target.replace(sourcePrefix, targetPrefix) as LfoSettings['target'] })
    else if (lfo.target.startsWith(targetPrefix)) updateLfo(lfoIndex, { target: lfo.target.replace(targetPrefix, sourcePrefix) as LfoSettings['target'] })
  })
}

function addChorus() {
  const settings = createChorusSettings()
  choruses.value.push(settings)
  activeSynth.addChorus(settings)
}

function removeChorus(index: number) {
  removeLfosForModule('chorus', index)
  activeSynth.removeChorus(index)
  choruses.value.splice(index, 1)
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

function moveChorus(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (!choruses.value[targetIndex]) return
  ;[choruses.value[index], choruses.value[targetIndex]] = [choruses.value[targetIndex], choruses.value[index]]
  activeSynth.moveChorus(index, direction)
  reindexLfosForMove('chorus', index, targetIndex)
}

function addFlanger() {
  const settings = createFlangerSettings()
  flangers.value.push(settings)
  activeSynth.addFlanger(settings)
}

function removeFlanger(index: number) {
  removeLfosForModule('flanger', index)
  activeSynth.removeFlanger(index)
  flangers.value.splice(index, 1)
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

function moveFlanger(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (!flangers.value[targetIndex]) return
  ;[flangers.value[index], flangers.value[targetIndex]] = [flangers.value[targetIndex], flangers.value[index]]
  activeSynth.moveFlanger(index, direction)
  reindexLfosForMove('flanger', index, targetIndex)
}

function addTremolo() {
  const settings = createTremoloSettings()
  tremolos.value.push(settings)
  activeSynth.addTremolo(settings)
}

function removeTremolo(index: number) {
  removeLfosForModule('tremolo', index)
  activeSynth.removeTremolo(index)
  tremolos.value.splice(index, 1)
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

function moveTremolo(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (!tremolos.value[targetIndex]) return
  ;[tremolos.value[index], tremolos.value[targetIndex]] = [tremolos.value[targetIndex], tremolos.value[index]]
  activeSynth.moveTremolo(index, direction)
  reindexLfosForMove('tremolo', index, targetIndex)
}

function addSingleBandEq() {
  const settings = createSingleBandEqSettings()
  eqs.value.push(settings)
  activeSynth.addEq(settings)
}

function addMultibandEq() {
  const settings = createMultibandEqSettings()
  eqs.value.push(settings)
  activeSynth.addEq(settings)
}

function removeEq(index: number) {
  activeSynth.removeEq(index)
  eqs.value = eqs.value.filter((_, eqIndex) => eqIndex !== index).map(reindexEqModulationTargets)
}

function toggleEqBypass(index: number) {
  const bypassed = !eqs.value[index].bypassed
  eqs.value[index] = { ...eqs.value[index], bypassed }
  activeSynth.setEqBypassed(index, bypassed)
}

function moveEq(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (!eqs.value[targetIndex]) return
  ;[eqs.value[index], eqs.value[targetIndex]] = [eqs.value[targetIndex], eqs.value[index]]
  eqs.value = eqs.value.map(reindexEqModulationTargets)
  activeSynth.moveEq(index, direction)
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
}

function removeReverb(index: number) {
  removeLfosForModule('reverb', index)
  activeSynth.removeReverb(index)
  reverbs.value.splice(index, 1)
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
}

function addGate() {
  const settings = createGateSettings()
  dynamics.value.push(settings)
  activeSynth.addGate(settings)
}

function addLimiter() {
  const settings = createLimiterSettings()
  dynamics.value.push(settings)
  activeSynth.addLimiter(settings)
}

function updateDynamicsSettings(index: number, settings: DynamicsSettingsChanges) {
  dynamics.value[index] = { ...dynamics.value[index], ...settings } as DynamicsSettings
  activeSynth.setDynamicsSettings(index, settings)
}

function removeDynamics(index: number) {
  activeSynth.removeDynamics(index)
  dynamics.value.splice(index, 1)
}

function toggleDynamicsBypass(index: number) {
  const bypassed = !dynamics.value[index].bypassed
  dynamics.value[index] = { ...dynamics.value[index], bypassed } as DynamicsSettings
  activeSynth.setDynamicsBypassed(index, bypassed)
}

function moveDynamics(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (!dynamics.value[targetIndex]) return
  ;[dynamics.value[index], dynamics.value[targetIndex]] = [dynamics.value[targetIndex], dynamics.value[index]]
  activeSynth.moveDynamics(index, direction)
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

function moveEffectGroup(group: EffectGroup, direction: -1 | 1) {
  const index = effectOrder.value.indexOf(group)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= effectOrder.value.length) return
  const nextOrder = [...effectOrder.value]
  ;[nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]]
  effectOrder.value = nextOrder
  activeSynth.setEffectOrder(nextOrder)
}

function canMoveEffectGroup(group: EffectGroup, direction: -1 | 1) {
  const index = effectOrder.value.indexOf(group)
  return index + direction >= 0 && index + direction < effectOrder.value.length
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

function reindexLfosForMove(module: string, index: number, targetIndex: number) {
  const sourcePrefix = `${module}:${index}:`
  const targetPrefix = `${module}:${targetIndex}:`
  lfos.value.forEach((lfo, lfoIndex) => {
    if (lfo.target.startsWith(sourcePrefix)) updateLfo(lfoIndex, { target: lfo.target.replace(sourcePrefix, targetPrefix) as LfoSettings['target'] })
    else if (lfo.target.startsWith(targetPrefix)) updateLfo(lfoIndex, { target: lfo.target.replace(targetPrefix, sourcePrefix) as LfoSettings['target'] })
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

      <div class="effect-chain">
      <section class="synth-section oscillators-section effect-group" :style="{ order: effectOrder.indexOf('filters') }" aria-labelledby="filters-heading">
        <h2 id="filters-heading">
          <button
            type="button"
            class="oscillators-toggle"
            :aria-expanded="!areFiltersCollapsed"
            aria-controls="filters-content"
            @click="areFiltersCollapsed = !areFiltersCollapsed"
          >
            Filters
          </button>
          <span class="effect-order-actions">
            <button type="button" :disabled="!canMoveEffectGroup('filters', -1)" aria-label="Move Filters up" @click="moveEffectGroup('filters', -1)">↑</button>
            <button type="button" :disabled="!canMoveEffectGroup('filters', 1)" aria-label="Move Filters down" @click="moveEffectGroup('filters', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areFiltersCollapsed" id="filters-content" class="oscillators-content">
          <template v-for="(filter, index) in filters" :key="index">
          <FilterControls
            :filter-index="index"
            v-bind="filter"
            @update:type="updateFilterSettings(index, { type: $event })"
            @update:cutoff="updateFilterSettings(index, { cutoff: $event })"
            @update:resonance="updateFilterSettings(index, { resonance: $event })"
            @update:gain="updateFilterSettings(index, { gain: $event })"
            @toggle-bypass="toggleFilterBypass(index)"
            @remove="removeFilter(index)"
          />
          <LfoControls
            :lfos="lfosForModule('filter', index)"
            :target-options="lfoTargetOptions('filter', index)"
            :id-prefix="`filter-${index}`"
            @update="updateLfo($event.index, $event.settings)"
            @toggle-bypass="toggleLfoBypass"
            @remove="removeLfo"
            @add="addLfo('filter', index)"
          />
          </template>
          <button type="button" class="add-filter-button" @click="addFilter">Add Filter</button>
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
      </section>

      <section class="synth-section oscillators-section effect-group" :style="{ order: effectOrder.indexOf('eqs') }" aria-labelledby="eqs-heading">
        <h2 id="eqs-heading">
          <button
            type="button"
            class="oscillators-toggle"
            :aria-expanded="!areEqsCollapsed"
            aria-controls="eqs-content"
            @click="areEqsCollapsed = !areEqsCollapsed"
          >
            EQ
          </button>
          <span class="effect-order-actions">
            <button type="button" :disabled="!canMoveEffectGroup('eqs', -1)" aria-label="Move EQ up" @click="moveEffectGroup('eqs', -1)">↑</button>
            <button type="button" :disabled="!canMoveEffectGroup('eqs', 1)" aria-label="Move EQ down" @click="moveEffectGroup('eqs', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areEqsCollapsed" id="eqs-content" class="oscillators-content">
          <template v-for="(eq, index) in eqs" :key="index">
            <EqControls
              :eq-index="index"
              :eq-count="eqs.length"
              v-bind="eq"
              @update:band="updateEqBandSettings(index, $event.index, $event.changes)"
              @toggle-bypass="toggleEqBypass(index)"
              @toggle-band-bypass="toggleEqBandBypass(index, $event)"
              @add-band="addEqBand(index)"
              @remove-band="removeEqBand(index, $event)"
              @move-up="moveEq(index, -1)"
              @move-down="moveEq(index, 1)"
              @remove="removeEq(index)"
            />
            <EnvelopeControls
              :envelopes="eqEnvelopes(index)"
              :destination-options="eqModulationTargetOptions(index)"
              :id-prefix="`eq-${index}`"
              @update="updateEqEnvelopeFromControls(index, $event.index, $event.settings)"
              @toggle-bypass="toggleEqEnvelopeBypass(index, $event)"
              @remove="removeEqEnvelope(index, $event)"
              @add="addEqEnvelope(index)"
            />
            <LfoControls
              :lfos="eqLfos(index)"
              :target-options="eqModulationTargetOptions(index)"
              :id-prefix="`eq-${index}`"
              @update="updateEqLfoFromControls(index, $event.index, $event.settings)"
              @toggle-bypass="toggleEqLfoBypass(index, $event)"
              @remove="removeEqLfo(index, $event)"
              @add="addEqLfo(index)"
            />
          </template>
          <div class="module-actions">
            <button type="button" class="add-eq-button" @click="addSingleBandEq">Add EQ</button>
            <button type="button" class="add-eq-button" @click="addMultibandEq">Add Parametric EQ</button>
          </div>
        </div>
      </section>

      <section class="synth-section oscillators-section effect-group" :style="{ order: effectOrder.indexOf('overdrives') }" aria-labelledby="overdrives-heading">
        <h2 id="overdrives-heading">
          <button
            type="button"
            class="oscillators-toggle"
            :aria-expanded="!areOverdrivesCollapsed"
            aria-controls="overdrives-content"
            @click="areOverdrivesCollapsed = !areOverdrivesCollapsed"
          >
            Overdrive
          </button>
          <span class="effect-order-actions">
            <button type="button" :disabled="!canMoveEffectGroup('overdrives', -1)" aria-label="Move Overdrive up" @click="moveEffectGroup('overdrives', -1)">↑</button>
            <button type="button" :disabled="!canMoveEffectGroup('overdrives', 1)" aria-label="Move Overdrive down" @click="moveEffectGroup('overdrives', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areOverdrivesCollapsed" id="overdrives-content" class="oscillators-content">
          <template v-for="(overdrive, index) in overdrives" :key="index">
          <OverdriveControls
            :overdrive-index="index"
            :overdrive-count="overdrives.length"
            v-bind="overdrive"
            @update:drive="updateOverdriveSettings(index, { drive: $event })"
            @update:tone="updateOverdriveSettings(index, { tone: $event })"
            @update:feedback="updateOverdriveSettings(index, { feedback: $event })"
            @update:mix="updateOverdriveSettings(index, { mix: $event })"
            @toggle-bypass="toggleOverdriveBypass(index)"
            @move-up="moveOverdrive(index, -1)"
            @move-down="moveOverdrive(index, 1)"
            @remove="removeOverdrive(index)"
          />
          <LfoControls
            :lfos="lfosForModule('overdrive', index)"
            :target-options="lfoTargetOptions('overdrive', index)"
            :id-prefix="`overdrive-${index}`"
            @update="updateLfo($event.index, $event.settings)"
            @toggle-bypass="toggleLfoBypass"
            @remove="removeLfo"
            @add="addLfo('overdrive', index)"
          />
          </template>
          <button type="button" class="add-filter-button" @click="addOverdrive">Add Overdrive</button>
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
      </section>

      <section class="synth-section oscillators-section effect-group" :style="{ order: Math.min(effectOrder.indexOf('choruses'), effectOrder.indexOf('flangers'), effectOrder.indexOf('tremolos')) }" aria-labelledby="effects-heading">
        <h2 id="effects-heading">
          <button type="button" class="oscillators-toggle" :aria-expanded="!areEffectsCollapsed" aria-controls="effects-content" @click="areEffectsCollapsed = !areEffectsCollapsed">Effects</button>
        </h2>
        <div v-show="!areEffectsCollapsed" id="effects-content" class="oscillators-content">
          <div class="effect-type">
            <div class="effect-type-heading">
              <h3>Chorus</h3>
              <span class="effect-order-actions">
                <button type="button" :disabled="!canMoveEffectGroup('choruses', -1)" aria-label="Move Chorus up" @click="moveEffectGroup('choruses', -1)">↑</button>
                <button type="button" :disabled="!canMoveEffectGroup('choruses', 1)" aria-label="Move Chorus down" @click="moveEffectGroup('choruses', 1)">↓</button>
              </span>
            </div>
          <template v-for="(chorusSettings, index) in choruses" :key="index">
            <ChorusControls
              :chorus-index="index"
              :chorus-count="choruses.length"
              v-bind="chorusSettings"
              @update:waveform="updateChorusSettings(index, { waveform: $event })"
              @update:rate="updateChorusSettings(index, { rate: $event })"
              @update:depth="updateChorusSettings(index, { depth: $event })"
              @update:delay="updateChorusSettings(index, { delay: $event })"
              @update:mix="updateChorusSettings(index, { mix: $event })"
              @toggle-bypass="toggleChorusBypass(index)"
              @move-up="moveChorus(index, -1)"
              @move-down="moveChorus(index, 1)"
              @remove="removeChorus(index)"
            />
            <LfoControls
              :lfos="lfosForModule('chorus', index)"
              :target-options="lfoTargetOptions('chorus', index)"
              :id-prefix="`chorus-${index}`"
              @update="updateLfo($event.index, $event.settings)"
              @toggle-bypass="toggleLfoBypass"
              @remove="removeLfo"
              @add="addLfo('chorus', index)"
            />
          </template>
          <button type="button" class="add-filter-button" @click="addChorus">Add Chorus</button>
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
              <span class="effect-order-actions">
                <button type="button" :disabled="!canMoveEffectGroup('flangers', -1)" aria-label="Move Flanger up" @click="moveEffectGroup('flangers', -1)">↑</button>
                <button type="button" :disabled="!canMoveEffectGroup('flangers', 1)" aria-label="Move Flanger down" @click="moveEffectGroup('flangers', 1)">↓</button>
              </span>
            </div>
          <template v-for="(flangerSettings, index) in flangers" :key="index">
            <FlangerControls
              :flanger-index="index"
              :flanger-count="flangers.length"
              v-bind="flangerSettings"
              @update:waveform="updateFlangerSettings(index, { waveform: $event })"
              @update:rate="updateFlangerSettings(index, { rate: $event })"
              @update:depth="updateFlangerSettings(index, { depth: $event })"
              @update:delay="updateFlangerSettings(index, { delay: $event })"
              @update:feedback="updateFlangerSettings(index, { feedback: $event })"
              @update:mix="updateFlangerSettings(index, { mix: $event })"
              @toggle-bypass="toggleFlangerBypass(index)"
              @move-up="moveFlanger(index, -1)"
              @move-down="moveFlanger(index, 1)"
              @remove="removeFlanger(index)"
            />
            <LfoControls
              :lfos="lfosForModule('flanger', index)"
              :target-options="lfoTargetOptions('flanger', index)"
              :id-prefix="`flanger-${index}`"
              @update="updateLfo($event.index, $event.settings)"
              @toggle-bypass="toggleLfoBypass"
              @remove="removeLfo"
              @add="addLfo('flanger', index)"
            />
          </template>
          <button type="button" class="add-filter-button" @click="addFlanger">Add Flanger</button>
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
              <span class="effect-order-actions">
                <button type="button" :disabled="!canMoveEffectGroup('tremolos', -1)" aria-label="Move Tremolo up" @click="moveEffectGroup('tremolos', -1)">↑</button>
                <button type="button" :disabled="!canMoveEffectGroup('tremolos', 1)" aria-label="Move Tremolo down" @click="moveEffectGroup('tremolos', 1)">↓</button>
              </span>
            </div>
          <template v-for="(tremoloSettings, index) in tremolos" :key="index">
            <TremoloControls
              :tremolo-index="index"
              :tremolo-count="tremolos.length"
              v-bind="tremoloSettings"
              @update:waveform="updateTremoloSettings(index, { waveform: $event })"
              @update:rate="updateTremoloSettings(index, { rate: $event })"
              @update:depth="updateTremoloSettings(index, { depth: $event })"
              @update:mix="updateTremoloSettings(index, { mix: $event })"
              @toggle-bypass="toggleTremoloBypass(index)"
              @move-up="moveTremolo(index, -1)"
              @move-down="moveTremolo(index, 1)"
              @remove="removeTremolo(index)"
            />
            <LfoControls
              :lfos="lfosForModule('tremolo', index)"
              :target-options="lfoTargetOptions('tremolo', index)"
              :id-prefix="`tremolo-${index}`"
              @update="updateLfo($event.index, $event.settings)"
              @toggle-bypass="toggleLfoBypass"
              @remove="removeLfo"
              @add="addLfo('tremolo', index)"
            />
          </template>
          <button type="button" class="add-filter-button" @click="addTremolo">Add Tremolo</button>
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
        </div>
      </section>

      <section class="synth-section oscillators-section effect-group" :style="{ order: effectOrder.indexOf('delays') }" aria-labelledby="delays-heading">
        <h2 id="delays-heading">
          <button type="button" class="oscillators-toggle" :aria-expanded="!areDelaysCollapsed" aria-controls="delays-content" @click="areDelaysCollapsed = !areDelaysCollapsed">
            Delays
          </button>
          <span class="effect-order-actions">
            <button type="button" :disabled="!canMoveEffectGroup('delays', -1)" aria-label="Move Delays up" @click="moveEffectGroup('delays', -1)">↑</button>
            <button type="button" :disabled="!canMoveEffectGroup('delays', 1)" aria-label="Move Delays down" @click="moveEffectGroup('delays', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areDelaysCollapsed" id="delays-content" class="oscillators-content">
          <template v-for="(delaySettings, index) in delays" :key="index">
          <DelayControls
            :delay-index="index"
            v-bind="delaySettings"
            @update:note-time="updateDelaySettings(index, { noteTime: $event })"
            @update:feedback="updateDelaySettings(index, { feedback: $event })"
            @update:resonance="updateDelaySettings(index, { resonance: $event })"
            @update:mix="updateDelaySettings(index, { mix: $event })"
            @update:overdrive="updateDelaySettings(index, { overdrive: $event })"
            @toggle-bypass="toggleDelayBypass(index)"
            @remove="removeDelay(index)"
          />
          <LfoControls
            :lfos="lfosForModule('delay', index)"
            :target-options="lfoTargetOptions('delay', index)"
            :id-prefix="`delay-${index}`"
            @update="updateLfo($event.index, $event.settings)"
            @toggle-bypass="toggleLfoBypass"
            @remove="removeLfo"
            @add="addLfo('delay', index)"
          />
          </template>
          <button type="button" class="add-filter-button" @click="addDelay">Add Delay</button>
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
      </section>

      <section class="synth-section oscillators-section effect-group" :style="{ order: effectOrder.indexOf('reverbs') }" aria-labelledby="reverbs-heading">
        <h2 id="reverbs-heading">
          <button type="button" class="oscillators-toggle" :aria-expanded="!areReverbsCollapsed" aria-controls="reverbs-content" @click="areReverbsCollapsed = !areReverbsCollapsed">
            Reverbs
          </button>
          <span class="effect-order-actions">
            <button type="button" :disabled="!canMoveEffectGroup('reverbs', -1)" aria-label="Move Reverbs up" @click="moveEffectGroup('reverbs', -1)">↑</button>
            <button type="button" :disabled="!canMoveEffectGroup('reverbs', 1)" aria-label="Move Reverbs down" @click="moveEffectGroup('reverbs', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areReverbsCollapsed" id="reverbs-content" class="oscillators-content">
          <template v-for="(reverbSettings, index) in reverbs" :key="index">
          <ReverbControls
            :reverb-index="index"
            v-bind="reverbSettings"
            @update:hall-type="updateReverbSettings(index, { hallType: $event })"
            @update:decay="updateReverbSettings(index, { decay: $event })"
            @update:pre-delay="updateReverbSettings(index, { preDelay: $event })"
            @update:damping="updateReverbSettings(index, { damping: $event })"
            @update:width="updateReverbSettings(index, { width: $event })"
            @update:mix="updateReverbSettings(index, { mix: $event })"
            @toggle-bypass="toggleReverbBypass(index)"
            @remove="removeReverb(index)"
          />
          <LfoControls
            :lfos="lfosForModule('reverb', index)"
            :target-options="lfoTargetOptions('reverb', index)"
            :id-prefix="`reverb-${index}`"
            @update="updateLfo($event.index, $event.settings)"
            @toggle-bypass="toggleLfoBypass"
            @remove="removeLfo"
            @add="addLfo('reverb', index)"
          />
          </template>
          <button type="button" class="add-filter-button" @click="addReverb">Add Reverb</button>
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
      </section>

      <SectionFrame
        v-if="!isMasterChannel && amplitudeModulation"
        class="synth-section modulation-section"
        title="Amplitude modulation"
        heading-id="am-heading"
        content-id="am-content"
        :bypassed="isAmplitudeModulationBypassed"
        @toggle-bypass="toggleAmplitudeModulationBypass"
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

      <section class="synth-section oscillators-section effect-group" :style="{ order: effectOrder.indexOf('dynamics') }" aria-labelledby="dynamics-heading">
        <h2 id="dynamics-heading">
          <button
            type="button"
            class="oscillators-toggle"
            :aria-expanded="!areDynamicsCollapsed"
            aria-controls="dynamics-content"
            @click="areDynamicsCollapsed = !areDynamicsCollapsed"
          >
            Dynamics
          </button>
          <span class="effect-order-actions">
            <button type="button" :disabled="!canMoveEffectGroup('dynamics', -1)" aria-label="Move Dynamics up" @click="moveEffectGroup('dynamics', -1)">↑</button>
            <button type="button" :disabled="!canMoveEffectGroup('dynamics', 1)" aria-label="Move Dynamics down" @click="moveEffectGroup('dynamics', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areDynamicsCollapsed" id="dynamics-content" class="oscillators-content">
          <template v-for="(item, index) in dynamics" :key="index">
            <CompressorControls
              v-if="item.type === 'compressor'"
              :dynamics-index="index"
              :dynamics-count="dynamics.length"
              v-bind="item"
              @update:threshold="updateDynamicsSettings(index, { threshold: $event })"
              @update:knee="updateDynamicsSettings(index, { knee: $event })"
              @update:ratio="updateDynamicsSettings(index, { ratio: $event })"
              @update:attack="updateDynamicsSettings(index, { attack: $event })"
              @update:release="updateDynamicsSettings(index, { release: $event })"
              @update:makeup-gain="updateDynamicsSettings(index, { makeupGain: $event })"
              @toggle-bypass="toggleDynamicsBypass(index)"
              @move-up="moveDynamics(index, -1)"
              @move-down="moveDynamics(index, 1)"
              @remove="removeDynamics(index)"
            />
            <GateControls
              v-else-if="item.type === 'gate'"
              :dynamics-index="index"
              :dynamics-count="dynamics.length"
              v-bind="item"
              @update:threshold="updateDynamicsSettings(index, { threshold: $event })"
              @update:attack="updateDynamicsSettings(index, { attack: $event })"
              @update:hold="updateDynamicsSettings(index, { hold: $event })"
              @update:release="updateDynamicsSettings(index, { release: $event })"
              @toggle-bypass="toggleDynamicsBypass(index)"
              @move-up="moveDynamics(index, -1)"
              @move-down="moveDynamics(index, 1)"
              @remove="removeDynamics(index)"
            />
            <LimiterControls
              v-else-if="item.type === 'limiter'"
              :dynamics-index="index"
              :dynamics-count="dynamics.length"
              v-bind="item"
              @update:ceiling="updateDynamicsSettings(index, { ceiling: $event })"
              @update:release="updateDynamicsSettings(index, { release: $event })"
              @update:makeup-gain="updateDynamicsSettings(index, { makeupGain: $event })"
              @toggle-bypass="toggleDynamicsBypass(index)"
              @move-up="moveDynamics(index, -1)"
              @move-down="moveDynamics(index, 1)"
              @remove="removeDynamics(index)"
            />
          </template>
          <div class="module-actions">
            <button type="button" class="add-filter-button" @click="addCompressor">Add Compressor</button>
            <button type="button" class="add-filter-button" @click="addGate">Add Gate</button>
            <button type="button" class="add-filter-button" @click="addLimiter">Add Limiter</button>
          </div>
        </div>
      </section>

      </div>

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
