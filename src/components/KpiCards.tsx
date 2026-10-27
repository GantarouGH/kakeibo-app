import type { Summary } from '../lib/finance'
import { yen } from '../lib/finance'
import { Money } from './Money'

interface Props {
  cur: Summary
  /** 比較対象（同じ長さの直前の期間）。なければ null */
  prev: Summary | null
  prevLabel: string
  /** 期間数（1 = 月表示） */
  n: number
  totalDays: number
  /** 全期間の1期間あたり平均支出 / 1日あたり平均支出 */
  avgPerPeriod: number
  avgPerDay: number
  /** 年表示のとき 12期間換算の支出（年間着地見込み） */
  annualized?: number
}

function Delta({ cur, prev, higherIsBad, label }: { cur: number; prev: number; higherIsBad: boolean; label: string }) {
  if (!prev) return null
  const d = ((cur - prev) / Math.abs(prev)) * 100
  const bad = higherIsBad ? d > 0 : d < 0
  return (
    <>{label} <span className={bad ? 'bad' : 'good'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%</span>（{yen(prev)}）</>
  )
}

export function KpiCards({ cur, prev, prevLabel, n, totalDays, avgPerPeriod, avgPerDay, annualized }: Props) {
  const rate = cur.inc > 0 ? ((cur.net / cur.inc) * 100).toFixed(1) : '-'
  const multi = n > 1
  const perDay = cur.exp / totalDays
  const perPeriod = cur.exp / n
  return (
    <>
      <div className="card span-3 kpi-card">
        <div className="kpi-label"><span className="dot" style={{ background: 'var(--income)' }} />{multi ? '収入合計' : '収入'}</div>
        <div className="kpi-value"><Money v={cur.inc} /></div>
        <div className="kpi-delta">
          {prev ? <Delta cur={cur.inc} prev={prev.inc} higherIsBad={false} label={prevLabel} /> : multi && <>月平均 {yen(cur.inc / n)}</>}
        </div>
      </div>
      <div className="card span-3 kpi-card">
        <div className="kpi-label"><span className="dot" style={{ background: 'var(--expense)' }} />{multi ? '支出合計' : '支出'}</div>
        <div className="kpi-value"><Money v={cur.exp} /></div>
        <div className="kpi-delta">
          {prev ? <Delta cur={cur.exp} prev={prev.exp} higherIsBad label={prevLabel} />
            : annualized ? <>年間見込み {yen(annualized)}</>
            : multi && <>月平均 {yen(perPeriod)}</>}
        </div>
      </div>
      <div className="card span-3 kpi-card">
        <div className="kpi-label"><span className="dot" style={{ background: 'var(--accent)' }} />{multi ? '収支合計' : '収支'}</div>
        <div className={`kpi-value ${cur.net >= 0 ? 'good' : 'bad'}`}><Money v={cur.net} /></div>
        <div className="kpi-delta">貯蓄率 <b>{rate}%</b>{multi && <> ・ 月平均 {yen(cur.net / n)}</>}</div>
      </div>
      <div className="card span-3 kpi-card">
        {multi ? (
          <>
            <div className="kpi-label"><span className="dot" style={{ background: 'var(--warn)' }} />月平均支出</div>
            <div className="kpi-value"><Money v={perPeriod} /></div>
            <div className="kpi-delta">
              全期間平均 {yen(avgPerPeriod)}{' '}
              <span className={perPeriod > avgPerPeriod ? 'bad' : 'good'}>{perPeriod > avgPerPeriod ? '▲' : '▼'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="kpi-label"><span className="dot" style={{ background: 'var(--warn)' }} />1日あたり支出</div>
            <div className="kpi-value"><Money v={perDay} /></div>
            <div className="kpi-delta">
              全期間平均 {yen(avgPerDay)}{' '}
              <span className={perDay > avgPerDay ? 'bad' : 'good'}>{perDay > avgPerDay ? '▲' : '▼'}</span>
            </div>
          </>
        )}
      </div>
    </>
  )
}
