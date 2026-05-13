<script setup lang="ts">
import CodeBlock from '~/components/CodeBlock.vue'
import {
  IconTarget,
  IconListDetails,
  IconClock,
  IconSettings,
  IconPackage,
  IconHourglass
} from '@tabler/icons-vue'

const localePath = useLocalePath()
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          {{ $t('home.heroTitle') }}
        </h1>
        <p class="hero-subtitle">
          <i18n-t keypath="home.heroSubtitle" tag="span">
            <template #scheduler><code>Scheduler</code></template>
            <template #coolDown><code>CoolDown</code></template>
          </i18n-t>
        </p>
        <p class="hero-version">
          <i18n-t keypath="home.heroVersion" tag="span">
            <template #dispose><code>Symbol.dispose</code></template>
            <template #asyncDispose><code>Symbol.asyncDispose</code></template>
          </i18n-t>
        </p>
        <div class="badges">
          <a href="https://www.npmjs.com/package/@cat5th/pool.js" target="_blank" rel="noopener">
            <img src="https://img.shields.io/npm/v/@cat5th/pool.js.svg?style=flat-square" alt="npm version" />
          </a>
          <a href="https://www.npmjs.com/package/@cat5th/pool.js" target="_blank" rel="noopener">
            <img src="https://img.shields.io/npm/l/@cat5th/pool.js.svg?style=flat-square" alt="license" />
          </a>
          <a href="https://www.npmjs.com/package/@cat5th/pool.js" target="_blank" rel="noopener">
            <img src="https://img.shields.io/npm/dt/@cat5th/pool.js.svg?style=flat-square" alt="npm downloads" />
          </a>
          <a href="https://codecov.io/gh/harvey-woo/pool.js" target="_blank" rel="noopener">
            <img src="https://img.shields.io/codecov/c/github/harvey-woo/pool.js.svg?style=flat-square" alt="coverage" />
          </a>
          <a href="https://github.com/harvey-woo/pool.js/actions/workflows/npm-publish.yml" target="_blank" rel="noopener">
            <img src="https://github.com/harvey-woo/pool.js/actions/workflows/npm-publish.yml/badge.svg" alt="Build Status" />
          </a>
        </div>
        <div class="hero-actions">
          <NuxtLink :to="localePath('/playground')" class="btn btn-primary">
            {{ $t('home.demoBtn') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/docs')" class="btn btn-secondary">
            {{ $t('home.docsBtn') }}
          </NuxtLink>
          <a href="https://github.com/harvey-woo/pool.js" class="btn btn-ghost" target="_blank" rel="noopener">
            {{ $t('nav.github') }}
          </a>
        </div>
      </div>
    </section>

    <!-- Install -->
    <section class="install-section">
      <div class="container">
        <div class="install-box">
          <span class="install-label">{{ $t('home.installLabel') }}</span>
          <div class="install-code">
            <code>npm install @cat5th/pool.js</code>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">{{ $t('home.featuresTitle') }}</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon"><IconTarget /></div>
            <h3>{{ $t('home.featureExplicitManagement') }}</h3>
            <i18n-t keypath="home.featureExplicitManagementDesc" tag="p">
              <template #dispose><code>Symbol.dispose</code></template>
            </i18n-t>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><IconListDetails /></div>
            <h3>{{ $t('home.featureScheduler') }}</h3>
            <i18n-t keypath="home.featureSchedulerDesc" tag="p">
              <template #Scheduler><code>Scheduler</code></template>
              <template #wrap><code>wrap</code></template>
              <template #enqueue><code>enqueue</code></template>
            </i18n-t>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><IconClock /></div>
            <h3>{{ $t('home.featureCoolDown') }}</h3>
            <i18n-t keypath="home.featureCoolDownDesc" tag="p">
              <template #CoolDown><code>CoolDown</code></template>
            </i18n-t>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><IconSettings /></div>
            <h3>{{ $t('home.featureConfig') }}</h3>
            <p>{{ $t('home.featureConfigDesc') }}</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><IconPackage /></div>
            <h3>{{ $t('home.featureZeroDeps') }}</h3>
            <p>{{ $t('home.featureZeroDepsDesc') }}</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><IconHourglass /></div>
            <h3>{{ $t('home.featureAsyncDispose') }}</h3>
            <i18n-t keypath="home.featureAsyncDisposeDesc" tag="p">
              <template #asyncDispose><code>Symbol.asyncDispose</code></template>
            </i18n-t>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Start -->
    <section class="quick-start">
      <div class="container">
        <h2 class="section-title">{{ $t('home.quickStartTitle') }}</h2>
        <div class="code-blocks">
          <div class="code-example">
            <h3>{{ $t('home.basicUsage') }}</h3>
            <CodeBlock code="import { Pool } from '@cat5th/pool.js'

await using pool = new Pool({
  concurrency: 3,
  create: (i) => ({ id: i })
})

// acquire() returns a ResourceContainer
// Auto released when leaving scope (Symbol.dispose)
using resource = await pool.acquire()
console.log(resource.value.id)
// Pool auto cleanup when leaving scope (Symbol.asyncDispose)" />
          </div>
          <div class="code-example">
            <h3>{{ $t('home.schedulerTitle') }}</h3>
            <CodeBlock code="const pool = new Pool({
  concurrency: 2,
  create: (i) => \`worker-\${i}\`
})

const scheduler = pool.schedule()

function work(this: string, data: string) {
  console.log(\`\${this} processing: \${data}\`)
  return data.toUpperCase()
}

// Auto dispatched to available resource
const result = await scheduler.enqueue(work, 'hello')

// Or use wrap to wrap the function
const wrapped = scheduler.wrap(work)
await wrapped('world')" />
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <div class="container">
        <h2>{{ $t('home.ctaTitle') }}</h2>
        <p>{{ $t('home.ctaDesc') }}</p>
        <NuxtLink :to="localePath('/playground')" class="btn btn-primary">
          {{ $t('home.openPlaygroundBtn') }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
}

.container {
  max-width: 900px;
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

.badges {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.badges img {
  height: 20px;
}

.badges a:hover img {
  opacity: 0.8;
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
  margin-bottom: 12px;
  color: #667eea;
}

.feature-icon :deep(svg) {
  width: 32px;
  height: 32px;
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
  background: #1a1a2e;
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
