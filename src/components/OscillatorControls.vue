<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { Waveform } from '../services/synthEngine'

defineProps<{
  oscillatorIndex: number
  bypassed: boolean
  detune: number
  glide: number
  level: number
  waveform: Waveform
  unisonDetune: number
  stereoSpread: number
  fmAmount: number
  fmSource: Waveform
}>()

const emit = defineEmits<{
  'update:detune': [value: number]
  'update:glide': [value: number]
  'update:level': [value: number]
  'update:waveform': [value: Waveform]
  'update:unisonDetune': [value: number]
  'update:stereoSpread': [value: number]
  'update:fmAmount': [value: number]
  'update:fmSource': [value: Waveform]
  'toggle-bypass': []
  remove: []
}>()

</script>

<template>
  <SectionFrame
    class="oscillator-controls"
    :title="`Oscillator ${oscillatorIndex + 1}`"
    :heading-id="`oscillator-${oscillatorIndex}-heading`"
    :content-id="`oscillator-${oscillatorIndex}-content`"
    :bypassed="bypassed"
    @toggle-bypass="emit('toggle-bypass')"
    @remove="emit('remove')"
  >
    <div class="oscillator-content">
      <label class="control">
        <span>Wave</span>
        <select
          :value="waveform"
          @change="emit('update:waveform', ($event.target as HTMLSelectElement).value as Waveform)"
        >
          <option value="sine">Sine</option>
          <option value="triangle">Triangle</option>
          <option value="sawtooth">Sawtooth</option>
          <option value="square">Square</option>
          <option value="random">Random</option>
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
      <output>{{ glide }} ms</output>
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
      <select :value="fmSource" @change="emit('update:fmSource', ($event.target as HTMLSelectElement).value as Waveform)">
        <option value="sine">Sine</option>
        <option value="triangle">Triangle</option>
        <option value="sawtooth">Sawtooth</option>
        <option value="square">Square</option>
        <option value="random">Random</option>
      </select>
      </label>
    </div>
  </SectionFrame>
</template>
