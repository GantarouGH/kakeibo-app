import { useMemo, useState } from 'react'
import { SOURCE, useDataset } from './hooks/useDataset'
import * as dbx from './lib/dropbox'
import { DropboxSetup } from './components/DropboxSetup'
import { useTheme } from './hooks/useTheme'
import { readColors } from './lib/chartTheme'
import {
  PALETTE, addSummary, byCategory, cumulative, days, groupSum, isCounted, isExpense, merchantName, periodLabel, summarize,
} from './lib/finance'
import { type FixedRules, loadOverrides, makeClassifier, saveOverrides } from './lib/fixed'
import { type View, resolveRange, spanDays } from './lib/range'
import type { Txn } from './types'
import { Header } from './components/Header'
import { KpiCards } from './components/KpiCards'
import { TrendChart } from './components/TrendChart'
import { CategoryDonut } from './components/CategoryDonut'
import { PaceChart } from './components/PaceChart'
import { BarList } from './components/BarList'
import { Heatmap } from './components/Heatmap'
import { type Kind, TxTable } from './components/TxTable'
import { FixedVariableCard } from './components/FixedVariableCard'
import { FixedRulesEditor } from './components/FixedRulesEditor'
import { CategorySummary } from './components/CategorySummary'
import { PeriodSlider } from './components/PeriodSlider'

const loadView = (): View => {
  try {
    // ?view=year / ?view=year:2026 / ?view=range:2026-03-19:2026-06-22（ブックマーク用）
    const q = new URLSearchParams(location.search).get('view')
    if (q) {
      const [m, x, y] = q.split(':')
      if (m === 'year') return { mode: 'year', year: x === 'last12' ? 'last12' : x ? Number(x) : null }
      if (m === 'range' && x && y) return { mode: 'range', from: x, to: y }
      if (m === 'month') return { mode: 'month', start: x || null }
    }
    const v = JSON.parse(sessionStorage.getItem('view') || 'null')
    if (v?.mode) return v
  } catch { /* ignore */ }
  return { mode: 'month', start: null }
}

