import request from '@/config/axios'

// 用户VO
export interface UserVO {
  id: number
  username: string
  nickname: string
  email: string
  mobile: string
  status: number
  createTime: string
  updateTime?: string
}

// 用户分页查询参数
export interface UserPageReqVO {
  pageNo: number
  pageSize: number
  username?: string
  nickname?: string
  mobile?: string
  status?: number
  createTimeBegin?: string
  createTimeEnd?: string
}

// 用户创建参数
export interface UserCreateReqVO {
  username: string
  nickname: string
  email?: string
  mobile?: string
  password: string
  status?: number
}

// 用户更新参数
export interface UserUpdateReqVO {
  id: number
  nickname: string
  email?: string
  mobile?: string
  status?: number
}

// 用户重置密码参数
export interface UserResetPwdReqVO {
  id: number
  password: string
}

// 用户状态更新参数
export interface UserUpdateStatusReqVO {
  id: number
  status: number
}

// 分页响应
export interface PageResult<T> {
  list: T[]
  total: number
}

// 获取用户分页列表
export const getUserPage = (params: UserPageReqVO): Promise<PageResult<UserVO>> => {
  return request.get({
    url: '/system/user/page',
    params
  })
}

// 获取用户详情
export const getUser = (id: number): Promise<UserVO> => {
  return request.get({
    url: '/system/user/get',
    params: { id }
  })
}

// 创建用户
export const createUser = (data: UserCreateReqVO): Promise<number> => {
  return request.post({
    url: '/system/user/create',
    data
  })
}

// 更新用户
export const updateUser = (data: UserUpdateReqVO): Promise<boolean> => {
  return request.put({
    url: '/system/user/update',
    data
  })
}

// 删除用户
export const deleteUser = (id: number): Promise<boolean> => {
  return request.delete({
    url: '/system/user/delete',
    params: { id }
  })
}

// 重置用户密码
export const resetUserPassword = (data: UserResetPwdReqVO): Promise<boolean> => {
  return request.put({
    url: '/system/user/reset-password',
    data
  })
}

// 更新用户状态
export const updateUserStatus = (data: UserUpdateStatusReqVO): Promise<boolean> => {
  return request.put({
    url: '/system/user/update-status',
    data
  })
}