/**
 * 素材加载器
 * 规则：素材全部放在 public/assets 下，由用户自行替换。
 * 图片缺失或加载失败时返回 null，渲染层会自动画程序化占位图形，保证游戏永远能跑。
 */

type LoadState = 'idle' | 'loading' | 'loaded' | 'failed'

interface Entry {
  img: HTMLImageElement
  state: LoadState
  promise: Promise<boolean> | null
}

const cache = new Map<string, Entry>()

/**
 * 让素材路径跟随 Vite 的 base。
 * 配置里统一写 '/assets/xxx.png' 这种绝对路径，部署在域名子目录时（base './'）
 * 会拼成 './assets/xxx.png'，避免 404。缓存键仍用配置里的原始路径。
 */
export function assetUrl(src: string): string {
  if (!src.startsWith('/')) return src
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return src
  return base.replace(/\/+$/, '') + src
}

function ensure(src: string): Entry {
  const hit = cache.get(src)
  if (hit) return hit

  const img = new Image()
  const entry: Entry = { img, state: 'idle', promise: null }
  img.dataset.src = src
  cache.set(src, entry)
  return entry
}

/**
 * 加载单张图片，返回是否成功。
 * 同一个 src 只会真正请求一次。
 */
export function loadImage(src: string): Promise<boolean> {
  const entry = ensure(src)
  if (entry.state === 'loaded') return Promise.resolve(true)
  if (entry.state === 'failed') return Promise.resolve(false)
  if (entry.promise) return entry.promise

  entry.state = 'loading'
  entry.promise = new Promise<boolean>((resolve) => {
    entry.img.onload = () => {
      entry.state = 'loaded'
      resolve(true)
    }
    entry.img.onerror = () => {
      entry.state = 'failed'
      resolve(false)
    }
    entry.img.src = assetUrl(src)
  })
  return entry.promise
}

/** 取已加载完成的图片；未就绪返回 null，调用方需自行降级绘制 */
export function getImage(src: string): HTMLImageElement | null {
  const entry = cache.get(src)
  if (!entry || entry.state !== 'loaded') return null
  return entry.img
}

/** 批量预加载，忽略失败 */
export async function preloadImages(list: string[]): Promise<void> {
  await Promise.all(list.map((src) => loadImage(src)))
}
