/**
 * 地图配置
 *
 * 结构：4 条横向独立通道，每条通道只占 1 行网格。
 * 这一行同时是「放置区」和「行进道」—— 卷梨 / 站神就种在敌人要走的那条路上，
 * 敌人从左侧入口进场，沿本行直行到右侧终点，不换道、不绕路。
 *
 * 想改棋盘大小，只改这里：格子数、单格像素、通道条数都会自动传导到渲染与判定。
 */

export interface MapConfig {
  id: string
  name: string
  /** 列数 */
  cols: number
  /** 行数，等于通道条数 */
  rows: number
  /** 单格像素边长 */
  cellSize: number
  /** 通道条数 */
  lanes: number
  /** 敌人入场点相对棋盘左边的偏移（负值表示在棋盘外） */
  spawnOffset: number
  /** 单位锚点相对格心的纵向偏移（负值偏上），让单位与路过的敌人错开一点 */
  unitOffsetY: number
  /** 敌人锚点相对格心的纵向偏移（正值偏下） */
  enemyOffsetY: number
}

export const MAP_CONFIG: MapConfig = {
  id: 'pear-court',
  name: '晴空球场',
  cols: 10,
  rows: 4,
  cellSize: 72,
  lanes: 4,
  spawnOffset: -46,
  unitOffsetY: -3,
  enemyOffsetY: 5,
}

/**
 * 第 laneIndex 条通道对应的网格行。
 * 单层结构下「通道序号 = 行号」，保留这个函数是为了以后能改回多层布局而不动业务代码。
 */
export function laneRowOf(laneIndex: number): number {
  return laneIndex
}

/** 网格行对应的通道序号 */
export function laneOfRow(row: number): number {
  return row
}
