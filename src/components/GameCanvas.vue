<script setup lang="ts">
/**
 * 棋盘渲染与交互
 *
 * 职责：Canvas 绘制（背景 / 四条通道 / 单位 / 敌人 / 子弹 / 特效）+ 指针拾取。
 * 结构：4 条横向通道，一条通道一行网格。这一行既是放置区，也是敌人的行进道，
 *      所以单位会和路过的敌人出现在同一水平线上（纵向各偏移几像素避免糊在一起）。
 * 素材全部通过 utils/assets 加载，缺失时退化成程序化占位图形，换图不用改这里。
 */

import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ENEMIES } from '@/config/enemies'
import { MAP_CONFIG } from '@/config/map'
import { UI_COPY, TOAST_COPY } from '@/config/copywriting'
import { UNITS } from '@/config/units'
import { refundOf } from '@/config/economy'
import { GameLoop } from '@/game/GameLoop'
import type { Unit } from '@/game/Unit'
import type { Enemy } from '@/game/Enemy'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import type { FloatEffect } from '@/types/game'
import { getImage, loadImage, preloadImages } from '@/utils/assets'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  cellCenter,
  cellToScreen,
  laneCenterY,
  screenToCell,
  trailY,
} from '@/utils/coordinate'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const game = useGameStore()
const ui = useUiStore()

let ctx: CanvasRenderingContext2D | null = null
let loop: GameLoop | null = null
let hudFrame = 0

const FONT = 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
const BG_SRC = '/assets/bg/bg.png'
const CS = MAP_CONFIG.cellSize

/** 需要的素材清单：单位、敌人、子弹、背景 */
const SPRITE_LIST = (() => {
  const list: string[] = [BG_SRC]
  for (const unit of Object.values(UNITS)) {
    list.push(unit.sprite)
    if (unit.role === 'attacker') list.push(unit.bulletSprite)
  }
  for (const enemy of Object.values(ENEMIES)) list.push(enemy.sprite)
  return Array.from(new Set(list))
})()

// ---------------- 画布尺寸 ----------------

/**
 * 画布像素密度跟随显示尺寸
 * 棋盘逻辑坐标固定 720×288，但实际显示可能宽到 1100+，只按 devicePixelRatio 设置会发虚
 * （桌面外接屏常见 dpr = 1）。这里取「dpr 与 显示宽度 / 逻辑宽度 的较大值」，
 * 保证放大后仍然是实像素。
 */
function setupCanvas(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssWidth = canvas.getBoundingClientRect().width || BOARD_WIDTH
  const scale = Math.min(3, Math.max(dpr, cssWidth / BOARD_WIDTH))
  canvas.width = Math.round(BOARD_WIDTH * scale)
  canvas.height = Math.round(BOARD_HEIGHT * scale)
  ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(scale, 0, 0, scale, 0, 0)
}

/** 屏幕坐标 → 棋盘逻辑坐标（CSS 缩放不影响拾取） */
function toBoard(ev: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  return {
    x: ((ev.clientX - rect.left) / rect.width) * BOARD_WIDTH,
    y: ((ev.clientY - rect.top) / rect.height) * BOARD_HEIGHT,
  }
}

// ---------------- 绘制工具 ----------------

function drawSprite(src: string, x: number, y: number, size: number): boolean {
  if (!ctx) return false
  const img = getImage(src)
  if (!img) return false
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
  return true
}

