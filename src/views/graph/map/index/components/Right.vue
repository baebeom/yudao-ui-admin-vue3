<template>
  <el-card class="my-card h-full flex-grow">
    <template #header>
      <h3 class="m-0 px-7 shrink-0 flex items-center justify-between">
        <span>知识图谱 & 思维导图</span>
        <div class="flex gap-2">
          <el-button size="small" @click="switchToMind" :type="showType === 'mind' ? 'primary' : 'default'">
            思维导图
          </el-button>
          <el-button size="small" @click="switchToGraph" :type="showType === 'graph' ? 'primary' : 'default'">
            知识图谱
          </el-button>
          <el-button size="small" type="primary" @click="downloadImage" v-if="isEnd && generatedContent">
            下载图片
          </el-button>
        </div>
      </h3>
    </template>

    <div class="card-body-wrapper" ref="cardBodyRef">
      <!-- 生成中 -->
      <div v-if="isGenerating" ref="mdContainerRef" class="generating-wrapper">
        <div v-html="html" class="markdown-body"></div>
      </div>

      <!-- 思维导图容器 -->
      <div v-show="!isGenerating && isEnd && generatedContent && showType === 'mind'" class="mindmap-wrapper" ref="mindmapWrapperRef">
        <svg ref="svgRef" class="mindmap-svg" />
      </div>

      <!-- 知识图谱容器 -->
      <div v-show="!isGenerating && isEnd && generatedContent && showType === 'graph'" class="graph-wrapper">
        <div ref="graphContainer" class="graph-container"></div>
      </div>
    </div>
  </el-card>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useMessage } from '@/hooks/web/useMessage'
import * as echarts from 'echarts'
import download from '@/utils/download'

const message = useMessage()

const props = defineProps({
  generatedContent: { type: String, default: '' },
  relationList: { type: Array as any, default: () => [] },
  isEnd: { type: Boolean, default: false },
  isGenerating: { type: Boolean, default: false },
  isStart: { type: Boolean, default: false },
})

const showType = ref('mind')

const cardBodyRef = ref<HTMLDivElement | null>(null)
const mdContainerRef = ref<HTMLDivElement | null>(null)
const mindmapWrapperRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const graphContainer = ref<HTMLDivElement | null>(null)
const html = ref('')

let markMap: any = null
let transformer: any = null
let md: any = null
let chartInstance: any = null
let modulesLoaded = false

/** 清空思维导图 SVG 内容 */
const clearMindMapSvg = () => {
  if (svgRef.value) {
    // 清空 SVG 内的所有子元素
    while (svgRef.value.firstChild) {
      svgRef.value.removeChild(svgRef.value.firstChild)
    }
  }
}

/** 清空知识图谱容器 */
const clearGraphContainer = () => {
  if (graphContainer.value && chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  // 清空容器内的所有内容
  if (graphContainer.value) {
    graphContainer.value.innerHTML = ''
  }
}

/** 清空所有数据（开始新生成时调用） */
const clearAll = () => {
  // 清空思维导图实例和 SVG
  if (markMap) {
    markMap = null
  }
  clearMindMapSvg()
  
  // 清空知识图谱实例和容器
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  if (graphContainer.value) {
    graphContainer.value.innerHTML = ''
  }
  
  // 清空 HTML 预览
  html.value = ''
}

// 动态加载 markmap 模块
const loadMarkmapModules = async () => {
  if (modulesLoaded) return true
  try {
    const markmapView = await import('markmap-view')
    const markmapLib = await import('markmap-lib')
    const markdownItModule = await import('markdown-it')
    
    md = markdownItModule.default()
    transformer = new markmapLib.Transformer()
    modulesLoaded = true
    return true
  } catch (e) {
    console.error('加载 markmap 模块失败:', e)
    return false
  }
}

// 切换到思维导图
const switchToMind = async () => {
  if (showType.value === 'mind') return
  showType.value = 'mind'
  await nextTick()
  if (props.generatedContent && props.isEnd) {
    await updateMindMap()
  }
}

// 切换到知识图谱
const switchToGraph = async () => {
  if (showType.value === 'graph') return
  showType.value = 'graph'
  await nextTick()
  if (props.relationList && props.relationList.length > 0) {
    renderGraph()
  }
}

// 渲染 ECharts 知识图谱
const renderGraph = () => {
  if (!graphContainer.value || !props.relationList || props.relationList.length === 0) {
    return
  }

  // 清空容器
  graphContainer.value.innerHTML = ''
  
  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  setTimeout(() => {
    if (!graphContainer.value) return
    
    const { nodes, links } = buildGraphData(props.relationList)
    
    if (nodes.length === 0) return

    chartInstance = echarts.init(graphContainer.value)
    
    const option = {
      tooltip: {},
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 500,
          edgeLength: 100,
          gravity: 0.1,
          friction: 0.2
        },
        roam: true,
        draggable: true,
        data: nodes,
        links: links,
        label: {
          show: true,
          position: 'inside',
          fontSize: 14
        },
        symbolSize: 60,
        emphasis: {
          focus: 'adjacency'
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3,
          type: 'solid'
        },
        edgeLabel: {
          show: true,
          formatter: (params: any) => params.data.label || '',
          fontSize: 10,
          position: 'middle'
        }
      }]
    }
    
    chartInstance.setOption(option)
  }, 100)
}

