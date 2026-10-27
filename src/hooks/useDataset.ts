import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dataset } from '../types'
import { buildDataset } from '../lib/csv'
import * as dbx from '../lib/dropbox'
import { idbGet, idbSet } from '../lib/idb'

/**
 * データソース
 * - local:   Mac で `npm run dev` 中。Vite サーバーが Dropbox 同期フォルダを読む（フォルダ監視で自動更新）
 * - dropbox: 公開版（スマホ等）。ブラウザが Dropbox API から直接 CSV を取得
 */
export type Source = 'local' | 'dropbox'
export const SOURCE: Source = import.meta.env.DEV && !new URLSearchParams(location.search).has('dropbox') ? 'local' : 'dropbox'

export type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; done?: number; total?: number }
  | { kind: 'setup' } // Dropbox 未接続
  | { kind: 'error'; message: string }

export function useDataset() {
  const [data, setData] = useState<Dataset | null>(null)
  const [status, setStatus] = useState<Status>(() =>
    SOURCE === 'dropbox' && !dbx.isConnected() && !location.search.includes('code=') ? { kind: 'setup' } : { kind: 'loading' },
  )
  const busy = useRef(false)

  const reload = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      if (SOURCE === 'local') {
        setStatus({ kind: 'loading' })
        const res = await fetch('/api/data', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setData(await res.json())
        setStatus({ kind: 'idle' })
        return
      }
      if (!dbx.isConnected()) { setStatus({ kind: 'setup' }); return }
      setStatus({ kind: 'loading' })
      const files = await dbx.fetchFiles((done, total) => setStatus({ kind: 'loading', done, total }))
      const d = buildDataset(files, `Dropbox ${dbx.getFolder()}`)
      setData(d)
      setStatus({ kind: 'idle' })
      idbSet('dataset', d).catch(() => {})
    } catch (e) {
      if (e instanceof dbx.AuthError) setStatus({ kind: 'setup' })
      else setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (SOURCE === 'dropbox') {
        // 前回のデータを即表示（オフラインでも見られる）→ 裏で最新化
        // キャッシュ読込は待たない（最新データ取得より後に返ってきた場合は無視）
        idbGet<Dataset>('dataset').then(c => { if (c && !cancelled) setData(d => d ?? c) }, () => {})
        try {
          await dbx.handleRedirect()
        } catch (e) {
          if (!cancelled) setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
          return
        }
      }
      if (!cancelled) reload()
    })()

    // スマホでアプリに戻ってきた時 / 5分ごとに再取得
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(onVisible, 5 * 60 * 1000)

    // ローカル: CSV フォルダ変更で自動再読込
    const hot = import.meta.hot
    hot?.on('kakeibo:update', reload)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
      hot?.off('kakeibo:update', reload)
    }
  }, [reload])

  const clear = useCallback(() => { setData(null); setStatus({ kind: 'setup' }); idbSet('dataset', null).catch(() => {}) }, [])

  return { data, status, reload, clear }
}
