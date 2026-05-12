<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import CodeBlock from '../components/CodeBlock.vue'

type Section = {
  id: string
  title: string
}

const sections: Section[] = [
  { id: 'featured', title: '推荐项目' },
  { id: 'api-proxy', title: '构建限流 API 代理' },
  { id: 'db-pool', title: '数据库连接池' },
  { id: 'scraping', title: '爬虫速率控制' },
]

const activeSection = ref('featured')

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
    activeSection.value = id
  }
}
</script>

<template>
  <div class="examples">
    <!-- Sidebar -->
    <aside class="sidebar">
      <nav class="sidebar-page-nav">
        <RouterLink to="/" class="page-nav-link">首页</RouterLink>
        <RouterLink to="/playground" class="page-nav-link">Playground</RouterLink>
        <RouterLink to="/examples" class="page-nav-link active">案例</RouterLink>
        <RouterLink to="/docs" class="page-nav-link">文档</RouterLink>
      </nav>
      <div class="sidebar-divider"></div>
      <nav class="sidebar-nav">
        <a
          v-for="section in sections"
          :key="section.id"
          class="sidebar-link"
          :class="{ active: activeSection === section.id }"
          :href="`#${section.id}`"
          @click.prevent="scrollTo(section.id)"
        >
          {{ section.title }}
        </a>
      </nav>
    </aside>

    <!-- Content -->
    <main class="examples-content">

      <!-- Featured Project -->
      <section id="featured" class="featured">
        <div class="featured-card">
          <div class="featured-badge">推荐项目</div>
          <div class="featured-content">
            <div class="featured-info">
              <h2>
                <a href="https://github.com/harvey-woo/rate-proxy" target="_blank" rel="noopener">
                  rate-proxy
                  <span class="external-link">↗</span>
                </a>
              </h2>
              <p>
                一个带并发控制的 HTTP 反向代理服务器。使用 Pool.js 的 Scheduler 限制对上游服务器的并发请求数，防止目标服务被压垮。
              </p>
              <div class="featured-tags">
                <span>Scheduler</span>
                <span>enqueue</span>
                <span>HTTP 代理</span>
                <span>并发控制</span>
              </div>
            </div>
            <div class="featured-actions">
              <a href="https://github.com/harvey-woo/rate-proxy" target="_blank" rel="noopener" class="btn btn-primary">
                GitHub
              </a>
              <a href="https://www.npmjs.com/package/@cat5th/rate-proxy" target="_blank" rel="noopener" class="btn btn-ghost">
                npm
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Tutorials -->
      <section class="tutorials">

        <!-- Tutorial 1 -->
        <div class="tutorial" id="api-proxy">
          <div class="tutorial-header">
            <span class="tutorial-number">01</span>
            <h2>构建限流 API 代理</h2>
          </div>
          <p class="tutorial-desc">
            使用 <code>Scheduler</code> 将上游请求限制在固定并发数内。当达到上限时，新请求进入队列等待，不会压垮目标服务。
          </p>

          <div class="tutorial-steps">
            <div class="step">
              <h3>创建资源池和调度器</h3>
              <CodeBlock code="import { Pool } from '@cat5th/pool.js'
import { createServer } from 'node:http'

const CONCURRENCY = 5
const pool = new Pool(CONCURRENCY)
const scheduler = pool.schedule()" lang="javascript" />
            </div>

            <div class="step">
              <h3>代理请求</h3>
              <CodeBlock code="const server = createServer(async (req, res) => {
  await scheduler.enqueue(async function () {
    const response = await fetch('https://api.example.com' + req.url, {
      method: req.method,
      headers: req.headers,
    })
    res.writeHead(response.status)
    for await (const chunk of response.body) {
      res.write(chunk)
    }
    res.end()
  })
})

