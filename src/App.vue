<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MidiService } from './services/midiService'
import { createDelaySettings, createEnvelopeSettings, createFilterSettings, createNoiseSettings, type AmplitudeModulationSettings, type DelaySettings, type EffectGroup, type EnvelopeDestination, type EnvelopeSettings, type FilterSettings, type NoiseSettings, type OscillatorSettings, type Waveform, SynthEngine } from './services/synthEngine'
import OscillatorControls from './components/OscillatorControls.vue'
import NoiseControls from './components/NoiseControls.vue'
import FilterControls from './components/FilterControls.vue'
import SectionFrame from './components/SectionFrame.vue'
import DelayControls from './components/DelayControls.vue'
import EnvelopeControls from './components/EnvelopeControls.vue'

type EnvelopeModule = EnvelopeSettings & { bypassed: boolean }

const waveforms: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square']
const initialOscillatorSettings = createRandomOscillatorSettings()
const synth = new SynthEngine(initialOscillatorSettings)
const selectedChannel = ref(1)
const selectedInputId = ref('')
const midiInputs = ref<{ id: string; name: string }[]>([])
const midiStatus = ref('MIDI not connected.')
const audioStatus = ref('Audio locked. Interact with the synth to enable audio.')
const activeVoices = ref(0)
const oscillators = ref<OscillatorSettings[]>([initialOscillatorSettings])
const noise = ref<NoiseSettings | null>(null)
const filters = ref<FilterSettings[]>([createFilterSettings()])
const delays = ref<DelaySettings[]>([])
const amplitudeModulation = ref<AmplitudeModulationSettings | null>(null)
const envelopes = ref<EnvelopeModule[]>([])
const effectOrder = ref<EffectGroup[]>(['filters', 'delays'])
const isAmplitudeModulationBypassed = ref(false)
const areOscillatorsCollapsed = ref(false)
const areFiltersCollapsed = ref(false)
const areDelaysCollapsed = ref(false)
let firstInteractionHandled = false
let midiConnectionStarted = false

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

