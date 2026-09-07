<script setup lang="ts">
import { computed } from 'vue'
import SectionFrame from './SectionFrame.vue'

const props = defineProps<{
  resonatorIndex?: number
  sectionTitle?: string
  idPrefix?: string
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

const title = computed(() => props.sectionTitle ?? `Resonator ${(props.resonatorIndex ?? 0) + 1}`)
const resolvedIdPrefix = computed(() => props.idPrefix ?? `resonator-${props.resonatorIndex ?? 0}`)

function logarithmicPosition(value: number): number {
  return Math.log(value / 40) / Math.log(12000 / 40)
}

function logarithmicValue(position: number): number {
  return 40 * Math.pow(12000 / 40, position)
}

function frequencySliderValue(value: number): number {
  return logarithmicPosition(value) * 1000
}

function updateFrequency(event: Event) {
  const position = Number((event.target as HTMLInputElement).value) / 1000
  emit('update:frequency', Math.round(logarithmicValue(position)))
}
</script>

<template>
  <SectionFrame
    :title="title"
    :heading-id="`${resolvedIdPrefix}-heading`"
    :content-id="`${resolvedIdPrefix}-content`"
    :bypassed="bypassed"
    :can-move-up="canMoveUp"
    :can-move-down="canMoveDown"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="modulation-controls">
      <label class="control" :data-midi-target="resonatorIndex === undefined ? undefined : `resonators:${resonatorIndex}:frequency`">
        <span>Frequency</span>
        <output>{{ Math.round(frequency) }} Hz</output>
        <input type="range" min="0" max="1000" step="1" :value="frequencySliderValue(frequency)" @input="updateFrequency">
      </label>
      <label class="control" :data-midi-target="resonatorIndex === undefined ? undefined : `resonators:${resonatorIndex}:decay`">
        <span>Decay</span>
        <output>{{ decay.toFixed(1) }} s</output>
        <input type="range" min="0" max="5" step="0.1" :value="decay" @input="emit('update:decay', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="resonatorIndex === undefined ? undefined : `resonators:${resonatorIndex}:feedback`">
        <span>Feedback</span>
        <output>{{ Math.round(feedback * 100) }}%</output>
        <input type="range" min="0" max="0.85" step="0.01" :value="feedback" @input="emit('update:feedback', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="resonatorIndex === undefined ? undefined : `resonators:${resonatorIndex}:damping`">
        <span>Damping</span>
        <output>{{ Math.round(damping * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="damping" @input="emit('update:damping', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="resonatorIndex === undefined ? undefined : `resonators:${resonatorIndex}:drive`">
        <span>Drive</span>
        <output>{{ Math.round(drive * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="drive" @input="emit('update:drive', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="resonatorIndex === undefined ? undefined : `resonators:${resonatorIndex}:mix`">
        <span>Mix</span>
        <output>{{ Math.round(mix * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="mix" @input="emit('update:mix', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <slot name="modulation" />
  </SectionFrame>
</template>
