# TaskAI GPTリンク版

AI API機能を削除し、「ChatGPTに質問する」ボタン方式に変更した版です。

## 使い方
1. このZIPを展開します。
2. `index.html` をChromeで開きます。
3. タスクを追加します。
4. タスク詳細の「ChatGPTに質問する」を押します。

## 特徴
- OpenAI APIキー不要
- Claude API呼び出し削除済み
- ChatGPTにタスク内容入りの質問を渡して開く
- 「質問文だけコピーする」ボタン付き

## ファイル
- index.html: アプリ本体
- manifest.json: PWA設定
- sw.js: オフライン用Service Worker
