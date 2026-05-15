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
import { useUserStore } from '@/store/modules/user'
import { useCache, CACHE_KEY } from '@/hooks/web/useCache'

defineOptions({ name: 'ProfileUser' })

const userStore = useUserStore()
const { wsCache } = useCache()  // ✅ 正确获取 wsCache
const userInfo = ref<any>(null)

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

const fetchUserInfo = async () => {
  try {
    const res = await getUserProfile()
    const data = res?.data || res
    userInfo.value = data
    console.log('ProfileUser 获取到数据:', data)
    
    if (data) {
      // 直接更新 store 中的用户信息
      userStore.user = {
        ...userStore.user,
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        mobile: data.mobile,
        email: data.email,
        avatar: data.avatar || '',
        createTime: data.createTime
      }
      
      // 同时更新缓存
      const userInfoCache = wsCache.get(CACHE_KEY.USER)
      if (userInfoCache) {
        userInfoCache.user = userStore.user
        wsCache.set(CACHE_KEY.USER, userInfoCache)
      }
      
      console.log('已同步到 store，当前 store:', userStore.getUser)
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

defineExpose({
  refresh: fetchUserInfo
})

onMounted(() => {
  fetchUserInfo()
})
</script>
<style scoped>
.list-group-striped > .list-group-item {
  padding-right: 0;
  padding-left: 0;
  border-right: 0;
  border-left: 0;
  border-radius: 0;
}
.list-group {
  padding-left: 0;
  list-style: none;
}
.list-group-item {
  padding: 11px 0;
  margin-bottom: -1px;
  font-size: 13px;
  border-top: 1px solid #e7eaec;
  border-bottom: 1px solid #e7eaec;
}
.pull-right {
  float: right !important;
}
</style>