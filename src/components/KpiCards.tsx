import type { Summary } from '../lib/finance'
import { yen } from '../lib/finance'

interface Props {
  cur: Summary
  prev: Summary | null
  perDay: number
  perDayAvg: number
}

function Delta({ cur, prev, higherIsBad }: { cur: number; prev: number; higherIsBad: boolean }) {
  if (!prev) return null
  const d = ((cur - prev) / Math.abs(prev)) * 100
  const bad = higherIsBad ? d > 0 : d < 0
  return (
    <>前期比 <span className={bad ? 'bad' : 'good'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%</span>（{yen(prev)}）</>
  )
}

export function KpiCards({ cur, prev, perDay, perDayAvg }: Props) {
  const rate = cur.inc > 0 ? ((cur.net / cur.inc) * 100).toFixed(1) : '-'
  return (
    <>
      <div className="card span-3 kpi-card">
        <div className="kpi-label"><span className="dot" style={{ background: 'var(--income)' }} />収入</div>
        <div className="kpi-value">{yen(cur.inc)}</div>
        <div className="kpi-delta">{prev && <Delta cur={cur.inc} prev={prev.inc} higherIsBad={false} />}</div>
      </div>
      <div className="card span-3 kpi-card">
        <div className="kpi-label"><span className="dot" style={{ background: 'var(--expense)' }} />支出</div>
        <div className="kpi-value">{yen(cur.exp)}</div>
        <div className="kpi-delta">{prev && <Delta cur={cur.exp} prev={prev.exp} higherIsBad />}</div>
      </div>
      <div className="card span-3 kpi-card">
        <div className="kpi-label"><span className="dot" style={{ background: 'var(--accent)' }} />収支</div>
        <div className={`kpi-value ${cur.net >= 0 ? 'good' : 'bad'}`}>{yen(cur.net)}</div>
        <div className="kpi-delta">貯蓄率 <b>{rate}%</b></div>
      </div>
      <div className="card span-3 kpi-card">
        <div className="kpi-label"><span className="dot" style={{ background: 'var(--warn)' }} />1日あたり支出</div>
        <div className="kpi-value">{yen(perDay)}</div>
        <div className="kpi-delta">
          全期間平均 {yen(perDayAvg)}{' '}
          <span className={perDay > perDayAvg ? 'bad' : 'good'}>{perDay > perDayAvg ? '▲' : '▼'}</span>
        </div>
      </div>
    </>
  )
}
