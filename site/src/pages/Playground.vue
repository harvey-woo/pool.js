<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import TimelineViewer from '../components/TimelineViewer.vue'
import TimelineHeader from '../components/TimelineHeader.vue'
import TaskCreator from '../components/TaskCreator.vue'
import { Pool, Scheduler } from '../pool'
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

// Resource list (reactive proxies stored in Pool)
const createdResources = ref<
  Array<{
    name: string
    createdAt: number
    color: string
    status: 'idle' | 'busy' | 'closed'
    isPrecreated?: boolean
  }>
>([])

// Pool creation loading state
const isCreatingPool = ref(false)
const createError = ref('')

// Task execution config
const taskExecutionConfig = reactive({
  selectedResourceType: 'mainthread-resource',
  selectedMethod: 'timer-task',
  parameters: {
    minDuration: 100,
    maxDuration: 500
  } as Record<string, unknown>
})

// Pool config
const poolConfig = reactive({
  minDuration: '300',
  resourceCount: 5,
  preCreatedResourceCount: 2
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

      if (taskCreatorRef.value) {
        taskCreatorRef.value.updateTaskLists()
      }
    }
  }
}

// Create the pool
async function createPool() {
  if (isCreatingPool.value || currentPool.value) return
  try {
    isCreatingPool.value = true
    createError.value = ''
    console.log('[createPool] starting, resourceCount:', poolConfig.resourceCount, 'preCreated:', poolConfig.preCreatedResourceCount)
    _absoluteStartTime.value = Date.now()
    createdResources.value = []
    timeLineData.value = []
    startTime.value = 0
    currentTime.value = 0

    // Create pre-created resources
    const preCreatedResources: Resource[] = await Promise.all(
      Array.from(
        { length: poolConfig.preCreatedResourceCount },
        async (_, index) => {
          const resource = await createDefaultResource(index)
          resource.isPrecreated = true
          resource.createdAt = 0
          const reactiveResource = reactive(resource)
          createdResources.value.push(reactiveResource)
          return reactiveResource
        }
      )
    )
    console.log('[createPool] pre-created:', preCreatedResources.length, 'resources')

    // Create the pool — stores reactive proxies
    const pool = new Pool<Resource>({
      create: async (created: number) => {
        const resource = await createDefaultResource(created)
        resource.createdAt = Date.now() - _absoluteStartTime.value
        const reactiveResource = reactive(resource)
        createdResources.value.push(reactiveResource)
        return reactiveResource
      },
      concurrency: poolConfig.resourceCount,
      resources: preCreatedResources,
      coolDown({ deliverAt, releaseAt }) {
        return wait(
          poolConfig.minDuration
            ? Math.max(0, parseInt(poolConfig.minDuration) - (releaseAt - deliverAt))
            : 0
        )
      },
      shouldDispose: true
    })

    currentPool.value = pool
    currentScheduler.value = pool.schedule()
    console.log('[createPool] pool created, currentPool:', !!currentPool.value, 'createdResources:', createdResources.value.length)

    if (typeof interval === 'number') clearInterval(interval)
    interval = setInterval(() => {
      const globalIdle = isGlobalIdle()
      if (!globalIdle) {
        currentTime.value = Date.now() - _absoluteStartTime.value
      }
    }, 100)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    createError.value = `创建资源池失败: ${msg}`
    console.error('创建资源池失败:', error)
    currentPool.value = null
    currentScheduler.value = null
  } finally {
    isCreatingPool.value = false
  }
}

