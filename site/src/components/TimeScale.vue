<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    currentTime: number
    timeScaleInterval?: number
    timelineMapper: unknown
    visibleTimeRange: { start: number; end: number }
    unitWidth: number
  }>(),
  {
    timeScaleInterval: 300
  }
)

// Get position function
function getPosition(time: number): number {
  const mapper = props.timelineMapper as { absToRel: (t: number) => number | undefined } | null
  if (mapper) {
    const result = mapper.absToRel(time)
    return result !== undefined ? result : 0
  }
  return time * props.unitWidth
}

// Time scale lines - use TimelineMapper logic, ensure positions are monotonically increasing
const timeScaleLines = computed(() => {
  const maxTime = props.currentTime
  const scaleInterval = props.timeScaleInterval || 300

  const scaleCount = Math.floor(maxTime / scaleInterval)
  const lines = Array.from(
    { length: scaleCount + 1 },
    (_, i) => i * scaleInterval
  )

  const mapper = props.timelineMapper as { isInIdle: (t: number) => boolean; absToRel: (t: number) => number | undefined } | null
  if (mapper) {
    const filteredLines: number[] = []
    let lastPosition = -1

    for (const time of lines) {
      if (mapper.isInIdle(time)) {
        continue
      }

      const position = mapper.absToRel(time)
      if (position !== undefined && position > lastPosition) {
        filteredLines.push(time)
        lastPosition = position
      }
    }

    return filteredLines
  }

  return lines
})

// Visible time scale lines (virtual scroll optimization)
const visibleTimeScaleLines = computed(() => {
  const allLines = timeScaleLines.value
  const range = props.visibleTimeRange

  if (allLines.length <= 100) {
    return allLines
  }

  const bufferScale = props.timeScaleInterval || 300
  const startTime = Math.max(0, range.start - bufferScale * 2)
  const endTime = range.end + bufferScale * 2

  return allLines.filter((time) => {
    return time >= startTime && time <= endTime
  })
})
</script>

<template>
  <TransitionGroup name="scale-line" tag="div" class="time-scale-lines">
    <div
      v-for="(time, timeIndex) in visibleTimeScaleLines"
      :key="`scale-${time}`"
      class="time-scale-line"
      :style="{
        '--translate-x': `${getPosition(time)}px`,
        '--enter-delay': timeIndex,
        transform: `translateX(${getPosition(time)}px)`
      }"
      :title="`${time} ms`"
    >
      <div class="time-scale-label">{{ time }}ms</div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.time-scale-lines {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  pointer-events: none;
  will-change: transform;
  transform: translateZ(0);
}

.time-scale-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed #eaeaea;
  z-index: 1;
  left: 0;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.time-scale-label {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 4px;
  border-radius: 2px;
}

.scale-line-enter-active,
.scale-line-leave-active {
  transition: opacity 0.3s ease;
}

.scale-line-enter-from,
.scale-line-leave-to {
  opacity: 0;
}
</style>
