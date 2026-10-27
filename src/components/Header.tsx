import type { Period } from '../types'
import type { ThemePref } from '../hooks/useTheme'
import { setPrivacy, usePrivacy } from '../hooks/usePrivacy'
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

const svgProps = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'ico', 'aria-hidden': true,
} as const

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg {...svgProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}
const ReloadIcon = () => (
  <svg {...svgProps}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><polyline points="21 3 21 9 15 9" /></svg>
)
const GearIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const SunIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)
const MoonIcon = () => (
  <svg {...svgProps}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
)
const ChevronIcon = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg {...svgProps}><polyline points={dir === 'l' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} /></svg>
)
const THEMES = [
  { k: 'auto', label: 'Auto', title: 'システムに連動' },
  { k: 'light', label: <SunIcon />, title: 'ライト' },
  { k: 'dark', label: <MoonIcon />, title: 'ダーク' },
] as const

export function Header({ periods, view, range: [a, b], onView, theme, onTheme, onReload, onSettings, live, loading }: Props) {
  const last = periods.length - 1
  const hidden = usePrivacy()
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
        <div className="c-modes">
          <div className="seg" role="tablist" aria-label="表示単位">
            {MODES.map(m => (
              <button key={m.k} className={view.mode === m.k ? 'on' : ''} onClick={() => switchMode(m.k)}>{m.label}</button>
            ))}
          </div>
        </div>
        <div className="c-picker">
          {view.mode === 'month' && (
            <>
              <button className="icon-btn" disabled={a <= 0} onClick={() => setMonth(a - 1)} aria-label="前の期間"><ChevronIcon dir="l" /></button>
              <select className="field grow" value={a} onChange={e => setMonth(Number(e.target.value))} aria-label="期間">
                {periods.map((q, i) => ({ q, i })).reverse().map(({ q, i }) => (
                  <option key={q.start} value={i}>{periodRange(q)}</option>
                ))}
              </select>
              <button className="icon-btn" disabled={a >= last} onClick={() => setMonth(a + 1)} aria-label="次の期間"><ChevronIcon dir="r" /></button>
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
        <div className="c-tools">
          <button
            className={`icon-btn ${hidden ? 'on' : ''}`}
            onClick={() => setPrivacy(!hidden)}
            title={hidden ? '金額を表示' : '金額を隠す'}
            aria-label={hidden ? '金額を表示' : '金額を隠す'}
            aria-pressed={hidden}
          >
            <EyeIcon off={hidden} />
          </button>
          <button className="icon-btn" onClick={onReload} title="再読み込み" aria-label="再読み込み">
            <span className={`ico-wrap ${loading ? 'spin' : ''}`}><ReloadIcon /></span>
          </button>
          {onSettings && <button className="icon-btn" onClick={onSettings} title="Dropbox 設定" aria-label="設定"><GearIcon /></button>}
          <div className="seg" role="radiogroup" aria-label="テーマ">
            {THEMES.map(t => (
              <button key={t.k} className={theme === t.k ? 'on' : ''} onClick={() => onTheme(t.k)} title={t.title} aria-label={t.title}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
