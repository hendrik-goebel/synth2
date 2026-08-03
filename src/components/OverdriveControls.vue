<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

const props = defineProps<{
  overdriveIndex: number
  overdriveCount: number
  bypassed: boolean
  drive: number
  tone: number
  feedback: number
  mix: number
}>()

const MIN_FEEDBACK = 0.001
const MAX_FEEDBACK = 0.6

function feedbackSliderValue(value: number): number {
  if (value === 0) return 0
  const clampedValue = Math.min(Math.max(value, MIN_FEEDBACK), MAX_FEEDBACK)
  return Math.round(Math.log(clampedValue / MIN_FEEDBACK) / Math.log(MAX_FEEDBACK / MIN_FEEDBACK) * 1000) + 1
}

function updateFeedback(event: Event) {
  const sliderValue = Number((event.target as HTMLInputElement).value)
  const feedback = sliderValue === 0
    ? 0
    : MIN_FEEDBACK * Math.pow(MAX_FEEDBACK / MIN_FEEDBACK, (sliderValue - 1) / 1000)
  emit('update:feedback', feedback)
}

const emit = defineEmits<{
  'update:drive': [value: number]
  'update:tone': [value: number]
  'update:feedback': [value: number]
  'update:mix': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Overdrive ${overdriveIndex + 1}`"
    :heading-id="`overdrive-${overdriveIndex}-heading`"
    :content-id="`overdrive-${overdriveIndex}-content`"
    :bypassed="bypassed"
    :can-move-up="overdriveIndex > 0"
    :can-move-down="overdriveIndex < overdriveCount - 1"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control">
        <span>Drive</span>
        <output>{{ Math.round(drive * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="drive" @input="emit('update:drive', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Tone</span>
        <output>{{ Math.round(tone * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="tone" @input="emit('update:tone', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Feedback</span>
        <output>{{ Math.round(feedback * 100) }}%</output>
        <input type="range" min="0" max="1001" step="1" :value="feedbackSliderValue(props.feedback)" @input="updateFeedback">
      </label>
      <label class="control">
        <span>Mix</span>
        <output>{{ Math.round(mix * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="mix" @input="emit('update:mix', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
  </SectionFrame>
</template>
