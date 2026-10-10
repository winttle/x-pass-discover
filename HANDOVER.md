# 引き継ぎ — X-PASS Discover（新セッション用）

> このファイルの中身を、そのまま新しいセッションの最初のメッセージに貼ってください。
> 新セッションは **`x-pass-gcsc/x-pass-discover` をソース**にして開いてください。
>
> **このファイルは一時的なものです。** §0 の同期が終わり、内容を読み終えたら
> `git rm HANDOVER.md` で消してください。リポジトリの恒久的なドキュメントは
> `README.md` だけです。

---

## 0. まず最初にやること：旧リポジトリから最新を取り込む

前のセッションは `winttle/x-pass-discover` に紐づいていて、同名リポジトリは
同一セッションに同居できない（チェックアウト先が衝突する）ため、新リポジトリへ
直接プッシュできませんでした。**最後の2コミットだけ winttle 側に残っています。**

両ブランチとも早送りで入ります。マージコミットは不要です。

```bash
git fetch https://github.com/winttle/x-pass-discover.git \
  'refs/heads/*:refs/remotes/winttle/*'

git checkout -B claude/intelligent-planck-39vf7c origin/claude/intelligent-planck-39vf7c
git merge --ff-only winttle/claude/intelligent-planck-39vf7c   # 9b0c9a9 → 0166824
git push -u origin claude/intelligent-planck-39vf7c

git checkout -B main origin/main
git merge --ff-only winttle/main                               # bdf6de4 → 0f6f7a0
git push -u origin main
```

> `checkout -B <branch> origin/<branch>` と、明示的に origin を書いているのは
> 理由があります。winttle を fetch した直後は `main` という名前の追跡ブランチが
> origin と winttle の2つ存在するため、`git checkout main` は
> 「複数のリモートに一致」で**失敗します**。実際にクローンして確認済みです。

取り込む内容はこの2件です。

| コミット | 内容 |
|---|---|
| `9b0c9a9` / `bdf6de4` | BITE本社の写真をヒーローとサインインへ。Product のカバー差し替え。「Decision revision」バンド新設。タブアイコン追加 |
| `0166824` / `0f6f7a0` | サインイン画面に「サインアップ専用画面は無い」と明記。README の該当2箇所も更新 |

> ⚠️ **同期が終わるまで `winttle/x-pass-discover` を削除しないでください。**
> 上の2コミットはそこにしか存在しません。
>
> もし winttle から fetch できなかった場合は、その場で止めて報告してください。
> 差分は README と `src/features/auth/login-form.tsx` の2ファイルだけなので、
> 手で貼り直すこともできます。

同期後は `git log --oneline -3` で両ブランチの先頭が上表どおりか確認し、
`npm install && npm run verify` が通ることを確かめてから次の作業に入ってください。

---

## 1. このプロダクトは何か

**X-PASS Discover** — 学生が架空のF&B企業 **BITE** に「出社」して、2Dオフィスを
歩き、5部門から3つ選び、実務をこなし、AI社員と話し、新情報が出たら判断を
見直し、最後に **LIKE（好き）と SKILL FIT（向いている）を分けた**
キャリアレポートを受け取る、という Web アプリです。

合言葉は **"Step into the company. Do the work. Discover your fit."**
体験のゴールは **「今日、BITEに出社した」**。

**詳細は必ず `README.md` を読んでください。** 10章構成で、アーキテクチャ、
DBスキーマ、環境変数、起動手順、モックモードの挙動、本番相当と暫定の切り分け、
残TODO、次フェーズまで全部書いてあります。以下はそこに書けない
「このセッションで決めたこと・踏んだ罠」だけです。

---

## 2. 絶対に崩してはいけない設計（ブリーフの非交渉項目）

- **Phaser は体験レイヤー、React/Next は業務レイヤー。**
  移動・当たり判定・NPC配置・近接プロンプトだけが Phaser。
  タスク、資料、フォーム、AIチャット、提出、進捗、シナリオ状態、レポートは React。
  **業務状態を Phaser の中に持たせない。**
- **LIKE と SKILL FIT は別概念・別データ。** 1つの「適性スコア」に合算しない。
- **隠しAIペルソナ情報をクライアントに送らない。** system prompt、開示ルール、
  隠し事実はブラウザに渡るペイロード・配信コード・JSONのどこにも出さない。
  `server-only` パッケージがビルド時の境界になっています。
- **行動ログは証拠であってポイントではない。** 滞在時間・質問数・資料を開いた数・
  AIメッセージ数が、そのままスキルスコアになる実装を入れない。
- **`projects.product_id` は NULL 許容のまま。** Product Management と Strategy は
  「製品がない」ところから始まるため。NOT NULL を付けない。
- **シナリオ内容はDB/設定駆動。** エンジンは部門を知らない。新部門の追加は
  定義データを足すだけで済むはず。そうならなければ、それがバグ。
- 技術選定は固定：Next.js + TypeScript + App Router / Tailwind / Vercel互換 /
  **Neon PostgreSQL** / **Drizzle ORM** / OpenAI はサーバ側の抽象の裏 / Phaser.js。
  **Supabase は使わない。**
