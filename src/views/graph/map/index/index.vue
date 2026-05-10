<template>
  <div class="map-container">
    <div class="left-panel">
      <h3>实体检索</h3>
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
      <Right
        :generatedContent="generatedContent"
        :relationList="relationList"
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
import request from '@/config/axios'
import Right from '../index/components/Right.vue'

const entityName = ref('')
const generatedContent = ref('')
const relationList = ref<any[]>([])
const isGenerating = ref(false)
const isEnd = ref(false)
const isStart = ref(false)

/**
 * 将后端返回的关系数据转换为 Markdown 格式（用于思维导图）
 * 参考 chat 页面的转换逻辑
 */
const convertToMarkdown = (entityName: string, apiData: any): string => {
  let relations: any[] = []
  
  // 参考 chat 页面的数据解析方式
  // 后端返回格式可能是: { code: 0, data: { entityRelation: [...] } }
  let responseData = apiData
  
  // 处理标准响应格式
  if (apiData && typeof apiData.code === 'number' && apiData.code === 0) {
    responseData = apiData.data
  }
  
  // 解析 entityRelation - 参考 chat 页面转换 relationList 的逻辑
  if (responseData?.entityRelation) {
    const entityRelation = responseData.entityRelation
    // 处理可能是嵌套数组的情况
    if (Array.isArray(entityRelation) && entityRelation.length > 0) {
      if (Array.isArray(entityRelation[0])) {
        relations = entityRelation[0]
      } else {
        relations = entityRelation
      }
    }
  } else if (Array.isArray(responseData)) {
    // 直接是数组的情况
    if (responseData.length > 0 && Array.isArray(responseData[0])) {
      relations = responseData[0]
    } else {
      relations = responseData
    }
  }

  if (!relations || relations.length === 0) {
    return `# ${entityName}\n\n## 暂无关联数据\n\n未找到与"${entityName}"相关的实体信息。`
  }

  let markdown = `# ${entityName}\n\n`
  markdown += `## 关联实体概览\n\n共找到 ${relations.length} 条关联关系\n\n`
  
  for (const item of relations) {
    // 兼容不同的字段名（参考 chat 页面的转换）
    const target = item.entity2?.title || item.entity2 || item.target || '未知实体'
    const relType = item.rel?.type || item.rel || item.relation || '关联'
    const sourceType = item.entity1_type || ''
    const targetType = item.entity2_type || ''
    
    markdown += `## ${target}\n`
    markdown += `- **关系类型**：${relType}\n`
    if (sourceType) markdown += `- **源实体类型**：${sourceType}\n`
    if (targetType) markdown += `- **目标实体类型**：${targetType}\n`
    markdown += `\n`
  }
  
  return markdown
}

/**
 * 将后端返回的关系数据转换为知识图谱所需的关系列表格式
 * 完全参考 chat 页面的 MessageList.vue 中的转换逻辑
 */
const convertToRelationList = (entityName: string, apiData: any): any[] => {
  let relations: any[] = []
  
  // 处理标准响应格式
  let responseData = apiData
  if (apiData && typeof apiData.code === 'number' && apiData.code === 0) {
    responseData = apiData.data
  }
  
  // 参考 chat 页面的 graph 字段解析方式
  if (responseData?.entityRelation) {
    const entityRelation = responseData.entityRelation
    if (Array.isArray(entityRelation) && entityRelation.length > 0) {
      // 处理可能是嵌套数组的情况
      if (Array.isArray(entityRelation[0])) {
        relations = entityRelation[0]
      } else {
        relations = entityRelation
      }
    }
  } else if (Array.isArray(responseData)) {
    if (responseData.length > 0 && Array.isArray(responseData[0])) {
      relations = responseData[0]
    } else {
      relations = responseData
    }
  }

  if (!relations || relations.length === 0) {
    return []
  }

  // 转换为 Right 组件需要的格式（参考 chat 页面的转换）
  return relations.map((item: any) => ({
    entity1: item.entity1 || entityName,
    entity2: item.entity2?.title || item.entity2 || item.target || '未知实体',
    rel: item.rel?.type || item.rel || item.relation || '关联',
    entity1_type: item.entity1_type || '',
    entity2_type: item.entity2_type || ''
  }))
}

/**
 * 清空所有数据
 */
const clearData = () => {
  generatedContent.value = ''
  relationList.value = []
  isStart.value = true
  isEnd.value = false
}

/**
 * 处理搜索/生成请求
 */
const handleSearch = async () => {
  const name = entityName.value.trim()
  if (!name) {
    ElMessage.warning('请输入实体名称')
    return
  }

  // 重置状态
  clearData()
  isGenerating.value = true

  try {
    // 使用项目封装的 request，会自动携带 token
    const result = await request.get({
      url: '/graph/map/entity/relation',
      params: { entityName: name }
    })

    console.log('实体检索接口返回数据:', result)

    // 检查返回结果
    if (result && typeof result.code === 'number' && result.code !== 0) {
      throw new Error(result.msg || `请求失败: ${result.code}`)
    }

    // 获取实际数据
    let hasData = false
    
    // 检查是否有 entityRelation 数据
    const dataSource = result?.data || result
    if (dataSource?.entityRelation) {
      const entityRelation = dataSource.entityRelation
      if (Array.isArray(entityRelation)) {
        if (entityRelation.length > 0) {
          if (Array.isArray(entityRelation[0])) {
            hasData = entityRelation[0].length > 0
          } else {
            hasData = entityRelation.length > 0
          }
        }
      }
    } else if (Array.isArray(dataSource) && dataSource.length > 0) {
      hasData = true
    }

    if (!hasData) {
      const emptyMarkdown = `# ${name}\n\n## 未找到关联实体\n\n未找到与"${name}"相关的实体信息，请尝试其他关键词。`
      generatedContent.value = emptyMarkdown
      relationList.value = []
      isEnd.value = true
      ElMessage.info('未找到关联数据')
      return
    }

    // 转换数据格式
    const markdown = convertToMarkdown(name, result)
    const relations = convertToRelationList(name, result)

    console.log('转换后的 relationList:', relations)
    console.log('转换后的 markdown:', markdown.substring(0, 200))

    generatedContent.value = markdown
    relationList.value = relations
    isEnd.value = true
    
    ElMessage.success(`生成成功！共找到 ${relations.length} 条关联关系`)
  } catch (err: any) {
    console.error('生成失败:', err)
    
    const errorMsg = err.response?.data?.msg || err.message || '生成失败'
    ElMessage.error(`生成失败：${errorMsg}`)
    
    // 显示错误信息在思维导图中
    generatedContent.value = `# ${name}\n\n## 生成失败\n\n**错误信息：** ${errorMsg}\n\n请检查网络连接或联系管理员。`
    relationList.value = []
    isEnd.value = true
  } finally {
    isGenerating.value = false
    isStart.value = false
  }
}
</script>

<style scoped>
.map-container {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.left-panel {
  width: 320px;
  border-right: 1px solid #e4e7ed;
  padding: 20px;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.left-panel h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #409eff;
  font-size: 18px;
}

.submit-btn {
  width: 100%;
  margin-top: 20px;
}

.right-panel {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .left-panel {
    width: 260px;
  }
}
</style>