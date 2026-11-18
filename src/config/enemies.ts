/**
 * 敌人配置（MVP 只有易帝，预留扩展）
 * 注意：击杀敌人不产出梨光（规则：梨光仅由卷梨产出），因此这里没有奖励字段。
 */

import type { EnemyConfig, EnemyType } from '@/types/game'

const YIDI: EnemyConfig = {
  type: 'yidi',
  name: '易帝',
  desc: '慢悠悠地往终点走',
  hp: 60,
  speed: 34,
  /** 抵达终点扣 1 点生命 */
  damage: 1,
  sprite: '/assets/units/yidi.png',
  accent: '#e39b3c',
  drawScale: 0.82,
}

export const ENEMIES: Record<EnemyType, EnemyConfig> = {
  yidi: YIDI,
}
