<template>
  <div class="left-container">
    <h3>实体检索</h3>
    <p>请输入实体名称</p>
    <el-input
      v-model="prompt"
      type="textarea"
      :rows="10"
      maxlength="1024"
      show-word-limit
      placeholder=""
    />
    <el-button
      type="primary"
      :loading="isGenerating"
      class="submit-btn"
      @click="handleSubmit"
    >
      智能生成
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const prompt = ref('')

defineProps<{
  isGenerating: boolean
}>()

const emit = defineEmits<{
  (e: 'submit'): void
}>()

const handleSubmit = () => {
  emit('submit')
}

/** 暴露获取输入值的方法给父组件 */
const getInputValue = () => prompt.value

defineExpose({ getInputValue })
</script>

<style scoped>
.left-container {
  width: 300px;
  border-right: 1px solid #e4e7ed;
  padding: 20px;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
}
.submit-btn {
  width: 100%;
  margin-top: 20px;
}
h3 {
  margin-top: 0;
  color: #409eff;
}
</style>