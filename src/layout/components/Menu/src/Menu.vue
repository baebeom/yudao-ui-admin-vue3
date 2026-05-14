<template>
  <el-menu
    :default-active="activeMenu"
    :collapse="appStore.getCollapse"
    :unique-opened="true"
    :router="true"
    class="app-sidebar-menu"
    background-color="#304156"
    text-color="#bfcbd9"
    active-text-color="#409EFF"
  >
    <template v-for="route in menuRoutes" :key="route.path">

      <!-- 多个子菜单：显示下拉 -->
      <el-sub-menu
        v-if="route.children && route.children.length > 1"
        :index="route.path"
      >
        <template #title>
          <el-icon v-if="route.meta?.icon">
            <component :is="route.meta.icon" />
          </el-icon>

          <span>{{ route.meta?.title }}</span>
        </template>

        <template v-for="child in route.children" :key="child.path">
          <el-menu-item :index="getFullPath(route.path, child.path)">
            <el-icon v-if="child.meta?.icon">
              <component :is="child.meta.icon" />
            </el-icon>

            <template #title>
              <span>{{ child.meta?.title }}</span>
            </template>
          </el-menu-item>
        </template>
      </el-sub-menu>

      <!-- 只有一个子菜单：直接显示 -->
      <el-menu-item
        v-else-if="route.children && route.children.length === 1"
        :index="getFullPath(route.path, route.children[0].path)"
      >
        <el-icon v-if="route.children[0].meta?.icon">
          <component :is="route.children[0].meta.icon" />
        </el-icon>

        <template #title>
          <span>{{ route.children[0].meta?.title }}</span>
        </template>
      </el-menu-item>

      <!-- 无子菜单 -->
      <el-menu-item v-else :index="route.path">
        <el-icon v-if="route.meta?.icon">
          <component :is="route.meta.icon" />
        </el-icon>

        <template #title>
          <span>{{ route.meta?.title }}</span>
        </template>
      </el-menu-item>

    </template>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/store/modules/app'
import remainingRouter from '@/router/modules/remaining'

const route = useRoute()
const appStore = useAppStore()

// 获取登录身份
const getLoginType = (): string => {
  try {
    const loginType = localStorage.getItem('loginType')
    return loginType || 'user'
  } catch (e) {
    return 'user'
  }
}

const loginType = getLoginType()

// 拼接完整路径
const getFullPath = (parentPath: string, childPath: string) => {
  if (childPath.startsWith('/')) {
    return childPath
  }

  return `${parentPath}/${childPath}`
}

// 权限判断
const hasRolePermission = (route: any): boolean => {
  const routeRoles = route.meta?.roles

  if (!routeRoles) return false

  if (!Array.isArray(routeRoles)) return false

  const userRole = loginType === 'admin'
    ? 'super_admin'
    : 'common'

  return routeRoles.includes(userRole)
}

// 过滤路由
const filterRoutes = (routes: any[]): any[] => {
  const result: any[] = []

  for (const route of routes) {

    // 隐藏路由
    if (route.meta?.hidden === true) {
      continue
    }

    // 排除系统路由
    if (
      route.path === '/' ||
      route.path === '/login' ||
      route.path === '/404'
    ) {
      continue
    }

    // 权限判断
    if (!hasRolePermission(route)) {
      continue
    }

    // 子路由过滤
    if (route.children && route.children.length > 0) {

      const filteredChildren = filterRoutes(route.children)

      if (filteredChildren.length > 0) {
        result.push({
          ...route,
          children: filteredChildren
        })
      }

    } else {

      result.push(route)

    }
  }

  return result
}

// 菜单路由
const menuRoutes = computed(() => {
  return filterRoutes(remainingRouter as any[])
})

// 当前激活菜单
const activeMenu = computed(() => {
  const { path, meta } = route

  return (meta as any)?.activeMenu
    ? (meta as any).activeMenu
    : path
})
</script>

<style scoped>
.app-sidebar-menu {
  border-right: none;
  height: 100%;
}
</style>