# Nox

Arte oficial do Nox em Canvas 2D. O pacote junta a arte nativa antiga, os
quadros extraidos do atlas de animacoes aprovado e o pipeline que monta o sheet
e o JSON usados pelo runtime.

## O que tem aqui

```
assets/
  reference/       nox-master.jpeg (original intacto) e o recorte cru antigo
  sprites/master/  arte nativa 43x55, frame antigo 64x64 e idle antigo
  sprites/<clipe>/ quadros do clipe, numerados (idle-0.png, idle-1.png...)
  atlas/           nox-atlas.png, montado a partir das pastas de sprites
  animations/      nox-animations.json gerado pelo pipeline
  nox-palette.json 17 cores da arte nativa antiga
tools/nox/
  import_gemini.py extrai os clipes do contact sheet novo (arte do Gemini)
  import_atlas.py  extrator antigo, mantido para o atlas aprovado
  prompt-animacao.md prompt de geracao de uma animacao por vez
  clips.json       configuracao dos clipes (fps, loop, sequencia, offsets, eventos)
  build_atlas.py   valida os quadros e monta atlas + JSON
  build_master.py  reconstroi a arte nativa antiga a partir da referencia
```

## Duas geracoes de arte

1. **Arte nativa antiga**: reconstruida do JPEG 1222x1287, que contem a arte
   ampliada exatamente 13x. O gato ocupa 43x55 blocos no canvas nativo de 93x98.
   Fica em `sprites/master/` como referencia de identidade e para comparacao.
2. **Arte oficial das animacoes**: contact sheet novo do Gemini, 2528x1684,
   com 22 clipes em 7 faixas. E a fonte dos quadros em `sprites/<clipe>/`. O
   atlas antigo 1536x1024 continua preservado como referencia.

O contact sheet novo nao tem alpha: o fundo e preto solido e cada grupo tem um
rotulo branco. O `import_gemini.py` remove o fundo por flood fill, apaga os
rotulos, separa os quadros por projecao de alpha e grava cada clipe na sua
pasta. O clipe de celebracao fica de fora ate a arte ser refeita.

## Medidas oficiais

| Item | Valor |
|---|---|
| Canvas no chao | 216x216 px |
| Canvas no ar (jump, fall, land) | 216x280 px |
| Ancora no chao (linha dos pes) | (108, 204) |
| Ancora no ar | (108, 268) |
| Largura do atlas | 2048 px |
| Escala | 1:1, sem ampliacao no asset |
| Fonte das animacoes | `src/assets/img/logos/Gemini_Generated_Image_qzei37qzei37qzei.jpeg` |
| Alpha | real, bordas suaves, sem binarizacao |
| Paleta | cores originais do atlas, sem reducao |

O clipe de celebracao nao e extraido: a arte sera refeita pelo autor.

## Como foi extraido

`python tools/nox/import_gemini.py` le o contact sheet novo e:

- remove o fundo preto conectado as bordas por flood fill, sem tocar no pelo;
- apaga os rotulos brancos e a sombra cinza neutra de cada grupo;
- separa os quadros por projecao de alpha, dividindo faixas com dois ou tres
  quadros encostados;
- recorta preservando o alpha real, sem redimensionar nem reduzir paleta;
- monta o canvas de 216x216 com o pe em `y = 203` nos clipes de chao e usa
  216x280 nos clipes aereos, mantendo a altura relativa entre os quadros.

O `--check` mostra a grade detectada sem gravar nada. A imagem de origem nunca e
alterada.

```bash
python tools/nox/import_gemini.py --check   # confere a grade
python tools/nox/import_gemini.py           # regrava as pastas de sprites
```

O `import_atlas.py` antigo continua no repositorio apenas para o atlas aprovado
anterior.

## Pipeline dos sprints

Toda entrega de movimento entra pelo mesmo caminho: coloque os PNGs na pasta do
clipe, ajuste `tools/nox/clips.json` e rode o build. O script valida antes de
gravar e aborta se o quadro estiver fora do canvas ou com o pe fora da ancora.
Nada e redimensionado, interpolado ou convertido para outra paleta.

