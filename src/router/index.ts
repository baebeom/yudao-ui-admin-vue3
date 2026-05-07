import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import remainingRouter from './modules/remaining'
import { isGraphLoggedIn } from '@/utils/graph-auth'
import { getAccessToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH),
  strict: true,
  routes: remainingRouter as RouteRecordRaw[],
  scrollBehavior: () => ({ left: 0, top: 0 })
})

// ==================== 修复后的全局路由守卫 ====================
router.beforeEach((to, from, next) => {
  const whiteList = ['/login', '/graph/login', '/404', '/403', '/500']

  // 1. 如果是访问 Graph 模块下的页面
  if (to.path.startsWith('/graph')) {
    // 访问的是登录页 → 直接放行
    if (to.path === '/graph/login') {
      return next()
    }

    // 检查是否登录
    if (isGraphLoggedIn()) {
      return next()
    } else {
      // 未登录 → 跳转到登录页，并带上 redirect
      return next({ path: '/graph/login', query: { redirect: to.fullPath } })
    }
  }

  // 2. 其他路由
  const token = getAccessToken()
  if (token) {
    if (to.path === '/login') next('/graph/chat')
    else next()
  } else {
    if (whiteList.includes(to.path)) next()
    else next(`/login?redirect=${to.fullPath}`)
  }
})

export const resetRouter = (): void => {
  const resetWhiteNameList = ['Redirect', 'Login', 'NoFound', 'Home', 'GraphLogin']
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (name && !resetWhiteNameList.includes(name as string)) {
      router.hasRoute(name) && router.removeRoute(name)
    }
  })
}

export const setupRouter = (app: App<Element>) => {
  app.use(router)
}

export default router