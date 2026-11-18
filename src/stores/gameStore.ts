/**
 * 游戏状态
 * 职责：持有引擎实例（markRaw 避免被 Pinia 深度代理破坏逻辑对象），
 * 把引擎快照同步成 Vue 响应式的 HUD。
 */

import { defineStore } from 'pinia'
import { markRaw, reactive, shallowRef } from 'vue'
import { ECONOMY } from '@/config/economy'
import { TOTAL_WAVES } from '@/config/waves'
import { GameEngine } from '@/game/GameEngine'
import { useUiStore } from '@/stores/uiStore'
import type { GridPos, HudState, UnitType } from '@/types/game'
import { audio } from '@/utils/audio'

export const useGameStore = defineStore('game', () => {
  const engine = shallowRef<GameEngine | null>(null)

  const hud = reactive<HudState>({
    pearLight: ECONOMY.initialPearLight,
    hp: ECONOMY.maxHp,
    maxHp: ECONOMY.maxHp,
    wave: 0,
    totalWaves: TOTAL_WAVES,
    waveInProgress: false,
    nextWaveIn: ECONOMY.firstWaveDelay,
    status: 'running',
    unitCount: 0,
    totalProduced: 0,
    defeated: 0,
  })

  function syncHud(): void {
    const e = engine.value
    if (!e) return
    Object.assign(hud, e.getHud())
  }

  function boot(): void {
    if (engine.value) return
    const ui = useUiStore()
    const e = new GameEngine()

    e.onSfx = (name) => audio.play(name)
    e.onToast = (msg) => ui.toast(msg)
    e.onEasterEgg = (egg) => ui.showEasterEgg(egg)
    e.onStatusChange = (status) => {
      if (status === 'victory') {
        audio.play('win')
        ui.showResult(e.getResult())
      } else if (status === 'defeat') {
        audio.play('lose')
        ui.showResult(e.getResult())
      }
    }

    engine.value = markRaw(e)
    // 开发期挂到 window 上，方便在 DevTools 里观察 / 快进模拟；生产构建会被摇掉
    if (import.meta.env.DEV) {
      ;(window as unknown as { __pearGame?: GameEngine }).__pearGame = e
    }
    syncHud()
  }

  function build(type: UnitType, pos: GridPos): void {
    const e = engine.value
    if (!e) return
    const ui = useUiStore()
    const res = e.buildUnit(pos, type)
    if (!res.ok) ui.toast(res.message)
    syncHud()
  }

  function upgrade(unitId: number | null): void {
    const e = engine.value
    if (!e || unitId == null) return
    const ui = useUiStore()
    const res = e.upgradeUnit(unitId)
    if (!res.ok) ui.toast(res.message)
    syncHud()
  }

  /** 铲子确认后的收回 */
  function remove(unitId: number | null): void {
    const e = engine.value
    if (!e || unitId == null) return
    const ui = useUiStore()
    const res = e.removeUnit(unitId)
    ui.toast(res.message)
    if (ui.activeUnitId === unitId) ui.activeUnitId = null
    syncHud()
  }

  function startWave(): void {
    const e = engine.value
    if (!e) return
    const ui = useUiStore()
    const res = e.startNextWave()
    if (!res.ok) ui.toast(res.message)
    syncHud()
  }

  function togglePause(): void {
    const e = engine.value
    if (!e) return
    const ui = useUiStore()
    e.togglePause()
    ui.toast(e.status === 'paused' ? '先歇一会儿' : '继续守')
    syncHud()
  }

  function restart(): void {
    const e = engine.value
    if (!e) return
    const ui = useUiStore()
    e.reset()
    ui.hideResult()
    ui.clearSelection()
    syncHud()
    void audio.startBgm()
  }

  return {
    engine,
    hud,
    boot,
    syncHud,
    build,
    upgrade,
    remove,
    startWave,
    togglePause,
    restart,
  }
})
