<template>
  <el-menu
    :default-active="activeMenu"
    :collapse="appStore.getCollapse"
    :unique-opened="true"
    :router="true"
    class="app-sidebar-menu"
    background-color="#ffffff"
    text-color="#303133"
    active-text-color="#409eff"
  >
    <template v-for="item in menuRoutes" :key="item.path">

      <!-- 多个子菜单：显示下拉 -->
      <el-sub-menu
        v-if="item.children && item.children.length > 1"
        :index="item.path"
      >
        <template #title>
          <el-icon v-if="item.meta?.icon">
            <component :is="item.meta.icon" />
          </el-icon>
          <span>{{ item.meta?.title }}</span>
        </template>

        <template v-for="child in item.children" :key="child.path">
          <el-menu-item :index="getFullPath(item.path, child.path)">
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
        v-else-if="item.children && item.children.length === 1"
        :index="getFullPath(item.path, item.children[0].path)"
      >
        <el-icon v-if="item.children[0].meta?.icon">
          <component :is="item.children[0].meta.icon" />
        </el-icon>
        <template #title>
          <span>{{ item.children[0].meta?.title }}</span>
        </template>
      </el-menu-item>

      <!-- 无子菜单 -->
      <el-menu-item v-else :index="item.path">
        <el-icon v-if="item.meta?.icon">
          <component :is="item.meta.icon" />
        </el-icon>
        <template #title>
          <span>{{ item.meta?.title }}</span>
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

// 获取当前用户角色列表（从 localStorage.userRoles 读取）
const getUserRoles = (): string[] => {
  try {
    const rolesStr = localStorage.getItem('userRoles')
    if (rolesStr) {
      const roles = JSON.parse(rolesStr)
      return Array.isArray(roles) ? roles : []
    }
  } catch (e) {
    console.error('解析用户角色失败', e)
  }
  return []
}

const userRoles = getUserRoles()

// 权限判断：路由要求的角色与用户角色是否有交集
const hasRolePermission = (item: any): boolean => {
  const routeRoles = item.meta?.roles
  if (!routeRoles || !Array.isArray(routeRoles)) return false
  // 如果用户角色为空，默认赋予 common（防止空白）
  const roles = userRoles.length ? userRoles : ['common']
  return routeRoles.some(role => roles.includes(role))
}

// 拼接完整路径
const getFullPath = (parentPath: string, childPath: string) => {
  if (childPath.startsWith('/')) {
    return childPath
  }
  return `${parentPath}/${childPath}`
}

// 过滤路由（隐藏、系统路由、权限）
const filterRoutes = (routes: any[]): any[] => {
  const result: any[] = []

  for (const item of routes) {
    // 隐藏路由
    if (item.meta?.hidden === true) continue

    // 排除系统路由
    if (['/', '/login', '/404'].includes(item.path)) continue

    // 权限判断
    if (!hasRolePermission(item)) continue

    // 子路由过滤
    if (item.children && item.children.length > 0) {
      const filteredChildren = filterRoutes(item.children)
      if (filteredChildren.length > 0) {
        result.push({ ...item, children: filteredChildren })
      }
    } else {
      result.push(item)
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
  return (meta as any)?.activeMenu || path
})
</script>

<style scoped>
.app-sidebar-menu {
  height: 100%;
  border-right: none;
}
</style>