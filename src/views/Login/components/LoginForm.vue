<template>
  <el-form
    v-show="getShow"
    ref="formLogin"
    :model="loginData.loginForm"
    :rules="LoginRules"
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
            v-model="loginData.loginForm.username"
            :placeholder="t('login.usernamePlaceholder')"
            :prefix-icon="iconAvatar"
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item prop="password">
          <el-input
            v-model="loginData.loginForm.password"
            :placeholder="t('login.passwordPlaceholder')"
            :prefix-icon="iconLock"
            show-password
            type="password"
            @keyup.enter="getCode()"
          />
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item>
          <el-row justify="space-between" style="width: 100%">
            <el-col :span="6">
              <el-checkbox v-model="loginData.loginForm.rememberMe">
                {{ t('login.remember') }}
              </el-checkbox>
            </el-col>
            <el-col :offset="6" :span="12">
              <el-link
                class="float-right"
                type="primary"
                @click="setLoginState(LoginStateEnum.RESET_PASSWORD)"
              >
                {{ t('login.forgetPassword') }}
              </el-link>
            </el-col>
          </el-row>
        </el-form-item>
      </el-col>

      <el-col :span="24" class="px-10px">
        <el-form-item>
          <XButton
            :loading="loginLoading"
            :title="t('login.login')"
            class="w-full"
            type="primary"
            @click="getCode()"
          />
        </el-form-item>
      </el-col>

      <Verify
        v-if="loginData.captchaEnable === 'true'"
        ref="verify"
        :captchaType="captchaType"
        :imgSize="{ width: '400px', height: '200px' }"
        mode="pop"
        @success="handleLogin"
      />

      <el-col :span="24" class="px-10px">
        <el-form-item>
          <el-row :gutter="5" justify="space-between" style="width: 100%">
            <el-col :span="8">
              <XButton
                :title="t('login.btnMobile')"
                class="w-full"
                @click="setLoginState(LoginStateEnum.MOBILE)"
              />
            </el-col>
            <el-col :span="8">
              <XButton
                :title="t('login.btnQRCode')"
                class="w-full"
                @click="setLoginState(LoginStateEnum.QR_CODE)"
              />
            </el-col>
            <el-col :span="8">
              <XButton
                :title="t('login.btnRegister')"
                class="w-full"
                @click="setLoginState(LoginStateEnum.REGISTER)"
              />
            </el-col>
          </el-row>
        </el-form-item>
      </el-col>

      <el-divider content-position="center">{{ t('login.otherLogin') }}</el-divider>

      <el-col :span="24" class="px-10px">
        <el-form-item>
          <div class="w-full flex justify-between">
            <Icon
              v-for="(item, key) in socialList"
              :key="key"
              :icon="item.icon"
              :size="30"
              class="anticon cursor-pointer"
              color="#999"
              @click="doSocialLogin(item.type)"
            />
          </div>
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script lang="ts" setup>
import { CACHE_KEY, useCache } from '@/hooks/web/useCache' // 添加缓存工具
import { ElLoading } from 'element-plus'
import LoginFormTitle from './LoginFormTitle.vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { useIcon } from '@/hooks/web/useIcon'

import * as authUtil from '@/utils/auth'
import * as LoginApi from '@/api/login'
import { LoginStateEnum, useFormValid, useLoginState } from './useLogin'
import { useUserStore } from '@/store/modules/user'

defineOptions({ name: 'LoginForm' })

const { t } = useI18n()
const message = useMessage()
const iconAvatar = useIcon({ icon: 'ep:avatar' })
const iconLock = useIcon({ icon: 'ep:lock' })
const formLogin = ref()
const { validForm } = useFormValid(formLogin)
const { setLoginState, getLoginState } = useLoginState()
const { currentRoute, push } = useRouter()
const redirect = ref<string>('')
const loginLoading = ref(false)
const verify = ref()
const captchaType = ref('blockPuzzle')

