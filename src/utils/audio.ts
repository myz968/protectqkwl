/**
 * 音频管理
 *
 * 设计原则：不内置任何音频文件。优先读取 public/assets/audio 下用户提供的素材，
 * 找不到就用 Web Audio 实时合成（背景为柔和五声音阶分解和弦，音效为短促合成音）。
 *
 * 可替换素材（放进去就自动生效，不需要改代码）：
 *   /assets/audio/bgm.mp3   背景音乐（循环）
 *   /assets/audio/hit.wav   敌人受击 / 抵达终点
 *   /assets/audio/shoot.wav 站神开火
 *   /assets/audio/build.wav 放置单位
 *   /assets/audio/pear.wav  梨光产出
 *   /assets/audio/upgrade.wav 强化
 *   /assets/audio/remove.wav  铲子收回单位
 */

export type SfxName = 'shoot' | 'build' | 'pear' | 'upgrade' | 'hit' | 'remove' | 'win' | 'lose'

const SFX_FILES: Record<SfxName, string> = {
  shoot: '/assets/audio/shoot.wav',
  build: '/assets/audio/build.wav',
  pear: '/assets/audio/pear.wav',
  upgrade: '/assets/audio/upgrade.wav',
  hit: '/assets/audio/hit.wav',
  remove: '/assets/audio/remove.wav',
  win: '/assets/audio/win.wav',
  lose: '/assets/audio/lose.wav',
}

/** 合成版 BGM：C 大调五声音阶，四个和弦循环，节奏很慢 */
const BGM_CHORDS: number[][] = [
  [261.63, 329.63, 392.0, 329.63], // C
  [220.0, 261.63, 329.63, 261.63], // Am
  [174.61, 220.0, 261.63, 220.0], // F
  [196.0, 246.94, 293.66, 246.94], // G
]
const BGM_STEP_MS = 620

class AudioManager {
  private ctx: AudioContext | null = null
  private masterSfx: GainNode | null = null
  private masterBgm: GainNode | null = null
  private bgmEl: HTMLAudioElement | null = null
  private bgmFileReady = false
  private bgmFileChecked = false
  private bgmTimer: number | null = null
  private bgmChordIndex = 0
  private bgmNoteIndex = 0
  private started = false

  bgmEnabled = true
  sfxEnabled = true

  /** 必须在用户手势之后调用一次 */
  init(): void {
    if (this.started) {
      void this.ctx?.resume()
      return
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.masterSfx = this.ctx.createGain()
      this.masterSfx.gain.value = 0.9
      this.masterSfx.connect(this.ctx.destination)

      this.masterBgm = this.ctx.createGain()
      this.masterBgm.gain.value = 0.5
      this.masterBgm.connect(this.ctx.destination)

      this.started = true
    } catch {
      this.ctx = null
    }
  }

  setBgmEnabled(on: boolean): void {
    this.bgmEnabled = on
    if (!on) {
      this.stopBgm()
    } else {
      this.startBgm()
    }
  }

  setSfxEnabled(on: boolean): void {
    this.sfxEnabled = on
  }

  /** 检测用户是否放了 bgm.mp3，只检测一次 */
  private ensureBgmFile(): Promise<boolean> {
    if (this.bgmFileChecked) return Promise.resolve(this.bgmFileReady)
    this.bgmFileChecked = true
    return new Promise<boolean>((resolve) => {
      const el = new Audio()
      let settled = false
      const done = (ok: boolean) => {
        if (settled) return
        settled = true
        this.bgmFileReady = ok
        if (ok) {
          el.loop = true
          el.volume = 0.45
          this.bgmEl = el
        }
        resolve(ok)
      }
      el.addEventListener('canplaythrough', () => done(true), { once: true })
      el.addEventListener('error', () => done(false), { once: true })
      el.src = '/assets/audio/bgm.mp3'
      el.load()
      // 兜底：2 秒还没结论就当没有素材
      window.setTimeout(() => done(false), 2000)
    })
  }

