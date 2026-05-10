// Graph 模块的路由配置（复用主系统布局）
const graphRoutes = {
  path: '/graph',
  name: 'Graph',
  redirect: '/graph/chat',
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
  {
    path: '/',
    redirect: '/graph/chat',
    meta: { hidden: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/Login.vue'),
    meta: { hidden: true, title: '登录', noTagsView: true }
  },
  {
    path: '/graph/login',
    name: 'GraphLogin',
    component: () => import('@/views/graph/login/index.vue'),
    meta: { hidden: true, title: '图谱登录', noTagsView: true }
  },
  graphRoutes,
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