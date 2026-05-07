import axios from 'axios'

const graphRequest = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || '/admin-api',
  timeout: 30000
})

// 请求拦截器
graphRequest.interceptors.request.use(
  (config) => {
    // 若依 / 芋道 框架：只需要 token 头！！！
    const token = localStorage.getItem('ACCESS_TOKEN')
    if (token) {
      config.headers['token'] = token.replace(/"/g, '') // 关键！！！
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