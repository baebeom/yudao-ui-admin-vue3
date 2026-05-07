import router from './router'
import type { RouteRecordRaw } from 'vue-router'
import { isRelogin } from '@/config/axios/service'
import { getAccessToken } from '@/utils/auth'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { useDictStoreWithOut } from '@/store/modules/dict'
import { useUserStoreWithOut } from '@/store/modules/user'
import { usePermissionStoreWithOut } from '@/store/modules/permission'

const { start, done } = useNProgress()
const { loadStart, loadDone } = usePageLoading()

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

// 获取 Graph token
const getGraphToken = () => {
  return localStorage.getItem('graph_token') || localStorage.getItem('GRAPH_ACCESS_TOKEN')
}

// 白名单路由
// permission.ts
// 白名单路由 - 添加 /graph/login
const whiteList = ['/login', '/social-login', '/auth-redirect', '/bind', '/register', '/oauthLogin/gitee', '/graph/login']
let isPermissionInitialized = false

// 路由加载前
router.beforeEach(async (to, from, next) => {
  start()
  loadStart()
  
  console.log('🔍 路由跳转:', to.path)
  console.log('🔍 当前完整路径:', to.fullPath)
  
  // 白名单直接放行（包括 /graph/login）
  if (whiteList.includes(to.path)) {
    console.log('✅ 白名单放行:', to.path)
    next()
    return
  }
  
  // ========== Graph 模块处理 ==========
  if (to.path.startsWith('/graph')) {
    const graphToken = getGraphToken()
    console.log('🔍 Graph token:', graphToken ? '存在' : '不存在')
    
    // 如果有 token
    if (graphToken) {
      const permissionStore = usePermissionStoreWithOut()
      
      // 动态路由未初始化
      if (!isPermissionInitialized) {
        try {
          console.log('🔄 生成动态路由...')
          await permissionStore.generateRoutes()
          permissionStore.getAddRouters.forEach((route) => {
            router.addRoute(route as unknown as RouteRecordRaw)
          })
          isPermissionInitialized = true
          console.log('✅ 动态路由生成完成')
          // 重要：重新路由到目标页面
          next({ ...to, replace: true })
          return
        } catch (error) {
          console.error('❌ 生成路由失败:', error)
          // 清除失效 token
          localStorage.removeItem('graph_token')
          localStorage.removeItem('GRAPH_ACCESS_TOKEN')
          next('/graph/login')
          return
        }
      }
      console.log('✅ Graph 放行:', to.path)
      next()
    } else {
      // 无 token，跳转登录页，保留 redirect 参数
      console.log('❌ 无 token，跳转 /graph/login')
      // 🔥 关键：保留原始目标路径作为 redirect 参数
      next(`/graph/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    return
  }
  
  // ========== 主系统处理 ==========
  // ... 其余代码保持不变
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done()
  loadDone()
})