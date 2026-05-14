// src/store/modules/graphUser.ts
import { defineStore } from 'pinia'
import request from '@/config/axios'
import { 
  setGraphToken, 
  removeGraphToken, 
  setGraphUser, 
  getGraphToken,  
  getGraphUser,   
  setGraphVisitorMode,
  isGraphVisitorMode 
} from '@/utils/graph-auth'

// 直接定义类型，不再从外部导入
interface UserLoginVO {
  username: string
  password: string
}

interface RegisterVO {
  username: string
  password: string
  nickname?: string
  email?: string
}

interface GraphUserState {
  token: string
  userInfo: any
  visitorMode: boolean
  roles: string[]
}

// 响应处理函数
const handleResponse = (res: any) => {
  let data = res
  if (res?.code === 0 && res?.data) data = res.data
  if (res?.code === 200 && res?.data) data = res.data
  return data
}

export const useGraphUserStore = defineStore('graph-user', {
  state: (): GraphUserState => ({
    token: getGraphToken() || '',
    userInfo: getGraphUser() || null,
    visitorMode: isGraphVisitorMode(),
    roles: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isVisitor: (state) => state.visitorMode,
    getUserInfo: (state) => state.userInfo,
    getUserRoles: (state) => state.roles
  },

  actions: {
    // 登录
    async loginAction(userInfo: UserLoginVO) {
      try {
        const res = await request.post({
          url: '/graph/auth/login',
          data: userInfo,
          headers: { 'tenant-id': '1' }
        })
        
        const data = handleResponse(res)
        if (data && data.token) {
          this.token = data.token
          this.visitorMode = false
          setGraphToken(data.token)
          setGraphVisitorMode(false)
          
          // 设置基本用户信息
          this.userInfo = {
            id: data.userId,
            nickname: userInfo.username,
            visitor: 0
          }
          this.roles = ['user'] // 默认角色
          setGraphUser(this.userInfo)
          
          // 存储角色到 localStorage
          localStorage.setItem('userRoles', JSON.stringify(this.roles))
          
          // 存储用户信息
          const userInfoWithRoles = {
            ...this.userInfo,
            roles: this.roles
          }
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithRoles))
          
          return { code: 200, data }
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 注册
    async registerAction(data: RegisterVO) {
      try {
        const res = await request.post({
          url: '/graph/auth/register',
          data: data,
          headers: { 'tenant-id': '1' }
        })
        
        const responseData = handleResponse(res)
        if (responseData && responseData.token) {
          this.token = responseData.token
          this.visitorMode = false
          setGraphToken(responseData.token)
          setGraphVisitorMode(false)
          
          // 设置用户信息
          this.userInfo = {
            id: responseData.userId,
            nickname: data.nickname || data.username,
            visitor: 0
          }
          this.roles = ['user']
          setGraphUser(this.userInfo)
          
          // 存储角色到 localStorage
          localStorage.setItem('userRoles', JSON.stringify(this.roles))
          
          // 存储用户信息
          const userInfoWithRoles = {
            ...this.userInfo,
            roles: this.roles
          }
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithRoles))
          
          return { code: 200, data: responseData }
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 游客登录
    async guestLoginAction() {
      try {
        const res = await request.post({
          url: '/graph/auth/visitor-login',
          headers: { 'tenant-id': '1' }
        })
        
        const data = handleResponse(res)
        if (data && data.token) {
          this.token = data.token
          this.visitorMode = true
          setGraphToken(data.token)
          setGraphVisitorMode(true)
          
          // 设置游客用户信息
          this.userInfo = {
            id: data.userId,
            nickname: '游客用户',
            visitor: 1
          }
          this.roles = ['visitor']
          setGraphUser(this.userInfo)
          
          // 存储角色到 localStorage
          localStorage.setItem('userRoles', JSON.stringify(this.roles))
          
          // 存储用户信息
          const userInfoWithRoles = {
            ...this.userInfo,
            roles: this.roles
          }
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithRoles))
          
          return { code: 200, data }
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 获取用户信息（如果需要从后端获取更多信息）
    async getUserInfoAction() {
      try {
        // 如果已经有用户信息，直接返回
        if (this.userInfo && this.userInfo.id) {
          // 尝试从后端获取更详细的信息（可选）
          const res = await request.get({
            url: '/graph/user/get',
            params: { id: this.userInfo.id },
            headers: { 'tenant-id': '1' }
          })
          
          const data = handleResponse(res)
          if (data) {
            this.userInfo = { ...this.userInfo, ...data }
            setGraphUser(this.userInfo)
          }
        }
        
        // 确保角色存在
        if (!this.roles.length) {
          this.roles = this.visitorMode ? ['visitor'] : ['user']
          localStorage.setItem('userRoles', JSON.stringify(this.roles))
        }
        
        return this.userInfo
      } catch (error) {
        console.error('获取用户信息失败', error)
        // 即使获取失败，也返回已有的基本信息
        return this.userInfo
      }
    },

    // 登出
    async logoutAction() {
      try {
        // 尝试调用登出接口
        await request.post({
          url: '/graph/auth/logout',
          headers: { 'tenant-id': '1' }
        })
      } catch (error) {
        console.error('登出接口调用失败', error)
      } finally {
        this.resetState()
      }
    },

    // 重置状态
    resetState() {
      this.token = ''
      this.userInfo = null
      this.visitorMode = false
      this.roles = []
      removeGraphToken()
      setGraphVisitorMode(false)
      
      // 清除 localStorage 中的角色和用户信息
      localStorage.removeItem('userRoles')
      localStorage.removeItem('userInfo')
    },
    
    // 手动设置角色（用于调试或特殊情况）
    setRoles(roles: string[]) {
      this.roles = roles
      localStorage.setItem('userRoles', JSON.stringify(roles))
      
      if (this.userInfo) {
        const userInfoWithRoles = {
          ...this.userInfo,
          roles: this.roles
        }
        localStorage.setItem('userInfo', JSON.stringify(userInfoWithRoles))
      }
    }
  }
})