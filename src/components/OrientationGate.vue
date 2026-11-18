<script setup lang="ts">
/**
 * 竖屏引导（可以跳过，绝不挡路）
 *
 * 游戏按横屏设计（4 条通道 + 顶栏 + 建造栏），手机竖着打开时提示一下。
 * 但这层提示以前是硬遮挡，只留一个「全屏横屏」按钮——在 App 内置浏览器 / 微信
 * WebView 里 requestFullscreen 和 orientation.lock 都可能直接不可用，按钮点了没反应，
 * 玩家就彻底进不去游戏了。所以这里守住三条底线：
 *
 * 1. 永远有一个「就在竖屏玩」的出口，点了立刻进游戏，本次会话不再弹。
 * 2. 转成横屏自动消失；判定只用 innerWidth / innerHeight，不依赖
 *    `(orientation: portrait)` 的 change 事件（微信、iOS 旧版 WebView 上那个事件经常不触发），
 *    并且 resize / orientationchange / visualViewport / fullscreenchange 都听一遍，
 *    iOS 尺寸更新偏晚，再补几次延时重测。
 * 3. 非触屏设备（桌面浏览器窗口被拉成竖的）永远不弹，免得电脑上被锁死。
 */

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/** 竖屏宽度小于这个值才提示：再宽（平板竖屏）棋盘也够大，不用打扰 */
const NARROW_WIDTH = 620
const SKIP_KEY = 'pear.orientation.skipped'

type OrientationLock =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'portrait-primary'
  | 'portrait-secondary'

type OrientationLike = ScreenOrientation & { lock?: (o: OrientationLock) => Promise<void> }

const narrowPortrait = ref(false)
const skipped = ref(false)
const busy = ref(false)
const manualTip = ref(false)
const timers = new Set<number>()

const visible = computed(() => narrowPortrait.value && !skipped.value)

function isTouchDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  } catch {
    return 'ontouchstart' in window
  }
}

function measure(): void {
  const w = window.innerWidth
  const h = window.innerHeight
  narrowPortrait.value = isTouchDevice() && h > w && w < NARROW_WIDTH
}

/** 立刻测一次，再补几次延时重测（iOS / WebView 的尺寸变化会晚一两帧才生效） */
function scheduleMeasure(): void {
  measure()
  for (const delay of [120, 320, 700]) {
    const id = window.setTimeout(() => {
      timers.delete(id)
      measure()
    }, delay)
    timers.add(id)
  }
}

function orientationApi(): OrientationLike | null {
  const api = window.screen?.orientation
  return (api as OrientationLike | undefined) ?? null
}

async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
  }
  try {
    if (document.fullscreenElement) return true
    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen({ navigationUI: 'hide' })
      return true
    }
    if (typeof el.webkitRequestFullscreen === 'function') {
      await el.webkitRequestFullscreen()
      return true
    }
  } catch {
    /* 用户拒绝 / WebView 不允许，忽略 */
  }
  return false
}

async function lockLandscape(): Promise<boolean> {
  const api = orientationApi()
  if (!api?.lock) return false
  try {
    await api.lock('landscape')
    return true
  } catch {
    /* 桌面浏览器、iOS、绝大多数 WebView 都不支持，靠玩家自己转 */
    return false
  }
}

async function goLandscape(): Promise<void> {
  if (busy.value) return
  busy.value = true
  manualTip.value = false
  const full = await enterFullscreen()
  const locked = await lockLandscape()
  busy.value = false
  scheduleMeasure()
  // 两个都没成功 = 这台设备没法自动转，别再让玩家点第二次，直接告诉他手动转 / 竖屏玩
  if (!full && !locked) manualTip.value = true
  else window.setTimeout(() => {
    if (narrowPortrait.value) manualTip.value = true
  }, 900)
}

function skip(): void {
  skipped.value = true
  try {
    sessionStorage.setItem(SKIP_KEY, '1')
  } catch {
    /* 隐私模式下 sessionStorage 可能不可写，忽略即可 */
  }
}

function onViewportChange(): void {
  scheduleMeasure()
}

