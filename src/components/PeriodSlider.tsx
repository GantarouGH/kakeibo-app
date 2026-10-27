import { useRef, useState } from 'react'
import type { Period } from '../types'
import type { Summary } from '../lib/finance'
import { periodLabel } from '../lib/finance'

interface Props {
  periods: Period[]
  sums: Summary[]
  range: [number, number]
  /** 'single' = 月表示（1点）, 'range' = 範囲（2つのつまみ＋帯ドラッグ） */
  kind: 'single' | 'range'
  onChange: (a: number, b: number) => void
}

type Drag = { mode: 'a' | 'b' | 'band'; startX: number; a0: number; b0: number } | null

/**
 * 期間スライダー
 * - 各期間の支出額をミニ棒グラフで背景に表示
 * - つまみをドラッグ / 帯をドラッグで範囲を平行移動 / 目盛りクリックで移動
 * - キーボード: ← → で移動（Shift で終点側）
 */
export function PeriodSlider({ periods, sums, range: [a, b], kind, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag>(null)
  const n = periods.length
  if (n < 2) return null

  const max = Math.max(...sums.map(s => s.exp), 1)
  const pos = (i: number) => ((i + 0.5) / n) * 100
  const idxAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    return Math.min(n - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * n)))
  }
  const clamp = (i: number) => Math.min(n - 1, Math.max(0, i))

  const onDown = (e: React.PointerEvent, mode: 'a' | 'b' | 'band' | 'track') => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    const i = idxAt(e.clientX)
    if (kind === 'single') { onChange(i, i); setDrag({ mode: 'a', startX: e.clientX, a0: i, b0: i }); return }
    if (mode === 'track') {
      // 近い方のつまみを動かす
      const m = Math.abs(i - a) <= Math.abs(i - b) ? 'a' : 'b'
      if (m === 'a') onChange(Math.min(i, b), b); else onChange(a, Math.max(i, a))
      setDrag({ mode: m, startX: e.clientX, a0: a, b0: b })
      return
    }
    setDrag({ mode, startX: e.clientX, a0: a, b0: b })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const i = idxAt(e.clientX)
    if (kind === 'single') { if (i !== a) onChange(i, i); return }
    if (drag.mode === 'a') onChange(Math.min(i, b), b)
    else if (drag.mode === 'b') onChange(a, Math.max(i, a))
    else {
      const w = ref.current!.getBoundingClientRect().width / n
      const d = Math.round((e.clientX - drag.startX) / w)
      const len = drag.b0 - drag.a0
      const na = clamp(Math.min(drag.a0 + d, n - 1 - len))
      if (na !== a) onChange(na, na + len)
    }
  }
  const onUp = () => setDrag(null)

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!d) return
    e.preventDefault()
    if (kind === 'single') { const i = clamp(a + d); onChange(i, i); return }
    if (e.shiftKey) onChange(a, clamp(Math.max(a, b + d)))
    else { const len = b - a, na = clamp(Math.min(a + d, n - 1 - len)); onChange(na, na + len) }
  }

  // ラベルは間引き（狭い画面で重ならないよう）
  const step = n > 18 ? 3 : n > 12 ? 2 : 1

  return (
    <div className="pslider">
      <div
        ref={ref}
        className={`ps-track ${drag ? 'dragging' : ''}`}
        tabIndex={0}
        role="slider"
        aria-label="期間"
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={b}
        aria-valuetext={a === b ? periodLabel(periods[a]) : `${periodLabel(periods[a])}〜${periodLabel(periods[b])}`}
        onKeyDown={onKey}
        onPointerDown={e => onDown(e, 'track')}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="ps-bars">
          {sums.map((s, i) => (
            <div key={i} className={`ps-bar ${i >= a && i <= b ? 'in' : ''}`} style={{ height: `${18 + (s.exp / max) * 82}%` }} />
          ))}
        </div>
        <div className="ps-rail" />
        <div
          className="ps-band"
          style={{ left: `${(a / n) * 100}%`, width: `${((b - a + 1) / n) * 100}%` }}
          onPointerDown={kind === 'range' ? e => onDown(e, 'band') : undefined}
        />
        <div className="ps-thumb" style={{ left: `${pos(a)}%` }} onPointerDown={e => onDown(e, 'a')} />
        {kind === 'range' && <div className="ps-thumb" style={{ left: `${pos(b)}%` }} onPointerDown={e => onDown(e, 'b')} />}
      </div>
      <div className="ps-labels">
        {periods.map((p, i) => (
          <span key={p.start} className={i >= a && i <= b ? 'in' : ''} style={{ left: `${pos(i)}%` }}>
            {(i % step === 0 || i === n - 1) ? periodLabel(p) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
