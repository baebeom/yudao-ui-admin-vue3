// Graph 模块的路由配置（复用主系统布局）
const graphRoutes = {
  path: '/graph',
  name: 'Graph',
  redirect: '/graph/chat',      // 默认进入智能问答页
  component: () => import('@/layout/Layout.vue'),
  meta: {
    title: '知识图谱',
    icon: 'graph',
    hidden: false,
    noTagsView: false
  },
  children: [
    {
      path: 'chat',
      name: 'GraphChat',
      component: () => import('@/views/graph/chat/index/index.vue'),
      meta: {
        title: '智能问答',
        requiresAuth: true,
        icon: 'chat-dot-round',
        activeMenu: '/graph/chat',
        noTagsView: false
      }
    },
    {
      path: 'map',
      name: 'GraphMap',
      component: () => import('@/views/graph/map/index/index.vue'),
      meta: {
        title: '实体查询',
        requiresAuth: true,
        icon: 'share',
        activeMenu: '/graph/map',
        noTagsView: false
      }
    }
  ]
}

const remainingRouter = [
  // 🔥 根路径直接重定向到智能问答页（后续由守卫判断 Token）
  {
    path: '/',
    redirect: '/graph/chat',
    meta: { hidden: true }
  },

  // 主系统登录页
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/Login.vue'),
    meta: { hidden: true, title: '登录', noTagsView: true }
  },

  // Graph 登录页（独立布局，保留以备不时之需）
  {
    path: '/graph/login',
    name: 'GraphLogin',
    component: () => import('@/views/graph/login/index.vue'),
    meta: { hidden: true, title: '图谱登录', noTagsView: true }
  },

  // Graph 主模块
  graphRoutes,

  // 错误页面
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/Error/404.vue'),
    meta: { hidden: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true }
  }
]

export default remainingRouter