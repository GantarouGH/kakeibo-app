import { Chart } from 'react-chartjs-2'
import type { ChartColors } from '../lib/chartTheme'
import type { Summary } from '../lib/finance'
import { alpha, yen, yenShort } from '../lib/finance'

interface Props {
  labels: string[]
  sums: Summary[]
  range: [number, number]
  colors: ChartColors
  onSelect: (i: number) => void
}

const toHex = (c: string) => (c.startsWith('#') ? c : '#888888')

export function TrendChart({ labels, sums, range: [a, b], colors, onSelect }: Props) {
  const inRange = (i: number) => i >= a && i <= b
  const dim = (c: string) => labels.map((_, i) => (inRange(i) ? c : alpha(toHex(c), 0.3)))
  return (
    <div className="card span-8">
      <div className="card-title">月次推移 <small>支出は固定費＋変動費の積み上げ・棒クリックでその月へ</small></div>
      <div className="chart-box" style={{ height: 380 }}>
        <Chart
          type="bar"
          data={{
            labels,
            datasets: [
              { type: 'bar' as const, label: '収入', data: sums.map(s => s.inc), backgroundColor: dim(colors.income), borderRadius: 6, stack: 'inc', order: 2 },
              { type: 'bar' as const, label: '固定費', data: sums.map(s => s.fixed), backgroundColor: dim(colors.fixed), stack: 'exp', order: 2, borderRadius: { bottomLeft: 6, bottomRight: 6 } as never },
              { type: 'bar' as const, label: '変動費', data: sums.map(s => s.variable), backgroundColor: dim(colors.variable), stack: 'exp', order: 2, borderRadius: { topLeft: 6, topRight: 6 } as never },
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
              tooltip: {
                callbacks: {
                  label: c => ` ${c.dataset.label}: ${yen(c.raw as number)}`,
                  footer: items => {
                    const s = sums[items[0]?.dataIndex ?? 0]
                    return s ? `支出計: ${yen(s.exp)}` : ''
                  },
                },
              },
            },
            scales: {
              y: { stacked: true, ticks: { callback: v => yenShort(Number(v)) }, grid: { color: colors.grid } },
              x: { stacked: true, grid: { display: false } },
            },
          }}
        />
      </div>
    </div>
  )
}