const getShow = computed(() => unref(getLoginState) === LoginStateEnum.LOGIN)

// 表单校验规则
const required = { required: true, message: '该项为必填项', trigger: 'blur' }
const LoginRules = {
  tenantName: [required],
  username: [required],
  password: [required]
}

const loginData = reactive({
  isShowPassword: false,
  captchaEnable: import.meta.env.VITE_APP_CAPTCHA_ENABLE,
  tenantEnable: import.meta.env.VITE_APP_TENANT_ENABLE,
  loginForm: {
    tenantName: import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT || '',
    username: import.meta.env.VITE_APP_DEFAULT_LOGIN_USERNAME || '',
    password: import.meta.env.VITE_APP_DEFAULT_LOGIN_PASSWORD || '',
    captchaVerification: '',
    rememberMe: true
  }
})

const socialList = [
  { icon: 'ant-design:wechat-filled', type: 30 },
  { icon: 'ant-design:dingtalk-circle-filled', type: 20 },
  { icon: 'ant-design:github-filled', type: 0 },
  { icon: 'ant-design:alipay-circle-filled', type: 0 }
]

// 获取验证码/登录
const getCode = async () => {
  if (loginData.captchaEnable === 'false') {
    await handleLogin({})
  } else {
    verify.value.show()
  }
}

// 获取租户ID
const getTenantId = async () => {
  if (loginData.tenantEnable === 'true') {
    const res = await LoginApi.getTenantIdByName(loginData.loginForm.tenantName)
    authUtil.setTenantId(res)
  }
}

// 读取本地缓存的登录信息
const getLoginFormCache = () => {
  const loginForm = authUtil.getLoginForm()
  if (loginForm) {
    loginData.loginForm = {
      ...loginData.loginForm,
      username: loginForm.username ? loginForm.username : loginData.loginForm.username,
      password: loginForm.password ? loginForm.password : loginData.loginForm.password,
      rememberMe: loginForm.rememberMe,
      tenantName: loginForm.tenantName ? loginForm.tenantName : loginData.loginForm.tenantName
    }
  }
}

// 根据域名获取租户信息
const getTenantByWebsite = async () => {
  if (loginData.tenantEnable === 'true') {
    try {
      const website = location.host
      const res = await LoginApi.getTenantByWebsite(website)
      if (res) {
        loginData.loginForm.tenantName = res.name
        authUtil.setTenantId(res.id)
      }
    } catch (error) {
      console.warn('获取租户信息失败（未登录状态）', error)
    }
  }
}

const loading = ref()

