# Pontos de restauração — Sobre + seção de tecnologias

## 0. Estado atual — trilho horizontal Sobre → Hard skills

O Sobre termina com o cartão de contato **preso** (`sticky top-18svh`) e um
espaçador de `100svh`. A seção de Tecnologias sobe por cima do Sobre
(`margin-top: calc(-1 * var(--handoff-overlap))`, variável medida pelo Sobre)
e tem `z-20`, então sobrepõe o Sobre. Durante o handoff:

- o Sobre desliza para a esquerda (`x: 0 → -100vw` em `scrollY`);
- Tecnologias entra pela direita (`x: +100vw → 0`);
- os dois usam o **mesmo intervalo de um viewport**, sem spring na entrada,
  formando a impressão de um único trilho horizontal.

Depois da entrada, o trilho fixado percorre os 6 painéis de áreas
(categoria / contagem / nomes em `·`). O círculo (`TechOrbit`) desenha o traço
e revela os nós por ângulo; o `+` central abre o resto da stack.

Arquivos envolvidos:

- `src/pages/sobre.tsx` — cartão pinado, medição do handoff
  (`--handoff-overlap`) e `exitX`
- `src/pages/tecnologias.tsx` — trilho fixado, entrada lateral, painéis
  (`entrySpan`, `slideStart`) e círculo
- `src/components/ui/tech-orbit.tsx` — círculo, `LINE_PATH`, nós, `+`, modal
- `src/components/ui/tech-data.ts` — categorias e tipos
- `src/index.css` — `html/body/#root` com fundo preto (o canvas padrão era
  branco e aparecia nas frestas do handoff)

Observações:

- `html, body, #root { background: #000 }` é necessário: sem ele, o branco do
  canvas aparece entre as seções durante a transição.
- `--handoff-overlap` é medido por `ResizeObserver` no Sobre; se o layout
  mudar (fontes, imagens), o valor é recalculado.
- Em `prefers-reduced-motion`, o pin/espaçador do cartão e o trilho horizontal
  são desativados (layout estático).

### 0.1. Linha acelerada + texto escrito + imagens interativas

**Linha.** O traço usa `lineDrawn` (spring mais rígido), mapeado para chegar a
`pathLength = 1` em **72%** do trecho da seção — ele puxa o scroll em vez de
terminar junto com ela. Os textos continuam no ritmo antigo (`drawn`), para não
antecipar a revelação dos parágrafos.

**Texto.** `src/components/ui/written-text.tsx` percorre a árvore de nós (mantém
`<strong>`/`<br>`) e quebra o texto em caracteres. Cada caractere tem
`--tw-d` (atraso) e lê `--tw` do container; a regra `.tw-char` em `index.css`
faz `opacity: clamp(0, (--tw - --tw-d) * 26, 1)`. O container recebe `--tw` por
`progress.on('change')` — um único listener por parágrafo. Sem reflow: os
caracteres ocupam o espaço final desde o início.

**Imagens.** `src/components/ui/story-image.tsx` — o hover é um **zoom de tela**:
80 ms → o wrapper `.sobre-zoom` escala `1.022`; 1150 ms → `1.045` e o fundo
(headline, traço, textos e as outras imagens, marcados com `data-zoom-dim`)
recebe `blur(6px) brightness(0.5)` uniformemente; aparece "clique em mim".
O `transform-origin` é o centro da imagem em % do wrapper, então ela não "cresce
sozinha": a seção inteira se aproxima dela. Sair do mouse reseta na hora; um
listener de `scroll`/`mouseout` também limpa o estado se a imagem sair de baixo
do cursor (evita ficar turvo "do nada"). Em `prefers-reduced-motion` não há
hover — só o clique.

Clicar abre `src/components/ui/image-dialog.tsx` (portal para o `body`,
`z-[120]`). A coreografia copia o `bento-gallery` do Landingpage, mas o **painel
fica parado** e só a **coluna da foto** viaja (`.story-dialog-photo`, 900 ms):

- `0% → 40%`: a foto aparece centralizada em `translateX(var(--shift))` (shift =
  metade da coluna de texto) com `opacity 0 → 1` e `scale(0.99 → 1)`;
- `40% → 100%`: desliza para o slot esquerdo (`translateX(0)`).

O texto **não usa delay fixo**: o `animationend` do `.story-dialog-photo` seta
`textIn`, e só então `.story-dialog-meta` (0 ms), `.story-dialog-title` (70 ms),
`.story-char` (130 ms + até 600 ms proporcional ao índice, fade de 320 ms) e
`.story-dialog-tags` (700 ms) recebem a classe. A coluna de texto fica
`opacity: 0` até `textIn` (sem flash) e `TypedBody` só divide em caracteres
quando `showText`.

O painel é `w-fit` (foto no tamanho natural + coluna de texto `420px`,
respeitando `max-h-[92svh]`/`max-w-[96vw]`), a foto fica inteira
(`object-contain`) e rente às bordas internas. `--shift` é escrito direto no nó
em `useLayoutEffect` para um novo render não reiniciar a animação; `item` é
memoizado no Sobre pelo mesmo motivo.

