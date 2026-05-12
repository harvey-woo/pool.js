<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import CodeBlock from '../components/CodeBlock.vue'

type Section = {
  id: string
  title: string
  level: number
}

const sections: Section[] = [
  { id: 'overview', title: '概述', level: 1 },
  { id: 'installation', title: '安装', level: 1 },
  { id: 'quick-start', title: '快速开始', level: 1 },
  { id: 'pool', title: 'Pool', level: 1 },
  { id: 'pool-options', title: 'PoolOptions 配置', level: 2 },
  { id: 'pool-acquire', title: 'acquire()', level: 2 },
  { id: 'pool-schedule', title: 'schedule()', level: 2 },
  { id: 'pool-enqueue', title: 'enqueue()', level: 2 },
  { id: 'pool-asyncdispose', title: 'Symbol.asyncDispose()', level: 2 },
  { id: 'resource-container', title: 'ResourceContainer', level: 1 },
  { id: 'without-using', title: '不使用 using 关键字', level: 1 },
  { id: 'scheduler', title: 'Scheduler', level: 1 },
  { id: 'scheduler-enqueue', title: 'enqueue()', level: 2 },
  { id: 'scheduler-enqueue-all', title: 'enqueueAll()', level: 2 },
  { id: 'scheduler-wrap', title: 'wrap()', level: 2 },
  { id: 'cooldown', title: 'CoolDown', level: 1 },
  { id: 'errors', title: '错误处理', level: 1 },
  { id: 'types', title: '类型定义', level: 1 },
]

const h1Sections = computed(() => sections.filter((s) => s.level === 1))
const activeSection = ref('overview')

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
    activeSection.value = id
  }
}
</script>

<template>
  <div class="docs">
    <!-- Sidebar -->
    <aside class="sidebar">
      <nav class="sidebar-page-nav">
        <RouterLink to="/" class="page-nav-link">首页</RouterLink>
        <RouterLink to="/playground" class="page-nav-link">Playground</RouterLink>
        <RouterLink to="/examples" class="page-nav-link">案例</RouterLink>
        <RouterLink to="/docs" class="page-nav-link active">文档</RouterLink>
      </nav>
      <div class="sidebar-divider"></div>
      <nav class="sidebar-nav">
        <template v-for="(section, i) in h1Sections" :key="section.id">
          <a
            class="sidebar-link"
            :class="{ active: activeSection === section.id }"
            :href="`#${section.id}`"
            @click.prevent="scrollTo(section.id)"
          >
            {{ section.title }}
          </a>
          <template v-for="sub in sections.filter((s) => s.level === 2 && sections.indexOf(s) > sections.indexOf(section) && (i + 1 >= sections.filter((x) => x.level === 1).length || sections.indexOf(s) < sections.indexOf(sections.filter((x) => x.level === 1)[i + 1])))" :key="sub.id">
            <a
              class="sidebar-link sub"
              :href="`#${sub.id}`"
              @click.prevent="scrollTo(sub.id)"
            >
              {{ sub.title }}
            </a>
          </template>
        </template>
      </nav>
    </aside>

    <!-- Content -->
    <main class="docs-content">
      <h1>API 文档</h1>

      <!-- Overview -->
      <section id="overview">
        <h2>概述</h2>
        <p>
          Pool.js 是一个轻量级资源池调度器，基于 ES2024 显式资源管理（<code>Symbol.dispose</code> / <code>Symbol.asyncDispose</code>）实现。
          它提供了一种优雅的方式来管理有限资源（如数据库连接、HTTP 客户端、Worker 线程等）的分配与回收。
        </p>
        <div class="callout">
          <strong>核心概念</strong>
          <ul>
            <li><strong>Pool</strong> — 资源池，管理资源的创建、分配和回收</li>
            <li><strong>ResourceContainer</strong> — 资源容器，持有实际资源并负责释放</li>
            <li><strong>Scheduler</strong> — 任务调度器，将任务自动分配给空闲资源</li>
            <li><strong>CoolDown</strong> — 冷却回调，控制资源释放后再次可用的时间间隔</li>
          </ul>
        </div>
      </section>

      <!-- Installation -->
      <section id="installation">
        <h2>安装</h2>
        <CodeBlock code="npm install @cat5th/pool.js" lang="bash" />
      </section>

      <!-- Quick Start -->
      <section id="quick-start">
        <h2>快速开始</h2>
        <CodeBlock code="import { Pool } from '@cat5th/pool.js'

// 创建一个并发数为 3 的资源池
await using pool = new Pool({
  concurrency: 3,
  create: (i) => ({ id: i })
})

