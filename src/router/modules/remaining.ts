import type { RouteRecordRaw } from 'vue-router'

// 首页（单菜单）
const homeRoute: RouteRecordRaw = {
  path: '/home',
  component: () => import('@/layout/Layout.vue'),
  redirect: '/home/index',
  meta: {
    title: '首页',
    icon: 'home',
    hidden: false,
    noTagsView: false,
    roles: ['common', 'super_admin']
  },
  children: [
    {
      path: 'index',
      name: 'Home',
      component: () => import('@/views/Home/Index.vue'),
      meta: {
        title: '首页',
        requiresAuth: true,
        icon: 'home',
        activeMenu: '/home',
        noTagsView: false,
        roles: ['common', 'super_admin']
      }
    }
  ]
}

// 农知问答
const graphRoute: RouteRecordRaw = {
  path: '/graph',
  component: () => import('@/layout/Layout.vue'),
  redirect: '/graph/chat',
  meta: {
    title: '农知问答',
    icon: 'chat-dot-round',
    hidden: false,
    noTagsView: false,
    roles: ['common', 'super_admin']
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
        noTagsView: false,
        roles: ['common', 'super_admin']
      }
    },
    {
      path: 'map',
      name: 'GraphMap',
      component: () => import('@/views/graph/map/index/index.vue'),
      meta: {
        title: '实体检测',
        requiresAuth: true,
        icon: 'share',
        activeMenu: '/graph/map',
        noTagsView: false,
        roles: ['common', 'super_admin']
      }
    }
  ]
}

// 后台管理
const adminRoute: RouteRecordRaw = {
  path: '/admin',
  component: () => import('@/layout/Layout.vue'),
  redirect: '/admin/conversation',
  meta: {
    title: '后台管理',
    icon: 'management',
    hidden: false,
    noTagsView: false,
    roles: ['super_admin']
  },
  children: [
    {
      path: 'conversation',
      name: 'AdminConversation',
      component: () => import('@/views/admin/conversation/index.vue'),
      meta: {
        title: '对话记录管理',
        requiresAuth: true,
        icon: 'chat-line-round',
        activeMenu: '/admin/conversation',
        noTagsView: false,
        roles: ['super_admin']
      }
    },
    {
      path: 'database',
      name: 'AdminDatabase',
      component: () => import('@/views/admin/database/index.vue'),
      meta: {
        title: '数据库导入',
        requiresAuth: true,
        icon: 'database',
        activeMenu: '/admin/database',
        noTagsView: false,
        roles: ['super_admin']
      }
    },
    {
      path: 'user',
      name: 'AdminUser',
      component: () => import('@/views/admin/user/index.vue'),
      meta: {
        title: '用户管理',
        requiresAuth: true,
        icon: 'user',
        activeMenu: '/admin/user',
        noTagsView: false,
        roles: ['super_admin']
      }
    }
  ]
}

// 设置
const profileRoute: RouteRecordRaw = {
  path: '/profile',
  component: () => import('@/layout/Layout.vue'),
  redirect: '/profile/index',
  meta: {
    title: '设置',
    icon: 'setting',
    hidden: false,
    noTagsView: false,
    roles: ['common', 'super_admin']
  },
  children: [
    {
      path: 'index',
      name: 'ProfileIndex',
      component: () => import('@/views/Profile/Index.vue'),
      meta: {
        title: '个人资料',
        requiresAuth: true,
        icon: 'setting',
        activeMenu: '/profile/index',
        noTagsView: false,
        roles: ['common', 'super_admin']
      }
    }
  ]
}

// 路由表
const remainingRouter: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home/index',
    meta: {
      hidden: true
    }
  },

  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/Login.vue'),
    meta: {
      hidden: true,
      title: '登录',
      noTagsView: true
    }
  },

  homeRoute,
  graphRoute,
  adminRoute,
  profileRoute,

  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/Error/404.vue'),
    meta: {
      hidden: true
    }
  },

  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: {
      hidden: true
    }
  }
]

export default remainingRouter