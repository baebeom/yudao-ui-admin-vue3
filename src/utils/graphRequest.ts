import axios from 'axios'

const graphRequest = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || '/admin-api',
  timeout: 30000
})

// 解析 Token 的辅助函数
const parseAccessToken = () => {
  try {
    const tokenStr = localStorage.getItem('ACCESS_TOKEN')
    if (!tokenStr) return ''

    console.log('🔧 [graphRequest] 原始 Token:', tokenStr)

    // 解析 JSON
    const tokenObj = JSON.parse(tokenStr)
    if (tokenObj && tokenObj.v) {
      // 提取 v 字段并清理所有引号和反斜杠
      const cleanToken = tokenObj.v.replace(/["\\]/g, '')
      console.log('🔧 [graphRequest] 解析后 Token:', cleanToken)
      return cleanToken
    }
    return ''
  } catch (e) {
    console.error('🔧 [graphRequest] Token 解析失败:', e)
    return ''
  }
}

// 请求拦截器
graphRequest.interceptors.request.use(
  (config) => {
    const token = parseAccessToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    config.headers['tenant-id'] = '1'
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
graphRequest.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)

export default graphRequest