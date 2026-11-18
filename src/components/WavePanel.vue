<script setup lang="ts">
/** 波次面板（横屏紧凑版）：当前进度、下一波倒计时、手动开始 */

import { computed } from 'vue'
import { WAVES } from '@/config/waves'
import { UI_COPY } from '@/config/copywriting'
import { useGameStore } from '@/stores/gameStore'

const game = useGameStore()
const hud = computed(() => game.hud)

const nextWave = computed(() => WAVES[hud.value.wave] ?? null)
const finished = computed(() => hud.value.wave >= hud.value.totalWaves)
const canStart = computed(
  () => !hud.value.waveInProgress && !finished.value && hud.value.status === 'running',
)
</script>

<template>
  <section class="wave">
    <div class="wave-info">
      <p class="wave-title">
        <template v-if="finished">全部守住了</template>
        <template v-else-if="hud.waveInProgress">第 {{ hud.wave + 1 }} 波正在来</template>
        <template v-else>第 {{ nextWave?.index }} 波 · {{ nextWave?.label }}</template>
        <span class="wave-count">{{ hud.wave }} / {{ hud.totalWaves }}</span>
      </p>
      <p class="wave-sub">
        <template v-if="finished">可以重新开始，再守一轮</template>
        <template v-else-if="hud.waveInProgress">守住这一波，就能歇一会儿</template>
        <template v-else>{{ hud.nextWaveIn }} 秒后自动开始</template>
      </p>
    </div>
    <button class="start-btn" :disabled="!canStart" @click="game.startWave()">
      {{ UI_COPY.startWave }}
    </button>
  </section>
</template>

<style scoped>
.wave {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 8px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 5px 16px rgba(96, 130, 90, 0.09);
  flex-shrink: 0;
}

.wave-info {
  min-width: 118px;
}

.wave-title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #3d4a37;
  white-space: nowrap;
}

.wave-count {
  margin-left: 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: #93a789;
}

.wave-sub {
  margin: 2px 0 0;
  font-size: 10.5px;
  color: #8a9a80;
  white-space: nowrap;
}

.start-btn {
  padding: 9px 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(145deg, #8bc75f, #6aa93f);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(110, 165, 70, 0.28);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(110, 165, 70, 0.34);
}

.start-btn:disabled {
  background: #dfe6da;
  color: #a4b09c;
  box-shadow: none;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .wave {
    gap: 8px;
    padding: 7px 8px 7px 10px;
  }
  .wave-sub {
    display: none;
  }
  .start-btn {
    padding: 8px 10px;
  }
}
</style>
