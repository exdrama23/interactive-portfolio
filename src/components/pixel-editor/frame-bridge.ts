// Ponte entre o importador do Nox e o editor de pixel art.
//
// Os quadros viajam como RGBA cru em base64 no sessionStorage. Assim o editor
// abre com os pixels ja prontos, sem canvas assincrono, e a volta tambem e
// sincrona. O limite do sessionStorage comporta os clipes curtos do Nox.

export const FRAME_BRIDGE_KEY = 'nox-frame-bridge'
// Rascunho local da sessao de quadros. Nao precisa de banco: o navegador guarda
// o projeto enquanto a edicao esta aberta e ele volta no reload.
export const FRAME_DRAFT_KEY = 'nox-pixel-editor-frames'

export interface EncodedFrame {
  width: number
  height: number
  data: string
}

export interface FrameBridge {
  clip: string
  name: string
  frames: EncodedFrame[]
}

export function encodeFrame(image: ImageData): EncodedFrame {
  const bytes = new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength)
  return { width: image.width, height: image.height, data: bytesToBase64(bytes) }
}

export function decodeFrame(frame: EncodedFrame): ImageData {
  const bytes = base64ToBytes(frame.data)
  const copy = new Uint8ClampedArray(bytes.length)
  copy.set(bytes)
  return new ImageData(copy, frame.width, frame.height)
}

export function encodeLayer(width: number, height: number, data: Uint32Array): EncodedFrame {
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  return { width, height, data: bytesToBase64(bytes) }
}

export function decodeLayer(frame: EncodedFrame): Uint32Array {
  const bytes = base64ToBytes(frame.data)
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return new Uint32Array(copy.buffer)
}

export function writeFrameBridge(payload: FrameBridge) {
  if (!payload.frames.length) return false
  try {
    sessionStorage.setItem(FRAME_BRIDGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function readFrameBridge(): FrameBridge | null {
  try {
    const raw = sessionStorage.getItem(FRAME_BRIDGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as FrameBridge
    if (!Array.isArray(payload.frames) || !payload.frames.length) return null
    const valid = payload.frames.every(
      (frame) => frame.width > 0 && frame.height > 0 && typeof frame.data === 'string',
    )
    return valid ? payload : null
  } catch {
    return null
  }
}

export function clearFrameBridge() {
  try {
    sessionStorage.removeItem(FRAME_BRIDGE_KEY)
  } catch {
    /* sessao indisponivel */
  }
}

export function clearFrameDraft() {
  try {
    localStorage.removeItem(FRAME_DRAFT_KEY)
  } catch {
    /* armazenamento indisponivel */
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(text: string) {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
