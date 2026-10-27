import type { Period } from '../types'
import { alpha, periodLabel, yen, yenShort } from '../lib/finance'

interface Props {
  periods: Period[]
  cats: string[]
  matrix: number[][] // [cat][period]
  catColor: Record<string, string>
  idx: number
  dark: boolean
  onCell: (cat: string, periodIdx: number) => void
}

export function Heatmap({ periods, cats, matrix, catColor, idx, dark, onCell }: Props) {
  return (
    <div className="card span-12">
      <div className="card-title">カテゴリ × 期間 ヒートマップ <small>セルをクリックで明細を絞り込み</small></div>
      <div className="heat-wrap">
        <table className="heat">
          <thead>
            <tr>
              <th className="row" />
              {periods.map((p, i) => <th key={p.start} className={i === idx ? 'cur' : ''}>{periodLabel(p)}</th>)}
              <th>平均</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, ci) => {
              const row = matrix[ci]
              const max = Math.max(...row, 1)
              const avg = row.reduce((a, b) => a + b, 0) / row.length
              const col = catColor[c]
              return (
                <tr key={c}>
                  <th className="row"><span className="tag" style={{ background: alpha(col, 0.18), color: col }}>{c}</span></th>
                  {row.map((v, i) => {
                    const a = Math.max(v, 0) / max
                    return (
                      <td
                        key={i}
                        title={`${c} ${periodLabel(periods[i])}: ${yen(v)}`}
                        onClick={() => onCell(c, i)}
                        style={{
                          background: alpha(col, 0.06 + a * 0.55),
                          outline: i === idx ? `2px solid ${col}` : undefined,
                          color: a > 0.6 && !dark ? '#fff' : undefined,
                        }}
                      >
                        {v ? yenShort(v) : '–'}
                      </td>
                    )
                  })}
                  <td className="avg">{yenShort(avg)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