// 获取资源（返回 ResourceContainer）
// using 关键字确保离开作用域时自动释放
using resource = await pool.acquire()
console.log(resource.value.id)
// 池离开作用域时自动清理" />
      </section>

      <!-- Pool -->
      <section id="pool">
        <h2>Pool</h2>
        <p>
          <code>Pool&lt;T&gt;</code> 是资源池的核心类。它负责创建和管理资源，并提供获取、调度等 API。
        </p>
        <CodeBlock code="import { Pool } from '@cat5th/pool.js'

// 方式一：通过配置对象创建
const pool = new Pool({
  concurrency: 5,
  create: (i) => createDatabaseConnection(i)
})

// 方式二：通过并发数创建（默认资源为数字索引）
const pool2 = new Pool(3)
// 等价于 new Pool({ concurrency: 3, create: (i) => i })

// 方式三：通过已有资源数组创建
const pool3 = new Pool([worker1, worker2, worker3])" />
      </section>

      <!-- PoolOptions -->
      <section id="pool-options">
        <h3>PoolOptions 配置</h3>
        <table>
          <thead>
            <tr>
              <th>属性</th>
              <th>类型</th>
              <th>默认值</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>concurrency</code></td>
              <td><code>number</code></td>
              <td>—</td>
              <td>最大并发数，池能管理的资源总数</td>
            </tr>
            <tr>
              <td><code>create</code></td>
              <td><code>(created: number) => T | PromiseLike&lt;T&gt;</code></td>
              <td><code>(i) => i</code></td>
              <td>创建资源的工厂函数，参数为当前已创建的资源数量</td>
            </tr>
            <tr>
              <td><code>resources</code></td>
              <td><code>T[]</code></td>
              <td>—</td>
              <td>预存在的资源数组，这些资源在清理池时不会被销毁</td>
            </tr>
            <tr>
              <td><code>coolDown</code></td>
              <td><code>CoolDown</code></td>
              <td>—</td>
              <td>资源释放后的冷却回调，控制再次可用的时间</td>
            </tr>
            <tr>
              <td><code>shouldDispose</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>清理池时是否销毁已创建的资源（传入资源数组时为 <code>false</code>）</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Pool.acquire -->
      <section id="pool-acquire">
        <h3>acquire()</h3>
        <p>从池中获取一个资源，返回 <code>ResourceContainer&lt;T&gt;</code>。</p>
        <CodeBlock code="// 默认行为：如果没有可用资源，会等待
const resource = await pool.acquire()

// wait: false — 没有可用资源时立即抛出 NoResourceAvailableError
try {
  const resource = await pool.acquire({ wait: false })
} catch (error) {
  if (isNoResourceAvailableError(error)) {
    console.log('没有可用资源')
  }
}

// abortSignal — 可以通过 AbortSignal 中断等待
const controller = new AbortController()
const resource = await pool.acquire({ abortSignal: controller.signal })
controller.abort() // 中断等待，抛出 AbortError" />
        <p>返回的 <code>ResourceContainer</code> 实现了 <code>Symbol.dispose</code>，建议使用 <code>using</code> 关键字管理生命周期：</p>
        <CodeBlock code="using resource = await pool.acquire()
doSomething(resource.value)
// 离开作用域后自动释放" />
      </section>

      <!-- Pool.schedule -->
      <section id="pool-schedule">
        <h3>schedule()</h3>
        <p>创建一个 <a href="#scheduler"><code>Scheduler</code></a> 实例，用于基于任务的方式调度资源。</p>
        <CodeBlock code="const scheduler = pool.schedule()" />
      </section>

      <!-- Pool.enqueue -->
      <section id="pool-enqueue">
        <h3>enqueue()</h3>
        <p>快捷方法，等价于 <code>pool.schedule().enqueue()</code>。直接将任务放入调度队列。</p>
        <CodeBlock code="const result = await pool.enqueue(
  function(this: string, data: string) {
    console.log(`${this} processing: ${data}`)
    return data.toUpperCase()
  },
  'hello'
)" />
      </section>

      <!-- Pool.asyncDispose -->
      <section id="pool-asyncdispose">
        <h3>Symbol.asyncDispose()</h3>
        <p>
          清理整个资源池。等待所有已借出的资源归还后，销毁池创建的资源并重置状态。推荐使用 <code>await using</code> 关键字实现自动清理。
        </p>
        <CodeBlock code="// 推荐：使用 await using 关键字，离开作用域时自动清理
await using pool = new Pool({
  concurrency: 5,
  create: (i) => createDatabaseConnection(i)
})

using conn = await pool.acquire()
conn.query('SELECT * FROM users')
// 离开作用域后 pool 自动被清理

// 或者手动调用
await pool[Symbol.asyncDispose]()

// 或使用 using 关键字
using cleanup = pool
await cleanup[Symbol.asyncDispose]()" />
      </section>

      <!-- ResourceContainer -->
      <section id="resource-container">
        <h2>ResourceContainer</h2>
        <p>
          <code>ResourceContainer&lt;T&gt;</code> 是 <code>acquire()</code> 的返回值。它持有实际资源并负责在使用完毕后释放。
        </p>
        <CodeBlock code="const container = await pool.acquire()

