/**
 * 存储兼容层
 * 浏览器用 localStorage；后续接入 Tauri 时，只需在这里补一个文件读写分支，
 * 调用方（store）不需要改。
 */

import type { GameSettings } from '@/types/game'

const SETTINGS_KEY = 'pear-light:settings:v1'

const DEFAULT_SETTINGS: GameSettings = {
  bgm: true,
  sfx: true,
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function loadSettings(): GameSettings {
  if (!hasLocalStorage()) return { ...DEFAULT_SETTINGS }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<GameSettings>
    return {
      bgm: parsed.bgm !== false,
      sfx: parsed.sfx !== false,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: GameSettings): void {
  if (!hasLocalStorage()) return
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* 隐私模式下写入失败，忽略即可 */
  }
}
