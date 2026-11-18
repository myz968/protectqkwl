/**
 * 游戏引擎（纯 TypeScript，不依赖 Vue / Canvas / Tauri）
 *
 * 对外只暴露：update(dt)、几个操作指令（build / upgrade / startNextWave / pause / resume / reset）、
 * 以及数据快照（getHud / getResult）。渲染层与状态层都只跟这里打交道。
 */

import { ECONOMY, refundOf } from '@/config/economy'
import { ENEMIES } from '@/config/enemies'
import { MAP_CONFIG } from '@/config/map'
import { SKILL_EASTER_EGGS, TOAST_COPY, type EasterEgg } from '@/config/copywriting'
import { TOTAL_WAVES, WAVES } from '@/config/waves'
import { UNITS } from '@/config/units'
import { BattleSystem } from '@/game/BattleSystem'
import type { Bullet } from '@/game/Bullet'
import { Enemy } from '@/game/Enemy'
import { GridMap } from '@/game/GridMap'
import { Unit } from '@/game/Unit'
import { WaveManager } from '@/game/WaveManager'
import type {
  ActionResult,
  EnemyType,
  FloatEffect,
  GameStatus,
  GridPos,
  HudState,
  RunResult,
  UnitType,
  VanishGhost,
} from '@/types/game'
import { cellCenter } from '@/utils/coordinate'

/** 单位被铲走时的淡出时长（秒），只影响残影寿命，不影响结算 */
const REMOVE_FADE_SECONDS = 0.5

export type EngineSfxName =
  | 'shoot'
  | 'build'
  | 'pear'
  | 'upgrade'
  | 'hit'
  | 'remove'
  | 'win'
  | 'lose'

export class GameEngine {
  readonly map = new GridMap()
  readonly battle = new BattleSystem()
  private readonly waves = new WaveManager()

  status: GameStatus = 'running'
  pearLight: number = ECONOMY.initialPearLight
  hp: number = ECONOMY.maxHp

  units: Unit[] = []
  enemies: Enemy[] = []
  bullets: Bullet[] = []
  effects: FloatEffect[] = []
  /** 被铲走单位的淡出残影 */
  ghosts: VanishGhost[] = []

  /** 已完成波数 */
  waveIndex = 0
  waveInProgress = false
  nextWaveIn: number = ECONOMY.firstWaveDelay
  elapsed = 0
  defeated = 0
  produced = 0

  private effectId = 1
  private ghostId = 1
  private lastHitSoundAt = -1

  /** 音效回调 */
  onSfx?: (name: EngineSfxName) => void
  /** 强化彩蛋回调 */
  onEasterEgg?: (egg: EasterEgg) => void
  /** 操作提示回调 */
  onToast?: (message: string) => void
  /** 状态切换回调 */
  onStatusChange?: (status: GameStatus) => void

  // ---------- 主循环 ----------

  update(dt: number): void {
    if (this.status !== 'running') return
    this.elapsed += dt

    this.tickUnits(dt)
    this.updateProducers()
    this.updateWave(dt)
    this.updateEnemies(dt)
    this.battle.update(dt, this.units, this.enemies, this.bullets, {
      onShoot: (unit, target) => {
        // 记录挥拍动作与朝向，渲染层据此播放「挥手打拍子」动画
        unit.aimAngle = Math.atan2(target.y - unit.y, target.x - unit.x)
        unit.swing = unit.attacker?.swingDuration ?? 0.3
        this.onSfx?.('shoot')
      },
      onHit: (enemy) => {
        enemy.hitFlash = 0.18
        // 音效节流，避免多塔齐射时糊成一片
        if (this.elapsed - this.lastHitSoundAt > 0.14) {
          this.lastHitSoundAt = this.elapsed
          this.onSfx?.('hit')
        }
      },
      onKill: (enemy) => {
        this.defeated += 1
        this.addEffect(enemy.x, enemy.y - 16, '击退', '#e39b3c', 'text')
      },
    })

    this.cleanup()
    this.checkWaveComplete()
    this.updateEffects(dt)
    this.updateGhosts(dt)
    this.checkEnd()
  }

  private tickUnits(dt: number): void {
    for (const unit of this.units) unit.tick(dt)
  }

  /** 卷梨产出梨光 */
  private updateProducers(): void {
    for (const unit of this.units) {
      if (!unit.isProducer) continue
      if (unit.timer > 0) continue
      const amount = unit.produceAmount
      if (amount <= 0) continue
      this.pearLight += amount
      this.produced += amount
      this.addEffect(unit.x, unit.y - 34, `+${amount}`, '#6fae3f', 'text')
      unit.resetTimer(unit.produceInterval)
      this.onSfx?.('pear')
    }
  }

