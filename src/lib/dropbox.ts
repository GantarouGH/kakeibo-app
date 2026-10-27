/**
 * Dropbox API クライアント（ブラウザ専用 / OAuth 2.0 PKCE、サーバー不要）
 * - アプリキーは公開しても安全（PKCE なのでシークレット不要）
 * - アクセストークン・リフレッシュトークンはこの端末の localStorage のみに保存
 */
import { idbGet, idbSet } from './idb'
import type { RawFile } from './csv'

const LS = {
  appKey: 'dbx.appKey',
  folder: 'dbx.folder',
  refresh: 'dbx.refresh',
  access: 'dbx.access',
  expires: 'dbx.expires',
  verifier: 'dbx.verifier',
}

export const DEFAULT_FOLDER = '/Kakeibo'

export const getAppKey = () => import.meta.env.VITE_DROPBOX_APP_KEY || localStorage.getItem(LS.appKey) || ''
export const setAppKey = (k: string) => localStorage.setItem(LS.appKey, k.trim())
export const hasBuiltinAppKey = () => !!import.meta.env.VITE_DROPBOX_APP_KEY
export const getFolder = () => localStorage.getItem(LS.folder) || DEFAULT_FOLDER
export const setFolder = (f: string) => {
  let v = f.trim().replace(/\/+$/, '')
  if (v && !v.startsWith('/')) v = '/' + v
  localStorage.setItem(LS.folder, v)
}
export const isConnected = () => !!localStorage.getItem(LS.refresh)
export const redirectUri = () => location.origin + location.pathname

export function disconnect() {
  const t = localStorage.getItem(LS.access)
  if (t) fetch('https://api.dropboxapi.com/2/auth/token/revoke', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {})
  ;[LS.refresh, LS.access, LS.expires, LS.verifier].forEach(k => localStorage.removeItem(k))
}

// ---------- OAuth (PKCE) ----------
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function startLogin() {
  const appKey = getAppKey()
  if (!appKey) throw new Error('Dropbox アプリキーが未設定です')
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)))
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  localStorage.setItem(LS.verifier, verifier)
  const q = new URLSearchParams({
    client_id: appKey,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri(),
    token_access_type: 'offline',
  })
  location.href = `https://www.dropbox.com/oauth2/authorize?${q}`
}

/** リダイレクトで戻ってきたら code をトークンに交換。処理したら true */
export async function handleRedirect(): Promise<boolean> {
  const url = new URL(location.href)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error_description') || url.searchParams.get('error')
  if (!code && !err) return false
  history.replaceState(null, '', redirectUri())
  if (err) throw new Error(`Dropbox 認証がキャンセルされました: ${err}`)
  const verifier = localStorage.getItem(LS.verifier)
  if (!verifier) throw new Error('認証情報が見つかりません。もう一度接続してください')
  const tok = await tokenRequest({
    code: code!, grant_type: 'authorization_code', code_verifier: verifier, redirect_uri: redirectUri(),
  })
  localStorage.removeItem(LS.verifier)
  if (tok.refresh_token) localStorage.setItem(LS.refresh, tok.refresh_token)
  return true
}

interface TokenRes { access_token: string; expires_in: number; refresh_token?: string }

async function tokenRequest(params: Record<string, string>): Promise<TokenRes> {
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({ ...params, client_id: getAppKey() }),
  })
  if (!res.ok) throw new Error(`トークン取得に失敗しました (${res.status}): ${await res.text()}`)
  const tok: TokenRes = await res.json()
  localStorage.setItem(LS.access, tok.access_token)
  localStorage.setItem(LS.expires, String(Date.now() + (tok.expires_in - 60) * 1000))
  return tok
}

async function accessToken(): Promise<string> {
  const t = localStorage.getItem(LS.access)
  if (t && Date.now() < Number(localStorage.getItem(LS.expires) || 0)) return t
  const refresh = localStorage.getItem(LS.refresh)
  if (!refresh) throw new AuthError('Dropbox に未接続です')
  try {
    return (await tokenRequest({ grant_type: 'refresh_token', refresh_token: refresh })).access_token
  } catch (e) {
    disconnect()
    throw new AuthError(`Dropbox の接続が切れました。再接続してください (${String(e)})`)
  }
}

export class AuthError extends Error {}

// ---------- API ----------
/** Dropbox-API-Arg ヘッダは ASCII のみ許可 → 非 ASCII を \uXXXX にエスケープ */
const headerJson = (o: unknown) => JSON.stringify(o).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))

async function rpc<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) { disconnect(); throw new AuthError('Dropbox の認証が無効になりました。再接続してください') }
  if (!res.ok) {
    const text = await res.text()
    if (text.includes('not_found')) throw new Error(`フォルダ「${getFolder()}」が見つかりません。設定でフォルダを確認してください`)
    throw new Error(`Dropbox API エラー (${res.status}): ${text}`)
  }
  return res.json()
}

interface Entry { '.tag': 'file' | 'folder' | 'deleted'; id: string; name: string; rev: string; path_lower: string }
interface ListRes { entries: Entry[]; cursor: string; has_more: boolean }

export async function listCsv(folder = getFolder()): Promise<Entry[]> {
  let r = await rpc<ListRes>('files/list_folder', { path: folder === '/' ? '' : folder, limit: 2000 })
  const all = [...r.entries]
  while (r.has_more) { r = await rpc<ListRes>('files/list_folder/continue', { cursor: r.cursor }); all.push(...r.entries) }
  return all.filter(e => e['.tag'] === 'file' && e.name.toLowerCase().endsWith('.csv'))
}

async function download(e: Entry): Promise<ArrayBuffer> {
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Dropbox-API-Arg': headerJson({ path: e.id }) },
  })
  if (!res.ok) throw new Error(`${e.name} のダウンロードに失敗しました (${res.status})`)
  return res.arrayBuffer()
}

/** フォルダ内の CSV を取得（rev が同じファイルは端末キャッシュを使い再ダウンロードしない） */
export async function fetchFiles(onProgress?: (done: number, total: number) => void): Promise<RawFile[]> {
  const entries = await listCsv()
  const cache = (await idbGet<Record<string, { rev: string; bytes: ArrayBuffer }>>('dbx.files')) ?? {}
  const next: typeof cache = {}
  let done = 0
  const out = await Promise.all(entries.map(async e => {
    const hit = cache[e.id]
    const bytes = hit && hit.rev === e.rev ? hit.bytes : await download(e)
    next[e.id] = { rev: e.rev, bytes }
    onProgress?.(++done, entries.length)
    return { name: e.name, bytes }
  }))
  await idbSet('dbx.files', next)
  return out
}
