import type { Dataset, Period, Txn } from '../types.ts'

/** ブラウザ / Node 共通: マネーフォワード ME の CSV 群から Dataset を作る */

export interface RawFile {
  name: string
  bytes: ArrayBuffer | Uint8Array
}

const NAME_RE = /(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/

export function parseCSV(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(f); out.push(row); row = []; f = ''
    } else f += c
  }
  if (f || row.length) { row.push(f); out.push(row) }
  return out
}

/** UTF-8 (BOM可) を試し、ダメなら Shift_JIS */
export function decode(bytes: ArrayBuffer | Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '') }
  catch { return new TextDecoder('shift_jis').decode(bytes) }
}

export function buildDataset(files: RawFile[], dir: string): Dataset {
  const periods: Period[] = []
  const rows: Txn[] = []
  const seen = new Set<string>()

  for (const { name, bytes } of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!name.toLowerCase().endsWith('.csv')) continue
    const table = parseCSV(decode(bytes))
    const head = table.shift() ?? []
    const col = (n: string) => head.indexOf(n)
    const I = {
      t: col('計算対象'), d: col('日付'), c: col('内容'), a: col('金額（円）'), ac: col('保有金融機関'),
      l: col('大項目'), mi: col('中項目'), me: col('メモ'), tr: col('振替'), id: col('ID'),
    }
    if (I.d < 0 || I.a < 0) continue

    const dates: string[] = []
    const fileRows: Txn[] = []
    for (const r of table) {
      if (r.length < head.length) continue
      const id = r[I.id] || `${name}-${fileRows.length}`
      if (seen.has(id)) continue
      seen.add(id)
      const date = r[I.d].replace(/\//g, '-')
      dates.push(date)
      fileRows.push({
        id, date,
        target: r[I.t] === '1',
        content: r[I.c] ?? '',
        amount: parseInt((r[I.a] ?? '0').replace(/,/g, ''), 10) || 0,
        account: r[I.ac] ?? '',
        large: r[I.l] || '未分類',
        middle: r[I.mi] || '未分類',
        memo: r[I.me] ?? '',
        transfer: r[I.tr] === '1',
        period: '',
      })
    }
    dates.sort()
    const m = name.match(NAME_RE)
    const start = m?.[1] ?? dates[0], end = m?.[2] ?? dates[dates.length - 1]
    if (!start) continue
    fileRows.forEach(r => (r.period = start))
    rows.push(...fileRows)
    periods.push({ file: name, start, end, count: fileRows.length })
  }
  periods.sort((a, b) => a.start.localeCompare(b.start))
  return { dir, loadedAt: new Date().toISOString(), periods, rows }
}
