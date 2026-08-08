<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

defineProps<{
  dynamicsIndex: number
  bypassed: boolean
  threshold: number
  attack: number
  hold: number
  release: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:threshold': [value: number]
  'update:attack': [value: number]
  'update:hold': [value: number]
  'update:release': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Gate ${dynamicsIndex + 1}`"
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
      <label class="control">
        <span>Threshold</span>
        <output>{{ threshold }} dB</output>
        <input type="range" min="-80" max="0" step="0.5" :value="threshold" @input="emit('update:threshold', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Attack</span>
        <output>{{ Math.round(attack * 1000) }} ms</output>
        <input type="range" min="0" max="1" step="0.001" :value="attack" @input="emit('update:attack', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Hold</span>
        <output>{{ Math.round(hold * 1000) }} ms</output>
        <input type="range" min="0" max="1" step="0.001" :value="hold" @input="emit('update:hold', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Release</span>
        <output>{{ Math.round(release * 1000) }} ms</output>
        <input type="range" min="0.01" max="2" step="0.001" :value="release" @input="emit('update:release', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
  </SectionFrame>
</template>