function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  if (!ctx) return
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** 卷梨占位图形：一颗圆滚滚的梨 */
function drawPearShape(x: number, y: number, r: number, boosted: boolean): void {
  if (!ctx) return
  ctx.save()
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r)
  grad.addColorStop(0, boosted ? '#d9f2a8' : '#c8e79b')
  grad.addColorStop(1, boosted ? '#8cbb4e' : '#9ccb6a')
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.06, r * 0.86, r, 0, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(74, 110, 40, 0.55)'
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(x + r * 0.22, y - r * 0.86, r * 0.26, r * 0.13, -0.6, 0, Math.PI * 2)
  ctx.fillStyle = '#7cb342'
  ctx.fill()

  const eyeY = y - r * 0.08
  const eyeR = Math.max(1.4, r * 0.11)
  ctx.fillStyle = '#3f5a26'
  ctx.beginPath()
  ctx.arc(x - r * 0.3, eyeY, eyeR, 0, Math.PI * 2)
  ctx.arc(x + r * 0.3, eyeY, eyeR, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(240, 140, 140, 0.4)'
  ctx.beginPath()
  ctx.arc(x - r * 0.52, eyeY + r * 0.24, r * 0.14, 0, Math.PI * 2)
  ctx.arc(x + r * 0.52, eyeY + r * 0.24, r * 0.14, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** 站神占位图形：蓝帽小哨兵 */
function drawGuardianShape(x: number, y: number, r: number): void {
  if (!ctx) return
  ctx.save()
  roundRect(x - r * 0.72, y - r * 0.45, r * 1.44, r * 1.3, r * 0.42)
  const grad = ctx.createLinearGradient(x, y - r, x, y + r)
  grad.addColorStop(0, '#8cc7f2')
  grad.addColorStop(1, '#5aa9e6')
  ctx.fillStyle = grad
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(35, 88, 138, 0.55)'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(x, y - r * 0.45, r * 0.78, Math.PI, Math.PI * 2)
  ctx.fillStyle = '#3f8fd1'
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - r * 0.28, y, r * 0.19, 0, Math.PI * 2)
  ctx.arc(x + r * 0.28, y, r * 0.19, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1f4f75'
  ctx.beginPath()
  ctx.arc(x - r * 0.26, y + r * 0.02, r * 0.09, 0, Math.PI * 2)
  ctx.arc(x + r * 0.3, y + r * 0.02, r * 0.09, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#3f8fd1'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.2)
  ctx.lineTo(x, y - r * 1.42)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y - r * 1.5, r * 0.12, 0, Math.PI * 2)
  ctx.fillStyle = '#f4c542'
  ctx.fill()
  ctx.restore()
}

/** 易帝占位图形：橙团子 */
function drawYidiShape(x: number, y: number, r: number, flash: boolean): void {
  if (!ctx) return
  ctx.save()
  const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.2, x, y, r)
  grad.addColorStop(0, flash ? '#ffffff' : '#f6c98a')
  grad.addColorStop(1, flash ? '#ffeacc' : '#e39b3c')
  ctx.beginPath()
  ctx.ellipse(x, y, r * 0.9, r, 0, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(150, 96, 30, 0.5)'
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x - r * 0.5, y - r * 0.7)
  ctx.lineTo(x - r * 0.68, y - r * 1.22)
  ctx.lineTo(x - r * 0.18, y - r * 0.9)
  ctx.closePath()
  ctx.moveTo(x + r * 0.5, y - r * 0.7)
  ctx.lineTo(x + r * 0.68, y - r * 1.22)
  ctx.lineTo(x + r * 0.18, y - r * 0.9)
  ctx.closePath()
  ctx.fillStyle = '#c98430'
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - r * 0.3, y - r * 0.12, r * 0.22, 0, Math.PI * 2)
  ctx.arc(x + r * 0.3, y - r * 0.12, r * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#6b4416'
  ctx.beginPath()
  ctx.arc(x - r * 0.28, y - r * 0.1, r * 0.1, 0, Math.PI * 2)
  ctx.arc(x + r * 0.32, y - r * 0.1, r * 0.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#8a5a1e'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(x, y + r * 0.32, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  ctx.restore()
}

// ---------------- 各图层 ----------------

function drawBackground(): void {
  if (!ctx) return
  const img = getImage(BG_SRC)
  if (img) {
    // cover 裁剪：等比放大铺满棋盘，居中裁切，绝不拉伸变形
    const scale = Math.max(BOARD_WIDTH / img.width, BOARD_HEIGHT / img.height)
    const w = img.width * scale
    const h = img.height * scale
    // 只当质感底：压低不透明度，让上面的草地条纹仍占主导
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.drawImage(img, (BOARD_WIDTH - w) / 2, (BOARD_HEIGHT - h) / 2, w, h)
    ctx.restore()
    return
  }
  const grad = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT)
  grad.addColorStop(0, '#f4fbf0')
  grad.addColorStop(0.5, '#eaf7e4')
  grad.addColorStop(1, '#e2f2f7')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
}

/**
 * 四条通道
 * 每条通道＝一整块草地（深浅交替，像修过的草坪），通道之间用一条白缝分开。
 * 敌人走在这条通道的中下位置，脚印用一排很淡的虚线点出来，不画横带 —— 画横带会让
 * 一条通道看起来像两条，四条路就分不清了。
 */
function drawLanes(): void {
  if (!ctx) return
  for (let lane = 0; lane < MAP_CONFIG.lanes; lane += 1) {
    const top = lane * CS

    ctx.fillStyle = lane % 2 === 0 ? 'rgba(219, 240, 176, 0.72)' : 'rgba(200, 229, 156, 0.72)'
    ctx.fillRect(0, top, BOARD_WIDTH, CS)

    // 脚印线：沿敌人行走的 y 撒一排小点，淡淡的，读起来像“走这边”
    const y = trailY(lane)
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'
    for (let x = 16; x < BOARD_WIDTH - 8; x += 22) {
      ctx.beginPath()
      ctx.ellipse(x, y, 3.4, 1.8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // 通道之间的白缝
    if (lane > 0) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(0, top)
      ctx.lineTo(BOARD_WIDTH, top)
      ctx.stroke()
      ctx.restore()
    }
  }
}

/** 列分隔：很淡的竖线，用来确认「一格一格」 */
function drawGridLines(): void {
  if (!ctx) return
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)'
  ctx.lineWidth = 1
  for (let col = 1; col < MAP_CONFIG.cols; col += 1) {
    ctx.beginPath()
    ctx.moveTo(col * CS + 0.5, 0)
    ctx.lineTo(col * CS + 0.5, BOARD_HEIGHT)
    ctx.stroke()
  }
  ctx.restore()
}

/** 左侧入口：虚线 + 三个小箭头，提示敌人从这边进来 */
function drawEntrance(): void {
  if (!ctx) return
  ctx.save()
  ctx.setLineDash([6, 8])
  ctx.strokeStyle = 'rgba(126, 150, 112, 0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(9, 0)
  ctx.lineTo(9, BOARD_HEIGHT)
  ctx.stroke()
  ctx.restore()

  for (let lane = 0; lane < MAP_CONFIG.lanes; lane += 1) {
    const y = laneCenterY(lane)
    ctx.save()
    ctx.strokeStyle = 'rgba(126, 150, 112, 0.4)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    for (let i = 0; i < 2; i += 1) {
      const x = 12 + i * 7
      ctx.beginPath()
      ctx.moveTo(x, y - 5)
      ctx.lineTo(x + 5, y)
      ctx.lineTo(x, y + 5)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** 右侧终点：四条通道各一扇小门 */
function drawGoal(): void {
  if (!ctx) return
  const cx = BOARD_WIDTH - CS * 0.32
  const halfW = 13
  for (let lane = 0; lane < MAP_CONFIG.lanes; lane += 1) {
    const y = laneCenterY(lane)
    const top = y - CS * 0.32
    const bottom = y + CS * 0.32
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(cx - halfW, bottom)
    ctx.lineTo(cx - halfW, y - CS * 0.08)
    ctx.quadraticCurveTo(cx - halfW, top, cx, top)
    ctx.quadraticCurveTo(cx + halfW, top, cx + halfW, y - CS * 0.08)
    ctx.lineTo(cx + halfW, bottom)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 249, 235, 0.95)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(198, 168, 120, 0.9)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx, bottom)
    ctx.lineTo(cx, y - CS * 0.12)
    ctx.strokeStyle = 'rgba(198, 168, 120, 0.45)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.restore()
  }
}

/** 悬浮高亮：先于实体绘制，避免盖住单位 */
function drawHover(): void {
  if (!ctx) return
  const hover = ui.hoverCell
  if (!hover) return
  const engine = game.engine
  if (!engine) return
  const cell = engine.map.getCell(hover.col, hover.row)
  if (!cell) return

  const unit = engine.getUnitAt(hover)
  const { x, y } = cellToScreen(hover, CS)

  ctx.save()
  if (ui.shovelMode) {
    // 铲子模式：有单位才有活干，红色提示要收回的东西
    if (unit) {
      ctx.fillStyle = 'rgba(224, 108, 108, 0.14)'
      ctx.fillRect(x, y, CS, CS)
      ctx.strokeStyle = 'rgba(214, 92, 92, 0.95)'
      ctx.lineWidth = 3
      ctx.setLineDash([7, 5])
      ctx.strokeRect(x + 2, y + 2, CS - 4, CS - 4)
    } else {
      ctx.strokeStyle = 'rgba(150, 165, 180, 0.45)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, CS - 2, CS - 2)
    }
    ctx.restore()
    return
  }

  if (unit) {
    // 已有单位：只描边，表示可以点开查看
    ctx.strokeStyle = 'rgba(217, 144, 47, 0.9)'
    ctx.lineWidth = 3
    ctx.strokeRect(x + 1.5, y + 1.5, CS - 3, CS - 3)
  } else if (cell.buildable) {
    ctx.fillStyle = ui.selectedUnitType ? 'rgba(123, 196, 90, 0.26)' : 'rgba(123, 196, 90, 0.13)'
    ctx.fillRect(x, y, CS, CS)
    ctx.strokeStyle = 'rgba(96, 168, 66, 0.95)'
    ctx.lineWidth = 2.5
    ctx.strokeRect(x + 1.25, y + 1.25, CS - 2.5, CS - 2.5)
  } else {
    ctx.strokeStyle = 'rgba(150, 165, 180, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, CS - 2, CS - 2)
  }
  ctx.restore()
}

/**
 * 射程带
 * 站神只能打同一条通道，所以射程画成「本通道内的一段横向带」，
 * 而不是一个圆 —— 视觉和真实判定完全一致，不会让人误以为能打到隔壁路。
 */
function drawRangeBand(x: number, laneIndex: number, rangePx: number, strong: boolean): void {
  if (!ctx) return
  const left = Math.max(0, x - rangePx)
  const right = Math.min(BOARD_WIDTH, x + rangePx)
  const top = laneIndex * CS + CS * 0.12
  const height = CS * 0.76

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, laneIndex * CS, BOARD_WIDTH, CS)
  ctx.clip()

  roundRect(left, top, right - left, height, 12)
  ctx.fillStyle = strong ? 'rgba(90, 169, 230, 0.18)' : 'rgba(90, 169, 230, 0.13)'
  ctx.fill()
  ctx.setLineDash([8, 7])
  ctx.lineWidth = 2
  ctx.strokeStyle = strong ? 'rgba(74, 152, 214, 0.9)' : 'rgba(74, 152, 214, 0.6)'
  ctx.stroke()
  ctx.restore()
}

