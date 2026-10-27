import { useMemo, useState } from 'react'
import type { Txn } from '../types'
import { alpha, isIncome, yen } from '../lib/finance'

type SortKey = 'date' | 'content' | 'large' | 'amount'

interface Props {
  rows: Txn[]
  categories: string[]
  catColor: Record<string, string>
  incomeColor: string
  selected: string | null
  onSelect: (c: string | null) => void
  query: string
  onQuery: (q: string) => void
}

export function TxTable({ rows, categories, catColor, incomeColor, selected, onSelect, query, onQuery }: Props) {
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'date', dir: -1 })

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let l = rows
    if (selected) l = l.filter(r => r.large === selected)
    if (q) l = l.filter(r => `${r.content} ${r.middle} ${r.account} ${r.memo}`.toLowerCase().includes(q))
    return [...l].sort((a, b) => {
      const x = a[sort.k], y = b[sort.k]
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [rows, selected, query, sort])

  const total = list.reduce((s, r) => s + r.amount, 0)
  const head = (k: SortKey, label: string, cls?: string) => (
    <th className={cls} onClick={() => setSort(s => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : k === 'date' || k === 'amount' ? -1 : 1 }))}>
      {label}{sort.k === k ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
    </th>
  )
  const inc = incomeColor.startsWith('#') ? incomeColor : '#10b981'

  return (
    <div className="card span-7">
      <div className="card-title">
        <span>明細 <small>{list.length}件 / 合計 {yen(total)}</small></span>
        <span className="tools">
          <select className="field" value={selected ?? ''} onChange={e => onSelect(e.target.value || null)}>
            <option value="">すべてのカテゴリ</option>
            {categories.map(c => <option key={c}>{c}</option>)}
            <option>収入</option>
          </select>
          <input className="field" type="search" placeholder="検索…" value={query} onChange={e => onQuery(e.target.value)} />
        </span>
      </div>
      <div className="table-wrap">
        <table className="tx">
          <thead>
            <tr>{head('date', '日付')}{head('content', '内容')}{head('large', 'カテゴリ')}{head('amount', '金額', 'num')}</tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={4} className="empty">該当なし</td></tr>}
            {list.map(r => {
              const c = isIncome(r) ? inc : catColor[r.large] ?? '#888888'
              return (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>{r.date.slice(5).replace('-', '/')}</td>
                  <td>
                    <div className="cell-main" title={r.content}>{r.content}</div>
                    <div className="cell-sub">{r.account}{r.memo && ` ・ ${r.memo}`}</div>
                  </td>
                  <td>
                    <span className="tag" style={{ background: alpha(c, 0.15), color: c }}>{r.large}</span>
                    <div className="cell-sub">{r.middle}</div>
                  </td>
                  <td className={`num ${r.amount > 0 ? 'good' : ''}`}>{yen(r.amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
