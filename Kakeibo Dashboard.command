#!/bin/zsh
# ダブルクリックでダッシュボードを起動（ターミナルを閉じると終了）
eval "$(/opt/homebrew/bin/brew shellenv)"
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npm run dev