/** 放置预览：选中单位类型后，在悬浮格子上画半透明预览与射程带 */
function drawPlacePreview(): void {
  if (!ctx) return
  const type = ui.selectedUnitType
  const hover = ui.hoverCell
  if (!type || !hover) return
  const engine = game.engine
  if (!engine) return
  if (!engine.map.isBuildable(hover) || engine.getUnitAt(hover)) return

  const cfg = UNITS[type]
  const center = cellCenter(hover)
  const centerY = center.y + MAP_CONFIG.unitOffsetY

  if (cfg.role === 'attacker') {
    drawRangeBand(center.x, hover.row, cfg.range * CS, false)
  }

  ctx.save()
  ctx.globalAlpha = 0.55
  const r = (CS / 2) * cfg.drawScale
  if (!drawSprite(cfg.sprite, center.x, centerY, r * 2)) {
    if (type === 'pear') drawPearShape(center.x, centerY, r, false)
    else drawGuardianShape(center.x, centerY, r)
  }
  ctx.restore()
}

function drawUnit(unit: Unit): void {
  if (!ctx) return
  const cfg = unit.config
  const r = (CS / 2) * cfg.drawScale

  // 底座阴影
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(unit.x, unit.y + r * 0.92, r * 0.7, r * 0.2, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(90, 110, 80, 0.13)'
  ctx.fill()
  ctx.restore()

  // 冷却环
  const ratio = unit.cooldownRatio
  if (ratio > 0 && ratio < 1) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(unit.x, unit.y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
    ctx.strokeStyle = cfg.accent
    ctx.globalAlpha = 0.3
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  // 挥拍时身体朝目标侧轻微前倾，动作用姿势表达，不加额外贴图
  const swing = unit.isAttacker ? unit.swingProgress : 0
  const dir = Math.cos(unit.aimAngle) >= 0 ? 1 : -1
  const tilt = swing > 0 ? Math.sin(swing * Math.PI) * 0.16 * dir : 0

  const img = getImage(cfg.sprite)
  ctx.save()
  ctx.translate(unit.x, unit.y + r * 0.86)
  ctx.rotate(tilt)
  if (img) {
    ctx.drawImage(img, -r, -r * 0.86 - r, r * 2, r * 2)
  } else {
    ctx.translate(-unit.x, -(unit.y + r * 0.86))
    if (unit.type === 'pear') drawPearShape(unit.x, unit.y, r, unit.boosted)
    else drawGuardianShape(unit.x, unit.y, r)
  }
  ctx.restore()

  // 强化标记
  if (unit.boosted) {
    ctx.save()
    const t = performance.now() / 600
    const starY = unit.y - r * 1.3 + Math.sin(t) * 2
    ctx.fillStyle = '#f4c542'
    ctx.beginPath()
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5
      const px = unit.x + Math.cos(angle) * 6
      const py = starY + Math.sin(angle) * 6
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
      const innerAngle = angle + Math.PI / 5
      ctx.lineTo(unit.x + Math.cos(innerAngle) * 2.6, starY + Math.sin(innerAngle) * 2.6)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // 强化瞬间的光晕
  if (unit.flash > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(0.55, unit.flash)
    ctx.beginPath()
    ctx.arc(unit.x, unit.y, r + 16 * unit.flash, 0, Math.PI * 2)
    ctx.fillStyle = '#ffe9a8'
    ctx.fill()
    ctx.restore()
  }
}

/** 站神挥拍：手上球拍沿一段弧扫过，附带白色挥拍残影 */
function drawSwingArm(unit: Unit): void {
  if (!ctx) return
  const p = unit.swingProgress
  if (p <= 0 || p >= 1) return
  const cfg = unit.attacker
  if (!cfg) return

  const r = (CS / 2) * unit.config.drawScale
  const ease = 1 - Math.pow(1 - p, 3)
  const aim = Number.isFinite(unit.aimAngle) ? unit.aimAngle : Math.PI
  const from = aim - 0.95
  const to = aim + 0.55
  const a = from + (to - from) * ease
  // 半径大于身体，球拍绕着小人的外侧扫，不糊脸
  const radius = r * 1.35
  // 纵向压扁，让球拍贴着身体两侧横扫，最上面一行也不会被画布切掉
  const squash = 0.45

  ctx.save()
  ctx.globalAlpha = 0.42 * (1 - p)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(unit.x, unit.y, radius, radius * squash, 0, from, a)
  ctx.stroke()
  ctx.restore()

  const px = unit.x + Math.cos(a) * radius
  const py = unit.y + Math.sin(a) * radius * squash
  const size = r * 0.85
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(a + Math.PI / 2)
  const img = getImage(cfg.bulletSprite)
  if (img) {
    ctx.shadowColor = 'rgba(32, 78, 128, 0.32)'
    ctx.shadowBlur = 5
    ctx.shadowOffsetY = 2
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
  } else {
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.1, size * 0.32, size * 0.34, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#d24b3f'
    ctx.fill()
    ctx.fillRect(-size * 0.07, size * 0.16, size * 0.14, size * 0.34)
  }
  ctx.restore()
}

/** 被铲走单位的淡出残影：整体上浮 + 变透明 + 一圈收拢的光 */
function drawGhosts(): void {
  if (!ctx) return
  const engine = game.engine
  if (!engine) return
  for (const ghost of engine.ghosts) {
    const t = 1 - ghost.life / ghost.maxLife // 0 → 1
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - t) * 0.85
    const scale = 1 + t * 0.12
    const y = ghost.y - t * 20
    const img = getImage(ghost.sprite)
    if (img) {
      ctx.drawImage(img, ghost.x - (ghost.size * scale) / 2, y - (ghost.size * scale) / 2, ghost.size * scale, ghost.size * scale)
    } else {
      ctx.beginPath()
      ctx.arc(ghost.x, y, ghost.size * 0.4 * scale, 0, Math.PI * 2)
      ctx.fillStyle = ghost.accent
      ctx.fill()
    }
    // 收拢的小光环
    ctx.beginPath()
    ctx.arc(ghost.x, y, ghost.size * (0.5 + t * 0.4), 0, Math.PI * 2)
    ctx.strokeStyle = ghost.accent
    ctx.globalAlpha = Math.max(0, 0.5 - t * 0.5)
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
}

function drawEnemy(enemy: Enemy): void {
  if (!ctx) return
  const cfg = enemy.config
  const r = (CS / 2) * cfg.drawScale
  const bob = Math.sin(performance.now() / 240 + enemy.bobPhase) * 2

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(enemy.x, enemy.y + r * 0.95, r * 0.58, r * 0.16, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(120, 100, 70, 0.14)'
  ctx.fill()
  ctx.restore()

  // 敌人和单位站在同一条通道上，走过时会重叠。给敌人一层很淡的白色描光，
  // 让它的剪影始终能从小人身上“浮”出来，不会糊成一团。
  ctx.save()
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
  ctx.shadowBlur = 7
  const drawn = drawSprite(cfg.sprite, enemy.x, enemy.y + bob, r * 2)
  ctx.restore()
  if (!drawn) drawYidiShape(enemy.x, enemy.y + bob, r, enemy.hitFlash > 0)

  // 受击：一团白色光晕，配合音效给出即时反馈
  if (enemy.hitFlash > 0) {
    const gl = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, r * 1.15)
    gl.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.6, enemy.hitFlash * 2.6)})`)
    gl.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.save()
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, r * 1.15, 0, Math.PI * 2)
    ctx.fillStyle = gl
    ctx.fill()
    ctx.restore()
  }

  // 血条
  const barW = 30
  const barH = 4.5
  const barX = enemy.x - barW / 2
  const barY = enemy.y - r * 0.9 - 5
  ctx.save()
  roundRect(barX, barY, barW, barH, 2.2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fill()
  roundRect(barX, barY, barW * enemy.hpRatio, barH, 2.2)
  ctx.fillStyle = enemy.hpRatio > 0.5 ? '#7bc45f' : enemy.hpRatio > 0.25 ? '#f0b64b' : '#e06c6c'
  ctx.fill()
  ctx.restore()
}

function drawBullets(): void {
  if (!ctx) return
  const engine = game.engine
  if (!engine) return
  for (const bullet of engine.bullets) {
    if (!bullet.alive) continue
    const size = bullet.radius * 3.6

    // 蓝色拖尾：让球拍的来路看得出来
    ctx.save()
    const trail = ctx.createLinearGradient(
      bullet.x - Math.cos(bullet.angle) * size,
      bullet.y - Math.sin(bullet.angle) * size,
      bullet.x,
      bullet.y,
    )
    trail.addColorStop(0, 'rgba(120, 200, 255, 0)')
    trail.addColorStop(1, 'rgba(120, 200, 255, 0.55)')
    ctx.strokeStyle = trail
    ctx.lineWidth = bullet.radius * 0.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(bullet.x - Math.cos(bullet.angle) * size, bullet.y - Math.sin(bullet.angle) * size)
    ctx.lineTo(bullet.x, bullet.y)
    ctx.stroke()
    ctx.restore()

    const img = getImage(bullet.sprite)
    if (img) {
      ctx.save()
      ctx.translate(bullet.x, bullet.y)
      ctx.rotate(bullet.spin + bullet.angle)
      // 浅色球拍放在浅色球场上容易糊，加一层柔和投影把轮廓托出来
      ctx.shadowColor = 'rgba(32, 78, 128, 0.38)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2
      ctx.drawImage(img, -size / 2, -size / 2, size, size)
      ctx.restore()
      continue
    }

    ctx.save()
    const grad = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.radius * 1.6)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.45, '#8cd0ff')
    grad.addColorStop(1, 'rgba(90, 169, 230, 0)')
    ctx.beginPath()
    ctx.arc(bullet.x, bullet.y, bullet.radius * 1.6, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()
  }
}

function drawEffects(effects: FloatEffect[]): void {
  if (!ctx) return
  for (const effect of effects) {
    const progress = 1 - effect.life / effect.maxLife
    ctx.save()
    if (effect.kind === 'ring') {
      ctx.globalAlpha = Math.max(0, 1 - progress)
      ctx.beginPath()
      ctx.arc(effect.x, effect.y, 12 + progress * 46, 0, Math.PI * 2)
      ctx.lineWidth = 3
      ctx.strokeStyle = effect.color
      ctx.stroke()
    } else {
      ctx.globalAlpha = Math.max(0, 1 - progress * progress)
      ctx.font = `bold 14px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.strokeText(effect.text, effect.x, effect.y - progress * 26)
      ctx.fillStyle = effect.color
      ctx.fillText(effect.text, effect.x, effect.y - progress * 26)
    }
    ctx.restore()
  }
}

