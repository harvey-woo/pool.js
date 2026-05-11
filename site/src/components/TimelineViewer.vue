<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  TransitionGroup
} from 'vue'
import TimeLine from './TimeLine.vue'
import TimeScale from './TimeScale.vue'
import IdleSlots from './IdleSlots.vue'
import {
  TimelineMapper,
  type Duration,
  type IdleCompressCallback
} from './TimelineMapper'

interface Event {
  id: number
  name: string
  from?: number
  to?: number
  backgroundColor: string
  color: string
}

interface TimeLineData {
  name: string
  events: Event[]
}

const props = withDefaults(
  defineProps<{
    timeLineData: TimeLineData[]
    startTime: number
    endTime: number
    timeScaleInterval?: number
    unitWidth?: number
    labelWidth?: number
    currentTime?: number
    enableVirtualScroll?: boolean
    virtualScrollBuffer?: number
    autoScrollEnabled?: boolean
    enableIdleCompression?: boolean
    idleSlotWidth?: number
  }>(),
  {
    timeScaleInterval: 300,
    unitWidth: 0.3,
    labelWidth: 110,
    currentTime: undefined,
    enableVirtualScroll: true,
    virtualScrollBuffer: 5,
    autoScrollEnabled: true,
    enableIdleCompression: true,
    idleSlotWidth: 20
  }
)

const emit = defineEmits<{
  'user-scrolled': []
  'update:unitWidth': [value: number]
  'update:autoScrollEnabled': [value: boolean]
}>()

const timelineContainerRef = ref<HTMLElement>()
const userScrolledManually = ref(false)
const scrollLeft = ref(0)
const containerWidth = ref(0)

let scrollTimeout: ReturnType<typeof setTimeout> | undefined
let scrollDebounceTimeout: ReturnType<typeof setTimeout> | undefined

const timelineMapper = ref<TimelineMapper | null>(null)

function getEventTimeInfo(event: Event) {
  const from = event.from ?? 0
  const to = event.to ?? Infinity
  return { from, to }
}

const maxEventEndTime = computed(() => {
  let maxEndTime = props.endTime

  props.timeLineData.forEach((timeline) => {
    timeline.events.forEach((event) => {
      const { to } = getEventTimeInfo(event)
      if (isFinite(to) && to > maxEndTime) {
        maxEndTime = to
      }
    })
  })

  return maxEndTime
})

function initTimelineMapper() {
  try {
    const allEvents: Duration[] = []

    props.timeLineData.forEach((timeline) => {
      timeline.events.forEach((event) => {
        const { from, to } = getEventTimeInfo(event)
        if (isFinite(to) && to > from) {
          allEvents.push({ from, to })
        }
      })
    })

    const idleCompressCallback: IdleCompressCallback | undefined =
      props.enableIdleCompression ? () => props.idleSlotWidth : undefined

    const mapper = new TimelineMapper(
      allEvents,
      props.unitWidth,
      idleCompressCallback,
      props.startTime,
      props.endTime
    )

    timelineMapper.value = mapper
  } catch (error) {
    console.warn('TimelineMapper 初始化失败:', error)
    timelineMapper.value = null
  }
}

watch(
  [
    () => props.timeLineData,
    () => props.startTime,
    () => props.endTime,
    () => props.unitWidth,
    () => props.enableIdleCompression,
    () => props.idleSlotWidth
  ],
  () => {
    initTimelineMapper()
  },
  { deep: true, immediate: true }
)

const visibleTimeRange = computed(() => {
  const container = timelineContainerRef.value
  const mapper = timelineMapper.value

  if (!container || !mapper) {
    return { start: props.startTime, end: props.endTime }
  }

  const scrollLeftPos = scrollLeft.value
  const containerWidthValue = containerWidth.value

  const visibleStartRel = scrollLeftPos
  const visibleEndRel = scrollLeftPos + containerWidthValue

  const visibleStartAbs = mapper.relToAbs(visibleStartRel) ?? props.startTime
  const visibleEndAbs = mapper.relToAbs(visibleEndRel) ?? props.endTime

  return {
    start: Math.max(props.startTime, visibleStartAbs),
    end: Math.min(props.endTime, visibleEndAbs)
  }
})

