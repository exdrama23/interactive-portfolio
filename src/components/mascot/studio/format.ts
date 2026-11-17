// Leitura e gravação do `sprite-art.ts` para o studio.
//
// O studio não regenera o arquivo inteiro: ele troca só as linhas das poses
// editadas. Assim comentários, paleta e ordem continuam intocados, e um erro no
// editor não consegue apagar o resto do arquivo.

export const CAT_W = 30
export const CAT_H = 28

export interface StudioPose {
  id: string
  block: number
  rows: string[]
  headX: number
  headY: number
}

const BLOCK = /px: \[([\s\S]*?)\]\.join\(''\)/g
const HEADS = /headX:\s*(-?\d+),\s*\n\s*headY:\s*(-?\d+),/g

export function parseArt(source: string): StudioPose[] {
  const blocks = [...source.matchAll(BLOCK)]
  const heads = [...source.matchAll(HEADS)]
  const seen: Record<string, number> = {}

  return blocks.map((block, blockIndex) => {
    const rows = [...block[1].matchAll(/'([^']*)'/g)].map((m) => m[1])
    const before = source.slice(0, block.index)
    const decls = [...before.matchAll(/export const (\w+)(?::\s*([^=]+?))?\s*=/g)]
    const last = decls[decls.length - 1]
    const decl = last?.[1] ?? `POSE_${blockIndex}`
    const isArray = Boolean(last?.[2]?.includes('[]'))
    const nth = seen[decl] ?? 0
    seen[decl] = nth + 1
    const head = heads[blockIndex]

    return {
      id: isArray ? `${decl}[${nth}]` : decl,
      block: blockIndex,
      rows,
      headX: head ? Number(head[1]) : 0,
      headY: head ? Number(head[2]) : 0,
    }
  })
}

export function writeArt(source: string, poses: StudioPose[]): string {
  let out = source
  const fixed = (row: string) => (row + '.'.repeat(CAT_W)).slice(0, CAT_W)

  // De trás para frente para os offsets das poses anteriores não mudarem.
  for (let i = poses.length - 1; i >= 0; i--) {
    const pose = poses[i]
    const blocks = [...out.matchAll(BLOCK)]
    const block = blocks[i]
    if (!pose || !block || block.index === undefined) continue

    const inner = block[1]
    const indent = /^\n([ \t]*)/.exec(inner)?.[1] ?? '    '
    const tail = /\n([ \t]*)$/.exec(inner)?.[1] ?? '  '
    const comma = /,[ \t]*\n[ \t]*$/.test(inner) ? ',' : ''

    const body = pose.rows
      .map((row) => `'${fixed(row)}'`)
      .join(`,\n${indent}`)

    const start = block.index + block[0].indexOf(inner)
    out = out.slice(0, start) + `\n${indent}${body}${comma}\n${tail}` + out.slice(start + inner.length)
  }

  const heads = [...out.matchAll(HEADS)]
  for (let i = heads.length - 1; i >= 0; i--) {
    const pose = poses[i]
    const head = heads[i]
    if (!pose || head.index === undefined) continue
    const text = head[0]
      .replace(/headX:\s*-?\d+/, `headX: ${pose.headX}`)
      .replace(/headY:\s*-?\d+/, `headY: ${pose.headY}`)
    out = out.slice(0, head.index) + text + out.slice(head.index + head[0].length)
  }

  return out
}
