# BoPoMo

台湾華語 音声単語帳（個人用）。詳細仕様は `docs/superpowers/specs/2026-08-20-ty-bopomo-design.md` を参照。

## 初回公開手順（1回だけ）

1. https://github.com/signup でアカウントを作成（メールアドレスとパスワードのみ、クレジットカード不要）
2. 新しい**公開**リポジトリ `ty_bopomo` を作成（PWAの配信に GitHub Pages を使うため公開リポジトリが必要）
3. このディレクトリの内容をそのリポジトリに push する
4. リポジトリの Settings > Pages で、Source を「GitHub Actions」に設定する
5. `main` に push するたびに自動でビルド・デプロイされる（`.github/workflows/deploy.yml`）
6. 公開URL（`https://<ユーザー名>.github.io/ty_bopomo/`）を iPhone・Android それぞれのブラウザで開き、ホーム画面に追加する
