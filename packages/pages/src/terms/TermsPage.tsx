import {
  FEEDBACK_FORM_URL,
  GITHUB_ISSUES_URL,
  GITHUB_LICENSE_URL,
} from "@rehab-grid/core";
import { ExternalLink } from "@rehab-grid/ui";

/**
 * 利用規約ページコンポーネント
 */
export function TermsPage() {
  return (
    <article className="animate-fade-up">
      {/* ページヘッダー */}
      <header className="mb-12 md:mb-16">
        <p className="text-sm font-mono text-primary/70 uppercase tracking-wider mb-4">
          Terms of Service
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
          利用<span className="text-primary">規約</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          リハぐり（以下「本サービス」）をご利用いただく前に、以下の利用規約をお読みください。
        </p>
      </header>

      {/* ガイドライン適合性に関する重要事項 */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-12">
        <h2 className="text-lg font-bold text-orange-500 mb-3">
          ⚠ 重要：本サービスの位置づけ
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          本アプリは「資料作成ツール（エディタ）」であり、「クラウドサービス（SaaS）」ではありません。
          <br />
          経済産業省・総務省「医療情報を取り扱う情報システム・サービスの提供事業者における安全管理ガイドライン」の対象事業者には該当しません。
          <br />
          作成データの管理責任は全て利用者および所属機関に帰属します。
        </p>
      </div>

      {/* コンテンツ */}
      <div className="space-y-12">
        {/* セクション01: 定義 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">01</span>
            定義
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>本規約において、以下の用語は次の意味で使用します:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-foreground">「本サービス」</strong>:
                本ウェブサイトで提供する「リハぐり」およびその関連機能
              </li>
              <li>
                <strong className="text-foreground">「提供者」</strong>:
                本サービスを開発・運営する者
              </li>
              <li>
                <strong className="text-foreground">「利用者」</strong>:
                本サービスを利用する全ての方
              </li>
              <li>
                <strong className="text-foreground">「コンテンツ」</strong>:
                利用者が本サービスを使用して作成した指導箋、入力したテキスト、アップロードした画像等
              </li>
            </ul>
          </div>
        </section>

        {/* セクション02: 利用規約への同意 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">02</span>
            利用規約への同意
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスを利用することにより、利用者は本規約のすべての条項に同意したものとみなされます。
            </p>
            <p>
              本規約に同意いただけない場合は、本サービスのご利用をお控えください。
            </p>
            <p>
              未成年の方が本サービスを利用する場合は、保護者の同意を得た上でご利用ください。
            </p>
          </div>
        </section>

        {/* セクション03: サービスの概要 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">03</span>
            サービスの概要
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは、リハビリテーション専門職（PT/OT/ST）向けの
              <strong className="text-foreground">
                自主トレーニング指導箋作成支援ツール
              </strong>
              です。
            </p>
            <p>
              完全にクライアントサイド（ブラウザ内）で動作し、会員登録不要で無料でご利用いただけます。
            </p>
            <p>
              本サービスは
              <strong className="text-foreground">
                オープンソースソフトウェア（OSS）
              </strong>
              として公開されており、AGPL-3.0ライセンス（GNU Affero General
              Public License v3.0）の下で提供されています。
            </p>
          </div>
        </section>

        {/* セクション04: 利用条件 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">04</span>
            利用条件
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスをご利用いただくにあたり、以下の条件に同意いただくものとします:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>本規約の内容を理解し、遵守すること</li>
              <li>
                データの保存・バックアップは利用者自身の責任において行うこと
              </li>
              <li>
                作成した指導箋の内容については、利用者自身が責任を持つこと
              </li>
              <li>
                <strong className="text-foreground">
                  要配慮個人情報（病歴、診療記録等）および個人を特定できる写真の入力は禁止
                </strong>
              </li>
            </ul>
          </div>
        </section>

        {/* セクション05: 免責事項 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">05</span>
            免責事項
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは「現状のまま」提供されます。提供者は、
              <strong className="text-foreground">
                提供者の故意または重大な過失がある場合を除き
              </strong>
              、以下の事項について責任を負いません:
            </p>

            <div className="bg-card/50 border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">データの消失</h3>
              <p className="text-sm">
                本サービスのデータはブラウザのIndexedDBに保存されます。以下の操作によりデータが消失する可能性があります:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                <li>ブラウザの履歴・キャッシュの削除</li>
                <li>シークレットモード（プライベートブラウズ）の終了</li>
                <li>ブラウザのアップデートや再インストール</li>
                <li>端末の初期化</li>
              </ul>
              <p className="text-sm text-primary">
                重要なデータは必ずファイルとしてエクスポートしてください。
              </p>
            </div>

            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-foreground">
                  サービスの中断・終了:
                </strong>{" "}
                予告なくサービスを中断・終了する場合があります
              </li>
              <li>
                <strong className="text-foreground">内容の正確性:</strong>{" "}
                本サービスを使用して作成された指導箋の医学的正確性については保証しません
              </li>
              <li>
                <strong className="text-foreground">利用に起因する損害:</strong>{" "}
                本サービスの利用または利用不能により生じた損害
              </li>
              <li>
                <strong className="text-foreground">第三者との紛争:</strong>{" "}
                本サービスを通じて作成した資料に関する第三者との紛争
              </li>
              <li>
                <strong className="text-foreground">
                  端末・ブラウザの安全性:
                </strong>{" "}
                お使いの端末やブラウザがマルウェア等に侵害されている場合、本サービスで入力した情報を保護することはできません
              </li>
              <li>
                <strong className="text-foreground">情報の漏洩:</strong>{" "}
                予期せぬ状況において完全な情報保護を保証するものではなく、万が一の情報漏洩について責任を負いません
              </li>
            </ul>
          </div>
        </section>

        {/* セクション06: 損害賠償 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">06</span>
            損害賠償
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスは無料で提供されており、利用者が本サービスの利用に関連して提供者に対して損害賠償を請求できる場合においても、
              <strong className="text-foreground">
                提供者の故意または重大な過失による場合を除き
              </strong>
              、提供者は賠償責任を負わないものとします。
            </p>
            <p>
              利用者が本規約に違反して提供者に損害を与えた場合、利用者はその損害を賠償する責任を負います。
            </p>
          </div>
        </section>

        {/* セクション07: 禁止事項 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">07</span>
            禁止事項
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>本サービスの利用にあたり、以下の行為を禁止します:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>本サービスを利用した違法行為</li>
              <li>他者の権利を侵害する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>
                患者様の顔写真、名札、身体的特徴が写った画像のアップロード
              </li>
              <li>
                自由入力欄への氏名、病歴、診療記録等の要配慮個人情報の入力
              </li>
            </ul>
            <p className="mt-4">
              利用者が禁止事項に違反した場合、提供者は当該利用者に対し、サービスの利用停止その他必要な措置を講じることができるものとします。
            </p>
          </div>
        </section>

        {/* セクション08: オープンソースライセンス */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">08</span>
            オープンソースライセンス
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスのソースコードは
              <strong className="text-foreground">AGPL-3.0ライセンス</strong>
              （GNU Affero General Public License v3.0）の下で公開されています。
            </p>

            <div className="bg-card/50 border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">
                AGPL-3.0ライセンスで許可されていること
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                <li>
                  <strong className="text-foreground">商用利用OK:</strong>{" "}
                  病院・クリニック等での業務利用、有料サービスへの組み込みも可能
                </li>
                <li>
                  <strong className="text-foreground">改変・再配布OK:</strong>{" "}
                  ソースコードを自由に改変し、再配布できます
                </li>
              </ul>
              <h3 className="font-semibold text-foreground mt-3">
                AGPL-3.0ライセンスの義務
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                <li>
                  改変した場合は、同じAGPL-3.0ライセンスでソースコードを公開する必要があります（コピーレフト）
                </li>
                <li>
                  ネットワーク経由でサービスを提供する場合も、ソースコードへのアクセス手段を提供する必要があります
                </li>
              </ul>
            </div>

            <p>
              詳細はGitHubの
              <ExternalLink href={GITHUB_LICENSE_URL}>
                LICENSEファイル
              </ExternalLink>
              をご確認ください。
            </p>

            <div className="bg-card/50 border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">
                「リハぐり」の名称について
              </h3>
              <p className="text-sm">
                「リハぐり」の名称およびロゴは、ソースコードのライセンス（AGPL-3.0）とは別に、提供者が権利を保有しています。
              </p>
              <p className="text-sm">
                改変したサービスを公開する場合は、本サービスとの混同を避けるため、別の名称・ロゴを使用してください。
              </p>
            </div>

            <p>
              利用者が本サービスを使用して作成したコンテンツ（指導箋、画像など）の権利は、利用者に帰属します。
            </p>
          </div>
        </section>

        {/* セクション09: サービスの変更・終了 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">09</span>
            サービスの変更・終了
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              提供者は、利用者への事前通知なく、本サービスの内容を変更、または提供を終了することがあります。
            </p>
            <p>
              これにより利用者に生じた損害について、提供者は一切の責任を負いません。
            </p>
            <p>
              なお、本サービスはオープンソースとして公開されているため、サービス終了後もソースコードは引き続き利用可能です。
            </p>
          </div>
        </section>

        {/* セクション10: 規約の変更 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">10</span>
            規約の変更
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本規約は、法令の改正、社会情勢の変化、その他の必要に応じて変更されることがあります。
            </p>
            <p>
              変更後の規約は、本ページに掲載した時点で効力を生じるものとし、利用者が変更後に本サービスを利用した場合、変更後の規約に同意したものとみなされます。
            </p>
            <p>
              重要な変更がある場合は、本サービスのトップページまたは更新履歴ページにて告知します。
            </p>
          </div>
        </section>

        {/* セクション11: 準拠法・管轄 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">11</span>
            準拠法・管轄
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本規約は日本法に準拠し、本サービスに関する紛争については、日本国内の裁判所を専属的合意管轄裁判所とします。
            </p>
          </div>
        </section>

        {/* セクション12: お問い合わせ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-primary font-mono text-lg">12</span>
            お問い合わせ
          </h2>
          <div className="pl-8 border-l border-white/10 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              本サービスに関するお問い合わせは、以下の窓口にてお受けしております:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-foreground">
                  一般のお問い合わせ・ご意見:
                </strong>{" "}
                <ExternalLink href={FEEDBACK_FORM_URL}>
                  ご意見箱（Googleフォーム）
                </ExternalLink>
              </li>
              <li>
                <strong className="text-foreground">
                  バグ報告・機能リクエスト:
                </strong>{" "}
                <ExternalLink href={GITHUB_ISSUES_URL}>
                  GitHub Issues
                </ExternalLink>
              </li>
            </ul>
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
