<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MidiService } from './services/midiService'
import { SynthEngine } from './services/synthEngine'

const synth = new SynthEngine()
const selectedChannel = ref(1)
const selectedInputId = ref('')
const midiInputs = ref<{ id: string; name: string }[]>([])
const midiStatus = ref('MIDI not connected.')
const audioStatus = ref('Audio locked. Click "Enable Audio" first.')
const activeVoices = ref(0)

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

function handleConnectMidi() {
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
      midiStatus.value = error instanceof Error ? error.message : 'Failed to connect MIDI.'
    })
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

onMounted(() => {
  midiService.setChannel(selectedChannel.value)
})

onUnmounted(() => {
  midiService.destroy()
  synth.destroy()
})
</script>

<template>
  <main class="app">
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
    </section>
  </main>
</template>
