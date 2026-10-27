import { Line } from 'react-chartjs-2'
import type { ChartColors } from '../lib/chartTheme'
import { alpha, yen, yenShort } from '../lib/finance'

interface Props {
  current: number[]
  average: (number | null)[]
  colors: ChartColors
}

export function PaceChart({ current, average, colors }: Props) {
  const n = Math.max(current.length, average.length)
  const base = colors.expense.startsWith('#') ? colors.expense : '#f43f5e'
  const last = current[current.length - 1] ?? 0
  const avgAt = average[current.length - 1] ?? null
  const diff = avgAt != null ? last - avgAt : null
  return (
    <div className="card span-7">
      <div className="card-title">
        累積支出ペース
        <small>
          今期 vs 過去平均
          {diff != null && <> ・ <span className={diff > 0 ? 'bad' : 'good'}>{diff > 0 ? '+' : ''}{yen(diff)}</span></>}
        </small>
      </div>
      <div className="chart-box">
        <Line
          data={{
            labels: Array.from({ length: n }, (_, i) => `${i + 1}日目`),
            datasets: [
              {
                label: '今期', data: current, borderColor: colors.expense, fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5,
                backgroundColor: ctx => {
                  const { chart } = ctx
                  if (!chart.chartArea) return alpha(base, 0.2)
                  const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom)
                  g.addColorStop(0, alpha(base, 0.35)); g.addColorStop(1, alpha(base, 0))
                  return g
                },
              },
              { label: '過去平均', data: average, borderColor: colors.muted, borderDash: [5, 5], tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10 } },
              tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${yen(c.raw as number)}` } },
            },
            scales: { y: { ticks: { callback: v => yenShort(Number(v)) } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } },
          }}
        />
      </div>
    </div>
  )
}
