import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 配置：构建产物固定输出到项目内 dist，缓存目录指向 D 盘
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  cacheDir: 'D:/workspace/npm-cache/vite',
  server: {
    port: 5174,
    host: '127.0.0.1',
    open: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'static',
  },
})