server.listen(8080)" lang="javascript" />
            </div>
          </div>
        </div>

        <!-- Tutorial 2 -->
        <div class="tutorial" id="db-pool">
          <div class="tutorial-header">
            <span class="tutorial-number">02</span>
            <h2>数据库连接池</h2>
          </div>
          <p class="tutorial-desc">
            使用 <code>acquire()</code> + <code>using</code> 实现数据库连接的自动释放，避免连接泄漏。
          </p>

          <div class="tutorial-steps">
            <div class="step">
              <h3>创建连接池</h3>
              <CodeBlock code="async function main() {
  await using pool = new Pool({
    concurrency: 10,
    async create() {
      const client = createClient()
      await client.connect()
      return client
    },
    async coolDown({ releaseAt }) {
      // 连接归还后冷却 50ms
      await new Promise(r => setTimeout(r, 50))
    }
  })

  // acquire + using
  using conn = await pool.acquire()
  const user = await conn.get('user:1')

  // 离开作用域时 pool 自动清理
}" lang="javascript" />
            </div>
          </div>
        </div>

        <!-- Tutorial 3 -->
        <div class="tutorial" id="scraping">
          <div class="tutorial-header">
            <span class="tutorial-number">03</span>
            <h2>爬虫速率控制</h2>
          </div>
          <p class="tutorial-desc">
            使用 <code>CoolDown</code> 冷却回调控制请求频率，避免被目标网站封禁。
          </p>

          <div class="tutorial-steps">
            <div class="step">
              <h3>配置冷却策略</h3>
              <CodeBlock code="import { Pool } from '@cat5th/pool.js'

const pool = new Pool({
  concurrency: 2,
  create: (i) => ({ id: i }),
  coolDown({ releaseAt }) {
    // 每次请求后至少间隔 2 秒
    const elapsed = Date.now() - releaseAt
    const wait = Math.max(0, 2000 - elapsed)
    return new Promise(r => setTimeout(r, wait))
  }
})" lang="javascript" />
            </div>

            <div class="step">
              <h3>批量抓取</h3>
              <CodeBlock code="const scheduler = pool.schedule()
const fetchPage = scheduler.wrap(
  async function(this: { id: number }, url: string) {
    console.log('Worker ' + this.id + ' fetching ' + url)
    const res = await fetch(url)
    return res.text()
  }
)

const urls = [
  'https://example.com/page/1',
  'https://example.com/page/2',
  'https://example.com/page/3',
  'https://example.com/page/4',
]

const pages = await scheduler.enqueueAll(fetchPage, ...urls)
console.log('Fetched ' + pages.length + ' pages')" lang="javascript" />
            </div>
          </div>
        </div>

      </section>

      <!-- CTA -->
      <section class="cta">
        <h2>开始使用 Pool.js</h2>
        <p>从文档开始，快速上手你的第一个项目</p>
        <div class="cta-actions">
          <RouterLink to="/docs" class="btn btn-primary">查看文档</RouterLink>
          <RouterLink to="/playground" class="btn btn-ghost">打开 Playground</RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.examples {
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

/* Content */
.examples-content {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 32px 80px;
}

/* Featured */
.featured {
  padding: 16px 0;
}

.featured-card {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  color: white;
}

.featured-badge {
  position: absolute;
  top: 16px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.featured-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.featured-info h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.featured-info h2 a {
  color: white;
}

.featured-info h2 a:hover {
  opacity: 0.8;
}

.external-link {
  font-size: 0.7em;
  vertical-align: super;
  opacity: 0.7;
}

.featured-info p {
  font-size: 15px;
  opacity: 0.9;
  line-height: 1.6;
  max-width: 500px;
}

.featured-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.featured-tags span {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
}

.featured-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* Tutorials */
.tutorials {
  padding: 40px 0;
}

.tutorial {
  margin-bottom: 56px;
  padding-bottom: 56px;
  border-bottom: 1px solid #f0f0f0;
}

.tutorial:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.tutorial-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.tutorial-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.tutorial-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.tutorial-desc {
  font-size: 15px;
  color: #666;
  margin-bottom: 28px;
  line-height: 1.6;
}

.tutorial-desc code {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  color: #667eea;
}

.tutorial-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid #667eea;
}

/* CTA */
.cta {
  padding: 64px 32px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
}

.cta h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
}

.cta p {
  font-size: 16px;
  margin-bottom: 24px;
  opacity: 0.9;
}

.cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.featured .btn-primary {
  background: white;
  color: #667eea;
}

.btn-ghost {
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .examples-content {
    padding: 24px 16px 60px;
  }

  .featured-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .featured-info h2 {
    font-size: 22px;
  }

  .tutorial-header h2 {
    font-size: 20px;
  }

  .cta {
    padding: 48px 20px;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
