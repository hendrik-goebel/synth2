<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { HallType } from '../services/synthEngine'

defineProps<{
  reverbIndex: number
  bypassed: boolean
  hallType: HallType
  decay: number
  preDelay: number
  damping: number
  width: number
  mix: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:hallType': [value: HallType]
  'update:decay': [value: number]
  'update:preDelay': [value: number]
  'update:damping': [value: number]
  'update:width': [value: number]
  'update:mix': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Reverb ${reverbIndex + 1}`"
    :heading-id="`reverb-${reverbIndex}-heading`"
    :content-id="`reverb-${reverbIndex}-content`"
    :bypassed="bypassed"
    :can-move-up="canMoveUp"
    :can-move-down="canMoveDown"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control">
        <span>Hall</span>
        <select :value="hallType" @change="emit('update:hallType', ($event.target as HTMLSelectElement).value as HallType)">
          <option value="small-hall">Small Hall</option>
          <option value="wooden-hall">Wooden Hall</option>
          <option value="concert-hall">Concert Hall</option>
          <option value="opera-house">Opera House</option>
          <option value="cathedral">Cathedral</option>
          <option value="arena">Arena</option>
        </select>
      </label>
      <label class="control">
        <span>Decay</span>
        <output>{{ decay.toFixed(1) }} s</output>
        <input type="range" min="0.6" max="10" step="0.1" :value="decay" @input="emit('update:decay', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Pre-delay</span>
        <output>{{ Math.round(preDelay * 1000) }} ms</output>
        <input type="range" min="0" max="0.2" step="0.005" :value="preDelay" @input="emit('update:preDelay', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Damping</span>
        <output>{{ Math.round(damping * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="damping" @input="emit('update:damping', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Width</span>
        <output>{{ Math.round(width * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="width" @input="emit('update:width', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Mix</span>
        <output>{{ Math.round(mix * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="mix" @input="emit('update:mix', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <slot name="modulation" />
  </SectionFrame>
</template>
