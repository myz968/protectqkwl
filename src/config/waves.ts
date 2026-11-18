/**
 * 波次配置
 * 基调：休闲解压，间隔宽松，前期压力低。
 * 每只易帝出生时随机挑选 4 条通道之一，之后只在本通道直行。
 */

import type { WaveConfig } from '@/types/game'

export const WAVES: WaveConfig[] = [
  {
    index: 1,
    label: '试探',
    spawns: [{ enemy: 'yidi', count: 3, interval: 1.5, delay: 0 }],
  },
  {
    index: 2,
    label: '起风',
    spawns: [{ enemy: 'yidi', count: 4, interval: 1.4, delay: 0 }],
  },
  {
    index: 3,
    label: '云低',
    spawns: [{ enemy: 'yidi', count: 5, interval: 1.3, delay: 0 }],
  },
  {
    index: 4,
    label: '细雨',
    spawns: [{ enemy: 'yidi', count: 6, interval: 1.2, delay: 0 }],
  },
  {
    index: 5,
    label: '雨大',
    spawns: [{ enemy: 'yidi', count: 7, interval: 1.1, delay: 0 }],
  },
  {
    index: 6,
    label: '风急',
    spawns: [
      { enemy: 'yidi', count: 5, interval: 1.0, delay: 0 },
      { enemy: 'yidi', count: 4, interval: 1.4, delay: 5 },
    ],
  },
  {
    index: 7,
    label: '云深',
    spawns: [
      { enemy: 'yidi', count: 5, interval: 0.95, delay: 0 },
      { enemy: 'yidi', count: 5, interval: 1.2, delay: 4.5 },
    ],
  },
  {
    index: 8,
    label: '晴空',
    spawns: [
      { enemy: 'yidi', count: 6, interval: 0.9, delay: 0 },
      { enemy: 'yidi', count: 6, interval: 1.1, delay: 4 },
    ],
  },
]

export const TOTAL_WAVES = WAVES.length

/** 波次总敌人数，用于进度展示与自测 */
export function waveEnemyCount(wave: WaveConfig): number {
  return wave.spawns.reduce((sum, s) => sum + s.count, 0)
}
