<template>
  <el-container class="absolute flex-1 top-0 left-0 h-full w-full">
    <!-- 左侧：对话列表 -->
    <ConversationList
      ref="conversationListRef"
      :active-id="activeConversationId?.toString() || ''"
      @on-conversation-create="handleConversationCreateSuccess"
      @on-conversation-click="handleConversationClick"
      @on-conversation-clear="handleConversationClear"
      @on-conversation-delete="handlerConversationDelete"
    />
    <!-- 右侧：对话详情 -->
    <el-container class="bg-[var(--el-bg-color)]">
      <el-header
        class="flex flex-row items-center justify-between bg-[var(--el-bg-color-page)] shadow-[0_0_0_0_var(--el-border-color-light)]"
      >
        <div class="text-18px font-bold">
          {{ activeConversation?.title ? activeConversation?.title : '对话' }}
          <span v-if="activeMessageList.length">({{ activeMessageList.length }})</span>
        </div>
        <div class="flex w-300px flex-row justify-end" v-if="activeConversation">
          <el-button size="small" class="p-10px" @click="handlerMessageClear">
            <Icon
              icon="heroicons-outline:archive-box-x-mark"
              color="var(--el-text-color-placeholder)"
            />
          </el-button>
          <el-button size="small" class="p-10px" @click="handleGoTopMessage">
            <Icon icon="ep:top" color="var(--el-text-color-placeholder)" />
          </el-button>
        </div>
      </el-header>

      <!-- main：消息列表 -->
      <el-main class="m-0 p-0 relative h-full w-full">
        <div>
          <div class="absolute top-0 bottom-0 left-0 right-0 overflow-y-hidden p-0 m-0">
            <MessageLoading v-if="activeMessageListLoading" />
            <MessageNewConversation
              v-if="!activeConversation"
              @on-new-conversation="handleConversationCreate"
            />
            <MessageListEmpty
              v-if="!activeMessageListLoading && messageList.length === 0 && activeConversation"
              @on-prompt="doSendMessage"
            />
            <MessageList
              v-if="!activeMessageListLoading && messageList.length > 0 && activeConversation"
              ref="messageRef"
              :conversation="activeConversation"
              :list="messageList"
              @on-delete-success="handleMessageDelete"
              @on-edit="handleMessageEdit"
            />
          </div>
        </div>
      </el-main>

      <!-- 底部 -->
      <el-footer class="flex flex-col !h-auto !p-0">
        <form
          class="mt-10px mx-20px mb-20px py-9px px-10px flex flex-col h-auto rounded-10px"
          style="border: 1px solid var(--el-border-color)"
        >
          <textarea
            class="h-80px border-none box-border resize-none py-0 px-2px overflow-auto focus:outline-none"
            v-model="prompt"
            @keydown="handleSendByKeydown"
            @input="handlePromptInput"
            @compositionstart="onCompositionstart"
            @compositionend="onCompositionend"
            placeholder="问我任何问题...（Shift+Enter 换行，按下 Enter 发送）"
          >
          </textarea>
          <div class="flex justify-between pb-0 pt-5px">
            <div class="flex items-center">
              <el-switch v-model="enableContext" />
              <span class="ml-5px mr-15px text-14px text-#8f8f8f">上下文</span>
            </div>
            <el-button
              type="primary"
              size="default"
              @click="handleSendByButton"
              :loading="conversationInProgress"
              v-if="conversationInProgress == false"
            >
              发送
            </el-button>
            <el-button
              type="danger"
              size="default"
              @click="stopGeneration"
              v-if="conversationInProgress == true"
            >
              停止
            </el-button>
          </div>
        </form>
      </el-footer>
    </el-container>

    <!-- 更新对话 Form -->
    <ConversationUpdateForm
      ref="conversationUpdateFormRef"
      @success="handleConversationUpdateSuccess"
    />
  </el-container>
</template>

<script setup lang="ts">
import { ChatMessageApi, ChatMessageVO } from '@/api/graph/chat/message'
import { ChatConversationVO } from '@/api/graph/chat/conversation'
import ConversationList from './components/conversation/ConversationList.vue'
import ConversationUpdateForm from './components/conversation/ConversationUpdateForm.vue'
import MessageList from './components/message/MessageList.vue'
import MessageListEmpty from './components/message/MessageListEmpty.vue'
import MessageLoading from './components/message/MessageLoading.vue'
import MessageNewConversation from './components/message/MessageNewConversation.vue'
import MessageFileUpload from './components/message/MessageFileUpload.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EventSourceMessage } from '@microsoft/fetch-event-source' 
import service from '@/config/axios'

