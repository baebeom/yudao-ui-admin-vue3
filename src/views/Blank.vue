<template>
  <div class="blank-page">
    <el-empty description="暂无打开的页面，请从左侧菜单选择" :image-size="200" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Blank' })
</script>

<style scoped>
.blank-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
}
</style>