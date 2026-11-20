
export function vhpClamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function vhpSimulated(t: number) {
  const k = vhpClamp01(t)
  const ease = 1 - Math.pow(1 - k, 2.2)
  const stall = 0.04 * Math.sin(k * Math.PI * 4) * Math.sin(k * Math.PI)
  const v = (ease - stall * (1 - k)) * 100
  return k >= 1 ? 100 : Math.max(0, Math.min(99.9, v))
}

export function vhpStage(pct: number, count: number) {
  const n = Math.max(1, Math.floor(count))
  if (n === 1) return 0
  if (pct >= 100) return n - 1
  return Math.max(0, Math.min(n - 1, Math.floor((Math.max(0, pct) / 100) * n)))
}

export function vhpRpm(pct: number) {
  const k = vhpClamp01(pct / 38)
  return 33.333 * (1 - Math.pow(1 - k, 3))
}

export function vhpNeedle(pct: number, rl: number, rv: number) {
  const band = rv - rl
  return rv - band * 0.08 - band * 0.84 * vhpClamp01(pct / 100)
}

export function vhpBeat(ms: number, bpm: number) {
  const b = Math.max(30, Math.min(240, bpm || 120))
  const phase = ((ms / 60000) * b) % 1
  return Math.exp(-phase * 5.2)
}

export function vhpAngleDelta(a: number, b: number) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export function vhpPad(pct: number) {
  const n = Math.max(0, Math.min(100, Math.floor(pct)))
  return (n < 10 ? "00" : n < 100 ? "0" : "") + n
}

export function vhpRGB(c: string, fallback: number[]) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((c || "").trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
}

export function vhpLayout(w: number, h: number) {
  const W = Math.max(1, w)
  const H = Math.max(1, h)
  const u = Math.min(W, H)
  const sx = W * 0.5
  const sy = H * 0.5
  const rl = u * 0.215
  const rv = u * 0.395
  const bx = sx
  const by = sy
  const br = u * 0.445
  return {
    u,
    sx,
    sy,
    rl,
    rv,
    hole: u * 0.016,
    bx,
    by,
    br,
    cell: Math.max(4.5, Math.min(9.5, u * 0.011)),
  }
}