- 旧X-PASSのメンタリングモデルに戻さない。適性診断・性格診断・キャリアクイズ・
  メンター紹介・3Dメタバース、のいずれでもない。
- **分からない業務要件を創作しない。** 参照データに値があるならそれを使い、
  無いなら TODO か設定のプレースホルダで残す。

---

## 3. いまの状態

**動く範囲**：プラットフォーム基盤 + Sales シナリオ（BITE Protein Drink ×
QuickMart）を全10ステップ通しで。他4部門は部門として存在しますが、
シナリオ内容は未執筆です（カードに "Coming soon" と出ます）。

**検証資産**（すべてグリーン）：

| コマンド | 内容 |
|---|---|
| `npm run verify` | typecheck + lint + オフィスマップ + 開示マッチャ + 埋め込みPostgres |
| `npm run db:verify` | PGlite で実マイグレーション適用 → シード冪等性 → 実サービス駆動 |
| `npm run verify:disclosure` | 自然な19通りの聞き方で正しい事実が開示されるか／曖昧な質問では開示されないか |
| `npm run verify:office` | 実際の当たり判定グリッドを塗りつぶして全タイル到達可能を確認 |

**Playwright のE2Eはリポジトリに入っていません**（スクラッチ領域で実行していた
ため、コンテナ破棄で消えます）。README の残TODOにも
「テストランナー未配線」と書いてあります。新セッションで本格的に触るなら、
まずここを整備するのが費用対効果が高いです。

**DATABASE_URL なしでも完全に動きます**：開発時はファイル保存、本番ビルド時は
メモリ保存（「Demo mode — nothing is saved」と画面に出ます）。

---

## 4. 踏んだ罠（再発しやすいもの）

- **`server-only` は素のNodeで即throwする。** そのため seed / verify 系スクリプトは
  `tsx --conditions=react-server` で起動しています。`package.json` のスクリプトを
  勝手に短くしないでください。
- **Phaser の ESM にはデフォルトエクスポートが無い。** `import * as Phaser from 'phaser'`
  が必須。シーン側もキャンバス側も。
- **jsonb はキー順を正規化する。** 素の `JSON.stringify` 比較だと保存のたびに
  「変更あり」と誤判定し、履歴とバージョンが水増しされます。比較は必ず
  `src/lib/stable-json.ts` の `deepEquals` を使ってください。
- **フレームペーシングは調整済み。** `fps: { target: 60, min: 30, smoothStep: true }` と
  `arcade: { fixedStep: false }` の組み合わせです。`smoothStep: false` にすると
  異常デルタ保護が外れて**壁をすり抜けます**。触らないでください。
- **画像は `scripts/build-image-assets.sh` から生成。** 手で `public/img/` を
  編集しないこと。旧素材の一部に旧社名 **MOGU FOODS** が写り込んでおり、
  どれを使わない／どこを切るかが全部そこに記録されています。

---

## 5. 未完了のこと・申し送り

1. **Vercelへのデプロイが未実行。** 前セッションのコンテナに認証情報もCLIも
   無かったためです。手順は README のデプロイ節にあります。必須の環境変数は
   `AUTH_SECRET`、強く推奨が `DATABASE_URL`（無いとデモモード）、任意で
   `OPENAI_API_KEY` と `X_PASS_ADMIN_EMAILS`。初回だけ `db:migrate` + `db:seed`。
   **Vercel の Production Branch は `main` を指定してください**（GitHub側の
   デフォルトブランチは `claude/intelligent-planck-39vf7c` のままです）。
2. **表示名が更新されない小さな不具合。** 既存メールで再サインインすると、
   フォームに入れた表示名が**無視され**最初の名前が残ります。
   「名前はアカウントに属する」のか「毎回更新してよい」のかは仕様判断なので、
   勝手に変えずに残してあります。ユーザーの指示待ちです。
3. **`aaa` という中身 `aaa` だけのファイル**が dev ブランチにあります
   （コミット `77311d2`、作者 x-pass-gcsc）。ユーザー本人のものなので
   消さずに保全しました。`main` には入れていません。扱いはユーザーに確認を。
4. **PRは存在しません。** `claude/intelligent-planck-39vf7c` がリポジトリの
   デフォルトブランチそのもののため、PRの向け先がありません。
5. **リポジトリは public です。** 未発表プロダクトの仕様と実装が公開状態なので、
   意図したものか一度確認してください。
6. 未使用のまま残している素材が6点あります（4点は MOGU 表記、2点は差し替え済み）。
   BITE版を再生成すれば、ビルドスクリプトのパスを変えるだけで使えます。

---

## 6. 進め方の希望（ユーザーからの指示として継続中）

- 作業ブランチは **`claude/intelligent-planck-39vf7c`**。
  明示的な許可なく他ブランチへプッシュしない（`main` へは許可済み）。
- **最高のエフォートで。** 手を抜かず、使い捨てのプロトタイプを作らない。
  いまのコードは Marketing / PM / Strategy / HR をコアエンジンの書き換え無しで
  載せられる前提で書かれています。その前提を壊さないこと。
- 実装後は**実際に動かして確認**する。テストが通っただけで完了としない。
- やり取りは日本語で。
