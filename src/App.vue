<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { MidiService } from './services/midiService'
import { createDelaySettings, createEnvelopeSettings, createFilterSettings, createNoiseSettings, createOutputSettings, createOverdriveSettings, createReverbSettings, createCompressorSettings, createGateSettings, createLimiterSettings, createOscillatorSettings, type AmplitudeModulationSettings, type DelaySettings, type DynamicsSettings, type DynamicsSettingsChanges, type EffectGroup, type EnvelopeDestination, type EnvelopeSettings, type FilterSettings, type LfoSettings, type NoiseSettings, type OscillatorSettings, type OutputSettings, type OverdriveSettings, type ReverbSettings, type Waveform, SynthEngine } from './services/synthEngine'
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

type EnvelopeModule = EnvelopeSettings & { bypassed: boolean }
type LfoControlModule = LfoSettings & { bypassed: boolean }
type ChannelState = {
  synth: SynthEngine
  oscillators: OscillatorSettings[]
  output: OutputSettings
  noise: NoiseSettings | null
  filters: FilterSettings[]
  delays: DelaySettings[]
  overdrives: OverdriveSettings[]
  bpm: number
  reverbs: ReverbSettings[]
  amplitudeModulation: AmplitudeModulationSettings | null
  envelopes: EnvelopeModule[]
  lfos: LfoControlModule[]
  dynamics: DynamicsSettings[]
  effectOrder: EffectGroup[]
  isAmplitudeModulationBypassed: boolean
}

const waveforms: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square']
const initialOscillatorSettings = createRandomOscillatorSettings()
const initialOutputSettings = createOutputSettings()
let activeSynth = new SynthEngine(initialOscillatorSettings, initialOutputSettings)
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
const bpm = ref(120)
const reverbs = ref<ReverbSettings[]>([])
const amplitudeModulation = ref<AmplitudeModulationSettings | null>(null)
const envelopes = ref<EnvelopeModule[]>([])
const lfos = ref<LfoControlModule[]>([])
const dynamics = ref<DynamicsSettings[]>([])
const effectOrder = ref<EffectGroup[]>(['filters', 'overdrives', 'delays', 'reverbs', 'dynamics'])
const isAmplitudeModulationBypassed = ref(false)
const channels = shallowRef<ChannelState[]>([])
const areOscillatorsCollapsed = ref(false)
const areFiltersCollapsed = ref(false)
const areDynamicsCollapsed = ref(false)
const areDelaysCollapsed = ref(false)
const areOverdrivesCollapsed = ref(false)
const areReverbsCollapsed = ref(false)
let firstInteractionHandled = false
let midiConnectionStarted = false
let audioEnabled = false

function saveActiveChannel() {
  const channel = channels.value[selectedChannel.value - 1]
  if (!channel) return
  channel.synth = activeSynth
  channel.oscillators = oscillators.value
  channel.output = output.value
  channel.noise = noise.value
  channel.filters = filters.value
  channel.delays = delays.value
  channel.overdrives = overdrives.value
  channel.bpm = bpm.value
  channel.reverbs = reverbs.value
  channel.amplitudeModulation = amplitudeModulation.value
  channel.envelopes = envelopes.value
  channel.lfos = lfos.value
  channel.dynamics = dynamics.value
  channel.effectOrder = effectOrder.value
  channel.isAmplitudeModulationBypassed = isAmplitudeModulationBypassed.value
}

function loadChannel(channelNumber: number) {
  const channel = channels.value[channelNumber - 1]
  if (!channel) return
  saveActiveChannel()
  selectedChannel.value = channelNumber
  activeSynth = channel.synth
  oscillators.value = channel.oscillators
  output.value = channel.output
  noise.value = channel.noise
  filters.value = channel.filters
  delays.value = channel.delays
  overdrives.value = channel.overdrives
  bpm.value = channel.bpm
  reverbs.value = channel.reverbs
  amplitudeModulation.value = channel.amplitudeModulation
  envelopes.value = channel.envelopes
  lfos.value = channel.lfos
  dynamics.value = channel.dynamics
  effectOrder.value = channel.effectOrder
  isAmplitudeModulationBypassed.value = channel.isAmplitudeModulationBypassed
  activeVoices.value = activeSynth.getActiveVoiceCount()
}

