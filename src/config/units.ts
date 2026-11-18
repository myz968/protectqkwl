/**
 * 单位配置（MVP 两种：卷梨、站神）
 *
 * 扩展新单位只需三步：
 * 1. 在 types/game.ts 的 UnitType 里加一个标识；
 * 2. 在本文件 UNITS 里追加一份配置（产资源用 role: 'producer'，攻击用 role: 'attacker'）；
 * 3. 把透明 PNG 丢进 public/assets/units/，文件名与 sprite 对应。
 * 逻辑层与 UI 会自动识别，不需要改战斗代码。
 */

import type { AttackerConfig, ProducerConfig, UnitConfig, UnitType } from '@/types/game'

/** 卷梨：产梨光，可强化释放「晴空万里」 */
const PEAR: ProducerConfig = {
  type: 'pear',
  name: '卷梨',
  desc: '慢慢攒梨光，强化后请一场晴空',
  role: 'producer',
  cost: 50,
  sprite: '/assets/units/pear.png',
  accent: '#9ccb6a',
  drawScale: 0.88,
  /** 每 5.5 秒产出 25 梨光 */
  produceInterval: 5.5,
  produceAmount: 25,
  upgradeCost: 90,
  boostedInterval: 4,
  boostedAmount: 45,
  burstAmount: 150,
  skillName: '晴空万里',
}

/** 站神：单体远程，蓝色小球，无穿透 */
const GUARDIAN: AttackerConfig = {
  type: 'guardian',
  name: '站神',
  desc: '挥拍击球，只守自己这条路',
  role: 'attacker',
  cost: 75,
  sprite: '/assets/units/guardian.png',
  accent: '#5aa9e6',
  drawScale: 0.88,
  damage: 22,
  attackInterval: 1.15,
  /** 射程 3.6 格 */
  range: 3.6,
  bulletSpeed: 430,
  bulletSprite: '/assets/bullet/paddle.png',
  bulletRadius: 8,
  swingDuration: 0.3,
}

export const UNITS: Record<UnitType, UnitConfig> = {
  pear: PEAR,
  guardian: GUARDIAN,
}

/** 建造面板顺序 */
export const UNIT_ORDER: UnitType[] = ['pear', 'guardian']
