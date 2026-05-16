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
import { computed } from 'vue'
import { updateUserProfile } from '@/api/system/user/profile'
import { CropperAvatar } from '@/components/Cropper'
import { useUserStore } from '@/store/modules/user'
import { useUpload } from '@/components/UploadFile/src/useUpload'
import { UploadRequestOptions } from 'element-plus/es/components/upload/src/upload'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'UserAvatar' })

const userStore = useUserStore()

// 获取用户昵称（用于生成默认头像）
const userName = computed(() => userStore.getUser?.nickname || '用户')

// 显示的头像
const displayAvatar = computed(() => {
  const userAvatar = userStore.getUser?.avatar
  if (userAvatar && userAvatar !== '') {
    return userAvatar
  }
  const name = userName.value || 'user'
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${name}&backgroundType=gradientLinear&backgroundColor=b6e3f4&radius=50`
})

// 上传处理
const handelUpload = async ({ data }) => {
  try {
    const { httpRequest } = useUpload()
    const avatar = (
      (await httpRequest({
        file: data,
        filename: 'avatar.png'
      } as UploadRequestOptions)) as unknown as { data: string }
    ).data
    await updateUserProfile({ avatar })

    await userStore.setUserAvatarAction(avatar)
    ElMessage.success('头像更新成功')
  } catch (error) {
    ElMessage.error('上传失败，请重试')
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

// 让 CropperAvatar 的头像居中并可点击
:deep(.cropper-avatar) {
  display: flex;
  justify-content: center;
  cursor: pointer;
}
</style>