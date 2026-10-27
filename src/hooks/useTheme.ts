import { useCallback, useSyncExternalStore, useState } from 'react'

export type ThemePref = 'auto' | 'light' | 'dark'

const mq = matchMedia('(prefers-color-scheme: dark)')
const subscribe = (cb: () => void) => {
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function apply(pref: ThemePref) {
  localStorage.setItem('theme', pref)
  const el = document.documentElement
  if (pref === 'auto') delete el.dataset.theme
  else el.dataset.theme = pref
}

/** 'auto' はシステム設定(prefers-color-scheme)に連動 */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    const p = (localStorage.getItem('theme') as ThemePref) || 'auto'
    apply(p)
    return p
  })
  const systemDark = useSyncExternalStore(subscribe, () => mq.matches)

  // DOM を先に更新してから state を変える → 次の render で CSS 変数が新テーマになっている
  const setPref = useCallback((p: ThemePref) => { apply(p); setPrefState(p) }, [])

  const resolved: 'light' | 'dark' = pref === 'auto' ? (systemDark ? 'dark' : 'light') : pref
  return { pref, setPref, resolved }
}