/** AI 聊天对话 列表 */
defineOptions({ name: 'AiChat' })

const route = useRoute()

const conversationListRef = ref()

// 聊天对话
const activeConversationId = ref<number | null>(null)
const activeConversation = ref<ChatConversationVO | null>(null)
const conversationInProgress = ref(false)
const abortController = ref<AbortController | null>(null)

// 消息列表
const messageRef = ref()
const activeMessageList = ref<ChatMessageVO[]>([])
const activeMessageListLoading = ref<boolean>(false)
const activeMessageListLoadingTimer = ref<any>()

// 发送消息输入框
const isComposing = ref(false)
const inputTimeout = ref<any>()
const prompt = ref<string>()
const enableContext = ref<boolean>(true)
const enableWebSearch = ref<boolean>(false)
const uploadFiles = ref<string[]>([])

// =========== 本地缓存函数 ===========
/** 保存对话消息到 localStorage */
const saveConversationMessages = (conversationId: number, messages: ChatMessageVO[]) => {
  if (!conversationId) return
  const key = `chat_messages_${conversationId}`
  localStorage.setItem(key, JSON.stringify(messages))
}

/** 删除对话的缓存 */
const removeConversationMessages = (conversationId: number) => {
  if (!conversationId) return
  const key = `chat_messages_${conversationId}`
  localStorage.removeItem(key)
}

// =========== 【聊天对话】相关 ===========

/** 获取对话信息 */
/** 获取对话信息 */
const getConversation = async (id: number | null) => {
  if (!id || typeof id !== 'number') return
  try {
    console.log("获取对话详情，ID:", id)
    // 改用 service.get，与 ConversationList 保持一致
    const res = await service.get({
      url: `/graph/chat/conversation/get-my?id=${id}`
    })
    console.log("获取对话详情返回:", res)
  
    const resData = res as any
    
    let conversation: any = null
    if (resData && resData.code === 0 && resData.data) {
      conversation = resData.data
    } else if (resData && resData.id) {
      conversation = resData
    }

    if (!conversation) {
      console.warn("未获取到对话详情")
      return
    }
    
    activeConversation.value = conversation
    activeConversationId.value = conversation.id
  } catch (error) {
    console.error('获取对话信息失败:', error)
  }
}

/**
 * 点击某个对话
 */
const handleConversationClick = async (conversation: ChatConversationVO) => {
  if (conversationInProgress.value) {
    ElMessage.warning('回答中，不允许切换!')
    return false
  }

  if (activeConversationId.value === conversation.id) {
    return true
  }

  // 保存当前对话的消息到缓存（切换前保存）
  if (activeConversationId.value !== null && activeMessageList.value.length > 0) {
    saveConversationMessages(activeConversationId.value, activeMessageList.value)
  }

  activeConversationId.value = conversation.id
  activeConversation.value = conversation
  
  // 清空当前消息列表
  activeMessageList.value = []
  
  // 重新加载新对话的消息列表
  await getMessageList()
  
  await nextTick()
  scrollToBottom(true)
  
  prompt.value = ''
  uploadFiles.value = []
  
  return true
}

/** 删除某个对话*/
const handlerConversationDelete = async (delConversation: ChatConversationVO) => {
  if (activeConversationId.value === delConversation.id) {
    // 删除缓存
    removeConversationMessages(delConversation.id)
    await handleConversationClear()
  }
}

/** 清空选中的对话 */
const handleConversationClear = async () => {
  if (conversationInProgress.value) {
    ElMessage.warning('对话中，不允许切换!')
    return false
  }
  // 清除当前对话的缓存
  if (activeConversationId.value !== null) {
    removeConversationMessages(activeConversationId.value)
  }
  activeConversationId.value = null
  activeConversation.value = null
  activeMessageList.value = []
}

/** 修改聊天对话 */
const conversationUpdateFormRef = ref()
const openChatConversationUpdateForm = async () => {
  conversationUpdateFormRef.value.open(activeConversationId.value)
}
const handleConversationUpdateSuccess = async () => {
  await getConversation(activeConversationId.value)
}

