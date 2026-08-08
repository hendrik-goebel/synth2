<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { LfoSettings, LfoTarget, Waveform } from '../services/synthEngine'

type LfoModule = LfoSettings & { bypassed: boolean; index: number }

const MIN_LFO_RATE = 0.1
const MAX_LFO_RATE = 30

defineProps<{
  lfos: LfoModule[]
  targetOptions: { value: LfoTarget; label: string }[]
  idPrefix: string
}>()

const emit = defineEmits<{
  update: [payload: { index: number; settings: Partial<LfoSettings> }]
  toggleBypass: [index: number]
  remove: [index: number]
  add: []
}>()

function logarithmicPosition(value: number): number {
  return Math.log(value / MIN_LFO_RATE) / Math.log(MAX_LFO_RATE / MIN_LFO_RATE)
}

function rateSliderValue(rate: number): number {
  return Math.round(logarithmicPosition(rate) * 1000)
}

function updateRate(lfoIndex: number, event: Event) {
  const position = Number((event.target as HTMLInputElement).value) / 1000
  const rate = MIN_LFO_RATE * Math.pow(MAX_LFO_RATE / MIN_LFO_RATE, position)
  emit('update', { index: lfoIndex, settings: { rate: Math.round(rate * 10) / 10 } })
}
</script>

<template>
  <div class="lfo-list">
    <SectionFrame
      v-for="(lfo, localIndex) in lfos"
      :key="lfo.index"
      class="lfo-section"
      :title="`LFO ${localIndex + 1}`"
      :heading-id="`${idPrefix}-lfo-${lfo.index}-heading`"
      :content-id="`${idPrefix}-lfo-${lfo.index}-content`"
      :bypassed="lfo.bypassed"
      @toggle-bypass="emit('toggleBypass', lfo.index)"
      @remove="emit('remove', lfo.index)"
    >
      <div class="modulation-controls">
        <label class="control"><span>Wave</span><select :value="lfo.waveform" @change="emit('update', { index: lfo.index, settings: { waveform: ($event.target as HTMLSelectElement).value as Waveform } })"><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="sawtooth">Sawtooth</option><option value="square">Square</option><option value="random">Random</option></select></label>
        <label class="control"><span>Rate</span><output>{{ lfo.rate }} Hz</output><input type="range" min="0" max="1000" step="1" :value="rateSliderValue(lfo.rate)" @input="updateRate(lfo.index, $event)"></label>
        <label class="control"><span>Depth</span><output>{{ Math.round(lfo.depth * 100) }}%</output><input type="range" min="0" max="1" step="0.01" :value="lfo.depth" @input="emit('update', { index: lfo.index, settings: { depth: Number(($event.target as HTMLInputElement).value) } })"></label>
        <label class="control"><span>Target</span><select :value="lfo.target" @change="emit('update', { index: lfo.index, settings: { target: ($event.target as HTMLSelectElement).value as LfoTarget } })"><option v-for="option in targetOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </div>
    </SectionFrame>
    <button type="button" class="add-env-button" @click="emit('add')">Add OSC</button>
  </div>
</template>
