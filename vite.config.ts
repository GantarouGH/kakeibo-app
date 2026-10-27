import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { kakeiboPlugin } from './server/kakeibo.ts'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages (https://<user>.github.io/<repo>/) でも動くよう相対パスで出力
  base: './',
  plugins: [react(), kakeiboPlugin()],
  server: { port: 5180, open: true },
  preview: { port: 5181 },
})
