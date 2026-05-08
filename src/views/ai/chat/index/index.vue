<template>
  <el-container class="absolute flex-1 top-0 left-0 h-full w-full">
    <!-- 左侧：对话列表 -->
    <ConversationList
      :active-id="activeConversationId?.toString() || ''"
      ref="conversationListRef"
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
          <el-button type="primary" bg plain size="small" @click="openChatConversationUpdateForm">
            <span v-html="(activeConversation as any)?.modelName || '默认模型'"></span>
            <Icon icon="ep:setting" class="ml-10px" />
          </el-button>
          <el-button size="small" class="p-10px" @click="handlerMessageClear">
            <Icon
              icon="heroicons-outline:archive-box-x-mark"
              color="var(--el-text-color-placeholder)"
            />
          </el-button>
          <el-button size="small" class="p-10px">
            <Icon icon="ep:download" color="var(--el-text-color-placeholder)" />
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
            <!-- 情况一：消息加载中 -->
            <MessageLoading v-if="activeMessageListLoading" />
            <!-- 情况二：无聊天对话时 -->
            <MessageNewConversation
              v-if="!activeConversation"
              @on-new-conversation="handleConversationCreate"
            />
            <!-- 情况三：消息列表为空 -->
            <MessageListEmpty
              v-if="!activeMessageListLoading && messageList.length === 0 && activeConversation"
              @on-prompt="doSendMessage"
            />
            <!-- 情况四：消息列表不为空 -->
            <MessageList
              v-if="!activeMessageListLoading && messageList.length > 0 && activeConversation"
              ref="messageRef"
              :conversation="activeConversation"
              :list="messageList"
              @on-delete-success="handleMessageDelete"
              @on-edit="handleMessageEdit"
              @on-refresh="handleMessageRefresh"
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
              <MessageFileUpload v-model="uploadFiles" :limit="5" :max-size="10" class="mr-10px" />
              <el-switch v-model="enableContext" />
              <span class="ml-5px mr-15px text-14px text-#8f8f8f">上下文</span>
              <el-switch v-model="enableWebSearch" />
              <span class="ml-5px text-14px text-#8f8f8f">联网搜索</span>
            </div>
            <el-button
              type="primary"
              size="default"
              @click="handleSendByButton"
              :loading="conversationInProgress"
              v-if="conversationInProgress == false"
            >
              {{ conversationInProgress ? '进行中' : '发送' }}
            </el-button>
            <el-button
              type="danger"
              size="default"
              @click="stopStream()"
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
import { ChatConversationApi, ChatConversationVO } from '@/api/graph/chat/conversation'
import ConversationList from './components/conversation/ConversationList.vue'
import ConversationUpdateForm from './components/conversation/ConversationUpdateForm.vue'
import MessageList from './components/message/MessageList.vue'
import MessageListEmpty from './components/message/MessageListEmpty.vue'
import MessageLoading from './components/message/MessageLoading.vue'
import MessageNewConversation from './components/message/MessageNewConversation.vue'
import MessageFileUpload from './components/message/MessageFileUpload.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

/** Graph 知识图谱聊天对话 列表 */
defineOptions({ name: 'GraphChat' })

const route = useRoute() // 路由

// 聊天对话
const conversationListRef = ref()
const activeConversationId = ref<number | null>(null)
const activeConversation = ref<ChatConversationVO | null>(null)
const conversationInProgress = ref(false)

// 消息列表
const messageRef = ref()
const activeMessageList = ref<ChatMessageVO[]>([])
const activeMessageListLoading = ref<boolean>(false)
const activeMessageListLoadingTimer = ref<any>()

// 打字机效果
const textSpeed = ref<number>(50)
const textRoleRunning = ref<boolean>(false)
const receiveMessageFullText = ref('')
const receiveMessageDisplayedText = ref('')

// 发送消息输入框
const isComposing = ref(false)
const conversationInAbortController = ref<any>()
const inputTimeout = ref<any>()
const prompt = ref<string>()
const enableContext = ref<boolean>(true)
const enableWebSearch = ref<boolean>(false)
const uploadFiles = ref<string[]>([])

