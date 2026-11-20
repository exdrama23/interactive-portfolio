
import loadingData from "../../data/loading.json"

export type RockTrackId = "sharks" | "vermilion" | "what_ive_done" | "eu_protesto"
export type VinylPreset = "rhythm" | "cobalt" | "citrus" | "newsprint" | RockTrackId

export interface VinylPalette {
  paper: string
  ink: string
  glow: string
  edge: string
  spark: string
}

export interface RockTrackMeta {
  id: RockTrackId
  band: string
  singer: string
  song: string
  bpm: number
  singerImage?: string
  singerImageCredit?: string
  singerImageCreditUrl?: string
  palette: VinylPalette
  ringText: string
  stages: [string, string, string] | string[]
}

export const LOADING_DEFAULTS = {
  durationMs: loadingData.durationMs,
  loadingWord: loadingData.loadingWord,
}

export const ROCK_TRACKS = loadingData.tracks as Record<RockTrackId, RockTrackMeta>

export const ROCK_TRACK_ORDER = loadingData.order as RockTrackId[]
