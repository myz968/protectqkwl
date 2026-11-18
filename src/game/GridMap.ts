/**
 * 网格地图
 * 职责：把 MAP_CONFIG 展开成格子矩阵，回答「这个位置能不能放东西」。
 * 单层结构：一条通道就是一行，这行既是敌人的行进道，也是单位的放置位。
 * 不持有单位、不画图，保持纯数据。
 */

import { laneOfRow, MAP_CONFIG, type MapConfig } from '@/config/map'
import type { Cell, GridPos } from '@/types/game'

export class GridMap {
  readonly config: MapConfig
  readonly cols: number
  readonly rows: number
  readonly cellSize: number
  /** cells[row][col] */
  readonly cells: Cell[][]

  constructor(config: MapConfig = MAP_CONFIG) {
    this.config = config
    this.cols = config.cols
    this.rows = config.rows
    this.cellSize = config.cellSize
    this.cells = this.build()
  }

  private build(): Cell[][] {
    const grid: Cell[][] = []
    for (let row = 0; row < this.rows; row += 1) {
      const line: Cell[] = []
      for (let col = 0; col < this.cols; col += 1) {
        line.push({
          col,
          row,
          type: 'lane',
          laneIndex: laneOfRow(row),
          buildable: true,
        })
      }
      grid.push(line)
    }
    return grid
  }

  getCell(col: number, row: number): Cell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null
    return this.cells[row][col]
  }

  /** 这一格能不能放单位（是否已被占由引擎判断） */
  isBuildable(pos: GridPos): boolean {
    return this.getCell(pos.col, pos.row)?.buildable === true
  }

  /** 该格属于第几条通道。单层结构下就是行号，保留函数以便以后扩展多层 */
  laneIndexOf(pos: GridPos): number {
    return laneOfRow(pos.row)
  }

  /** 棋盘像素宽高 */
  get pixelWidth(): number {
    return this.cols * this.cellSize
  }

  get pixelHeight(): number {
    return this.rows * this.cellSize
  }

  /** 所有可放置格，供调试与自测使用 */
  allBuildable(): GridPos[] {
    const list: GridPos[] = []
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) list.push({ col, row })
    }
    return list
  }
}
