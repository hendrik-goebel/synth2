<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { NoiseColor } from '../services/synthEngine'

defineProps<{
  noiseIndex: number
  bypassed: boolean
  color: NoiseColor
  level: number
  stereoSpread: number
}>()

const emit = defineEmits<{
  'update:color': [value: NoiseColor]
  'update:level': [value: number]
  'update:stereoSpread': [value: number]
  'toggle-bypass': []
  modulate: []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Noise ${noiseIndex + 1}`"
    :heading-id="`noise-${noiseIndex}-heading`"
    :content-id="`noise-${noiseIndex}-content`"
    :bypassed="bypassed"
    @toggle-bypass="emit('toggle-bypass')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control">
        <span>Color</span>
        <select :value="color" @change="emit('update:color', ($event.target as HTMLSelectElement).value as NoiseColor)">
          <option value="white">White</option>
          <option value="pink">Pink</option>
          <option value="brown">Brown</option>
        </select>
      </label>
      <label class="control">
        <span>Level</span>
        <output>{{ Math.round(level * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="level" @input="emit('update:level', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Spread</span>
        <output>{{ Math.round(stereoSpread * 100) }}%</output>
        <input type="range" min="-1" max="1" step="0.01" :value="stereoSpread" @input="emit('update:stereoSpread', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <slot />
    <button type="button" class="add-env-button" @click="emit('modulate')">+ Mod</button>
  </SectionFrame>
</template>
