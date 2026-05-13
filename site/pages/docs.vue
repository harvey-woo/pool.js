<script setup lang="ts">
import CodeBlock from '~/components/CodeBlock.vue'

const { t } = useI18n()
const localePath = useLocalePath()

type Section = {
  id: string
  title: string
  level: number
}

const sections: Section[] = [
  { id: 'overview', title: t('docs.sidebarOverview'), level: 1 },
  { id: 'installation', title: t('docs.sidebarInstallation'), level: 1 },
  { id: 'quick-start', title: t('docs.sidebarQuickStart'), level: 1 },
  { id: 'pool', title: t('docs.sidebarPool'), level: 1 },
  { id: 'pool-options', title: t('docs.sidebarPoolOptions'), level: 2 },
  { id: 'pool-acquire', title: t('docs.sidebarAcquire'), level: 2 },
  { id: 'pool-schedule', title: t('docs.sidebarSchedule'), level: 2 },
  { id: 'pool-enqueue', title: t('docs.sidebarEnqueue'), level: 2 },
  { id: 'pool-asyncdispose', title: t('docs.sidebarAsyncDispose'), level: 2 },
  { id: 'resource-container', title: t('docs.sidebarResourceContainer'), level: 1 },
  { id: 'without-using', title: t('docs.sidebarWithoutUsing'), level: 1 },
  { id: 'scheduler', title: t('docs.sidebarScheduler'), level: 1 },
  { id: 'scheduler-enqueue', title: t('docs.sidebarSchedulerEnqueue'), level: 2 },
  { id: 'scheduler-enqueue-all', title: t('docs.sidebarSchedulerEnqueueAll'), level: 2 },
  { id: 'scheduler-wrap', title: t('docs.sidebarSchedulerWrap'), level: 2 },
  { id: 'cooldown', title: t('docs.sidebarCoolDown'), level: 1 },
  { id: 'errors', title: t('docs.sidebarErrors'), level: 1 },
  { id: 'types', title: t('docs.sidebarTypes'), level: 1 },
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
        <NuxtLink :to="localePath('/')" class="page-nav-link">{{ $t('docs.sidebarHome') }}</NuxtLink>
        <NuxtLink :to="localePath('/playground')" class="page-nav-link">{{ $t('nav.playground') }}</NuxtLink>
        <NuxtLink :to="localePath('/examples')" class="page-nav-link">{{ $t('nav.examples') }}</NuxtLink>
        <NuxtLink :to="localePath('/docs')" class="page-nav-link active">{{ $t('nav.docs') }}</NuxtLink>
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
      <h1>{{ $t('docs.title') }}</h1>

      <!-- Overview -->
      <section id="overview">
        <h2>{{ $t('docs.overviewTitle') }}</h2>
        <i18n-t keypath="docs.overviewDesc" tag="p">
          <template #dispose><code>Symbol.dispose</code></template>
          <template #asyncDispose><code>Symbol.asyncDispose</code></template>
        </i18n-t>
        <div class="callout">
          <strong>{{ $t('docs.overviewCore') }}</strong>
          <ul>
            <li>{{ $t('docs.overviewCorePool') }}</li>
            <li>{{ $t('docs.overviewCoreResourceContainer') }}</li>
            <li>{{ $t('docs.overviewCoreScheduler') }}</li>
            <li>{{ $t('docs.overviewCoreCoolDown') }}</li>
          </ul>
        </div>
      </section>

      <!-- Installation -->
      <section id="installation">
        <h2>{{ $t('docs.installationTitle') }}</h2>
        <CodeBlock code="npm install @cat5th/pool.js" lang="bash" />
      </section>

      <!-- Quick Start -->
      <section id="quick-start">
        <h2>{{ $t('docs.quickStartTitle') }}</h2>
        <CodeBlock code="import { Pool } from '@cat5th/pool.js'

// Create a resource pool with concurrency of 3
await using pool = new Pool({
  concurrency: 3,
  create: (i) => ({ id: i })
})

// Acquire a resource (returns ResourceContainer)
// `using` keyword ensures automatic release when leaving scope
using resource = await pool.acquire()
console.log(resource.value.id)
// Auto cleanup when pool leaves scope" />
      </section>

      <!-- Pool -->
      <section id="pool">
        <h2>{{ $t('docs.poolTitle') }}</h2>
        <i18n-t keypath="docs.poolDesc" tag="p">
          <template #Pool><code>Pool&lt;T&gt;</code></template>
        </i18n-t>
        <CodeBlock code="import { Pool } from '@cat5th/pool.js'

// Option 1: Create via config object
const pool = new Pool({
  concurrency: 5,
  create: (i) => createDatabaseConnection(i)
})

// Option 2: Create via concurrency number (defaults to numeric index resources)
const pool2 = new Pool(3)
// Equivalent to new Pool({ concurrency: 3, create: (i) => i })

// Option 3: Create from existing resources array
const pool3 = new Pool([worker1, worker2, worker3])" />
      </section>

      <!-- PoolOptions -->
      <section id="pool-options">
        <h3>{{ $t('docs.poolOptionsTitle') }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ $t('docs.tableProperty') }}</th>
              <th>{{ $t('docs.tableType') }}</th>
              <th>{{ $t('docs.tableDefault') }}</th>
              <th>{{ $t('docs.tableDescription') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>concurrency</code></td>
              <td><code>number</code></td>
              <td>—</td>
              <td>{{ $t('docs.propConcurrencyDesc') }}</td>
            </tr>
            <tr>
              <td><code>create</code></td>
              <td><code>(created: number) => T | PromiseLike&lt;T&gt;</code></td>
              <td><code>(i) => i</code></td>
              <td>{{ $t('docs.propCreateDesc') }}</td>
            </tr>
            <tr>
              <td><code>resources</code></td>
              <td><code>T[]</code></td>
              <td>—</td>
              <td>{{ $t('docs.propResourcesDesc') }}</td>
            </tr>
            <tr>
              <td><code>coolDown</code></td>
              <td><code>CoolDown</code></td>
              <td>—</td>
              <td>{{ $t('docs.propCoolDownDesc') }}</td>
            </tr>
            <tr>
              <td><code>shouldDispose</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>{{ $t('docs.propShouldDisposeDesc') }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Pool.acquire -->
      <section id="pool-acquire">
        <h3>{{ $t('docs.acquireTitle') }}</h3>
        <i18n-t keypath="docs.acquireDesc" tag="p">
          <template #ResourceContainer><code>ResourceContainer&lt;T&gt;</code></template>
        </i18n-t>
        <CodeBlock code="// Default behavior: waits if no resource is available
const resource = await pool.acquire()

// wait: false — throws NoResourceAvailableError immediately
try {
  const resource = await pool.acquire({ wait: false })
} catch (error) {
  if (isNoResourceAvailableError(error)) {
    console.log('No resource available')
  }
}

// abortSignal — cancel waiting via AbortSignal
const controller = new AbortController()
const resource = await pool.acquire({ abortSignal: controller.signal })
controller.abort() // Cancels waiting, throws AbortError" />
        <i18n-t keypath="docs.acquireContainerDesc" tag="p">
          <template #ResourceContainer><code>ResourceContainer</code></template>
          <template #dispose><code>Symbol.dispose</code></template>
          <template #using><code>using</code></template>
        </i18n-t>
        <CodeBlock code="using resource = await pool.acquire()
doSomething(resource.value)
// Auto released when leaving scope" />
      </section>

      <!-- Pool.schedule -->
      <section id="pool-schedule">
        <h3>{{ $t('docs.scheduleTitle') }}</h3>
        <i18n-t keypath="docs.scheduleDesc" tag="p">
          <template #Scheduler><code>Scheduler</code></template>
        </i18n-t>
        <CodeBlock code="const scheduler = pool.schedule()" />
      </section>

      <!-- Pool.enqueue -->
      <section id="pool-enqueue">
        <h3>{{ $t('docs.enqueueTitle') }}</h3>
        <p>{{ $t('docs.enqueueDesc') }}</p>
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
        <h3>{{ $t('docs.asyncDisposeTitle') }}</h3>
        <i18n-t keypath="docs.asyncDisposeDesc" tag="p">
          <template #awaitUsing><code>await using</code></template>
        </i18n-t>
        <CodeBlock code="// Recommended: use await using for automatic cleanup
await using pool = new Pool({
  concurrency: 5,
  create: (i) => createDatabaseConnection(i)
})

using conn = await pool.acquire()
conn.value.query('SELECT * FROM users')
// Pool is automatically cleaned up when leaving scope

// Or call manually
await pool[Symbol.asyncDispose]()

// Or using keyword
using cleanup = pool
await cleanup[Symbol.asyncDispose]()" />
      </section>

      <!-- ResourceContainer -->
      <section id="resource-container">
        <h2>{{ $t('docs.resourceContainerTitle') }}</h2>
        <i18n-t keypath="docs.resourceContainerDesc" tag="p">
          <template #ResourceContainer><code>ResourceContainer&lt;T&gt;</code></template>
          <template #acquire><code>acquire()</code></template>
        </i18n-t>
        <CodeBlock code="const container = await pool.acquire()

// Get the actual resource value
const value = container.value

// Manual release (usually not needed, recommend using keyword)
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
              <td>{{ $t('docs.resourceContainerValue') }}</td>
            </tr>
            <tr>
              <td><code>[Symbol.dispose]()</code></td>
              <td><code>() => void</code></td>
              <td>{{ $t('docs.resourceContainerRelease') }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Without using -->
      <section id="without-using">
        <h2>{{ $t('docs.withoutUsingTitle') }}</h2>
        <i18n-t keypath="docs.withoutUsingDesc" tag="p">
          <template #dispose><code>[Symbol.dispose]()</code></template>
          <template #asyncDispose><code>[Symbol.asyncDispose]()</code></template>
        </i18n-t>
        <CodeBlock code="import { Pool } from '@cat5th/pool.js'

// Without await using, manual cleanup required
const pool = new Pool({
  concurrency: 3,
  create: (i) => createConnection(i)
})

// Acquire resource, manual release
const resource = await pool.acquire()
try {
  doSomething(resource.value)
} finally {
  resource[Symbol.dispose]()
}

// Pool cleanup
await pool[Symbol.asyncDispose]()" />
        <div class="callout">
          <strong>{{ $t('docs.recommendedPractice') }}</strong>
          <i18n-t keypath="docs.recommendedPracticeDesc" tag="p" style="margin-top: 8px">
            <template #awaitUsing><code>await using</code></template>
            <template #using><code>using</code></template>
          </i18n-t>
        </div>
      </section>

      <!-- Scheduler -->
      <section id="scheduler">
        <h2>{{ $t('docs.schedulerTitle') }}</h2>
        <i18n-t keypath="docs.schedulerDesc" tag="p">
          <template #Scheduler><code>Scheduler&lt;T&gt;</code></template>
        </i18n-t>
        <CodeBlock code="const scheduler = pool.schedule()

function work(this: string, data: string) {
  // this === resource value
  console.log(`${this} processing: ${data}`)
  return data.toUpperCase()
}

// All tasks run concurrently (limited by concurrency)
const results = await Promise.all([
  scheduler.enqueue(work, 'task1'),
  scheduler.enqueue(work, 'task2'),
  scheduler.enqueue(work, 'task3')
])" />
      </section>

      <!-- Scheduler.enqueue -->
      <section id="scheduler-enqueue">
        <h3>{{ $t('docs.schedulerEnqueueTitle') }}</h3>
        <i18n-t keypath="docs.schedulerEnqueueDesc" tag="p">
          <template #this><code>this</code></template>
        </i18n-t>
        <CodeBlock code="const result = await scheduler.enqueue(
  function(this: Connection, query: string) {
    return this.query(query)
  },
  'SELECT * FROM users'
)" />
      </section>

      <!-- Scheduler.enqueueAll -->
      <section id="scheduler-enqueue-all">
        <h3>{{ $t('docs.schedulerEnqueueAllTitle') }}</h3>
        <p>{{ $t('docs.schedulerEnqueueAllDesc') }}</p>
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
        <h3>{{ $t('docs.schedulerWrapTitle') }}</h3>
        <p>{{ $t('docs.schedulerWrapDesc') }}</p>
        <CodeBlock code="const query = scheduler.wrap(
  function(this: Connection, sql: string) {
    return this.query(sql)
  }
)

// Direct call, automatic scheduling
const rows = await query('SELECT * FROM users')" />
      </section>

      <!-- CoolDown -->
      <section id="cooldown">
        <h2>{{ $t('docs.coolDownTitle') }}</h2>
        <i18n-t keypath="docs.coolDownDesc" tag="p">
          <template #CoolDown><code>CoolDown</code></template>
        </i18n-t>
        <CodeBlock code="const pool = new Pool({
  concurrency: 5,
  create: (i) => createHttpClient(i),
  coolDown: async ({ acquireAt, deliverAt, releaseAt }) => {
    // Wait 100ms after resource release before it can be used again
    await new Promise(resolve => setTimeout(resolve, 100))
  }
})" />
        <p>{{ $t('docs.coolDownCallbackParams') }}</p>
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
              <td>{{ $t('docs.coolDownAcquireAt') }}</td>
            </tr>
            <tr>
              <td><code>deliverAt</code></td>
              <td><code>number</code></td>
              <td>{{ $t('docs.coolDownDeliverAt') }}</td>
            </tr>
            <tr>
              <td><code>releaseAt</code></td>
              <td><code>number</code></td>
              <td>{{ $t('docs.coolDownReleaseAt') }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Errors -->
      <section id="errors">
        <h2>{{ $t('docs.errorsTitle') }}</h2>
        <h3>{{ $t('docs.noResourceAvailableError') }}</h3>
        <i18n-t keypath="docs.noResourceAvailableErrorDesc" tag="p">
          <template #acquire><code>acquire({ wait: false })</code></template>
        </i18n-t>
        <CodeBlock code="import { Pool, isNoResourceAvailableError } from '@cat5th/pool.js'

try {
  using resource = await pool.acquire({ wait: false })
} catch (error) {
  if (isNoResourceAvailableError(error)) {
    console.log('Pool is full, no resources available')
  }
}" />
      </section>

      <!-- Types -->
      <section id="types">
        <h2>{{ $t('docs.typesTitle') }}</h2>
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
        <p>{{ $t('docs.footerText') }}</p>
        <a href="https://github.com/harvey-woo/pool.js" target="_blank" rel="noopener">
          {{ $t('docs.footerGithubBtn') }}
        </a>
      </div>
    </main>
  </div>
</template>

<style scoped>
.docs { display: flex; min-height: calc(100vh - 60px); }
.sidebar { width: 240px; border-right: 1px solid #e8e8e8; padding: 24px 0; position: sticky; top: 60px; height: calc(100vh - 60px); overflow-y: auto; flex-shrink: 0; background: #fafafa; }
.sidebar-page-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 0 8px 0; }
.page-nav-link { display: block; padding: 6px 20px; font-size: 14px; color: #555; transition: all 0.15s; }
.page-nav-link:hover { color: #667eea; background: #f5f5ff; }
.page-nav-link.active { color: #667eea; font-weight: 600; background: #f0f0ff; }
.sidebar-divider { height: 1px; background: #e8e8e8; margin: 12px 20px; }
.sidebar-nav { display: flex; flex-direction: column; gap: 2px; }
.sidebar-link { display: block; padding: 6px 20px; font-size: 14px; color: #555; border-right: 2px solid transparent; transition: all 0.15s; }
.sidebar-link:hover { color: #667eea; background: #f5f5ff; }
.sidebar-link.active { color: #667eea; font-weight: 600; border-right-color: #667eea; background: #f0f0ff; }
.sidebar-link.sub { padding-left: 32px; font-size: 13px; }
.docs-content { flex: 1; max-width: 900px; margin: 0 auto; padding: 40px 32px 80px; }
.docs-content h1 { font-size: 32px; font-weight: 700; margin-bottom: 32px; color: #1a1a2e; }
.docs-content h2 { font-size: 24px; font-weight: 600; margin-top: 48px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; color: #1a1a2e; }
.docs-content h3 { font-size: 18px; font-weight: 600; margin-top: 32px; margin-bottom: 12px; color: #333; }
.docs-content p { font-size: 15px; line-height: 1.7; color: #555; margin-bottom: 16px; }
.docs-content code { background: #f5f5f5; padding: 2px 8px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.9em; color: #667eea; }
.docs-content a { color: #667eea; }
.docs-content a:hover { text-decoration: underline; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
thead { background: #f9f9f9; }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #f0f0f0; }
th { font-weight: 600; color: #1a1a2e; }
td { color: #555; }
td code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; color: #667eea; font-size: 0.9em; }
.callout { background: #f9f9ff; border-left: 4px solid #667eea; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; }
.callout strong { color: #1a1a2e; display: block; margin-bottom: 8px; }
.callout ul { margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8; }
.docs-footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 14px; color: #999; }
.docs-footer a { color: #667eea; font-weight: 500; }
@media (max-width: 768px) {
  .sidebar { display: none; }
  .docs-content { padding: 24px 16px 60px; }
  .docs-content h1 { font-size: 24px; }
  .docs-content h2 { font-size: 20px; }
  table { font-size: 12px; }
  th, td { padding: 8px 8px; }
}
</style>
