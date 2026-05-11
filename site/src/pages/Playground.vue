<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import TimelineViewer from '../components/TimelineViewer.vue'
import TimelineHeader from '../components/TimelineHeader.vue'
import PoolCreator from '../components/PoolCreator.vue'
import TaskCreator from '../components/TaskCreator.vue'
import type { Pool, Scheduler } from '../pool'
import { type Task } from '../utils/task-utils'

// Timeline data interface
interface TimeLineData {
  name: string
  events: (Task & { from?: number; to?: number })[]
}

// Resource type definition
interface Resource {
  name: string
  isPrecreated: boolean
  createdAt: number
  color: string
  status: 'idle' | 'busy' | 'closed'
  execute(method: string, parameters: Record<string, unknown>): Promise<unknown>
  getAvailableMethods(): TaskMethod[]
  [Symbol.dispose]: () => void | Promise<void>
}

// Task method definition
interface TaskMethod {
  name: string
  description: string
  parameters: TaskParameter[]
}

interface TaskParameter {
  name: string
  type: 'number' | 'string' | 'boolean' | 'select'
  description: string
  defaultValue?: unknown
  min?: number
  max?: number
  options?: string[]
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// --- Simulated async computation (no Worker/RPC needed) ---
function simulatedCompute(iterations: number): number {
  let result = 0
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i)
  }
  return result
}

// Main thread resource class
class MainThreadResource implements Resource {
  name: string
  isPrecreated: boolean
  createdAt: number
  color: string
  status: 'idle' | 'busy' | 'closed'

  constructor(name: string, color: string) {
    this.name = name
    this.isPrecreated = false
    this.createdAt = Date.now()
    this.color = color
    this.status = 'idle'
  }

  async [Symbol.dispose](): Promise<void> {
    this.status = 'closed'
    console.log(`主线程资源 ${this.name} 被释放`)
  }

  async execute(
    method: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    switch (method) {
      case 'timer-task':
        return await this.timerTask(
          (parameters.minDuration as number) || 100,
          (parameters.maxDuration as number) || 500,
          (parameters.failureRate as number) || 0.2
        )
      case 'compute-task':
        return await this.computeTask(
          (parameters.iterations as number) || 50000,
          (parameters.failureRate as number) || 0.1
        )
      case 'batch-task':
        return await this.batchTask(
          (parameters.batchSize as number) || 5,
          (parameters.taskDuration as number) || 50,
          (parameters.failureRate as number) || 0.1
        )
      default:
        throw new Error(`未知的方法: ${method}`)
    }
  }

  private async timerTask(
    minDuration: number = 100,
    maxDuration: number = 500,
    failureRate: number = 0.2
  ): Promise<void> {
    const duration = Math.random() * (maxDuration - minDuration) + minDuration

    if (Math.random() < failureRate) {
      await wait(duration * 0.5)
      throw new Error(
        `定时器任务执行失败 (失败率: ${(failureRate * 100).toFixed(1)}%)`
      )
    }

    await wait(duration)
  }

  private async computeTask(
    iterations: number = 50000,
    failureRate: number = 0.1
  ): Promise<number> {
    if (Math.random() < failureRate) {
      await wait(50)
      throw new Error('计算任务执行失败')
    }

    // Break computation into chunks to avoid blocking the event loop
    let total = 0
    const chunkSize = 10000
    let offset = 0
    while (offset < iterations) {
      const end = Math.min(offset + chunkSize, iterations)
      // Use setTimeout to yield to the event loop between chunks
      await wait(0)
      for (let i = offset; i < end; i++) {
        total += Math.sqrt(i) * Math.sin(i)
      }
      offset = end
    }
    return total
  }

  private async batchTask(
    batchSize: number = 5,
    taskDuration: number = 50,
    failureRate: number = 0.1
  ): Promise<number> {
    let completed = 0
    for (let i = 0; i < batchSize; i++) {
      if (Math.random() < failureRate) {
        throw new Error(`批量任务在第 ${i + 1} 步失败`)
      }
      await wait(taskDuration + Math.random() * 30)
      completed++
    }
    return completed
  }

