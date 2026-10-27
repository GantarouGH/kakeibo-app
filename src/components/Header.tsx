import type { Period } from '../types'
import type { ThemePref } from '../hooks/useTheme'
import { days, periodLabel, periodRange } from '../lib/finance'
import { type View, periodYear, spanDays, yearsOf } from '../lib/range'

interface Props {
  periods: Period[]
  view: View
  range: [number, number]
  onView: (v: View) => void
  theme: ThemePref
  onTheme: (t: ThemePref) => void
  onReload: () => void
  onSettings?: () => void
  live: boolean
  loading: boolean
}

const MODES = [
  { k: 'month', label: '月' },
  { k: 'year', label: '年' },
  { k: 'range', label: '期間' },
] as const

export function Header({ periods, view, range: [a, b], onView, theme, onTheme, onReload, onSettings, live, loading }: Props) {
  const last = periods.length - 1
  const years = yearsOf(periods)

  const switchMode = (m: View['mode']) => {
    if (m === view.mode) return
    if (m === 'month') onView({ mode: 'month', start: periods[b]?.start ?? null })
    else if (m === 'year') onView({ mode: 'year', year: periods[b] ? periodYear(periods[b]) : null })
    else onView({ mode: 'range', from: periods[Math.max(0, b - 5)].start, to: periods[b].start })
  }
  const setMonth = (i: number) => onView({ mode: 'month', start: i === last ? null : periods[i].start })

  const sub = a === b
    ? `${periods[a].start} 〜 ${periods[a].end}（${days(periods[a])}日間）`
    : `${periods[a].start} 〜 ${periods[b].end}（${b - a + 1}期間・${spanDays(periods, a, b)}日）`

  return (
    <header className="header">
      <div className="brand">
        <div className="logo">¥</div>
        <div>
          <h1>Kakeibo Dashboard</h1>
          <div className="sub">
            {periods.length ? sub : '読み込み中…'}
            {live && <span className="live" title="CSVフォルダを監視中。追加・更新すると自動で反映されます">Live</span>}
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="ctrl-row">
          <div className="seg" role="tablist" aria-label="表示単位">
            {MODES.map(m => (
              <button key={m.k} className={view.mode === m.k ? 'on' : ''} onClick={() => switchMode(m.k)}>{m.label}</button>
            ))}
          </div>

          {view.mode === 'month' && (
            <>
              <button className="icon-btn" disabled={a <= 0} onClick={() => setMonth(a - 1)} aria-label="前の期間">‹</button>
              <select className="field grow" value={a} onChange={e => setMonth(Number(e.target.value))} aria-label="期間">
                {periods.map((q, i) => ({ q, i })).reverse().map(({ q, i }) => (
                  <option key={q.start} value={i}>{periodRange(q)}</option>
                ))}
              </select>
              <button className="icon-btn" disabled={a >= last} onClick={() => setMonth(a + 1)} aria-label="次の期間">›</button>
            </>
          )}

          {view.mode === 'year' && (
            <select
              className="field grow"
              value={String(view.year ?? years[years.length - 1])}
              onChange={e => onView({ mode: 'year', year: e.target.value === 'last12' ? 'last12' : Number(e.target.value) })}
              aria-label="年"
            >
              {[...years].reverse().map(y => <option key={y} value={y}>{y}年（{periods.filter(p => periodYear(p) === y).length}期間）</option>)}
              <option value="last12">直近12期間</option>
            </select>
          )}

          {view.mode === 'range' && (
            <span className="range-pick grow">
              <select className="field" value={periods[a].start} onChange={e => onView({ mode: 'range', from: e.target.value, to: periods[b].start })} aria-label="開始">
                {periods.map(q => <option key={q.start} value={q.start}>{periodLabel(q)}</option>)}
              </select>
              <span className="tilde">〜</span>
              <select className="field" value={periods[b].start} onChange={e => onView({ mode: 'range', from: periods[a].start, to: e.target.value })} aria-label="終了">
                {periods.map(q => <option key={q.start} value={q.start}>{periodLabel(q)}</option>)}
              </select>
            </span>
          )}
        </div>

        <div className="ctrl-row">
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
      </div>
    </header>
  )
}
