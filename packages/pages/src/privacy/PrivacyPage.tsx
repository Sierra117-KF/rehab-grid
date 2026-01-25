import {
  FEEDBACK_FORM_URL,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
} from "@rehab-grid/core";
import { ExternalLink } from "@rehab-grid/ui";

/**
 * プライバシーポリシーページコンポーネント
 */
export function PrivacyPage() {
  return (
    <article className="animate-fade-up">
      {/* ページヘッダー */}
      <header className="mb-12 md:mb-16">
        <p className="text-sm font-mono text-primary/70 uppercase tracking-wider mb-4">
          Privacy Policy
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
          プライバシー
          <span className="text-primary">ポリシー</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          リハぐり（以下「本サービス」）における個人情報の取り扱いについて説明します。
        </p>
      </header>

      {/* コンテンツ */}
      <div className="space-y-12">
        {/* セクション01: 基本方針 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">01</span>
            基本方針
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは、
              <strong className="text-foreground">
                完全にクライアントサイド（お使いのブラウザ内）で動作
              </strong>
              するアプリケーションです。
            </p>
            <p>
              入力されたデータ（画像、テキスト、設定情報など）は、
              <strong className="text-foreground">
                外部サーバーに一切送信されません
              </strong>
              。すべての処理はお使いの端末内で完結します。
            </p>
          </div>
        </section>

        {/* セクション02: 運営者情報 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">02</span>
            運営者情報
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは、GitHub上で
              <strong className="text-foreground">
                オープンソースソフトウェア（OSS）
              </strong>
              として公開・運営されています。
            </p>
            <p>
              ソースコードは以下のリポジトリで公開されています:
              <br />
              <ExternalLink href={GITHUB_REPO_URL}>
                {GITHUB_REPO_URL}
              </ExternalLink>
            </p>
          </div>
        </section>

        {/* セクション03: お問い合わせ窓口 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">03</span>
            お問い合わせ窓口
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              プライバシーに関するご質問・ご意見は、以下の窓口までお寄せください。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-foreground">一般のお問い合わせ:</strong>{" "}
                <ExternalLink href={FEEDBACK_FORM_URL}>
                  ご意見箱（Googleフォーム）
                </ExternalLink>
              </li>
              <li>
                <strong className="text-foreground">
                  開発者向け・技術的なお問い合わせ:
                </strong>{" "}
                <ExternalLink href={GITHUB_ISSUES_URL}>
                  GitHub Issues
                </ExternalLink>
              </li>
            </ul>
          </div>
        </section>

        {/* セクション04: 個人情報の収集について */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">04</span>
            個人情報の収集について
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは、
              <strong className="text-foreground">
                ユーザーの個人情報を収集・取得しません
              </strong>
              。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>会員登録・ログイン機能はありません</li>
              <li>
                氏名、メールアドレス等の入力を求めることはありません
              </li>
              <li>
                ユーザーが入力したデータ（画像・テキスト等）は、お使いのブラウザ内にのみ保存され、運営者を含む第三者はアクセスできません
              </li>
            </ul>
          </div>
        </section>

        {/* セクション05: ガイドライン上の位置づけ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">05</span>
            ガイドライン上の位置づけ
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本アプリは
              <strong className="text-foreground">
                汎用的な資料作成ツール
              </strong>
              として設計されており、医療情報を取り扱うクラウドサービスではありません。
            </p>
            <p>
              Microsoft
              WordやExcel等と同様、データ管理は利用者の責任となります。
            </p>
          </div>
        </section>

        {/* セクション06: データの保存場所 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">06</span>
            データの保存場所
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスで作成・編集したデータは、ブラウザの
              <strong className="text-foreground">IndexedDB</strong>
              に保存されます。これはブラウザが提供するローカルストレージ機能であり、データはお使いの端末内にのみ存在します。
            </p>
            <div className="bg-card/50 border border-white/10 rounded-lg p-4 mt-4">
              <p className="text-sm">
                <span className="text-primary font-semibold">
                  重要なお知らせ:
                </span>
                <br />
                ブラウザの履歴削除、キャッシュクリア、またはシークレットモードの終了により、保存されたデータは
                <strong className="text-foreground">完全に削除</strong>
                されます。重要なデータは定期的にファイルとしてエクスポート（バックアップ）することを強く推奨します。
              </p>
            </div>
          </div>
        </section>

        {/* セクション07: 外部サービスとの通信・第三者提供 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">07</span>
            外部サービスとの通信・第三者提供
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは以下の理由により、外部サービスとの通信を行いません:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                アクセス解析ツール（Google Analytics等）は使用していません
              </li>
              <li>広告配信サービスは使用していません</li>
              <li>外部APIへのデータ送信は行いません</li>
              <li>
                Content Security Policy (CSP)
                により、技術的にも外部通信がブロックされています
              </li>
            </ul>
            <p className="mt-4">
              <strong className="text-foreground">
                運営者を含む第三者へのデータ提供は一切行いません。
              </strong>
            </p>
          </div>
        </section>

        {/* セクション08: Cookie */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">08</span>
            Cookieの使用について
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは
              <strong className="text-foreground">Cookieを使用しません</strong>
              。ユーザーの追跡やセッション管理のためのCookieは一切設定されません。
            </p>
          </div>
        </section>

        {/* セクション09: セキュリティ推奨事項 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">09</span>
            セキュリティ推奨事項
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスはCSP（コンテンツセキュリティポリシー）を設定し、外部通信をブロックしていますが、
              <strong className="text-foreground">
                予期せぬ状況において完全な情報保護を保証するものではありません
              </strong>
              。お使いの端末やブラウザがマルウェア等に侵害されている場合、本サービスで入力した情報を保護することはできません。
            </p>
            <p>より安全にご利用いただくため、以下の環境での使用を推奨します:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-foreground">ゲストモード</strong>または
                <strong className="text-foreground">シークレットモード</strong>:
                ブラウザ拡張機能がデフォルトで無効になり、悪意のある拡張機能によるデータ読み取りリスクを低減できます
              </li>
              <li>
                最新バージョンのブラウザ:
                セキュリティアップデートが適用された状態でご利用ください
              </li>
            </ul>
            <div className="bg-card/50 border border-white/10 rounded-lg p-4 mt-4">
              <p className="text-sm">
                <span className="text-primary font-semibold">注意:</span>
                <br />
                シークレットモードではブラウザ終了時にIndexedDBのデータが消去されます。必ずZIP形式でバックアップを取ってからブラウザを閉じてください。
              </p>
            </div>
          </div>
        </section>

        {/* セクション10: 開示・訂正・削除請求について */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">10</span>
            開示・訂正・削除請求について
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは個人情報を収集・保持していないため、
              <strong className="text-foreground">
                個人情報保護法に基づく開示・訂正・削除請求への対応は行っておりません
              </strong>
              。
            </p>
            <p>
              なお、お使いのブラウザに保存されたデータは、ユーザー自身でいつでも削除することができます。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                ブラウザの設定からサイトデータを削除
              </li>
              <li>
                ブラウザの履歴削除機能を使用
              </li>
            </ul>
          </div>
        </section>

        {/* セクション11: 要配慮個人情報の入力禁止 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">11</span>
            要配慮個人情報の入力禁止
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              患者様の顔写真、氏名、病歴等の
              <strong className="text-foreground">
                要配慮個人情報の入力は禁止されています
              </strong>
              。
            </p>
            <p>
              サンプル画像や匿名化された情報のみご使用ください。禁止事項に違反して発生した情報漏洩について、提供者は責任を負いません。
            </p>
          </div>
        </section>

        {/* セクション12: 改定 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">12</span>
            プライバシーポリシーの改定
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本ポリシーは、必要に応じて改定されることがあります。重要な変更がある場合は、本ページにて告知します。
            </p>
          </div>
        </section>
      </div>

      {/* フッター */}
      <footer className="mt-16 pt-8 border-t border-white/5">
        <p className="text-sm text-muted-foreground">
          最終更新日: 2026年1月25日
        </p>
      </footer>
    </article>
  );
}
