<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

const MIN_GAIN = 0.001
const MAX_GAIN = 1

const props = defineProps<{
  delayIndex: number
  bypassed: boolean
  gain: number
  feedback: number
}>()

const emit = defineEmits<{
  'update:gain': [value: number]
  'update:feedback': [value: number]
  'toggle-bypass': []
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
    title="Delay overdrive"
    :heading-id="`delay-${delayIndex}-overdrive-heading`"
    :content-id="`delay-${delayIndex}-overdrive-content`"
    :bypassed="bypassed"
    @toggle-bypass="emit('toggle-bypass')"
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