export default function App() {
  const { data, status, reload, clear } = useDataset()
  const { pref, setPref, resolved } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [view, setViewState] = useState<View>(loadView)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind>(null)
  const [query, setQuery] = useState('')
  const [overrides, setOverrides] = useState<FixedRules>(loadOverrides)

  const setView = (v: View) => {
    setViewState(v); setSelectedCat(null); setKind(null)
    sessionStorage.setItem('view', JSON.stringify(v))
  }

  const isFixed = useMemo(() => makeClassifier(overrides), [overrides])
  const periods = useMemo(() => data?.periods ?? [], [data])
  const [a, b] = resolveRange(view, periods)
  const n = b - a + 1

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

  const sums = useMemo(() => periods.map(p => summarize(byPeriod.get(p.start) ?? [], isFixed)), [periods, byPeriod, isFixed])

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
  if (!data || !periods[a] || !periods[b]) {
    return (
      <div className="wrap">
        <div className="empty">
          <span className="spin">↻</span> 読み込み中…
          {status.kind === 'loading' && status.total ? ` ${status.done}/${status.total}` : ''}
        </div>
      </div>
    )
  }

  // ---------- 選択範囲の集計 ----------
  const multi = n > 1
  const cur: Txn[] = []
  for (let i = a; i <= b; i++) cur.push(...rowsOf(i))
  const curSum = addSummary(sums.slice(a, b + 1))
  const totalDays = spanDays(periods, a, b)

  // 比較: 直前の同じ長さの範囲（なければ比較なし）
  const prevSum = a - n >= 0 ? addSummary(sums.slice(a - n, a)) : null
  const prevLabel = !multi ? '前期比' : view.mode === 'year' && view.year !== 'last12' ? '前年比' : '前の同期間比'

  const allSum = addSummary(sums)
  const avgPerPeriod = allSum.exp / periods.length
  const avgPerDay = allSum.exp / spanDays(periods, 0, periods.length - 1)
  // 年表示で12期間に満たない場合は年間見込み
  const annualized = view.mode === 'year' && view.year !== 'last12' && n < 12 ? (curSum.exp / n) * 12 : undefined

  const fvTop = (fixed: boolean) =>
    groupSum(cur.filter(r => isExpense(r) && isFixed(r) === fixed), r => (r.middle && r.middle !== r.large ? `${r.large}/${r.middle}` : r.large))
      .map(([k, v]) => [k, v] as [string, number])

  // 月表示のみ: 累積ペース
  const p = periods[a]
  const others = !multi ? periods.map((q, i) => (i === a ? null : cumulative(q, rowsOf(i)))).filter((x): x is number[] => !!x) : []
  const average = !multi
    ? Array.from({ length: days(p) }, (_, i) => (others.length ? others.reduce((s, x) => s + x[Math.min(i, x.length - 1)], 0) / others.length : null))
    : []

  const goMonth = (i: number) => setView({ mode: 'month', start: i === periods.length - 1 ? null : periods[i].start })

  return (
    <div className="wrap">
      <Header
        periods={periods} view={view} range={[a, b]} onView={setView}
        theme={pref} onTheme={setPref} onReload={reload}
        onSettings={SOURCE === 'dropbox' ? () => setShowSettings(true) : undefined}
        live={SOURCE === 'local' && !!import.meta.hot}
        loading={status.kind === 'loading'}
      />
      <div className="card slider-card">
        <PeriodSlider
          periods={periods} sums={sums} range={[a, b]} kind={view.mode === 'month' ? 'single' : 'range'}
          onChange={(na, nb) => {
            if (view.mode === 'month') goMonth(na)
            else if (na !== a || nb !== b) setView({ mode: 'range', from: periods[na].start, to: periods[nb].start })
          }}
        />
      </div>
      {errorMsg && <div className="toast bad" onClick={reload}>⚠︎ {errorMsg}（タップで再試行・表示は前回のデータ）</div>}

      <div className="grid" key={`${a}-${b}`}>
        <KpiCards
          cur={curSum} prev={prevSum} prevLabel={prevLabel} n={n} totalDays={totalDays}
          avgPerPeriod={avgPerPeriod} avgPerDay={avgPerDay} annualized={annualized}
        />
        <FixedVariableCard
          cur={curSum} n={n} fixedTop={fvTop(true)} variableTop={fvTop(false)}
          onEdit={() => setShowRules(true)} picked={kind}
          onPick={k => { setKind(kind === k ? null : k); document.getElementById('tx')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
        />
        <TrendChart labels={periods.map(periodLabel)} sums={sums} range={[a, b]} colors={colors} onSelect={goMonth} />
        <CategoryDonut cats={byCategory(cur)} catColor={catColor} selected={selectedCat} onSelect={setSelectedCat} colors={colors} />

        {multi && (
          <CategorySummary
            rows={cur} n={n} catColor={catColor} isFixed={isFixed}
            onPick={c => { setSelectedCat(c); document.getElementById('tx')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
          />
        )}
        {!multi && <PaceChart current={cumulative(p, cur)} average={average} colors={colors} />}
        <BarList
          title="支払い手段" span={multi ? 6 : 5}
          items={groupSum(cur, r => r.account).slice(0, 8).map(([name, value, c]) => ({ name, value, extra: `${c}件` }))}
          onClick={name => setQuery(name)}
        />
        {multi && (
          <BarList
            title="よく使うお店・内容 TOP10" span={6}
            items={groupSum(cur, r => merchantName(r.content)).slice(0, 10).map(([name, value, c]) => ({ name, value, extra: `${c}回` }))}
            onClick={name => setQuery(name)}
          />
        )}
        <Heatmap
          periods={periods} cats={allCats} matrix={heat} catColor={catColor} range={[a, b]} dark={resolved === 'dark'}
          onCell={(c, i) => { goMonth(i); setSelectedCat(c) }}
        />
        {!multi && (
          <BarList
            title="よく使うお店・内容 TOP10" span={5}
            items={groupSum(cur, r => merchantName(r.content)).slice(0, 10).map(([name, value, c]) => ({ name, value, extra: `${c}回` }))}
            onClick={name => setQuery(name)}
          />
        )}
        <div id="tx" style={{ display: 'contents' }}>
          <TxTable
            rows={cur.filter(isCounted)} categories={allCats} catColor={catColor} incomeColor={colors.income}
            selected={selectedCat} onSelect={setSelectedCat} query={query} onQuery={setQuery}
            kind={kind} onKind={setKind} isFixed={isFixed} multi={multi} span={multi ? 12 : 7}
          />
        </div>
      </div>

      <footer className="footer">
        {data.dir} — {periods.length} ファイル / {data.rows.length.toLocaleString()} 件 — 読込 {new Date(data.loadedAt).toLocaleString('ja-JP')}
      </footer>

      {showRules && (
        <FixedRulesEditor
          rows={data.rows} overrides={overrides} onClose={() => setShowRules(false)}
          onSave={o => { saveOverrides(o); setOverrides(o); setShowRules(false) }}
        />
      )}
    </div>
  )
}
