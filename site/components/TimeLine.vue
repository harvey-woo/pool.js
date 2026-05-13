<script setup lang="ts">
// A TimeLine component to display a timeline, including the name of the timeline, the events in the timeline, and the description of the timeline

import { type PropType, computed } from 'vue'

// TimelineMapper interface (only methods we need)
interface TimelineMapperLike {
  absToRel: (time: number) => number | undefined
}

// Event interface - specific to TimeLine component
interface Event {
  id: number
  name: string
  from?: number
  to?: number
  backgroundColor: string
  color: string
}

// Utility: get timeline display info from Event
function getTimelineInfo(event: Event) {
  const from = event.from ?? props.from
  const to = event.to ?? Infinity
  return { from, to }
}

const props = defineProps({
  events: {
    type: Array as PropType<Event[]>,
    default: () => []
  },
  timelineMapper: {
    type: Object as PropType<TimelineMapperLike | null>,
    default: null
  },
  from: {
    type: Number,
    default: 0
  },
  to: {
    type: Number,
    default: 100
  },
  unitWidth: {
    type: Number,
    default: 10
  },
  visibleTimeRange: {
    type: Object as PropType<{ start: number; end: number }>,
    default: () => ({ start: 0, end: Infinity })
  }
})

// Position calculation - use timelineMapper or fallback
function getPosition(time: number): number {
  if (!isFinite(time) || time < 0) {
    return 0
  }

  if (props.timelineMapper) {
    const position = props.timelineMapper.absToRel(time)
    return Math.max(position ?? 0, 0)
  }

  const position = (time - props.from) * props.unitWidth
  return Math.max(position, 0)
}

// Width calculation - use timelineMapper or fallback
function getWidth(fromTime: number, toTime: number): number {
  if (!isFinite(fromTime) || !isFinite(toTime) || fromTime > toTime) {
    return 1
  }

  if (props.timelineMapper) {
    const fromPos = props.timelineMapper.absToRel(fromTime) ?? 0
    const toPos = props.timelineMapper.absToRel(toTime) ?? 0
    const width = toPos - fromPos
    return Math.max(width, 1)
  }

  const width = (toTime - fromTime) * props.unitWidth
  return Math.max(width, 1)
}

// Get event's actual end time (running events use current time)
function getEventEndTime(event: Event): number {
  const timeInfo = getTimelineInfo(event)
  if (isFinite(timeInfo.to)) {
    return timeInfo.to
  }
  return props.to
}

// Check if event is in visible time range (virtual scroll optimization)
function isEventVisible(event: Event): boolean {
  const timeInfo = getTimelineInfo(event)
  const eventStart = timeInfo.from
  const eventEnd = getEventEndTime(event)

  const { start: visibleStart, end: visibleEnd } = props.visibleTimeRange

  return eventStart < visibleEnd && eventEnd > visibleStart
}

// Pre-compute event styles to avoid repeated calculation in template
const eventStyles = computed(() => {
  const visibleEvents = props.events.filter(isEventVisible)

  if (visibleEvents.length === 0) return []

  if (props.timelineMapper) {
    const timePoints = new Set<number>()

    visibleEvents.forEach((event) => {
      const timeInfo = getTimelineInfo(event)
      timePoints.add(timeInfo.from)
      timePoints.add(getEventEndTime(event))
    })

    const positions = new Map<number, number>()
    for (const time of timePoints) {
      const pos = props.timelineMapper.absToRel(time)
      positions.set(time, pos ?? 0)
    }

    return visibleEvents.map((event) => {
      const timeInfo = getTimelineInfo(event)
      const from = timeInfo.from
      const to = getEventEndTime(event)

      const left = positions.get(from) ?? 0
      const rightPos = positions.get(to) ?? 0
      const width = rightPos - left

      const style = {
        transform: `translateX(${left}px)`,
        width: `${Math.max(width, 1)}px`,
        background: event.backgroundColor,
        color: event.color,
        willChange: 'transform'
      }

      return {
        event,
        style,
        isRunning: !isFinite(timeInfo.to),
        tooltip: `事件耗时: ${
          isFinite(timeInfo.to)
            ? `${timeInfo.to - from} ms`
            : `${to - from} ms (进行中...)`
        }`
      }
    })
  }

  return visibleEvents.map((event) => {
    const timeInfo = getTimelineInfo(event)
    const from = timeInfo.from
    const to = getEventEndTime(event)

    const left = getPosition(from)
    const width = getWidth(from, to)

    const style = {
      transform: `translateX(${left}px)`,
      width: `${Math.max(width, 1)}px`,
      background: event.backgroundColor,
      color: event.color,
      willChange: 'transform'
    }

    return {
      event,
      style,
      isRunning: !isFinite(timeInfo.to),
      tooltip: `事件耗时: ${
        isFinite(timeInfo.to)
          ? `${timeInfo.to - from} ms`
          : `${to - from} ms (进行中...)`
      }`
    }
  })
})

const containerStyle = computed(() => ({
  height: '30px',
  position: 'relative',
  overflow: 'hidden'
}))
</script>

<template>
  <transition-group
    name="event-fade"
    tag="div"
    class="time-line_events-container"
    :style="containerStyle"
  >
    <div
      v-for="eventData in eventStyles"
      :key="eventData.event.id"
      class="time-line_event"
      :title="eventData.tooltip"
      :style="eventData.style"
      :class="{
        'time-line_event--running': eventData.isRunning
      }"
    >
      {{ eventData.event.name }}
    </div>
  </transition-group>
</template>

<style scoped>
.time-line_events-container {
  position: relative;
}

.time-line_event {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 12px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 3;
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  left: 0;
  will-change: transform;
  contain: layout style paint;
  backface-visibility: hidden;
}

.time-line_event:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.time-line_event--running::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 200%;
  height: 100%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255, 255, 255, 0.3) 4px,
    rgba(255, 255, 255, 0.3) 8px
  );
  animation: diagonal-scroll 2s linear infinite;
  pointer-events: none;
}

@keyframes diagonal-scroll {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.event-fade-enter-active,
.event-fade-leave-active {
  transition: opacity 0.3s ease;
}

.event-fade-enter-from {
  opacity: 0;
}

.event-fade-leave-to {
  opacity: 0;
}
</style>