// Destroy the pool
async function destroyPool() {
  if (currentPool.value) {
    try {
      await currentPool.value[Symbol.asyncDispose]()
      currentPool.value = null
      currentScheduler.value = null
      createdResources.value = []
      if (interval) {
        clearInterval(interval)
      }
      timeLineData.value = []
      console.log('资源池已销毁')
    } catch (error) {
      console.error('销毁资源池失败:', error)
    }
  }
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
  <div class="playground">
    <!-- Left panel -->
    <aside class="playground-sidebar">
      <!-- Scrollable config area -->
      <div class="sidebar-content">
        <div class="config-section">
          <h3 class="section-title">资源配置</h3>

          <!-- Resource type -->
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

          <!-- Method selection -->
          <div class="method-section">
            <div class="method-selection">
              <label
                v-for="method in selectedResourceType!.methods"
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
                </div>
              </label>
            </div>

            <!-- Parameters -->
            <div v-if="selectedMethod" class="parameter-config">
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

          <!-- Pool config -->
          <div class="pool-config-form">
            <div class="form-group">
              <label class="form-label">冷却间隔(ms)</label>
              <input
                v-model="poolConfig.minDuration"
                class="form-input"
                type="number"
                :step="50"
                placeholder="300"
              />
            </div>
            <div class="form-group">
              <label class="form-label">资源数量</label>
              <input
                v-model.number="poolConfig.resourceCount"
                class="form-input"
                type="number"
                min="1"
                placeholder="5"
              />
            </div>
            <div class="form-group">
              <label class="form-label">预创建数量</label>
              <input
                v-model.number="poolConfig.preCreatedResourceCount"
                class="form-input"
                type="number"
                min="0"
                placeholder="2"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Fixed buttons at bottom -->
      <div class="sidebar-actions">
        <button
          class="btn btn-primary"
          :disabled="isCreatingPool"
          @click="createPool"
        >
          {{ isCreatingPool ? '创建中...' : '创建资源池' }}
        </button>
        <button v-if="currentPool" class="btn btn-danger" @click="destroyPool">
          销毁资源池
        </button>
      </div>
      <div v-if="createError" class="create-error">
        {{ createError }}
      </div>
    </aside>

    <!-- Right panel -->
    <main class="playground-content">
      <!-- Resource list -->
      <div v-if="createdResources.length > 0" class="resource-list-section">
        <h4 class="resource-list-title">资源列表 ({{ createdResources.length }})</h4>
        <div class="resource-grid">
          <div
            v-for="(resource, index) in createdResources"
            :key="index"
            class="resource-item"
            :style="{ borderLeft: `4px solid ${resource.color}` }"
            :class="{
              'resource-idle': resource.status === 'idle',
              'resource-busy': resource.status === 'busy',
              'resource-closed': resource.status === 'closed'
            }"
          >
            <div class="resource-header">
              <span class="resource-name">{{ resource.name }}</span>
              <span
                v-if="resource.isPrecreated"
                class="precreated-tag"
                title="预创建资源不会被自动销毁"
              >
                预创建
              </span>
              <span class="resource-index">#{{ index + 1 }}</span>
            </div>
            <div class="resource-details">
              <span class="resource-time">
                创建时间: {{ resource.createdAt }}ms
              </span>
              <span class="resource-status">
                状态:
                <span :class="`status-${resource.status}`">
                  {{
                    resource.status === 'idle'
                      ? '空闲'
                      : resource.status === 'busy'
                        ? '使用中'
                        : '已关闭'
                  }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

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
        :time-scale-interval="parseInt(poolConfig.minDuration || '300')"
        @user-scrolled="() => {}"
      />
    </main>
  </div>
</template>

<style scoped>
.playground {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* Left sidebar */
.playground-sidebar {
  width: 320px;
  border-right: 1px solid #e8e8e8;
  flex-shrink: 0;
  background: #fafafa;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  margin: 0 0 12px 0;
  color: #1a1a2e;
  font-size: 15px;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

/* Resource type list */
.resource-type-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-type-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
}

.resource-type-item:hover {
  border-color: #667eea;
  background-color: #f0f0ff;
}

.resource-type-item.active {
  border-color: #667eea;
  background-color: #f0f0ff;
}

.resource-type-item input[type='radio'] {
  margin-right: 10px;
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
  font-size: 14px;
}

.type-desc {
  font-size: 12px;
  color: #666;
}

/* Method selection */
.method-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-selection {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.method-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
}

.method-item:hover {
  border-color: #667eea;
  background-color: #f0f0ff;
}

.method-item.active {
  border-color: #667eea;
  background-color: #f0f0ff;
}

.method-item input[type='radio'] {
  margin-right: 10px;
}

.method-info {
  flex: 1;
  min-width: 0;
}

.method-name {
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

/* Parameter config */
.parameter-config {
  padding: 12px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.parameter-config .config-group {
  margin-bottom: 12px;
}

.parameter-config .config-group:last-child {
  margin-bottom: 0;
}

.parameter-config .config-group label {
  display: block;
  margin-bottom: 4px;
  color: #333;
  font-size: 13px;
  font-weight: 500;
}

.parameter-config .config-group input,
.parameter-config .config-group select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.parameter-config .config-group input:focus,
.parameter-config .config-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.parameter-config .checkbox-label {
  display: flex !important;
  align-items: center;
  font-size: 13px;
  gap: 8px;
}

.parameter-config .checkbox-label input[type='checkbox'] {
  width: auto !important;
}

/* Pool config */
.pool-config-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
  margin-bottom: 4px;
}

.form-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

/* Fixed action buttons */
.sidebar-actions {
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover {
  background-color: #5a6fd6;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.create-error {
  padding: 8px 20px;
  color: #dc3545;
  font-size: 12px;
  background: #fff5f5;
  border-top: 1px solid #ffe0e0;
  line-height: 1.4;
  flex-shrink: 0;
}

/* Resource list in right panel */
.resource-list-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.resource-list-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1a1a2e;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.resource-item {
  background-color: #fff;
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.resource-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.resource-name {
  font-weight: 600;
  color: #333;
}

.resource-index {
  font-size: 12px;
  background-color: #f0f0f0;
  border-radius: 10px;
  padding: 2px 6px;
  color: #666;
}

.resource-details {
  font-size: 13px;
  color: #666;
}

.resource-time,
.resource-status {
  display: block;
  margin-bottom: 4px;
}

.status-idle {
  color: #4caf50;
}

.status-busy {
  color: #ff9800;
}

.status-closed {
  color: #f44336;
}

.resource-item.resource-idle {
  border-left-color: #4caf50;
}

.resource-item.resource-busy {
  border-left-color: #ff9800;
}

.resource-item.resource-closed {
  border-left-color: #f44336;
  opacity: 0.7;
}

.precreated-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #2196f3;
  color: white;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  margin-left: 8px;
  cursor: help;
}

/* Right content */
.playground-content {
  flex: 1;
  padding: 20px;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Responsive */
@media (max-width: 900px) {
  .playground {
    flex-direction: column;
    height: auto;
  }

  .playground-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e8e8e8;
    max-height: 50vh;
    height: auto;
  }

  .sidebar-actions {
    position: static;
  }

  .playground-content {
    overflow-y: visible;
  }
}
</style>
