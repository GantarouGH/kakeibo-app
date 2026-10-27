import { useMemo, useState } from 'react'
import { SOURCE, useDataset } from './hooks/useDataset'
import * as dbx from './lib/dropbox'
import { DropboxSetup } from './components/DropboxSetup'
import { useTheme } from './hooks/useTheme'
import { readColors } from './lib/chartTheme'
import {
  PALETTE, byCategory, cumulative, days, groupSum, isCounted, merchantName, periodLabel, summarize,
} from './lib/finance'
import type { Txn } from './types'
import { Header } from './components/Header'
import { KpiCards } from './components/KpiCards'
import { TrendChart } from './components/TrendChart'
import { CategoryDonut } from './components/CategoryDonut'
import { PaceChart } from './components/PaceChart'
import { BarList } from './components/BarList'
import { Heatmap } from './components/Heatmap'
import { TxTable } from './components/TxTable'

export default function App() {
  const { data, status, reload, clear } = useDataset()
  const { pref, setPref, resolved } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  /** 選択中の期間（開始日）。null = 常に最新期間（新しいCSVが追加されたら自動で追従） */
  const [selStart, setSelStart] = useState<string | null>(null)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const periods = useMemo(() => data?.periods ?? [], [data])
  const found = selStart ? periods.findIndex(q => q.start === selStart) : -1
  const idx = found >= 0 ? found : periods.length - 1
  const setIdx = (i: number) => setSelStart(i === periods.length - 1 ? null : periods[i].start)

  // テーマ変更時に Chart.js の色を取り直す
  const colors = useMemo(() => readColors(), [resolved]) // eslint-disable-line react-hooks/exhaustive-deps

  const byPeriod = useMemo(() => {
    const m = new Map<string, Txn[]>()
    for (const r of data?.rows ?? []) {
      const l = m.get(r.period) ?? []
      l.push(r)
      m.set(r.period, l)
    }
    return m
  }, [data])
  const rowsOf = (i: number) => byPeriod.get(periods[i]?.start) ?? []

  // カテゴリ色は全期間の支出額順で固定
  const { catColor, allCats } = useMemo(() => {
    const cats = byCategory(data?.rows ?? []).map(c => c[0])
    return { allCats: cats, catColor: Object.fromEntries(cats.map((c, i) => [c, PALETTE[i % PALETTE.length]])) }
  }, [data])

  const sums = useMemo(() => periods.map(p => summarize(byPeriod.get(p.start) ?? [])), [periods, byPeriod])

  const heat = useMemo(
    () => allCats.map(c => periods.map(p => (byPeriod.get(p.start) ?? []).filter(r => isCounted(r) && r.large === c).reduce((s, r) => s - r.amount, 0))),
    [allCats, periods, byPeriod],
  )

  const errorMsg = status.kind === 'error' ? status.message : undefined

  if (SOURCE === 'dropbox' && (showSettings || (status.kind === 'setup' && !data) || (errorMsg && !data))) {
    return (
      <DropboxSetup
        error={errorMsg}
        onClose={data ? () => setShowSettings(false) : undefined}
        onSaved={() => { setShowSettings(false); reload() }}
        onDisconnect={() => { dbx.disconnect(); setShowSettings(false); clear() }}
      />
    )
  }
  if (errorMsg && !data) {
    return (
      <div className="wrap">
        <div className="card notice">
          <div className="logo" style={{ margin: '0 auto 16px' }}>!</div>
          <h2>データを読み込めませんでした</h2>
          <p>{errorMsg}</p>
          <p><code>npm run dev</code> で起動しているか確認してください。</p>
        </div>
      </div>
    )
  }
  if (data && !periods.length) {
    return (
      <div className="wrap">
        <div className="card notice">
          <div className="logo" style={{ margin: '0 auto 16px' }}>¥</div>
          <h2>CSVが見つかりません</h2>
          <p>次のフォルダに「収入・支出詳細_*.csv」を置いてください。<br /><code>{data.dir}</code></p>
          {SOURCE === 'dropbox'
            ? <button className="btn" onClick={() => setShowSettings(true)}>フォルダ設定</button>
            : <p>別フォルダを使う場合: <code>KAKEIBO_DIR=/path npm run dev</code></p>}
        </div>
      </div>
    )
  }
  if (!data || idx < 0 || !periods[idx]) {
    return (
      <div className="wrap">
        <div className="empty">
          <span className="spin">↻</span> 読み込み中…
          {status.kind === 'loading' && status.total ? ` ${status.done}/${status.total}` : ''}
        </div>
      </div>
    )
  }

  const p = periods[idx]
  const cur = rowsOf(idx)
  const perDayAvg = periods.reduce((s, q, i) => s + sums[i].exp / days(q), 0) / periods.length
  const others = periods.map((q, i) => (i === idx ? null : cumulative(q, rowsOf(i)))).filter((x): x is number[] => !!x)
  // 期間の長さが違うため、各期間の最終値で延長して平均（短い期間で末尾が跳ねないように）
  const average = Array.from({ length: days(p) }, (_, i) =>
    others.length ? others.reduce((s, a) => s + a[Math.min(i, a.length - 1)], 0) / others.length : null,
  )

  const changePeriod = (i: number) => { setIdx(i); setSelectedCat(null) }

  return (
    <div className="wrap">
      <Header
        periods={periods} idx={idx} onIdx={changePeriod}
        theme={pref} onTheme={setPref} onReload={reload}
        onSettings={SOURCE === 'dropbox' ? () => setShowSettings(true) : undefined}
        live={SOURCE === 'local' && !!import.meta.hot}
        loading={status.kind === 'loading'}
      />
      {errorMsg && <div className="toast bad" onClick={reload}>⚠︎ {errorMsg}（タップで再試行・表示は前回のデータ）</div>}
      <div className="grid" key={p.start}>
        <KpiCards cur={sums[idx]} prev={idx > 0 ? sums[idx - 1] : null} perDay={sums[idx].exp / days(p)} perDayAvg={perDayAvg} />
        <TrendChart labels={periods.map(periodLabel)} sums={sums} idx={idx} colors={colors} onSelect={changePeriod} />
        <CategoryDonut cats={byCategory(cur)} catColor={catColor} selected={selectedCat} onSelect={setSelectedCat} colors={colors} />
        <PaceChart current={cumulative(p, cur)} average={average} colors={colors} />
        <BarList
          title="支払い手段" span={5}
          items={groupSum(cur, r => r.account).slice(0, 8).map(([name, value, c]) => ({ name, value, extra: `${c}件` }))}
          onClick={name => setQuery(name)}
        />
        <Heatmap
          periods={periods} cats={allCats} matrix={heat} catColor={catColor} idx={idx} dark={resolved === 'dark'}
          onCell={(c, i) => { setIdx(i); setSelectedCat(c) }}
        />
        <BarList
          title="よく使うお店・内容 TOP10" span={5}
          items={groupSum(cur, r => merchantName(r.content)).slice(0, 10).map(([name, value, c]) => ({ name, value, extra: `${c}回` }))}
          onClick={name => setQuery(name)}
        />
        <TxTable
          rows={cur.filter(isCounted)} categories={allCats} catColor={catColor} incomeColor={colors.income}
          selected={selectedCat} onSelect={setSelectedCat} query={query} onQuery={setQuery}
        />
      </div>
      <footer className="footer">
        {data.dir} — {periods.length} ファイル / {data.rows.length.toLocaleString()} 件 — 読込 {new Date(data.loadedAt).toLocaleString('ja-JP')}
      </footer>
    </div>
  )
}
