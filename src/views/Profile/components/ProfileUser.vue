<template>
  <div>
    <UserAvatar />
    <el-descriptions :column="1" border>
      <el-descriptions-item label="登录账号">{{ userInfo?.username || '-' }}</el-descriptions-item>
      <el-descriptions-item label="用户昵称">{{ userInfo?.nickname || '-' }}</el-descriptions-item>
      <el-descriptions-item label="手机号码">{{ userInfo?.mobile || '-' }}</el-descriptions-item>
      <el-descriptions-item label="电子邮箱">{{ userInfo?.email || '-' }}</el-descriptions-item>
      <el-descriptions-item label="注册时间">{{ formatCreateTime }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import UserAvatar from './UserAvatar.vue'
import { getUserProfile } from '@/api/system/user/profile'

defineOptions({ name: 'ProfileUser' })

const userInfo = ref<any>(null)

// 格式化注册时间（后端返回的是毫秒时间戳）
const formatCreateTime = computed(() => {
  const timestamp = userInfo.value?.createTime
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
})

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const res = await getUserProfile()
    // 兼容不同的返回结构：res.data 或 res 直接是数据
    userInfo.value = res?.data || res
    console.log('ProfileUser 加载数据:', userInfo.value)
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

// 暴露给父组件调用的刷新方法
defineExpose({
  refresh: fetchUserInfo
})

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
/* 可选样式 */
</style>