import { defineStore } from 'pinia'
import { login, register, guestLogin, getInfo, loginOut } from '@/api/graph/login'
import { 
  setGraphToken, 
  removeGraphToken, 
  setGraphUser, 
  getGraphToken,  
  getGraphUser,   
  setGraphVisitorMode,
  isGraphVisitorMode 
} from '@/utils/graph-auth'
import type { UserLoginVO, RegisterVO } from '@/api/graph/login/types'

interface GraphUserState {
  token: string
  userInfo: any
  visitorMode: boolean
  roles: string[]
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
    getUserInfo: (state) => state.userInfo
  },

  actions: {
    // 登录
    async loginAction(userInfo: UserLoginVO) {
      try {
        const res: any = await login(userInfo)
        if (res.code === 200) {
          this.token = res.data.token
          this.visitorMode = false
          setGraphToken(res.data.token)
          setGraphVisitorMode(false)
          
          // 获取用户信息
          await this.getUserInfoAction()
          
          return res
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 注册
    async registerAction(data: RegisterVO) {
      try {
        const res: any = await register(data)
        if (res.code === 200) {
          this.token = res.data.token
          this.visitorMode = false
          setGraphToken(res.data.token)
          setGraphVisitorMode(false)
          
          // 获取用户信息
          await this.getUserInfoAction()
          
          return res
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 游客登录
    async guestLoginAction() {
      try {
        const res: any = await guestLogin()
        if (res.code === 200) {
          this.token = res.data.token
          this.visitorMode = true
          setGraphToken(res.data.token)
          setGraphVisitorMode(true)
          
          // 设置游客用户信息
          this.userInfo = {
            id: res.data.userId,
            nickname: '游客用户',
            visitor: 1
          }
          setGraphUser(this.userInfo)
          
          return res
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 获取用户信息
    async getUserInfoAction() {
      try {
        const res: any = await getInfo()
        if (res.code === 200) {
          this.userInfo = res.data.user
          this.roles = res.data.roles || []
          setGraphUser(res.data.user)
          return res.data
        }
        return null
      } catch (error) {
        return Promise.reject(error)
      }
    },

    // 登出
    async logoutAction() {
      try {
        await loginOut()
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
    }
  }
})