<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'
import type { EnvelopeCurve, EnvelopeDestination, EnvelopeSettings } from '../services/synthEngine'

type EnvelopeModule = EnvelopeSettings & { bypassed: boolean }

defineProps<{
  envelopes: (EnvelopeModule & { index: number })[]
  destinationOptions: { value: EnvelopeDestination; label: string }[]
  idPrefix: string
}>()

const emit = defineEmits<{
  update: [payload: { index: number; settings: Partial<EnvelopeSettings> }]
  toggleBypass: [index: number]
  remove: [index: number]
  add: []
}>()
</script>

<template>
  <div class="envelope-list">
    <SectionFrame
      v-for="(envelope, localIndex) in envelopes"
      :key="envelope.index"
      class="envelope-section"
      :title="`Envelope ${localIndex + 1}`"
      :heading-id="`${idPrefix}-envelope-${envelope.index}-heading`"
      :content-id="`${idPrefix}-envelope-${envelope.index}-content`"
      :bypassed="envelope.bypassed"
      @toggle-bypass="emit('toggleBypass', envelope.index)"
      @remove="emit('remove', envelope.index)"
    >
      <div class="modulation-controls envelope-controls">
        <label class="control"><span>Attack</span><output>{{ envelope.attack }} ms</output><input type="range" min="0" max="300" :value="envelope.attack" @input="emit('update', { index: envelope.index, settings: { attack: Number(($event.target as HTMLInputElement).value) } })"></label>
        <label class="control"><span>Decay</span><output>{{ envelope.decay }} ms</output><input type="range" min="0" max="150" :value="envelope.decay" @input="emit('update', { index: envelope.index, settings: { decay: Number(($event.target as HTMLInputElement).value) } })"></label>
        <label class="control"><span>Hold</span><output>{{ envelope.hold }} ms</output><input type="range" min="0" max="150" :value="envelope.hold" @input="emit('update', { index: envelope.index, settings: { hold: Number(($event.target as HTMLInputElement).value) } })"></label>
        <label class="control"><span>Release</span><output>{{ envelope.release }} ms</output><input type="range" min="0" max="450" :value="envelope.release" @input="emit('update', { index: envelope.index, settings: { release: Number(($event.target as HTMLInputElement).value) } })"></label>
        <label class="control"><span>Velocity</span><output>{{ Math.round(envelope.velocity * 100) }}%</output><input type="range" min="0" max="1" step="0.01" :value="envelope.velocity" @input="emit('update', { index: envelope.index, settings: { velocity: Number(($event.target as HTMLInputElement).value) } })"></label>
        <label class="control"><span>Attack Curve</span><select :value="envelope.attackCurve" @change="emit('update', { index: envelope.index, settings: { attackCurve: ($event.target as HTMLSelectElement).value as EnvelopeCurve } })"><option value="linear">Linear</option><option value="exponential">Exponential</option></select></label>
        <label class="control"><span>Release Curve</span><select :value="envelope.releaseCurve" @change="emit('update', { index: envelope.index, settings: { releaseCurve: ($event.target as HTMLSelectElement).value as EnvelopeCurve } })"><option value="linear">Linear</option><option value="exponential">Exponential</option></select></label>
        <label class="control"><span>Target</span><select :value="envelope.destination" @change="emit('update', { index: envelope.index, settings: { destination: ($event.target as HTMLSelectElement).value as EnvelopeDestination } })"><option v-for="option in destinationOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </div>
    </SectionFrame>
    <button type="button" class="add-env-button" @click="emit('add')">Add ENV</button>
  </div>
</template>
