import request from '@/config/axios'
import { fetchEventSource, EventSourceMessage } from '@microsoft/fetch-event-source'
import { getAccessToken } from '@/utils/auth'
import { config } from '@/config/axios/config'

// graph 聊天消息 VO
export interface ChatMessageVO {
  id: number
  conversationId: number
  userId: number
  type: 'user' | 'system'
  content: string
  useContext: boolean
  parsedEntity?: string
  parsedRelation?: string
  cypherQuery?: string
  kgAnswer?: string
  responseTimeMs?: number
  graph?: string
  createTime?: Date | string
  updateTime?: Date | string
  attachmentUrls?: string[]
  reasoningContent?: string
  segments?: any[]
  webSearchPages?: any[]
  relationList?: Array<{
    entity1: string
    entity2: string
    rel: string
  }>
}

// 流式发送消息的参数接口
export interface SendChatMessageStreamParams {
  conversationId: number
  content: string
  ctrl: AbortController
  enableContext: boolean
  enableWebSearch: boolean
  onMessage: (event: EventSourceMessage) => void
  onError: (err: any) => void
  onClose: () => void
  attachmentUrls?: string[]
}

// 知识图谱 Graph Chat 聊天
export const ChatMessageApi = {
  // 获取指定对话的消息列表 - 使用原生 fetch 确保认证正确
  getChatMessageListByConversationId: async (conversationId: number | null) => {
    const token = getAccessToken()
    const response = await fetch(`${config.base_url}/graph/chat/message/list-by-conversation-id?conversationId=${conversationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    })
    const result = await response.json()
    console.log('【getChatMessageListByConversationId】返回结果:', result)
    return result
  },

  // 发送 Stream 消息 (知识图谱) - 对象参数版本
  sendChatMessageStream: async (params: SendChatMessageStreamParams) => {
    const token = getAccessToken()
    
    // 参数校验
    if (!params.ctrl) {
      console.error('参数错误: ctrl 不能为空', params)
      throw new Error('AbortController 不能为空')
    }
    
    if (!params.ctrl.signal) {
      console.error('参数错误: ctrl.signal 不存在', params.ctrl)
      throw new Error('AbortController.signal 不存在')
    }
    
    console.log('【sendChatMessageStream】调用参数:', {
      conversationId: params.conversationId,
      content: params.content,
      enableContext: params.enableContext,
      enableWebSearch: params.enableWebSearch,
      attachmentUrls: params.attachmentUrls,
      hasSignal: !!params.ctrl.signal
    })
    
    return fetchEventSource(`${config.base_url}/graph/chat/message/send-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      openWhenHidden: true,
      body: JSON.stringify({
        conversationId: params.conversationId,
        content: params.content,
        useContext: params.enableContext,
        useSearch: params.enableWebSearch,
        attachmentUrls: params.attachmentUrls || []
      }),
      onmessage: (event: EventSourceMessage) => {
        console.log('【fetchEventSource】收到原始消息:', event)
        if (params.onMessage) {
          params.onMessage(event)
        }
      },
      onerror: (err: any) => {
        console.error('【fetchEventSource】连接错误:', err)
        if (params.onError) {
          params.onError(err)
        }
        return 3000
      },
      onclose: () => {
        console.log('【fetchEventSource】连接关闭')
        if (params.onClose) {
          params.onClose()
        }
      },
      signal: params.ctrl.signal
    })
  },

  // 删除单条消息
  deleteChatMessage: async (id: number) => {
    return await request.delete({ url: `/graph/chat/message/delete?id=${id}` })
  },

  // 删除指定对话的所有消息
  deleteByConversationId: async (conversationId: number) => {
    return await request.delete({
      url: `/graph/chat/message/delete-by-conversation-id?conversationId=${conversationId}`
    })
  },

  // 获得消息分页 (管理后台)
  getChatMessagePage: async (params: any) => {
    return await request.get({ url: '/graph/chat/message/page', params })
  },

  // 管理员删除消息
  deleteChatMessageByAdmin: async (id: number) => {
    return await request.delete({ url: `/graph/chat/message/delete-by-admin?id=${id}` })
  }
}