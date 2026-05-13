<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import type { Task } from '../utils/task-utils'
import { createTask as _createTask } from '../utils/task-utils'

// Props and Emits
interface TaskCreatorProps {
  scheduler?: unknown
  disabled?: boolean
}

interface TaskConfig {
  taskCount: number
  enableAutoCreate: boolean
  autoCreateInterval: number
}

const props = withDefaults(defineProps<TaskCreatorProps>(), {
  scheduler: undefined,
  disabled: false
})

const emit = defineEmits<{
  'tasks-created': [tasks: Task[]]
  'task-submitted': [task: Task]
}>()

// Reactive data
const config = reactive<TaskConfig>({
  taskCount: 10,
  enableAutoCreate: false,
  autoCreateInterval: 2000
})

const isCreating = ref(false)
const isAutoCreating = ref(false)
const showCompleted = ref(false)
const createdTasks = ref<Task[]>([])
const completedTasks = ref<Task[]>([])
const runningTasks = ref<Task[]>([])
const pendingTasks = ref<Task[]>([])
const failedTasks = ref<Task[]>([])

let taskIdCounter = 0
let autoCreateTimer: number | null = null

// Computed
const totalTasks = computed(() => createdTasks.value.length)
const completedCount = computed(() => completedTasks.value.length)
const runningCount = computed(() => runningTasks.value.length)
const pendingCount = computed(() => pendingTasks.value.length)
const failedCount = computed(() => failedTasks.value.length)

// Speed statistics
const finishedTasks = computed(() =>
  createdTasks.value.filter(
    (task) => task.status === 'completed' || task.status === 'failed'
  )
)

const tasksWithDuration = computed(() =>
  finishedTasks.value.filter((task) => task.startTime && task.endTime)
)

const averageTaskDuration = computed(() => {
  if (tasksWithDuration.value.length === 0) return 0
  const totalDuration = tasksWithDuration.value.reduce((sum, task) => {
    return sum + (task.endTime! - task.startTime!)
  }, 0)
  return Math.round(totalDuration / tasksWithDuration.value.length)
})

const fastestTaskDuration = computed(() => {
  if (tasksWithDuration.value.length === 0) return 0
  return Math.min(
    ...tasksWithDuration.value.map((task) => task.endTime! - task.startTime!)
  )
})

const slowestTaskDuration = computed(() => {
  if (tasksWithDuration.value.length === 0) return 0
  return Math.max(
    ...tasksWithDuration.value.map((task) => task.endTime! - task.startTime!)
  )
})

const taskCompletionRate = computed(() => {
  if (finishedTasks.value.length === 0) return 0

  const firstTaskTime = Math.min(
    ...finishedTasks.value
      .filter((task) => task.endTime)
      .map((task) => task.endTime!)
  )
  const lastTaskTime = Math.max(
    ...finishedTasks.value
      .filter((task) => task.endTime)
      .map((task) => task.endTime!)
  )

  if (firstTaskTime === lastTaskTime) return 0

  const durationInMinutes = (lastTaskTime - firstTaskTime) / (1000 * 60)
  return (
    Math.round((finishedTasks.value.length / durationInMinutes) * 100) / 100
  )
})

// Format duration display
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

// Filtered task list
const filteredTasks = computed(() => {
  if (showCompleted.value) {
    return createdTasks.value
  } else {
    return createdTasks.value.filter(
      (task) => task.status !== 'completed' && task.status !== 'failed'
    )
  }
})

// Utility functions
function getRandomColor() {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  )
}

function getContrastColor(color: string) {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const gray = r * 0.299 + g * 0.587 + b * 0.114
  return gray > 186 ? '#000' : '#fff'
}

// Create single task
function createTask(): Task {
  taskIdCounter++
  const backgroundColor = getRandomColor()
  return _createTask(
    taskIdCounter,
    `任务 ${taskIdCounter}`,
    backgroundColor,
    getContrastColor(backgroundColor)
  )
}

