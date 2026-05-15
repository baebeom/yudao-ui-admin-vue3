<template>
  <el-form ref="formRef" :model="formModel" label-width="100px" :rules="rules">
    <el-form-item label="用户名" prop="username">
      <el-input v-model="formModel.username" disabled />
    </el-form-item>
    <el-form-item label="昵称" prop="nickname">
      <el-input v-model="formModel.nickname" />
    </el-form-item>
    <el-form-item label="手机号" prop="mobile">
      <el-input v-model="formModel.mobile" />
    </el-form-item>
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="formModel.email" />
    </el-form-item>
    <el-form-item>
      <div style="display: flex; justify-content: center; width: 100%;">
        <el-button type="primary" @click="submit">保存修改</el-button>
      </div>
    </el-form-item>
  </el-form>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { updateUserProfile } from '@/api/system/user/profile'
import { useMessage } from '@/hooks/web/useMessage'
import { useI18n } from '@/hooks/web/useI18n'
import { useCache, CACHE_KEY } from '@/hooks/web/useCache'

const { t } = useI18n()
const { success, error } = useMessage()
const userStore = useUserStore()
const { wsCache } = useCache()  // ✅ 正确获取 wsCache
const formRef = ref<FormInstance>()
const emit = defineEmits(['success'])

const formModel = ref({
  username: '',
  nickname: '',
  mobile: '',
  email: ''
})

// 监听 store 变化，更新表单
watch(
  () => userStore.getUser,
  (newUser) => {
    if (newUser) {
      formModel.value = {
        username: newUser.username || '',
        nickname: newUser.nickname || '',
        mobile: newUser.mobile || '',
        email: newUser.email || ''
      }
      console.log('表单已更新:', formModel.value)
    }
  },
  { deep: true, immediate: true }
)

onMounted(() => {
  const user = userStore.getUser
  if (user) {
    formModel.value = {
      username: user.username || '',
      nickname: user.nickname || '',
      mobile: user.mobile || '',
      email: user.email || ''
    }
    console.log('onMounted 加载表单数据:', formModel.value)
  }
})

const rules: FormRules = {
  nickname: [{ required: true, message: '昵称不能为空', trigger: 'blur' }],
  mobile: [
    { required: true, message: '手机号不能为空', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

const submit = async () => {
  if (!formRef.value) return
  
  formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const payload = {
        nickname: formModel.value.nickname,
        mobile: formModel.value.mobile,
        email: formModel.value.email
      }
      await updateUserProfile(payload)
      success(t('common.updateSuccess'))
      
      // 更新 store 中的用户信息
      userStore.user = {
        ...userStore.user,
        nickname: payload.nickname,
        mobile: payload.mobile,
        email: payload.email
      }
      
      // 同时更新缓存
      const userInfoCache = wsCache.get(CACHE_KEY.USER)
      if (userInfoCache) {
        userInfoCache.user = userStore.user
        wsCache.set(CACHE_KEY.USER, userInfoCache)
      }
      
      emit('success')
    } catch (err) {
      error('修改失败')
      console.error(err)
    }
  })
}
</script>