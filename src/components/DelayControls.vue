<script setup lang="ts">
import { computed } from 'vue'
import SectionFrame from './SectionFrame.vue'
import DelayFilterControls from './DelayFilterControls.vue'
import DelayOverdriveControls from './DelayOverdriveControls.vue'
import ResonatorControls from './ResonatorControls.vue'
import type { DelayModuleKind, DelayOverdriveSettings, FilterSettings, ResonatorSettings } from '../services/synthEngine'

const props = defineProps<{
  delayIndex: number
  bypassed: boolean
  time: number
  noteTime: number
  repetitions: number
  mix: number
  overdrive?: DelayOverdriveSettings
  filter?: FilterSettings
  resonator?: ResonatorSettings
  moduleOrder?: DelayModuleKind[]
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
  'update:filter': [settings: Partial<FilterSettings>]
  'update:resonator': [settings: Partial<ResonatorSettings>]
  'toggle-filter-bypass': []
  'move-filter': [direction: -1 | 1]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
  'remove-overdrive': []
  'move-overdrive': [direction: -1 | 1]
  'move-resonator': [direction: -1 | 1]
  'remove-filter': []
  'remove-resonator': []
}>()

function moduleIndex(module: DelayModuleKind): number {
  return delayModules.value.indexOf(module)
}

const delayModules = computed<DelayModuleKind[]>(() => {
  const modules: DelayModuleKind[] = [
    ...(props.filter ? ['filter'] as const : []),
    ...(props.overdrive ? ['overdrive'] as const : []),
    ...(props.resonator ? ['resonator'] as const : []),
  ]
  const order = (props.moduleOrder ?? []).filter((module, index, values) => modules.includes(module) && values.indexOf(module) === index)
  return [...order, ...modules.filter((module) => !order.includes(module))]
})
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
    <template v-for="module in delayModules" :key="module">
      <DelayFilterControls
        v-if="module === 'filter' && filter"
        section-title="Delay filter"
        :id-prefix="`delay-${delayIndex}-filter`"
        :filter="filter"
        :can-move-up="moduleIndex('filter') > 0"
        :can-move-down="moduleIndex('filter') < delayModules.length - 1"
        @update="emit('update:filter', $event)"
        @toggle-bypass="emit('toggle-filter-bypass')"
        @move-up="emit('move-filter', -1)"
        @move-down="emit('move-filter', 1)"
        @remove="emit('remove-filter')"
      />
      <DelayOverdriveControls
        v-else-if="module === 'overdrive' && overdrive"
        section-title="Delay overdrive"
        :id-prefix="`delay-${delayIndex}-overdrive`"
        v-bind="overdrive"
        :can-move-up="moduleIndex('overdrive') > 0"
        :can-move-down="moduleIndex('overdrive') < delayModules.length - 1"
        @update:gain="emit('update:overdrive-gain', $event)"
        @update:feedback="emit('update:overdrive-feedback', $event)"
        @toggle-bypass="emit('update:overdrive-bypassed', !overdrive.bypassed)"
        @move-up="emit('move-overdrive', -1)"
        @move-down="emit('move-overdrive', 1)"
        @remove="emit('remove-overdrive')"
      />
      <ResonatorControls
        v-else-if="module === 'resonator' && resonator"
        section-title="Delay resonator"
        :id-prefix="`delay-${delayIndex}-resonator`"
        v-bind="resonator"
        :can-move-up="moduleIndex('resonator') > 0"
        :can-move-down="moduleIndex('resonator') < delayModules.length - 1"
        @update:frequency="emit('update:resonator', { frequency: $event })"
        @update:decay="emit('update:resonator', { decay: $event })"
        @update:feedback="emit('update:resonator', { feedback: $event })"
        @update:damping="emit('update:resonator', { damping: $event })"
        @update:drive="emit('update:resonator', { drive: $event })"
        @update:mix="emit('update:resonator', { mix: $event })"
        @toggle-bypass="emit('update:resonator', { bypassed: !resonator.bypassed })"
        @move-up="emit('move-resonator', -1)"
        @move-down="emit('move-resonator', 1)"
        @remove="emit('remove-resonator')"
      />
    </template>
    <slot name="modulation" />
  </SectionFrame>
</template>
