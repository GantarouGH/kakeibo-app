import type { Txn } from '../types'

/**
 * 固定費 / 変動費の分類
 * キーは「大項目」または「大項目/中項目」。中項目の指定が優先。
 * ユーザーが画面で変更した分は localStorage に保存（端末ごと）。
 */
export const DEFAULT_FIXED: Record<string, boolean> = {
  '住宅': true,
  '保険': true,
  '水道・光熱費': true,
  '税・社会保障': true,
  '通信費/携帯電話': true,
  '通信費/情報サービス': true,
  '通信費/放送視聴料': true,
  '通信費/インターネット': true,
  '教養・教育/習いごと': true,
  '教養・教育/学費': true,
  '教養・教育/新聞・雑誌': true,
  '自動車/自動車ローン': true,
  '自動車/自動車保険': true,
  '自動車/駐車場': true,
}

export type FixedRules = Record<string, boolean>

const KEY = 'fixedRules'
export const loadOverrides = (): FixedRules => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export const saveOverrides = (o: FixedRules) => localStorage.setItem(KEY, JSON.stringify(o))

export function isFixedBy(rules: FixedRules, large: string, middle: string): boolean {
  const mk = `${large}/${middle}`
  if (mk in rules) return rules[mk]
  if (large in rules) return rules[large]
  return false
}

/** 既定ルール + ユーザー上書き → 判定関数 */
export function makeClassifier(overrides: FixedRules) {
  const rules = { ...DEFAULT_FIXED, ...overrides }
  const cache = new Map<string, boolean>()
  return (r: Pick<Txn, 'large' | 'middle'>) => {
    const k = `${r.large}/${r.middle}`
    let v = cache.get(k)
    if (v === undefined) { v = isFixedBy(rules, r.large, r.middle); cache.set(k, v) }
    return v
  }
}
export type Classifier = ReturnType<typeof makeClassifier>
