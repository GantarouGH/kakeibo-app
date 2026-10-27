export interface Txn {
  id: string
  /** 計算対象 */
  target: boolean
  /** YYYY-MM-DD */
  date: string
  content: string
  /** 収入は正、支出は負 */
  amount: number
  account: string
  large: string
  middle: string
  memo: string
  transfer: boolean
  /** 所属する期間の開始日 */
  period: string
}

export interface Period {
  file: string
  start: string
  end: string
  count: number
}

export interface Dataset {
  dir: string
  loadedAt: string
  periods: Period[]
  rows: Txn[]
}
