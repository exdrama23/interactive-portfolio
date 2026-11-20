
export function pwClamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function pwLerp(a: number, b: number, t: number) {
  return a + (b - a) * pwClamp01(t)
}

export function pwSmoothstep(t: number) {
  const k = pwClamp01(t)
  return k * k * (3 - 2 * k)
}

export function pwEaseInOutCubic(t: number) {
  const k = pwClamp01(t)
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
}

export function pwRand(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pwSimulated(t: number) {
  const k = pwClamp01(t)
  const ease = 1 - Math.pow(1 - k, 1.85)
  const ripple = 0.016 * Math.sin(k * Math.PI * 3) * Math.sin(k * Math.PI)
  const v = (ease * 0.84 + k * 0.16 - ripple) * 100
  return k >= 1 ? 100 : Math.max(0, Math.min(100, v))
}

export function pwPad(pct: number) {
  const n = Math.max(0, Math.min(100, Math.floor(pct)))
  return (n < 10 ? "00" : n < 100 ? "0" : "") + n
}

export const MON_CX = 62
export const MON_CY = 138
export const MON_W = 20
export const FINAL_SCALE = 100 / MON_W

export type PwCamera = {
  tx: number
  ty: number
  scale: number
  winFade: number
  chairDrop: number
}

export function pwCamera(t: number, portrait = false): PwCamera {
  const k = pwClamp01(t)
  const endCx = portrait ? 50 : MON_CX
  let cx = 50
  let cy = 42
  let scale = 1.06
  let winFade = 1
  let chairDrop = 0

  if (k < 0.24) {
    const u = pwSmoothstep(k / 0.24)
    cx = pwLerp(50, 50, u)
    cy = pwLerp(40, 48, u)
    scale = pwLerp(1.08, 1.02, u)
    winFade = 1
    chairDrop = 0
  } else if (k < 0.66) {
    const u = pwEaseInOutCubic((k - 0.24) / 0.42)
    cx = pwLerp(50, portrait ? 50 : 53, u)
    cy = pwLerp(48, 146, u)
    scale = pwLerp(1.02, 1.28, u)
    winFade = pwClamp01(1 - (u - 0.38) / 0.45)
    chairDrop = 0
  } else {
    const u = (k - 0.66) / 0.34
    const posEase = pwEaseInOutCubic(u)
    const zoomEase = Math.pow(pwClamp01(u), 2.3)
    cx = pwLerp(portrait ? 50 : 53, endCx, posEase)
    cy = pwLerp(146, MON_CY, posEase)
    scale = pwLerp(1.28, FINAL_SCALE, zoomEase)
    winFade = 0
    chairDrop = pwSmoothstep((u - 0.15) / 0.7) * 42
  }

  const tx = 50 - cx * scale
  const ty = 50 - cy * scale

  return { tx, ty, scale, winFade, chairDrop }
}

export function pwStageLabel(pct: number) {
  if (pct < 24) return "01 / 03 — NOITE ESTRELADA & LUA"
  if (pct < 66) return "02 / 03 — ENTRANDO NO QUARTO"
  return "03 / 03 — MERGULHANDO NO SETUP [HERO]"
}
