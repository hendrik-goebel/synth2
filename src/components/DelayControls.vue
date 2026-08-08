<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

defineProps<{
  delayIndex: number
  bypassed: boolean
  time: number
  noteTime: number
  feedback: number
  resonance: number
  mix: number
  overdrive: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:noteTime': [value: number]
  'update:feedback': [value: number]
  'update:resonance': [value: number]
  'update:mix': [value: number]
  'update:overdrive': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Delay ${delayIndex + 1}`"
    :heading-id="`delay-${delayIndex}-heading`"
    :content-id="`delay-${delayIndex}-content`"
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
        <span>Time</span>
        <output>{{ noteTime === 1 ? '1 bar' : `1/${noteTime}` }} · {{ Math.round(time * 1000) }} ms</output>
        <select :value="noteTime" @change="emit('update:noteTime', Number(($event.target as HTMLSelectElement).value))">
          <option v-for="value in [1, 3, 4, 5, 6, 8, 9, 16, 32]" :key="value" :value="value">1/{{ value }}</option>
        </select>
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
