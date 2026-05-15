<template>
  <div class="home-container">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <div class="circle-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
    
    <!-- 正常内容 -->
    <template v-else>
      <el-card shadow="never" class="welcome-card">
        <div class="welcome-content">
          <div class="avatar-section">
            <el-avatar :size="80" :src="avatarUrl" class="avatar" />
          </div>
          <div class="greeting-section">
            <h1 class="greeting-title">您好，{{ nickname }}！</h1>
            <p class="greeting-subtitle">欢迎使用农知问答系统</p>
          </div>
        </div>
      </el-card>

      <!-- 功能快捷入口 -->
      <el-row :gutter="20" class="quick-entry">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in quickEntries" :key="item.path">
          <el-card shadow="hover" class="entry-card" @click="goToPage(item.path)">
            <div class="entry-content">
              <el-icon :size="40" :color="item.color">
                <component :is="item.icon" />
              </el-icon>
              <div class="entry-title">{{ item.title }}</div>
              <div class="entry-desc">{{ item.desc }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 系统信息 -->
      <el-row :gutter="20">
        <el-col :span="24">
          <el-card shadow="never" class="info-card">
            <template #header>
              <span class="card-header">系统信息</span>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
              <el-descriptions-item label="知识图谱版本">v2.0</el-descriptions-item>
              <el-descriptions-item label="当前时间">{{ currentTime }}</el-descriptions-item>
              <el-descriptions-item label="登录身份">{{ loginTypeText }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import {
  ChatDotRound,
  Share,
  Setting,
  Management
} from '@element-plus/icons-vue'

defineOptions({ name: 'HomeIndex' })

const router = useRouter()
const userStore = useUserStore()

// 加载状态
const loading = ref(true)

// 用户昵称
const nickname = computed(() => userStore.getUser?.nickname || '用户')

// 头像：优先使用用户上传的头像，否则使用 DiceBear 默认头像
const avatarUrl = computed(() => {
  const userAvatar = userStore.getUser?.avatar
  if (userAvatar && userAvatar !== '') {
    return userAvatar
  }
  const name = nickname.value || 'user'
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${name}&backgroundType=gradientLinear&backgroundColor=b6e3f4&radius=50`
})

// 登录身份（admin / user）
const loginType = localStorage.getItem('loginType') || 'user'
const loginTypeText = loginType === 'admin' ? '管理员' : '普通用户'

// 当前时间
const currentTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

// 快捷入口配置
const getQuickEntries = () => {
  const baseEntries = [
    {
      title: '智能问答',
      desc: '知识图谱智能问答',
      path: '/graph/chat',
      icon: ChatDotRound,
      color: '#409EFF'
    },
    {
      title: '实体检测',
      desc: '实体关系检测',
      path: '/graph/map',
      icon: Share,
      color: '#67C23A'
    }
  ]
  
  if (loginType === 'admin') {
    return [
      ...baseEntries,
      {
        title: '后台管理',
        desc: '系统管理功能',
        path: '/admin/conversation',
        icon: Management,
        color: '#F56C6C'
      },
      {
        title: '个人资料',
        desc: '查看修改个人信息',
        path: '/profile/index',
        icon: Setting,
        color: '#E6A23C'
      }
    ]
  } else {
    return [
      ...baseEntries,
      {
        title: '个人资料',
        desc: '查看修改个人信息',
        path: '/profile/index',
        icon: Setting,
        color: '#E6A23C'
      }
    ]
  }
}

const quickEntries = getQuickEntries()

// 更新时间
const updateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 跳转页面
const goToPage = (path: string) => {
  router.push(path)
}

// 初始化用户信息
const initUserInfo = async () => {
  loading.value = true
  try {
    // 如果 store 中没有用户信息，则获取
    if (!userStore.getUser?.nickname) {
      await userStore.setUserInfoAction()
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await initUserInfo()
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.home-container {
  padding: 20px;
}

/* 加载动画 */
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.circle-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e4e7ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 16px;
  color: #909399;
  font-size: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.welcome-card {
  margin-bottom: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff 0%, #53a8ff 100%);
}

.welcome-card :deep(.el-card__body) {
  padding: 30px;
}

.welcome-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-section .avatar {
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.greeting-section {
  color: white;
}

.greeting-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 500;
}

.greeting-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.quick-entry {
  margin-bottom: 20px;
}

.entry-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.entry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.entry-content {
  text-align: center;
  padding: 20px 10px;
}

.entry-title {
  font-size: 18px;
  font-weight: 500;
  margin: 12px 0 6px 0;
}

.entry-desc {
  font-size: 12px;
  color: #909399;
}

.info-card {
  border-radius: 12px;
}

.card-header {
  font-size: 16px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .greeting-title {
    font-size: 22px;
  }
  
  .entry-content {
    padding: 15px 5px;
  }
  
  .entry-title {
    font-size: 14px;
  }
}
</style>