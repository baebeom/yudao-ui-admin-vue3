import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import qs from 'qs'
import { config } from '@/config/axios/config'
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
  getVisitTenantId,
  removeToken,
  setToken
} from '@/utils/auth'
import errorCode from './errorCode'

import { resetRouter } from '@/router'
import { deleteUserCache } from '@/hooks/web/useCache'
import { ApiEncrypt } from '@/utils/encrypt'

const tenantEnable = import.meta.env.VITE_APP_TENANT_ENABLE
const { result_code, base_url, request_timeout } = config

// 需要忽略的提示。忽略后，自动 Promise.reject('error')
const ignoreMsgs = [
  '无效的刷新令牌',
  '刷新令牌已过期'
]
// 是否显示重新登录
export const isRelogin = { show: false }
// 请求队列
let requestList: any[] = []
// 是否正在刷新中
let isRefreshToken = false
// 请求白名单，无须 token 的接口（包括 Graph 登录接口）
const whiteList: string[] = ['/login', '/refresh-token', '/graph/auth/login', '/graph/auth/visitor-login']

// 判断是否是 Graph 模块的请求
const isGraphRequest = (url?: string): boolean => {
  return url?.startsWith('/graph') ?? false
}

const getEffectiveToken = (): string | null => {
  return getAccessToken()
}

// 🔥 清除 Graph token（仅用于错误处理）
const clearGraphToken = (): void => {
  localStorage.removeItem('GRAPH_ACCESS_TOKEN')
  localStorage.removeItem('graph_token')
}

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: base_url,
  timeout: request_timeout,
  withCredentials: false,
  paramsSerializer: (params) => {
    return qs.stringify(params, { allowDots: true })
  }
})

// ========== request拦截器 ==========
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 是否需要设置 token；命中白名单的接口（如 /login）不带 token
    let isToken = (config!.headers || {}).isToken !== false
    if (isToken && whiteList.some((v) => config.url?.includes(v))) {
      isToken = false
    }
    
    // 🔥 Graph 模块请求：使用有效 Token（主系统 Token 优先）
    if (isGraphRequest(config.url)) {
      const token = getEffectiveToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } else {
      // 主系统请求：使用 ACCESS_TOKEN
      if (isToken && getAccessToken()) {
        config.headers.Authorization = 'Bearer ' + getAccessToken()
      }
    }
    
    // 设置租户
    if (tenantEnable && tenantEnable === 'true') {
      const tenantId = getTenantId()
      if (tenantId) config.headers['tenant-id'] = tenantId
      const visitTenantId = getVisitTenantId()
      if (config.headers.Authorization && visitTenantId) {
        config.headers['visit-tenant-id'] = visitTenantId
      }
    }
    
    const method = config.method?.toUpperCase()
    // 防止 GET 请求缓存
    if (method === 'GET') {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }
    // 自定义参数序列化函数
    else if (method === 'POST') {
      const contentType = config.headers['Content-Type'] || config.headers['content-type']
      if (contentType === 'application/x-www-form-urlencoded') {
        if (config.data && typeof config.data !== 'string') {
          config.data = qs.stringify(config.data)
        }
      }
    }
    // 是否 API 加密
    if ((config!.headers || {}).isEncrypt && !(config!.headers || {}).isEncrypted) {
      try {
        if (config.data) {
          config.data = ApiEncrypt.encryptRequest(config.data)
          config.headers[ApiEncrypt.getEncryptHeader()] = 'true'
        }
      } catch (error) {
        console.error('请求数据加密失败:', error)
        throw error
      }
    }
    return config
  },
  (error: AxiosError) => {
    console.log(error)
    return Promise.reject(error)
  }
)

