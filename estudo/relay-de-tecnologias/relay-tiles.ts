
const AZ = Math.PI / 4
const K = 0.5
const S = 1.9
const ZF = Math.sqrt(1 - K * K)
const T13 = 3
const HT3 = 7
const RISE = 9
const TS2 = 9
const HS3 = 17
const FORK = 31

interface Branch {
  d: readonly [number, number]
  a: number
  b: number
  side: readonly number[]
}

const BRANCHES: readonly Branch[] = [
  { d: [-1, 0], a: 50, b: 84, side: [-1, 1] },
  { d: [0, -1], a: 50, b: 76, side: [1] },
  { d: [1, 0], a: 50, b: 84, side: [-1, 1] },
  { d: [0, 1], a: 50, b: 76, side: [-1] },
]

export interface RelayTile {
  x: number
  y: number
  dep: number
  parent: number | null
  tag: string | null
}

interface Node {
  c: [number, number]
  par: number
  dep: number
  tag: string | null
}

const nodes: Node[] = []

BRANCHES.forEach((br, k) => {
  const at = (s: number, o: number): [number, number] => [
    br.d[0] * s - br.d[1] * o,
    br.d[1] * s + br.d[0] * o,
  ]
  const i = nodes.length
  nodes.push({ c: at(br.a, 0), par: -1, dep: 1, tag: null })
  nodes.push({ c: at(br.b, 0), par: i, dep: 2, tag: null })
  br.side.forEach((s, j) =>
    nodes.push({
      c: at(br.b, s * FORK),
      par: i + 1,
      dep: 3,
      tag: `leaf ${k + 1}·${j + 1}`,
    }),
  )
})

const raw = (x: number, y: number, z: number): [number, number] => [
  S * (x * Math.cos(AZ) - y * Math.sin(AZ)),
  S * ((x * Math.sin(AZ) + y * Math.cos(AZ)) * K - z * ZF),
]

const bounds: Array<[number, number, number]> = [
  [-HS3, -HS3, 0],
  [HS3, HS3, 0],
  [-HS3, HS3, 0],
  [HS3, -HS3, 0],
]
for (const n of nodes) {
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    bounds.push([n.c[0] + sx * TS2, n.c[1] + sy * TS2, T13 + RISE])
  }
}

let minX = Infinity
let maxX = -Infinity
let minY = Infinity
let maxY = -Infinity
for (const point of bounds) {
  const [px, py] = raw(point[0], point[1], point[2])
  minX = Math.min(minX, px)
  maxX = Math.max(maxX, px)
  minY = Math.min(minY, py)
  maxY = Math.max(maxY, py)
}

const ox = 200 - (minX + maxX) / 2
const oy = 166 - (minY + maxY) / 2

const project = (x: number, y: number, z: number): [number, number] => {
  const [px, py] = raw(x, y, z)
  return [ox + px, oy + py]
}

const percent = (value: number, size: number) =>
  Number(((value / size) * 100).toFixed(4))

export const RELAY_TILES: readonly RelayTile[] = nodes.map((node) => {
  const [px, py] = project(node.c[0], node.c[1], T13)
  return {
    x: percent(px, 400),
    y: percent(py, 320),
    dep: node.dep,
    parent: node.par < 0 ? null : node.par,
    tag: node.tag,
  }
})

export const RELAY_HUB = (() => {
  const [px, py] = project(0, 0, HT3)
  return { x: percent(px, 400), y: percent(py, 320) }
})()

export const RELAY_RISE_PCT = percent(RISE * S * ZF, 320)

export function relayChain(tag: string): number[] {
  const leaf = RELAY_TILES.findIndex((tile) => tile.tag === tag)
  if (leaf < 0) return []

  const chain: number[] = []
  let index: number | null = leaf
  while (index !== null) {
    chain.push(index)
    index = RELAY_TILES[index].parent
  }
  return chain
}
