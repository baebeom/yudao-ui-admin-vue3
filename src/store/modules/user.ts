import { store } from '@/store'
import { defineStore } from 'pinia'
import { getAccessToken, removeToken } from '@/utils/auth'
import { CACHE_KEY, useCache, deleteUserCache } from '@/hooks/web/useCache'
import { getInfo, loginOut } from '@/api/login'
import { getUserProfile } from '@/api/system/user/profile'  // ✅ 导入

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
      
      // ✅ 补充手机号、邮箱等完整信息
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
      await loginOut()
      removeToken()
      deleteUserCache()
      this.resetState()
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