  private updateWave(dt: number): void {
    if (!this.waveInProgress) {
      this.nextWaveIn -= dt
      if (this.nextWaveIn <= 0) this.startNextWave(true)
      return
    }

    const ready = this.waves.update(dt)
    for (const task of ready) this.spawnEnemy(task.enemy, task.laneIndex)
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const reached = enemy.update(dt)
      if (!reached) continue
      this.hp = Math.max(0, this.hp - enemy.config.damage)
      this.addEffect(enemy.x, enemy.y - 14, `-${enemy.config.damage}`, '#e05c5c', 'text')
      this.onSfx?.('hit')
    }
  }

  private cleanup(): void {
    if (this.bullets.some((b) => !b.alive)) {
      this.bullets = this.bullets.filter((b) => b.alive)
    }
    if (this.enemies.some((e) => !e.alive || e.reached)) {
      this.enemies = this.enemies.filter((e) => e.alive && !e.reached)
    }
  }

  private checkWaveComplete(): void {
    if (!this.waveInProgress) return
    if (!this.waves.allSpawned) return
    if (this.enemies.length > 0) return

    this.waveInProgress = false
    this.waveIndex += 1
    this.waves.reset()

    if (this.waveIndex >= TOTAL_WAVES) {
      this.setStatus('victory')
    } else {
      this.nextWaveIn = ECONOMY.waveGapSeconds
    }
  }

  private checkEnd(): void {
    if (this.status !== 'running') return
    if (this.hp <= 0) {
      this.hp = 0
      this.setStatus('defeat')
    }
  }

  private updateEffects(dt: number): void {
    if (this.effects.length === 0) return
    for (const effect of this.effects) effect.life -= dt
    this.effects = this.effects.filter((e) => e.life > 0)
  }

  /** 淡出残影推进，寿命归零就丢掉 */
  private updateGhosts(dt: number): void {
    if (this.ghosts.length === 0) return
    for (const ghost of this.ghosts) ghost.life -= dt
    this.ghosts = this.ghosts.filter((g) => g.life > 0)
  }

  // ---------- 操作指令 ----------

  buildUnit(pos: GridPos, type: UnitType): ActionResult {
    if (this.status === 'victory' || this.status === 'defeat') {
      return { ok: false, message: TOAST_COPY.gameOver }
    }
    if (!this.map.isBuildable(pos)) {
      return { ok: false, message: TOAST_COPY.notBuildable }
    }
    if (this.getUnitAt(pos)) {
      return { ok: false, message: TOAST_COPY.occupied }
    }
    // 单位现在种在行进道上，所以还得躲开正在经过的敌人，否则会像凭空长在它身上
    if (this.enemyOnCell(pos)) {
      return { ok: false, message: TOAST_COPY.enemyOnCell }
    }

    const config = UNITS[type]
    if (!config) return { ok: false, message: TOAST_COPY.notBuildable }
    if (this.pearLight < config.cost) {
      return { ok: false, message: TOAST_COPY.insufficientPearLight }
    }

    this.pearLight -= config.cost
    const unit = new Unit(config, pos, this.map.laneIndexOf(pos))
    this.units.push(unit)
    this.addEffect(unit.x, unit.y - 34, `-${config.cost}`, '#d9902f', 'text')
    this.onSfx?.('build')
    return { ok: true, message: `${config.name} 已经站好位置了` }
  }

  /**
   * 铲子收回单位：返还一半梨光，并留一张淡出残影。
   * 二次确认由 UI 负责，这里只做「已经确认过的移除」。
   */
  removeUnit(unitId: number): ActionResult {
    const index = this.units.findIndex((u) => u.id === unitId)
    if (index < 0) return { ok: false, message: TOAST_COPY.shovelEmpty }

    const unit = this.units[index]
    const refund = refundOf(unit.config.cost)
    this.units.splice(index, 1)
    this.pearLight += refund

    const radius = (MAP_CONFIG.cellSize / 2) * unit.config.drawScale
    this.ghosts.push({
      id: this.ghostId++,
      x: unit.x,
      y: unit.y,
      sprite: unit.config.sprite,
      size: radius * 2,
      accent: unit.config.accent,
      life: REMOVE_FADE_SECONDS,
      maxLife: REMOVE_FADE_SECONDS,
    })

    this.addEffect(unit.x, unit.y - 34, `+${refund}`, '#6fae3f', 'text')
    this.onSfx?.('remove')
    return { ok: true, message: TOAST_COPY.removed }
  }

  /** 这一格上是否正踩着敌人 */
  private enemyOnCell(pos: GridPos): boolean {
    const center = cellCenter(pos)
    const lane = this.map.laneIndexOf(pos)
    const half = MAP_CONFIG.cellSize * 0.45
    return this.enemies.some(
      (e) => e.alive && !e.reached && e.laneIndex === lane && Math.abs(e.x - center.x) < half,
    )
  }

  /** 强化卷梨：扣费 → 一次性技能产量 → 永久提升产出 → 弹彩蛋 */
  upgradeUnit(unitId: number): ActionResult {
    const unit = this.units.find((u) => u.id === unitId)
    if (!unit) return { ok: false, message: TOAST_COPY.occupied }

    const config = unit.producer
    if (!config) return { ok: false, message: TOAST_COPY.alreadyBoosted }
    if (unit.boosted) return { ok: false, message: TOAST_COPY.alreadyBoosted }
    if (this.pearLight < config.upgradeCost) {
      return { ok: false, message: TOAST_COPY.insufficientPearLight }
    }

    this.pearLight -= config.upgradeCost
    unit.boosted = true
    unit.flash = 0.9

    this.pearLight += config.burstAmount
    this.produced += config.burstAmount
    unit.resetTimer(config.boostedInterval)

    this.addEffect(unit.x, unit.y - 48, config.skillName, '#e2b33c', 'text')
    this.addEffect(unit.x, unit.y, '', '#f4d06f', 'ring')
    this.onSfx?.('upgrade')

    const egg = SKILL_EASTER_EGGS[Math.floor(Math.random() * SKILL_EASTER_EGGS.length)]
    if (egg) this.onEasterEgg?.(egg)

    return { ok: true, message: TOAST_COPY.upgraded }
  }

  /** 手动开始下一波；auto 为 true 时是倒计时自动触发 */
  startNextWave(auto = false): ActionResult {
    if (this.waveInProgress) {
      return { ok: false, message: TOAST_COPY.cannotStartWave }
    }
    if (this.waveIndex >= TOTAL_WAVES) {
      return { ok: false, message: TOAST_COPY.gameOver }
    }
    if (this.status !== 'running') {
      return { ok: false, message: TOAST_COPY.gameOver }
    }

    const wave = WAVES[this.waveIndex]
    if (!wave) return { ok: false, message: TOAST_COPY.cannotStartWave }

    this.waves.start(wave, MAP_CONFIG.lanes)
    this.waveInProgress = true
    this.nextWaveIn = 0
    if (!auto) this.onToast?.(`第 ${wave.index} 波 · ${wave.label}`)
    return { ok: true, message: wave.label }
  }

  pause(): void {
    if (this.status === 'running') this.setStatus('paused')
  }

  resume(): void {
    if (this.status === 'paused') this.setStatus('running')
  }

  togglePause(): void {
    if (this.status === 'running') this.pause()
    else if (this.status === 'paused') this.resume()
  }

  reset(): void {
    this.pearLight = ECONOMY.initialPearLight
    this.hp = ECONOMY.maxHp
    this.units = []
    this.enemies = []
    this.bullets = []
    this.effects = []
    this.ghosts = []
    this.waveIndex = 0
    this.waveInProgress = false
    this.nextWaveIn = ECONOMY.firstWaveDelay
    this.elapsed = 0
    this.defeated = 0
    this.produced = 0
    this.effectId = 1
    this.ghostId = 1
    this.lastHitSoundAt = -1
    this.waves.reset()
    this.setStatus('running')
  }

  // ---------- 查询 ----------

  getUnitAt(pos: GridPos): Unit | null {
    return this.units.find((u) => u.pos.col === pos.col && u.pos.row === pos.row) ?? null
  }

  getHud(): HudState {
    return {
      pearLight: Math.floor(this.pearLight),
      hp: this.hp,
      maxHp: ECONOMY.maxHp,
      wave: this.waveIndex,
      totalWaves: TOTAL_WAVES,
      waveInProgress: this.waveInProgress,
      nextWaveIn: Math.max(0, Math.ceil(this.nextWaveIn)),
      status: this.status,
      unitCount: this.units.length,
      totalProduced: Math.floor(this.produced),
      defeated: this.defeated,
    }
  }

  getResult(): RunResult {
    return {
      victory: this.status === 'victory',
      wave: this.waveIndex,
      totalWaves: TOTAL_WAVES,
      defeated: this.defeated,
      produced: Math.floor(this.produced),
      elapsed: this.elapsed,
    }
  }

  // ---------- 内部 ----------

  private spawnEnemy(type: EnemyType, laneIndex: number): void {
    const config = ENEMIES[type]
    if (!config) return
    this.enemies.push(new Enemy(config, laneIndex))
  }

  private addEffect(x: number, y: number, text: string, color: string, kind: 'text' | 'ring'): void {
    const maxLife = kind === 'ring' ? 0.65 : 1.05
    this.effects.push({ id: this.effectId++, x, y, text, color, life: maxLife, maxLife, kind })
  }

  private setStatus(status: GameStatus): void {
    if (this.status === status) return
    this.status = status
    this.onStatusChange?.(status)
  }
}
