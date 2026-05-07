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
const whiteList = ['/login', '/social-login', '/auth-redirect', '/bind', '/register', '/oauthLogin/gitee', '/graph/login']

let isPermissionInitialized = false

// 路由加载前
router.beforeEach(async (to, from, next) => {
  start()
  loadStart()
  
  console.log('🔍 路由跳转:', to.path)
  
  // 白名单直接放行
  if (whiteList.includes(to.path)) {
    console.log('✅ 白名单放行:', to.path)
    next()
    return
  }
  
  // ========== Graph 模块处理 ==========
  if (to.path.startsWith('/graph')) {
    const graphToken = getGraphToken()
    console.log('🔍 Graph token:', graphToken ? '存在' : '不存在')
    
    if (graphToken) {
      const permissionStore = usePermissionStoreWithOut()
      
      if (!isPermissionInitialized) {
        try {
          console.log('🔄 生成动态路由...')
          await permissionStore.generateRoutes()
          permissionStore.getAddRouters.forEach((route) => {
            router.addRoute(route as unknown as RouteRecordRaw)
          })
          isPermissionInitialized = true
          console.log('✅ 动态路由生成完成')
          next({ ...to, replace: true })
          return
        } catch (error) {
          console.error('❌ 生成路由失败:', error)
          next('/graph/login')
          return
        }
      }
      console.log('✅ Graph 放行:', to.path)
      next()
    } else {
      console.log('❌ 无 token，跳转 /graph/login')
      next('/graph/login')
    }
    return
  }
  
  // ========== 主系统处理 ==========
  if (getAccessToken()) {
    if (to.path === '/login') {
      next({ path: '/' })
      return
    }
    
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
    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else {
      next(`/graph/login?redirect=${to.fullPath}`)
    }
  }
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done()
  loadDone()
})