const handleConversationCreate = async () => {
  console.log("新建对话按钮被点击了！")
  
  try {
    console.log("开始发送请求...")
    const res = await service.post({
      url: '/graph/chat/conversation/create-my',
      data: { title: '新对话' }
    })
    console.log("创建对话 API 完整返回:", res)

    let newConversationId: number | null = null
    if (typeof res === 'number') {
      newConversationId = res
    } else if (res?.data && typeof res.data === 'number') {
      newConversationId = res.data
    } else if (res?.id && typeof res.id === 'number') {
      newConversationId = res.id
    }

    if (!newConversationId) {
      ElMessage.error('创建对话失败：无法获取对话ID')
      return
    }

    console.log("新对话 ID:", newConversationId)
    
    // 获取对话详情
    const conversationRes = await service.get({
      url: `/graph/chat/conversation/get-my?id=${newConversationId}`
    })
    
    let conversation = conversationRes?.data || conversationRes
    if (conversation?.code === 0 && conversation?.data) {
      conversation = conversation.data
    }
    
    if (conversation?.id) {
      activeConversation.value = conversation
      activeConversationId.value = conversation.id
    } else {
      activeConversationId.value = newConversationId
      await getConversation(newConversationId)
    }
    
    // 刷新左侧对话列表
    await conversationListRef.value?.getChatConversationList()
    
    // 清空输入框和文件
    prompt.value = ''
    uploadFiles.value = []
    
    // 重新加载消息列表
    await getMessageList()
    
    ElMessage.success("创建对话成功")
  } catch (error: any) {
    console.error("创建对话完整错误:", error)
    ElMessage.error(`创建失败：${error.message || '网络错误'}`)
  }
}

const handleConversationCreateSuccess = async (newConversation?: ChatConversationVO) => {
  prompt.value = ''
  uploadFiles.value = []
  
  // 如果有新创建的对话，自动切换到该对话
  if (newConversation) {
    await handleConversationClick(newConversation)
  }
}

// =========== 【消息列表】相关 ===========

const getMessageList = async () => {
  try {
    if (activeConversationId.value === null) {
      activeMessageList.value = []
      return
    }
    
    activeMessageListLoadingTimer.value = setTimeout(() => {
      activeMessageListLoading.value = true
    }, 60)

    const res = await ChatMessageApi.getChatMessageListByConversationId(
      activeConversationId.value
    )
    
    console.log('【getMessageList】API返回:', res)
    
    // 兼容不同的返回格式
    let messages: any[] = []
    if (res?.data && Array.isArray(res.data)) {
      messages = res.data
    } else if (res?.list && Array.isArray(res.list)) {
      messages = res.list
    } else if (res?.records && Array.isArray(res.records)) {
      messages = res.records
    } else if (Array.isArray(res)) {
      messages = res
    }

    console.log('解析后的消息数量:', messages.length)
    
    console.log('解析后的消息数量:', messages.length)
    
    // 转换后端返回的消息，将 graph 字段解析为 relationList
    const convertedMessages = messages.map((msg: any) => {
      console.log(`消息 ${msg.id} (${msg.type}) - graph字段:`, msg.graph)
      
      // 如果有 graph 字段，解析为 relationList
      if (msg.graph) {
        try {
          let graphData = msg.graph
          if (typeof graphData === 'string') {
            graphData = JSON.parse(graphData)
          }
          
          console.log(`消息 ${msg.id} - 解析后的graph:`, graphData)
          
          // 根据实际数据结构转换 relationList
          if (graphData && Array.isArray(graphData)) {
            msg.relationList = graphData.map((item: any) => ({
              entity1: item.entity1 || '查询实体',
              entity2: item.entity2 || item.target || '未知',
              rel: item.rel || item.relation || '关联'
            }))
          } else if (graphData && graphData.entityRelation) {
            const relations = graphData.entityRelation
            if (Array.isArray(relations) && relations.length > 0) {
              const firstRelation = relations[0]
              if (Array.isArray(firstRelation)) {
                msg.relationList = firstRelation.map((item: any) => ({
                  entity1: item.entity1 || '查询实体',
                  entity2: item.entity2?.title || item.entity2,
                  rel: item.rel?.type || item.rel
                }))
              }
            }
          }
          
          console.log(`消息 ${msg.id} 解析成功，关系数量:`, msg.relationList?.length)
        } catch (e) {
          console.error(`消息 ${msg.id} 解析 graph 失败:`, e)
          msg.relationList = []
        }
      } else {
        msg.relationList = msg.relationList || []
      }
      
      return msg
    })
    
    console.log('转换后的消息列表:', convertedMessages.map(m => ({ 
      id: m.id, 
      type: m.type, 
      relationCount: m.relationList?.length 
    })))
    
    activeMessageList.value = convertedMessages

    await nextTick()
    await scrollToBottom()
  } catch (error) {
    console.error('获取消息列表失败:', error)
    activeMessageList.value = []
  } finally {
    if (activeMessageListLoadingTimer.value) {
      clearTimeout(activeMessageListLoadingTimer.value)
    }
    activeMessageListLoading.value = false
  }
}

