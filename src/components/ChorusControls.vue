<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { Waveform } from '../services/synthEngine'

defineProps<{
  chorusIndex: number
  bypassed: boolean
  waveform: Waveform
  rate: number
  depth: number
  delay: number
  mix: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:waveform': [value: Waveform]
  'update:rate': [value: number]
  'update:depth': [value: number]
  'update:delay': [value: number]
  'update:mix': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Chorus ${chorusIndex + 1}`"
    :heading-id="`chorus-${chorusIndex}-heading`"
    :content-id="`chorus-${chorusIndex}-content`"
    :bypassed="bypassed"
    :can-move-up="canMoveUp"
    :can-move-down="canMoveDown"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control"><span>LFO Wave</span><select :value="waveform" @change="emit('update:waveform', ($event.target as HTMLSelectElement).value as Waveform)"><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="sawtooth">Sawtooth</option><option value="square">Square</option><option value="random">Random</option></select></label>
      <label class="control"><span>LFO Rate</span><output>{{ rate.toFixed(2) }} Hz</output><input type="range" min="0.01" max="20" step="0.01" :value="rate" @input="emit('update:rate', Number(($event.target as HTMLInputElement).value))"></label>
      <label class="control"><span>LFO Depth</span><output>{{ Math.round(depth * 100) }}%</output><input type="range" min="0" max="1" step="0.01" :value="depth" @input="emit('update:depth', Number(($event.target as HTMLInputElement).value))"></label>
      <label class="control"><span>Delay</span><output>{{ Math.round(delay * 1000) }} ms</output><input type="range" min="0" max="0.045" step="0.001" :value="delay" @input="emit('update:delay', Number(($event.target as HTMLInputElement).value))"></label>
      <label class="control"><span>Mix</span><output>{{ Math.round(mix * 100) }}%</output><input type="range" min="0" max="1" step="0.01" :value="mix" @input="emit('update:mix', Number(($event.target as HTMLInputElement).value))"></label>
    </div>
    <slot name="modulation" />
  </SectionFrame>
</template>