// Create batch of tasks
function createTaskBatch(count: number): Task[] {
  return Array.from({ length: count }, () => createTask())
}

// Update task list classification
function updateTaskLists() {
  pendingTasks.value = createdTasks.value.filter(
    (task) => task.status === 'pending'
  )
  runningTasks.value = createdTasks.value.filter(
    (task) => task.status === 'running'
  )
  completedTasks.value = createdTasks.value.filter(
    (task) => task.status === 'completed'
  )
  failedTasks.value = createdTasks.value.filter(
    (task) => task.status === 'failed'
  )
}

// Manual create tasks
async function createTasks() {
  if (!props.scheduler) {
    return
  }

  try {
    isCreating.value = true

    const newTasks = createTaskBatch(config.taskCount)

    createdTasks.value.push(...newTasks)
    updateTaskLists()

    for (const task of newTasks) {
      emit('task-submitted', task)
    }

    emit('tasks-created', newTasks)
  } catch (error) {
    console.error('创建任务失败:', error)
  } finally {
    isCreating.value = false
  }
}

// Start auto-create tasks
function startAutoCreate() {
  if (isAutoCreating.value || !props.scheduler) return

  isAutoCreating.value = true

  const autoCreate = () => {
    if (!isAutoCreating.value) return

    try {
      const newTasks = createTaskBatch(config.taskCount)
      createdTasks.value.push(...newTasks)
      updateTaskLists()

      for (const task of newTasks) {
        emit('task-submitted', task)
      }

      emit('tasks-created', newTasks)
    } catch (error) {
      console.error('自动创建任务失败:', error)
    }

    if (isAutoCreating.value) {
      autoCreateTimer = window.setTimeout(() => {
        if (isAutoCreating.value) {
          autoCreate()
        }
      }, config.autoCreateInterval)
    }
  }

  autoCreate()
}

// Stop auto-create
function stopAutoCreate() {
  isAutoCreating.value = false
  if (autoCreateTimer) {
    clearTimeout(autoCreateTimer)
    autoCreateTimer = null
  }
}

// Handle auto-create toggle
function onAutoCreateToggle() {
  stopAutoCreate()

  if (config.enableAutoCreate) {
    startAutoCreate()
  }
}

// Clear tasks
function clearTasks() {
  createdTasks.value = []
  completedTasks.value = []
  runningTasks.value = []
  pendingTasks.value = []
  failedTasks.value = []
  taskIdCounter = 0
  stopAutoCreate()
}

onUnmounted(() => {
  stopAutoCreate()
})

defineExpose({
  createTasks,
  startAutoCreate,
  stopAutoCreate,
  clearTasks,
  updateTaskLists,
  config,
  createdTasks,
  completedTasks,
  runningTasks,
  pendingTasks,
  failedTasks,
  isCreating,
  isAutoCreating
})
</script>

