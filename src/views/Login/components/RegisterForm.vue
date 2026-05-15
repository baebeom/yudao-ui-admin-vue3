<template>
  <el-form
    v-show="getShow"
    ref="formLogin"
    :model="registerData.registerForm"
    :rules="registerRules"
    class="login-form"
    label-position="top"
    label-width="120px"
    size="large"
  >
    <el-row class="mx-[-10px]">
      <el-col :span="24" class="px-10px">
        <el-form-item>
          <LoginFormTitle class="w-full" />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item prop="username">
          <el-input
            v-model="registerData.registerForm.username"
            :placeholder="t('login.username')"
            size="large"
            :prefix-icon="iconAvatar"
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item prop="nickname">
          <el-input
            v-model="registerData.registerForm.nickname"
            placeholder="昵称"
            size="large"
            :prefix-icon="iconAvatar"
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item prop="password">
          <el-input
            v-model="registerData.registerForm.password"
            type="password"
            auto-complete="off"
            :placeholder="t('login.password')"
            size="large"
            :prefix-icon="iconLock"
            show-password
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerData.registerForm.confirmPassword"
            type="password"
            size="large"
            auto-complete="off"
            :placeholder="t('login.checkPassword')"
            :prefix-icon="iconLock"
            show-password
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item prop="mobile">
          <el-input
            v-model="registerData.registerForm.mobile"
            placeholder="手机号码"
            size="large"
            :prefix-icon="iconCellphone"
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item prop="email">
          <el-input
            v-model="registerData.registerForm.email"
            placeholder="电子邮箱"
            size="large"
            :prefix-icon="iconEmail"
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item>
          <XButton
            :loading="loginLoading"
            :title="t('login.register')"
            class="w-full"
            type="primary"
            @click="handleRegister"
          />
        </el-form-item>
      </el-col>
    </el-row>
    <XButton :title="t('login.hasUser')" class="w-full" @click="handleBackLogin()" />
  </el-form>
</template>

<script lang="ts" setup>
import { ElLoading } from 'element-plus'
import type { FormRules } from 'element-plus'
import LoginFormTitle from './LoginFormTitle.vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { useIcon } from '@/hooks/web/useIcon'
import * as authUtil from '@/utils/auth'
import * as LoginApi from '@/api/login'
import { LoginStateEnum, useLoginState, useFormValid } from './useLogin'

defineOptions({ name: 'RegisterForm' })

const { t } = useI18n()
const iconAvatar = useIcon({ icon: 'ep:avatar' })
const iconLock = useIcon({ icon: 'ep:lock' })
const iconCellphone = useIcon({ icon: 'ep:cellphone' })
const iconEmail = useIcon({ icon: 'ep:message' })
const formLogin = ref()
const { validForm } = useFormValid(formLogin)
const { handleBackLogin, getLoginState } = useLoginState()
const { currentRoute, push } = useRouter()
const redirect = ref<string>('')
const loginLoading = ref(false)

const getShow = computed(() => unref(getLoginState) === LoginStateEnum.REGISTER)

const equalToPassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (registerData.registerForm.password !== value) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules: FormRules = {
  username: [
    { required: true, trigger: 'blur', message: '请输入您的账号' },
    { min: 4, max: 30, message: '用户账号长度必须介于 4 和 30 之间', trigger: 'blur' }
  ],
  nickname: [
    { required: true, trigger: 'blur', message: '请输入您的昵称' },
    { min: 0, max: 30, message: '昵称长度必须介于 0 和 30 之间', trigger: 'blur' }
  ],
  password: [
    { required: true, trigger: 'blur', message: '请输入您的密码' },
    { min: 5, max: 20, message: '用户密码长度必须介于 5 和 20 之间', trigger: 'blur' },
    { pattern: /^[^<>"'|\\]+$/, message: '不能包含非法字符：< > " \' \\\ |', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, trigger: 'blur', message: '请再次输入您的密码' },
    { required: true, validator: equalToPassword, trigger: 'blur' }
  ],
  mobile: [
    { required: true, trigger: 'blur', message: '请输入手机号码' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { required: true, trigger: 'blur', message: '请输入电子邮箱' },       
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }  
  ]
}

const registerData = reactive({
  isShowPassword: false,
  captchaEnable: import.meta.env.VITE_APP_CAPTCHA_ENABLE,
  tenantEnable: import.meta.env.VITE_APP_TENANT_ENABLE,
  registerForm: {
    tenantName: import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT || '',
    nickname: '',
    tenantId: 0,
    username: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    email: '',
    captchaVerification: ''
  }
})

const loading = ref()

// 获取租户 ID
const getTenantId = async () => {
  if (registerData.tenantEnable === 'true') {
    const res = await LoginApi.getTenantIdByName(registerData.registerForm.tenantName)
    authUtil.setTenantId(res)
  }
}

// 提交注册
const handleRegister = async () => {
  loginLoading.value = true
  try {
    if (registerData.tenantEnable === 'true') {
      await getTenantId()
      registerData.registerForm.tenantId = authUtil.getTenantId()
    }

    const data = await validForm()
    if (!data) {
      return
    }

    const res = await LoginApi.register(registerData.registerForm)
    if (!res) {
      return
    }
    loading.value = ElLoading.service({
      lock: true,
      text: '正在加载系统中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    authUtil.removeLoginForm()
    authUtil.setToken(res)
    
    // ✅ 注册成功后获取用户信息（包含手机号、邮箱）
    try {
      const permissionInfo = await LoginApi.getInfo()
      const roles = permissionInfo?.roles || ['common']
      localStorage.setItem('userRoles', JSON.stringify(roles))
      
      // ✅ 存储完整的用户信息
      if (permissionInfo?.user) {
        const userInfo = permissionInfo.user
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
        console.log('用户信息已存储:', userInfo)
      }
    } catch (error) {
      console.error('获取用户信息失败', error)
    }
    
    localStorage.setItem('loginType', 'user')
    
    await push({ path: '/home' })
    
  } finally {
    loginLoading.value = false
    loading.value.close()
  }
}

// 根据域名，获得租户信息
const getTenantByWebsite = async () => {
  if (registerData.tenantEnable === 'true') {
    const website = location.host
    const res = await LoginApi.getTenantByWebsite(website)
    if (res) {
      registerData.registerForm.tenantName = res.name
      authUtil.setTenantId(res.id)
    }
  }
}

watch(
  () => currentRoute.value,
  (route: RouteLocationNormalizedLoaded) => {
    redirect.value = route?.query?.redirect as string
  },
  { immediate: true }
)

onMounted(() => {
  getTenantByWebsite()
})
</script>

<style lang="scss" scoped>
:deep(.anticon) {
  &:hover {
    color: var(--el-color-primary) !important;
  }
}
</style>