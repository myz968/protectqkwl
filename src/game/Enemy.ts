/**
 * 敌人实例（易帝）
 * 职责：沿自己那条通道直行，不换道、不寻路。血量归零由战斗系统标记死亡。
 */

import type { EnemyConfig, EnemyType } from '@/types/game'
import { REACH_END_X, SPAWN_X, trailY } from '@/utils/coordinate'

let nextEnemyId = 1

export class Enemy {
  readonly id: number
  readonly config: EnemyConfig
  readonly laneIndex: number
  readonly maxHp: number
  readonly y: number

  x: number
  hp: number
  alive = true
  /** 是否已抵达终点（抵达后从场上移除并扣血） */
  reached = false
  /** 受击闪烁计时 */
  hitFlash = 0
  /** 行走摆动相位，纯视觉 */
  readonly bobPhase: number

  constructor(config: EnemyConfig, laneIndex: number) {
    this.id = nextEnemyId++
    this.config = config
    this.laneIndex = laneIndex
    this.maxHp = config.hp
    this.hp = config.hp
    this.x = SPAWN_X
    this.y = trailY(laneIndex)
    this.bobPhase = Math.random() * Math.PI * 2
  }

  get type(): EnemyType {
    return this.config.type
  }

  get hpRatio(): number {
    return Math.max(0, this.hp / this.maxHp)
  }

  /** 返回本帧是否刚好抵达终点 */
  update(dt: number): boolean {
    if (!this.alive) return false
    this.x += this.config.speed * dt
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt)
    if (this.x >= REACH_END_X) {
      this.reached = true
      return true
    }
    return false
  }

  /** 扣血，返回是否致死 */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false
    this.hp -= amount
    this.hitFlash = 0.18
    if (this.hp <= 0) {
      this.hp = 0
      this.alive = false
      return true
    }
    return false
  }
}
