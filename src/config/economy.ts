/**
 * 经济与全局平衡数值
 * 所有可调参数集中在此，业务代码不出现魔法数字。
 */

export const ECONOMY = {
  /** 开局梨光 */
  initialPearLight: 180,
  /** 基地生命值 */
  maxHp: 10,
  /** 波次之间的自动倒计时（秒），可手动提前开始 */
  waveGapSeconds: 18,
  /** 第一波开始前的准备时间（秒），给玩家铺场 */
  firstWaveDelay: 20,
  /** 铲子收回单位的返还比例 */
  refundRate: 0.5,
} as const

/** 收回某个单位能返还多少梨光（向下取整，和配置里的比例保持单一来源） */
export function refundOf(cost: number): number {
  return Math.floor(cost * ECONOMY.refundRate)
}
