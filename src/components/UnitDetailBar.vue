<script setup lang="ts">
/**
 * 棋盘下方的一条信息栏
 * 没选单位时显示开局引导；点开某个单位后，变成它的详情条：
 * 产出 / 攻击数值、强化按钮、铲子返还提示。固定高度，不会把棋盘顶得跳来跳去。
 */

import { computed } from 'vue'
import { INTRO_HINT, UI_COPY } from '@/config/copywriting'
import { refundOf } from '@/config/economy'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

const game = useGameStore()
const ui = useUiStore()

const active = computed(() => {
  const engine = game.engine
  if (!engine || ui.activeUnitId == null) return null
  return engine.units.find((u) => u.id === ui.activeUnitId) ?? null
})

const producer = computed(() => active.value?.producer ?? null)
const attacker = computed(() => active.value?.attacker ?? null)

const refund = computed(() => (active.value ? refundOf(active.value.config.cost) : 0))

const canUpgrade = computed(
  () =>
    !!producer.value &&
    !active.value?.boosted &&
    game.hud.pearLight >= producer.value.upgradeCost,
)

function upgrade(): void {
  if (active.value) game.upgrade(active.value.id)
}
</script>

<template>
  <div class="detail-bar">
    <template v-if="active">
      <span class="unit-name">{{ active.config.name }}</span>
      <span v-if="active.boosted" class="badge">已强化</span>

      <span v-if="producer" class="stat">
        每 {{ active.produceInterval }} 秒产出
        <strong>+{{ active.produceAmount }}</strong> 梨光
        <template v-if="!active.boosted">
          · 强化后每 {{ producer.boostedInterval }} 秒 +{{ producer.boostedAmount }}
        </template>
      </span>

      <span v-if="attacker" class="stat">
        每 {{ attacker.attackInterval }} 秒挥拍，伤害
        <strong>{{ attacker.damage }}</strong>
        · 射程 {{ attacker.range }} 格（只打本通道）
      </span>

      <button
        v-if="producer && !active.boosted"
        class="upgrade-btn"
        :disabled="!canUpgrade"
        @click="upgrade"
      >
        {{ UI_COPY.upgrade }} · {{ producer.upgradeCost }} 梨光
      </button>

      <span class="refund">铲子收回返还 {{ refund }}</span>
      <button class="close" :title="UI_COPY.cancel" @click="ui.activeUnitId = null">×</button>
    </template>

    <p v-else class="hint">{{ INTRO_HINT }}</p>
  </div>
</template>

<style scoped>
.detail-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 6px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.62);
}

.hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: #8a9a80;
}

.unit-name {
  font-size: 13px;
  font-weight: 800;
  color: #4b6b3a;
  flex-shrink: 0;
}

.badge {
  padding: 1px 7px;
  border-radius: 999px;
  background: #fdf3d6;
  color: #b8871f;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.stat {
  font-size: 11.5px;
  color: #6e8065;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat strong {
  color: #5d8f3a;
}

.upgrade-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(145deg, #f6c95a, #e0a52f);
  color: #6b4a0c;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(224, 165, 47, 0.24);
}

.upgrade-btn:disabled {
  background: #e9e6d7;
  color: #a89f86;
  box-shadow: none;
  cursor: not-allowed;
}

.refund {
  margin-left: auto;
  font-size: 10.5px;
  color: #a3b09a;
  flex-shrink: 0;
}

.close {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
  color: #93a789;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.close:hover {
  background: rgba(0, 0, 0, 0.08);
}

@media (max-width: 720px) {
  .refund {
    display: none;
  }
  .stat {
    font-size: 10.5px;
  }
}

@media (max-height: 620px) {
  .detail-bar {
    min-height: 30px;
    padding: 3px 10px;
    gap: 8px;
    border-radius: 10px;
  }
  .hint {
    font-size: 10.5px;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .unit-name {
    font-size: 12px;
  }
  .stat {
    font-size: 10px;
  }
  .upgrade-btn {
    padding: 4px 9px;
    font-size: 10.5px;
  }
  .close {
    width: 18px;
    height: 18px;
    font-size: 13px;
  }
}
</style>