// 获取实际资源值
const value = container.value

// 手动释放（一般不需要，推荐用 using 关键字）
container[Symbol.dispose]()" />
        <table>
          <thead>
            <tr>
              <th>属性/方法</th>
              <th>类型</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>value</code></td>
              <td><code>T</code></td>
              <td>实际的资源值（只读）</td>
            </tr>
            <tr>
              <td><code>[Symbol.dispose]()</code></td>
              <td><code>() => void</code></td>
              <td>释放资源回池</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Without using -->
      <section id="without-using">
        <h2>不使用 using 关键字</h2>
        <p>
          如果你的运行时不支持 ES2024 显式资源管理，或者你更喜欢手动控制，可以通过直接调用 <code>[Symbol.dispose]()</code> 和 <code>[Symbol.asyncDispose]()</code> 来管理资源生命周期：
        </p>
        <CodeBlock code="import { Pool } from '@cat5th/pool.js'

// 不使用 await using，需要手动清理
const pool = new Pool({
  concurrency: 3,
  create: (i) => createConnection(i)
})

// 获取资源，手动释放
const resource = await pool.acquire()
try {
  doSomething(resource.value)
} finally {
  resource[Symbol.dispose]()
}

// 池清理
await pool[Symbol.asyncDispose]()" />
        <div class="callout">
          <strong>推荐做法</strong>
          <p style="margin-top: 8px">
            使用 <code>await using</code> 和 <code>using</code> 关键字可以确保即使发生异常资源也能被正确释放，
            避免资源泄漏。如果你的环境支持（Node.js 22+），建议始终使用 <code>using</code> 关键字。
          </p>
        </div>
      </section>

      <!-- Scheduler -->
      <section id="scheduler">
        <h2>Scheduler</h2>
        <p>
          <code>Scheduler&lt;T&gt;</code> 提供基于任务的资源调度方式。你不需要手动获取和释放资源，Scheduler 会在有资源可用时自动执行任务。
        </p>
        <CodeBlock code="const scheduler = pool.schedule()

function work(this: string, data: string) {
  // this === 资源值
  console.log(`${this} processing: ${data}`)
  return data.toUpperCase()
}

// 所有任务并发运行（受并发数限制）
const results = await Promise.all([
  scheduler.enqueue(work, 'task1'),
  scheduler.enqueue(work, 'task2'),
  scheduler.enqueue(work, 'task3')
])" />
      </section>

      <!-- Scheduler.enqueue -->
      <section id="scheduler-enqueue">
        <h3>enqueue()</h3>
        <p>将一个任务放入队列。任务函数通过 <code>this</code> 接收池资源。</p>
        <CodeBlock code="const result = await scheduler.enqueue(
  function(this: Connection, query: string) {
    return this.query(query)
  },
  'SELECT * FROM users'
)" />
      </section>

      <!-- Scheduler.enqueueAll -->
      <section id="scheduler-enqueue-all">
        <h3>enqueueAll()</h3>
        <p>批量入队任务，返回所有结果的数组。接受同步或异步迭代器。</p>
        <CodeBlock code="const queries = ['SELECT 1', 'SELECT 2', 'SELECT 3']
const results = await scheduler.enqueueAll(
  function(this: Connection, q: string) {
    return this.query(q)
  },
  ...queries
)" />
      </section>

      <!-- Scheduler.wrap -->
      <section id="scheduler-wrap">
        <h3>wrap()</h3>
        <p>
          包装一个任务函数，返回一个新函数。调用这个新函数时会自动将任务入队。
          适合需要复用任务逻辑的场景。
        </p>
        <CodeBlock code="const query = scheduler.wrap(
  function(this: Connection, sql: string) {
    return this.query(sql)
  }
)

// 直接调用，自动调度
const rows = await query('SELECT * FROM users')" />
      </section>

      <!-- CoolDown -->
      <section id="cooldown">
        <h2>CoolDown</h2>
        <p>
          <code>CoolDown</code> 是一个回调函数，在资源被释放后执行。它接收资源调度的时间信息，
          返回一个 Promise 来控制资源何时可以再次被分配。
        </p>
        <CodeBlock code="const pool = new Pool({
  concurrency: 5,
  create: (i) => createHttpClient(i),
  coolDown: async ({ acquireAt, deliverAt, releaseAt }) => {
    // 资源释放后等待 100ms 才能再次使用
    await new Promise(resolve => setTimeout(resolve, 100))
  }
})" />
        <p>回调参数：</p>
        <table>
          <thead>
            <tr>
              <th>参数</th>
              <th>类型</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>acquireAt</code></td>
              <td><code>number</code></td>
              <td>资源开始被获取的时间戳</td>
            </tr>
            <tr>
              <td><code>deliverAt</code></td>
              <td><code>number</code></td>
              <td>资源被交付给调用者的时间戳</td>
            </tr>
            <tr>
              <td><code>releaseAt</code></td>
              <td><code>number</code></td>
              <td>资源开始被释放的时间戳</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Errors -->
      <section id="errors">
        <h2>错误处理</h2>
        <h3>NoResourceAvailableError</h3>
        <p>
          当 <code>acquire({ wait: false })</code> 且没有可用资源时抛出。
        </p>
        <CodeBlock code="import { Pool, isNoResourceAvailableError } from '@cat5th/pool.js'

