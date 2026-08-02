<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

defineProps<{
  delayIndex: number
  bypassed: boolean
  time: number
  feedback: number
  resonance: number
  mix: number
  overdrive: number
}>()

const emit = defineEmits<{
  'update:time': [value: number]
  'update:feedback': [value: number]
  'update:resonance': [value: number]
  'update:mix': [value: number]
  'update:overdrive': [value: number]
  'toggle-bypass': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Delay ${delayIndex + 1}`"
    :heading-id="`delay-${delayIndex}-heading`"
    :content-id="`delay-${delayIndex}-content`"
    :bypassed="bypassed"
    @toggle-bypass="emit('toggle-bypass')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control">
        <span>Time</span>
        <output>{{ Math.round(time * 1000) }} ms</output>
        <input type="range" min="0.01" max="2" step="0.01" :value="time" @input="emit('update:time', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Feedback</span>
        <output>{{ Math.round(feedback * 100) }}%</output>
        <input type="range" min="0" max="0.95" step="0.01" :value="feedback" @input="emit('update:feedback', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Resonance</span>
        <output>{{ Math.round(resonance * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="resonance" @input="emit('update:resonance', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Overdrive</span>
        <output>{{ Math.round(overdrive * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="overdrive" @input="emit('update:overdrive', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Mix</span>
        <output>{{ Math.round(mix * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="mix" @input="emit('update:mix', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
  </SectionFrame>
</template>
