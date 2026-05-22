import request from '@/config/axios'

// CSV导入结果响应
export interface CsvImportResp {
  logId: number
  fileName: string
  recordCount: number
  successCount: number
  failCount: number
  success: boolean
  message?: string
}

// CSV导入日志响应
export interface CsvImportLogResp {
  id: number
  fileName: string
  importTime: string
  recordCount: number
  successCount: number
  failCount: number
  errorMsg: string
  creator: string 
  createTime: string
  updateTime: string
}
export const Neo4jCsvAPI = {
  uploadCsv(data: FormData) {
    // 使用 request.post，参数为配置对象
    return request.post({
      url: '/graph/neo4j/csv/upload',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  getImportLogs() {
    return request.get({
      url: '/graph/neo4j/csv/logs'
    })
  }
}