/**
 * 战斗系统
 * 职责：站神索敌与开火、子弹飞行与命中结算。
 * 规则（当前版本锁定）：子弹单体命中，命中即消失；站神只打和自己同一条通道的敌人，
 * 不支持跨通道攻击。以后要开放跨通道，只需要放宽 pickTarget 里的通道判断。
 */

import { Bullet } from '@/game/Bullet'
import type { Enemy } from '@/game/Enemy'
import type { Unit } from '@/game/Unit'
import { MAP_CONFIG } from '@/config/map'

export interface CombatCallbacks {
  /** target 用于让站神朝目标方向挥拍（纯表现，不影响结算） */
  onShoot: (unit: Unit, target: Enemy) => void
  onHit: (enemy: Enemy) => void
  onKill: (enemy: Enemy) => void
}

export class BattleSystem {
  private readonly cellSize = MAP_CONFIG.cellSize

  update(dt: number, units: Unit[], enemies: Enemy[], bullets: Bullet[], cb: CombatCallbacks): void {
    this.fireTowers(units, enemies, bullets, cb)
    this.updateBullets(dt, bullets, cb)
  }

  /** 站神开火 */
  private fireTowers(units: Unit[], enemies: Enemy[], bullets: Bullet[], cb: CombatCallbacks): void {
    for (const unit of units) {
      if (!unit.isAttacker) continue
      const cfg = unit.attacker
      if (!cfg) continue
      if (unit.timer > 0) continue

      const target = this.pickTarget(unit, enemies, cfg.range * this.cellSize)
      if (!target) continue

      // 从手持拍的位置打出去，避免子弹从角色脸中间冒出来
      const aim = Math.atan2(target.y - unit.y, target.x - unit.x)
      const bullet = new Bullet(
        unit.x + Math.cos(aim) * 14,
        unit.y + Math.sin(aim) * 14,
        target,
        cfg.damage,
        cfg.bulletSpeed,
        cfg.bulletRadius,
        cfg.bulletSprite,
      )
      bullets.push(bullet)
      unit.resetTimer(cfg.attackInterval)
      cb.onShoot(unit, target)
    }
  }

  /**
   * 同通道 + 射程内，优先打最靠前的（x 最大）。
   * 距离只算水平方向：单位站在通道上，射程就是沿着这条路往前够得到的格子数，
   * 和界面上画出来的射程带完全一致，不会因为纵向偏移产生“看着能打却打不到”。
   */
  private pickTarget(unit: Unit, enemies: Enemy[], rangePx: number): Enemy | null {
    let best: Enemy | null = null
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reached) continue
      if (enemy.laneIndex !== unit.laneIndex) continue
      if (Math.abs(enemy.x - unit.x) > rangePx) continue
      if (!best || enemy.x > best.x) best = enemy
    }
    return best
  }

  /** 子弹推进与命中 */
  private updateBullets(dt: number, bullets: Bullet[], cb: CombatCallbacks): void {
    for (const bullet of bullets) {
      if (!bullet.alive) continue
      const result = bullet.update(dt)
      if (result !== 'hit') continue
      const enemy = bullet.targetEnemy
      const killed = enemy.takeDamage(bullet.damage)
      cb.onHit(enemy)
      if (killed) cb.onKill(enemy)
    }
  }
}
