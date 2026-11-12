declare module '@lucasmarkes/hairline' {
  export interface HairlineOptions {
    /** Ajusta a espera entre os saltos da animação (0 a 1). */
    intensity?: number
    theme?: 'light' | 'dark'
    label?: string
    play?: boolean
    onRead?: (text: string) => void
  }

  export interface Figure {
    update(options?: HairlineOptions): void
    destroy(): void
  }

  export function relay(el: HTMLElement, options?: HairlineOptions): Figure
}
