<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import DelayOverdriveControls from './DelayOverdriveControls.vue'
import type { DelayOverdriveSettings } from '../services/synthEngine'

defineProps<{
  delayIndex: number
  bypassed: boolean
  time: number
  noteTime: number
  repetitions: number
  mix: number
  overdrive?: DelayOverdriveSettings
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:noteTime': [value: number]
  'update:repetitions': [value: number]
  'update:mix': [value: number]
  'update:overdrive-gain': [value: number]
  'update:overdrive-feedback': [value: number]
  'update:overdrive-bypassed': [value: boolean]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
  'remove-overdrive': []
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
        <span>Repetitions</span>
        <output>{{ repetitions }}</output>
        <input type="range" min="1" max="20" step="1" :value="repetitions" @input="emit('update:repetitions', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Mix</span>
        <output>{{ Math.round(mix * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="mix" @input="emit('update:mix', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <DelayOverdriveControls
      v-if="overdrive !== undefined"
      :delay-index="delayIndex"
      v-bind="overdrive"
      @update:gain="emit('update:overdrive-gain', $event)"
      @update:feedback="emit('update:overdrive-feedback', $event)"
      @toggle-bypass="emit('update:overdrive-bypassed', !overdrive.bypassed)"
      @remove="emit('remove-overdrive')"
    />
    <slot name="modulation" />
  </SectionFrame>
</template>
