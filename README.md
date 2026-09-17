# デジタル教科書ランチャー

TT-sensei `learning-portal` 内の、デジタル教科書公式ログイン先を教科ごとにまとめて開くためのランチャーです。

## 役割

このページはデジタル教科書本体を提供するものではありません。各社・各サービスの公式ログインページへ移動する入口として動作します。

- ID・パスワードを入力・保存しない
- 教材本文・教材画像・デジタル教科書データをコピーしない
- 公式サイトをiframe等で埋め込まない
- 登録したURLへ新しいタブで移動する

## 現在の公式ビューア入口

令和8年度の文部科学省「学習者用デジタル教科書」案内を基準に、次の6サービスを登録候補として用意しています。

| ビューア | 公式ユーザーログイン |
| --- | --- |
| Lentrance Reader | https://www.lentrance.com/school/login |
| つばさブック | https://tsubasabook.jp/ |
| まなビューア | https://manaviewer.jp/ |
| みらいスクール | https://mirai-pf.jp/user/login.html |
| 超教科書 | https://p01.cloud.cho-textbook.jp/ |
| エスビューア | https://sviewer.jp/ |

公式URLは、必要になった時点で `app.js` の `PLATFORMS` を更新できます。通常利用では、先生モードの「教科を登録」から個別に登録したURLを使います。

## 使い方

通常画面では登録した教科カードだけが表示されます。カードの「公式サイトをひらく」を押すと、登録された公式ログイン先を別タブで開きます。

先生モードでは、教科・教科書会社・ビューア・表示名・お気に入りを設定できます。学校で利用するビューアが6サービス以外の場合は「その他のログイン先」でHTTPS URLを指定できます。

お気に入りはホーム上部に優先表示します。最近ひらいた4件も端末内に記録します。

## 保存

保存namespaceは `digital-textbook-launcher`、キーは `state-v1` です。

通常は `edu-components` の `StorageManager` を使います。共通基盤へ接続できない場合だけ、同じnamespace形式の軽量フォールバックを使います。

保存されるのは、教科登録・表示順・お気に入り・最近の利用履歴のみです。アカウント情報は保存しません。

設定は先生モードからJSONへ書き出せるため、学校端末を変更するときに復元できます。

## PWA

`manifest.webmanifest` と `sw.js` を用意しているため、対応ブラウザではホーム画面へ追加してランチャーとして使えます。キャッシュ対象はランチャー本体だけで、外部のデジタル教科書サイトはキャッシュしません。

## edu-kitとの接続

- `edu-effects`：基本UI、カード、状態表現、アクセシビリティの共通基盤
- `edu-components`：`StorageManager` による保存
- `edu-assets`：ランチャーのホームアイコンとして軽量WebPを参照
- `navi-character-`：案内役として学習用WebPを控えめに表示

このページでは、学習用問題・報酬・効果音は目的がないため使用していません。

## 関連

- TT-sensei learning portal: https://tt-sensei.github.io/learning-portal/
- edu-kit: https://tt-sensei.github.io/edu-kit/
- 文部科学省・令和8年度 学習者用デジタル教科書: https://www.mext.go.jp/a_menu/shotou/kyoukasho/digital/data_00008.html
