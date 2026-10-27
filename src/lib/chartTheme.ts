import {
  ArcElement, BarController, BarElement, CategoryScale, Chart as ChartJS, DoughnutController, Filler,
  Legend, LinearScale, LineController, LineElement, PointElement, Tooltip,
} from 'chart.js'

ChartJS.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend,
  LinearScale, LineController, LineElement, PointElement, Tooltip,
)

export interface ChartColors {
  text: string; muted: string; grid: string; accent: string; income: string; expense: string; font: string
}

/** CSS 変数から現在テーマの色を取得し Chart.js の既定値に適用 */
export function readColors(): ChartColors {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  const c: ChartColors = {
    text: v('--text'), muted: v('--muted'), grid: v('--grid'), accent: v('--accent'),
    income: v('--income'), expense: v('--expense'), font: v('--font'),
  }
  ChartJS.defaults.color = c.muted
  ChartJS.defaults.borderColor = c.grid
  ChartJS.defaults.font.family = c.font
  ChartJS.defaults.font.size = 11
  ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(15,23,42,.92)'
  ChartJS.defaults.plugins.tooltip.padding = 10
  ChartJS.defaults.plugins.tooltip.cornerRadius = 8
  return c
}
