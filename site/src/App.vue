<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const mobileOpen = ref(false)
const route = useRoute()

function isActive(path: string) {
  return route.path === path
}

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <div class="app">
    <header class="site-header">
      <div class="header-inner">
        <RouterLink to="/" class="logo" @click="closeMobile">
          <span class="logo-icon">🏊</span>
          <span class="logo-text">pool.js</span>
        </RouterLink>

        <nav class="nav-links">
          <RouterLink to="/" class="nav-link" :class="{ active: isActive('/') }" @click="closeMobile">
            首页
          </RouterLink>
          <RouterLink to="/playground" class="nav-link" :class="{ active: isActive('/playground') }" @click="closeMobile">
            Playground
          </RouterLink>
          <RouterLink to="/docs" class="nav-link" :class="{ active: isActive('/docs') }" @click="closeMobile">
            文档
          </RouterLink>
          <a href="https://github.com/harvey-woo/pool.js" class="nav-link" target="_blank" rel="noopener">
            GitHub
          </a>
        </nav>

        <button class="mobile-toggle" @click="mobileOpen = !mobileOpen" aria-label="Menu">
          <span>☰</span>
        </button>
      </div>

      <div v-if="mobileOpen" class="mobile-nav">
        <RouterLink to="/" class="mobile-nav-link" @click="closeMobile">首页</RouterLink>
        <RouterLink to="/playground" class="mobile-nav-link" @click="closeMobile">Playground</RouterLink>
        <RouterLink to="/docs" class="mobile-nav-link" @click="closeMobile">文档</RouterLink>
        <a href="https://github.com/harvey-woo/pool.js" class="mobile-nav-link" target="_blank">GitHub</a>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <span>MIT License · <a href="https://github.com/harvey-woo/pool.js" target="_blank" rel="noopener">pool.js</a></span>
      </div>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1a1a2e;
  background: #ffffff;
  line-height: 1.6;
}

a {
  text-decoration: none;
  color: inherit;
}

code {
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
  font-size: 0.9em;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e8e8e8;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-link {
  font-size: 14px;
  color: #666;
  transition: color 0.2s;
  font-weight: 500;
}

.nav-link:hover,
.nav-link.active {
  color: #667eea;
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
}

.mobile-nav {
  display: none;
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  background: white;
}

.mobile-nav-link {
  display: block;
  padding: 12px 0;
  font-size: 16px;
  color: #1a1a2e;
  border-bottom: 1px solid #f0f0f0;
}

.site-main {
  flex: 1;
}

.site-footer {
  border-top: 1px solid #e8e8e8;
  padding: 20px 24px;
  text-align: center;
  font-size: 13px;
  color: #999;
}

.site-footer a {
  color: #667eea;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .mobile-toggle {
    display: block;
  }

  .mobile-nav {
    display: block;
  }
}
</style>
