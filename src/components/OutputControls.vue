<script setup lang="ts">
import LfoControls from './LfoControls.vue'
import EnvelopeControls from './EnvelopeControls.vue'
import type { EnvelopeDestination, EnvelopeSettings, LfoSettings } from '../services/synthEngine'

type LfoModule = LfoSettings & { bypassed: boolean; index: number }

defineProps<{
  volume: number
  pan: number
  lfos: LfoModule[]
  envelopes: (EnvelopeSettings & { bypassed: boolean; index: number })[]
}>()

const emit = defineEmits<{
  'update:volume': [value: number]
  'update:pan': [value: number]
  updateLfo: [payload: { index: number; settings: Partial<LfoSettings> }]
  toggleLfoBypass: [index: number]
  removeLfo: [index: number]
  updateEnvelope: [payload: { index: number; settings: Partial<EnvelopeSettings> }]
  toggleEnvelopeBypass: [index: number]
  removeEnvelope: [index: number]
  modulate: []
}>()

const lfoTargetOptions = [
  { value: 'output:0:volume', label: 'Volume' },
  { value: 'output:0:pan', label: 'Pan' },
] satisfies { value: LfoSettings['target']; label: string }[]

const envelopeDestinationOptions = [
  { value: 'outputVolume', label: 'Volume' },
  { value: 'outputPan', label: 'Pan' },
] satisfies { value: EnvelopeDestination; label: string }[]
</script>

<template>
  <section class="output-controls ambient amb-surface amb-chamfer amb-rounded-md" aria-labelledby="output-heading">
    <h2 id="output-heading">Output</h2>
    <div class="output-control-grid">
      <label class="control" data-midi-target="output:volume">
        <span>Volume</span>
        <output>{{ Math.round(volume * 100) }}%</output>
        <input type="range" min="0" max="1" step="0.01" :value="volume" @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control" data-midi-target="output:pan">
        <span>Pan</span>
        <output>{{ pan === 0 ? 'Center' : `${pan < 0 ? 'Left' : 'Right'} ${Math.round(Math.abs(pan) * 100)}%` }}</output>
        <input type="range" min="-1" max="1" step="0.01" :value="pan" @input="emit('update:pan', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
    <LfoControls
      :lfos="lfos"
      :target-options="lfoTargetOptions"
      id-prefix="output"
      :show-add-button="false"
      @update="emit('updateLfo', $event)"
      @toggle-bypass="emit('toggleLfoBypass', $event)"
      @remove="emit('removeLfo', $event)"
    />
    <EnvelopeControls
      :envelopes="envelopes"
      :destination-options="envelopeDestinationOptions"
      id-prefix="output"
      :show-add-button="false"
      @update="emit('updateEnvelope', $event)"
      @toggle-bypass="emit('toggleEnvelopeBypass', $event)"
      @remove="emit('removeEnvelope', $event)"
    />
    <button type="button" class="add-env-button" @click="emit('modulate')">+ Mod</button>
  </section>
</template>
