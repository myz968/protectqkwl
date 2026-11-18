<script setup lang="ts">
/** 顶部 HUD（横屏紧凑版）：梨光、守护值、波次进度 + 暂停 / 音乐 / 音效 / 全屏 / 重开 */

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { UI_COPY } from '@/config/copywriting'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

const game = useGameStore()
const ui = useUiStore()

const hud = computed(() => game.hud)
const paused = computed(() => game.hud.status === 'paused')
const finished = computed(() => game.hud.status === 'victory' || game.hud.status === 'defeat')

const fullscreen = ref(false)

function syncFullscreen(): void {
  fullscreen.value = !!document.fullscreenElement
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* 浏览器不支持或被拒绝，静默失败 */
  }
  syncFullscreen()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreen)
  syncFullscreen()
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreen)
})
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <div class="brand-badge">帅</div>
      <div class="brand-text">
        <p class="brand-title">{{ UI_COPY.title }}</p>
        <p class="brand-sub">{{ UI_COPY.subtitle }}</p>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <span class="stat-label">{{ UI_COPY.pearLight }}</span>
        <span class="stat-value pear">{{ hud.pearLight }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ UI_COPY.hp }}</span>
        <span class="hearts">
          <i v-for="i in hud.maxHp" :key="i" class="heart" :class="{ lost: i > hud.hp }" />
        </span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ UI_COPY.wave }}</span>
        <span class="stat-value">{{ hud.wave }} / {{ hud.totalWaves }}</span>
      </div>
    </div>

    <div class="controls">
      <button class="ctrl" :disabled="finished" @click="game.togglePause()">
        {{ paused ? UI_COPY.resume : UI_COPY.pause }}
      </button>
      <button class="ctrl" :class="{ off: !ui.settings.bgm }" @click="ui.toggleBgm()">
        {{ UI_COPY.bgm }}{{ ui.settings.bgm ? '开' : '关' }}
      </button>
      <button class="ctrl" :class="{ off: !ui.settings.sfx }" @click="ui.toggleSfx()">
        {{ UI_COPY.sfx }}{{ ui.settings.sfx ? '开' : '关' }}
      </button>
      <button class="ctrl" @click="toggleFullscreen()">{{ UI_COPY.fullscreen }}</button>
      <button class="ctrl ghost" @click="game.restart()">{{ UI_COPY.restart }}</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 6px 18px rgba(96, 130, 90, 0.1);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.brand-badge {
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background: linear-gradient(145deg, #cbe89c, #8dbd63);
  color: #3f5a26;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 15px;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(110, 160, 80, 0.3);
}

.brand-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #3d4a37;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.brand-sub {
  margin: 0;
  font-size: 10.5px;
  color: #8a9a80;
  white-space: nowrap;
}

.stats {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1 1 220px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 11.5px;
  color: #8a9a80;
}

.stat-value {
  font-size: 15px;
  font-weight: 800;
  color: #3d4a37;
}

.stat-value.pear {
  color: #6fae3f;
}

.hearts {
  display: flex;
  gap: 3px;
}

.heart {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: linear-gradient(145deg, #f7a1a1, #e06c6c);
  transition: background 0.2s ease, transform 0.2s ease;
}

.heart.lost {
  background: #e6e9e2;
  transform: scale(0.9);
}

.controls {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.ctrl {
  padding: 6px 11px;
  border-radius: 10px;
  border: 1px solid rgba(140, 175, 125, 0.35);
  background: rgba(247, 252, 243, 0.95);
  color: #4b6b3a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
}

.ctrl:hover:not(:disabled) {
  background: #eaf5e0;
  border-color: rgba(120, 170, 95, 0.6);
}

.ctrl:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ctrl.off {
  color: #a2aea0;
  background: rgba(240, 243, 237, 0.9);
  border-color: rgba(170, 180, 165, 0.35);
}

.ctrl.ghost {
  color: #a1734a;
  border-color: rgba(210, 170, 120, 0.45);
  background: rgba(253, 247, 238, 0.95);
}

@media (max-width: 900px) {
  .topbar {
    gap: 10px;
    padding: 7px 10px;
  }
  .brand-sub {
    display: none;
  }
  .stats {
    gap: 10px;
    flex: 1 1 100%;
    order: 3;
  }
  .controls {
    margin-left: auto;
  }
  .ctrl {
    padding: 5px 9px;
    font-size: 11.5px;
  }
}

@media (max-width: 640px) {
  .brand-title {
    font-size: 13.5px;
  }
  /* 窄屏只收起「重开」，全屏按钮留着——竖屏里想转横屏还得靠它 */
  .ctrl.ghost {
    display: none;
  }
}

/* 手机横屏：高度紧，整条顶栏压成一行，把空间全让给棋盘 */
@media (max-height: 620px) {
  .topbar {
    flex-wrap: nowrap;
    gap: 8px;
    padding: 5px 9px;
    border-radius: 13px;
  }
  .brand-text {
    display: none;
  }
  .brand-badge {
    width: 26px;
    height: 26px;
    border-radius: 9px;
    font-size: 13px;
  }
  .stats {
    flex: 1 1 auto;
    flex-wrap: nowrap;
    gap: 11px;
    order: 0;
  }
  .stat-label {
    font-size: 10px;
  }
  .stat-value {
    font-size: 13px;
  }
  .heart {
    width: 7px;
    height: 7px;
  }
  .controls {
    gap: 4px;
    flex-wrap: nowrap;
    margin-left: auto;
  }
  .ctrl {
    padding: 4px 8px;
    font-size: 10.5px;
    border-radius: 8px;
  }
}
</style>
