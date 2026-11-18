<script setup lang="ts">
/** 结算弹窗：通关 / 失败共用一套布局，文案来自 copywriting.ts */

import { computed } from 'vue'
import { RESULT_COPY } from '@/config/copywriting'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

const game = useGameStore()
const ui = useUiStore()

const result = computed(() => ui.result)
const copy = computed(() => (result.value?.victory ? RESULT_COPY.victory : RESULT_COPY.defeat))

const duration = computed(() => {
  const seconds = Math.floor(result.value?.elapsed ?? 0)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m} 分 ${s.toString().padStart(2, '0')} 秒`
})
</script>

<template>
  <Transition name="modal">
    <div v-if="result" class="modal-veil" @click.self="ui.hideResult()">
      <div class="modal" :class="result.victory ? 'win' : 'lose'">
        <div class="modal-glow" />
        <p class="modal-tag">{{ copy.tag }}</p>
        <h2 class="modal-title">{{ copy.title }}</h2>

        <div class="modal-lines">
          <p v-for="(line, i) in copy.lines" :key="i">{{ line }}</p>
        </div>

        <dl class="modal-stats">
          <div>
            <dt>波次</dt>
            <dd>{{ result.wave }} / {{ result.totalWaves }}</dd>
          </div>
          <div>
            <dt>击退</dt>
            <dd>{{ result.defeated }}</dd>
          </div>
          <div>
            <dt>梨光</dt>
            <dd>{{ result.produced }}</dd>
          </div>
          <div>
            <dt>用时</dt>
            <dd>{{ duration }}</dd>
          </div>
        </dl>

        <button class="modal-btn" @click="game.restart()">{{ copy.button }}</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-veil {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(60, 78, 55, 0.28);
  backdrop-filter: blur(5px);
}

.modal {
  position: relative;
  width: min(420px, 100%);
  padding: 30px 28px 26px;
  border-radius: 24px;
  background: linear-gradient(170deg, #ffffff 0%, #f8fbf4 100%);
  box-shadow: 0 20px 50px rgba(70, 95, 60, 0.22);
  text-align: center;
  overflow: hidden;
}

.modal-glow {
  position: absolute;
  top: -70px;
  left: 50%;
  width: 240px;
  height: 160px;
  transform: translateX(-50%);
  border-radius: 50%;
  filter: blur(36px);
  opacity: 0.6;
}

.modal.win .modal-glow {
  background: radial-gradient(circle, #d6f0b4, transparent 70%);
}

.modal.lose .modal-glow {
  background: radial-gradient(circle, #f0e0d4, transparent 70%);
}

.modal-tag {
  position: relative;
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 2px;
  color: #96a88c;
  text-transform: uppercase;
}

.modal-title {
  position: relative;
  margin: 0 0 16px;
  font-size: 25px;
  font-weight: 800;
  color: #3d4a37;
  letter-spacing: 1px;
}

.modal-lines {
  position: relative;
  margin-bottom: 20px;
}

.modal-lines p {
  margin: 5px 0;
  font-size: 13px;
  line-height: 1.85;
  color: #6e8065;
}

.modal-stats {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0 0 22px;
  padding: 14px 8px;
  border-radius: 14px;
  background: rgba(240, 247, 233, 0.8);
}

.modal-stats div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.modal-stats dt {
  font-size: 10.5px;
  color: #93a789;
}

.modal-stats dd {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #4b6b3a;
}

.modal-btn {
  position: relative;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(145deg, #8bc75f, #6aa93f);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(110, 165, 70, 0.28);
  transition: transform 0.15s ease;
}

.modal-btn:hover {
  transform: translateY(-1px);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.24s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(14px) scale(0.97);
}
</style>
