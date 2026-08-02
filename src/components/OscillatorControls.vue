<script setup lang="ts">
defineProps<{
  frequency: number
  detune: number
  glide: number
  level: number
  phase: number
  waveform: OscillatorType
  unisonDetune: number
  stereoSpread: number
  fmAmount: number
  fmSource: OscillatorType
}>()

const emit = defineEmits<{
  'update:frequency': [value: number]
  'update:detune': [value: number]
  'update:glide': [value: number]
  'update:level': [value: number]
  'update:phase': [value: number]
  'update:waveform': [value: OscillatorType]
  'update:unisonDetune': [value: number]
  'update:stereoSpread': [value: number]
  'update:fmAmount': [value: number]
  'update:fmSource': [value: OscillatorType]
}>()
</script>

<template>
  <section class="oscillator-controls" aria-labelledby="oscillator-heading">
    <h2 id="oscillator-heading">Oscillator</h2>

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
      <span>Pitch</span>
      <output>{{ frequency.toFixed(2) }}</output>
      <input
        type="range"
        min="20"
        max="2000"
        step="0.01"
        :value="frequency"
        @input="emit('update:frequency', Number(($event.target as HTMLInputElement).value))"
      >
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
      <span>Phase</span>
      <output>{{ phase }}</output>
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        :value="phase"
        @input="emit('update:phase', Number(($event.target as HTMLInputElement).value))"
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
  </section>
</template>
