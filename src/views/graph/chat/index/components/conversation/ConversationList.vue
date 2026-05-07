<!--  AI 对话  -->
<template>
  <el-aside
    width="260px"
    class="h-100% relative flex flex-col justify-between px-2.5 pt-2.5 pb-0 overflow-hidden"
  >
    <!-- 左顶部：对话 -->
    <div class="h-100%">
      <el-button class="w-1/1 py-4.5" type="primary" @click="createConversation">
        <Icon icon="ep:plus" class="mr-5px" />
        新建对话
      </el-button>

      <!-- 左顶部：搜索对话 -->
      <el-input
        v-model="searchName"
        size="large"
        class="mt-5"
        placeholder="搜索历史记录"
        @keyup="searchConversation"
      >
        <template #prefix>
          <Icon icon="ep:search" />
        </template>
      </el-input>

      <!-- 左中间：对话列表 -->
      <div class="overflow-auto h-full">
        <div v-if="loading" class="flex justify-center items-center h-100px">
          <el-icon class="is-loading"><Loading /></el-icon>
        </div>
        <div v-for="conversationKey in Object.keys(conversationMap)" :key="conversationKey">
          <div class="mt-1.25 pt-2.5" v-if="conversationMap[conversationKey].length">
            <el-text class="mx-1" size="small" tag="b">
              {{ conversationKey }}
            </el-text>
          </div>
          <div
            class="mt-1.25"
            v-for="conversation in conversationMap[conversationKey]"
            :key="conversation.id"
            @click="handleConversationClick(conversation)"
            @mouseover="hoverConversationId = conversation.id"
            @mouseout="hoverConversationId = null"
          >
            <div
              class="flex flex-row justify-between flex-1 px-1.25 cursor-pointer rounded-1.25 items-center leading-7.5"
              :style="
                conversation.id === activeConversationId
                  ? 'background-color: var(--el-color-primary-light-9); border: 1px solid var(--el-color-primary-light-7);'
                  : ''
              "
            >
              <div class="flex flex-row items-center">
                <img
                  class="w-6.25 h-6.25 rounded-1.25 flex flex-row justify-center"
                  :src="conversation.roleAvatar || roleAvatarDefaultImg"
                />
                <span
                  class="py-0.5 px-2.5"
                  style="max-width: 220px; font-size: 14px; font-weight: 400; color: var(--el-text-color-regular); overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
                >
                  {{ conversation.title }}
                </span>
              </div>
              <div
                class="right-0.5 flex flex-row justify-center"
                style="color: var(--el-text-color-regular)"
                v-show="hoverConversationId === conversation.id"
              >
                <el-button class="m-0" link @click.stop="handleTop(conversation)">
                  <el-icon title="置顶" v-if="!conversation.pinned"><Top /></el-icon>
                  <el-icon title="置顶" v-if="conversation.pinned"><Bottom /></el-icon>
                </el-button>
                <el-button class="m-0" link @click.stop="updateConversationTitle(conversation)">
                  <el-icon title="编辑">
                    <Icon icon="ep:edit" />
                  </el-icon>
                </el-button>
                <el-button class="m-0" link @click.stop="deleteChatConversation(conversation)">
                  <el-icon title="删除对话">
                    <Icon icon="ep:delete" />
                  </el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <div class="h-160px w-100%"></div>
      </div>
    </div>

    <!-- 左底部：工具栏 -->
    <div
      class="absolute bottom-0 left-0 right-0 px-5 leading-8.75 flex justify-end items-center"
      style="background-color: var(--el-fill-color-extra-light); box-shadow: 0 0 1px 1px var(--el-border-color-lighter); color: var(--el-text-color);"
    >
      <div
        class="flex items-center p-0 m-0 cursor-pointer"
        style="color: var(--el-text-color-regular)"
        @click="handleClearConversation"
      >
        <Icon icon="ep:delete" />
        <el-text class="ml-1.25" size="small">清空未置顶对话</el-text>
      </div>
    </div>
  </el-aside>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, toRefs, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Bottom, Top } from '@element-plus/icons-vue'
import { ChatConversationApi, ChatConversationVO } from '@/api/graph/chat/conversation'
import roleAvatarDefaultImg from '@/assets/ai/gpt.svg'

const message = useMessage()

const searchName = ref<string>('')
const activeConversationId = ref<number | null>(null)
const hoverConversationId = ref<number | null>(null)
const conversationList = ref<ChatConversationVO[]>([])
const conversationMap = ref<Record<string, ChatConversationVO[]>>({})
const loading = ref<boolean>(false)
const loadingTime = ref<any>()

const props = defineProps({
  activeId: {
    type: String,
    default: null
  }
})

const emits = defineEmits([
  'onConversationCreate',
  'onConversationClick',
  'onConversationClear',
  'onConversationDelete'
])

const searchConversation = async () => {
  if (!searchName.value.trim().length) {
    conversationMap.value = await getConversationGroupByCreateTime(conversationList.value)
  } else {
    const filterValues = conversationList.value.filter((item) => {
      return item.title.includes(searchName.value.trim())
    })
    conversationMap.value = await getConversationGroupByCreateTime(filterValues)
  }
}

