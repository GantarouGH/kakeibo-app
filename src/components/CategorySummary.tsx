import { useState } from 'react'
import type { Txn } from '../types'
import { alpha, isExpense, isIncome, yen } from '../lib/finance'
import type { Classifier } from '../lib/fixed'
import { Money } from './Money'

interface Props {
  rows: Txn[]
  n: number
  catColor: Record<string, string>
  isFixed: Classifier
  onPick: (cat: string) => void
}

interface Line { name: string; total: number; fixed: number; middles: [string, number, boolean][] }

function Badge({ f, part }: { f: boolean; part?: boolean }) {
  return <span className={`fv-badge ${f ? 'fixed' : 'variable'}`}>{part ? '一部固定' : f ? '固定' : '変動'}</span>
}

/** 複数期間の集計表: 大項目ごとの合計・月平均・構成比（中項目に展開可） */
export function CategorySummary({ rows, n, catColor, isFixed, onPick }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  const m = new Map<string, Map<string, number>>()
  let income = 0
  for (const r of rows) {
    if (isIncome(r) && r.target && !r.transfer) income += r.amount
    if (!isExpense(r)) continue
    const mm = m.get(r.large) ?? new Map<string, number>()
    mm.set(r.middle, (mm.get(r.middle) ?? 0) - r.amount)
    m.set(r.large, mm)
  }
  const lines: Line[] = [...m].map(([name, mm]) => {
    const middles = [...mm].map(([k, v]) => [k, v, isFixed({ large: name, middle: k })] as [string, number, boolean]).sort((a, b) => b[1] - a[1])
    return { name, total: middles.reduce((s, x) => s + x[1], 0), fixed: middles.filter(x => x[2]).reduce((s, x) => s + x[1], 0), middles }
  }).filter(l => l.total !== 0).sort((a, b) => b.total - a.total)
  const total = lines.reduce((s, l) => s + l.total, 0)
  const fixed = lines.reduce((s, l) => s + l.fixed, 0)

  return (
    <div className="card span-12">
      <div className="card-title">
        期間集計 <small>{n}期間 ・ 行をクリックで中項目を表示</small>
      </div>
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="tx sum">
          <thead>
            <tr>
              <th>カテゴリ</th>
              <th className="hide-sm">区分</th>
              <th className="num">合計</th>
              <th className="num">月平均</th>
              <th className="num">構成比</th>
              <th className="hide-sm" style={{ width: '22%' }} />
            </tr>
          </thead>
          <tbody>
            {lines.map(l => {
              const c = catColor[l.name] ?? '#888888'
              const isOpen = open === l.name
              const part = l.fixed > 0 && l.fixed < l.total
              return [
                <tr key={l.name} className="clickable" onClick={() => setOpen(isOpen ? null : l.name)}>
                  <td>
                    <span className="caret">{isOpen ? '▾' : '▸'}</span>
                    <span className="tag" style={{ background: alpha(c, 0.15), color: c }}>{l.name}</span>
                  </td>
                  <td className="hide-sm"><Badge f={l.fixed > 0} part={part} /></td>
                  <td className="num"><b><Money v={l.total} /></b></td>
                  <td className="num">{yen(l.total / n)}</td>
                  <td className="num">{((l.total / total) * 100).toFixed(1)}%</td>
                  <td className="hide-sm"><div className="track"><div className="fill" style={{ width: `${(l.total / lines[0].total) * 100}%`, background: c }} /></div></td>
                </tr>,
                ...(isOpen ? l.middles.map(([k, v, f]) => (
                  <tr key={l.name + k} className="sub-row">
                    <td style={{ paddingLeft: 34 }}>
                      {k}
                      <button className="link" onClick={e => { e.stopPropagation(); onPick(l.name) }}>明細</button>
                    </td>
                    <td className="hide-sm"><Badge f={f} /></td>
                    <td className="num">{yen(v)}</td>
                    <td className="num">{yen(v / n)}</td>
                    <td className="num">{((v / total) * 100).toFixed(1)}%</td>
                    <td className="hide-sm" />
                  </tr>
                )) : []),
              ]
            })}
          </tbody>
          <tfoot>
            <tr><td>固定費</td><td className="hide-sm" /><td className="num">{yen(fixed)}</td><td className="num">{yen(fixed / n)}</td><td className="num">{((fixed / (total || 1)) * 100).toFixed(1)}%</td><td className="hide-sm" /></tr>
            <tr><td>変動費</td><td className="hide-sm" /><td className="num">{yen(total - fixed)}</td><td className="num">{yen((total - fixed) / n)}</td><td className="num">{(((total - fixed) / (total || 1)) * 100).toFixed(1)}%</td><td className="hide-sm" /></tr>
            <tr className="grand"><td>支出合計</td><td className="hide-sm" /><td className="num"><Money v={total} /></td><td className="num"><Money v={total / n} /></td><td className="num">100%</td><td className="hide-sm" /></tr>
            <tr><td>収入合計</td><td className="hide-sm" /><td className="num good">{yen(income)}</td><td className="num good">{yen(income / n)}</td><td className="num" /><td className="hide-sm" /></tr>
            <tr className="grand"><td>収支</td><td className="hide-sm" /><td className={`num ${income - total >= 0 ? 'good' : 'bad'}`}><Money v={income - total} /></td><td className={`num ${income - total >= 0 ? 'good' : 'bad'}`}><Money v={(income - total) / n} /></td><td className="num" /><td className="hide-sm" /></tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
