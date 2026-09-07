<script setup lang="ts">
import { ref } from 'vue'

type CustomSliderAssignment = {
  targetId: string
  baseline: number
  reversed?: boolean
}

type CustomSlider = {
  id: string
  value: number
  assignments: CustomSliderAssignment[]
}

defineProps<{
  sliders: CustomSlider[]
  learningSliderId: string | null
  targetLabels: Record<string, string>
}>()

const emit = defineEmits<{
  add: []
  update: [payload: { id: string; value: number }]
  learn: [id: string]
  toggleAssignmentReverse: [payload: { sliderId: string; targetId: string }]
  removeAssignment: [payload: { sliderId: string; targetId: string }]
  remove: [id: string]
}>()

const isCollapsed = ref(false)
</script>

<template>
  <section class="custom-sliders ambient amb-surface amb-chamfer amb-rounded-md" aria-labelledby="custom-sliders-heading">
    <div class="custom-sliders-heading">
      <h2 id="custom-sliders-heading">
        <button
          type="button"
          class="section-frame-toggle"
          :aria-expanded="!isCollapsed"
          aria-controls="custom-sliders-content"
          @click="isCollapsed = !isCollapsed"
        >Custom Sliders</button>
      </h2>
      <button type="button" class="add-custom-slider-button" aria-label="Add custom slider" @click="emit('add')">+</button>
    </div>
    <div v-show="!isCollapsed" id="custom-sliders-content" class="custom-sliders-content">
      <p v-if="!sliders.length" class="custom-sliders-empty"></p>
      <div v-else class="custom-slider-list">
        <article v-for="(slider, index) in sliders" :key="slider.id" class="custom-slider">
          <div class="custom-slider-header">
            <label class="control custom-slider-control" :data-midi-target="`custom-slider:${slider.id}`">
              <span>Slider {{ index + 1 }}</span>
              <output>{{ Math.round(slider.value * 100) }}%</output>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="slider.value"
                @input="emit('update', { id: slider.id, value: Number(($event.target as HTMLInputElement).value) })"
              >
            </label>
            <div class="custom-slider-actions">
              <button
                type="button"
                :class="{ 'midi-learn-active': learningSliderId === slider.id }"
                :aria-pressed="learningSliderId === slider.id"
                @click="emit('learn', slider.id)"
              >{{ learningSliderId === slider.id ? 'Learning...' : 'Learn' }}</button>
              <button type="button" class="module-remove" :aria-label="`Delete Slider ${index + 1}`" @click="emit('remove', slider.id)">−</button>
            </div>
          </div>
          <ul v-if="slider.assignments.length" class="custom-slider-assignments" :aria-label="`Slider ${index + 1} assignments`">
            <li v-for="assignment in slider.assignments" :key="assignment.targetId">
              <span>{{ targetLabels[assignment.targetId] ?? assignment.targetId }}</span>
              <div class="custom-slider-assignment-actions">
                <button
                  type="button"
                  class="midi-reverse-assignment"
                  :aria-pressed="assignment.reversed === true"
                  :aria-label="`Reverse ${targetLabels[assignment.targetId] ?? assignment.targetId}`"
                  title="Reverse this assignment"
                  @click="emit('toggleAssignmentReverse', { sliderId: slider.id, targetId: assignment.targetId })"
                >R</button>
                <button type="button" class="midi-remove-assignment" :aria-label="`Remove ${targetLabels[assignment.targetId] ?? assignment.targetId}`" @click="emit('removeAssignment', { sliderId: slider.id, targetId: assignment.targetId })">−</button>
              </div>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>