/** 选中单位：射程带 + 虚线框 */
function drawSelected(): void {
  if (!ctx) return
  const engine = game.engine
  if (!engine) return
  const active = engine.units.find((u) => u.id === ui.activeUnitId)
  if (!active) return

  const range = active.attacker
  if (range) drawRangeBand(active.x, active.laneIndex, range.range * CS, true)

  const { x, y } = cellToScreen(active.pos, CS)
  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = 'rgba(226, 179, 60, 0.95)'
  ctx.lineWidth = 2.5
  ctx.strokeRect(x + 2, y + 2, CS - 4, CS - 4)
  ctx.restore()
}

/** 首波开始前的引导：棋盘中间一条会呼吸的小提示 */
function drawIdleHint(): void {
  if (!ctx) return
  const engine = game.engine
  if (!engine) return
  if (engine.units.length > 0 || engine.waveInProgress || engine.waveIndex > 0) return

  const text = '敌人从左边来 · 把单位种在通道上'
  const cx = BOARD_WIDTH / 2
  const cy = BOARD_HEIGHT / 2
  const t = (performance.now() / 1200) % 1
  const alpha = 0.78 + Math.sin(t * Math.PI * 2) * 0.12

  ctx.save()
  ctx.font = `bold 13px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width

  // 垫一条半透明胶囊，避免文字直接压在格子线上显得脏
  ctx.globalAlpha = alpha
  roundRect(cx - w / 2 - 15, cy - 15, w + 30, 30, 15)
  ctx.fillStyle = 'rgba(255, 253, 246, 0.86)'
  ctx.fill()

  ctx.fillStyle = '#6f8a5c'
  ctx.fillText(text, cx, cy)
  ctx.restore()
}

// ---------------- 主绘制 ----------------

function draw(): void {
  if (!ctx) return
  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

  drawBackground()
  drawLanes()
  drawGridLines()
  drawEntrance()
  drawGoal()
  drawIdleHint()

  const engine = game.engine
  if (!engine) return

  // 悬浮与预览先画，避免盖住单位
  drawHover()
  drawPlacePreview()
  drawSelected()

  // 单位按 y 排序，下面的盖住上面的，前后关系更自然
  const units = [...engine.units].sort((a, b) => a.y - b.y)
  for (const unit of units) {
    drawUnit(unit)
    drawSwingArm(unit)
  }

  drawGhosts()

  const enemies = [...engine.enemies].sort((a, b) => a.y - b.y)
  for (const enemy of enemies) drawEnemy(enemy)

  drawBullets()
  drawEffects(engine.effects)
}

// ---------------- 交互 ----------------

function handlePointerMove(ev: MouseEvent): void {
  const p = toBoard(ev)
  if (!p) return
  ui.setHover(screenToCell(p.x, p.y))
}

function handlePointerLeave(): void {
  ui.setHover(null)
}

function handleClick(ev: MouseEvent): void {
  const p = toBoard(ev)
  if (!p) return
  const cell = screenToCell(p.x, p.y)
  if (!cell) return

  const engine = game.engine
  if (!engine) return
  if (engine.status === 'victory' || engine.status === 'defeat') return

  const unit = engine.getUnitAt(cell)

  // 铲子优先：点到单位才弹二次确认，点到空地只提示一下
  if (ui.shovelMode) {
    if (unit) {
      ui.askRemove({ unitId: unit.id, name: unit.config.name, refund: refundOf(unit.config.cost) })
    } else {
      ui.toast(TOAST_COPY.shovelEmpty)
    }
    return
  }

  if (unit) {
    ui.activeUnitId = unit.id
    ui.selectedUnitType = null
    return
  }

  if (ui.selectedUnitType) {
    game.build(ui.selectedUnitType, cell)
    return
  }

  ui.activeUnitId = null
}

function handleContextMenu(ev: MouseEvent): void {
  ev.preventDefault()
  ui.clearSelection()
}

// ---------------- 生命周期 ----------------

onMounted(async () => {
  setupCanvas()
  void preloadImages(SPRITE_LIST)
  for (const src of SPRITE_LIST) void loadImage(src)

  loop = new GameLoop(() => {
    const engine = game.engine
    if (engine) engine.update(1 / 60)
    draw()
    hudFrame += 1
    if (hudFrame % 4 === 0) game.syncHud()
  })
  loop.start()

  window.addEventListener('resize', setupCanvas)
})

onBeforeUnmount(() => {
  loop?.stop()
  loop = null
  window.removeEventListener('resize', setupCanvas)
})

defineExpose({ draw })
</script>

<template>
  <div class="board-wrap" :class="{ 'shovel-active': ui.shovelMode }">
    <canvas
      ref="canvasRef"
      class="board"
      @mousemove="handlePointerMove"
      @mouseleave="handlePointerLeave"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    />
    <div v-if="ui.shovelMode" class="tool-flag">
      {{ UI_COPY.shovel }} · {{ UI_COPY.shovelTip }}
    </div>
    <div v-if="game.hud.status === 'paused'" class="paused-veil">
      <div class="paused-card">
        <p class="paused-title">先歇一会儿</p>
        <p class="paused-sub">点顶部的「继续」随时回来</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-wrap {
  position: relative;
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 12px 28px rgba(96, 130, 90, 0.16);
  background: #f4fbf0;
}

.board {
  display: block;
  width: 100%;
  height: auto;
  cursor: pointer;
  touch-action: manipulation;
}

.shovel-active .board {
  cursor: cell;
}

.tool-flag {
  position: absolute;
  left: 10px;
  bottom: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(224, 108, 108, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  pointer-events: none;
}

.paused-veil {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(244, 251, 240, 0.62);
  backdrop-filter: blur(3px);
}

.paused-card {
  padding: 18px 30px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 24px rgba(96, 130, 90, 0.18);
  text-align: center;
}

.paused-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #4b6b3a;
}

.paused-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #7d9370;
}
</style>
