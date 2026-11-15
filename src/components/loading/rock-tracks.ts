// ---------------------------------------------------------------------------
// Faixas/vocalistas da tela de carregamento de rota.
// Os dados ficam em src/data/loading.json (como o resto do site); este arquivo
// só tipa e expõe. Arquivo sem componentes para não quebrar o Fast Refresh.
// ---------------------------------------------------------------------------

import loadingData from "../../data/loading.json"

export type RockTrackId = "sharks" | "vermilion" | "what_ive_done" | "eu_protesto"
export type VinylPreset = "rhythm" | "cobalt" | "citrus" | "newsprint" | RockTrackId

export interface VinylPalette {
  /** Papel / tom de fundo e realce. */
  paper: string
  /** Tinta do vinil e dos pontos de meio-tom. */
  ink: string
  /** Neon/realce do retrato e do título ativo. */
  glow: string
  /** Sombra / extrusão. */
  edge: string
  /** Faíscas de meio-tom. */
  spark: string
}

export interface RockTrackMeta {
  id: RockTrackId
  band: string
  singer: string
  song: string
  bpm: number
  /** Foto real opcional do cantor (URL ou /rock/arquivo.webp). Vazio = usa o SVG. */
  singerImage?: string
  /** Crédito da foto (obrigatório em CC BY / CC BY-SA). Ex.: "Joe Bielawa · CC BY 2.0". */
  singerImageCredit?: string
  /** Página de origem da foto (Wikimedia Commons). */
  singerImageCreditUrl?: string
  palette: VinylPalette
  ringText: string
  stages: [string, string, string] | string[]
}

/** Textos/duração padrão do portão (vindos do JSON). */
export const LOADING_DEFAULTS = {
  durationMs: loadingData.durationMs,
  loadingWord: loadingData.loadingWord,
}

export const ROCK_TRACKS = loadingData.tracks as Record<RockTrackId, RockTrackMeta>

export const ROCK_TRACK_ORDER = loadingData.order as RockTrackId[]
