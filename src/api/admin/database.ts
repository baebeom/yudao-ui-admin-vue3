import request from '@/config/axios'

// 数据库连接配置参数
export interface DatabaseConfig {
  dbType: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle'
  host: string
  port: number
  database: string
  username: string
  password: string
}

// 导入表参数
export interface ImportTableParams extends DatabaseConfig {
  tableName: string
}

// 导入结果响应
export interface ImportResultResp {
  tableName: string
  recordCount: number
  success: boolean
  message?: string
}

// 测试数据库连接
export const testConnection = (data: DatabaseConfig): Promise<boolean> => {
  return request.post({
    url: '/graph/database/test-connection',
    data
  })
}

// 获取数据库表列表
export const getTableList = (params: DatabaseConfig): Promise<string[]> => {
  return request.get({
    url: '/graph/database/tables',
    params
  })
}

// 导入单个表
export const importTable = (data: ImportTableParams): Promise<ImportResultResp> => {
  return request.post({
    url: '/graph/database/import',
    data,
    timeout: 60000
  })
}

// 批量导入表
export const importTables = (data: DatabaseConfig & { tableNames: string[] }): Promise<ImportResultResp[]> => {
  return request.post({
    url: '/graph/database/import-batch',
    data,
    timeout: 300000
  })
}