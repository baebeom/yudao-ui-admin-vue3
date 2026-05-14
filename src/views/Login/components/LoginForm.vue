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
        <el-form-item label="登录身份">
          <el-radio-group v-model="loginRole" size="large">
            <el-radio-button value="user">
              <el-icon><User /></el-icon>
              普通用户
            </el-radio-button>
            <el-radio-button value="admin">
              <el-icon><Setting /></el-icon>
              管理员
            </el-radio-button>
          </el-radio-group>
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

      <el-col :span="24" class="px-10px mt-[-20px] mb-[-20px]">
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
import { ElLoading } from 'element-plus'
import { User, Setting } from '@element-plus/icons-vue'
import LoginFormTitle from './LoginFormTitle.vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { useIcon } from '@/hooks/web/useIcon'

import * as authUtil from '@/utils/auth'
// import { usePermissionStore } from '@/store/modules/permission'
import * as LoginApi from '@/api/login'
import { LoginStateEnum, useFormValid, useLoginState } from './useLogin'

defineOptions({ name: 'LoginForm' })

const { t } = useI18n()
const message = useMessage()
// const iconHouse = useIcon({ icon: 'ep:house' })
const iconAvatar = useIcon({ icon: 'ep:avatar' })
const iconLock = useIcon({ icon: 'ep:lock' })
const formLogin = ref()
const { validForm } = useFormValid(formLogin)
const { setLoginState, getLoginState } = useLoginState()
const { currentRoute, push } = useRouter()
// const permissionStore = usePermissionStore()
const redirect = ref<string>('')
const loginLoading = ref(false)
const verify = ref()
const captchaType = ref('blockPuzzle')

// 登录身份选择
const loginRole = ref<'user' | 'admin'>('user')

// 登录成功跳转路径 - 所有人都跳转到首页
const REDIRECT_PATHS = {
  user: '/home',     
  admin: '/home'     
}

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

// 登录
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

    // 关键：获取并存储用户完整信息
    try {
      const permissionInfo = await LoginApi.getInfo()
      console.log('获取到的用户信息:', permissionInfo)
      
      // 存储角色
      const roles = permissionInfo?.roles || ['common']
      localStorage.setItem('userRoles', JSON.stringify(roles))
      
      // 存储用户信息
      if (permissionInfo?.user) {
        const userInfo = {
          id: permissionInfo.user.id,
          username: permissionInfo.user.username,
          nickname: permissionInfo.user.nickname,
          avatar: permissionInfo.user.avatar || '',
          mobile: permissionInfo.user.mobile || '',
          email: permissionInfo.user.email || '',
          createTime: permissionInfo.user.createTime
        }
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
        console.log('用户信息已存储:', userInfo)
      }
    } catch (error) {
      console.error('获取用户信息失败', error)
    }
    
    // 存储登录身份
    localStorage.setItem('loginType', loginRole.value)

    // 跳转
    const targetPath = REDIRECT_PATHS[loginRole.value]
    await push({ path: targetPath })

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

    const redirectPath = REDIRECT_PATHS[loginRole.value]
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

.login-code {
  float: right;
  width: 100%;
  height: 38px;

  img {
    width: 100%;
    height: auto;
    max-width: 100px;
    vertical-align: middle;
    cursor: pointer;
  }
}

:deep(.el-radio-group) {
  width: 100%;
  display: flex;

  .el-radio-button {
    flex: 1;

    .el-radio-button__inner {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      .el-icon {
        font-size: 16px;
      }
    }
  }
}
</style>