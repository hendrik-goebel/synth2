<script setup lang="ts">
import { ref } from 'vue'
import { isSectionInitiallyOpen } from '../services/sectionCollapse'

const emit = defineEmits<{
  'toggle-bypass': []
  'move-up': []
  'move-down': []
  remove: []
}>()

const props = defineProps<{
  title: string
  headingId: string
  contentId: string
  bypassed: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
}>()

const isCollapsed = ref(!isSectionInitiallyOpen(props.headingId))
</script>

<template>
  <section class="section-frame ambient amb-surface amb-chamfer amb-elevation-1 amb-rounded-md" :aria-labelledby="headingId">
    <header class="section-frame-heading">
      <h2 :id="headingId">
        <button
          type="button"
          class="section-frame-toggle"
          :aria-expanded="!isCollapsed"
          :aria-controls="contentId"
          @click="isCollapsed = !isCollapsed"
        >
          {{ title }}
        </button>
      </h2>
      <div class="module-heading-actions">
        <span v-if="canMoveUp || canMoveDown" class="effect-order-actions">
          <button type="button" :disabled="!canMoveUp" :aria-label="`Move ${title} up`" @click="emit('move-up')">↑</button>
          <button type="button" :disabled="!canMoveDown" :aria-label="`Move ${title} down`" @click="emit('move-down')">↓</button>
        </span>
        <button
          type="button"
          class="module-bypass"
          :aria-pressed="bypassed"
          @click="emit('toggle-bypass')"
        >
          Bypass
        </button>
        <button type="button" class="module-remove" @click="emit('remove')">Remove</button>
      </div>
    </header>

    <div v-show="!isCollapsed" :id="contentId" class="section-frame-content">
      <slot />
    </div>
  </section>
</template>