onMounted(() => {
  try {
    skipped.value = sessionStorage.getItem(SKIP_KEY) === '1'
  } catch {
    skipped.value = false
  }
  measure()

  window.addEventListener('resize', onViewportChange, { passive: true })
  window.addEventListener('orientationchange', onViewportChange, { passive: true })
  window.visualViewport?.addEventListener('resize', onViewportChange, { passive: true })
  document.addEventListener('fullscreenchange', onViewportChange)
  try {
    orientationApi()?.addEventListener?.('change', onViewportChange)
  } catch {
    /* 个别 WebView 的 ScreenOrientation 是桩对象，addEventListener 会抛错 */
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('orientationchange', onViewportChange)
  window.visualViewport?.removeEventListener('resize', onViewportChange)
  document.removeEventListener('fullscreenchange', onViewportChange)
  try {
    orientationApi()?.removeEventListener?.('change', onViewportChange)
  } catch {
    /* 同上 */
  }
  for (const id of timers) window.clearTimeout(id)
  timers.clear()
})
</script>

<template>
  <div v-if="visible" class="gate">
    <div class="gate-card">
      <div class="phone">
        <span class="phone-screen" />
        <span class="phone-arrow" />
      </div>
      <h2 class="gate-title">横过来玩更舒服</h2>
      <p class="gate-sub">四条通道铺得开，球也看得清</p>
      <button class="gate-btn" :class="{ dim: manualTip }" :disabled="busy" @click="goLandscape">
        {{ busy ? '正在切换…' : '全屏横屏' }}
      </button>
      <button class="gate-skip" :class="{ hero: manualTip }" @click="skip">就在竖屏玩</button>
      <p class="gate-hint">
        {{ manualTip ? '这台设备不支持自动转屏，把手机转成横的就行' : '也可以直接把手机转成横的' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(170deg, #f6fcf1 0%, #eaf4e4 60%, #e6f1f7 100%);
}

.gate-card {
  text-align: center;
  max-width: 300px;
}

.phone {
  position: relative;
  width: 74px;
  height: 108px;
  margin: 0 auto 22px;
  border-radius: 14px;
  border: 3px solid rgba(122, 156, 104, 0.55);
  background: rgba(255, 255, 255, 0.7);
  animation: tilt 2.4s ease-in-out infinite;
}

.phone-screen {
  position: absolute;
  inset: 8px 8px 14px;
  border-radius: 6px;
  background: linear-gradient(160deg, #dff0cb, #cfe6f4);
}

.phone-arrow {
  position: absolute;
  left: 50%;
  bottom: 5px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-right: 2px solid rgba(122, 156, 104, 0.7);
  border-bottom: 2px solid rgba(122, 156, 104, 0.7);
  transform: rotate(-45deg);
  border-radius: 1px;
}

@keyframes tilt {
  0%,
  100% {
    transform: rotate(0deg);
  }
  45%,
  70% {
    transform: rotate(-90deg);
  }
}

.gate-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 800;
  color: #3d4a37;
  letter-spacing: 0.5px;
}

.gate-sub {
  margin: 0 0 20px;
  font-size: 12.5px;
  color: #7d9370;
}

.gate-btn {
  display: block;
  width: 100%;
  max-width: 190px;
  margin: 0 auto;
  padding: 11px 26px;
  border: none;
  border-radius: 13px;
  background: linear-gradient(145deg, #8bc75f, #6aa93f);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(110, 165, 70, 0.26);
}

.gate-btn:disabled {
  opacity: 0.6;
}

/* 自动转屏不支持时，把主按钮降级，别再引导玩家反复点一个没用的按钮 */
.gate-btn.dim {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(140, 175, 125, 0.45);
  color: #56733f;
  box-shadow: none;
}

/* 出口：必须一眼看得见、点得着，任何设备上都能进游戏 */
.gate-skip {
  display: block;
  width: 100%;
  max-width: 190px;
  margin: 10px auto 0;
  padding: 9px 18px;
  border: 1px solid rgba(140, 175, 125, 0.45);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  color: #56733f;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.gate-skip:active {
  background: #eaf5e0;
}

/* 自动转屏不支持时，「就在竖屏玩」升级成主按钮 */
.gate-skip.hero {
  margin: 0 auto;
  padding: 11px 26px;
  border: none;
  border-radius: 13px;
  background: linear-gradient(145deg, #8bc75f, #6aa93f);
  color: #fff;
  font-size: 13.5px;
  box-shadow: 0 6px 16px rgba(110, 165, 70, 0.26);
}

.gate-skip.hero + .gate-hint {
  margin-top: 14px;
}

.gate-hint {
  margin: 12px 0 0;
  font-size: 10.5px;
  line-height: 1.5;
  color: #a3b09a;
}
</style>
