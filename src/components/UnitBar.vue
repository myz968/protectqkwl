<script setup lang="ts">
/**
 * 建造栏（横屏横向排布）
 * 左边是两种单位的卡片，最右边是铲子。
 * 选单位 → 点棋盘放置；选铲子 → 点棋盘上的单位收回（会二次确认）。
 */

import { computed } from 'vue'
import { UNITS, UNIT_ORDER } from '@/config/units'
import { UI_COPY } from '@/config/copywriting'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import type { UnitType } from '@/types/game'
import { assetUrl } from '@/utils/assets'

const game = useGameStore()
const ui = useUiStore()

const hud = computed(() => game.hud)

function pick(type: UnitType): void {
  ui.selectUnit(type)
}
</script>

<template>
  <section class="bar">
    <div class="bar-cards">
      <button
        v-for="type in UNIT_ORDER"
        :key="type"
        class="card"
        :class="{
          active: ui.selectedUnitType === type,
          poor: hud.pearLight < UNITS[type].cost,
        }"
        :title="UNITS[type].desc"
        @click="pick(type)"
      >
        <span class="thumb" :style="{ background: UNITS[type].accent }">
          <img :src="assetUrl(UNITS[type].sprite)" :alt="UNITS[type].name" />
        </span>
        <span class="card-text">
          <span class="card-name">{{ UNITS[type].name }}</span>
          <span class="card-cost">{{ UNITS[type].cost }} 梨光</span>
        </span>
      </button>

      <span class="divider" aria-hidden="true" />

      <button
        class="card shovel"
        :class="{ active: ui.shovelMode }"
        :title="UI_COPY.shovelTip"
        @click="ui.toggleShovel()"
      >
        <span class="thumb shovel-thumb">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M15.5 3.2a2.3 2.3 0 0 1 3.3 3.3l-3.1 3.1-3.3-3.3 3.1-3.1Z"
              fill="#b98a4e"
            />
            <path d="M11.6 6.9 5.2 13.3l5.5 5.5 6.4-6.4-5.5-5.5Z" fill="#d9a869" />
            <path
              d="M4.4 14.2c2 0 5.4 3.4 5.4 5.4 0 1.6-1.3 2.4-2.7 2.4-1.9 0-4.6-2.2-4.6-4.6 0-1.6.7-3.2 1.9-3.2Z"
              fill="#8fa9bd"
            />
          </svg>
        </span>
        <span class="card-text">
          <span class="card-name">{{ UI_COPY.shovel }}</span>
          <span class="card-cost">返还一半</span>
        </span>
      </button>
    </div>

    <p class="tip" :class="{ danger: ui.shovelMode }">
      <template v-if="ui.shovelMode">{{ UI_COPY.shovel }}已拿起 · 点通道上的单位收回</template>
      <template v-else-if="ui.selectedUnitType"
        >已选 {{ UNITS[ui.selectedUnitType].name }} · 点通道上的空格放下</template
      >
      <template v-else>选一个单位，再点通道上的格子</template>
    </p>
  </section>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 5px 16px rgba(96, 130, 90, 0.09);
}

.bar-cards {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px 5px 6px;
  border-radius: 13px;
  border: 1.5px solid rgba(160, 190, 145, 0.35);
  background: rgba(250, 253, 247, 0.95);
  cursor: pointer;
  transition: all 0.16s ease;
}

.card:hover {
  border-color: rgba(120, 175, 95, 0.65);
  background: #f2faea;
}

.card.active {
  border-color: #6fae3f;
  background: #eef8e3;
  box-shadow: 0 0 0 3px rgba(120, 180, 90, 0.16);
}

.card.poor {
  opacity: 0.62;
}

.divider {
  width: 1px;
  height: 26px;
  background: rgba(160, 190, 145, 0.4);
  margin: 0 2px;
}

.thumb {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  flex-shrink: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.1);
}

.thumb img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  display: block;
}

.shovel-thumb {
  background: linear-gradient(160deg, #f3f7ef, #e2ecdb);
}

.card-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-align: left;
}

.card-name {
  font-size: 13px;
  font-weight: 700;
  color: #3d4a37;
  line-height: 1.2;
}

.card-cost {
  font-size: 10.5px;
  color: #8a9a80;
  line-height: 1.2;
}

.shovel.active {
  border-color: #d65c5c;
  background: #fdeeee;
  box-shadow: 0 0 0 3px rgba(214, 92, 92, 0.14);
}

.tip {
  margin: 0 0 0 auto;
  font-size: 11.5px;
  color: #93a789;
  text-align: right;
  flex-shrink: 0;
}

.tip.danger {
  color: #c46a6a;
}

@media (max-width: 720px) {
  .bar {
    gap: 8px;
    padding: 7px 10px;
  }
  .tip {
    display: none;
  }
  .card {
    padding: 4px 9px 4px 5px;
  }
}
</style>
