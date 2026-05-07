// src/api/graph/login/index.ts
import request from '@/config/axios'
import type { RegisterVO, UserLoginVO, TokenType, UserInfoVO } from './types'

// ==================== Graph 模块认证 API（匹配后端接口） ====================

// 用户登录
export const login = (data: UserLoginVO) => {
  return request.post({
    url: '/graph/auth/login',
    data
  })
}

// 注册
export const register = (data: RegisterVO) => {
  return request.post({
    url: '/graph/auth/register',
    data: data
  })
}

// 游客登录
export const guestLogin = () => {
  return request.post({
    url: '/graph/auth/visitor-login',
    data: {}
  })
}

// 获取用户信息（如果后端有）
export const getUserInfo = (userId: number) => {
  return request.get({
    url: '/graph/user/get',
    params: { id: userId }
  })
}

// 登出（如果后端有）
export const logout = () => {
  return request.post({
    url: '/graph/auth/logout'
  })
}

// ==================== 以下为兼容旧代码的别名 ====================

// 获取用户信息（别名）
export const getInfo = () => {
  // 从 localStorage 获取用户信息，或者调用接口
  const token = localStorage.getItem('GRAPH_ACCESS_TOKEN')
  if (!token) {
    return Promise.reject(new Error('未登录'))
  }
  // 这里可以根据实际需求实现
  return Promise.resolve({
    code: 200,
    data: {
      user: JSON.parse(localStorage.getItem('GRAPH_USER_INFO') || '{}')
    }
  })
}

// 登出（别名）
export const loginOut = () => {
  return logout()
}