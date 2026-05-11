<script setup lang="ts">
import { computed } from 'vue'

interface GlobalIdleSlot {
  from: number
  to: number
}

const props = withDefaults(
  defineProps<{
    timelineMapper: unknown
    visibleTimeRange: { start: number; end: number }
    timeScaleInterval?: number
    idleSlotWidth?: number
    unitWidth: number
  }>(),
  {
    timeScaleInterval: 300,
    idleSlotWidth: 20
  }
)

function getPosition(time: number): number {
  const mapper = props.timelineMapper as { absToRel: (t: number) => number | undefined; getIdleSlots: () => { from: number; to: number }[] } | null
  if (mapper) {
    const result = mapper.absToRel(time)
    return result !== undefined ? result : 0
  }
  return time * props.unitWidth
}

// Global idle slots from TimelineMapper
const globalIdleSlots = computed((): GlobalIdleSlot[] => {
  const mapper = props.timelineMapper as { getIdleSlots: () => { from: number; to: number }[] } | null
  if (!mapper) {
    return []
  }

  const idleSlots = mapper.getIdleSlots()

  return idleSlots.map((slot) => ({
    from: slot.from,
    to: slot.to
  }))
})

// Visible idle slots (virtual scroll optimization)
const visibleIdleSlots = computed(() => {
  const slots = globalIdleSlots.value

  if (slots.length === 0) return []

  if (slots.length <= 50) {
    return slots
  }

  const range = props.visibleTimeRange
  const bufferTime = (props.timeScaleInterval || 300) * 2
  const startTime = Math.max(0, range.start - bufferTime)
  const endTime = range.end + bufferTime

  return slots.filter((slot) => {
    return slot.to >= startTime && slot.from <= endTime
  })
})
</script>

<template>
  <TransitionGroup name="idle-slot" tag="div" class="global-idle-slots">
    <div
      v-for="(idleSlot, index) in visibleIdleSlots"
      :key="`global-idle-${idleSlot.from}-${idleSlot.to}-${index}`"
      class="global-idle-slot"
      :style="{
        '--translate-x': `${getPosition(idleSlot.from)}px`,
        '--enter-delay': index,
        transform: `translateX(${getPosition(idleSlot.from)}px)`,
        width: `${Math.max(getPosition(idleSlot.to) - getPosition(idleSlot.from), props.idleSlotWidth)}px`
      }"
      :title="`全局空闲: ${idleSlot.from}-${idleSlot.to}ms (持续 ${idleSlot.to - idleSlot.from}ms)`"
    >
      <div class="idle-slot-info">
        <span class="idle-duration"> {{ idleSlot.to - idleSlot.from }}ms</span>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.global-idle-slots {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
  will-change: transform;
  transform: translateZ(0);
}

.global-idle-slot {
  position: absolute;
  top: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(100, 100, 100, 0.15),
    rgba(100, 100, 100, 0.15) 4px,
    rgba(180, 180, 180, 0.25) 4px,
    rgba(180, 180, 180, 0.25) 8px
  );
  border: 1px dashed rgba(100, 100, 100, 0.6);
  border-radius: 4px;
  pointer-events: auto;
  left: 0;
  backface-visibility: hidden;
  will-change: transform, opacity;
  transition: all 0.2s ease;
  transition-property: background, border-color, box-shadow;
}

.global-idle-slot:hover {
  background: repeating-linear-gradient(
    45deg,
    rgba(100, 100, 100, 0.2),
    rgba(100, 100, 100, 0.2) 4px,
    rgba(180, 180, 180, 0.3) 4px,
    rgba(180, 180, 180, 0.3) 8px
  );
  border-color: rgba(100, 100, 100, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.idle-slot-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.global-idle-slot:hover .idle-slot-info {
  opacity: 1;
}

.idle-duration {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.idle-slot-enter-active,
.idle-slot-leave-active {
  transition: opacity 0.3s ease;
}

.idle-slot-enter-from,
.idle-slot-leave-to {
  opacity: 0;
}
</style>