// =========== 【聊天对话】相关 ===========

/** 获取对话信息 */
const getConversation = async (id: number | null) => {
  if (!id || typeof id !== 'number') return
  try {
    const res = await ChatConversationApi.getChatConversationMy(id)
    const resData = res as any
    let conversation: any = null
    if (resData && resData.code === 0 && resData.data) {
      conversation = resData.data
    } else if (resData && resData.id) {
      conversation = resData
    }
    if (!conversation) return
    activeConversation.value = conversation
    activeConversationId.value = conversation.id
  } catch (error) {
    console.error('获取对话信息失败:', error)
  }
}

/** 点击某个对话 */
const handleConversationClick = async (conversation: ChatConversationVO) => {
  if (conversationInProgress.value) {
    ElMessage.warning('回答中，不允许切换!')
    return false
  }
  if (activeConversationId.value === conversation.id) {
    return true
  }
  activeConversationId.value = conversation.id
  activeConversation.value = conversation
  activeMessageList.value = []
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
    await handleConversationClear()
  }
}

/** 清空选中的对话 */
const handleConversationClear = async () => {
  if (conversationInProgress.value) {
    ElMessage.warning('对话中，不允许切换!')
    return false
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
  await conversationListRef.value.createConversation()
}

const handleConversationCreateSuccess = async () => {
  prompt.value = ''
  uploadFiles.value = []
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
    const messages = (res as any).data || []
    
    // 转换 graph 字段为 relationList
    const convertedMessages = messages.map((msg: any) => {
      if (msg.graph && !msg.relationList) {
        try {
          msg.relationList = JSON.parse(msg.graph)
        } catch (e) {
          msg.relationList = []
        }
      }
      return msg
    })
    
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

const handleMessageDelete = () => {
  if (conversationInProgress.value) {
    ElMessage.warning('回答中，不能删除!')
    return
  }
  getMessageList()
}

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
    ElMessage.success('清空成功')
  } catch {}
}

const handleGoTopMessage = () => {
  messageRef.value?.handlerGoTop()
}

// =========== 【发送消息】相关 ===========

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

const handleSendByButton = () => {
  doSendMessage(prompt.value?.trim() as string)
}

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

const doSendMessage = async (content: string) => {
  if (content.length < 1) {
    ElMessage.error('发送失败，原因：内容为空！')
    return
  }
  if (activeConversationId.value == null) {
    ElMessage.error('还没创建对话，不能发送!')
    return
  }
  const attachmentUrls = [...uploadFiles.value]
  prompt.value = ''
  uploadFiles.value = []
  
  await doSendMessageStream({
    id: 0,
    conversationId: activeConversationId.value,
    content: content,
    type: 'user',
    userId: 0,
    useContext: enableContext.value,
    attachmentUrls: attachmentUrls,
    createTime: new Date()
  } as ChatMessageVO)
}