// ========== response 拦截器 ==========
service.interceptors.response.use(
  async (response: AxiosResponse<any>) => {
    let { data } = response
    const config = response.config
    if (!data) {
      throw new Error()
    }

    // 检查是否需要解密响应数据
    const encryptHeader = ApiEncrypt.getEncryptHeader()
    const isEncryptResponse =
      response.headers[encryptHeader] === 'true' ||
      response.headers[encryptHeader.toLowerCase()] === 'true'
    if (isEncryptResponse && typeof data === 'string') {
      try {
        data = ApiEncrypt.decryptResponse(data)
      } catch (error) {
        console.error('响应数据解密失败:', error)
        throw new Error('响应数据解密失败: ' + (error as Error).message)
      }
    }

    // 二进制数据则直接返回
    if (
      response.request.responseType === 'blob' ||
      response.request.responseType === 'arraybuffer'
    ) {
      if (response.data.type !== 'application/json') {
        return response.data
      }
      data = await new Response(response.data).json()
    }
    
    const code = data.code ?? result_code
    const msg = data.msg || errorCode[code] || errorCode['default']
    
    if (ignoreMsgs.indexOf(msg) !== -1) {
      return Promise.reject(msg)
    } 
    
    // 🔥 处理 401 未认证
    else if (code === 401) {
      const isGraph = isGraphRequest(config.url)
      
      if (isGraph) {
        // Graph 模块：清除所有 token 并跳转到主系统登录页
        clearGraphToken()
        if (!window.location.href.includes('/login')) {
          window.location.href = '/login'
        }
        return Promise.reject(new Error(msg || '登录超时，请重新登录'))
      } else {
        // 主系统：使用刷新令牌逻辑
        if (!isRefreshToken) {
          isRefreshToken = true
          if (!getRefreshToken()) {
            return handleAuthorized()
          }
          try {
            const refreshTokenRes = await refreshToken()
            setToken((await refreshTokenRes).data.data)
            config.headers!.Authorization = 'Bearer ' + getAccessToken()
            requestList.forEach((cb: any) => {
              cb()
            })
            requestList = []
            if ((config!.headers || {}).isEncrypt) {
              (config!.headers || {}).isEncrypted = true
            }
            return service(config)
          } catch (e) {
            requestList.forEach((cb: any) => {
              cb()
            })
            return handleAuthorized()
          } finally {
            requestList = []
            isRefreshToken = false
          }
        } else {
          return new Promise((resolve) => {
            requestList.push(() => {
              config.headers!.Authorization = 'Bearer ' + getAccessToken()
              resolve(service(config))
            })
          })
        }
      }
    } 
    else if (code === 500) {
      ElMessage.error('服务器错误，请稍后重试')
      return Promise.reject(new Error(msg))
    } 
    else if (code === 901) {
      ElMessage.error({
        offset: 300,
        dangerouslyUseHTMLString: true,
        message:
          '<div>功能未开启或配置错误</div>' +
          '<div> &nbsp; </div>' +
          '<div>参考 https://doc.iocoder.cn/ 教程</div>' +
          '<div> &nbsp; </div>' +
          '<div>5 分钟搭建本地环境</div>'
      })
      return Promise.reject(new Error(msg))
    } 
    else if (code !== 0 && code !== 200) {
      if (msg === '无效的刷新令牌') {
        console.log(msg)
        return handleAuthorized()
      } else {
        ElNotification.error({ title: msg })
      }
      return Promise.reject('error')
    } 
    else {
      return data
    }
  },
  (error: AxiosError) => {
    console.log('err' + error)
    let { message } = error
    if (message === 'Network Error') {
      message = '网络连接错误，请检查网络后重试'
    } else if (message.includes('timeout')) {
      message = '请求超时，请稍后重试'
    } else if (message.includes('Request failed with status code')) {
      message = '请求失败：' + message.substr(message.length - 3)
    }
    
    // 如果是 Graph 模块的请求错误，且是 401，跳转到主系统登录页
    const isGraph = isGraphRequest(error.config?.url)
    if (error.response?.status === 401 && isGraph) {
      clearGraphToken()
      if (!window.location.href.includes('/login')) {
        window.location.href = '/login'
      }
    } else {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

const refreshToken = async () => {
  axios.defaults.headers.common['tenant-id'] = getTenantId()
  return await axios.post(base_url + '/system/auth/refresh-token?refreshToken=' + getRefreshToken())
}

const handleAuthorized = () => {
  if (!isRelogin.show) {
    if (window.location.href.includes('login')) {
      return
    }
    isRelogin.show = true
    ElMessageBox.confirm('登录已过期，请重新登录', '提示', {
      showCancelButton: false,
      closeOnClickModal: false,
      showClose: false,
      closeOnPressEscape: false,
      confirmButtonText: '重新登录',
      type: 'warning'
    }).then(() => {
      resetRouter()
      deleteUserCache()
      removeToken()
      isRelogin.show = false
      window.location.href = window.location.href
    })
  }
  return Promise.reject('登录已过期')
}

export { service }