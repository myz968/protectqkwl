/**
 * 文案配置（彩蛋、结算、提示语全部集中在此）
 *
 * 想改字，只改这个文件即可，不需要碰任何业务逻辑。
 * 每条彩蛋都可以自由增删，游戏会在强化卷梨触发「晴空万里」时随机抽一条。
 */

export interface EasterEgg {
  title: string
  text: string
}

/** 强化卷梨 · 技能「晴空万里」触发时随机弹出 */
export const SKILL_EASTER_EGGS: EasterEgg[] = [
  { title: '晴空万里', text: '云散开了，梨光落了一地。' },
  { title: '晴空万里', text: '今天也把烦恼交给风吧。' },
  { title: '晴空万里', text: '适合什么都不想的一个下午。' },
  { title: '晴空万里', text: '这一束光，是专门留给你的。' },
  { title: '晴空万里', text: '梨子熟了，秋天就没什么可怕的了。' },
  { title: '晴空万里', text: '你看，天自己会晴的。' },
  { title: '晴空万里', text: '风把云推走的时候，没有出声。' },
  { title: '晴空万里', text: '攒了很久的光，一次都给你。' },
  { title: '晴空万里', text: '慢慢来，梨园不会跑掉。' },
  { title: '晴空万里', text: '晴空萬李，这里的天气归你管。' },
]

/** 开局引导，显示在棋盘下方的提示条 */
export const INTRO_HINT =
  '四条路，先在任意通道上种两株卷梨攒梨光，再放一位站神守着。放错了就用铲子收回，返还一半梨光。'

/** 界面固定文案 */
export const UI_COPY = {
  title: '蓝拍战神好帅帅',
  subtitle: '专门打扰晴空萬李',
  pearLight: '梨光',
  hp: '守护',
  wave: '波次',
  startWave: '开始这一波',
  pause: '暂停',
  resume: '继续',
  restart: '重新开始',
  bgm: '音乐',
  sfx: '音效',
  upgrade: '强化',
  skillReady: '晴空万里',
  settings: '设置',
  shovel: '铲子',
  shovelTip: '点一个单位收回它',
  fullscreen: '全屏',
  cancel: '再想想',
  confirmRemove: '收回',
} as const

/** 操作反馈提示 */
export const TOAST_COPY = {
  insufficientPearLight: '梨光不够，等卷梨再攒一会儿',
  notBuildable: '这一格放不了，换一条通道的空位试试',
  occupied: '这个位置已经有小伙伴了',
  enemyOnCell: '易帝正踩在这一格上，等它走开再放',
  placed: '已经站好位置了',
  upgraded: '卷梨变强了，晴空万里已经落下',
  alreadyBoosted: '这株卷梨已经强化过了',
  paused: '先歇一会儿',
  resumed: '继续守',
  waveStarted: '这一波来了',
  cannotStartWave: '这一波还没打完',
  gameOver: '先重新开始吧',
  shovelReady: '铲子拿好了，点一个单位收回它',
  shovelEmpty: '这里没有单位，铲子收不到东西',
  removed: '收回好了，梨光退回来了',
  removeCancelled: '收手了，什么都没动',
} as const

/** 铲子二次确认弹窗 */
export const SHOVEL_COPY = {
  title: '要收回它吗',
  /** {name} 会被替换成单位名字，{refund} 会被替换成返还的梨光 */
  body: '收回「{name}」，返还 {refund} 梨光。',
  hint: '放错了再收回，总是比硬撑着划算。',
} as const

/** 结算弹窗文案 */
export const RESULT_COPY = {
  victory: {
    title: '梨园守住了',
    tag: '全部波次 · 完成',
    lines: [
      '八波风都过去了，梨光还在。',
      '你什么都没失去，还多了一整片晴空。',
      '辛苦了，去喝点水，伸个懒腰吧。',
    ],
    button: '再守一次',
  },
  defeat: {
    title: '今天就到这里吧',
    tag: '基地 · 失守',
    lines: [
      '梨光散了一些，但没关系的。',
      '退一步也算休息，明天再来也一样。',
      '位置还在，你也还在。',
    ],
    button: '再试一次',
  },
} as const

/** 页脚署名 */
export const FOOTER_COPY = '做给晴空萬李 · 愿每一次打开都刚好不忙'
