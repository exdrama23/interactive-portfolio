// Ponte do preview do Nox para o studio principal.
//
// O preview monta uma tira com os quadros do clipe que esta tocando e deixa
// aqui, no sessionStorage. O studio le na abertura e entrega a tira ao
// importador que ele ja tem, sem download e upload no meio.

export interface NoxStudioHandoff {
  clip: string
  fps: number
  loop: boolean
  frames: number
  width: number
  height: number
  // Canvas de cada quadro do clipe (antes do gutter). O studio usa isso para
  // recortar cada quadro inteiro 1:1, com as margens e a ancora originais.
  frameWidth: number
  frameHeight: number
  // Tira horizontal com os quadros lado a lado, separados por uma coluna
  // transparente: o importador do studio ja divide imagem por colunas vazias.
  strip: string
}

const KEY = 'nox-studio-handoff'

export function writeStudioHandoff(value: NoxStudioHandoff) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function readStudioHandoff(): NoxStudioHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<NoxStudioHandoff>
    if (typeof value.strip !== 'string' || !value.strip.startsWith('data:image/png;base64,')) {
      return null
    }
    return {
      clip: String(value.clip ?? 'nox'),
      fps: Number(value.fps) || 8,
      loop: Boolean(value.loop),
      frames: Number(value.frames) || 1,
      width: Number(value.width) || 0,
      height: Number(value.height) || 0,
      frameWidth: Number(value.frameWidth) || 0,
      frameHeight: Number(value.frameHeight) || 0,
      strip: value.strip,
    }
  } catch {
    return null
  }
}

export function clearStudioHandoff() {
  sessionStorage.removeItem(KEY)
}
