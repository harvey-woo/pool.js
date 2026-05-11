<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github-dark.css'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('javascript', typescript)
hljs.registerLanguage('bash', bash)

const props = defineProps<{
  code: string
  lang?: string
}>()

const highlighted = ref('')

function highlight() {
  const language = props.lang || 'typescript'
  const lang = language === 'sh' || language === 'npm' ? 'bash' : language
  const result = hljs.highlight(props.code, { language: lang })
  highlighted.value = result.value
}

onMounted(highlight)
watch(() => props.code, highlight)
</script>

<template>
  <div class="code-block">
    <pre><code v-html="highlighted"></code></pre>
  </div>
</template>

<style scoped>
.code-block {
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
}

.code-block pre {
  padding: 20px;
  margin: 0;
  overflow-x: auto;
}

.code-block code {
  color: #e0e0e0;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
}

/* highlight.js overrides to match our theme */
.code-block :deep(.hljs) {
  background: transparent !important;
  padding: 0 !important;
  color: #e0e0e0 !important;
}
</style>
