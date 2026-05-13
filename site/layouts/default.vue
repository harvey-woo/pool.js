<script setup lang="ts">
import {
  IconSwimming,
  IconBrandNpm,
  IconMenu,
  IconX,
  IconBrandGithub,
  IconStarFilled,
  IconDownload
} from '@tabler/icons-vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const mobileOpen = ref(false)
const githubStars = ref<string | null>(null)
const npmDownloads = ref<string | null>(null)

async function fetchGitHubStars() {
  try {
    const res = await fetch('https://api.github.com/repos/harvey-woo/pool.js')
    const data = await res.json()
    githubStars.value = String(data.stargazers_count)
  } catch {
    // ignore
  }
}

async function fetchNpmDownloads() {
  try {
    const res = await fetch('https://api.npmjs.org/downloads/point/last-week/@cat5th/pool.js')
    const data = await res.json()
    npmDownloads.value = String(data.downloads)
  } catch {
    // ignore
  }
}

onMounted(() => {
  fetchGitHubStars()
  fetchNpmDownloads()
})

function closeMobile() {
  mobileOpen.value = false
}

function isActive(path: string) {
  return route.path === path || route.path === '/' + locale.value + path
}
</script>

<template>
  <div class="app">
    <header class="site-header">
      <div class="header-inner">
        <NuxtLink :to="localePath('/')" class="logo">
          <IconSwimming class="logo-icon" />
          <span class="logo-text">pool.js</span>
        </NuxtLink>

        <nav class="nav-links">
          <NuxtLink :to="localePath('/')" class="nav-link" :class="{ active: isActive('/') }">
            {{ $t('nav.home') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/playground')" class="nav-link" :class="{ active: isActive('/playground') }">
            {{ $t('nav.playground') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/examples')" class="nav-link" :class="{ active: isActive('/examples') }">
            {{ $t('nav.examples') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/docs')" class="nav-link" :class="{ active: isActive('/docs') }">
            {{ $t('nav.docs') }}
          </NuxtLink>
        </nav>

        <div class="header-actions">
          <a href="https://github.com/harvey-woo/pool.js" target="_blank" rel="noopener" class="github-badge" aria-label="GitHub">
            <IconBrandGithub class="github-icon" />
            <span v-if="githubStars !== null" class="github-count">{{ githubStars }}</span>
            <IconStarFilled class="github-star" />
          </a>
          <a href="https://www.npmjs.com/package/@cat5th/pool.js" target="_blank" rel="noopener" class="npm-badge" aria-label="npm">
            <IconBrandNpm class="npm-icon" />
            <span v-if="npmDownloads !== null" class="npm-count">{{ npmDownloads }}</span>
            <IconDownload class="npm-dl" />
          </a>
          <LangSwitcher />
        </div>

        <button class="mobile-toggle" @click="mobileOpen = !mobileOpen" aria-label="Menu">
          <IconMenu v-if="!mobileOpen" />
          <IconX v-else />
        </button>
      </div>

      <div v-if="mobileOpen" class="mobile-nav">
        <NuxtLink :to="localePath('/')" class="mobile-nav-link" @click="closeMobile">{{ $t('nav.home') }}</NuxtLink>
        <NuxtLink :to="localePath('/playground')" class="mobile-nav-link" @click="closeMobile">{{ $t('nav.playground') }}</NuxtLink>
        <NuxtLink :to="localePath('/examples')" class="mobile-nav-link" @click="closeMobile">{{ $t('nav.examples') }}</NuxtLink>
        <NuxtLink :to="localePath('/docs')" class="mobile-nav-link" @click="closeMobile">{{ $t('nav.docs') }}</NuxtLink>
        <div class="mobile-lang-switcher">
          <LangSwitcher />
        </div>
      </div>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <span>{{ $t('footer.text') }} · <a href="https://github.com/harvey-woo/pool.js" target="_blank" rel="noopener">{{ $t('footer.linkText') }}</a></span>
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
  width: 24px;
  height: 24px;
  color: #667eea;
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
  color: #1a1a2e;
  cursor: pointer;
  padding: 4px;
}

.mobile-toggle:hover {
  color: #667eea;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.github-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #1a1a2e;
  color: #fff;
  text-decoration: none;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}

.github-badge:hover {
  background: #2a2a40;
}

.github-icon {
  width: 16px;
  height: 16px;
  color: #fff;
}

.github-count {
  color: #fff;
}

.github-star {
  width: 12px;
  height: 12px;
  color: #fbbf24;
}

.npm-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #cb3837;
  color: #fff;
  text-decoration: none;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}

.npm-badge:hover {
  background: #b32f2e;
}

.npm-icon {
  width: 16px;
  height: 16px;
  color: #fff;
}

.npm-count {
  color: #fff;
}

.npm-dl {
  width: 12px;
  height: 12px;
  color: #fff;
}

.mobile-lang-switcher {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
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
