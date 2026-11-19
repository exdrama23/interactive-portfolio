import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const ART = path.join(root, 'src/components/mascot/sprite-art.ts')
const NOX_MANIFEST = path.join(root, 'tools/nox/clips.json')
const NOX_SPRITES = path.join(root, 'src/components/mascot/nox/assets/sprites')
const NOX_BUILD = path.join(root, 'tools/nox/build_atlas.py')
const CLIP_FOLDER = /^[a-zA-Z][a-zA-Z0-9_-]*$/
const CLIP_STATUS = new Set(['ready', 'provisional', 'pending'])
const MAX_BODY = 64 * 1024 * 1024

// Grava o `sprite-art.ts` direto do Studio do Nox. Só roda no servidor de dev,
// e só aceita um arquivo TypeScript que ainda tenha as poses, para um clique
// errado não zerar a arte.
function spriteStudioSave(): Plugin {
  return {
    name: 'nox-sprite-studio-save',
    apply: 'serve',
    configureServer(server) {
      // Ler antes de gravar evita sobrescrever com uma cópia velha: o editor
      // pode ficar aberto por horas enquanto outra coisa mexe no arquivo.
      server.middlewares.use('/__sprite-studio/read', (_req, res) => {
        res.setHeader('content-type', 'application/json')
        try {
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true, source: fs.readFileSync(ART, 'utf8') }))
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(error) }))
        }
      })

      server.middlewares.use('/__sprite-studio/save', (req, res) => {
        const reply = (code: number, body: unknown) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }

        if (req.method !== 'POST') return reply(405, { ok: false, error: 'use POST' })

        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const { source } = JSON.parse(body) as { source?: unknown }
            if (typeof source !== 'string' || !source.includes('export const POSE_SIT')) {
              return reply(400, { ok: false, error: 'fonte inválida' })
            }
            fs.writeFileSync(ART, source, 'utf8')
            return reply(200, { ok: true })
          } catch (error) {
            return reply(500, { ok: false, error: String(error) })
          }
        })
      })
    },
  }
}

