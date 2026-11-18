<script setup lang="ts">
/** 技能彩蛋卡片：强化卷梨触发「晴空万里」时淡入，点击或超时消失 */

import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'

const ui = useUiStore()
const egg = computed(() => ui.easterEgg)
</script>

<template>
  <Transition name="egg">
    <div v-if="egg" class="egg-veil" @click="ui.dismissEasterEgg()">
      <div class="egg-card" @click.stop="ui.dismissEasterEgg()">
        <div class="egg-halo" />
        <p class="egg-title">{{ egg.title }}</p>
        <p class="egg-text">{{ egg.text }}</p>
        <p class="egg-hint">点一下继续</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.egg-veil {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(60, 78, 55, 0.16);
  backdrop-filter: blur(2px);
}

.egg-card {
  position: relative;
  width: min(340px, 100%);
  padding: 26px 24px 20px;
  border-radius: 20px;
  background: linear-gradient(165deg, #fffef8 0%, #fdf6e3 100%);
  box-shadow: 0 18px 44px rgba(120, 100, 50, 0.2);
  text-align: center;
  overflow: hidden;
}

.egg-halo {
  position: absolute;
  top: -60px;
  left: 50%;
  width: 200px;
  height: 140px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 226, 150, 0.9), transparent 68%);
  filter: blur(22px);
}

.egg-title {
  position: relative;
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 4px;
  color: #b8871f;
}

.egg-text {
  position: relative;
  margin: 0 0 14px;
  font-size: 15px;
  line-height: 2;
  color: #5f5638;
  letter-spacing: 0.5px;
}

.egg-hint {
  position: relative;
  margin: 0;
  font-size: 10.5px;
  color: #b8ac8e;
}

.egg-enter-active,
.egg-leave-active {
  transition: opacity 0.26s ease;
}

.egg-enter-active .egg-card,
.egg-leave-active .egg-card {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.egg-enter-from,
.egg-leave-to {
  opacity: 0;
}

.egg-enter-from .egg-card,
.egg-leave-to .egg-card {
  transform: translateY(10px) scale(0.96);
}
</style>
