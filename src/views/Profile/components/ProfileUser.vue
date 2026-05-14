<template>
  <div>
    <UserAvatar />
    <ul class="list-group list-group-striped">
      <li class="list-group-item">
        <Icon class="mr-5px" icon="ep:user" />
        登录账号
        <div class="pull-right">{{ userInfo?.username || '-' }}</div>
      </li>
      <li class="list-group-item">
        <Icon class="mr-5px" icon="ep:user-filled" />
        用户昵称
        <div class="pull-right">{{ userInfo?.nickname || '-' }}</div>
      </li>
      <li class="list-group-item">
        <Icon class="mr-5px" icon="ep:phone" />
        手机号码
        <div class="pull-right">{{ userInfo?.mobile || '-' }}</div>
      </li>
      <li class="list-group-item">
        <Icon class="mr-5px" icon="fontisto:email" />
        电子邮箱
        <div class="pull-right">{{ userInfo?.email || '-' }}</div>
      </li>
      <li class="list-group-item">
        <Icon class="mr-5px" icon="ep:calendar" />
        注册时间
        <div class="pull-right">{{ userInfo?.createTime ? formatDate(userInfo.createTime) : '-' }}</div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { formatDate } from '@/utils/formatTime'
import UserAvatar from './UserAvatar.vue'
import { useUserStore } from '@/store/modules/user'

defineOptions({ name: 'ProfileUser' })

const userStore = useUserStore()

// 使用 as any 绕过类型检查
const userInfo = computed(() => {
  const user = userStore.getUser as any
  return {
    username: user?.username || '-',
    nickname: user?.nickname || '-',
    mobile: user?.mobile || '-',
    email: user?.email || '-',
    createTime: user?.createTime,
    avatar: user?.avatar
  }
})

defineExpose({
  refresh: () => {
    userStore.setUserInfoAction?.()
  }
})

onMounted(() => {
  if (!userStore.getUser?.nickname) {
    userStore.setUserInfoAction?.()
  }
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