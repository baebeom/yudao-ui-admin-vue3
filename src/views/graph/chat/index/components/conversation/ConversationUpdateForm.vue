<template>
  <Dialog title="设定" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="130px"
      v-loading="formLoading"
    >
      <el-form-item label="回复数 Token 数" prop="maxTokens">
        <el-input-number
          v-model="formData.maxTokens"
          placeholder="请输入回复数 Token 数"
          :min="0"
          :max="8192"
          class="!w-1/1"
        />
      </el-form-item>
      <el-form-item label="上下文数量" prop="maxContexts">
        <el-input-number
          v-model="formData.maxContexts"
          placeholder="请输入上下文数量"
          :min="0"
          :max="20"
          class="!w-1/1"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import service from '@/config/axios'
import type { ChatConversationVO } from '@/api/graph/chat/conversation'

defineOptions({ name: 'ChatConversationUpdateForm' })

const message = useMessage()

const dialogVisible = ref(false)
const formLoading = ref(false)
const formData = ref({
  id: undefined,
  maxTokens: undefined,
  maxContexts: undefined
})
const formRules = reactive({
  maxTokens: [{ required: true, message: '回复数 Token 数不能为空', trigger: 'blur' }],
  maxContexts: [{ required: true, message: '上下文数量不能为空', trigger: 'blur' }]
})
const formRef = ref()

const open = async (id: number) => {
  dialogVisible.value = true
  resetForm()
  if (id) {
    formLoading.value = true
    try {
      const data = await service.get({ url: `/graph/chat/conversation/get-my?id=${id}` })
      formData.value = {
        id: data.id,
        maxTokens: data.maxTokens,
        maxContexts: data.maxContexts
      }
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open })

const emit = defineEmits(['success'])
const submitForm = async () => {
  await formRef.value.validate()
  formLoading.value = true
  try {
    await service.put({
      url: '/graph/chat/conversation/update-my',
      data: formData.value as unknown as ChatConversationVO
    })
    message.success('对话配置已更新')
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  formData.value = { id: undefined, maxTokens: undefined, maxContexts: undefined }
  formRef.value?.resetFields()
}
</script>