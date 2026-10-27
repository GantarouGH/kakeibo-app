import { useState } from 'react'
import * as dbx from '../lib/dropbox'

interface Props {
  error?: string
  onClose?: () => void
  onDisconnect?: () => void
  onSaved?: () => void
}

/** Dropbox 接続 / 設定画面 */
export function DropboxSetup({ error, onClose, onDisconnect, onSaved }: Props) {
  const [appKey, setAppKey] = useState(dbx.getAppKey())
  const [folder, setFolder] = useState(dbx.getFolder())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(error ?? '')
  const connected = dbx.isConnected()

  const connect = async () => {
    setBusy(true); setMsg('')
    try {
      if (!dbx.hasBuiltinAppKey()) dbx.setAppKey(appKey)
      dbx.setFolder(folder)
      await dbx.startLogin()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e)); setBusy(false)
    }
  }
  const save = () => { dbx.setFolder(folder); onSaved?.() }

  return (
    <div className="wrap">
      <div className="card notice">
        <div className="logo" style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: 24, borderRadius: 16 }}>¥</div>
        <h2>{connected ? 'Dropbox 設定' : 'Dropbox に接続'}</h2>
        <p>マネーフォワードの CSV を保存している Dropbox フォルダから<br />直接読み込みます。データはこの端末内でのみ処理されます。</p>

        <div className="form">
          {!dbx.hasBuiltinAppKey() && (
            <label>
              <span>App key</span>
              <input className="field" value={appKey} onChange={e => setAppKey(e.target.value)} placeholder="Dropbox App Console の App key" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </label>
          )}
          <label>
            <span>フォルダ</span>
            <input className="field" value={folder} onChange={e => setFolder(e.target.value)} placeholder="/Kakeibo" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </label>
        </div>

        {msg && <p className="bad" style={{ fontSize: 12 }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          {connected ? (
            <>
              <button className="btn primary" onClick={save}>保存して再読み込み</button>
              <button className="btn" onClick={onDisconnect}>接続解除</button>
            </>
          ) : (
            <button className="btn primary" disabled={busy || (!dbx.hasBuiltinAppKey() && !appKey.trim())} onClick={connect}>
              {busy ? '移動中…' : 'Dropbox で認証'}
            </button>
          )}
          {onClose && <button className="btn" onClick={onClose}>閉じる</button>}
        </div>
        {!connected && (
          <p style={{ fontSize: 11, marginTop: 18 }}>
            リダイレクト URI: <code>{dbx.redirectUri()}</code>
          </p>
        )}
      </div>
    </div>
  )
}
