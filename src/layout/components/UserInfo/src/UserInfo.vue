<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useDesign } from '@/hooks/web/useDesign'
import { useTagsViewStore } from '@/store/modules/tagsView'
import { useUserStore } from '@/store/modules/user'
import LockDialog from './components/LockDialog.vue'
import LockPage from './components/LockPage.vue'
import { useLockStore } from '@/store/modules/lock'

defineOptions({ name: 'UserInfo' })

const { t } = useI18n()

const { push, replace } = useRouter()

const userStore = useUserStore()
const tagsViewStore = useTagsViewStore()

const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('user-info')

const userInfo = ref<any>(null)

const loadUserInfo = () => {
  try {
    const info = localStorage.getItem('userInfo')
    if (info) {
      userInfo.value = JSON.parse(info)
    }
  } catch (e) {
    console.error('获取用户信息失败', e)
  }
}

// 昵称
const userName = computed(() => userInfo.value?.nickname || 'Admin')

// 头像
const avatarUrl = computed(() => {
  const avatar = userInfo.value?.avatar
  if (avatar && avatar !== '') {
    return avatar
  }
  const name = userName.value || 'user'
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${name}&backgroundType=gradientLinear&backgroundColor=b6e3f4&radius=50`
})

// 监听 storage 变化
const handleStorageChange = (event: StorageEvent) => {
  if (event.key === 'userInfo') {
    loadUserInfo()
  }
}

// 锁定屏幕
const lockStore = useLockStore()
const getIsLock = computed(() => lockStore.getLockInfo?.isLock ?? false)
const dialogVisible = ref<boolean>(false)
const lockScreen = () => {
  dialogVisible.value = true
}

const loginOut = async () => {
  try {
    await ElMessageBox.confirm(t('common.loginOutMessage'), t('common.reminder'), {
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    await userStore.loginOut()
    tagsViewStore.delAllViews()
    replace('/login?redirect=/index')
  } catch {}
}

const toProfile = async () => {
  push('/profile/index')
}

onMounted(() => {
  loadUserInfo()
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<template>
  <ElDropdown class="custom-hover" :class="prefixCls" trigger="click">
    <div class="flex items-center">
      <el-avatar :size="35" :src="avatarUrl" class="rounded-[50%]" />
      <span class="pl-[5px] text-14px text-[var(--top-header-text-color)] <lg:hidden">
        {{ userName }}
      </span>
    </div>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem>
          <Icon icon="ep:tools" />
          <div @click="toProfile">{{ t('common.profile') }}</div>
        </ElDropdownItem>
        <ElDropdownItem divided>
          <Icon icon="ep:lock" />
          <div @click="lockScreen">{{ t('lock.lockScreen') }}</div>
        </ElDropdownItem>
        <ElDropdownItem divided @click="loginOut">
          <Icon icon="ep:switch-button" />
          <div>{{ t('common.loginOut') }}</div>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>

  <LockDialog v-if="dialogVisible" v-model="dialogVisible" />

  <teleport to="body">
    <transition name="fade-bottom" mode="out-in">
      <LockPage v-if="getIsLock" />
    </transition>
  </teleport>
</template>