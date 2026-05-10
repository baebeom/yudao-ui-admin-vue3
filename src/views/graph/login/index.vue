<template>
  <div class="graph-login-container">
    <div class="graph-login-card">
      <div class="graph-login-header">
        <img src="@/assets/imgs/logo.png" alt="logo" class="graph-logo" />
        <h1>农知问答</h1>
        <p>农业知识智能问答与图谱检索</p>
      </div>

      <el-tabs v-model="activeTab" class="graph-login-tabs" :stretch="true">
        <el-tab-pane label="账号登录" name="login">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-position="top"
            size="large"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                :prefix-icon="User"
                clearable
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                type="password"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-button
              type="primary"
              size="large"
              class="w-full"
              :loading="loginLoading"
              @click="handleLogin"
            >
              登录
            </el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="游客体验" name="guest">
          <div class="guest-info">
            <div class="guest-icon">
              <el-icon :size="48"><User /></el-icon>
            </div>
            <p class="guest-desc">无需注册，立即体验知识图谱功能</p>
            <p class="guest-tip">• 实体关系查询<br/>• AI 智能问答<br/>• 知识图谱可视化</p>
            <el-button
              type="success"
              size="large"
              class="w-full"
              :loading="guestLoading"
              @click="handleGuestLogin"
            >
              游客登录
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="graph-login-footer">
        <el-link type="primary" @click="openRegisterDialog">还没有账号？立即注册</el-link>
      </div>
    </div>

    <!-- 注册弹窗 -->
    <el-dialog v-model="registerDialogVisible" title="注册账号" width="450px" :close-on-click-modal="false">
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
        size="large"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="registerForm.username" placeholder="请输入用户名（2-20个字符）" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="registerForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="registerForm.password" type="password" placeholder="请输入密码（6-20个字符）" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请确认密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="registerLoading" @click="handleRegister">注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormRules } from 'element-plus'
import request from '@/config/axios'

defineOptions({ name: 'GraphLogin' })

const router = useRouter()
const route = useRoute()
const activeTab = ref<'login' | 'guest'>('login')
const registerDialogVisible = ref(false)

// ==================== 登录表单 ====================
const loginFormRef = ref()
const loginLoading = ref(false)
const loginForm = reactive({
  username: '',
  password: ''
})
const loginRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 响应处理
const handleLoginResponse = (res: any) => {
  let data = res
  if (res?.code === 0 && res?.data) data = res.data
  if (res?.code === 200 && res?.data) data = res.data
  if (!data || !data.userId || !data.token) {
    ElMessage.error('登录失败：响应数据格式错误')
    return null
  }
  return data
}

// 登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    loginLoading.value = true
    try {
      const res = await request.post({
        url: '/graph/auth/login',
        data: loginForm,
        headers: { 'tenant-id': '1' }
      })
      
      const data = handleLoginResponse(res)
      if (!data) return

      // 存储登录状态
      setGraphToken(data.token)
      setGraphUser({ id: data.userId, nickname: loginForm.username, visitor: data.visitor })
      setGraphVisitorMode(data.visitor === 1)
      localStorage.setItem('ACCESS_TOKEN', data.token)

      ElMessage.success('登录成功')
      
      // 关键修复：支持 redirect
      const redirect = route.query.redirect as string || '/graph/chat'
      router.push(redirect)
    } catch (error: any) {
      const msg = error?.response?.data?.msg || '登录失败'
      ElMessage.error(msg)
    } finally {
      loginLoading.value = false
    }
  })
}

// 游客登录
const guestLoading = ref(false)
const handleGuestLogin = async () => {
  guestLoading.value = true
  try {
    const res = await request.post({
      url: '/graph/auth/visitor-login',
      headers: { 'tenant-id': '1' }
    })
    
    const data = handleLoginResponse(res)
    if (!data) return

    setGraphToken(data.token)
    setGraphUser({ id: data.userId, nickname: '游客用户', visitor: data.visitor })
    setGraphVisitorMode(true)
    localStorage.setItem('ACCESS_TOKEN', data.token)

    ElMessage.success('游客登录成功')
    
    // 关键修复：支持 redirect
    const redirect = route.query.redirect as string || '/graph/chat'
    router.push(redirect)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.msg || '游客登录失败')
  } finally {
    guestLoading.value = false
  }
}

// ==================== 注册 ====================
const registerFormRef = ref()
const registerLoading = ref(false)
const registerForm = reactive({
  username: '', nickname: '', email: '', password: '', confirmPassword: ''
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (!value) callback(new Error('请确认密码'))
  else if (value !== registerForm.password) callback(new Error('两次密码不一致'))
  else callback()
}

const registerRules: FormRules = {
  username: [{ required: true }, { min: 2, max: 20 }],
  nickname: [{ required: true }, { max: 30 }],
  email: [{ required: true, type: 'email' }],
  password: [{ required: true }, { min: 6, max: 20 }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword }]
}

const openRegisterDialog = () => { registerDialogVisible.value = true }

const handleRegister = async () => {
  await registerFormRef.value?.validate(async (valid) => {
    if (!valid) return
    registerLoading.value = true
    try {
      const { confirmPassword, ...registerData } = registerForm
      const res = await request.post({
        url: '/graph/auth/register',
        data: registerData,
        headers: { 'tenant-id': '1' }
      })
      const data = handleLoginResponse(res)
      if (!data) return

      setGraphToken(data.token)
      setGraphUser({ id: data.userId, nickname: registerForm.nickname, visitor: 0 })
      setGraphVisitorMode(false)
      localStorage.setItem('ACCESS_TOKEN', data.token)
      
      ElMessage.success('注册成功')
      registerDialogVisible.value = false
      router.push('/graph/chat')
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.msg || '注册失败')
    } finally {
      registerLoading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.graph-login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.graph-login-card {
  width: 450px;
  background: #fff;
  border-radius: 20px;
  padding: 48px 40px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}
.graph-login-header {
  text-align: center; margin-bottom: 32px;
  .graph-logo { width: 60px; height: 60px; margin-bottom: 16px; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  p { font-size: 14px; color: #909399; }
}
.guest-info {
  text-align: center;
  .guest-icon { margin-bottom: 20px; color: #67c23a; }
  .guest-desc { margin-bottom: 16px; }
  .guest-tip { background: #f5f7fa; padding: 12px; border-radius: 8px; margin-bottom: 28px; }
}
.graph-login-footer {
  text-align: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e4e7ed;
}
.w-full { width: 100%; }
</style>