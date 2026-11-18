/**
 * 坐标工具：网格 ↔ 屏幕像素
 * 约定：网格坐标 (col, row) 的原点在棋盘左上角，屏幕坐标额外叠加棋盘在画布上的偏移。
 * 单层结构下「行号 = 通道序号」，所以横向通道只要行号就能定位。
 */

import type { GridPos } from '@/types/game'
import { laneRowOf, MAP_CONFIG } from '@/config/map'

export interface Point {
  x: number
  y: number
}

/** 棋盘整体像素尺寸 */
export const BOARD_WIDTH = MAP_CONFIG.cols * MAP_CONFIG.cellSize
export const BOARD_HEIGHT = MAP_CONFIG.rows * MAP_CONFIG.cellSize

/** 格子左上角 → 像素 */
export function cellToScreen(pos: GridPos, cellSize = MAP_CONFIG.cellSize): Point {
  return { x: pos.col * cellSize, y: pos.row * cellSize }
}

/** 格子中心 → 像素 */
export function cellCenter(pos: GridPos, cellSize = MAP_CONFIG.cellSize): Point {
  return { x: (pos.col + 0.5) * cellSize, y: (pos.row + 0.5) * cellSize }
}

/** 单位锚点：格心再上移一点，和路过的敌人错开，避免叠成一团 */
export function unitCenter(pos: GridPos, cellSize = MAP_CONFIG.cellSize): Point {
  const c = cellCenter(pos, cellSize)
  return { x: c.x, y: c.y + MAP_CONFIG.unitOffsetY }
}

/** 像素 → 格子，越界返回 null */
export function screenToCell(x: number, y: number, cellSize = MAP_CONFIG.cellSize): GridPos | null {
  if (x < 0 || y < 0) return null
  const col = Math.floor(x / cellSize)
  const row = Math.floor(y / cellSize)
  if (col < 0 || col >= MAP_CONFIG.cols) return null
  if (row < 0 || row >= MAP_CONFIG.rows) return null
  return { col, row }
}

/** 第 laneIndex 条通道的中线 y */
export function laneCenterY(laneIndex: number, cellSize = MAP_CONFIG.cellSize): number {
  return (laneRowOf(laneIndex) + 0.5) * cellSize
}

/** 敌人行走线 y（比通道中线略低，给单位留出站立空间） */
export function trailY(laneIndex: number, cellSize = MAP_CONFIG.cellSize): number {
  return laneCenterY(laneIndex, cellSize) + MAP_CONFIG.enemyOffsetY
}

/** 敌人出生点 x（棋盘左侧外） */
export const SPAWN_X = MAP_CONFIG.spawnOffset

/** 敌人抵达判定 x（棋盘右侧外） */
export const REACH_END_X = BOARD_WIDTH + 26

/** 像素距离换算成格数 */
export function pxToCells(px: number, cellSize = MAP_CONFIG.cellSize): number {
  return px / cellSize
}

/** 两点像素距离 */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}