const virtualScrollData = computed(() => {
  if (!props.enableVirtualScroll || props.timeLineData.length <= 20) {
    return {
      visibleItems: props.timeLineData,
      startIndex: 0,
      endIndex: props.timeLineData.length
    }
  }

  return {
    visibleItems: props.timeLineData,
    startIndex: 0,
    endIndex: props.timeLineData.length
  }
})

function forceRecalculateVisibleRange() {
  // Force recalculate visible range
}

watch(containerWidth, (newWidth, oldWidth) => {
  if (newWidth !== oldWidth && oldWidth > 0) {
    forceRecalculateVisibleRange()
  }
})

const isGlobalIdle = computed(() => {
  if (props.timeLineData.length === 0) {
    return true
  }

  const hasRunningTasks = props.timeLineData.some((timeline) => {
    return timeline.events.some(
      (event) => event.to !== undefined && !isFinite(event.to)
    )
  })

  return !hasRunningTasks
})

function updateContainerSize() {
  if (timelineContainerRef.value) {
    containerWidth.value = timelineContainerRef.value.clientWidth
  }
}

let lastScrollUpdate = 0
const SCROLL_THROTTLE_DELAY = 16

function throttledUpdateScrollLeft(container: HTMLElement) {
  const now = Date.now()
  if (now - lastScrollUpdate >= SCROLL_THROTTLE_DELAY) {
    lastScrollUpdate = now
    scrollLeft.value = container.scrollLeft

    requestAnimationFrame(() => {
      updateContainerSize()
    })
  }
}

function handleUserScroll() {
  userScrolledManually.value = true
  emit('user-scrolled')

  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }

  scrollTimeout = setTimeout(() => {
    userScrolledManually.value = false
  }, 300)
}

function handleContainerScroll() {
  const container = timelineContainerRef.value
  if (!container) return

  throttledUpdateScrollLeft(container)
  handleUserScroll()
}

function smoothScrollToEnd(container: HTMLElement) {
  const targetScrollLeft = container.scrollWidth - container.clientWidth

  if (Math.abs(container.scrollLeft - targetScrollLeft) < 5) {
    container.scrollLeft = targetScrollLeft
    return
  }

  container.scrollTo({
    left: targetScrollLeft,
    behavior: 'smooth'
  })
}

function scrollToTime(time: number, smooth = true) {
  const container = timelineContainerRef.value
  const mapper = timelineMapper.value

  if (!container || !mapper) {
    return
  }

  const position = mapper.absToRel(time)
  if (position === null || position === undefined) {
    return
  }

  const containerWidth = container.clientWidth
  const targetScrollLeft = Math.max(0, position - containerWidth / 2)

  if (smooth) {
    container.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    })
  } else {
    container.scrollLeft = targetScrollLeft
  }
}

function autoScrollToEnd() {
  if (
    timelineContainerRef.value &&
    props.autoScrollEnabled &&
    !userScrolledManually.value
  ) {
    if (scrollDebounceTimeout) {
      clearTimeout(scrollDebounceTimeout)
    }

    scrollDebounceTimeout = setTimeout(() => {
      if (
        timelineContainerRef.value &&
        props.autoScrollEnabled &&
        !userScrolledManually.value
      ) {
        const container = timelineContainerRef.value

        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
        scrollTimeout = setTimeout(() => {
          smoothScrollToEnd(container)
        }, 300)
      }
    }, 200)
  }
}

watch(
  () => props.endTime,
  () => {
    if (!isGlobalIdle.value) {
      autoScrollToEnd()
    }
  }
)

watch(
  () => props.currentTime,
  (newTime, oldTime) => {
    if (
      newTime !== undefined &&
      !userScrolledManually.value &&
      newTime !== oldTime
    ) {
      nextTick(() => {
        scrollToTime(newTime, true)
      })
    }
  },
  { immediate: true }
)

const timelineWidth = computed(() => {
  const maxEndTime = maxEventEndTime.value

  if (timelineMapper.value) {
    const width = timelineMapper.value.absToRel(maxEndTime)
    return Math.max(width ?? 100, 100)
  }

  const width = maxEndTime * props.unitWidth
  return Math.max(width, 100)
})

