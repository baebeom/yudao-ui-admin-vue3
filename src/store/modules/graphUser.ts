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

// 直接定义类型
interface UserLoginVO {
  username: string
  password: string
}

interface RegisterVO {
  username: string
  password: string
  nickname?: string
  email?: string
  mobile?: string
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
          
          // 登录成功后，调用获取用户信息接口
          try {
            const infoRes = await request.get({
              url: '/graph/auth/get-info',
              headers: { 
                'tenant-id': '1',
                'Authorization': 'Bearer ' + data.token
              }
            })
            const infoData = handleResponse(infoRes)
            if (infoData) {
              this.userInfo = infoData.user || infoData
              this.roles = infoData.roles || ['user']
            }
          } catch (err) {
            console.error('获取用户信息失败', err)
            this.userInfo = {
              id: data.userId,
              nickname: userInfo.username,
              username: userInfo.username,
              visitor: 0
            }
            this.roles = ['user']
          }
          
          setGraphUser(this.userInfo)
          
          const userInfoWithRoles = {
            ...this.userInfo,
            roles: this.roles
          }
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithRoles))
          localStorage.setItem('userRoles', JSON.stringify(this.roles))
          
          console.log('登录成功，用户信息:', this.userInfo)
          
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
          
          // 注册成功后也获取完整用户信息
          try {
            const infoRes = await request.get({
              url: '/graph/auth/get-info',
              headers: { 
                'tenant-id': '1',
                'Authorization': 'Bearer ' + responseData.token
              }
            })
            const infoData = handleResponse(infoRes)
            if (infoData) {
              this.userInfo = infoData.user || infoData
              this.roles = infoData.roles || ['user']
            }
          } catch (err) {
            console.error('获取用户信息失败', err)
            this.userInfo = {
              id: responseData.userId,
              nickname: data.nickname || data.username,
              mobile: data.mobile || '',
              email: data.email || '',
              username: data.username,
              visitor: 0
            }
            this.roles = ['user']
          }
          
          setGraphUser(this.userInfo)
          
          const userInfoWithRoles = {
            ...this.userInfo,
            roles: this.roles
          }
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithRoles))
          localStorage.setItem('userRoles', JSON.stringify(this.roles))
          
          console.log('注册成功，用户信息:', this.userInfo)
          
          return { code: 200, data: responseData }
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 获取用户信息
    async getUserInfoAction() {
      try {
        const res = await request.get({
          url: '/graph/auth/get-info',
          headers: { 'tenant-id': '1' }
        })
        
        const data = handleResponse(res)
        if (data) {
          this.userInfo = data.user || data
          this.roles = data.roles || ['user']
          
          console.log('用户信息:', this.userInfo)
          
          setGraphUser(this.userInfo)
          
          const userInfoWithRoles = {
            ...this.userInfo,
            roles: this.roles
          }
          localStorage.setItem('userInfo', JSON.stringify(userInfoWithRoles))
          localStorage.setItem('userRoles', JSON.stringify(this.roles))
          
          return this.userInfo
        }
        return null
      } catch (error) {
        console.error('获取用户信息失败', error)
        return null
      }
    },

    // 登出
    async logoutAction() {
      try {
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
      
      localStorage.removeItem('userRoles')
      localStorage.removeItem('userInfo')
    },
    
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