  getAvailableMethods(): TaskMethod[] {
    return [
      {
        name: 'timer-task',
        description:
          '定时器任务 - 在主线程中执行指定时长的等待任务，测试资源池的调度和时间管理能力。',
        parameters: [
          {
            name: 'minDuration',
            type: 'number',
            description: '最小持续时间 (ms)',
            defaultValue: 100,
            min: 10,
            max: 5000
          },
          {
            name: 'maxDuration',
            type: 'number',
            description: '最大持续时间 (ms)',
            defaultValue: 500,
            min: 10,
            max: 5000
          },
          {
            name: 'failureRate',
            type: 'number',
            description: '失败率 (0-1)',
            defaultValue: 0.2,
            min: 0,
            max: 1
          }
        ]
      },
      {
        name: 'compute-task',
        description:
          '计算任务 - 执行数学运算模拟 CPU 密集型工作，分块执行避免阻塞事件循环。',
        parameters: [
          {
            name: 'iterations',
            type: 'number',
            description: '迭代次数',
            defaultValue: 50000,
            min: 1000,
            max: 500000
          },
          {
            name: 'failureRate',
            type: 'number',
            description: '失败率 (0-1)',
            defaultValue: 0.1,
            min: 0,
            max: 1
          }
        ]
      },
      {
        name: 'batch-task',
        description:
          '批量任务 - 执行多个子任务，模拟需要多步骤完成的工作流程。',
        parameters: [
          {
            name: 'batchSize',
            type: 'number',
            description: '子任务数量',
            defaultValue: 5,
            min: 1,
            max: 20
          },
          {
            name: 'taskDuration',
            type: 'number',
            description: '每个子任务的持续时间 (ms)',
            defaultValue: 50,
            min: 10,
            max: 500
          },
          {
            name: 'failureRate',
            type: 'number',
            description: '失败率 (0-1)',
            defaultValue: 0.1,
            min: 0,
            max: 1
          }
        ]
      }
    ]
  }
}

// Resource type definition
interface ResourceType {
  name: string
  description: string
  createResource: (name: string, color: string) => Promise<Resource>
  methods: TaskMethod[]
}

// Available resource types - simplified to MainThreadResource only
// (WorkerComputeResource requires RPC infrastructure not in pool.js)
const availableResourceTypes: ResourceType[] = [
  {
    name: 'mainthread-resource',
    description: '主线程资源',
    createResource: async (name: string, color: string) => {
      return new MainThreadResource(name, color)
    },
    methods: new MainThreadResource('temp', '#000').getAvailableMethods()
  }
]

function getRandomColor() {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  )
}

// Default resource creation function
async function createDefaultResource(created: number): Promise<Resource> {
  await wait(100)

  const resourceColor = getRandomColor()

  const selectedType = availableResourceTypes.find(
    (type) => type.name === taskExecutionConfig.selectedResourceType
  )

  if (selectedType) {
    return await selectedType.createResource(
      `resource ${created}`,
      resourceColor
    )
  }

  return new MainThreadResource(`resource ${created}`, resourceColor)
}

// Reactive data
const startTime = ref(0)
const _absoluteStartTime = ref(Date.now())
const timeLineData = ref<TimeLineData[]>([])
const currentTime = ref(0)
const currentPool = ref<Pool<Resource> | null>(null)
const currentScheduler = ref<Scheduler<Resource> | null>(null)

// Task execution config
const taskExecutionConfig = reactive({
  selectedResourceType: 'mainthread-resource',
  selectedMethod: 'timer-task',
  parameters: {
    minDuration: 100,
    maxDuration: 500
  } as Record<string, unknown>
})

// Computed - get current resource type and method
const selectedResourceType = computed(() => {
  return availableResourceTypes.find(
    (type) => type.name === taskExecutionConfig.selectedResourceType
  )
})

