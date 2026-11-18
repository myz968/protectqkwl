/**
 * 波次调度
 * 职责：把一波配置展开成带时间戳的刷怪任务，并给每只敌人随机分配通道。
 * 敌人一旦选定通道，之后只在本通道直行（这一决定在这里做出，后面不再改）。
 */

import type { EnemyType, WaveConfig } from '@/types/game'

export interface SpawnTask {
  /** 相对本波开始的时间（秒） */
  at: number
  enemy: EnemyType
  laneIndex: number
}

export class WaveManager {
  private tasks: SpawnTask[] = []
  private elapsed = 0
  private cursor = 0
  active = false

  start(wave: WaveConfig, laneCount: number): void {
    const tasks: SpawnTask[] = []
    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i += 1) {
        tasks.push({
          at: spawn.delay + i * spawn.interval,
          enemy: spawn.enemy,
          laneIndex: Math.floor(Math.random() * laneCount),
        })
      }
    }
    tasks.sort((a, b) => a.at - b.at)
    this.tasks = tasks
    this.elapsed = 0
    this.cursor = 0
    this.active = true
  }

  /** 返回本帧需要生成的敌人 */
  update(dt: number): SpawnTask[] {
    if (!this.active) return []
    this.elapsed += dt
    const ready: SpawnTask[] = []
    while (this.cursor < this.tasks.length && this.tasks[this.cursor].at <= this.elapsed) {
      ready.push(this.tasks[this.cursor])
      this.cursor += 1
    }
    return ready
  }

  /** 本波是否已全部生成完毕 */
  get allSpawned(): boolean {
    return this.cursor >= this.tasks.length
  }

  reset(): void {
    this.tasks = []
    this.elapsed = 0
    this.cursor = 0
    this.active = false
  }
}