const doSendMessageStream = async (userMessage: ChatMessageVO) => {
  conversationInAbortController.value = new AbortController()
  conversationInProgress.value = true
  receiveMessageFullText.value = ''
  let timer: any = null

  try {
    // 1. 先添加假数据占位
    activeMessageList.value.push({
      ...userMessage,
      id: -1,
      createTime: new Date()
    } as ChatMessageVO)
    
    const aiPlaceholderMsg = {
      id: -2,
      conversationId: activeConversationId.value,
      type: 'system' as const,
      content: '思考中...',
      userId: 0,
      useContext: false,
      createTime: new Date(),
      relationList: []
    } as ChatMessageVO
    activeMessageList.value.push(aiPlaceholderMsg)
    
    await nextTick()
    await scrollToBottom()
    textRoll()

    // 2. 发送流式请求 (Graph 版本 - 直接处理文本片段)
    let isFirstChunk = true
    await ChatMessageApi.sendChatMessageStream(
      userMessage.conversationId,
      userMessage.content,
      conversationInAbortController.value,
      enableContext.value,
      enableWebSearch.value,
      async (event: any) => {
        console.log('【流式消息】收到片段:', event.data)
        
        // 过滤掉结束标记
        if (event.data === '[DONE]') return

        // 首次返回：替换假数据
        if (isFirstChunk) {
          isFirstChunk = false
          activeMessageList.value.pop() // 移除思考中
          activeMessageList.value.pop() // 移除用户假数据
          
          // 重新添加真实数据
          activeMessageList.value.push({
            ...userMessage,
            id: Date.now(),
            createTime: new Date()
          })
          
          activeMessageList.value.push({
            id: Date.now() + 1,
            conversationId: activeConversationId.value,
            type: 'system',
            content: '',
            userId: 0,
            useContext: false,
            createTime: new Date(),
            relationList: []
          })
        }

        // 累加内容
        if (event.data) {
          receiveMessageFullText.value += event.data
        }
        
        await scrollToBottom()
      },
      (error: any) => {
        console.error('【流式消息】错误:', error)
        ElMessage.error('消息发送失败：' + (error.message || '未知错误'))
        stopStream()
        throw error
      },
      async () => {
        console.log('【流式消息】接收完成')
        stopStream()
        // 结束后重新加载列表，确保数据持久化
        await getMessageList()
      },
      userMessage.attachmentUrls
    )
  } catch (err: any) {
    console.error('【发送消息】完整错误:', err)
    if (err.name !== 'AbortError') {
      ElMessage.error('请求失败: ' + (err.message || '网络错误'))
    }
    // 清理假数据
    activeMessageList.value = activeMessageList.value.filter(item => item.id !== -1 && item.id !== -2)
  } finally {
    conversationInProgress.value = false
    conversationInAbortController.value = null
    if (timer) clearTimeout(timer)
  }
}

const stopStream = async () => {
  if (conversationInAbortController.value) {
    conversationInAbortController.value.abort()
  }
  conversationInProgress.value = false
  textRoleRunning.value = false
}

const handleMessageEdit = (message: ChatMessageVO) => {
  prompt.value = message.content
}

const handleMessageRefresh = (message: ChatMessageVO) => {
  doSendMessage(message.content)
}

// ============== 【消息滚动】相关 =============

const scrollToBottom = async (isIgnore?: boolean) => {
  await nextTick()
  if (messageRef.value) {
    messageRef.value.scrollToBottom(isIgnore)
  }
}

const textRoll = async () => {
  let index = 0
  let timer: any = null
  try {
    if (textRoleRunning.value) {
      return
    }
    textRoleRunning.value = true
    receiveMessageDisplayedText.value = ''
    
    const task = async () => {
      const diff = (receiveMessageFullText.value.length - receiveMessageDisplayedText.value.length) / 10
      if (diff > 5) {
        textSpeed.value = 10
      } else if (diff > 2) {
        textSpeed.value = 30
      } else if (diff > 1.5) {
        textSpeed.value = 50
      } else {
        textSpeed.value = 100
      }
      
      if (!conversationInProgress.value) {
        textSpeed.value = 10
      }

      if (index < receiveMessageFullText.value.length) {
        receiveMessageDisplayedText.value += receiveMessageFullText.value[index]
        index++

        // 更新最后一条消息的内容
        if (activeMessageList.value.length > 0) {
          const lastMessage = activeMessageList.value[activeMessageList.value.length - 1]
          if (lastMessage && (lastMessage.type === 'system' || lastMessage.type === 'assistant')) {
            lastMessage.content = receiveMessageDisplayedText.value
          }
        }
        
        await scrollToBottom()
        timer = setTimeout(task, textSpeed.value)
      } else {
        if (!conversationInProgress.value) {
          textRoleRunning.value = false
          clearTimeout(timer)
        } else {
          timer = setTimeout(task, textSpeed.value)
        }
      }
    }
    timer = setTimeout(task, textSpeed.value)
  } catch (error) {
    console.error('打字机效果异常:', error)
    textRoleRunning.value = false
    if (timer) clearTimeout(timer)
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

defineExpose({ scrollToBottom, handlerGoTop })
</script>