  async startBgm(): Promise<void> {
    if (!this.bgmEnabled) return
    this.init()
    if (!this.ctx) return
    const existing: HTMLAudioElement | null = this.bgmEl
    if (existing) {
      try {
        await existing.play()
      } catch {
        /* 浏览器策略拦截时静默失败 */
      }
      return
    }
    const hasFile = await this.ensureBgmFile()
    const loaded: HTMLAudioElement | null = this.bgmEl
    if (hasFile && loaded) {
      try {
        await loaded.play()
      } catch {
        /* ignore */
      }
      return
    }
    this.startSynthBgm()
  }

  stopBgm(): void {
    if (this.bgmEl) this.bgmEl.pause()
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer)
      this.bgmTimer = null
    }
  }

  private startSynthBgm(): void {
    if (!this.ctx || this.bgmTimer !== null) return
    const tick = () => {
      if (!this.ctx || !this.masterBgm) return
      const chord = BGM_CHORDS[this.bgmChordIndex % BGM_CHORDS.length]
      const freq = chord[this.bgmNoteIndex % chord.length]
      this.tone(freq, 0.85, { type: 'sine', gain: 0.05, dest: this.masterBgm })
      // 低八度衬底，让声音更厚一点
      if (this.bgmNoteIndex % 4 === 0) {
        this.tone(chord[0] / 2, 1.6, { type: 'sine', gain: 0.035, dest: this.masterBgm })
      }
      this.bgmNoteIndex += 1
      if (this.bgmNoteIndex % chord.length === 0) this.bgmChordIndex += 1
    }
    tick()
    this.bgmTimer = window.setInterval(tick, BGM_STEP_MS)
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; slideTo?: number; dest?: GainNode | null; delay?: number } = {},
  ): void {
    if (!this.ctx) return
    const dest = opts.dest ?? this.masterSfx
    if (!dest) return
    const t0 = this.ctx.currentTime + (opts.delay ?? 0)
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = opts.type ?? 'sine'
    osc.frequency.setValueAtTime(freq, t0)
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + dur)
    }
    const peak = Math.max(0.001, opts.gain ?? 0.08)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.03, dur * 0.25))
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  /** 播放音效，优先用素材文件，失败回退合成音 */
  play(name: SfxName): void {
    if (!this.sfxEnabled) return
    this.init()
    const file = SFX_FILES[name]
    const el = new Audio(file)
    el.volume = 0.5
    el.play().catch(() => this.playSynth(name))
  }

  private playSynth(name: SfxName): void {
    if (!this.ctx) return
    switch (name) {
      case 'shoot':
        this.tone(880, 0.07, { type: 'triangle', gain: 0.05, slideTo: 620 })
        break
      case 'build':
        this.tone(523.25, 0.1, { gain: 0.07 })
        this.tone(783.99, 0.14, { gain: 0.06, delay: 0.08 })
        break
      case 'pear':
        this.tone(1046.5, 0.09, { type: 'triangle', gain: 0.05 })
        this.tone(1318.5, 0.12, { gain: 0.04, delay: 0.06 })
        break
      case 'upgrade':
        this.tone(523.25, 0.16, { gain: 0.07 })
        this.tone(659.25, 0.16, { gain: 0.07, delay: 0.1 })
        this.tone(783.99, 0.22, { gain: 0.07, delay: 0.2 })
        break
      case 'hit':
        // 低沉的一下，像被撞到
        this.tone(196, 0.16, { type: 'square', gain: 0.05, slideTo: 110 })
        break
      case 'remove':
        // 往上收走的短音，和放置音反过来
        this.tone(783.99, 0.1, { gain: 0.06 })
        this.tone(523.25, 0.14, { gain: 0.05, delay: 0.08 })
        break
      case 'win':
        this.tone(523.25, 0.2, { gain: 0.07 })
        this.tone(659.25, 0.2, { gain: 0.07, delay: 0.14 })
        this.tone(783.99, 0.2, { gain: 0.07, delay: 0.28 })
        this.tone(1046.5, 0.36, { gain: 0.06, delay: 0.42 })
        break
      case 'lose':
        this.tone(392, 0.28, { gain: 0.06 })
        this.tone(329.63, 0.32, { gain: 0.06, delay: 0.2 })
        this.tone(261.63, 0.5, { gain: 0.05, delay: 0.42 })
        break
    }
  }
}

export const audio = new AudioManager()
