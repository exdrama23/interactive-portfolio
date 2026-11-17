import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const ART = path.join(root, 'src/components/mascot/sprite-art.ts')

// Grava o `sprite-art.ts` direto do Studio do Nox. Só roda no servidor de dev,
// e só aceita um arquivo TypeScript que ainda tenha as poses, para um clique
// errado não zerar a arte.
function spriteStudioSave(): Plugin {
  return {
    name: 'nox-sprite-studio-save',
    apply: 'serve',
    configureServer(server) {
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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spriteStudioSave(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
