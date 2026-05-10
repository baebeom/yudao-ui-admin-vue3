<template>
  <div class="relative flex flex-row justify-center w-full h-full">
    <div class="flex flex-col justify-center">
      <div class="text-28px font-bold text-center">AI 智能问答</div>
      <div class="flex flex-row flex-wrap items-center justify-center max-w-800px mt-20px gap-12px">
        <div
          class="flex justify-center px-20px py-10px leading-normal border border-solid border-[#e4e4e4] rounded-20px cursor-pointer transition-all duration-200 hover:bg-[rgba(243,243,243,0.73)] hover:border-[#409eff] hover:shadow-sm"
          v-for="prompt in promptList"
          :key="prompt.prompt"
          @click="handlerPromptClick(prompt)"
        >
          {{ prompt.prompt }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const promptList = [
  { prompt: '崇明县适合种什么植物？' },
  { prompt: '中国的首都的气候类型是什么？' },
  { prompt: '胡萝卜汁含有哪些营养成分？' },
  { prompt: '大豆的植物学分类是什么？' }
] // prompt 列表

const emits = defineEmits(['onPrompt'])

/** 选中 prompt 点击 */
const handlerPromptClick = async ({ prompt }) => {
  emits('onPrompt', prompt)
}
</script>