// 构建图谱数据
const buildGraphData = (relationList: any[]) => {
  const nodes: any[] = []
  const links: any[] = []
  const nodeSet = new Set()
  
  for (const item of relationList) {
    if (!nodeSet.has(item.entity1)) {
      nodeSet.add(item.entity1)
      nodes.push({
        id: item.entity1,
        name: item.entity1,
        symbolSize: Math.min(70, Math.max(45, item.entity1.length * 3))
      })
    }
    
    if (!nodeSet.has(item.entity2)) {
      nodeSet.add(item.entity2)
      nodes.push({
        id: item.entity2,
        name: item.entity2,
        symbolSize: Math.min(70, Math.max(45, item.entity2.length * 3))
      })
    }
    
    links.push({
      source: item.entity1,
      target: item.entity2,
      label: item.rel
    })
  }
  
  return { nodes, links }
}

// 更新思维导图
const updateMindMap = async () => {
  try {
    if (!props.generatedContent || !svgRef.value) return
    
    const loaded = await loadMarkmapModules()
    if (!loaded) return
    
    if (!mindmapWrapperRef.value) return
    
    const { Markmap } = await import('markmap-view')
    
    // 先清空 SVG 内容
    clearMindMapSvg()
    
    // 销毁旧实例
    if (markMap) {
      markMap = null
    }
    
    const svg = svgRef.value
    const containerHeight = mindmapWrapperRef.value.clientHeight
    const containerWidth = mindmapWrapperRef.value.clientWidth
    
    if (containerHeight === 0 || containerWidth === 0) {
      setTimeout(() => updateMindMap(), 200)
      return
    }
    
    svg.setAttribute('width', String(containerWidth))
    svg.setAttribute('height', String(containerHeight))
    svg.style.width = '100%'
    svg.style.height = '100%'
    
    const content = processContent(props.generatedContent)
    const { root } = transformer.transform(content)
    if (!root) return

    // 创建新的思维导图
    markMap = Markmap.create(svg)
    markMap.setData(root)
    setTimeout(() => {
      if (markMap) markMap.fit()
    }, 100)
  } catch (e) {
    console.error('思维导图失败', e)
  }
}

const processContent = (text: string) => {
  if (!text) return ''
  return text.replace(/```[\s\S]*?```/g, '')
}

// 下载图片
const downloadImage = () => {
  if (showType.value === 'mind' && svgRef.value) {
    const svg = svgRef.value
    const clonedSvg = svg.cloneNode(true) as SVGElement
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(clonedSvg)
    const base64Url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
    
    download.image({
      url: base64Url,
      drawWithImageSize: false,
    })
    message.success('思维导图下载中...')
  } else if (showType.value === 'graph' && chartInstance) {
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })
    const link = document.createElement('a')
    link.download = 'knowledge-graph.png'
    link.href = url
    link.click()
    message.success('知识图谱下载中...')
  } else {
    message.warning('暂无内容可下载')
  }
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
  if (markMap) {
    markMap.fit()
  }
}

// ==================== 监听器 ====================

// 监听开始生成（清空所有旧数据）
watch(() => props.isStart, (newVal) => {
  if (newVal) {
    clearAll()
  }
})

// 监听生成内容变化（新数据生成后渲染）
watch(() => props.generatedContent, async (newVal, oldVal) => {
  if (newVal && props.isEnd && newVal !== oldVal) {
    await nextTick()
    // 清空并重新渲染当前视图
    clearAll()
    setTimeout(() => {
      if (showType.value === 'mind') {
        updateMindMap()
      } else if (showType.value === 'graph') {
        renderGraph()
      }
    }, 100)
  }
})

// 监听关系列表变化（用于知识图谱）
watch(() => props.relationList, (newVal, oldVal) => {
  if (newVal && newVal.length > 0 && showType.value === 'graph' && props.isEnd) {
    // 清空并重新渲染
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
    if (graphContainer.value) {
      graphContainer.value.innerHTML = ''
    }
    setTimeout(() => renderGraph(), 100)
  }
})

// 监听切换视图
watch(showType, (newVal) => {
  if (!props.isEnd || !props.generatedContent) return
  
  nextTick(() => {
    if (newVal === 'graph' && props.relationList.length > 0) {
      renderGraph()
    } else if (newVal === 'mind') {
      updateMindMap()
    }
  })
})

onMounted(async () => {
  await loadMarkmapModules()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
})

defineExpose({
  scrollBottom() {
    if (mdContainerRef.value) {
      mdContainerRef.value.scrollTop = mdContainerRef.value.scrollHeight
    }
  },
})
</script>

<style lang="scss" scoped>
.my-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }
}

.card-body-wrapper {
  flex: 1;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.generating-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.mindmap-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  .mindmap-svg {
    width: 100%;
    height: 100%;
    display: block;
    background-color: #ffffff;
  }
}

.graph-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  
  .graph-container {
    width: 100%;
    height: 100%;
  }
}

.markdown-body {
  padding: 16px;
}
</style>