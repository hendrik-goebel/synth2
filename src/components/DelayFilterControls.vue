<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { FilterSettings, FilterType } from '../services/synthEngine'

defineProps<{
  sectionTitle: string
  idPrefix: string
  filter: FilterSettings
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  update: [settings: Partial<FilterSettings>]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="sectionTitle"
    :heading-id="`${idPrefix}-heading`"
    :content-id="`${idPrefix}-content`"
    :bypassed="filter.bypassed"
    :can-move-up="canMoveUp"
    :can-move-down="canMoveDown"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control">
        <span>Type</span>
        <select :value="filter.type" @change="emit('update', { type: ($event.target as HTMLSelectElement).value as FilterType })">
          <option value="lowpass">Low-pass</option>
          <option value="highpass">High-pass</option>
          <option value="bandpass">Band-pass</option>
        </select>
      </label>
      <label class="control">
        <span>Cutoff</span>
        <output>{{ Math.round(filter.cutoff) }} Hz</output>
        <input type="range" min="20" max="20000" step="1" :value="filter.cutoff" @input="emit('update', { cutoff: Number(($event.target as HTMLInputElement).value) })">
      </label>
      <label class="control">
        <span>Resonance</span>
        <output>{{ filter.resonance }} Q</output>
        <input type="range" min="0" max="3" step="0.1" :value="filter.resonance" @input="emit('update', { resonance: Number(($event.target as HTMLInputElement).value) })">
      </label>
      <label v-if="filter.type === 'bandpass'" class="control">
        <span>Gain</span>
        <output>{{ filter.gain.toFixed(1) }} dB</output>
        <input type="range" min="-24" max="24" step="0.1" :value="filter.gain" @input="emit('update', { gain: Number(($event.target as HTMLInputElement).value) })">
      </label>
    </div>
  </SectionFrame>
</template>
