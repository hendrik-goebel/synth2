<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  oscillatorIndex: number
  canRemove: boolean
  detune: number
  glide: number
  level: number
  waveform: OscillatorType
  unisonDetune: number
  stereoSpread: number
  fmAmount: number
  fmSource: OscillatorType
}>()

const emit = defineEmits<{
  'update:detune': [value: number]
  'update:glide': [value: number]
  'update:level': [value: number]
  'update:waveform': [value: OscillatorType]
  'update:unisonDetune': [value: number]
  'update:stereoSpread': [value: number]
  'update:fmAmount': [value: number]
  'update:fmSource': [value: OscillatorType]
  remove: []
}>()

const isCollapsed = ref(false)
</script>

<template>
  <section class="oscillator-controls" :aria-labelledby="`oscillator-${oscillatorIndex}-heading`">
    <h2 :id="`oscillator-${oscillatorIndex}-heading`">
      <button
        type="button"
        class="oscillator-toggle"
        :aria-expanded="!isCollapsed"
        :aria-controls="`oscillator-${oscillatorIndex}-content`"
        @click="isCollapsed = !isCollapsed"
      >
        Oscillator {{ oscillatorIndex + 1 }}
      </button>
      <button type="button" class="oscillator-remove" :disabled="!canRemove" @click="emit('remove')">Remove</button>
    </h2>

    <div v-show="!isCollapsed" :id="`oscillator-${oscillatorIndex}-content`" class="oscillator-content">
    <label class="control">
      <span>Wave</span>
      <select
        :value="waveform"
        @change="emit('update:waveform', ($event.target as HTMLSelectElement).value as OscillatorType)"
      >
        <option value="sine">Sine</option>
        <option value="triangle">Triangle</option>
        <option value="sawtooth">Sawtooth</option>
        <option value="square">Square</option>
      </select>
    </label>

    <label class="control">
      <span>Detune</span>
      <output>{{ detune }}</output>
      <input
        type="range"
        min="-1200"
        max="1200"
        step="1"
        :value="detune"
        @input="emit('update:detune', Number(($event.target as HTMLInputElement).value))"
      >
    </label>

    <label class="control">
      <span>Glide</span>
      <output>{{ glide }}</output>
      <input
        type="range"
        min="0"
        max="2000"
        step="1"
        :value="glide"
        @input="emit('update:glide', Number(($event.target as HTMLInputElement).value))"
      >
    </label>

    <label class="control">
      <span>Level</span>
      <output>{{ Math.round(level * 100) }}%</output>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="level"
        @input="emit('update:level', Number(($event.target as HTMLInputElement).value))"
      >
    </label>

    <label class="control">
      <span>Unison</span>
      <output>{{ unisonDetune }}</output>
      <input type="range" min="0" max="100" step="1" :value="unisonDetune" @input="emit('update:unisonDetune', Number(($event.target as HTMLInputElement).value))">
    </label>

    <label class="control">
      <span>Spread</span>
      <output>{{ Math.round(stereoSpread * 100) }}%</output>
      <input type="range" min="0" max="1" step="0.01" :value="stereoSpread" @input="emit('update:stereoSpread', Number(($event.target as HTMLInputElement).value))">
    </label>

    <label class="control">
      <span>FM</span>
      <output>{{ Math.round(fmAmount * 100) }}%</output>
      <input type="range" min="0" max="1" step="0.01" :value="fmAmount" @input="emit('update:fmAmount', Number(($event.target as HTMLInputElement).value))">
    </label>

    <label class="control">
      <span>FM Wave</span>
      <select :value="fmSource" @change="emit('update:fmSource', ($event.target as HTMLSelectElement).value as OscillatorType)">
        <option value="sine">Sine</option>
        <option value="triangle">Triangle</option>
        <option value="sawtooth">Sawtooth</option>
        <option value="square">Square</option>
      </select>
    </label>

    </div>
  </section>
</template>