const timelineWrapperStyle = computed(() => ({
  width: `${timelineWidth.value}px`,
  overflow: 'hidden'
}))

onMounted(() => {
  updateContainerSize()

  window.addEventListener('resize', updateContainerSize)

  const updateInterval = setInterval(() => {
    const hasRunningTasks = props.timeLineData.some((timeline) =>
      timeline.events.some((event) => !isFinite(getEventTimeInfo(event).to))
    )

    if (hasRunningTasks) {
      // Running tasks need real-time update
    }
  }, 100)

  onUnmounted(() => {
    clearInterval(updateInterval)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize)
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  if (scrollDebounceTimeout) {
    clearTimeout(scrollDebounceTimeout)
  }
})

defineExpose({
  autoScrollToEnd,
  smoothScrollToEnd: () => {
    if (timelineContainerRef.value) {
      smoothScrollToEnd(timelineContainerRef.value)
    }
  },
  scrollToTime,
  refreshVirtualScroll: () => {
    forceRecalculateVisibleRange()
  }
})
</script>

<template>
  <div class="timeline-viewer">
    <div
      class="timeline-labels-column"
      :style="{ width: `${props.labelWidth}px` }"
    >
      <div
        v-for="(timeLine, index) in virtualScrollData.visibleItems"
        :key="`label-${timeLine.name}-${virtualScrollData.startIndex + index}`"
        class="timeline-label"
      >
        {{ timeLine.name }}
      </div>
    </div>

    <div
      ref="timelineContainerRef"
      class="timeline-container"
      :style="{
        '--label-width': `${props.labelWidth}px`,
        paddingLeft: `${props.labelWidth}px`
      }"
      @scroll="handleContainerScroll"
    >
      <TimeScale
        :current-time="props.currentTime ?? props.endTime"
        :time-scale-interval="props.timeScaleInterval"
        :timeline-mapper="timelineMapper as any"
        :visible-time-range="visibleTimeRange"
        :unit-width="props.unitWidth"
        :style="{ left: `${props.labelWidth}px` }"
      />

      <IdleSlots
        :timeline-mapper="timelineMapper as any"
        :visible-time-range="visibleTimeRange"
        :time-scale-interval="props.timeScaleInterval"
        :idle-slot-width="props.idleSlotWidth"
        :unit-width="props.unitWidth"
        :style="{ left: `${props.labelWidth}px` }"
      />

      <div class="timeline-item-container" :style="timelineWrapperStyle">
        <div
          v-for="(timeLine, index) in virtualScrollData.visibleItems"
          :key="`timeline-wrapper-${timeLine.name}-${virtualScrollData.startIndex + index}`"
          class="timeline-item-wrapper"
        >
          <TimeLine
            :key="`timeline-${timeLine.name}-${virtualScrollData.startIndex + index}`"
            class="timeline-item"
            :from="props.startTime"
            :to="props.endTime"
            :events="timeLine.events"
            :timeline-mapper="timelineMapper"
            :unit-width="props.unitWidth"
            :visible-time-range="visibleTimeRange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-viewer {
  width: 100%;
  position: relative;
}

.timeline-container {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  width: 100%;
  height: auto;
  min-height: 200px;
  padding: 20px 0 10px;
  transform: translateZ(0);
  scroll-behavior: smooth;
  contain: layout style paint;
  --label-width: 110px;
}

.timeline-labels-column {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background-color: #fff;
  z-index: 10;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #ddd;
  border-radius: 8px 0 0 8px;
  padding: 20px 0 10px;
}

.timeline-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px 8px 0;
  min-height: 41px;
  height: auto;
  text-align: right;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-size: 12px;
  color: #333;
  background-color: #fff;
  flex-shrink: 0;
}

.timeline-label:hover {
  background-color: #f5f5f5;
}

.timeline-item-container {
  position: relative;
}

.timeline-item-wrapper {
  padding: 5px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
}

.timeline-item {
  height: 30px;
  position: relative;
  z-index: 2;
  align-items: center;
  width: 100%;
}
</style>
