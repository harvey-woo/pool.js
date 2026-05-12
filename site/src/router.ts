import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Playground from './pages/Playground.vue'
import Docs from './pages/Docs.vue'
import Examples from './pages/Examples.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/playground', name: 'playground', component: Playground },
    { path: '/examples', name: 'examples', component: Examples },
    { path: '/docs', name: 'docs', component: Docs }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
