import { yen } from '../lib/finance'

interface Props {
  title: string
  span: number
  items: { name: string; value: number; extra?: string }[]
  onClick?: (name: string) => void
}

export function BarList({ title, span, items, onClick }: Props) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className={`card span-${span}`}>
      <div className="card-title">{title}</div>
      <div className="bars">
        {items.length === 0 && <div className="empty">データなし</div>}
        {items.map(it => (
          <div key={it.name} className="bar-row" onClick={() => onClick?.(it.name)} style={{ cursor: onClick ? 'pointer' : undefined }}>
            <div className="bar-top">
              <span className="bar-name" title={it.name}>{it.name}</span>
              <span className="num">{it.extra && <span className="bar-extra">{it.extra}</span>}{yen(it.value)}</span>
            </div>
            <div className="track"><div className="fill" style={{ width: `${(it.value / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