try {
  using resource = await pool.acquire({ wait: false })
} catch (error) {
  if (isNoResourceAvailableError(error)) {
    console.log('资源池已满，无可用资源')
  }
}" />
      </section>

      <!-- Types -->
      <section id="types">
        <h2>类型定义</h2>
        <CodeBlock code="interface PoolOptions<T> {
  concurrency: number
  create?: (created: number) => T | PromiseLike<T>
  resources?: T[]
  coolDown?: CoolDown
  shouldDispose?: boolean
}

type CoolDown = (timing: {
  acquireAt: number
  deliverAt: number
  releaseAt: number
}) => Promise<void>

type Task<T> = (this: T, ...args: unknown[]) => unknown

class ResourceContainer<T> {
  get value(): T
  [Symbol.dispose](): void
}" />
      </section>

      <!-- Footer -->
      <div class="docs-footer">
        <p>Pool.js v2 · 基于 ES2024 显式资源管理</p>
        <a href="https://github.com/harvey-woo/pool.js" target="_blank" rel="noopener">
          在 GitHub 上查看 →
        </a>
      </div>
    </main>
  </div>
</template>

<style scoped>
.docs {
  display: flex;
  min-height: calc(100vh - 60px);
}

/* Sidebar */
.sidebar {
  width: 240px;
  border-right: 1px solid #e8e8e8;
  padding: 24px 0;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
  flex-shrink: 0;
  background: #fafafa;
}

.sidebar-page-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0 8px 0;
}

.page-nav-link {
  display: block;
  padding: 6px 20px;
  font-size: 14px;
  color: #555;
  transition: all 0.15s;
}

.page-nav-link:hover {
  color: #667eea;
  background: #f5f5ff;
}

.page-nav-link.active {
  color: #667eea;
  font-weight: 600;
  background: #f0f0ff;
}

.sidebar-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 12px 20px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-link {
  display: block;
  padding: 6px 20px;
  font-size: 14px;
  color: #555;
  border-right: 2px solid transparent;
  transition: all 0.15s;
}

.sidebar-link:hover {
  color: #667eea;
  background: #f5f5ff;
}

.sidebar-link.active {
  color: #667eea;
  font-weight: 600;
  border-right-color: #667eea;
  background: #f0f0ff;
}

.sidebar-link.sub {
  padding-left: 32px;
  font-size: 13px;
}

/* Content */
.docs-content {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 32px 80px;
}

.docs-content h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 32px;
  color: #1a1a2e;
}

.docs-content h2 {
  font-size: 24px;
  font-weight: 600;
  margin-top: 48px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  color: #1a1a2e;
}

.docs-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 12px;
  color: #333;
}

.docs-content p {
  font-size: 15px;
  line-height: 1.7;
  color: #555;
  margin-bottom: 16px;
}

.docs-content code {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  color: #667eea;
}

.docs-content a {
  color: #667eea;
}

.docs-content a:hover {
  text-decoration: underline;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}

thead {
  background: #f9f9f9;
}

th,
td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

th {
  font-weight: 600;
  color: #1a1a2e;
}

td {
  color: #555;
}

td code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  color: #667eea;
  font-size: 0.9em;
}

/* Callout */
.callout {
  background: #f9f9ff;
  border-left: 4px solid #667eea;
  padding: 16px 20px;
  border-radius: 0 8px 8px 0;
  margin: 16px 0;
}

.callout strong {
  color: #1a1a2e;
  display: block;
  margin-bottom: 8px;
}

.callout ul {
  margin: 0;
  padding-left: 20px;
  color: #555;
  font-size: 14px;
  line-height: 1.8;
}

/* Footer */
.docs-footer {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
  font-size: 14px;
  color: #999;
}

.docs-footer a {
  color: #667eea;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .docs-content {
    padding: 24px 16px 60px;
  }

  .docs-content h1 {
    font-size: 24px;
  }

  .docs-content h2 {
    font-size: 20px;
  }

  table {
    font-size: 12px;
  }

  th,
  td {
    padding: 8px 8px;
  }
}
</style>
