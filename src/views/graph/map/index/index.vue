<template>
  <div class="map-container">
    <Left
      ref="leftRef"
      :is-generating="isGenerating"
      @submit="handleGenerate"
    />
    <Right
      :generated-content="generatedContent"
      :relation-list="relationList"
      :is-end="isEnd"
      :is-generating="isGenerating"
      :is-start="isStart"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import service from '@/config/axios'  // 替换 graphRequest
import Left from './components/Left.vue'
import Right from './components/Right.vue'

const generatedContent = ref('')
const relationList = ref<any[]>([])
const currentEntityName = ref('')
const isGenerating = ref(false)
const isStart = ref(false)
const isEnd = ref(true)
const leftRef = ref<InstanceType<typeof Left>>()

// 定义后端返回的数据结构
interface RelationResponse {
  code: number
  msg?: string
  data?: {
    entityRelation?: any
  }
}

const convertToMarkdown = (entityName: string, relationData: any): string => {
  let relations: any[] = []
  if (Array.isArray(relationData)) {
    if (relationData.length > 0 && Array.isArray(relationData[0])) {
      relations = relationData[0]
    } else {
      relations = relationData
    }
  }

  if (!relations || relations.length === 0) {
    return `# ${entityName}\n\n## 暂无关联数据`
  }

  let markdown = `# ${entityName}\n\n`
  for (const item of relations) {
    const target = item.entity2?.title || '未知实体'
    const relType = item.rel?.type || '关联'
    markdown += `## ${target}\n- 关系：${relType}\n\n`
  }
  return markdown
}

const convertToRelationList = (entityName: string, relationData: any): any[] => {
  let relations: any[] = []
  if (Array.isArray(relationData)) {
    if (relationData.length > 0 && Array.isArray(relationData[0])) {
      relations = relationData[0]
    } else {
      relations = relationData
    }
  }

  if (!relations || relations.length === 0) {
    return []
  }

  return relations.map((item: any) => ({
    entity1: entityName,
    entity2: item.entity2?.title || '未知实体',
    rel: item.rel?.type || '关联'
  }))
}

const clearData = () => {
  generatedContent.value = ''
  relationList.value = []
  currentEntityName.value = ''
  isStart.value = true
  isEnd.value = false
}

const handleGenerate = async () => {
  const entityName = leftRef.value?.getInputValue()?.trim()
  if (!entityName) {
    ElMessage.warning('请输入实体名称')
    return
  }

  clearData()
  isGenerating.value = true

  try {
    // 使用主系统 service 发起 GET 请求
    const result = await service.get<RelationResponse>({
      url: '/graph/map/entity/relation',
      params: { entityName }
    })
    // service 的响应拦截器已提取 data，result 即为后端返回的 JSON（包含 code, msg, data）
    console.log('接口返回原始数据：', result)

    if (result.code !== 0) {
      throw new Error(result.msg || `接口返回错误码: ${result.code}`)
    }

    const entityRelation = result.data?.entityRelation
    if (!entityRelation || (Array.isArray(entityRelation) && entityRelation.length === 0)) {
      const emptyMarkdown = `# ${entityName}\n\n## 未找到关联实体`
      generatedContent.value = emptyMarkdown
      relationList.value = []
      currentEntityName.value = entityName
      isEnd.value = true
      ElMessage.info('未找到关联数据')
      return
    }

    const markdown = convertToMarkdown(entityName, entityRelation)
    const relations = convertToRelationList(entityName, entityRelation)

    generatedContent.value = markdown
    relationList.value = relations
    currentEntityName.value = entityName
    isEnd.value = true
    ElMessage.success('生成成功！')
  } catch (err: any) {
    console.error('生成失败', err)
    const errorMsg = err.response?.data?.msg || err.message || '生成失败'
    ElMessage.error(`生成失败：${errorMsg}`)
    generatedContent.value = `# ${entityName}\n\n## 生成失败\n${errorMsg}`
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
}
</style>