<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  unitWidth: number
  autoScrollEnabled: boolean
  enableIdleCompression: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined
})

const emit = defineEmits<{
  'update:unitWidth': [value: number]
  'update:autoScrollEnabled': [value: boolean]
  'update:enableIdleCompression': [value: boolean]
}>()

const internalUnitWidth = computed({
  get: () => props.unitWidth,
  set: (value: number) => emit('update:unitWidth', value)
})

const internalAutoScrollEnabled = computed({
  get: () => props.autoScrollEnabled,
  set: (value: boolean) => emit('update:autoScrollEnabled', value)
})

const internalEnableIdleCompression = computed({
  get: () => props.enableIdleCompression,
  set: (value: boolean) => emit('update:enableIdleCompression', value)
})
</script>

<template>
  <div class="timeline-header">
    <h3>{{ title ?? $t('timelineHeader.defaultTitle') }}</h3>
    <div class="timeline-controls">
      <div class="unit-width-control">
        <label for="unit-width-slider">{{ $t('timelineHeader.zoomLabel') }}:</label>
        <input
          id="unit-width-slider"
          v-model.number="internalUnitWidth"
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          class="unit-width-slider"
        />
        <span class="unit-width-value">{{ internalUnitWidth.toFixed(1) }}</span>
      </div>
      <label class="auto-scroll-toggle">
        <input v-model="internalAutoScrollEnabled" type="checkbox" />
        {{ $t('timelineHeader.autoScroll') }}
      </label>
      <label class="idle-compression-toggle">
        <input v-model="internalEnableIdleCompression" type="checkbox" />
        {{ $t('timelineHeader.enableIdleCompression') }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 10px;
}

.timeline-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.unit-width-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.unit-width-control label {
  font-weight: 500;
  white-space: nowrap;
}

.unit-width-slider {
  width: 120px;
  height: 4px;
  border-radius: 2px;
  background: #ddd;
  outline: none;
  cursor: pointer;
}

.unit-width-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007acc;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.unit-width-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007acc;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.unit-width-value {
  min-width: 25px;
  text-align: center;
  font-weight: 500;
  color: #007acc;
  font-size: 12px;
}

.auto-scroll-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  user-select: none;
}

.auto-scroll-toggle input[type='checkbox'] {
  cursor: pointer;
}

.idle-compression-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  user-select: none;
}

.idle-compression-toggle input[type='checkbox'] {
  cursor: pointer;
}
</style>
