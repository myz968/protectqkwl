/**
 * 子弹（站神的蓝色小球）
 * 特性：单体命中，命中即消失，不穿透。
 */

import type { Enemy } from '@/game/Enemy'

export type BulletResult = 'flying' | 'hit' | 'miss'

let nextBulletId = 1

export class Bullet {
  readonly id: number
  readonly damage: number
  readonly speed: number
  readonly radius: number
  readonly sprite: string

  x: number
  y: number
  alive = true
  /** 目标死亡后，飞向它最后的位置 */
  private target: Enemy
  private lastX: number
  private lastY: number
  /** 飞行方向，用于渲染拖影 */
  angle = 0
  /** 自身旋转角度（球拍边飞边转），仅渲染用 */
  spin = 0

  constructor(x: number, y: number, target: Enemy, damage: number, speed: number, radius: number, sprite: string) {
    this.id = nextBulletId++
    this.x = x
    this.y = y
    this.target = target
    this.lastX = target.x
    this.lastY = target.y
    this.damage = damage
    this.speed = speed
    this.radius = radius
    this.sprite = sprite
  }

  update(dt: number): BulletResult {
    if (!this.alive) return 'miss'

    const chasing = this.target.alive
    if (chasing) {
      this.lastX = this.target.x
      this.lastY = this.target.y
    }

    const dx = this.lastX - this.x
    const dy = this.lastY - this.y
    const dist = Math.hypot(dx, dy)
    this.angle = Math.atan2(dy, dx)
    this.spin += dt * 11

    const step = this.speed * dt
    if (dist <= step + this.radius) {
      this.alive = false
      return chasing ? 'hit' : 'miss'
    }

    this.x += (dx / dist) * step
    this.y += (dy / dist) * step
    return 'flying'
  }

  get targetEnemy(): Enemy {
    return this.target
  }
}
