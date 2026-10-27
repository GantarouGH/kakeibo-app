import type { Period } from '../types'
import type { ThemePref } from '../hooks/useTheme'
import { days, periodRange } from '../lib/finance'

interface Props {
  periods: Period[]
  idx: number
  onIdx: (i: number) => void
  theme: ThemePref
  onTheme: (t: ThemePref) => void
  onReload: () => void
  onSettings?: () => void
  live: boolean
  loading: boolean
}

export function Header({ periods, idx, onIdx, theme, onTheme, onReload, onSettings, live, loading }: Props) {
  const p = periods[idx]
  return (
    <header className="header">
      <div className="brand">
        <div className="logo">¥</div>
        <div>
          <h1>Kakeibo Dashboard</h1>
          <div className="sub">
            {p ? `${p.start} 〜 ${p.end}（${days(p)}日間）` : '読み込み中…'}
            {live && <span className="live" title="CSVフォルダを監視中。追加・更新すると自動で反映されます">Live</span>}
          </div>
        </div>
      </div>
      <div className="controls">
        <button className="icon-btn" disabled={idx <= 0} onClick={() => onIdx(idx - 1)} title="前の期間" aria-label="前の期間">‹</button>
        <select className="field" value={idx} onChange={e => onIdx(Number(e.target.value))} aria-label="期間">
          {periods.map((q, i) => ({ q, i })).reverse().map(({ q, i }) => (
            <option key={q.start} value={i}>{periodRange(q)}</option>
          ))}
        </select>
        <button className="icon-btn" disabled={idx >= periods.length - 1} onClick={() => onIdx(idx + 1)} title="次の期間" aria-label="次の期間">›</button>
        <button className="icon-btn" onClick={onReload} title="再読み込み" aria-label="再読み込み">
          <span className={loading ? 'spin' : ''}>↻</span>
        </button>
        {onSettings && <button className="icon-btn" onClick={onSettings} title="Dropbox 設定" aria-label="設定">⚙︎</button>}
        <div className="seg" role="radiogroup" aria-label="テーマ">
          {(['auto', 'light', 'dark'] as const).map(t => (
            <button key={t} className={theme === t ? 'on' : ''} onClick={() => onTheme(t)} title={t === 'auto' ? 'システムに連動' : undefined}>
              {t === 'auto' ? 'Auto' : t === 'light' ? '☀︎' : '☾'}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