/**
 * 消息列表
 */
const messageList = computed(() => {
  if (activeMessageList.value.length > 0) {
    return activeMessageList.value
  }
  if ((activeConversation.value as any)?.systemMessage) {
    return [
      {
        id: 0,
        conversationId: activeConversation.value?.id || 0,
        type: 'system',
        userId: 0,
        content: (activeConversation.value as any).systemMessage,
        useContext: false,
        deleted: false,
        createTime: new Date(),
        attachmentUrls: [],
        reasoningContent: '',
        segments: [],
        webSearchPages: [],
        relationList: []
      } as ChatMessageVO
    ]
  }
  return []
})

/** 处理删除 message 消息 */
const handleMessageDelete = () => {
  if (conversationInProgress.value) {
    ElMessage.warning('回答中，不能删除!')
    return
  }
  getMessageList()
}

/** 处理 message 清空 */
const handlerMessageClear = async () => {
  if (!activeConversationId.value) return
  try {
    await ElMessageBox.confirm('确认清空对话消息？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await ChatMessageApi.deleteByConversationId(activeConversationId.value)
    activeMessageList.value = []
    // 清空缓存
    removeConversationMessages(activeConversationId.value)
    ElMessage.success('清空成功')
  } catch {
    // 用户取消
  }
}

/** 回到 message 列表的顶部 */
const handleGoTopMessage = () => {
  messageRef.value?.handlerGoTop()
}

// =========== 【发送消息】相关 ===========

/** 处理来自 keydown 的发送消息 */
const handleSendByKeydown = async (event: KeyboardEvent) => {
  if (isComposing.value) return
  if (conversationInProgress.value) return
  
  const content = prompt.value?.trim() as string
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      prompt.value += '\r\n'
      event.preventDefault()
    } else {
      await doSendMessage(content)
      event.preventDefault()
    }
  }
}

/** 处理来自【发送】按钮的发送消息 */
const handleSendByButton = () => {
  doSendMessage(prompt.value?.trim() as string)
}

/** 处理 prompt 输入变化 */
const handlePromptInput = (event: InputEvent) => {
  if (!isComposing.value) {
    if ((event as any).data == null) return
    isComposing.value = true
  }
  if (inputTimeout.value) clearTimeout(inputTimeout.value)
  inputTimeout.value = setTimeout(() => {
    isComposing.value = false
  }, 400)
}

const onCompositionstart = () => {
  isComposing.value = true
}
const onCompositionend = () => {
  setTimeout(() => {
    isComposing.value = false
  }, 200)
}

