<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

defineProps<{
  resonatorIndex: number
  bypassed: boolean
  frequency: number
  decay: number
  feedback: number
  damping: number
  drive: number
  mix: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:frequency': [value: number]
  'update:decay': [value: number]
  'update:feedback': [value: number]
  'update:damping': [value: number]
  'update:drive': [value: number]
  'update:mix': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Resonator ${resonatorIndex + 1}`"
    :heading-id="`resonator-${resonatorIndex}-heading`"
    :content-id="`resonator-${resonatorIndex}-content`"
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
        <span>Frequency</span>
        <output>{{ Math.round(frequency) }} Hz</output>
        <input type="range" min="40" max="12000" step="1" :value="frequency" @input="emit('update:frequency', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Decay</span>
        <output>{{ decay.toFixed(1) }} s</output>
        <input type="range" min="0" max="5" step="0.1" :value="decay" @input="emit('update:decay', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Feedback</span>
        <output>{{ Math.round(feedback * 100) }}%</output>
        <input type="range" min="0" max="0.85" step="0.01" :value="feedback" @input="emit('update:feedback', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Damping</span>
        <output>{{ Math.round(damping * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="damping" @input="emit('update:damping', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Drive</span>
        <output>{{ Math.round(drive * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="drive" @input="emit('update:drive', Number(($event.target as HTMLInputElement).value))">
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
