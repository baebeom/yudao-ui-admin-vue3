// router/index.ts
import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import remainingRouter from './modules/remaining'
import { getAccessToken } from '@/utils/auth'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePageLoading } from '@/hooks/web/usePageLoading'

const { start, done } = useNProgress()
const { loadStart, loadDone } = usePageLoading()

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH),
  strict: true,
  routes: remainingRouter as RouteRecordRaw[],
  scrollBehavior: () => ({ left: 0, top: 0 })
})

// 获取任意 token（优先主系统，再 Graph）
const getAnyToken = () => {
  return getAccessToken() || localStorage.getItem('graph_token') || localStorage.getItem('GRAPH_ACCESS_TOKEN')
}

// 白名单（包含所有公开路径）
const whiteList = ['/', '/login', '/auth-redirect', '/bind', '/register']
// 修改 getDefaultHomePath 函数 - 所有人都跳转到首页
const getDefaultHomePath = (): string => {
  return '/home'  // 所有人都跳转到首页
}

// 修改：获取用户角色（用于后端权限，不用于前端菜单）
// const getUserRoles = (): string[] => {
//   try {
//     const userStr = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
//     if (userStr) {
//       const userInfo = JSON.parse(userStr)
//       return userInfo.roles?.map((r: any) => r.code || r) || []
//     }
//     const graphUser = localStorage.getItem('graph_user')
//     if (graphUser) {
//       const user = JSON.parse(graphUser)
//       if (user.visitor === 1) return ['visitor']
//       return ['user']
//     }
//   } catch (e) {
//     console.error('获取角色失败', e)
//   }
//   return []
// }

const getLoginType = (): string => {
  try {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]')
    return roles.includes('admin') ? 'admin' : 'user'
  } catch {
    return 'user'
  }
}

router.beforeEach(async (to, _from, next) => {
  start()
  loadStart()
  
  console.log('=== 路由守卫调试 ===')
  console.log('目标路径:', to.path)
  
  const token = getAnyToken()
  const isLoginPage = to.path === '/login'
  
  // 404页面直接放行
  if (to.path === '/404') {
    next()
    return
  }
  
  // 白名单放行
  if (whiteList.includes(to.path)) {
    // 已登录用户访问登录页 -> 重定向到首页
    if (token && isLoginPage) {
      const defaultPath = getDefaultHomePath()
      next(defaultPath)
      return
    }
    next()
    return
  }
  
  // 路由有效性检查
  if (!to.matched || to.matched.length === 0) {
    console.log('路由无效，跳转404')
    next('/404')
    return
  }
  
  // 需要鉴权的路径
  // 需要鉴权的路径
const needAuth = to.path.startsWith('/home') ||  
                 to.path.startsWith('/graph') || 
                 to.path.startsWith('/admin') || 
                 to.path.startsWith('/profile')
  
  if (needAuth) {
    if (token) {
      // 关键修改：使用 loginType 判断管理员权限，而不是 getUserRoles
      const loginType = getLoginType()
      const isAdmin = loginType === 'admin'
      
      console.log(`登录身份: ${loginType}, 是否管理员: ${isAdmin}`)
      
      // 只有管理员才能访问 /admin 开头的页面
      if (to.path.startsWith('/admin') && !isAdmin) {
        console.log('普通用户无权访问后台管理')
        next('/graph/chat')
        return
      }
      
      console.log('Token验证通过，放行')
      next()
      return
    } else {
      console.log('无Token，跳转登录')
      next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
      return
    }
  }
  
  // 默认处理
  if (!token && !whiteList.includes(to.path)) {
    next(`/login?redirect=${to.fullPath}`)
  } else {
    next()
  }
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done()
  loadDone()
})

export const resetRouter = (): void => {
  const resetWhiteNameList = [
    'Redirect', 
    'Login', 
    'NotFound', 
    'Home',
    'Graph',
    'GraphChat', 
    'GraphMap',
    'Admin',
    'AdminConversation',
    'AdminDatabase', 
    'AdminUser',
    'Profile',
    'ProfileIndex'
  ]
  
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (name && !resetWhiteNameList.includes(name as string)) {
      if (router.hasRoute(name)) {
        router.removeRoute(name)
        console.log('移除路由:', name)
      }
    }
  })
  
  remainingRouter.forEach(route => {
    if (route.name && !router.hasRoute(route.name)) {
      router.addRoute(route)
      console.log('重新添加路由:', route.name)
    }
  })
}

export const setupRouter = (app: App<Element>) => {
  app.use(router)
}

export default router
