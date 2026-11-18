<script setup lang="ts">
/**
 * 铲子二次确认弹窗
 * 防手滑：点到单位不会立刻消失，先问一句「要收回它吗」，确认后才真正移除并返还梨光。
 */

import { computed } from 'vue'
import { SHOVEL_COPY, UI_COPY } from '@/config/copywriting'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

const game = useGameStore()
const ui = useUiStore()

const pending = computed(() => ui.pendingRemove)

const body = computed(() => {
  const p = pending.value
  if (!p) return ''
  return SHOVEL_COPY.body.replace('{name}', p.name).replace('{refund}', String(p.refund))
})

function confirm(): void {
  const p = pending.value
  if (!p) return
  game.remove(p.unitId)
  ui.cancelRemove()
}

function cancel(): void {
  ui.cancelRemove()
}
</script>

<template>
  <Transition name="confirm">
    <div v-if="pending" class="veil" @click.self="cancel">
      <div class="card">
        <div class="icon">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M15.5 3.2a2.3 2.3 0 0 1 3.3 3.3l-3.1 3.1-3.3-3.3 3.1-3.1Z" fill="#c99a5e" />
            <path d="M11.6 6.9 5.2 13.3l5.5 5.5 6.4-6.4-5.5-5.5Z" fill="#e0b47a" />
            <path
              d="M4.4 14.2c2 0 5.4 3.4 5.4 5.4 0 1.6-1.3 2.4-2.7 2.4-1.9 0-4.6-2.2-4.6-4.6 0-1.6.7-3.2 1.9-3.2Z"
              fill="#a3b8c9"
            />
          </svg>
        </div>
        <h3 class="title">{{ SHOVEL_COPY.title }}</h3>
        <p class="body">{{ body }}</p>
        <p class="hint">{{ SHOVEL_COPY.hint }}</p>
        <div class="actions">
          <button class="btn ghost" @click="cancel">{{ UI_COPY.cancel }}</button>
          <button class="btn confirm" @click="confirm">{{ UI_COPY.confirmRemove }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.veil {
  position: fixed;
  inset: 0;
  z-index: 45;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(60, 78, 55, 0.24);
  backdrop-filter: blur(4px);
}

.card {
  width: min(320px, 100%);
  padding: 22px 22px 18px;
  border-radius: 20px;
  background: linear-gradient(170deg, #ffffff 0%, #f8fbf4 100%);
  box-shadow: 0 18px 44px rgba(70, 95, 60, 0.2);
  text-align: center;
}

.icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fdf1e6;
}

.title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 800;
  color: #3d4a37;
}

.body {
  margin: 0 0 6px;
  font-size: 12.5px;
  line-height: 1.75;
  color: #6e8065;
}

.hint {
  margin: 0 0 16px;
  font-size: 10.5px;
  color: #a3b09a;
}

.actions {
  display: flex;
  gap: 9px;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 11px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.14s ease, background 0.14s ease;
}

.btn.ghost {
  background: #eff4ea;
  color: #6e8065;
}

.btn.ghost:hover {
  background: #e6efdf;
}

.btn.confirm {
  background: linear-gradient(145deg, #f0a0a0, #dc6c6c);
  color: #fff;
  box-shadow: 0 4px 12px rgba(220, 108, 108, 0.26);
}

.btn.confirm:hover {
  transform: translateY(-1px);
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-enter-active .card,
.confirm-leave-active .card {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .card,
.confirm-leave-to .card {
  transform: translateY(10px) scale(0.97);
}
</style>
