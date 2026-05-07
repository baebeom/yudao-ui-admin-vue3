// src/api/graph/login/types.ts

// 登录请求参数
export interface UserLoginVO {
  username: string
  password: string
}

// 注册请求参数
export interface RegisterVO {
  username: string
  password: string
  nickname?: string
  email?: string
}

// Token 响应（适配你的后端）
export interface TokenType {
  token: string
  userId: number
  visitor: number
}

// 登录响应（适配你的后端 GraphAuthRespVO）
export interface GraphAuthRespVO {
  code: number
  data: {
    userId: number
    token: string
    visitor: number
  }
  msg: string
}

// 用户信息响应
export interface UserInfoVO {
  user: {
    id: number
    nickname: string
    avatar: string
    deptId: number
  }
  roles: string[]
  permissions: string[]
  menus: any[]
}

// 登录响应（别名）
export interface LoginResultVO extends GraphAuthRespVO {}
export interface RegisterResultVO extends GraphAuthRespVO {}