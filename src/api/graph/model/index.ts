import request from '@/config/axios'

// 模型 VO - 根据后端数据结构定义
export interface ModelVO {
  id: number // 模型编号
  name: string // 模型名称
  type: string // 模型类型：CHAT-聊天模型、EMBEDDING-向量模型等
  status: number // 状态：0-禁用 1-启用
  description?: string // 模型描述
  maxTokens?: number // 最大 Token 数
  temperature?: number // 默认温度参数
  creator?: string // 创建人
  createTime?: Date | string // 创建时间
  updater?: string // 更新人
  updateTime?: Date | string // 更新时间
  deleted?: boolean // 是否删除
  tenantId?: number // 租户编号
}

// 模型 API
export const ModelApi = {
  // 获得模型简单列表（用于下拉选择）
  getModelSimpleList: async (type?: string) => {
    return await request.get({
      url: '/graph/model/simple-list',
      params: { type }
    })
  },

  // 获得模型分页
  getModelPage: async (params: {
    pageNum?: number
    pageSize?: number
    name?: string
    type?: string
    status?: number
  }) => {
    return await request.get({
      url: '/graph/model/page',
      params
    })
  },

  // 获得模型详情
  getModel: async (id: number) => {
    return await request.get({
      url: `/graph/model/get?id=${id}`
    })
  },

  // 创建模型
  createModel: async (data: Partial<ModelVO>) => {
    return await request.post({
      url: '/graph/model/create',
      data
    })
  },

  // 更新模型
  updateModel: async (data: ModelVO) => {
    return await request.put({
      url: '/graph/model/update',
      data
    })
  },

  // 删除模型
  deleteModel: async (id: number) => {
    return await request.delete({
      url: `/graph/model/delete?id=${id}`
    })
  },

  // 更新模型状态
  updateModelStatus: async (id: number, status: number) => {
    return await request.put({
      url: '/graph/model/update-status',
      data: { id, status }
    })
  }
}