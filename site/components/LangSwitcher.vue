<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const currentLocale = computed(() => {
  return locales.value.find((l: any) => l.code === locale.value)
})

function switchLocale(code: string) {
  navigateTo(switchLocalePath(code))
}
</script>

<template>
  <div class="lang-switcher">
    <NuxtLink
      v-for="l in locales"
      :key="l.code"
      :to="switchLocalePath(l.code)"
      class="lang-btn"
      :class="{ active: l.code === locale }"
    >
      {{ l.code.toUpperCase() }}
    </NuxtLink>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 3px;
}

.lang-btn {
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  border-radius: 4px;
  transition: all 0.15s;
  text-decoration: none;
}

.lang-btn:hover {
  color: #333;
}

.lang-btn.active {
  background: #fff;
  color: #1a1a2e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
