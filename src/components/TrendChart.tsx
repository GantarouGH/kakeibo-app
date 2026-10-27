import { Chart } from 'react-chartjs-2'
import type { ChartColors } from '../lib/chartTheme'
import type { Summary } from '../lib/finance'
import { alpha, yen, yenShort } from '../lib/finance'

interface Props {
  labels: string[]
  sums: Summary[]
  idx: number
  colors: ChartColors
  onSelect: (i: number) => void
}

const toHex = (c: string) => (c.startsWith('#') ? c : '#888888')

export function TrendChart({ labels, sums, idx, colors, onSelect }: Props) {
  const dim = (c: string) => labels.map((_, i) => (i === idx ? c : alpha(toHex(c), 0.35)))
  return (
    <div className="card span-8">
      <div className="card-title">月次推移 <small>棒をクリックで期間を切替</small></div>
      <div className="chart-box" style={{ height: 380 }}>
        <Chart
          type="bar"
          data={{
            labels,
            datasets: [
              { type: 'bar' as const, label: '収入', data: sums.map(s => s.inc), backgroundColor: dim(colors.income), borderRadius: 6, order: 2 },
              { type: 'bar' as const, label: '支出', data: sums.map(s => s.exp), backgroundColor: dim(colors.expense), borderRadius: 6, order: 2 },
              {
                type: 'line' as const, label: '収支', data: sums.map(s => s.net), borderColor: colors.accent, backgroundColor: colors.accent,
                tension: 0.35, pointRadius: 4, pointHoverRadius: 6, order: 1,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            onClick: (_e, el) => { if (el.length) onSelect(el[0].index) },
            plugins: {
              legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } },
              tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${yen(c.raw as number)}` } },
            },
            scales: {
              y: { ticks: { callback: v => yenShort(Number(v)) }, grid: { color: colors.grid } },
              x: { grid: { display: false } },
            },
          }}
        />
      </div>
    </div>
  )
}
