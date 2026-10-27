import { Doughnut } from 'react-chartjs-2'
import type { Plugin } from 'chart.js'
import type { ChartColors } from '../lib/chartTheme'
import { yen } from '../lib/finance'

interface Props {
  cats: [string, number][]
  catColor: Record<string, string>
  selected: string | null
  onSelect: (c: string | null) => void
  colors: ChartColors
}

export function CategoryDonut({ cats, catColor, selected, onSelect, colors }: Props) {
  const total = cats.reduce((s, c) => s + c[1], 0)
  const toggle = (c: string) => onSelect(selected === c ? null : c)

  const center: Plugin<'doughnut'> = {
    id: 'center',
    afterDraw(ch) {
      const { ctx, chartArea: a } = ch
      const x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2
      const sel = selected ? cats.find(c => c[0] === selected) : null
      ctx.save()
      ctx.textAlign = 'center'
      ctx.fillStyle = colors.muted
      ctx.font = `11px ${colors.font}`
      ctx.fillText(sel ? sel[0] : '支出合計', x, y - 12)
      ctx.fillStyle = colors.text
      ctx.font = `700 18px ${colors.font}`
      ctx.fillText(yen(sel ? sel[1] : total), x, y + 12)
      ctx.restore()
    },
  }

  return (
    <div className="card span-4">
      <div className="card-title">カテゴリ別支出 {selected && <button className="btn" style={{ height: 24 }} onClick={() => onSelect(null)}>解除</button>}</div>
      <div className="chart-box" style={{ height: 200 }}>
        <Doughnut
          key={selected ?? '_'}
          data={{
            labels: cats.map(c => c[0]),
            datasets: [{
              data: cats.map(c => c[1]),
              backgroundColor: cats.map(c => (selected && selected !== c[0] ? catColor[c[0]] + '40' : catColor[c[0]] ?? '#999')),
              borderWidth: 0, hoverOffset: 6,
            }],
          }}
          options={{
            maintainAspectRatio: false, cutout: '72%',
            onClick: (_e, el) => { if (el.length) toggle(cats[el[0].index][0]) },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${yen(c.raw as number)}` } } },
          }}
          plugins={[center]}
        />
      </div>
      <div className="legend">
        {cats.length === 0 && <div className="empty">データなし</div>}
        {cats.map(([c, v]) => (
          <button key={c} className={`legend-item ${selected === c ? 'active' : ''}`} onClick={() => toggle(c)}>
            <span className="swatch" style={{ background: catColor[c] }} />
            <span>{c}</span>
            <span className="pct">{((v / total) * 100).toFixed(1)}%</span>
            <span className="amt">{yen(v)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
