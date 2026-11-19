# Prompt de geracao: uma animacao por vez

Use este prompt para gerar a arte de um clipe do Nox e importar em
`/__nox-import`. Anexe a imagem de referencia oficial do gato e troque apenas
`ANIMACAO`, `QUADROS`, `MOVIMENTO` e `LOOP`.

O importador nao redimensiona a arte. Se o gerador devolver o gato maior que
216 px de altura, a previa marca "sai do canvas" e a gravacao fica bloqueada.
Nesse caso gere de novo, menor, em vez de encolher o PNG depois.

## Prompt

```text
Crie uma folha de sprites 2D de UMA unica animacao do gato preto da imagem de
referencia. Nao e um contact sheet com varias animacoes: e apenas a animacao
ANIMACAO.

FORMATO DA IMAGEM
- Uma tira horizontal com exatamente QUADROS quadros lado a lado, na ordem de
  leitura da esquerda para a direita.
- Cada quadro tem 216 x 216 px. A tira inteira tem (216 x QUADROS) x 216 px.
  Se a ferramenta nao aceitar medidas exatas, mantenha a mesma proporcao e a
  mesma escala do personagem entre todos os quadros.
- O gato ocupa no maximo 180 px de altura e cerca de 150 px de largura em cada
  quadro. Ele fica pequeno dentro do quadro, com margem sobrando em volta.
- Em todos os quadros o pixel mais baixo do gato fica na mesma linha: y = 203
  dentro do quadro. A linha y = 204 e a ancora do jogo.
- Deixe 16 px de fundo vazio entre um quadro e o proximo. Nenhum pixel de um
  quadro pode encostar ou invadir o quadro vizinho.
- Fundo magenta puro #FF00FF, perfeitamente uniforme, sem gradiente, sem textura,
  sem ruido e sem sombra. Se a ferramenta entregar PNG com transparencia, use
  transparencia e ignore o magenta.

O QUE NAO PODE APARECER
- Sem grade, sem molduras, sem linhas divisórias, sem numeros, sem rotulos,
  sem texto, sem assinatura, sem marca d'agua.
- Sem chao, sem sombra no chao, sem objetos, sem coracoes, sem confete, sem mao
  humana. Apenas o gato.
- Nao mude o estilo, a paleta, o tamanho dos olhos, o formato das orelhas ou o
  tamanho da cauda.

IDENTIDADE E CONSISTENCIA
- Mesmo gato preto da referencia, mesma silhueta e mesmas cores.
- Mesma escala e proporcao em todos os quadros. Sem zoom, sem mudanca de
  perspectiva, sem mudanca de angulo, exceto o movimento pedido.
- Cada quadro e uma fase distinta do movimento. Nao repita pose, nao pule fase
  e nao desenhe o mesmo quadro duas vezes.
- A cabeca, o corpo e a cauda continuam reconheciveis em todos os quadros.

ANIMACAO
- Nome: ANIMACAO
- Quadros: QUADROS
- Movimento: MOVIMENTO
- Repeticao: LOOP
```

## Versao quadrada, se a ferramenta so gerar 1024x1024

```text
Gere em 1024 x 1024 px, com QUADROS colunas iguais. O gato ocupa no maximo
180 px de altura, fica alinhado na mesma linha de base em todas as colunas e
ocupa apenas a faixa superior da imagem. O resto do quadro fica vazio, no fundo
magenta puro #FF00FF. Mantenha a mesma margem entre as colunas e nao aumente o
personagem para preencher a imagem.
```

## Fichas por clipe

| Clipe | Quadros | Fps | Loop | Movimento |
|---|---|---|---|---|
| idle | 5 | 8 | sim | respiracao calma, cauda parada ou quase parada |
| walk | 5 | 12 | sim | caminhada lateral no lugar, patas alternando |
| run | 5 | 16 | sim | corrida no lugar, passada mais aberta |
| sit | 5 | 6 | sim | senta e acomoda o corpo |
| sleep | 4 | 3 | sim | dormindo, respiracao lenta |
| wake | 5 | 8 | nao | acorda e levanta |
| jump | 5 | 12 | nao | sobe, apice e comeca a descer |
| fall | 5 | 10 | sim | queda com patas soltas |
| land | 5 | 12 | nao | toca o chao e absorve o impacto |
| happy | 5 | 10 | sim | alegria contida, rabo e orelhas |
| angry | 5 | 10 | sim | irritacao, orelhas para tras |
| scared | 5 | 12 | sim | susto, corpo encolhido |
| pet | 5 | 8 | sim | recebe carinho e fecha os olhos |
| held | 5 | 6 | sim | suspenso, patas penduradas |
| dragged | 5 | 10 | sim | arrastado de lado |
| scratch | 5 | 12 | sim | arranha um poste imaginario |
| yawn | 5 | 6 | nao | bocejo e espreguica curta |
| meow | 4 | 6 | nao | abre a boca e mia |
| stretch | 3 | 5 | nao | espreguica longa |
| lookAround | 4 | 5 | sim | olha para os lados |
| tailFlick | 3 | 6 | sim | so a cauda se mexe |
| celebrate | aguardando | 10 | sim | arte sera refeita pelo autor |

## Conferencia antes de gravar

1. Abra `/__nox-import` e escolha o clipe.
2. Envie a tira e confira se a divisao achou o numero certo de quadros.
3. No painel de fundo, use "remover a cor do canto" e ajuste a tolerancia ate o
   magenta sumir sem comer o pelo. Se o PNG ja vier transparente, use "manter o
   alpha".
4. Clique em uma linha vermelha para juntar dois quadros ou na tira para criar
   um corte manual. Use "dividir no vazio" quando dois gatos estiverem colados.
5. Confira a ancora, o fps, o loop e o status. O padrao e `ready`.
6. Deixe "rodar build_atlas.py" marcado e grave. Se algum quadro sair do canvas,
   gere a arte menor em vez de redimensionar.
