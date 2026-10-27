import type { Summary } from '../lib/finance'
import { yen } from '../lib/finance'
import { Money } from './Money'

interface Props {
  cur: Summary
  n: number
  /** 固定費・変動費それぞれの内訳 TOP */
  fixedTop: [string, number][]
  variableTop: [string, number][]
  onEdit: () => void
  onPick: (kind: 'fixed' | 'variable') => void
  picked: 'fixed' | 'variable' | null
}

interface ColProps { kind: 'fixed' | 'variable'; label: string; value: number; top: [string, number][]; total: number; n: number; picked: Props['picked']; onPick: Props['onPick'] }

function Col({ kind, label, value, top, total, n, picked, onPick }: ColProps) {
  return (
    <button className={`fv-col ${picked === kind ? 'active' : ''}`} onClick={() => onPick(kind)}>
      <div className="kpi-label"><span className="dot" style={{ background: `var(--${kind})` }} />{label}</div>
      <div className="fv-value"><Money v={value} /></div>
      <div className="kpi-delta">
        {((value / total) * 100).toFixed(1)}%{n > 1 && <> ・ 月平均 {yen(value / n)}</>}
      </div>
      <ul className="fv-top">
        {top.slice(0, 4).map(([k, v]) => (
          <li key={k}><span>{k}</span><span className="num">{yen(v)}</span></li>
        ))}
      </ul>
    </button>
  )
}

export function FixedVariableCard({ cur, n, fixedTop, variableTop, onEdit, onPick, picked }: Props) {
  const total = cur.exp || 1
  const fp = (cur.fixed / total) * 100
  const fixedRatioToIncome = cur.inc > 0 ? (cur.fixed / cur.inc) * 100 : null

  return (
    <div className="card span-12 fv-card">
      <div className="card-title">
        <span>固定費 / 変動費 <small>クリックで明細を絞り込み</small></span>
        <button className="btn" style={{ height: 28 }} onClick={onEdit}>分類を編集</button>
      </div>
      <div className="fv-bar" role="img" aria-label={`固定費 ${fp.toFixed(1)}%`}>
        <div style={{ width: `${fp}%`, background: 'var(--fixed)' }} />
        <div style={{ width: `${100 - fp}%`, background: 'var(--variable)' }} />
      </div>
      <div className="fv-grid">
        <Col kind="fixed" label="固定費" value={cur.fixed} top={fixedTop} total={total} n={n} picked={picked} onPick={onPick} />
        <Col kind="variable" label="変動費" value={cur.variable} top={variableTop} total={total} n={n} picked={picked} onPick={onPick} />
        <div className="fv-col fv-note">
          <div className="kpi-label">固定費率（対収入）</div>
          <div className="fv-value">{fixedRatioToIncome == null ? '-' : `${fixedRatioToIncome.toFixed(1)}%`}</div>
          <div className="kpi-delta">
            収入から固定費を引いた残り<br />
            <b className={cur.inc - cur.fixed >= 0 ? 'good' : 'bad'}><Money v={cur.inc - cur.fixed} /></b>
            {n > 1 && <>（月平均 {yen((cur.inc - cur.fixed) / n)}）</>}
          </div>
        </div>
      </div>
    </div>
  )
}
