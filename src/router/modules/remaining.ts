import { Layout } from '@/utils/routerHelper'
const { t } = useI18n()

const remainingRouter = [
  {
    path: '/graph/login',
    component: () => import('@/views/graph/login/index.vue'),
    name: 'GraphLogin',
    meta: { hidden: true, title: '图谱登录', noTagsView: true }
  },
  {
    path: '/login',
    component: () => import('@/views/graph/login/index.vue'),
    name: 'Login',
    meta: { hidden: true, title: t('router.login'), noTagsView: true }
  },
  {
    path: '/404',
    component: () => import('@/views/Error/404.vue'),
    meta: { hidden: true }
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/Error/404.vue'),
    meta: { hidden: true }
  }
]

export default remainingRouter