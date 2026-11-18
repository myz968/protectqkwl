/**
 * UI 状态：选中单位、铲子模式、悬浮格、提示条、彩蛋、结算弹窗、音频开关
 * 与游戏逻辑无关的界面状态都放这里，引擎不感知。
 */

import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import type { EasterEgg } from '@/config/copywriting'
import type { GameSettings, GridPos, PendingRemove, RunResult, UnitType } from '@/types/game'
import { loadSettings, saveSettings } from '@/utils/storage'
import { audio } from '@/utils/audio'

export const useUiStore = defineStore('ui', () => {
  /** 当前待放置的单位类型（null 表示没选） */
  const selectedUnitType = ref<UnitType | null>(null)
  /** 铲子模式：选中后点棋盘上的单位可以收回 */
  const shovelMode = ref(false)
  /** 等玩家二次确认的移除请求 */
  const pendingRemove = ref<PendingRemove | null>(null)
  /** 鼠标悬浮的格子，用于高亮 */
  const hoverCell = ref<GridPos | null>(null)
  /** 当前点开详情的单位 id（卷梨可强化） */
  const activeUnitId = ref<number | null>(null)

  const toastMessage = ref('')
  let toastTimer = 0

  const easterEgg = ref<EasterEgg | null>(null)
  let eggTimer = 0

  const result = ref<RunResult | null>(null)

  const settings = reactive<GameSettings>(loadSettings())

  function applyAudioSettings(): void {
    audio.bgmEnabled = settings.bgm
    audio.sfxEnabled = settings.sfx
  }
  applyAudioSettings()

  watch(
    () => ({ ...settings }),
    () => {
      applyAudioSettings()
      saveSettings({ ...settings })
      if (settings.bgm) void audio.startBgm()
      else audio.stopBgm()
    },
    { deep: true },
  )

  function toast(message: string): void {
    if (!message) return
    toastMessage.value = message
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toastMessage.value = ''
    }, 1900)
  }

  function showEasterEgg(egg: EasterEgg): void {
    easterEgg.value = egg
    window.clearTimeout(eggTimer)
    eggTimer = window.setTimeout(() => {
      easterEgg.value = null
    }, 4600)
  }

  function dismissEasterEgg(): void {
    window.clearTimeout(eggTimer)
    easterEgg.value = null
  }

  /** 选单位：和铲子互斥，再点一次取消 */
  function selectUnit(type: UnitType | null): void {
    selectedUnitType.value = selectedUnitType.value === type ? null : type
    shovelMode.value = false
    activeUnitId.value = null
  }

  /** 拿起 / 放下铲子 */
  function toggleShovel(): void {
    shovelMode.value = !shovelMode.value
    if (shovelMode.value) {
      selectedUnitType.value = null
      activeUnitId.value = null
    }
    pendingRemove.value = null
  }

  /** 铲子点到单位 → 请玩家确认 */
  function askRemove(payload: PendingRemove): void {
    pendingRemove.value = payload
  }

  function cancelRemove(): void {
    pendingRemove.value = null
  }

  function clearSelection(): void {
    selectedUnitType.value = null
    shovelMode.value = false
    activeUnitId.value = null
    pendingRemove.value = null
  }

  function setHover(cell: GridPos | null): void {
    hoverCell.value = cell
  }

  function showResult(r: RunResult): void {
    result.value = r
  }

  function hideResult(): void {
    result.value = null
  }

  function toggleBgm(): void {
    settings.bgm = !settings.bgm
  }

  function toggleSfx(): void {
    settings.sfx = !settings.sfx
  }

  return {
    selectedUnitType,
    shovelMode,
    pendingRemove,
    hoverCell,
    activeUnitId,
    toastMessage,
    easterEgg,
    result,
    settings,
    toast,
    showEasterEgg,
    dismissEasterEgg,
    selectUnit,
    toggleShovel,
    askRemove,
    cancelRemove,
    clearSelection,
    setHover,
    showResult,
    hideResult,
    toggleBgm,
    toggleSfx,
  }
})
