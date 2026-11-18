/**
 * 全局类型定义
 * 职责：只放类型，不放实现。游戏逻辑、配置、UI 共用这一份契约。
 */

/** 网格坐标（列、行，从 0 开始） */
export interface GridPos {
  col: number
  row: number
}

/**
 * 格子类型
 * - lane：通道格，既是行进道也是放置位（单层结构，单位就种在敌人走的路上）
 * - decor：装饰格，纯视觉，不可放置（预留，当前版本没有）
 */
export type CellType = 'lane' | 'decor'

export interface Cell {
  col: number
  row: number
  type: CellType
  /** 所属通道序号（0-3），decor 为 null */
  laneIndex: number | null
  /** 是否允许放置单位 */
  buildable: boolean
}

/** 单位类型：新增单位时在这里加一项，并在 config/units.ts 注册 */
export type UnitType = 'pear' | 'guardian'

/** 单位职能：producer 产资源，attacker 打伤害 */
export type UnitRole = 'producer' | 'attacker'

interface UnitBaseConfig {
  type: UnitType
  name: string
  /** 一句话定位，显示在按钮和详情里 */
  desc: string
  /** 放置消耗的梨光 */
  cost: number
  /** 素材路径（相对 public），缺失时自动用程序化占位图形 */
  sprite: string
  /** 主题色，用于描边、按钮、特效 */
  accent: string
  /** 绘制半径占格子的比例 */
  drawScale: number
}

/** 资源产出单位（卷梨） */
export interface ProducerConfig extends UnitBaseConfig {
  role: 'producer'
  /** 每 interval 秒产出 amount 梨光 */
  produceInterval: number
  produceAmount: number
  /** 强化消耗 */
  upgradeCost: number
  /** 强化后的产出周期与产量 */
  boostedInterval: number
  boostedAmount: number
  /** 强化时一次性释放的技能产量（晴空万里） */
  burstAmount: number
  /** 技能名称，用于飘字与彩蛋 */
  skillName: string
}

/** 攻击单位（站神） */
export interface AttackerConfig extends UnitBaseConfig {
  role: 'attacker'
  damage: number
  /** 攻击间隔（秒） */
  attackInterval: number
  /** 射程，单位为格 */
  range: number
  /** 子弹飞行速度（像素/秒） */
  bulletSpeed: number
  /** 子弹素材路径 */
  bulletSprite: string
  /** 子弹绘制半径 */
  bulletRadius: number
  /** 挥拍动作时长（秒），渲染用，不影响伤害结算 */
  swingDuration: number
}

export type UnitConfig = ProducerConfig | AttackerConfig

/** 敌人类型（易帝为 MVP 基础单位，预留扩展） */
export type EnemyType = 'yidi'

export interface EnemyConfig {
  type: EnemyType
  name: string
  desc: string
  hp: number
  /** 移动速度，像素/秒 */
  speed: number
  /** 抵达终点扣除的生命值 */
  damage: number
  sprite: string
  accent: string
  drawScale: number
}

/** 单条通道的一批刷怪指令 */
export interface WaveSpawn {
  enemy: EnemyType
  count: number
  /** 同批之间间隔秒数 */
  interval: number
  /** 本批相对波次开始的延迟秒数 */
  delay: number
}

export interface WaveConfig {
  /** 波次编号，从 1 开始 */
  index: number
  /** 展示名，如「第 1 波 · 试探」 */
  label: string
  spawns: WaveSpawn[]
}

/** 游戏状态机 */
export type GameStatus = 'idle' | 'running' | 'paused' | 'victory' | 'defeat'

/** HUD 快照，供 Vue 响应式渲染 */
export interface HudState {
  pearLight: number
  hp: number
  maxHp: number
  /** 已完成的波次数 */
  wave: number
  totalWaves: number
  waveInProgress: boolean
  /** 距离下一波开始的秒数，波次进行中为 0 */
  nextWaveIn: number
  status: GameStatus
  /** 场上单位数量 */
  unitCount: number
  /** 累计产出梨光 */
  totalProduced: number
  /** 累计击退敌人 */
  defeated: number
}

/** 飘字 / 光环等瞬时特效 */
export interface FloatEffect {
  id: number
  x: number
  y: number
  text: string
  color: string
  /** 剩余寿命（秒） */
  life: number
  maxLife: number
  kind: 'text' | 'ring'
}

/**
 * 单位淡出残影：铲子收回单位时，用一张逐渐透明、微微上浮的贴图做柔和消失，
 * 而不是让角色“啪”一下消失。生命周期由引擎推进，渲染层只负责画。
 */
export interface VanishGhost {
  id: number
  x: number
  y: number
  sprite: string
  /** 绘制直径（像素） */
  size: number
  accent: string
  life: number
  maxLife: number
}

/** 铲子待确认的移除请求 */
export interface PendingRemove {
  unitId: number
  name: string
  /** 返还的梨光 */
  refund: number
}

/** 放置 / 操作结果，统一给 UI 提示 */
export interface ActionResult {
  ok: boolean
  message: string
}

/** 本地设置（音量开关等） */
export interface GameSettings {
  bgm: boolean
  sfx: boolean
}

/** 结算数据 */
export interface RunResult {
  victory: boolean
  wave: number
  totalWaves: number
  defeated: number
  produced: number
  /** 用时（秒） */
  elapsed: number
}