const selectedMethod = computed(() => {
  return selectedResourceType.value?.methods.find(
    (method) => method.name === taskExecutionConfig.selectedMethod
  )
})

// Handle resource type change
function onResourceTypeChange() {
  if (
    selectedResourceType.value &&
    selectedResourceType.value.methods.length > 0
  ) {
    taskExecutionConfig.selectedMethod =
      selectedResourceType.value.methods[0].name
    initializeParameters()
  }
}

// Handle method change
function onMethodChange() {
  initializeParameters()
}

// Initialize parameter defaults
function initializeParameters() {
  if (selectedMethod.value) {
    taskExecutionConfig.parameters = {}
    selectedMethod.value.parameters.forEach((param) => {
      taskExecutionConfig.parameters[param.name] = param.defaultValue
    })
  }
}

// Component refs
const poolCreatorRef = ref<InstanceType<typeof PoolCreator>>()
const taskCreatorRef = ref<InstanceType<typeof TaskCreator>>()
const timelineViewerRef = ref<InstanceType<typeof TimelineViewer>>()

// Timeline config
const timelineConfig = reactive({
  unitWidth: 0.3,
  autoScrollEnabled: true,
  enableIdleCompression: true
})

let interval: ReturnType<typeof setInterval> | undefined

// Check if globally idle
function isGlobalIdle(): boolean {
  if (timeLineData.value.length === 0) {
    return true
  }

  const hasRunningTasks = timeLineData.value.some((timeline) => {
    return timeline.events.some((event) => {
      const to = event.to ?? Infinity
      return !isFinite(to)
    })
  })

  return !hasRunningTasks
}

// Create tracking task wrapper
function createTrackingTask(taskFromCreatedTasks: Task) {
  return async function (this: Resource) {
    const now = Date.now()
    const relativeNow = now - _absoluteStartTime.value

    const timeLineEvent = taskFromCreatedTasks as Task & {
      from: number
      to: number
    }
    timeLineEvent.from = relativeNow
    timeLineEvent.to = Infinity

    timeLineEvent.status = 'running'
    timeLineEvent.startTime = now

    let timeLine = timeLineData.value.find(
      (timeLine) => timeLine.name === this.name
    )
    if (!timeLine) {
      timeLine = {
        name: this.name,
        events: []
      }
      timeLineData.value.push(timeLine)
    }
    timeLine.events.push(timeLineEvent)

    this.status = 'busy'

    if (poolCreatorRef.value) {
      poolCreatorRef.value.forceUpdateResourceStatus()
    }

    if (taskCreatorRef.value) {
      taskCreatorRef.value.updateTaskLists()
    }

    try {
      await this.execute(
        taskExecutionConfig.selectedMethod,
        taskExecutionConfig.parameters
      )

      timeLineEvent.status = 'completed'
      timeLineEvent.resourceName = this.name
      if (!timeLineEvent.endTime) {
        timeLineEvent.endTime = Date.now()
      }
      timeLineEvent.to = Date.now() - _absoluteStartTime.value

      if (timelineViewerRef.value) {
        timelineViewerRef.value.autoScrollToEnd()
      }

      this.status = 'idle'

      if (poolCreatorRef.value) {
        poolCreatorRef.value.forceUpdateResourceStatus()
      }

      if (taskCreatorRef.value) {
        taskCreatorRef.value.updateTaskLists()
      }
    } catch (error) {
      console.error('任务执行失败:', error)

      timeLineEvent.status = 'failed'
      timeLineEvent.resourceName = this.name
      if (!timeLineEvent.endTime) {
        timeLineEvent.endTime = Date.now()
      }
      timeLineEvent.to = Date.now() - _absoluteStartTime.value

      this.status = 'idle'

      if (poolCreatorRef.value) {
        poolCreatorRef.value.forceUpdateResourceStatus()
      }

      if (taskCreatorRef.value) {
        taskCreatorRef.value.updateTaskLists()
      }
    }
  }
}

