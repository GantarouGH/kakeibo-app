import { MASK, usePrivacy } from '../hooks/usePrivacy'
import { yen } from '../lib/finance'

/** 金額非表示モードの対象になる金額表示 */
export function Money({ v }: { v: number }) {
  const hidden = usePrivacy()
  return hidden ? <span className="masked" aria-label="非表示の金額">{MASK}</span> : <>{yen(v)}</>
}
