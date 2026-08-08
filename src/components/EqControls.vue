<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { EqBandSettings, EqBandType } from '../services/synthEngine'

const props = defineProps<{
  eqIndex: number
  eqCount: number
  bypassed: boolean
  kind: 'single' | 'multiband'
  bands: EqBandSettings[]
}>()

const emit = defineEmits<{
  'update:band': [value: { index: number; changes: Partial<EqBandSettings> }]
  'toggle-bypass': []
  'toggle-band-bypass': [index: number]
  'add-band': []
  'remove-band': [index: number]
  'move-up': []
  'move-down': []
  remove: []
}>()

const eqBandTypes: readonly EqBandType[] = ['peaking', 'lowshelf', 'highshelf', 'lowpass', 'highpass', 'notch']

function logarithmicPosition(value: number, min: number, max: number): number {
  return Math.log(value / min) / Math.log(max / min)
}

function logarithmicValue(position: number, min: number, max: number): number {
  return min * Math.pow(max / min, position)
}

function frequencySliderValue(value: number): number {
  return logarithmicPosition(value, 20, 20000) * 1000
}

function qSliderValue(value: number): number {
  return logarithmicPosition(value, 0.1, 18) * 1000
}

function updateFrequency(index: number, event: Event) {
  const position = Number((event.target as HTMLInputElement).value) / 1000
  emit('update:band', { index, changes: { frequency: Math.round(logarithmicValue(position, 20, 20000)) } })
}

function updateQ(index: number, event: Event) {
  const position = Number((event.target as HTMLInputElement).value) / 1000
  emit('update:band', { index, changes: { q: Math.round(logarithmicValue(position, 0.1, 18) * 100) / 100 } })
}

function isEqBandType(value: string): value is EqBandType {
  return eqBandTypes.some((type) => type === value)
}

function updateType(index: number, event: Event) {
  const type = (event.target as HTMLSelectElement).value
  if (isEqBandType(type)) emit('update:band', { index, changes: { type } })
}

function supportsGain(type: EqBandType): boolean {
  return type === 'peaking' || type === 'lowshelf' || type === 'highshelf'
}
</script>

<template>
  <SectionFrame
    class="eq-controls"
    :title="`${kind === 'single' ? 'EQ' : 'Parametric EQ'} ${eqIndex + 1}`"
    :heading-id="`eq-${eqIndex}-heading`"
    :content-id="`eq-${eqIndex}-content`"
    :bypassed="bypassed"
    :can-move-up="eqIndex > 0"
    :can-move-down="eqIndex < eqCount - 1"
    @toggle-bypass="emit('toggle-bypass')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
    @remove="emit('remove')"
  >
    <div class="eq-bands">
      <section v-for="(band, bandIndex) in bands" :key="bandIndex" class="eq-band">
        <header class="eq-band-header">
          <strong>{{ kind === 'single' ? 'Band' : `Band ${bandIndex + 1}` }}</strong>
          <div class="eq-band-actions">
            <button type="button" class="module-bypass" :aria-pressed="band.bypassed" @click="emit('toggle-band-bypass', bandIndex)">Bypass</button>
            <button v-if="kind === 'multiband'" type="button" class="module-remove" @click="emit('remove-band', bandIndex)">Remove</button>
          </div>
        </header>
        <div class="eq-band-controls">
          <label class="control">
            <span>Type</span>
            <select :value="band.type" @change="updateType(bandIndex, $event)">
              <option value="peaking">Peaking</option>
              <option value="lowshelf">Low shelf</option>
              <option value="highshelf">High shelf</option>
              <option value="lowpass">Low-pass</option>
              <option value="highpass">High-pass</option>
              <option value="notch">Notch</option>
            </select>
          </label>
          <label class="control">
            <span>Frequency</span>
            <output>{{ band.frequency }} Hz</output>
            <input type="range" min="0" max="1000" step="1" :value="frequencySliderValue(band.frequency)" @input="updateFrequency(bandIndex, $event)">
          </label>
          <label class="control">
            <span>Q</span>
            <output>{{ band.q }}</output>
            <input type="range" min="0" max="1000" step="1" :value="qSliderValue(band.q)" @input="updateQ(bandIndex, $event)">
          </label>
          <label v-if="supportsGain(band.type)" class="control">
            <span>Gain</span>
            <output>{{ band.gain }} dB</output>
            <input type="range" min="-24" max="24" step="0.1" :value="band.gain" @input="emit('update:band', { index: bandIndex, changes: { gain: Number(($event.target as HTMLInputElement).value) } })">
          </label>
        </div>
      </section>
    </div>
    <button v-if="kind === 'multiband'" type="button" class="add-eq-button" @click="emit('add-band')">Add band</button>
  </SectionFrame>
</template>
