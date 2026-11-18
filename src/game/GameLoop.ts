/**
 * 主循环
 * 固定步长 1/60 秒，高刷屏与 60Hz 屏表现一致；单帧最多补 5 步，避免卡顿后瞬移。
 */

export class GameLoop {
  private rafId = 0
  private last = 0
  private acc = 0
  private running = false
  private readonly step = 1 / 60
  private readonly maxSteps = 5

  constructor(private readonly onStep: (dt: number) => void) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.acc = 0
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private tick = (now: number): void => {
    if (!this.running) return
    const delta = Math.min((now - this.last) / 1000, 0.25)
    this.last = now
    this.acc += delta

    let steps = 0
    while (this.acc >= this.step && steps < this.maxSteps) {
      this.onStep(this.step)
      this.acc -= this.step
      steps += 1
    }
    if (steps >= this.maxSteps) this.acc = 0

    this.rafId = requestAnimationFrame(this.tick)
  }
}
