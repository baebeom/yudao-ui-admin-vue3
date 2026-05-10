<template>
  <div class="map-container">
    <div class="left-panel">
      <h3>思维导图创作中心</h3>
      <el-input
        v-model="entityName"
        type="textarea"
        :rows="10"
        placeholder="请输入实体名称"
        maxlength="1024"
        show-word-limit
      />
      <el-button
        type="primary"
        class="submit-btn"
        :loading="isGenerating"
        @click="handleSearch"
      >
        智能生成
      </el-button>
    </div>

    <div class="right-panel">
      <h3>思维导图预览</h3>
      <Right
        :generatedContent="generatedContent"
        :isGenerating="isGenerating"
        :isEnd="isEnd"
        :isStart="isStart"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import Right from '../index/components/Right.vue'

// 全部为空
const entityName = ref('')
const generatedContent = ref('')
const isGenerating = ref(false)
const isEnd = ref(false)
const isStart = ref(false)

// 搜索按钮
const handleSearch = async () => {
  const name = entityName.value.trim()
  if (!name) {
    ElMessage.warning('请输入实体名称')
    return
  }

  isGenerating.value = true
  isStart.value = true
  isEnd.value = false
  generatedContent.value = ''

  try {
    const res = await axios.get(
      'http://127.0.0.1:48080/admin-api/graph/map/entity/relation',
      { params: { entityName: name } }
    )

    generatedContent.value = res.data.data || res.data || ''
    isEnd.value = true
    ElMessage.success('生成成功')
  } catch (err) {
    ElMessage.error('接口调用失败，请检查服务')
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.map-container { display: flex; height: 100vh; }
.left-panel { width: 260px; border-right: 1px solid #eee; padding: 20px; }
.right-panel { flex: 1; padding: 20px; }
.submit-btn { width: 100%; margin-top: 15px; }
</style>