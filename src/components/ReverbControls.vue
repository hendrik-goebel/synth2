<script setup lang="ts">
import { computed } from 'vue'
import SectionFrame from './SectionFrame.vue'
import DelayFilterControls from './DelayFilterControls.vue'
import DelayOverdriveControls from './DelayOverdriveControls.vue'
import ResonatorControls from './ResonatorControls.vue'
import type { DelayOverdriveSettings, FilterSettings, HallType, ResonatorSettings, ReverbModuleKind } from '../services/synthEngine'

const props = defineProps<{
  reverbIndex: number
  bypassed: boolean
  hallType: HallType
  decay: number
  preDelay: number
  damping: number
  width: number
  mix: number
  filter?: FilterSettings
  overdrive?: DelayOverdriveSettings
  resonator?: ResonatorSettings
  moduleOrder?: ReverbModuleKind[]
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:hallType': [value: HallType]
  'update:decay': [value: number]
  'update:preDelay': [value: number]
  'update:damping': [value: number]
  'update:width': [value: number]
  'update:mix': [value: number]
  'update:filter': [settings: Partial<FilterSettings>]
  'update:resonator': [settings: Partial<ResonatorSettings>]
  'update:overdrive-gain': [value: number]
  'update:overdrive-feedback': [value: number]
  'update:overdrive-bypassed': [value: boolean]
  'toggle-filter-bypass': []
  'move-filter': [direction: -1 | 1]
  'move-overdrive': [direction: -1 | 1]
  'move-resonator': [direction: -1 | 1]
  'remove-filter': []
  'remove-overdrive': []
  'remove-resonator': []
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()

const reverbModules = computed<ReverbModuleKind[]>(() => {
  const modules: ReverbModuleKind[] = [
    ...(props.filter ? ['filter'] as const : []),
    ...(props.overdrive ? ['overdrive'] as const : []),
    ...(props.resonator ? ['resonator'] as const : []),
  ]
  const order = (props.moduleOrder ?? []).filter((module, index, values) => modules.includes(module) && values.indexOf(module) === index)
  return [...order, ...modules.filter((module) => !order.includes(module))]
})

function moduleIndex(module: ReverbModuleKind): number {
  return reverbModules.value.indexOf(module)
}
</script>

<template>
  <SectionFrame
    :title="`Reverb ${reverbIndex + 1}`"
    :heading-id="`reverb-${reverbIndex}-heading`"
    :content-id="`reverb-${reverbIndex}-content`"
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
        <span>Hall</span>
        <select :value="hallType" @change="emit('update:hallType', ($event.target as HTMLSelectElement).value as HallType)">
          <option value="small-hall">Small Hall</option>
          <option value="wooden-hall">Wooden Hall</option>
          <option value="concert-hall">Concert Hall</option>
          <option value="opera-house">Opera House</option>
          <option value="cathedral">Cathedral</option>
          <option value="arena">Arena</option>
        </select>
      </label>
      <label class="control" :data-midi-target="`reverbs:${reverbIndex}:decay`">
        <span>Decay</span>
        <output>{{ decay.toFixed(1) }} s</output>
        <input type="range" min="0.6" max="10" step="0.1" :value="decay" @input="emit('update:decay', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="`reverbs:${reverbIndex}:preDelay`">
        <span>Pre-delay</span>
        <output>{{ Math.round(preDelay * 1000) }} ms</output>
        <input type="range" min="0" max="0.2" step="0.005" :value="preDelay" @input="emit('update:preDelay', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="`reverbs:${reverbIndex}:damping`">
        <span>Damping</span>
        <output>{{ Math.round(damping * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="damping" @input="emit('update:damping', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="`reverbs:${reverbIndex}:width`">
        <span>Width</span>
        <output>{{ Math.round(width * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="width" @input="emit('update:width', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" :data-midi-target="`reverbs:${reverbIndex}:mix`">
        <span>Mix</span>
        <output>{{ Math.round(mix * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="mix" @input="emit('update:mix', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <template v-for="module in reverbModules" :key="module">
      <DelayFilterControls
        v-if="module === 'filter' && filter"
        section-title="Reverb filter"
        :id-prefix="`reverb-${reverbIndex}-filter`"
        :midi-target-prefix="`reverbs:${reverbIndex}:filter`"
        :filter="filter"
        :can-move-up="moduleIndex('filter') > 0"
        :can-move-down="moduleIndex('filter') < reverbModules.length - 1"
        @update="emit('update:filter', $event)"
        @toggle-bypass="emit('toggle-filter-bypass')"
        @move-up="emit('move-filter', -1)"
        @move-down="emit('move-filter', 1)"
        @remove="emit('remove-filter')"
      />
      <DelayOverdriveControls
        v-else-if="module === 'overdrive' && overdrive"
        section-title="Reverb overdrive"
        :id-prefix="`reverb-${reverbIndex}-overdrive`"
        :midi-target-prefix="`reverbs:${reverbIndex}:overdrive`"
        v-bind="overdrive"
        :can-move-up="moduleIndex('overdrive') > 0"
        :can-move-down="moduleIndex('overdrive') < reverbModules.length - 1"
        @update:gain="emit('update:overdrive-gain', $event)"
        @update:feedback="emit('update:overdrive-feedback', $event)"
        @toggle-bypass="emit('update:overdrive-bypassed', !overdrive.bypassed)"
        @move-up="emit('move-overdrive', -1)"
        @move-down="emit('move-overdrive', 1)"
        @remove="emit('remove-overdrive')"
      />
      <ResonatorControls
        v-else-if="module === 'resonator' && resonator"
        section-title="Reverb resonator"
        :id-prefix="`reverb-${reverbIndex}-resonator`"
        :midi-target-prefix="`reverbs:${reverbIndex}:resonator`"
        v-bind="resonator"
        :can-move-up="moduleIndex('resonator') > 0"
        :can-move-down="moduleIndex('resonator') < reverbModules.length - 1"
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