const midiService = new MidiService({
  onNoteOn: ({ note, velocity }) => {
    synth.noteOn(note, velocity)
    activeVoices.value = synth.getActiveVoiceCount()
  },
  onNoteOff: ({ note }) => {
    synth.noteOff(note)
    activeVoices.value = synth.getActiveVoiceCount()
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
  synth
    .activate()
    .then(() => {
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

function handleChannelChange() {
  midiService.setChannel(selectedChannel.value)
}

function handlePanic() {
  synth.stopAllNotes()
  activeVoices.value = synth.getActiveVoiceCount()
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
  synth.addOscillator(settings)
}

function removeOscillator(index: number) {
  synth.removeOscillator(index)
  oscillators.value.splice(index, 1)
}

function addNoise() {
  const settings = createNoiseSettings()
  noise.value = settings
  synth.addNoise(settings)
}

function removeNoise() {
  synth.removeNoise()
  noise.value = null
}

function addFilter() {
  const settings = createFilterSettings()
  filters.value.push(settings)
  synth.addFilter(settings)
}

function removeFilter(index: number) {
  synth.removeFilter(index)
  filters.value.splice(index, 1)
}

function updateFilterSettings(index: number, settings: Partial<FilterSettings>) {
  filters.value[index] = { ...filters.value[index], ...settings }
  synth.setFilterSettings(index, settings)
}

function toggleFilterBypass(index: number) {
  updateFilterSettings(index, { bypassed: !filters.value[index].bypassed })
}

function addDelay() {
  const settings = createDelaySettings()
  delays.value.push(settings)
  synth.addDelay(settings)
}

function removeDelay(index: number) {
  synth.removeDelay(index)
  delays.value.splice(index, 1)
}

function updateDelaySettings(index: number, settings: Partial<DelaySettings>) {
  delays.value[index] = { ...delays.value[index], ...settings }
  synth.setDelaySettings(index, settings)
}

function toggleDelayBypass(index: number) {
  const bypassed = !delays.value[index].bypassed
  delays.value[index] = { ...delays.value[index], bypassed }
  synth.setDelayBypassed(index, bypassed)
}

function updateNoiseSettings(settings: Partial<NoiseSettings>) {
  if (!noise.value) {
    return
  }

  noise.value = { ...noise.value, ...settings }
  synth.setNoiseSettings(settings)
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
  synth.addAmplitudeModulation(settings)
}

function updateAmplitudeModulation(settings: Partial<AmplitudeModulationSettings>) {
  if (!amplitudeModulation.value) {
    return
  }

  amplitudeModulation.value = { ...amplitudeModulation.value, ...settings }
  synth.setAmplitudeModulationSettings(settings)
}

function removeAmplitudeModulation() {
  synth.removeAmplitudeModulation()
  amplitudeModulation.value = null
  isAmplitudeModulationBypassed.value = false
}

function toggleAmplitudeModulationBypass() {
  const bypassed = !isAmplitudeModulationBypassed.value
  synth.setAmplitudeModulationBypassed(bypassed)
  isAmplitudeModulationBypassed.value = bypassed
}

function addEnvelope(destination: EnvelopeDestination) {
  const settings = { ...createEnvelopeSettings(), destination, bypassed: false }
  synth.addEnvelope(settings)
  envelopes.value.push(settings)
}

function removeEnvelope(index: number) {
  synth.removeEnvelope(index)
  envelopes.value.splice(index, 1)
}

function toggleEnvelopeBypass(index: number) {
  const bypassed = !envelopes.value[index].bypassed
  synth.setEnvelopeBypassed(index, bypassed)
  envelopes.value[index] = { ...envelopes.value[index], bypassed }
}

function moveEffectGroup(group: EffectGroup, direction: -1 | 1) {
  const index = effectOrder.value.indexOf(group)
  if (index < 0) return
  const nextOrder = [...effectOrder.value]
  const targetIndex = (index + direction + nextOrder.length) % nextOrder.length
  ;[nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]]
  effectOrder.value = nextOrder
  synth.setEffectOrder(nextOrder)
}

function updateEnvelopeSettings(index: number, settings: Partial<EnvelopeSettings>) {
  envelopes.value[index] = { ...envelopes.value[index], ...settings }
  synth.setEnvelopeSettings(index, settings)
}

function envelopesFor(destinations: readonly { value: EnvelopeDestination }[]) {
  return envelopes.value.flatMap((envelope, index) => destinations.some((destination) => destination.value === envelope.destination) ? [{ ...envelope, index }] : [])
}

function toggleOscillatorBypass(index: number) {
  updateOscillatorSettings(index, { bypassed: !oscillators.value[index].bypassed })
}

function updateOscillatorSettings(index: number, settings: Partial<OscillatorSettings>) {
  oscillators.value[index] = { ...oscillators.value[index], ...settings }
  synth.setOscillatorSettings(index, settings)
}

onMounted(() => {
  midiService.setChannel(selectedChannel.value)
})

onUnmounted(() => {
  midiService.destroy()
  synth.destroy()
})
</script>

<template>
  <main class="app" @pointerdown.capture="handleFirstInteraction" @keydown.capture="handleFirstInteraction">
    <section class="panel">
      <header class="topbar">
        <div>
          <p class="eyebrow">Web instrument</p>
          <h1>OSC</h1>
        </div>
        <div class="topbar-actions">
          <output class="voice-count" title="Active voices">{{ activeVoices }}</output>
          <button type="button" class="panic-button" @click="handlePanic">Panic</button>
        </div>
      </header>

      <section class="oscillators-section" aria-labelledby="oscillators-heading">
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
          <OscillatorControls
            v-for="(oscillator, index) in oscillators"
            :key="index"
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
          v-bind="noise"
          @update:color="updateNoiseSettings({ color: $event })"
          @update:level="updateNoiseSettings({ level: $event })"
          @update:stereo-spread="updateNoiseSettings({ stereoSpread: $event })"
          @toggle-bypass="toggleNoiseBypass"
          @remove="removeNoise"
        >
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
      <section class="oscillators-section effect-group" :style="{ order: effectOrder.indexOf('filters') }" aria-labelledby="filters-heading">
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
            <button type="button" :disabled="effectOrder.indexOf('filters') === 0" aria-label="Move Filters up" @click="moveEffectGroup('filters', -1)">↑</button>
            <button type="button" :disabled="effectOrder.indexOf('filters') === effectOrder.length - 1" aria-label="Move Filters down" @click="moveEffectGroup('filters', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areFiltersCollapsed" id="filters-content" class="oscillators-content">
          <FilterControls
            v-for="(filter, index) in filters"
            :key="index"
            :filter-index="index"
            v-bind="filter"
            @update:type="updateFilterSettings(index, { type: $event })"
            @update:cutoff="updateFilterSettings(index, { cutoff: $event })"
            @update:resonance="updateFilterSettings(index, { resonance: $event })"
            @update:gain="updateFilterSettings(index, { gain: $event })"
            @toggle-bypass="toggleFilterBypass(index)"
            @remove="removeFilter(index)"
          />
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

      <section class="oscillators-section effect-group" :style="{ order: effectOrder.indexOf('delays') }" aria-labelledby="delays-heading">
        <h2 id="delays-heading">
          <button type="button" class="oscillators-toggle" :aria-expanded="!areDelaysCollapsed" aria-controls="delays-content" @click="areDelaysCollapsed = !areDelaysCollapsed">
            Delays
          </button>
          <span class="effect-order-actions">
            <button type="button" :disabled="effectOrder.indexOf('delays') === 0" aria-label="Move Delays up" @click="moveEffectGroup('delays', -1)">↑</button>
            <button type="button" :disabled="effectOrder.indexOf('delays') === effectOrder.length - 1" aria-label="Move Delays down" @click="moveEffectGroup('delays', 1)">↓</button>
          </span>
        </h2>
        <div v-show="!areDelaysCollapsed" id="delays-content" class="oscillators-content">
          <DelayControls
            v-for="(delaySettings, index) in delays"
            :key="index"
            :delay-index="index"
            v-bind="delaySettings"
            @update:time="updateDelaySettings(index, { time: $event })"
            @update:feedback="updateDelaySettings(index, { feedback: $event })"
            @update:resonance="updateDelaySettings(index, { resonance: $event })"
            @update:mix="updateDelaySettings(index, { mix: $event })"
            @update:overdrive="updateDelaySettings(index, { overdrive: $event })"
            @toggle-bypass="toggleDelayBypass(index)"
            @remove="removeDelay(index)"
          />
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

      <SectionFrame
        v-if="amplitudeModulation"
        class="modulation-section"
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
            <select v-model.number="selectedChannel" @change="handleChannelChange">
              <option v-for="channel in 16" :key="channel" :value="channel">
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
