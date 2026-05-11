<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Pool } from '../pool'

// Resource type definition
interface Resource {
  name: string
  isPrecreated: boolean
  createdAt: number
  color: string
  status: 'idle' | 'busy' | 'closed'
  [Symbol.dispose]: () => void | Promise<void>
}

// Config type definition
interface PoolConfig {
  minDuration: string
  resourceCount: number
  preCreatedResourceCount: number
}

// Props and Emits
interface PoolCreatorProps {
  createResource: (created: number) => Promise<Resource>
}

const props = defineProps<PoolCreatorProps>()

const emit = defineEmits<{
  'pool-created': [pool: Pool<Resource>, scheduler: ReturnType<Pool<Resource>['schedule']>]
  'pool-destroyed': []
}>()

// Reactive data
const config = reactive<PoolConfig>({
  minDuration: '300',
  resourceCount: 5,
  preCreatedResourceCount: 2
})

const isCreating = ref(false)
const poolInstance = ref<Pool<Resource> | null>(null)
const createdResources = ref<
  Array<{
    name: string
    createdAt: number
    color: string
    status: 'idle' | 'busy' | 'closed'
    isPrecreated?: boolean
  }>
>([])

let startTime = Date.now()

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Create resource internally
async function createResourceInternal(created: number): Promise<Resource> {
  const resource = await props.createResource(created)
  // Set correct creation time (relative to start)
  resource.createdAt = Date.now() - startTime

  // Wrap as reactive for UI updates
  const reactiveResource = reactive(resource)
  createdResources.value.push(reactiveResource)
  return reactiveResource
}

// Create the pool
async function createPool() {
  try {
    isCreating.value = true
    createdResources.value = []
    startTime = Date.now()

    // Create pre-created resources
    const preCreatedResources = await Promise.all(
      Array.from(
        { length: config.preCreatedResourceCount },
        async (_, index) => {
          const resource = await createResourceInternal(index)
          resource.isPrecreated = true
          return resource
        }
      )
    )

    // Create the pool
    const pool = new Pool<Resource>({
      create: createResourceInternal,
      concurrency: config.resourceCount,
      resources: preCreatedResources,
      coolDown({ deliverAt, releaseAt }) {
        return wait(
          config.minDuration
            ? Math.max(0, parseInt(config.minDuration) - (releaseAt - deliverAt))
            : 0
        )
      },
      shouldDispose: true
    })

    poolInstance.value = pool
    const scheduler = pool.schedule()

    emit('pool-created', pool, scheduler)
  } catch (error) {
    console.error('创建资源池失败:', error)
  } finally {
    isCreating.value = false
  }
}

// Destroy the pool
async function destroyPool() {
  if (poolInstance.value) {
    try {
      await poolInstance.value[Symbol.asyncDispose]()
      poolInstance.value = null
      createdResources.value = []
      emit('pool-destroyed')
    } catch (error) {
      console.error('销毁资源池失败:', error)
    }
  }
}

// Force update resource status display
function forceUpdateResourceStatus() {
  createdResources.value = [...createdResources.value]
}

// Expose methods for parent component
defineExpose({
  createPool,
  destroyPool,
  config,
  poolInstance,
  createdResources,
  forceUpdateResourceStatus
})
</script>

<template>
  <div class="pool-creator">
    <h3 class="section-title">池配置</h3>
    <div class="pool-config-form">
      <div class="form-group">
        <label class="form-label">最小间隔(ms)</label>
        <input
          v-model="config.minDuration"
          class="form-input"
          type="number"
          :step="50"
          placeholder="200"
        />
      </div>
      <div class="form-group">
        <label class="form-label">资源数量</label>
        <input
          v-model.number="config.resourceCount"
          class="form-input"
          type="number"
          min="1"
          placeholder="5"
        />
      </div>
      <div class="form-group">
        <label class="form-label">预创建资源数量</label>
        <input
          v-model.number="config.preCreatedResourceCount"
          class="form-input"
          type="number"
          min="0"
          placeholder="2"
        />
      </div>
    </div>

    <div class="pool-actions">
      <button
        :disabled="isCreating"
        class="btn btn-primary"
        @click="createPool"
      >
        {{ isCreating ? '创建中...' : '创建资源池' }}
      </button>
      <button v-if="poolInstance" class="btn btn-danger" @click="destroyPool">
        销毁资源池
      </button>
    </div>

    <!-- Resource list -->
    <div v-if="createdResources.length > 0" class="resources-container">
      <h4 class="resources-title">资源列表 ({{ createdResources.length }})</h4>
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
  </div>
</template>

<style scoped>
.pool-creator {
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

.pool-config-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 4px;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.pool-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
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

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.resources-container {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.resources-title {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
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
</style>
