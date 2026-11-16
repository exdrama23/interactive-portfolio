// ---------------------------------------------------------------------------
// Câmera e matemática pura da introdução.
// É AQUI que você mexe se quiser mudar o caminho/velocidade da viagem.
// ---------------------------------------------------------------------------

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

/** Deterministic Mulberry32 PRNG for SSR-safe procedural pixel stars & skyline. */
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

/** Simulated loading curve t ∈ [0, 1] -> pct ∈ [0, 100]. */
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

// Center monitor inner screen coordinates in the 100cqw x 200cqh world:
// Left = 52cqw, Top = 128cqh (28cqh inside room), Width = 20cqw, Height = 20cqh.
// Center = (62cqw, 138cqh). At scale = 100 / 20 = 5.0, the screen fills 100% of viewport.
// IMPORTANTE: se mudar o tamanho/posição do monitor em preloader.css
// (.pw-monitor-screen) e em pixel-scene.tsx (PixelRoomBackgroundSvg), atualize
// estas três constantes com os mesmos números.
export const MON_CX = 62
export const MON_CY = 138
export const MON_W = 20
export const FINAL_SCALE = 100 / MON_W // 5.0

export type PwCamera = {
  tx: number
  ty: number
  scale: number
  winFade: number
  chairDrop: number
}

/**
 * Computes the continuous camera matrix for normalized progress t ∈ [0, 1]:
 * - Stage 1 [0.00 .. 0.24]: Starry night & Pixel Moon
 * - Stage 2 [0.24 .. 0.66]: Smooth pan down through bedroom window into the cozy room
 * - Stage 3 [0.66 .. 1.00]: Push in past the programmer's chair into the center monitor (scale = 5.0)
 *
 * `portrait` liga o enquadramento de tela em pé: a arte do quarto é recortada
 * (não esticada) e o monitor central fica no centro do viewport, então a
 * câmera centraliza em 50cqw em vez de 62cqw.
 */
export function pwCamera(t: number, portrait = false): PwCamera {
  const k = pwClamp01(t)
  const endCx = portrait ? 50 : MON_CX
  let cx = 50
  let cy = 42
  let scale = 1.06
  let winFade = 1
  let chairDrop = 0 // Gently slides the chair/boy down as camera dives into the screen

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
    // As camera gets close to the center screen, the chair slides down out of the lens path
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
