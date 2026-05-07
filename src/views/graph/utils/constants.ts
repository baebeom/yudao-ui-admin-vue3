// src/views/graph/utils/constants.ts

// AI 模型类型枚举
export const AiModelTypeEnum = {
  CHAT: 'CHAT',           // 聊天模型
  EMBEDDING: 'EMBEDDING'  // 向量模型
} as const

export type AiModelTypeEnum = typeof AiModelTypeEnum[keyof typeof AiModelTypeEnum]

// 模型状态枚举
export const ModelStatusEnum = {
  DISABLED: 0,  // 禁用
  ENABLED: 1    // 启用
} as const

// 消息类型
export const MessageTypeEnum = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
} as const