// Importador do Nox. Recebe os quadros ja montados pela pagina /__nox-import,
// grava em sprites/<clipe>/ e, se pedido, roda o build_atlas.py. O body e
// validado antes de encostar no disco: nome de clipe, tamanho de PNG e status.
function noxImport(): Plugin {
  return {
    name: 'nox-import',
    apply: 'serve',
    configureServer(server) {
      const reply = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
        res.statusCode = code
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(body))
      }

      const readBody = (req: import('node:http').IncomingMessage) =>
        new Promise<string>((resolve, reject) => {
          let body = ''
          req.on('data', (chunk: Buffer) => {
            body += chunk
            if (body.length > MAX_BODY) reject(new Error('corpo grande demais'))
          })
          req.on('end', () => resolve(body))
          req.on('error', reject)
        })

      server.middlewares.use('/__nox-import/config', (_req, res) => {
        try {
          const manifest = JSON.parse(fs.readFileSync(NOX_MANIFEST, 'utf8'))
          reply(res, 200, { ok: true, manifest })
        } catch (error) {
          reply(res, 500, { ok: false, error: String(error) })
        }
      })

      server.middlewares.use('/__nox-import/save', (req, res) => {
        if (req.method !== 'POST') return reply(res, 405, { ok: false, error: 'use POST' })

        void (async () => {
          try {
            const payload = JSON.parse(await readBody(req)) as Record<string, unknown>
            const clip = String(payload.clip ?? '')
            const frames = payload.frames
            const fps = Number(payload.fps)
            const loop = Boolean(payload.loop)
            const status = String(payload.status ?? '')
            const frameWidth = Number(payload.frameWidth)
            const frameHeight = Number(payload.frameHeight)
            const anchor = payload.anchor as { x?: unknown; y?: unknown } | undefined
            const air = Boolean(payload.air)
            const build = Boolean(payload.build)

            const manifest = JSON.parse(fs.readFileSync(NOX_MANIFEST, 'utf8')) as {
              frameWidth: number
              frameHeight: number
              meta: { anchor: { x: number; y: number } }
              clips: Record<string, Record<string, unknown>>
            }
            const config = manifest.clips[clip]
            if (!config) return reply(res, 400, { ok: false, error: `clipe desconhecido: ${clip}` })
            if (!Array.isArray(frames) || !frames.length || frames.length > 64) {
              return reply(res, 400, { ok: false, error: 'envie de 1 a 64 quadros' })
            }
            if (!CLIP_STATUS.has(status)) {
              return reply(res, 400, { ok: false, error: 'status inválido' })
            }
            if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight)) {
              return reply(res, 400, { ok: false, error: 'canvas inválido' })
            }
            if (
              !anchor ||
              !Number.isFinite(Number(anchor.x)) ||
              !Number.isFinite(Number(anchor.y))
            ) {
              return reply(res, 400, { ok: false, error: 'âncora inválida' })
            }

            const folder = String(config.folder ?? clip)
            if (!CLIP_FOLDER.test(folder)) {
              return reply(res, 400, { ok: false, error: `pasta inválida: ${folder}` })
            }
            const target = path.resolve(NOX_SPRITES, folder)
            if (!target.startsWith(NOX_SPRITES + path.sep)) {
              return reply(res, 400, { ok: false, error: 'pasta fora de sprites' })
            }

            const buffers: Buffer[] = []
            for (let index = 0; index < frames.length; index++) {
              const value = frames[index]
              if (typeof value !== 'string' || !value.startsWith('data:image/png;base64,')) {
                return reply(res, 400, { ok: false, error: `quadro ${index + 1}: não é PNG` })
              }
              const buffer = Buffer.from(value.slice('data:image/png;base64,'.length), 'base64')
              if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
                return reply(res, 400, { ok: false, error: `quadro ${index + 1}: PNG inválido` })
              }
              const width = buffer.readUInt32BE(16)
              const height = buffer.readUInt32BE(20)
              if (width !== frameWidth || height !== frameHeight) {
                return reply(res, 400, {
                  ok: false,
                  error: `quadro ${index + 1}: ${width}x${height}, esperado ${frameWidth}x${frameHeight}`,
                })
              }
              buffers.push(buffer)
            }

            fs.rmSync(target, { recursive: true, force: true })
            fs.mkdirSync(target, { recursive: true })
            const saved: string[] = []
            buffers.forEach((buffer, index) => {
              const name = `${folder}-${index}.png`
              fs.writeFileSync(path.join(target, name), buffer)
              saved.push(name)
            })

            config.fps = Math.max(1, Math.min(60, Math.round(fps || 8)))
            config.loop = loop
            config.status = status
            if (status === 'pending') {
              config.note = 'importado pelo /__nox-import; revisar antes de publicar'
            } else {
              delete config.note
            }
            if (air) config.air = true
            else delete config.air

            if (frameWidth === manifest.frameWidth && frameHeight === manifest.frameHeight) {
              delete config.frameWidth
              delete config.frameHeight
            } else {
              config.frameWidth = frameWidth
              config.frameHeight = frameHeight
            }

            if (Number(anchor.x) === manifest.meta.anchor.x && Number(anchor.y) === manifest.meta.anchor.y) {
              delete config.anchor
            } else {
              config.anchor = { x: Math.round(Number(anchor.x)), y: Math.round(Number(anchor.y)) }
            }

            fs.writeFileSync(NOX_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

            let buildInfo: { ok: boolean; output: string } | undefined
            if (build) {
              const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
              const run = spawnSync(python, [NOX_BUILD], {
                cwd: root,
                encoding: 'utf8',
                timeout: 120_000,
              })
              const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim()
              buildInfo = {
                ok: run.status === 0 && !run.error,
                output: output || (run.error ? String(run.error) : 'build sem saída'),
              }
            }

            return reply(res, 200, { ok: true, saved, build: buildInfo })
          } catch (error) {
            return reply(res, 500, { ok: false, error: String(error) })
          }
        })()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spriteStudioSave(),
    noxImport(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
