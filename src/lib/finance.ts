import type { Period, Txn } from '../types'

export const isCounted = (r: Txn) => r.target && !r.transfer
export const isIncome = (r: Txn) => r.large === '収入'
export const isExpense = (r: Txn) => isCounted(r) && !isIncome(r)

export interface Summary { inc: number; exp: number; net: number }

export function summarize(list: Txn[]): Summary {
  let inc = 0, exp = 0
  for (const r of list) {
    if (!isCounted(r)) continue
    if (isIncome(r)) inc += r.amount
    else exp -= r.amount
  }
  return { inc, exp, net: inc - exp }
}

export const days = (p: Period) =>
  Math.round((Date.parse(p.end) - Date.parse(p.start)) / 864e5) + 1

/** 大項目別の支出（降順） */
export function byCategory(list: Txn[]): [string, number][] {
  const m = new Map<string, number>()
  for (const r of list) if (isExpense(r)) m.set(r.large, (m.get(r.large) ?? 0) - r.amount)
  return [...m].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
}

export function groupSum(list: Txn[], key: (r: Txn) => string): [string, number, number][] {
  const m = new Map<string, [number, number]>()
  for (const r of list) {
    if (!isExpense(r) || r.amount >= 0) continue
    const k = key(r)
    const v = m.get(k) ?? [0, 0]
    v[0] -= r.amount; v[1]++
    m.set(k, v)
  }
  return [...m].map(([k, [v, c]]) => [k, v, c] as [string, number, number]).sort((a, b) => b[1] - a[1])
}

/** 期間内の日別累積支出 */
export function cumulative(p: Period, list: Txn[]): number[] {
  const arr = new Array<number>(days(p)).fill(0)
  const s = Date.parse(p.start)
  for (const r of list) {
    if (!isExpense(r)) continue
    const d = Math.round((Date.parse(r.date) - s) / 864e5)
    if (d >= 0 && d < arr.length) arr[d] -= r.amount
  }
  for (let i = 1; i < arr.length; i++) arr[i] += arr[i - 1]
  return arr
}

export const merchantName = (s: string) =>
  s.normalize('NFKC').replace(/\s*販売:.*$/, '').replace(/\s+/g, ' ').trim().slice(0, 40)

// ---------- format ----------
export const yen = (n: number) =>
  (n < 0 ? '-' : '') + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP')

export const yenShort = (n: number) =>
  Math.abs(n) >= 10000
    ? (n / 10000).toFixed(Math.abs(n) >= 100000 ? 0 : 1) + '万'
    : Math.round(n).toLocaleString('ja-JP')

export const periodLabel = (p: Period) => {
  const [y, m] = p.end.split('-').map(Number)
  return `${y % 100}/${m}月`
}
export const periodRange = (p: Period) =>
  `${p.start.slice(0, 4)}  ${p.start.slice(5).replace('-', '/')} – ${p.end.slice(5).replace('-', '/')}`

// ---------- colors ----------
export const PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16', '#0ea5e9',
  '#d946ef', '#14b8a6', '#fb923c', '#a3a3a3', '#eab308', '#22c55e', '#3b82f6', '#e11d48', '#64748b',
]
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}
