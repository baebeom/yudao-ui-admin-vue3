<template>
  <div
    :class="prefixCls"
    class="relative h-[100%] flex items-center justify-center"
  >
    <!-- 背景图片 -->
    <div class="login-bg"></div>
    
    <!-- 半透明白色矩形容器 -->
    <div class="login-container">
      <div class="login-content">
        <!-- 标题 -->
        <div class="login-header">
          <h2 class="login-title">{{ underlineToHump(appStore.getTitle) }}</h2>
        </div>

        <!-- 登录表单区域 -->
        <div class="login-forms">
          <LoginForm class="login-form-wrapper" />
          <MobileForm class="login-form-wrapper" />
          <QrCodeForm class="login-form-wrapper" />
          <RegisterForm class="login-form-wrapper" />
          <SSOLoginVue class="login-form-wrapper" />
          <ForgetPasswordForm class="login-form-wrapper" />
        </div>

        <!-- 底部 -->
        <div class="login-footer">
          <ThemeSwitch />
          <LocaleDropdown />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { underlineToHump } from '@/utils'

import { useDesign } from '@/hooks/web/useDesign'
import { useAppStore } from '@/store/modules/app'
import { ThemeSwitch } from '@/layout/components/ThemeSwitch'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'

import { LoginForm, MobileForm, QrCodeForm, RegisterForm, SSOLoginVue, ForgetPasswordForm } from './components'

defineOptions({ name: 'Login' })

const appStore = useAppStore()
const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('login')
</script>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-login;

.#{$prefix-cls} {
  width: 100%;
  height: 100%;
  overflow: auto;
  
  .login-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('@/assets/imgs/bg.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    z-index: 0;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
    }
  }
  
  .login-container {
    position: relative;
    z-index: 1;
    width: 480px;
    max-width: 90%;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(2px);
  }
  
  .login-content {
    padding: 40px 32px;
  }
  
  .login-header {
    text-align: center;
    margin-bottom: 32px;
    
    .login-logo {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }
    
    .login-title {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      margin: 0;
      letter-spacing: 2px;
    }
  }
  
  .login-forms {
    min-height: 400px;
  }
  
  .login-form-wrapper {
    :deep(.el-card) {
      background-color: transparent !important;
      box-shadow: none !important;
      border: none !important;
    }
    
    :deep(.el-form-item) {
      margin-bottom: 20px;
    }
    
    :deep(.el-input__wrapper) {
      background-color: #f5f7fa;
      border-radius: 8px;
    }
    
    :deep(.el-button--primary) {
      width: 100%;
      border-radius: 8px;
      height: 44px;
      font-size: 16px;
    }
    :deep(.el-divider__text) {
      background-color: transparent !important;
    }
  }
  
  .login-footer {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }
}

.dark {
  .login-container {
    background: rgba(30, 30, 40, 0.92);
    
    .login-title {
      color: #e5eaf3;
    }
    
    .login-footer {
      border-top-color: #414243;
    }
  }
}

@media (max-width: 768px) {
  .login-container {
    width: 95%;
  }
  
  .login-content {
    padding: 30px 20px;
  }
  
  .login-header .login-logo {
    width: 50px;
    height: 50px;
  }
  
  .login-header .login-title {
    font-size: 20px;
  }
}
</style>