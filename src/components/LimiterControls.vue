<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

defineProps<{
  dynamicsIndex: number
  bypassed: boolean
  ceiling: number
  release: number
  makeupGain: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:ceiling': [value: number]
  'update:release': [value: number]
  'update:makeupGain': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Limiter ${dynamicsIndex + 1}`"
    :heading-id="`dynamics-${dynamicsIndex}-heading`"
    :content-id="`dynamics-${dynamicsIndex}-content`"
    :bypassed="bypassed"
    :can-move-up="canMoveUp"
    :can-move-down="canMoveDown"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control" :data-midi-target="`dynamics:${dynamicsIndex}:ceiling`">
        <span>Ceiling</span>
        <output>{{ ceiling }} dB</output>
        <input type="range" min="-24" max="0" step="0.5" :value="ceiling" @input="emit('update:ceiling', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="`dynamics:${dynamicsIndex}:release`">
        <span>Release</span>
        <output>{{ Math.round(release * 1000) }} ms</output>
        <input type="range" min="0.01" max="1" step="0.001" :value="release" @input="emit('update:release', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="`dynamics:${dynamicsIndex}:makeupGain`">
        <span>Makeup Gain</span>
        <output>{{ makeupGain }} dB</output>
        <input type="range" min="0" max="24" step="0.5" :value="makeupGain" @input="emit('update:makeupGain', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
  </SectionFrame>
</template>
