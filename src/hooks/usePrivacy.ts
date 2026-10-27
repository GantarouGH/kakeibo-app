import { useSyncExternalStore } from 'react'

/** 金額非表示モード（端末ごとに保存・全コンポーネントで共有） */
const KEY = 'privacy'
const listeners = new Set<() => void>()

const get = () => localStorage.getItem(KEY) === '1'

export function setPrivacy(on: boolean) {
  localStorage.setItem(KEY, on ? '1' : '0')
  listeners.forEach(l => l())
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export const usePrivacy = () => useSyncExternalStore(subscribe, get)

/** 桁数が推測できないよう固定長 */
export const MASK = '¥ ••••••'
