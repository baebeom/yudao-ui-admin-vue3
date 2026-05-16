import { store } from '@/store'
import { defineStore } from 'pinia'
import { getAccessToken, removeToken } from '@/utils/auth'
import { CACHE_KEY, useCache, deleteUserCache } from '@/hooks/web/useCache'
import { getInfo, loginOut } from '@/api/login'
import { getUserProfile } from '@/api/system/user/profile'

const { wsCache } = useCache()

interface UserVO {
  id: number
  avatar: string
  nickname: string
  deptId: number | null
  username?: string
  mobile?: string
  email?: string
  createTime?: string
}

interface UserInfoVO {
  permissions: Set<string>
  roles: string[]
  isSetUser: boolean
  user: UserVO
}

export const useUserStore = defineStore('admin-user', {
  state: (): UserInfoVO => ({
    permissions: new Set<string>(),
    roles: [],
    isSetUser: false,
    user: {
      id: 0,
      avatar: '',
      nickname: '',
      deptId: 0
    }
  }),
  getters: {
    getPermissions(): Set<string> {
      return this.permissions
    },
    getRoles(): string[] {
      return this.roles
    },
    getIsSetUser(): boolean {
      return this.isSetUser
    },
    getUser(): UserVO {
      return this.user
    }
  },
  actions: {
    async setUserInfoAction() {
      if (!getAccessToken()) {
        this.resetState()
        return null
      }
      let userInfo = wsCache.get(CACHE_KEY.USER)
      if (!userInfo) {
        userInfo = await getInfo()
      } else {
        try {
          userInfo = await getInfo()
        } catch (error) {}
      }
      this.permissions = new Set(userInfo.permissions || [])
      this.roles = userInfo.roles
      this.user = userInfo.user
      this.isSetUser = true
      
      try {
        const profileRes = await getUserProfile()
        const profile = profileRes?.data || profileRes
        if (profile) {
          this.user = {
            ...this.user,
            mobile: profile.mobile,
            email: profile.email,
            createTime: profile.createTime,
            username: profile.username || this.user.username
          }
          userInfo.user = this.user
        }
      } catch (error) {
        console.error('获取完整用户信息失败', error)
      }
      
      wsCache.set(CACHE_KEY.USER, userInfo)
      wsCache.set(CACHE_KEY.ROLE_ROUTERS, userInfo.menus)
    },
    setUserAvatarAction(avatar: string) {
      this.user.avatar = avatar
      const userInfo = wsCache.get(CACHE_KEY.USER)
      if (userInfo) {
        userInfo.user.avatar = avatar
        wsCache.set(CACHE_KEY.USER, userInfo)
      }
    },
    async setUserNicknameAction(nickname: string) {
      const userInfo = wsCache.get(CACHE_KEY.USER)
      if (userInfo) {
        this.user.nickname = nickname
        userInfo.user.nickname = nickname
        wsCache.set(CACHE_KEY.USER, userInfo)
      }
    },
    updateUserProfile(profile: any) {
      const userInfo = wsCache.get(CACHE_KEY.USER)
      if (userInfo) {
        this.user = { ...this.user, ...profile }
        userInfo.user = { ...userInfo.user, ...profile }
        wsCache.set(CACHE_KEY.USER, userInfo)
      }
    },
    async loginOut() {
      try {
        // 调用后端退出接口（可选）
        await loginOut()
      } catch (error) {
        console.error('退出接口调用失败', error)
      }
      
      // 清除 token
      removeToken()
      
      // 清除用户缓存
      deleteUserCache()
      
      // 清除 loginType
      localStorage.removeItem('loginType')
      localStorage.removeItem('userRoles')
      localStorage.removeItem('userInfo')
      
      // 重置 store 状态
      this.resetState()
      
      // ✅ 关键：跳转到登录页
      // 使用 window.location 确保彻底刷新
      window.location.href = '/login'
    },
    resetState() {
      this.permissions = new Set<string>()
      this.roles = []
      this.isSetUser = false
      this.user = {
        id: 0,
        avatar: '',
        nickname: '',
        deptId: 0
      }
    }
  }
})

export const useUserStoreWithOut = () => {
  return useUserStore(store)
}