Para o layout já nascer no tamanho final (e a animação começar no primeiro
frame), `natural` obtém as dimensões por `new Image()` com a URL que o card já
tem em cache e o `<img>` recebe `width/height`; o painel só renderiza quando
`dims` existe, e o foco vai para o botão fechar nesse efeito. `hiResReady`
pré-carrega `hiRes()` (`w=2400`) e troca em segundo plano. ESC/clique fora/botão
fecham e devolvem o foco ao card; `body.style.overflow` é restaurado.

Conteúdo do modal: `info` em cada item de `STORY` (`src/pages/sobre.tsx`).

No mobile as imagens continuam `md:block` (ocultas), então o modal só abre no
desktop; os textos escritos e a linha acelerada valem nas duas larguras.
`transform` não altera layout: o handoff segue com os mesmos números.


## 0.5. `formacao-lanyard/` — credenciais por formação (`#formacao`)

Seção com as credenciais penduradas em um trilho (componente
`CredentialRail`, em `src/components/ui/credential-rail.tsx`), agrupadas em
**Formações / Certificados / Trabalhos** por um painel de abas. O backup guarda
o `Index.tsx` de antes, sem `<Formacao />`.

**Conteúdo** (`CREDENCIAIS` em `src/pages/formacao.tsx`): 4 formações (UNIT
Ciência da Computação 2026–2030; SENAI/CETAF Técnico em Desenvolvimento de
Sistemas 01/2023–12/2025; Inovase Backend 10/2025–03/2026 e Frontend
07/2025–10/2025), 1 certificado (SENAI — Inteligência Artificial Industrial,
abr/2026) e 1 trabalho (Acesso — Desenvolvedor Júnior, fev/2026–o momento).
São os dados reais do LinkedIn em `src/assets/img/pdf/`.

**Painel de abas.** Cada botão mostra o nome do grupo e a quantidade de cartões
(`04`, `01`, `01`). Ao trocar, o grupo atual sai para a esquerda
(`.formacao-esteira-out`, 260 ms) e o próximo entra pela direita
(`.formacao-esteira-in`, 520 ms) — o efeito de esteira. A contagem também
aparece no topo da seção (`NN cartões`).

**Trilho e cordões.** `CredentialRail` nasceu do modelo `SkateDeckRail`
(pranchas no trilho) e foi adaptado: cada cartão tem o formato de credencial
(proporção 0.62) e pende por um cordão em V — duas fitas com a cor e a impressão
da instituição, fivela e clipe metálicos. O cordão acompanha o balanço; arrastar
o cartão na horizontal o desloca e balança, e o hover traz o cartão à frente.
No mobile o trilho vira carrossel (setas, pontos e swipe).

**Identidade por instituição.** Cada item carrega um `tema` (`TEMAS`):
`card`/`ink`/`accent` para o cartão e `strap`/`strapInk` para o cordão, mais o
`pattern` do tecido. As paletas seguem as marcas oficiais: UNIT azul + dourado,
SENAI azul + laranja, Inovase azul profundo + verde, Acesso grafite + verde
claro.

**Cordão.** `pattern` aceita `mandala`, `grid` (SENAI), `orbit` (UNIT/Acesso) ou
`circuit` (Inovase). A impressão é uma linha tracejada com o `strapInk` sobre a
fita, com o traço variando por motivo.

**Cartão.** `front`/`back` são funções `(w) => ReactNode`, onde `w` é a largura
real em px — o layout é desenhado em unidades de 200 px (`s = w / 200`) e
escala junto. `FormacaoFront/Back`, `CertificadoFront/Back` e
`TrabalhoFront/Back` têm layouts próprios; todos usam os selos em SVG
(`SealUnit`, `SealSenai`, `SealInovase`, `SealWork`) e a faixa inferior com
logo/nome e código de barras. Clicar no cartão abre o detalhe com as duas faces
(`Frente`/`Verso`) e a animação de elevação a partir do trilho.

Restaurar:

```powershell
Copy-Item ".backup\formacao-lanyard\Index.tsx" "src\pages\Index.tsx" -Force
```

## 1. `tech-grid-3d/` — versão aprovada ("Ficou bom")

Estado com a grade 3D em CSS (slabs em perspectiva), **sem** o relay.

Restaurar:

```powershell
Copy-Item ".backup\tech-grid-3d\tecnologias.tsx" "src\pages\tecnologias.tsx" -Force
```

## 2. `tech-grid-flat/` — versão plana original

Estado anterior ao 3D: grade 5×5 plana.

Restaurar:

```powershell
Copy-Item ".backup\tech-grid-flat\tecnologias.tsx" "src\pages\tecnologias.tsx" -Force
Copy-Item ".backup\tech-grid-flat\tech-relay.tsx" "src\components\ui\tech-relay.tsx" -Force
```

## 3. Sobre com linha do scroll

`src/pages/sobre.tsx` usa o traço do modelo skiper19 (`LINE_PATH`,
`pathLength` 0.5 → 1) desenhado pelo scroll. Os parágrafos alternam
esquerda/direita e aparecem quando o traço chega neles (posição medida por
`ResizeObserver`). As imagens ficam absolutas no lado vazio de cada linha,
então não alteram a altura da seção.

Links de LinkedIn/Instagram no cartão final são placeholders:
`LINKEDIN` / `INSTAGRAM` no topo do arquivo.
