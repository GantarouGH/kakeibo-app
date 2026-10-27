import type { Period } from '../types'
import { days } from './finance'

/** 表示する期間の指定 */
export type View =
  | { mode: 'month'; start: string | null } // null = 最新
  | { mode: 'year'; year: number | 'last12' | null } // null = 最新の年
  | { mode: 'range'; from: string; to: string }

/** 期間ファイルの「年」は終了日の年（例: 2025/12/22〜2026/01/21 → 2026年1月分） */
export const periodYear = (p: Period) => Number(p.end.slice(0, 4))

export const yearsOf = (periods: Period[]) => [...new Set(periods.map(periodYear))].sort((a, b) => a - b)

/** View → 期間インデックスの範囲 [a, b]（両端含む） */
export function resolveRange(view: View, periods: Period[]): [number, number] {
  const last = periods.length - 1
  if (last < 0) return [0, -1]
  switch (view.mode) {
    case 'month': {
      const i = view.start ? periods.findIndex(p => p.start === view.start) : -1
      const k = i >= 0 ? i : last
      return [k, k]
    }
    case 'year': {
      if (view.year === 'last12') return [Math.max(0, last - 11), last]
      const y = view.year ?? periodYear(periods[last])
      const idx = periods.map((p, i) => (periodYear(p) === y ? i : -1)).filter(i => i >= 0)
      return idx.length ? [idx[0], idx[idx.length - 1]] : [last, last]
    }
    case 'range': {
      let a = periods.findIndex(p => p.start === view.from)
      let b = periods.findIndex(p => p.start === view.to)
      if (a < 0) a = 0
      if (b < 0) b = last
      return a <= b ? [a, b] : [b, a]
    }
  }
}

export const spanDays = (periods: Period[], a: number, b: number) =>
  periods.slice(a, b + 1).reduce((s, p) => s + days(p), 0)
