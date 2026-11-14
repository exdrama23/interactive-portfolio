# Introdução — Pixel World

Animação de abertura da home: a câmera atravessa o céu estrelado, entra no quarto,
passa pelo setup de três monitores e mergulha na tela central, que vira o site.

Ela roda **uma vez por carga completa da página** (F5/reload). Navegar entre rotas
dentro do SPA não repete a introdução.

Para ser leve, a home **não é montada enquanto a intro roda**: ela entra só no
hold final (pct 100%), quando a capa ainda está opaca. O fade de 650ms revela um
hero já no estado final (a classe `intro-handoff` desliga a entrada escalonada
do hero enquanto a intro está de pé).

## Onde mexer em cada coisa

| Quero mudar… | Arquivo |
| --- | --- |
| Caminho, zoom, velocidade das etapas, duração do fade | `camera.ts` |
| Desenho do quarto, monitores, cadeira, lua, estrelas, céu | `pixel-scene.tsx` |
| Cores, fontes, medidas, HUD, scanlines | `preloader.css` |
| Progresso, fases, botão "Pular Intro", callbacks | `pixel-world-preloader.tsx` |
| Onde a intro aparece na home | `intro-overlay.tsx` + `src/pages/Index.tsx` |

## Editando o caminho da câmera (`camera.ts`)

`pwCamera(t)` recebe o progresso normalizado `t` (0 → 1) e devolve:

- `tx`, `ty` — deslocamento em `cqw`/`cqh`
- `scale` — zoom
- `winFade` — opacidade da máscara externa (janela/prédio)
- `chairDrop` — descida da cadeira em % para tirá-la da frente do monitor

As três etapas estão comentadas no próprio arquivo:

1. `0.00 – 0.24` céu estrelado e lua
2. `0.24 – 0.66` panorâmica descendo até o quarto
3. `0.66 – 1.00` mergulho no monitor central (escala final 5×)

Se mudar o **tamanho ou a posição do monitor central**, atualize em conjunto:

1. `MON_CX`, `MON_CY`, `MON_W` em `camera.ts`
2. `.pw-monitor-screen` em `preloader.css` (`left: 52cqw; top: 28cqh; width/height: 20cqw/20cqh`)
3. o retângulo do monitor central em `PixelRoomBackgroundSvg` (`pixel-scene.tsx`)

Esses números precisam bater, senão o zoom termina fora da tela.

## Editando a arte (`pixel-scene.tsx`)

- `AlecPortfolioHero` — o que aparece **dentro** do monitor central
- `PixelRoomBackgroundSvg` — quarto, janela, estante, cama, mesa, monitores laterais
- `PixelProgrammerChairSvg` — cadeira gamer e programador (camada da frente)
- `PixelMoonSvg` / `ExteriorBuildingMaskSvg` — lua e fachada do prédio
- `STARS` / `SKYLINE` — gerados por semente em `pwRand` (mude a semente para variar)

Os SVGs usam `viewBox="0 0 320 180"` esticado (`preserveAspectRatio="none"`).

## Ajustes rápidos

- **Duração da viagem:** `durationMs` (padrão `7800`)
- **Fade final:** `FADE_MS` em `pixel-world-preloader.tsx` + `preloader.css`
  (`transition: opacity 650ms…`) — mantenha os dois iguais
- **Não repetir nem no reload:** por padrão ela roda a cada carga completa.
  Para mostrar só uma vez por sessão, guarde um flag em `sessionStorage`:

```ts
const alreadySeen = sessionStorage.getItem("intro-seen") === "1";
sessionStorage.setItem("intro-seen", "1");
```

- **Progresso:** a suavização é baseada em tempo (`easeK` com `dt`), então a
  viagem dura os `durationMs` configurados mesmo em aparelhos com FPS baixo.
- **Sem introdução:** o componente é ignorado quando o visitante usa
  `prefers-reduced-motion: reduce`.

## Estrutura

```
introducao/
  camera.ts                  # curva da câmera + helpers matemáticos
  pixel-scene.tsx            # toda a arte SVG
  preloader.css              # estilos escopados em .pw-*
  pixel-world-preloader.tsx  # motor (fases, progresso, HUD, skip)
  intro-overlay.tsx          # capa fixa montada na home
  index.ts                   # re-exports
  README.md                  # este arquivo
```
