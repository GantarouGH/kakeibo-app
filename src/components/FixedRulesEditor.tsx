import { useMemo, useState } from 'react'
import type { Txn } from '../types'
import { isExpense, yen } from '../lib/finance'
import { DEFAULT_FIXED, type FixedRules, isFixedBy } from '../lib/fixed'

interface Props {
  rows: Txn[]
  overrides: FixedRules
  onSave: (o: FixedRules) => void
  onClose: () => void
}

function Toggle({ on, onChange, small }: { on: boolean; onChange: (v: boolean) => void; small?: boolean }) {
  return (
    <span className={`fv-toggle ${small ? 'small' : ''}`}>
      {/* summary 内のクリックで details が開閉しないよう preventDefault */}
      <button className={on ? 'on fixed' : ''} onClick={e => { e.preventDefault(); onChange(true) }}>固定</button>
      <button className={!on ? 'on variable' : ''} onClick={e => { e.preventDefault(); onChange(false) }}>変動</button>
    </span>
  )
}

/** 大項目 / 中項目ごとに固定費・変動費を切り替えるモーダル */
export function FixedRulesEditor({ rows, overrides, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<FixedRules>(overrides)
  const rules = { ...DEFAULT_FIXED, ...draft }

  // 全期間の支出を 大項目 → 中項目 で集計
  const tree = useMemo(() => {
    const m = new Map<string, Map<string, number>>()
    for (const r of rows) {
      if (!isExpense(r)) continue
      const mm = m.get(r.large) ?? new Map<string, number>()
      mm.set(r.middle, (mm.get(r.middle) ?? 0) - r.amount)
      m.set(r.large, mm)
    }
    return [...m].map(([large, mm]) => ({
      large,
      total: [...mm.values()].reduce((a, b) => a + b, 0),
      middles: [...mm].sort((a, b) => b[1] - a[1]),
    })).sort((a, b) => b.total - a.total)
  }, [rows])

  const setLarge = (large: string, v: boolean, middles: string[]) => {
    const d = { ...draft, [large]: v }
    for (const m of middles) delete d[`${large}/${m}`]
    // 既定ルールの中項目指定が逆になっていれば上書き
    for (const m of middles) if (`${large}/${m}` in DEFAULT_FIXED && DEFAULT_FIXED[`${large}/${m}`] !== v) d[`${large}/${m}`] = v
    setDraft(d)
  }
  const setMiddle = (large: string, middle: string, v: boolean) => setDraft({ ...draft, [`${large}/${middle}`]: v })

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="card modal" onClick={e => e.stopPropagation()}>
        <div className="card-title" style={{ marginBottom: 6 }}>
          <span style={{ color: 'var(--text)', fontSize: 15 }}>固定費・変動費の分類</span>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <p className="modal-note">大項目単位で切り替え、▸ を開くと中項目ごとに個別指定できます。設定はこの端末に保存されます。</p>
        <div className="modal-body">
          {tree.map(({ large, total, middles }) => {
            const largeOn = isFixedBy(rules, large, '')
            const mixed = middles.some(([m]) => isFixedBy(rules, large, m) !== largeOn)
            return (
              <details key={large} className="rule">
                <summary>
                  <span className="rule-name">{large}{mixed && <span className="mixed">一部</span>}</span>
                  <span className="rule-amt num">{yen(total)}</span>
                  <Toggle on={largeOn} onChange={v => setLarge(large, v, middles.map(m => m[0]))} />
                </summary>
                {middles.map(([m, v]) => (
                  <div key={m} className="rule-sub">
                    <span className="rule-name">{m}</span>
                    <span className="rule-amt num">{yen(v)}</span>
                    <Toggle small on={isFixedBy(rules, large, m)} onChange={x => setMiddle(large, m, x)} />
                  </div>
                ))}
              </details>
            )
          })}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={() => setDraft({})}>初期設定に戻す</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>キャンセル</button>
          <button className="btn primary" style={{ height: 34 }} onClick={() => onSave(draft)}>保存</button>
        </div>
      </div>
    </div>
  )
}