<template>
  <div class="task-creator">
    <h3 class="section-title">{{ $t('taskCreator.title') }}</h3>

    <!-- Actions and auto-create config -->
    <div class="task-actions">
      <div class="form-group">
        <label class="form-label">{{ $t('taskCreator.batchSizeLabel') }}</label>
        <input
          v-model.number="config.taskCount"
          class="form-input"
          type="number"
          min="1"
          placeholder="10"
          :disabled="isCreating || isAutoCreating"
        />
      </div>
      <button
        :disabled="isCreating || !props.scheduler"
        class="btn btn-primary"
        @click="createTasks"
      >
        {{ isCreating ? $t('taskCreator.creatingBtn') : `${$t('taskCreator.createBtn', { count: config.taskCount })}` }}
      </button>

      <div class="auto-create-controls">
        <label class="form-checkbox">
          <input
            v-model="config.enableAutoCreate"
            type="checkbox"
            :disabled="isCreating"
            @change="onAutoCreateToggle"
          />
          <span class="checkmark"></span>
          {{ $t('taskCreator.autoCreate') }}
        </label>

        <div class="interval-input">
          <label class="form-label">{{ $t('taskCreator.intervalLabel') }}</label>
          <input
            v-model.number="config.autoCreateInterval"
            class="form-input"
            type="number"
            min="100"
            placeholder="2000"
            :disabled="isCreating || isAutoCreating"
          />
        </div>
      </div>

      <button
        :disabled="isCreating || totalTasks === 0"
        class="btn btn-secondary"
        @click="clearTasks"
      >
        {{ $t('taskCreator.clearBtn') }}
      </button>
    </div>

    <!-- Task display area -->
    <div v-if="totalTasks > 0" class="task-display-container">
      <!-- Left: task statistics -->
      <div class="task-stats">
        <h4 class="stats-title">{{ $t('taskCreator.statsTitle') }}</h4>

        <div class="main-stats">
          <div class="stat-row">
            <div class="stat-item compact">
              <span class="stat-label">{{ $t('taskCreator.statTotal') }}</span>
              <span class="stat-value stat-total">{{ totalTasks }}</span>
            </div>
            <div class="stat-item compact">
              <span class="stat-label">{{ $t('taskCreator.statPending') }}</span>
              <span class="stat-value stat-pending">{{ pendingCount }}</span>
            </div>
            <div class="stat-item compact">
              <span class="stat-label">{{ $t('taskCreator.statRunning') }}</span>
              <span class="stat-value stat-running">{{ runningCount }}</span>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-item compact">
              <span class="stat-label">{{ $t('taskCreator.statCompleted') }}</span>
              <span class="stat-value stat-completed">{{
                completedCount
              }}</span>
            </div>
            <div class="stat-item compact">
              <span class="stat-label">{{ $t('taskCreator.statFailed') }}</span>
              <span class="stat-value stat-failed">{{ failedCount }}</span>
            </div>
            <div class="stat-item compact">
              <span class="stat-label">{{ $t('taskCreator.statProgress') }}</span>
              <span class="stat-value stat-progress">
                {{
                  Math.round(
                    ((completedCount + failedCount) / totalTasks) * 100
                  )
                }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{
                width: `${((completedCount + failedCount) / totalTasks) * 100}%`
              }"
            ></div>
          </div>
        </div>

        <!-- Speed stats -->
        <div class="speed-stats">
          <h5 class="speed-title">{{ $t('taskCreator.performanceTitle') }}</h5>
          <div class="speed-grid">
            <div class="speed-item">
              <span class="speed-label">{{ $t('taskCreator.avgDuration') }}</span>
              <span class="speed-value">{{
                formatDuration(averageTaskDuration)
              }}</span>
            </div>
            <div class="speed-item">
              <span class="speed-label">{{ $t('taskCreator.fastest') }}</span>
              <span class="speed-value">{{
                formatDuration(fastestTaskDuration)
              }}</span>
            </div>
            <div class="speed-item">
              <span class="speed-label">{{ $t('taskCreator.slowest') }}</span>
              <span class="speed-value">{{
                formatDuration(slowestTaskDuration)
              }}</span>
            </div>
            <div class="speed-item">
              <span class="speed-label">{{ $t('taskCreator.rate') }}</span>
              <span class="speed-value">{{ taskCompletionRate }}{{ $t('taskCreator.rateUnit') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: task list -->
      <div class="recent-tasks">
        <div class="recent-header">
          <h4 class="recent-title">{{ $t('taskCreator.taskListTitle') }} ({{ filteredTasks.length }})</h4>
          <label class="form-checkbox task-filter">
            <input v-model="showCompleted" type="checkbox" />
            <span class="checkmark"></span>
            {{ $t('taskCreator.showCompleted') }}
          </label>
        </div>
        <div class="task-list">
          <div
            v-for="task in filteredTasks.slice().reverse()"
            :key="task.id"
            class="task-item"
            :style="{
              borderLeft: `4px solid ${task.backgroundColor}`,
              backgroundColor: task.backgroundColor + '15'
            }"
          >
            <div class="task-header">
              <span class="task-id" :style="{ color: task.backgroundColor }">
                #{{ task.id }}
              </span>
              <span class="task-name">{{ task.name }}</span>
              <span class="task-status" :class="`status-${task.status}`">
                {{
                  task.status === 'pending'
                    ? $t('taskCreator.statusPending')
                    : task.status === 'running'
                      ? $t('taskCreator.statusRunning')
                      : task.status === 'completed'
                        ? $t('taskCreator.statusCompleted')
                        : $t('taskCreator.statusFailed')
                }}
              </span>
            </div>
            <div class="task-details">
              <div v-if="task.resourceName" class="task-resource">
                {{ $t('taskCreator.useResource') }}: {{ task.resourceName }}
              </div>
              <div v-if="task.startTime && task.endTime" class="task-time">
                {{ $t('taskCreator.actualTime') }}: {{ task.endTime - task.startTime }}ms
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-creator {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.section-title {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
  width: 120px;
  margin-right: 8px;
  white-space: nowrap;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
  width: 80px;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
}

.form-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
}

.form-checkbox input[type='checkbox'] {
  margin-right: 8px;
}

.task-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.auto-create-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.interval-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interval-input .form-label {
  font-size: 12px;
  margin-bottom: 0;
  color: #555;
}

.interval-input .form-input {
  font-size: 12px;
  width: 70px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.task-display-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  align-items: stretch;
  height: 350px;
}

@media (max-width: 768px) {
  .task-display-container {
    grid-template-columns: 1fr;
    height: auto;
  }
}

.task-stats {
  padding: 16px;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
}

.stats-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
  flex-shrink: 0;
}

.main-stats {
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.stat-row:last-child {
  margin-bottom: 0;
}

.stat-item.compact {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 4px;
  text-align: center;
  min-height: 50px;
  justify-content: center;
}

.stat-item.compact .stat-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 2px;
  text-transform: uppercase;
  font-weight: 500;
}

.stat-item.compact .stat-value {
  font-size: 16px;
  font-weight: bold;
}

.stat-value.stat-total {
  color: #1976d2;
}

.stat-value.stat-pending {
  color: #f57c00;
}

.stat-value.stat-running {
  color: #388e3c;
}

.stat-value.stat-completed {
  color: #7b1fa2;
}

.stat-value.stat-failed {
  color: #c62828;
}

.stat-value.stat-progress {
  color: #1976d2;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background-color: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.progress-fill {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.speed-stats {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.speed-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.speed-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.speed-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background-color: #f8f9fa;
  border-radius: 4px;
  text-align: center;
}

.speed-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 2px;
  text-transform: uppercase;
  font-weight: 500;
}

.speed-value {
  font-size: 12px;
  font-weight: bold;
  color: #333;
}

.recent-tasks {
  padding: 16px;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.recent-title {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.task-filter {
  font-size: 14px;
  font-weight: 400;
}

.task-filter input[type='checkbox'] {
  margin-right: 6px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  max-height: 100%;
}

.task-item {
  background-color: #fff;
  border-radius: 4px;
  padding: 12px;
  border-left: 4px solid #007bff;
}

.task-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  gap: 8px;
}

.task-id {
  font-weight: bold;
}

.task-name {
  font-weight: 500;
  flex: 1;
}

.task-status {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-running {
  background-color: #d1ecf1;
  color: #0c5460;
}

.status-completed {
  background-color: #d4edda;
  color: #155724;
}

.status-failed {
  background-color: #f8d7da;
  color: #721c24;
}

.task-details {
  font-size: 12px;
  color: #666;
}

.task-resource,
.task-time {
  margin-bottom: 2px;
}
</style>