// Handle pool created
function handlePoolCreated(pool: Pool<Resource>, scheduler: Scheduler<Resource>) {
  currentPool.value = pool
  currentScheduler.value = scheduler
  console.log('资源池创建成功')

  _absoluteStartTime.value = Date.now()
  startTime.value = 0
  currentTime.value = 0
  if (typeof interval === 'number') clearInterval(interval)
  interval = setInterval(() => {
    const globalIdle = isGlobalIdle()
    if (!globalIdle) {
      currentTime.value = Date.now() - _absoluteStartTime.value
    }
  }, 100)
}

// Handle pool destroyed
function handlePoolDestroyed() {
  currentPool.value = null
  currentScheduler.value = null
  if (interval) {
    clearInterval(interval)
  }
  timeLineData.value = []
  console.log('资源池已销毁')
}

// Handle task submitted
async function handleTaskSubmitted(task: Task) {
  if (!currentScheduler.value || !currentPool.value) {
    console.warn('调度器或资源池未初始化')
    return
  }

  try {
    let taskFromCreatedTasks: Task | undefined
    if (taskCreatorRef.value) {
      taskFromCreatedTasks = taskCreatorRef.value.createdTasks.find(
        (t) => t.id === task.id
      )
    }

    if (!taskFromCreatedTasks) {
      console.error('无法找到任务对象:', task.id)
      return
    }

    const trackingTask = createTrackingTask(taskFromCreatedTasks)
    const scheduler = currentScheduler.value as {
      enqueue: (task: () => Promise<void>) => Promise<void>
    }
    if (scheduler && typeof scheduler.enqueue === 'function') {
      await scheduler.enqueue(trackingTask)
    }
  } catch (error) {
    console.error('任务提交失败:', error)
    task.status = 'failed'
    if (!task.endTime) {
      task.endTime = Date.now()
    }

    if (taskCreatorRef.value) {
      taskCreatorRef.value.updateTaskLists()
    }
  }
}

onMounted(async () => {
  initializeParameters()
})

onUnmounted(async () => {
  console.log('组件卸载，清理资源')
})
</script>

<template>
  <div class="example-container">
    <h2 class="example-title">Pool.js v2 - 资源池调度示例</h2>

    <!-- Resource type and method selection -->
    <div class="selector-container">
      <div class="resource-type-selector">
        <h3>资源类型</h3>
        <div class="resource-type-list">
          <label
            v-for="resourceType in availableResourceTypes"
            :key="resourceType.name"
            class="resource-type-item"
            :class="{
              active:
                taskExecutionConfig.selectedResourceType === resourceType.name
            }"
          >
            <input
              v-model="taskExecutionConfig.selectedResourceType"
              type="radio"
              :value="resourceType.name"
              @change="onResourceTypeChange"
            />
            <div class="type-info">
              <div class="type-name">
                {{ resourceType.description }}
              </div>
              <div class="type-desc">
                {{ resourceType.methods.length }} 个可用方法
              </div>
            </div>
          </label>
        </div>
      </div>

      <div class="task-method-selector">
        <h3>方法配置</h3>
        <div v-if="selectedResourceType" class="method-config">
          <div class="method-selection">
            <label
              v-for="method in selectedResourceType.methods"
              :key="method.name"
              class="method-item"
              :class="{
                active: taskExecutionConfig.selectedMethod === method.name
              }"
            >
              <input
                v-model="taskExecutionConfig.selectedMethod"
                type="radio"
                :value="method.name"
                @change="onMethodChange"
              />
              <div class="method-info">
                <div class="method-name">{{ method.name }}</div>
                <div class="method-description">
                  {{ method.description }}
                </div>
              </div>
            </label>
          </div>

          <div v-if="selectedMethod" class="parameter-config">
            <h4>参数配置</h4>
            <div
              v-for="param in selectedMethod.parameters"
              :key="param.name"
              class="config-group"
            >
              <label>{{ param.description }}</label>
              <input
                v-if="param.type === 'number'"
                v-model.number="taskExecutionConfig.parameters[param.name]"
                type="number"
                :min="param.min"
                :max="param.max"
                :placeholder="String(param.defaultValue)"
              />
              <input
                v-else-if="param.type === 'string'"
                v-model="taskExecutionConfig.parameters[param.name]"
                type="text"
                :placeholder="String(param.defaultValue)"
              />
              <select
                v-else-if="param.type === 'select'"
                v-model="taskExecutionConfig.parameters[param.name]"
              >
                <option
                  v-for="option in param.options"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
              <label
                v-else-if="param.type === 'boolean'"
                class="checkbox-label"
              >
                <input
                  v-model="taskExecutionConfig.parameters[param.name]"
                  type="checkbox"
                />
                启用
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pool creator -->
    <PoolCreator
      ref="poolCreatorRef"
      :create-resource="createDefaultResource"
      @pool-created="handlePoolCreated"
      @pool-destroyed="handlePoolDestroyed"
    />

    <!-- Task creator -->
    <TaskCreator
      ref="taskCreatorRef"
      :scheduler="currentScheduler"
      :disabled="!currentPool"
      @task-submitted="handleTaskSubmitted"
    />

    <!-- Timeline header -->
    <TimelineHeader
      v-model:unit-width="timelineConfig.unitWidth"
      v-model:auto-scroll-enabled="timelineConfig.autoScrollEnabled"
      v-model:enable-idle-compression="timelineConfig.enableIdleCompression"
    />

    <!-- Timeline viewer -->
    <TimelineViewer
      ref="timelineViewerRef"
      :time-line-data="timeLineData"
      :start-time="startTime"
      :end-time="currentTime"
      :unit-width="timelineConfig.unitWidth"
      :auto-scroll-enabled="timelineConfig.autoScrollEnabled"
      :enable-idle-compression="timelineConfig.enableIdleCompression"
      :time-scale-interval="
        parseInt(poolCreatorRef?.config.minDuration || '300')
      "
      @user-scrolled="() => {}"
    />
  </div>
