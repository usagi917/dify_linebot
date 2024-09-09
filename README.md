# LINEボットとDify APIを連携した会話ログシステム

## 概要
このプロジェクトは、LINE Messaging APIを利用してユーザーと会話し、その履歴をGoogleスプレッドシートに保存するLINEボットの実装です。会話の応答はDify APIを利用して生成されます。

### 主な機能
- LINEボットとの会話を処理
- ユーザーとの会話履歴をGoogleスプレッドシートに保存
- Dify APIを使用して応答を生成
- 会話のログを取得し、10件まで保持
- LINEボットのプロフィール情報を取得し、スプレッドシートに記録

## 必要な環境
- Google Apps Script
- LINE Messaging API
- Dify API
- Googleスプレッドシート

## セットアップ

### 1. スクリプトプロパティの設定
Google Apps Scriptのスクリプトプロパティに以下の値を設定してください。
- `DIFY_API_KEY`：Dify APIのアクセスキー
- `LINE_ACCESS_TOKEN`：LINE Messaging APIのチャネルアクセストークン
- `SPREADSHEET_ID`：GoogleスプレッドシートのID

### 2. LINE Messaging APIの設定
- LINE Developerコンソールでチャネルを作成し、アクセストークンを取得してください。
- Webhook URLにGoogle Apps ScriptのデプロイURLを設定してください。

### 3. Googleスプレッドシートの設定
- スプレッドシートに「会話ログ」という名前のシートを作成してください。
- このシートには、`タイムスタンプ`, `ユーザーID`, `ユーザー名`, `役割`, `メッセージ` の列が必要です。

## コードの概要

### `doPost`関数
LINEからのPOSTリクエストを受け取り、イベントデータを処理します。各イベントは`handleEvent`関数で処理されます。

### `handleEvent`関数
ユーザーのメッセージを取得し、`getReplyMessage`関数を使用してDify APIに基づいた応答を生成します。また、会話履歴とログをスプレッドシートに記録します。

### `getReplyMessage`関数
Dify APIに対して、ユーザーからのメッセージと会話履歴を基に応答を生成します。

### `recordConversation`関数
会話履歴を更新し、スプレッドシートにログを記録します。

### `replyToUser`関数
LINE Messaging APIを使用して、生成された応答をユーザーに送信します。

### `getUserProfile`関数
LINEユーザーのプロフィール情報（表示名）を取得します。

## 使用方法
1. LINEでボットにメッセージを送信すると、ボットはDify APIを通じて応答を生成します。
2. 会話履歴と応答はGoogleスプレッドシートに記録され、過去10件の会話履歴を保持します。

## 注意点
- スクリプトプロパティやAPIキーのセキュリティに注意し、公開しないようにしてください。
- Dify APIを利用するためには、有効なAPIキーと適切なエンドポイントを設定する必要があります。