const getTimestamp = (time: Date | string | undefined): number => {
  if (!time) return 0
  if (time instanceof Date) {
    return time.getTime()
  }
  return new Date(time).getTime()
}

const handleConversationClick = async (conversation: ChatConversationVO) => {
  activeConversationId.value = conversation.id
  emits('onConversationClick', conversation)
}

const getChatConversationList = async () => {
  try {
    loadingTime.value = setTimeout(() => {
      loading.value = true
    }, 50)

    // 👇 核心修复：确保 conversationList 一定是数组
    const res = await ChatConversationApi.getChatConversationMyList()
    conversationList.value = Array.isArray(res) ? res : []
    
    // 👇 安全排序
    if (conversationList.value.length > 0) {
      conversationList.value.sort((a, b) => {
        const timeA = getTimestamp(a.createTime)
        const timeB = getTimestamp(b.createTime)
        return timeB - timeA
      })
    }

    if (conversationList.value.length === 0) {
      activeConversationId.value = null
      conversationMap.value = {}
      return
    }

    conversationMap.value = await getConversationGroupByCreateTime(conversationList.value)
  } finally {
    if (loadingTime.value) {
      clearTimeout(loadingTime.value)
    }
    loading.value = false
  }
}

const getConversationGroupByCreateTime = async (list: ChatConversationVO[]) => {
  const groupMap: Record<string, ChatConversationVO[]> = {
    置顶: [],
    今天: [],
    一天前: [],
    三天前: [],
    七天前: [],
    三十天前: []
  }
  
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const threeDays = 3 * oneDay
  const sevenDays = 7 * oneDay
  const thirtyDays = 30 * oneDay
  
  for (const conversation of list) {
    if (conversation.pinned) {
      groupMap['置顶'].push(conversation)
      continue
    }
    const createTime = getTimestamp(conversation.createTime)
    const diff = now - createTime
    
    if (diff < oneDay) {
      groupMap['今天'].push(conversation)
    } else if (diff < threeDays) {
      groupMap['一天前'].push(conversation)
    } else if (diff < sevenDays) {
      groupMap['三天前'].push(conversation)
    } else if (diff < thirtyDays) {
      groupMap['七天前'].push(conversation)
    } else {
      groupMap['三十天前'].push(conversation)
    }
  }
  return groupMap
}

// 关键：新建对话后自动跳转
const createConversation = async () => {
  const res = await ChatConversationApi.createChatConversationMy({})
  const conversationId = res.data

  await getChatConversationList()

  const newConversation = conversationList.value.find(item => item.id === conversationId)
  if (newConversation) {
    activeConversationId.value = conversationId
    await nextTick()
    emits('onConversationClick', newConversation)
    emits('onConversationCreate', newConversation)
  } else {
    emits('onConversationCreate')
  }
}

const updateConversationTitle = async (conversation: ChatConversationVO) => {
  const { value } = await ElMessageBox.prompt('修改标题', {
    inputPattern: /^[\s\S]*.*\S[\s\S]*$/,
    inputErrorMessage: '标题不能为空',
    inputValue: conversation.title
  })
  await ChatConversationApi.updateChatConversationMy({
    id: conversation.id,
    title: value
  } as ChatConversationVO)
  message.success('重命名成功')
  await getChatConversationList()
  const filterConversationList = conversationList.value.filter((item) => {
    return item.id === conversation.id
  })
  if (filterConversationList.length > 0) {
    if (activeConversationId.value === filterConversationList[0].id) {
      emits('onConversationClick', filterConversationList[0])
    }
  }
}

const deleteChatConversation = async (conversation: ChatConversationVO) => {
  try {
    await message.delConfirm(`是否确认删除对话 - ${conversation.title}?`)
    await ChatConversationApi.deleteChatConversationMy(conversation.id)
    message.success('对话已删除')
    await getChatConversationList()
    emits('onConversationDelete', conversation)
  } catch {}
}

const handleClearConversation = async () => {
  try {
    await message.confirm('确认后对话会全部清空，置顶的对话除外。')
    await ChatConversationApi.deleteChatConversationMyByUnpinned()
    ElMessage({ message: '操作成功!', type: 'success' })
    activeConversationId.value = null
    await getChatConversationList()
    emits('onConversationClear')
  } catch {}
}

const handleTop = async (conversation: ChatConversationVO) => {
  conversation.pinned = !conversation.pinned
  conversation.pinnedTime = conversation.pinned ? new Date() : undefined
  await ChatConversationApi.updateChatConversationMy(conversation)
  await getChatConversationList()
}

const { activeId } = toRefs(props)
watch(activeId, async (newValue) => {
  if (newValue) {
    activeConversationId.value = Number(newValue)
  }
})

defineExpose({ createConversation })

onMounted(async () => {
  await getChatConversationList()
  if (props.activeId) {
    activeConversationId.value = Number(props.activeId)
  } else {
    if (conversationList.value.length) {
      activeConversationId.value = conversationList.value[0].id
      emits('onConversationClick', conversationList.value[0])
    }
  }
})
</script>