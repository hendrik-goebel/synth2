<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MidiService } from './services/midiService'
import { SynthEngine } from './services/synthEngine'
import OscillatorControls from './components/OscillatorControls.vue'

const synth = new SynthEngine()
const selectedChannel = ref(1)
const selectedInputId = ref('')
const midiInputs = ref<{ id: string; name: string }[]>([])
const midiStatus = ref('MIDI not connected.')
const audioStatus = ref('Audio locked. Interact with the synth to enable audio.')
const activeVoices = ref(0)
const oscillatorFrequency = ref(440)
const oscillatorDetune = ref(0)
const oscillatorGlide = ref(0)
const oscillatorLevel = ref(1)
const oscillatorPhase = ref(0)
const oscillatorWaveform = ref<OscillatorType>('sine')
const oscillatorUnisonDetune = ref(0)
const oscillatorStereoSpread = ref(0)
const oscillatorFmAmount = ref(0)
const oscillatorFmSource = ref<OscillatorType>('sine')
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

function updateOscillatorSettings() {
  synth.setOscillatorSettings({
    frequency: oscillatorFrequency.value,
    detune: oscillatorDetune.value,
    glide: oscillatorGlide.value,
    level: oscillatorLevel.value,
    phase: oscillatorPhase.value,
    waveform: oscillatorWaveform.value,
    unisonDetune: oscillatorUnisonDetune.value,
    stereoSpread: oscillatorStereoSpread.value,
    fmAmount: oscillatorFmAmount.value,
    fmSource: oscillatorFmSource.value,
  })
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
      <h1>Simple Web Synth</h1>
      <p class="subtitle">Step 1: MIDI in + monophonic sine oscillator</p>

      <div class="row">
        <button type="button" @click="handleEnableAudio">Enable Audio</button>
        <span>{{ audioStatus }}</span>
      </div>

      <div class="row">
        <button type="button" @click="handleConnectMidi">Connect MIDI</button>
        <span>{{ midiStatus }}</span>
      </div>

      <div class="row">
        <button type="button" class="panic-button" @click="handlePanic">Panic: Stop All Notes</button>
      </div>

      <label class="row field">
        <span>MIDI Driver</span>
        <select v-model="selectedInputId" :disabled="!canSelectInput" @change="handleInputChange">
          <option value="" disabled>Select input</option>
          <option v-for="input in midiInputs" :key="input.id" :value="input.id">
            {{ input.name }}
          </option>
        </select>
      </label>

      <label class="row field">
        <span>MIDI Channel</span>
        <select v-model.number="selectedChannel" @change="handleChannelChange">
          <option v-for="channel in 16" :key="channel" :value="channel">
            {{ channel }}
          </option>
        </select>
      </label>

      <p class="voices">Active voices: {{ activeVoices }}</p>

      <OscillatorControls
        v-model:frequency="oscillatorFrequency"
        v-model:detune="oscillatorDetune"
        v-model:glide="oscillatorGlide"
        v-model:level="oscillatorLevel"
        v-model:phase="oscillatorPhase"
        v-model:waveform="oscillatorWaveform"
        v-model:unisonDetune="oscillatorUnisonDetune"
        v-model:stereoSpread="oscillatorStereoSpread"
        v-model:fmAmount="oscillatorFmAmount"
        v-model:fmSource="oscillatorFmSource"
        @update:frequency="updateOscillatorSettings"
        @update:detune="updateOscillatorSettings"
        @update:glide="updateOscillatorSettings"
        @update:level="updateOscillatorSettings"
        @update:phase="updateOscillatorSettings"
        @update:waveform="updateOscillatorSettings"
        @update:unisonDetune="updateOscillatorSettings"
        @update:stereoSpread="updateOscillatorSettings"
        @update:fmAmount="updateOscillatorSettings"
        @update:fmSource="updateOscillatorSettings"
      />
    </section>
  </main>
</template>
