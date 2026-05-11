<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CodeBlock from '../components/CodeBlock.vue'
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          🏊 Pool.js
        </h1>
        <p class="hero-subtitle">
          轻量级资源池调度器，支持 <code>Scheduler</code>、<code>CoolDown</code> 和显式资源管理。
        </p>
        <p class="hero-version">
          基于 <code>Symbol.dispose</code> / <code>Symbol.asyncDispose</code> 的 ES2024 显式资源管理方案。
        </p>
        <div class="hero-actions">
          <RouterLink to="/playground" class="btn btn-primary">
            在线演示 →
          </RouterLink>
          <RouterLink to="/docs" class="btn btn-secondary">
            查看文档
          </RouterLink>
          <a href="https://github.com/harvey-woo/pool.js" class="btn btn-ghost" target="_blank" rel="noopener">
            GitHub
          </a>
        </div>
      </div>
    </section>

    <!-- Install -->
    <section class="install-section">
      <div class="container">
        <div class="install-box">
          <span class="install-label">安装</span>
          <div class="install-code">
            <code>npm install @cat5th/pool.js</code>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">特性</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>显式资源管理</h3>
            <p>基于 ES2024 <code>Symbol.dispose</code>，资源在离开作用域时自动释放，避免资源泄漏。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📋</div>
            <h3>任务调度器</h3>
            <p><code>Scheduler</code> 将任务自动分配给空闲资源，支持 <code>wrap</code> 和 <code>enqueue</code> 两种调用方式。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⏱️</div>
            <h3>冷却机制</h3>
            <p><code>CoolDown</code> 回调在资源释放后控制再次可用的时间间隔，实现速率限制。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔧</div>
            <h3>灵活配置</h3>
            <p>支持工厂函数创建、预创建资源、自定义并发数，以及异步销毁清理。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📦</div>
            <h3>零依赖</h3>
            <p>纯 TypeScript 实现，无任何外部依赖，体积小巧，开箱即用。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⏳</div>
            <h3>异步清理</h3>
            <p><code>Symbol.asyncDispose</code> 等待所有资源归还后再清理，确保异步资源的完整生命周期。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Start -->
    <section class="quick-start">
      <div class="container">
        <h2 class="section-title">快速开始</h2>
        <div class="code-blocks">
          <div class="code-example">
            <h3>基本用法</h3>
            <CodeBlock code="import { Pool } from '@cat5th/pool.js'

const pool = new Pool({
  concurrency: 3,
  create: (i) => ({ id: i })
})

// acquire() 返回 ResourceContainer
// 离开作用域后自动释放 (Symbol.dispose)
using resource = await pool.acquire()
console.log(resource.value.id)
// resource 自动释放

// 清理整个池
await pool[Symbol.asyncDispose]()" />
          </div>
          <div class="code-example">
            <h3>Scheduler</h3>
            <CodeBlock code="const pool = new Pool({
  concurrency: 2,
  create: (i) => `worker-${i}`
})

const scheduler = pool.schedule()

function work(this: string, data: string) {
  console.log(`${this} processing: ${data}`)
  return data.toUpperCase()
}

// 自动调度到可用资源
const result = await scheduler.enqueue(work, 'hello')

// 或者用 wrap 包装
const wrapped = scheduler.wrap(work)
await wrapped('world')" />
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <div class="container">
        <h2>试试在线演示</h2>
        <p>通过交互式 Playground 了解 Pool.js 的工作原理</p>
        <RouterLink to="/playground" class="btn btn-primary">
          打开 Playground →
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Hero */
.hero {
  padding: 120px 24px 80px;
  text-align: center;
  background: linear-gradient(180deg, #f0f0ff 0%, #ffffff 100%);
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -2px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 20px;
  color: #555;
  max-width: 600px;
  margin: 0 auto 12px;
  line-height: 1.6;
}

.hero-version {
  font-size: 15px;
  color: #999;
  max-width: 600px;
  margin: 0 auto 40px;
}

.hero-version code,
.hero-subtitle code {
  background: #f0f0ff;
  padding: 2px 8px;
  border-radius: 4px;
  color: #667eea;
  font-size: 0.9em;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Install */
.install-section {
  padding: 40px 24px;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.install-box {
  max-width: 500px;
  margin: 0 auto;
}

.install-label {
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  display: block;
}

.install-code {
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 16px 24px;
  border-radius: 8px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 16px;
  user-select: all;
}

/* Features */
.features {
  padding: 80px 24px;
}

.section-title {
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 48px;
  color: #1a1a2e;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  transition: box-shadow 0.2s;
}

.feature-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a2e;
}

.feature-card p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.feature-card p code {
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
  color: #667eea;
}

/* Quick Start */
.quick-start {
  padding: 80px 24px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.code-blocks {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.code-example {
  border-radius: 12px;
  overflow: hidden;
}

.code-example h3 {
  color: #fff;
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.code-example :deep(.code-block) {
  margin: 0;
  border-radius: 0;
}

.code-example :deep(pre) {
  padding: 20px;
  margin: 0;
  overflow-x: auto;
}

.code-example :deep(code) {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
}

/* CTA */
.cta {
  padding: 80px 24px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.cta .btn-primary {
  background: white;
  color: #667eea;
}

.cta .btn-primary:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: #f0f0f0;
  color: #1a1a2e;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-ghost {
  color: #666;
  border: 1px solid #ddd;
}

.btn-ghost:hover {
  background: #f5f5f5;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    font-size: 17px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .code-blocks {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
