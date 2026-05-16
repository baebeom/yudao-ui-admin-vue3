<template>
  <div class="change-avatar">
    <CropperAvatar
      ref="cropperRef"
      :btnProps="{ preIcon: 'ant-design:cloud-upload-outlined' }"
      :showBtn="false"
      :value="displayAvatar"
      width="120px"
      @change="handelUpload"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { ElLoading, ElMessage } from 'element-plus'
import { updateUserProfile } from '@/api/system/user/profile'
import { CropperAvatar } from '@/components/Cropper'
import { useUserStore } from '@/store/modules/user'
import request from '@/config/axios'

defineOptions({ name: 'UserAvatar' })

const userStore = useUserStore()
const cropperRef = ref()

// 获取用户昵称（用于生成默认头像）
const userName = computed(() => userStore.getUser?.nickname || '用户')

// 显示的头像：优先用户上传的，没有则用 DiceBear 默认头像
const displayAvatar = computed(() => {
  const userAvatar = userStore.getUser?.avatar
  if (userAvatar && userAvatar !== '') {
    return userAvatar
  }
  const name = userName.value || 'user'
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${name}&backgroundType=gradientLinear&backgroundColor=b6e3f4&radius=50`
})

// 上传处理
const handelUpload = async ({ data }: { data: File }) => {
  if (!data) return

  const loading = ElLoading.service({
    lock: true,
    text: '上传中...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 构建 FormData
    const formData = new FormData()
    formData.append('file', data)  // 字段名必须是 'file'
    
    // 使用 request.upload 上传
    const uploadRes = await request.upload({
      url: '/infra/file/upload',
      data: formData
    })
    
    console.log('上传响应:', uploadRes)
    
    // 获取文件URL（后端返回的是字符串 URL）
    let avatarUrl = ''
    if (uploadRes.code === 0) {
      avatarUrl = uploadRes.data
    } else if (uploadRes.data) {
      avatarUrl = uploadRes.data
    } else {
      throw new Error('获取文件URL失败')
    }
    
    console.log('上传成功，头像URL:', avatarUrl)
    
    // 更新用户头像
    await updateUserProfile({ avatar: avatarUrl })
    
    // 更新 store
    await userStore.setUserAvatarAction(avatarUrl)
    
    ElMessage.success('头像更新成功')
    
    // 关闭弹窗
    try {
      cropperRef.value?.close?.()
    } catch (e) {
      // 忽略
    }
  } catch (error: any) {
    console.error('上传失败:', error)
    ElMessage.error(error?.message || '上传失败，请重试')
  } finally {
    loading.close()
  }
}
</script>

<style lang="scss" scoped>
.change-avatar {
  text-align: center;
  
  .avatar-hint {
    margin-top: 10px;
    font-size: 12px;
    color: #909399;
  }
}

:deep(.cropper-avatar) {
  display: flex;
  justify-content: center;
}
</style>