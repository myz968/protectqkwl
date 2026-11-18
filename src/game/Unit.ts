/**
 * 单位实例（卷梨 / 站神）
 * 职责：只管自己的冷却与强化状态，具体产出多少、打多少伤害由配置决定。
 */

import type { AttackerConfig, GridPos, ProducerConfig, UnitConfig, UnitType } from '@/types/game'
import { unitCenter } from '@/utils/coordinate'

let nextUnitId = 1

export class Unit {
  readonly id: number
  readonly config: UnitConfig
  readonly pos: GridPos
  /** 所属通道，站神只打本通道的敌人 */
  readonly laneIndex: number
  readonly x: number
  readonly y: number

  /** 是否已强化（仅卷梨有意义） */
  boosted = false
  /** 冷却计时，归零即可行动 */
  timer = 0
  /** 强化瞬间的闪光计时，用于渲染 */
  flash = 0
  /** 挥拍动作剩余时长（秒），开火时置为 swingDuration，只影响表现 */
  swing = 0
  /** 上一次开火的朝向（弧度），挥拍方向跟着目标走 */
  aimAngle = 0

  constructor(config: UnitConfig, pos: GridPos, laneIndex: number) {
    this.id = nextUnitId++
    this.config = config
    this.pos = pos
    this.laneIndex = laneIndex
    const center = unitCenter(pos)
    this.x = center.x
    this.y = center.y
    // 开场先给一小段随机延迟，避免同类单位同时产出一起爆字
    this.timer = Math.random() * 0.4
  }

  get type(): UnitType {
    return this.config.type
  }

  get isProducer(): boolean {
    return this.config.role === 'producer'
  }

  get isAttacker(): boolean {
    return this.config.role === 'attacker'
  }

  get producer(): ProducerConfig | null {
    return this.config.role === 'producer' ? this.config : null
  }

  get attacker(): AttackerConfig | null {
    return this.config.role === 'attacker' ? this.config : null
  }

  /** 当前产出周期（强化后更短） */
  get produceInterval(): number {
    const cfg = this.producer
    if (!cfg) return 0
    return this.boosted ? cfg.boostedInterval : cfg.produceInterval
  }

  /** 当前单次产出量 */
  get produceAmount(): number {
    const cfg = this.producer
    if (!cfg) return 0
    return this.boosted ? cfg.boostedAmount : cfg.produceAmount
  }

  tick(dt: number): void {
    if (this.timer > 0) this.timer -= dt
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt)
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt)
  }

  /** 挥拍进度 0→1，渲染用来做挥臂动画 */
  get swingProgress(): number {
    const full = this.attacker?.swingDuration ?? 0
    if (full <= 0 || this.swing <= 0) return 0
    return Math.min(1, Math.max(0, 1 - this.swing / full))
  }

  /** 攻击冷却：站神 */
  get attackInterval(): number {
    return this.attacker?.attackInterval ?? 0
  }

  resetTimer(seconds: number): void {
    this.timer = seconds
  }

  /** 冷却进度 0-1，用于画冷却环 */
  get cooldownRatio(): number {
    const full = this.isProducer ? this.produceInterval : this.attackInterval
    if (full <= 0) return 1
    return Math.min(1, Math.max(0, 1 - this.timer / full))
  }
}
