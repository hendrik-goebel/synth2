<script setup lang="ts">
import SectionFrame from './SectionFrame.vue'

defineProps<{
  dynamicsIndex: number
  bypassed: boolean
  threshold: number
  knee: number
  ratio: number
  attack: number
  release: number
  makeupGain: number
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  'update:threshold': [value: number]
  'update:knee': [value: number]
  'update:ratio': [value: number]
  'update:attack': [value: number]
  'update:release': [value: number]
  'update:makeupGain': [value: number]
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()
</script>

<template>
  <SectionFrame
    :title="`Compressor ${dynamicsIndex + 1}`"
    :heading-id="`dynamics-${dynamicsIndex}-heading`"
    :content-id="`dynamics-${dynamicsIndex}-content`"
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
        <span>Threshold</span>
        <output>{{ threshold }} dB</output>
        <input type="range" min="-60" max="0" step="0.5" :value="threshold" @input="emit('update:threshold', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Knee</span>
        <output>{{ knee }} dB</output>
        <input type="range" min="0" max="40" step="0.5" :value="knee" @input="emit('update:knee', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Ratio</span>
        <output>{{ ratio }}:1</output>
        <input type="range" min="1" max="20" step="0.5" :value="ratio" @input="emit('update:ratio', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Attack</span>
        <output>{{ Math.round(attack * 1000) }} ms</output>
        <input type="range" min="0" max="1" step="0.001" :value="attack" @input="emit('update:attack', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Release</span>
        <output>{{ Math.round(release * 1000) }} ms</output>
        <input type="range" min="0.01" max="1" step="0.001" :value="release" @input="emit('update:release', Number(($event.target as HTMLInputElement).value))">
      </label>
      <label class="control">
        <span>Makeup Gain</span>
        <output>{{ makeupGain }} dB</output>
        <input type="range" min="0" max="24" step="0.5" :value="makeupGain" @input="emit('update:makeupGain', Number(($event.target as HTMLInputElement).value))">
      </label>
    </div>
  </SectionFrame>
</template>
