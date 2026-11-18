/**
 * 生产环境启动脚本
 *
 * 1. 先出包：平台上传源码时会排除 dist（构建产物），沙箱里留着的是上一次部署的旧 dist。
 *    直接 preview 的话，线上跑的还是上一版 —— 所以每次启动都重新 vite build 一次。
 *    （只跑 vite build，不带 vue-tsc：类型检查留在本地 npm run build 做，不拖慢启动）
 * 2. 再托管：读平台注入的 PORT，用 vite preview 起单端口静态服务。
 * 不依赖 shell 变量展开，Windows / Linux 都能跑。
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

const port = process.env.PORT || '3000'
const viteBin = 'node_modules/vite/bin/vite.js'

if (!existsSync(viteBin)) {
  console.error('[serve] 找不到 vite，请先执行 npm install')
  process.exit(1)
}

function runVite(args) {
  return spawn(process.execPath, [viteBin, ...args], { stdio: 'inherit', env: process.env })
}

console.log('[serve] 构建中…')
const build = runVite(['build'])

build.on('error', (err) => {
  console.error('[serve] 构建启动失败', err)
  process.exit(1)
})

build.on('exit', (code) => {
  if (code !== 0) {
    console.error('[serve] 构建失败，退出码', code)
    process.exit(code ?? 1)
  }
  console.log(`[serve] 构建完成，启动预览服务 :${port}`)
  const preview = runVite(['preview', '--host', '0.0.0.0', '--port', String(port), '--strictPort'])
  preview.on('exit', (previewCode) => process.exit(previewCode ?? 0))
  preview.on('error', (err) => {
    console.error('[serve] 预览服务启动失败', err)
    process.exit(1)
  })
})
