<script setup lang="ts">
import LfoControls from './LfoControls.vue'
import type { LfoSettings } from '../services/synthEngine'

type LfoModule = LfoSettings & { bypassed: boolean; index: number }

defineProps<{
  volume: number
  pan: number
  lfos: LfoModule[]
}>()

const emit = defineEmits<{
  'update:volume': [value: number]
  'update:pan': [value: number]
  updateLfo: [payload: { index: number; settings: Partial<LfoSettings> }]
  toggleLfoBypass: [index: number]
  removeLfo: [index: number]
  addLfo: []
}>()

const lfoTargetOptions = [
  { value: 'output:0:volume', label: 'Volume' },
  { value: 'output:0:pan', label: 'Pan' },
] satisfies { value: LfoSettings['target']; label: string }[]
</script>

<template>
  <section class="output-controls ambient amb-surface amb-chamfer amb-elevation-1 amb-rounded-md" aria-labelledby="output-heading">
    <h2 id="output-heading">Output</h2>
    <div class="output-control-grid">
      <label class="control">
        <span>Volume</span>
        <output>{{ Math.round(volume * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="volume" @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Pan</span>
        <output>{{ pan === 0 ? 'Center' : `${pan < 0 ? 'Left' : 'Right'} ${Math.round(Math.abs(pan) * 100)}%` }}</output>
        <input type="range" min="-1" max="1" step="0.01" :value="pan" @input="emit('update:pan', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <LfoControls
      :lfos="lfos"
      :target-options="lfoTargetOptions"
      id-prefix="output"
      @update="emit('updateLfo', $event)"
      @toggle-bypass="emit('toggleLfoBypass', $event)"
      @remove="emit('removeLfo', $event)"
      @add="emit('addLfo')"
    />
  </section>
</template>