```bash
python tools/nox/build_atlas.py --dry-run     # so valida
python tools/nox/build_atlas.py               # grava atlas + JSON
python tools/nox/build_atlas.py --strict-palette  # exige a paleta antiga
```

Em `clips.json`, cada clipe aceita:

| Campo | Para que serve |
|---|---|
| `folder` | pasta dos quadros em `assets/sprites` |
| `fps`, `loop`, `status`, `note` | metadados do clipe |
| `sequence` | ordem dos arquivos, inclusive repeticao (ex.: `[0, 1, 0]`) |
| `durations` | duracao por quadro em ms; sem isso vale o `fps` |
| `offsets` | deslocamento por quadro, em pixels inteiros |
| `events` | eventos de quadro consumidos pela camada de comportamento |
| `frameWidth`, `frameHeight` | canvas proprio do clipe (ar usa 216x280) |
| `anchor` | ancora propria, quando o clipe nao usa a linha dos pes |
| `air` | pula a validacao da linha dos pes para quadros no ar |

O status e intencional: um clipe com quadros ainda pode ficar `pending` ate a
revisao visual. O script avisa quando isso acontece.

## Status dos clipes

| Clipe | Status | Quadros |
|---|---|---|
| idle, walk, run | pronto | 5 |
| sit | pronto | 5 |
| sleep | pronto | 4 |
| wake | pronto | 5 |
| jump, fall, land | pronto | 5 |
| happy, angry, scared | pronto | 5 |
| pet, held, dragged | pronto | 5 |
| scratch, yawn | pronto | 5 |
| meow, lookAround | pronto | 4 |
| stretch, tailFlick | pronto | 3 |
| celebrate | pendente | arte sera refeita |

O clipe vazio nunca e reproduzido: `isPlayable` retorna falso e a UI marca como
pendente.

## Importador por animacao

`/__nox-import` (so em desenvolvimento) importa uma animacao por vez:

- uma tira horizontal, dividida nas colunas vazias, ou varios PNGs quadro a
  quadro com reordenacao;
- pergunta o que fazer com o fundo: manter alpha, remover a cor do canto
  conectada as bordas ou remover a cor em toda a imagem, com tolerancia;
- corte manual ao clicar na tira, mais dividir no vazio e juntar anterior ou
  proxima;
- previa com ancora, fps, loop e status, sem redimensionar a arte;
- grava os PNGs em `sprites/<clipe>/`, atualiza `clips.json` e, se marcado, roda
  o `build_atlas.py`.

O prompt para gerar a arte no formato certo fica em
`tools/nox/prompt-animacao.md`. A barra de navegacao dos estudios esta em
`studio-nav.tsx` e aparece em todas as rotas `/__*`.

## Runtime

- `animation/types.ts`: formato do JSON, incluindo `anchor` por clipe.
- `animation/registry.ts`: carrega e valida os clipes.
- `animation/animator.ts`: reproducao por tempo, com duracao por quadro, loop
  e eventos de quadro.
- `sprite-sheet.ts`: carrega o atlas e desenha o quadro com escala inteira.
- `nox-preview.tsx`: rota `/__nox-preview` (so em desenvolvimento), com fundo
  claro e escuro, ancora e status dos clipes. A area do canvas acompanha o maior
  quadro do clipe e usa a ancora propria quando o clipe define uma.
- `nox-import.tsx`: rota `/__nox-import`, o importador por animacao.

O `Mascot.tsx` continua usando a arte antiga. A troca do runtime e a camada
`PetStateMachine`/`PetController` entram depois, para nao misturar as duas
geracoes de arte na mesma sessao.

## Licenca da referencia

A imagem de referencia e o atlas foram fornecidos pelo autor do portfolio. Antes
de publicar o site com esses assets, confirme a origem e a licenca da imagem
original.
