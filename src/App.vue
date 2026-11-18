<script setup lang="ts">
/**
 * 页面外壳（横屏布局）
 * 只用一条竖向流：顶栏 → 建造栏 + 波次 → 棋盘 → 详情条 → 页脚。
 * 棋盘宽度按视口高度反算（棋盘比例 2.5:1），保证横屏下整块棋盘完整可见、不出现滚动。
 */

import { onBeforeUnmount, onMounted } from 'vue'
import EasterEggCard from '@/components/EasterEggCard.vue'
import GameCanvas from '@/components/GameCanvas.vue'
import OrientationGate from '@/components/OrientationGate.vue'
import ResultModal from '@/components/ResultModal.vue'
import ShovelConfirm from '@/components/ShovelConfirm.vue'
import TopBar from '@/components/TopBar.vue'
import UnitBar from '@/components/UnitBar.vue'
import UnitDetailBar from '@/components/UnitDetailBar.vue'
import WavePanel from '@/components/WavePanel.vue'
import { FOOTER_COPY } from '@/config/copywriting'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { audio } from '@/utils/audio'

const game = useGameStore()
const ui = useUiStore()

function handleFirstGesture(): void {
  audio.init()
  if (ui.settings.bgm) void audio.startBgm()
}

function handleKeydown(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') {
    // Esc 先关掉二次确认弹窗，再退掉当前选择，避免一按就全清空
    if (ui.pendingRemove) {
      ui.cancelRemove()
      return
    }
    ui.clearSelection()
    return
  }
  if (ev.code === 'Space') {
    ev.preventDefault()
    game.togglePause()
  }
}

onMounted(() => {
  game.boot()
  window.addEventListener('pointerdown', handleFirstGesture, { once: true })
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app">
    <TopBar />

    <div class="toolbar">
      <UnitBar />
      <WavePanel />
    </div>

    <main class="stage">
      <div class="board-slot">
        <GameCanvas />
      </div>
    </main>

    <UnitDetailBar />

    <footer class="footer">{{ FOOTER_COPY }}</footer>

    <Transition name="toast">
      <div v-if="ui.toastMessage" class="toast">{{ ui.toastMessage }}</div>
    </Transition>

    <EasterEggCard />
    <ShovelConfirm />
    <ResultModal />
    <OrientationGate />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 16px 14px;
  /* 横屏刘海屏：左右按安全区再让一点，安全区为 0 时还是 16px */
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar {
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar > :first-child {
  flex: 1 1 320px;
  min-width: 0;
}

.stage {
  display: flex;
  justify-content: center;
}

/* 棋盘比例 = 720 / 288 = 2.5，宽度按剩余高度反算，横屏下一屏放得下 */
.board-slot {
  width: min(100%, calc((100dvh - 216px) * 2.5));
}

.footer {
  text-align: center;
  font-size: 10.5px;
  color: #a8b5a0;
  letter-spacing: 0.6px;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  padding: 9px 18px;
  border-radius: 999px;
  background: rgba(61, 74, 55, 0.9);
  color: #f5faf1;
  font-size: 12.5px;
  letter-spacing: 0.3px;
  box-shadow: 0 8px 22px rgba(50, 70, 45, 0.24);
  pointer-events: none;
  z-index: 60;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* 矮屏（手机横屏）：压掉页脚和留白，把高度尽量让给棋盘 */
@media (max-height: 620px) {
  .app {
    gap: 7px;
    padding: 8px 10px 8px;
    padding-left: max(10px, env(safe-area-inset-left));
    padding-right: max(10px, env(safe-area-inset-right));
  }
  .board-slot {
    width: min(100%, calc((100dvh - 168px) * 2.5));
  }
  .footer {
    display: none;
  }
}

@media (max-width: 720px) {
  .app {
    padding: 10px 10px 12px;
    padding-left: max(10px, env(safe-area-inset-left));
    padding-right: max(10px, env(safe-area-inset-right));
  }
  .toolbar {
    gap: 8px;
  }
}
</style>
