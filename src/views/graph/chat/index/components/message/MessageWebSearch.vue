<!-- src/views/graph/chat/index/components/message/MessageWebSearch.vue -->
<template>
  <div v-if="webSearchPages && webSearchPages.length > 0" class="mt-10px p-10px rounded-8px bg-[#f5f5f5]">
    <div class="text-14px text-[#666] mb-8px flex items-center">
      <Icon icon="ep:search" class="mr-5px" />
      联网搜索结果 ({{ webSearchPages.length }})
    </div>
    <div class="flex flex-col gap-8px">
      <div
        v-for="(page, index) in webSearchPages"
        :key="index"
        class="p-8px bg-white rounded-6px cursor-pointer transition-all hover:bg-[#e6f4ff]"
        @click="handleOpenLink(page.url)"
      >
        <div class="text-14px text-[#333] font-medium mb-4px">
          {{ page.title }}
        </div>
        <div class="text-12px text-[#999] truncate">
          {{ page.url }}
        </div>
        <div class="text-13px text-[#666] mt-4px line-clamp-2">
          {{ page.snippet }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  webSearchPages?: Array<{
    title: string
    url: string
    snippet: string
  }>
}>()

const handleOpenLink = (url: string) => {
  window.open(url, '_blank')
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>