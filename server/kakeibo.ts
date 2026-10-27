import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { Plugin, ViteDevServer, PreviewServer } from 'vite'
import { buildDataset } from '../src/lib/csv.ts'
import type { Dataset } from '../src/types.ts'

/** Mac ローカル開発用: Dropbox 同期フォルダの CSV を /api/data で配信し、変更を通知する */

export function loadDataset(dir: string): Dataset {
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.csv'))
      .map(name => ({ name, bytes: fs.readFileSync(path.join(dir, name)) }))
    : []
  return buildDataset(files, dir)
}

export function kakeiboPlugin(dirOpt?: string): Plugin {
  const dir = dirOpt || process.env.KAKEIBO_DIR || path.join(os.homedir(), 'Library/CloudStorage/Dropbox/Kakeibo')

  const middleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/api/data', (_req, res) => {
      try {
        const body = JSON.stringify(loadDataset(dir))
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(body)
      } catch (e) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: String(e) }))
      }
    })
  }

  return {
    name: 'kakeibo-data',
    configureServer(server) {
      middleware(server)
      server.config.logger.info(`  ➜  Kakeibo: ${dir}`)
      // Dropbox はファイルを一時名→リネームで書くことが多いのでデバウンス
      let timer: NodeJS.Timeout | undefined
      try {
        const watcher = fs.watch(dir, (_ev, name) => {
          if (name && !String(name).toLowerCase().endsWith('.csv')) return
          clearTimeout(timer)
          timer = setTimeout(() => {
            server.config.logger.info(`  ➜  CSV changed: ${name ?? ''}`, { timestamp: true })
            server.ws.send({ type: 'custom', event: 'kakeibo:update' })
          }, 800)
        })
        server.httpServer?.on('close', () => watcher.close())
      } catch (e) {
        server.config.logger.warn(`  ➜  Kakeibo フォルダを監視できません: ${String(e)}`)
      }
    },
    configurePreviewServer(server) {
      middleware(server)
    },
  }
}