/** 发送消息到后端接口（支持流式实时显示） */
const doSendMessageToBackend = async (question: string, attachmentUrls: string[] = []) => {
  console.log('【发送消息】开始执行，question:', question)
  
  if (!activeConversationId.value) {
    ElMessage.error('请先创建对话')
    return
  }

  // 取消之前的请求（如果有）
  if (abortController.value) {
    abortController.value.abort()
  }
  
  // 创建新的 AbortController
  abortController.value = new AbortController()
  conversationInProgress.value = true
  
  // 清空输入框
  prompt.value = ''
  uploadFiles.value = []

  // 临时ID用于前端显示
  const tempUserId = Date.now()
  const tempAiMessageId = Date.now() + 1

  try {
    // 1. 添加用户消息到列表
    const userMessage: ChatMessageVO = {
      id: tempUserId,
      conversationId: activeConversationId.value,
      userId: 0,
      type: 'user',
      content: question,
      useContext: enableContext.value,
      attachmentUrls: attachmentUrls,
      createTime: new Date(),
      updateTime: new Date(),
      reasoningContent: '',
      segments: [],
      webSearchPages: [],
      relationList: []
    }
    activeMessageList.value.push(userMessage)
    
    // 2. 添加AI消息占位符（空内容，逐步填充）
    const aiMessage: ChatMessageVO = {
      id: tempAiMessageId,
      conversationId: activeConversationId.value,
      userId: 0,
      type: 'system',
      content: '',
      useContext: enableContext.value,
      createTime: new Date(),
      updateTime: new Date(),
      reasoningContent: '',
      segments: [],
      webSearchPages: [],
      relationList: []
    }
    activeMessageList.value.push(aiMessage)
    
    // 滚动到底部
    await nextTick()
    await scrollToBottom()

    // 3. 调用流式接口（对象参数方式）
    console.log('【发送消息】准备调用后端流式接口')
    
    await ChatMessageApi.sendChatMessageStream({
      conversationId: activeConversationId.value,
      content: question,
      ctrl: abortController.value,
      enableContext: enableContext.value,
      enableWebSearch: enableWebSearch.value,
      onMessage: (event: EventSourceMessage) => {
        // 实时更新AI消息内容
        console.log('【流式消息】收到片段:', event.data)
        
        // 找到正在编辑的AI消息
        const lastMsg = activeMessageList.value.find(m => m.id === tempAiMessageId)
        if (lastMsg && lastMsg.type === 'system') {
          // 追加内容
          lastMsg.content += event.data
          // 触发响应式更新
          activeMessageList.value = [...activeMessageList.value]
          // 滚动到底部
          nextTick(() => scrollToBottom())
        }
      },
      onError: (error: any) => {
        console.error('【流式消息】错误:', error)
        
        // 更新错误信息到界面
        const lastMsg = activeMessageList.value.find(m => m.id === tempAiMessageId)
        if (lastMsg && lastMsg.type === 'system') {
          lastMsg.content = `错误: ${error.message || '未知错误，请稍后重试'}`
          activeMessageList.value = [...activeMessageList.value]
        }
        
        ElMessage.error('消息发送失败：' + (error.message || '网络错误'))
      },
      onClose: async () => {
        console.log('【流式消息】接收完成，重新获取消息列表')
        
        // 关键修改：流式完成后，等待1秒后重新从后端获取完整的消息列表
        // 这样就能获取到后端保存的 graph 字段（知识图谱数据）
        setTimeout(async () => {
          console.log('开始重新获取消息列表...')
          await getMessageList()
          console.log('消息列表刷新完成')
          
          // 滚动到底部
          await nextTick()
          await scrollToBottom()
        }, 1000)
      },
      attachmentUrls: attachmentUrls
    })
    
    console.log('【发送消息】流式调用完成')
    
  } catch (err: any) {
    console.error('【发送消息】完整错误:', err)
    
    // 如果不是主动中止的错误，显示错误提示
    if (err.name !== 'AbortError') {
      ElMessage.error('请求失败: ' + (err.message || '网络错误'))
      
      // 更新AI消息为错误状态
      const aiMsg = activeMessageList.value.find(m => m.id === tempAiMessageId)
      if (aiMsg && aiMsg.type === 'system') {
        aiMsg.content = `请求失败: ${err.message || '网络错误，请检查后端服务是否启动'}`
        activeMessageList.value = [...activeMessageList.value]
      }
    }
  } finally {
    conversationInProgress.value = false
    abortController.value = null
  }
}

/** 真正执行【发送】消息操作 */
const doSendMessage = async (content: string) => {
  if (!content || content.trim().length < 1) {
    ElMessage.error('发送失败，原因：内容为空！')
    return
  }
  
  if (activeConversationId.value == null) {
    ElMessage.error('还没创建对话，不能发送!')
    return
  }

  const attachmentUrls = [...uploadFiles.value]
  
  // 调用流式发送
  await doSendMessageToBackend(content.trim(), attachmentUrls)
}

/** 停止生成 */
const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort()
    ElMessage.info('已停止生成')
    conversationInProgress.value = false
  }
}

/** 编辑 message：设置为 prompt，可以再次编辑 */
const handleMessageEdit = (message: ChatMessageVO) => {
  prompt.value = message.content
}

// ============== 【消息滚动】相关 =============

/** 滚动到 message 底部 */
const scrollToBottom = async (isIgnore?: boolean) => {
  await nextTick()
  if (messageRef.value) {
    messageRef.value.scrollToBottom(isIgnore)
  }
}

/** 初始化 **/
onMounted(async () => {
  if (route.query.conversationId) {
    const id = Number(route.query.conversationId)
    if (!isNaN(id)) {
      activeConversationId.value = id
      await getConversation(id)
    }
  }

  activeMessageListLoading.value = true
  await getMessageList()
})

defineExpose({ scrollToBottom })
</script>