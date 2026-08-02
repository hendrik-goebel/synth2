<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
  headingId: string
  contentId: string
  bypassed: boolean
}>()

const emit = defineEmits<{
  'toggle-bypass': []
  remove: []
}>()

const isCollapsed = ref(false)
</script>

<template>
  <section class="section-frame" :aria-labelledby="headingId">
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