const handleLogin = async (params: any) => {
  loginLoading.value = true
  try {
    await getTenantId()
    const data = await validForm()
    if (!data) return

    const loginDataLoginForm = { ...loginData.loginForm }
    loginDataLoginForm.captchaVerification = params.captchaVerification
    const res = await LoginApi.login(loginDataLoginForm)
    if (!res) return

    loading.value = ElLoading.service({
      lock: true,
      text: '正在加载系统中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    if (loginDataLoginForm.rememberMe) {
      authUtil.setLoginForm(loginDataLoginForm)
    } else {
      authUtil.removeLoginForm()
    }
    authUtil.setToken(res)

    // 获取并存储用户完整信息
    try {
      const permissionInfo = await LoginApi.getInfo()
      console.log('获取到的用户信息:', permissionInfo)
      const userStore = useUserStore()
      userStore.permissions = new Set(permissionInfo.permissions || [])
      userStore.roles = permissionInfo.roles || []
      userStore.user = permissionInfo.user || {}
      userStore.isSetUser = true

      const { wsCache } = useCache()
      wsCache.set(CACHE_KEY.USER, permissionInfo)

      // 根据登录接口的 userType 设置 loginType
      const isAdmin = res.userType === 'ADMIN'
      const loginType = isAdmin ? 'admin' : 'user'
      localStorage.setItem('loginType', loginType)
      console.log('设置 loginType:', loginType)

      // 根据登录接口的 userType 强制确定角色
      let roles = permissionInfo?.roles || []
      
      if (isAdmin) {
        // 确保 roles 中包含 'admin'
        if (!roles.some((r: string) => r.toLowerCase() === 'admin')) {
          roles.push('admin')
          console.log('根据 userType 补充 admin 角色')
        }
      } else if (roles.length === 0) {
        // 非管理员且 roles 为空时给默认角色
        roles = ['common']
      }
      
      localStorage.setItem('userRoles', JSON.stringify(roles))

      if (permissionInfo?.user) {
        const userInfo = {
          id: permissionInfo.user.id,
          username: permissionInfo.user.username,
          nickname: permissionInfo.user.nickname,
          avatar: permissionInfo.user.avatar || '',
          mobile: permissionInfo.user.mobile || '',
          email: permissionInfo.user.email || '',
          createTime: permissionInfo.user.createTime,
          userType: res.userType
        }
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
      }
    } catch (error) {
      console.error('获取用户信息失败', error)
      // 如果获取用户信息接口失败，至少根据登录接口的 userType 存储一个基础角色
      const fallbackRoles = res.userType === 'ADMIN' ? ['admin'] : ['common']
      localStorage.setItem('userRoles', JSON.stringify(fallbackRoles))
      
      // 同时也设置 loginType
      const loginType = res.userType === 'ADMIN' ? 'admin' : 'user'
      localStorage.setItem('loginType', loginType)
      console.log('设置 loginType (fallback):', loginType)
    }

    // ✅ 修改：统一跳转到主页 /home
    // 无论管理员还是普通用户，都进入主页
    await push({ path: '/home' })

  } finally {
    loginLoading.value = false
    loading.value?.close()
  }
}

// 第三方登录
const doSocialLogin = async (type: number) => {
  if (type === 0) {
    message.error('此方式未配置')
  } else {
    loginLoading.value = true
    if (loginData.tenantEnable === 'true') {
      await getTenantId()
      if (!authUtil.getTenantId()) {
        try {
          const data = await message.prompt('请输入租户名称', t('common.reminder'))
          if (data?.action !== 'confirm') throw 'cancel'
          const res = await LoginApi.getTenantIdByName(data.value)
          authUtil.setTenantId(res)
        } catch (error) {
          if (error === 'cancel') return
        } finally {
          loginLoading.value = false
        }
      }
    }

    // 第三方登录回调后，后端会处理登录并返回 redirectUrl，这里使用根路径
    const redirectPath = '/'
    const redirectUri =
      location.origin +
      '/social-login?' +
      encodeURIComponent(`type=${type}&redirect=${redirectPath}`)

    window.location.href = await LoginApi.socialAuthRedirect(type, encodeURIComponent(redirectUri))
  }
}

// 路由监听
watch(
  () => currentRoute.value,
  (route: RouteLocationNormalizedLoaded) => {
    redirect.value = route?.query?.redirect as string
  },
  { immediate: true }
)

onMounted(() => {
  getLoginFormCache()
  getTenantByWebsite()
})
</script>

<style lang="scss" scoped>
:deep(.anticon) {
  &:hover {
    color: var(--el-color-primary) !important;
  }
}

:deep(.el-radio-group) {
  display: flex;
  width: 100%;
  gap: 12px;

  .el-radio-button {
    flex: 1;

    .el-radio-button__inner {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 8px;
      background-color: transparent;
      border: 1px solid #dcdfe6;
      border-radius: 8px;

      .el-icon {
        font-size: 16px;
      }

      &:hover {
        color: #409eff;
        border-color: #409eff;
      }
    }

    &.is-active .el-radio-button__inner {
      color: #fff;
      background-color: #409eff;
      border-color: #409eff;
    }
  }
}
</style>