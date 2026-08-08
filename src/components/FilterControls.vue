<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { FilterType } from '../services/synthEngine'

const props = defineProps<{
  filterIndex: number
  bypassed: boolean
  type: FilterType
  cutoff: number
  resonance: number
  gain: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

function logarithmicPosition(value: number, min: number, max: number): number {
  return Math.log(value / min) / Math.log(max / min)
}

function logarithmicValue(position: number, min: number, max: number): number {
  return min * Math.pow(max / min, position)
}

function cutoffSliderValue(value: number): number {
  return logarithmicPosition(value, 20, 20000) * 1000
}

function resonanceSliderValue(value: number): number {
  return value === 0 ? 0 : logarithmicPosition(Math.min(Math.max(value, 0.1), 3), 0.1, 3) * 1000 + 1
}

function updateCutoff(event: Event) {
  const position = Number((event.target as HTMLInputElement).value) / 1000
  emit('update:cutoff', Math.round(logarithmicValue(position, 20, 20000)))
}

function updateResonance(event: Event) {
  const sliderValue = Number((event.target as HTMLInputElement).value)
  emit('update:resonance', sliderValue === 0 ? 0 : Math.round(logarithmicValue((sliderValue - 1) / 1000, 0.1, 3) * 10) / 10)
}

const emit = defineEmits<{
  'update:type': [value: FilterType]
  'update:cutoff': [value: number]
  'update:resonance': [value: number]
  'update:gain': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    class="filter-controls"
    :title="`Filter ${filterIndex + 1}`"
    :heading-id="`filter-${filterIndex}-heading`"
    :content-id="`filter-${filterIndex}-content`"
    :bypassed="bypassed"
    :can-move-up="canMoveUp"
    :can-move-down="canMoveDown"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls filter-control-grid">
      <label class="control">
        <span>Type</span>
        <select :value="type" @change="emit('update:type', ($event.target as HTMLSelectElement).value as FilterType)">
          <option value="lowpass">Low-pass</option>
          <option value="highpass">High-pass</option>
          <option value="bandpass">Band-pass</option>
        </select>
      </label>
      <label class="control">
        <span>Cutoff</span>
        <output>{{ props.cutoff }} Hz</output>
        <input type="range" min="0" max="1000" step="1" :value="cutoffSliderValue(props.cutoff)" @input="updateCutoff">
      </label>
      <label class="control">
        <span>Resonance</span>
        <output>{{ props.resonance }} Q</output>
        <input type="range" min="0" max="1001" step="1" :value="resonanceSliderValue(props.resonance)" @input="updateResonance">
      </label>
      <label class="control">
        <span>Gain</span>
        <output>{{ props.gain }} dB</output>
        <input type="range" min="-24" max="24" step="0.1" :value="props.gain" @input="emit('update:gain', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <slot name="modulation" />
  </SectionFrame>
</template>