function addChannel() {
  if (channels.value.length >= 16) return
  saveActiveChannel()
  const oscillatorSettings = createOscillatorSettings()
  const outputSettings = createOutputSettings()
  const channel: ChannelState = {
    synth: new SynthEngine(oscillatorSettings, outputSettings),
    oscillators: [oscillatorSettings],
    output: outputSettings,
    noise: null,
    filters: [createFilterSettings()],
    delays: [],
    overdrives: [],
    bpm: 120,
    reverbs: [],
    amplitudeModulation: null,
    envelopes: [],
    lfos: [],
    dynamics: [],
    effectOrder: ['filters', 'overdrives', 'delays', 'reverbs', 'dynamics'],
    isAmplitudeModulationBypassed: false,
  }
  channels.value = [...channels.value, channel]
  if (audioEnabled) {
    void channel.synth.activate()
  }
  loadChannel(channels.value.length)
}

function handleChannelKey(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
  const channelNumber = Number(event.key)
  if (channelNumber >= 1 && channelNumber <= 9 && channelNumber <= channels.value.length) {
    event.preventDefault()
    loadChannel(channelNumber)
  }
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
  bpm: bpm.value,
  reverbs: reverbs.value,
  amplitudeModulation: amplitudeModulation.value,
  envelopes: envelopes.value,
  lfos: lfos.value,
  dynamics: dynamics.value,
  effectOrder: effectOrder.value,
  isAmplitudeModulationBypassed: isAmplitudeModulationBypassed.value,
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
  Promise.all(channels.value.map(({ synth }) => synth.activate()))
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
  midiService.setChannel(channelNumber)
}

function handlePanic() {
  channels.value.forEach(({ synth }) => synth.stopAllNotes())
  activeVoices.value = 0
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
    if (lfo.target.startsWith(sourcePrefix)) updateLfo(lfoIndex, { target: lfo.target.replace(sourcePrefix, targetPrefix) })
    else if (lfo.target.startsWith(targetPrefix)) updateLfo(lfoIndex, { target: lfo.target.replace(targetPrefix, sourcePrefix) })
  })
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

function lfoTargetOptions(module: 'oscillator' | 'noise' | 'filter' | 'delay' | 'overdrive' | 'reverb' | 'output', index: number) {
  const targets = {
    oscillator: [['detune', 'Detune'], ['level', 'Level'], ['stereoSpread', 'Stereo spread']],
    noise: [['level', 'Level'], ['stereoSpread', 'Stereo spread']],
    filter: [['cutoff', 'Cutoff'], ['resonance', 'Resonance'], ['gain', 'Gain']],
    delay: [['time', 'Time'], ['feedback', 'Feedback'], ['mix', 'Mix'], ['overdrive', 'Overdrive']],
    overdrive: [['drive', 'Drive'], ['tone', 'Tone'], ['feedback', 'Feedback'], ['mix', 'Mix']],
    reverb: [['preDelay', 'Pre-delay'], ['damping', 'Damping'], ['mix', 'Mix'], ['width', 'Width']],
    output: [['volume', 'Volume'], ['pan', 'Pan']],
  } as const
  return targets[module].map(([parameter, label]) => ({ value: `${module}:${index}:${parameter}`, label }))
}

function lfosForModule(module: 'oscillator' | 'noise' | 'filter' | 'delay' | 'overdrive' | 'reverb' | 'output', index: number) {
  const prefix = `${module}:${index}:`
  return lfos.value.flatMap((lfo, lfoIndex) => lfo.target.startsWith(prefix) ? [{ ...lfo, index: lfoIndex }] : [])
}

function addLfo(module: 'oscillator' | 'noise' | 'filter' | 'delay' | 'overdrive' | 'reverb' | 'output', index: number) {
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
    if (targetModule === module && Number(rawIndex) > index) updateLfo(lfoIndex, { target: `${module}:${Number(rawIndex) - 1}:${parameter}` })
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
})

onUnmounted(() => {
  midiService.destroy()
  channels.value.forEach(({ synth }) => synth.destroy())
})
</script>

<template>
  <main class="app" @pointerdown.capture="handleFirstInteraction" @keydown.capture="handleKeydown">
    <section class="panel">
      <header class="topbar">
        <div>
          <p class="eyebrow">Web instrument</p>
          <h1>OSC</h1>
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
          <strong class="channel-number">MIDI {{ selectedChannel }}</strong>
        </div>
        <div class="channel-actions">
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

      <section class="synth-section oscillators-section" aria-labelledby="oscillators-heading">
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

      <template v-if="noise">
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
        v-if="amplitudeModulation"
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
              <option v-for="channel in channels.length" :key="channel" :value="channel">
                {{ channel }}
              </option>
            </select>
          </label>
        </div>
        <span class="status midi-status" aria-live="polite">{{ midiStatus }}</span>
      </section>
    </section>
  </main>
</template>