</template>

<style scoped>
.example-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.example-title {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
}

.selector-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #fafafa;
  width: 100%;
  overflow: hidden;
}

.resource-type-selector {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.resource-type-selector h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.resource-type-list {
  margin-bottom: 20px;
}

.resource-type-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
}

.resource-type-item:hover {
  border-color: #007acc;
  background-color: #f0f8ff;
}

.resource-type-item.active {
  border-color: #007acc;
  background-color: #e6f3ff;
}

.resource-type-item input[type='radio'] {
  margin-right: 10px;
}

.type-info {
  flex: 1;
}

.type-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.type-desc {
  font-size: 12px;
  color: #666;
}

.task-method-selector {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.task-method-selector h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.method-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.method-selection {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 20px;
}

.method-item {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
  width: 100%;
}

.method-item:hover {
  border-color: #007acc;
  background-color: #f0f8ff;
}

.method-item.active {
  border-color: #007acc;
  background-color: #e6f3ff;
}

.method-item input[type='radio'] {
  margin-right: 12px;
  margin-top: 2px;
}

.method-info {
  flex: 1;
  min-width: 0;
}

.method-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  font-size: 14px;
  word-break: break-word;
}

.method-description {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  word-wrap: break-word;
  white-space: normal;
}

.parameter-config {
  width: 100%;
}

.parameter-config h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.parameter-config .config-group {
  margin-bottom: 15px;
  width: 100%;
}

.parameter-config .config-group label {
  display: block;
  margin-bottom: 5px;
  color: #333;
  font-size: 13px;
  font-weight: 500;
  word-wrap: break-word;
}

.parameter-config .config-group input,
.parameter-config .config-group select {
  width: 100%;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.parameter-config .config-group input:focus,
.parameter-config .config-group select:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.1);
}

.parameter-config .checkbox-label {
  display: flex !important;
  align-items: center;
  font-size: 13px;
}

.parameter-config .checkbox-label input[type='checkbox'] {
  width: auto !important;
  margin-right: 8px;
}
</style>
