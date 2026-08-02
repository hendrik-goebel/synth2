<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MidiService } from './services/midiService'
import { type AmplitudeModulationSettings, type OscillatorSettings, SynthEngine } from './services/synthEngine'
import OscillatorControls from './components/OscillatorControls.vue'

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
const amplitudeModulation = ref<AmplitudeModulationSettings | null>(null)
const areOscillatorsCollapsed = ref(false)
let firstInteractionHandled = false
let midiConnectionStarted = false

const canSelectInput = computed(() => midiInputs.value.length > 0)

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

function addAmplitudeModulation() {
  const settings: AmplitudeModulationSettings = { rate: 5, depth: 0.5, waveform: 'sine' }
  amplitudeModulation.value = settings
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
            :can-remove="oscillators.length > 1"
            v-bind="oscillator"
            @update:detune="updateOscillatorSettings(index, { detune: $event })"
            @update:glide="updateOscillatorSettings(index, { glide: $event })"
            @update:level="updateOscillatorSettings(index, { level: $event })"
            @update:waveform="updateOscillatorSettings(index, { waveform: $event })"
            @update:unison-detune="updateOscillatorSettings(index, { unisonDetune: $event })"
            @update:stereo-spread="updateOscillatorSettings(index, { stereoSpread: $event })"
            @update:fm-amount="updateOscillatorSettings(index, { fmAmount: $event })"
            @update:fm-source="updateOscillatorSettings(index, { fmSource: $event })"
            @remove="removeOscillator(index)"
          />
          <div class="module-actions">
            <button type="button" class="add-oscillator-button" @click="addOscillator">Add OSC</button>
            <button v-if="!amplitudeModulation" type="button" class="add-am-button" @click="addAmplitudeModulation">Add AM</button>
          </div>
        </div>
      </section>

      <section v-if="amplitudeModulation" class="modulation-section" aria-labelledby="am-heading">
        <div class="modulation-heading">
          <h2 id="am-heading">Amplitude modulation</h2>
          <button type="button" class="modulation-remove" @click="removeAmplitudeModulation">Remove</button>
        </div>
        <div class="modulation-controls">
          <label class="control">
            <span>Wave</span>
            <select :value="amplitudeModulation.waveform" @change="updateAmplitudeModulation({ waveform: ($event.target as HTMLSelectElement).value as OscillatorType })">
              <option value="sine">Sine</option>
              <option value="triangle">Triangle</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="square">Square</option>
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
      </section>

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
