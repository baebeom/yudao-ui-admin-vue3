import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import remainingRouter from './modules/remaining'
import { getAccessToken } from '@/utils/auth'
import { isRelogin } from '@/config/axios/service'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { useDictStoreWithOut } from '@/store/modules/dict'
import { useUserStoreWithOut } from '@/store/modules/user'
import { usePermissionStoreWithOut } from '@/store/modules/permission'

const { start, done } = useNProgress()
const { loadStart, loadDone } = usePageLoading()

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH),
  strict: true,
  routes: remainingRouter as RouteRecordRaw[],
  scrollBehavior: () => ({ left: 0, top: 0 })
})

const parseURL = (url: string | null | undefined): { basePath: string; paramsObject: { [key: string]: string } } => {
  if (url == null) {
    return { basePath: '', paramsObject: {} }
  }
  const questionMarkIndex = url.indexOf('?')
  let basePath = url
  const paramsObject: { [key: string]: string } = {}
  if (questionMarkIndex !== -1) {
    basePath = url.substring(0, questionMarkIndex)
    const queryString = url.substring(questionMarkIndex + 1)
    const searchParams = new URLSearchParams(queryString)
    searchParams.forEach((value, key) => {
      paramsObject[key] = value
    })
  }
  return { basePath, paramsObject }
}

// 🔥 获取任意有效 Token（主系统或 Graph）
const getAnyToken = () => {
  return getAccessToken() || localStorage.getItem('graph_token') || localStorage.getItem('GRAPH_ACCESS_TOKEN')
}

// 白名单路由（无需认证）
const whiteList = ['/login', '/graph/chat', '/auth-redirect', '/bind', '/register']

let isPermissionInitialized = false

// ==================== 全局路由守卫 ====================
router.beforeEach(async (to, from, next) => {
  start()
  loadStart()
  
  console.log('🔍 路由跳转:', to.path)
  console.log('🔍 当前完整路径:', to.fullPath)

  const token = getAnyToken()
  console.log('🔍 当前 Token 状态:', token ? '存在' : '不存在')

  // 1. 白名单路径直接放行
  if (whiteList.includes(to.path)) {
    console.log('✅ 白名单放行:', to.path)
    next()
    return
  }

  // 2. 已登录用户访问登录页 → 直接跳转到智能问答页面
  if (token && to.path === '/login') {
    console.log('🚀 已登录，从登录页跳转到 /graph/chat')
    next('/graph/chat')
    return
  }

  // ========== Graph 模块处理 ==========
  if (to.path.startsWith('/graph')) {
    // 🔥 Graph 模块也认可主系统 Token
    const graphToken = getAnyToken()
    
    if (graphToken) {
      const permissionStore = usePermissionStoreWithOut()
      
      // 动态路由未初始化
      if (!isPermissionInitialized) {
        try {
          console.log('🔄 生成 Graph 动态路由...')
          await permissionStore.generateRoutes()
          permissionStore.getAddRouters.forEach((route) => {
            router.addRoute(route as unknown as RouteRecordRaw)
          })
          isPermissionInitialized = true
          console.log('✅ Graph 动态路由生成完成')
          next({ ...to, replace: true })
          return
        } catch (error) {
          console.error('❌ 生成路由失败:', error)
          localStorage.removeItem('graph_token')
          localStorage.removeItem('GRAPH_ACCESS_TOKEN')
          next('/graph/login')
          return
        }
      }
      console.log('✅ Graph 放行:', to.path)
      next()
    } else {
      console.log('❌ 无有效 Token，跳转 /graph/login')
      next(`/graph/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    return
  }
  
  // ========== 主系统处理 ==========
  if (token) {
    // 已登录用户访问主系统任何页面（除登录页外）都放行
    const dictStore = useDictStoreWithOut()
    const userStore = useUserStoreWithOut()
    const permissionStore = usePermissionStoreWithOut()
    
    if (!dictStore.getIsSetDict) {
      dictStore.setDictMap()
    }
    
    if (!userStore.getIsSetUser) {
      isRelogin.show = true
      await userStore.setUserInfoAction()
      isRelogin.show = false
      await permissionStore.generateRoutes()
      permissionStore.getAddRouters.forEach((route) => {
        router.addRoute(route as unknown as RouteRecordRaw)
      })
      const redirectPath = from.query.redirect || to.path
      const redirect = decodeURIComponent(redirectPath as string)
      const { paramsObject: query } = parseURL(redirect)
      const nextData = to.path === redirect ? { ...to, replace: true } : { path: redirect, query }
      next(nextData)
      return
    }
    next()
  } else {
    // 无 Token → 跳转主系统登录页
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next(`/login?redirect=${to.fullPath}`)
    }
  }
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done()
  loadDone()
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