/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dropbox App Console の App key（公開OK / PKCE） */
  readonly VITE_DROPBOX_APP_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
