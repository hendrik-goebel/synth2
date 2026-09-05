<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

const MIN_GAIN = 0.001
const MAX_GAIN = 1

const props = defineProps<{
  sectionTitle: string
  idPrefix: string
  bypassed: boolean
  gain: number
  feedback: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:gain': [value: number]
  'update:feedback': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()

function gainSliderValue(value: number): number {
  if (value === 0) return 0
  const clampedValue = Math.min(Math.max(value, MIN_GAIN), MAX_GAIN)
  return Math.round(Math.log(clampedValue / MIN_GAIN) / Math.log(MAX_GAIN / MIN_GAIN) * 1000) + 1
}

function updateGain(event: Event) {
  const sliderValue = Number((event.target as HTMLInputElement).value)
  const gain = sliderValue === 0
    ? 0
    : MIN_GAIN * Math.pow(MAX_GAIN / MIN_GAIN, (sliderValue - 1) / 1000)
  emit('update:gain', gain)
}
</script>

<template>
  <SectionFrame
    :title="sectionTitle"
    :heading-id="`${idPrefix}-heading`"
    :content-id="`${idPrefix}-content`"
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
        <span>Gain</span>
        <output>{{ Math.round(gain * 100) }}%</output>
        <input type="range" min="0" max="1001" step="1" :value="gainSliderValue(gain)" @input="updateGain">
      </label>
      <label class="control">
        <span>Feedback</span>
        <output>{{ Math.round(feedback * 100) }}%</output>
        <input type="range" min="0" max="0.6" step="0.01" :value="feedback" @input="emit('update:feedback', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
  </SectionFrame>
</template>
