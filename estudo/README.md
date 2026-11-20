# estudo

Código preservado para consulta. Estes arquivos **não** fazem parte da aplicação:
ficam fora de `src/`, então não entram no build (`vite`), no typecheck (`tsc`) nem
no lint. Nada aqui é importado pelo site.

Os `import` foram mantidos exatamente como no original. Caminhos `@/...` e
`./...` apontam para a localização antiga (dentro de `src/`), e não resolvem a
partir daqui.

## efeitos-webgl/
Experimentos de efeito visual com Three.js que não são usados em nenhuma página.

- `SynapticDark.ts` — efeito de "explosão" ao clique duplo (estado, shaders e animação).
- `comentado.ts` — a mesma implementação, porém versão anotada linha a linha
  (material de estudo que originou o arquivo acima).

## relay-de-tecnologias/
Uma tentativa antiga de exibir as tecnologias como um "relay" (corrente de
blocos) em 2D e 3D. Foi substituída pelos componentes atuais de tecnologias
(`tech-orbit`, `tech-level`, `tecnologias.tsx`).

- `tech-relay.tsx` — versão 2D com cartões expansíveis.
- `tech-relay-3d.tsx` — versão 3D.
- `tech-relay-board.tsx` — versão em "board" com trilha/trilho.
- `relay.tsx` — componente base do desenho da trilha (usa `@lucasmarkes/hairline`).
- `relay-tiles.ts` — dados/medidas dos blocos e da corrente.
- `relay-utils/hairline-index.ts` — reexport da lib `@lucasmarkes/hairline`.
- `tipos/hairline.d.ts` — declaração de tipos da `@lucasmarkes/hairline`.

## componentes-antigos/
Componentes que não são renderizados por nenhuma rota.

- `Header.tsx` — cabeçalho antigo (substituído pelo header atual do `App`).
- `Footer.tsx` — rodapé antigo com imagem de fundo.
- `GithubPessoal.tsx` — card de perfil do GitHub feito à mão.
- `ImageSlider.tsx` — carrossel de imagens (usa `TypedHeader`).
- `TypedHeader.tsx` — efeito de texto digitado usado pelo `ImageSlider`.
- `animacaoEstudo.tsx` — menu esférico 3D inspirado em Active Theory.
- `DebugInfo.tsx` — painel de debug da sidebar (importava `./types` da sidebar).

## paginas-antigas/
- `Inicio.tsx` — primeira versão da home (a rota `/` usa `pages/Index.tsx`).

## referencias/
Rascunhos e materiais que não são compilados nem servidos.

- `tx/*.txt` — snippets de estudo (header, menu, CSS da sidebar).
- `ParticleText.txt` — cópia antiga do `ParticleText.tsx`.
- `sobre.txt` — rascunho do conteúdo da página Sobre.
- `react.svg` — logo padrão do Vite, nunca usado.
- `HeaderAnime` — arquivo vazio (0 byte).
