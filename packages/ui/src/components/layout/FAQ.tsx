"use client";

import { cn } from "@rehab-grid/core/lib/utils";
import { ChevronDown, ExternalLink, HelpCircle } from "lucide-react";
import React, { useState } from "react";

/**
 * FAQアイテムのデータ構造
 */
export type FAQItem = {
  question: string;
  answer: string | React.ReactNode;
};

/**
 * FAQデータ
 * 初めて使用するユーザー向けの質問と回答
 */
export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "利用料金はかかりますか？",
    answer:
      "全ての機能を「無料」で使えます。本アプリを無料で公開することで業務負担を少しでも減らし、結果として日本中の患者さんや利用者さんの利益に繋がって欲しいと考えています。",
  },
  {
    question: "会員登録やログインは必要ですか？",
    answer:
      "不要です。アカウント作成やログインをせず、自主トレ指導箋を作成できます。",
  },
  {
    question: "自主トレ画像を用意する方法は？",
    answer:
      "作成画面左側の画像ライブラリには、AIで生成したサンプル画像をいくつか用意しています。また、貼り付け（ペースト）やドラッグ＆ドロップで画像を追加することができます。",
  },
  {
    question: "スマートフォンでも使えますか？",
    answer:
      "使えます。タブレットを含むモバイル端末では、内蔵カメラで撮影した画像を追加することもできます。ただし、操作性（ドラッグ＆ドロップ）や一部の機能（PDFプレビュー）が制限されるため、PCでの使用をお勧めします。",
  },
  {
    question: "指導箋の見本はありますか？",
    answer:
      "見本となるテンプレートを複数用意しています。作成画面上部（ヘッダー）の「テンプレート」から選択できますので、最初は既存のテンプレートを修正して作ってみてください。",
  },
  {
    question: "運動メニューの列の数を調整する方法は？",
    answer:
      "作成画面上部（ヘッダー）の「グリッド選択」から、1～4列まで選択できます。1列表示は高齢者向けに文字が大きく表示されます。3～4列はA4横向きでPDFが作成されます。",
  },
  {
    question: "作成した指導箋を印刷する方法は？",
    answer:
      "作成画面右上の「PDF」ボタンからプレビューを開いて印刷するか、PDFファイルとしてダウンロードしてから印刷してください。※プレビュー機能はPC版のみ",
  },
  {
    question: "使用したデータはどこに保存されますか？",
    answer:
      "お使いの端末内（ブラウザのIndexedDB）に自動保存されます。ブラウザを閉じてもデータは保持されますが、アプリ内で削除操作をするか、ブラウザのキャッシュ消去、シークレットモード終了時などに失われます。重要なデータは「バックアップ」機能を使い、データをダウンロードしておいてください。",
  },
  {
    question: "使用したデータは外部へ送信されますか？",
    answer: (
      <>
        一切送信されません。また、本アプリをオープンソースソフトウェア（OSS）として公開することで、データを外部送信していないことを保証しています。詳しくは
        <a
          href="https://github.com/Sierra117-KF/rehab-grid"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          GitHub
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        をご覧ください。
      </>
    ),
  },
  {
    question: "医療機関等で使用する場合の注意点は？",
    answer:
      "本アプリはMicrosoft WordやExcel等と同様の資料作成ツールです。所属機関のセキュリティポリシーに従ってご利用ください。なお、患者様の画像や病歴等の要配慮個人情報の入力は禁止しています。",
  },
  {
    question: "医療情報ガイドラインに適合していますか？",
    answer:
      "本アプリは個人情報の入力を禁止しており、また外部サーバーにデータを送信しない完全ローカル動作のツールであるため、経産省・総務省の「医療情報を取り扱う情報システム・サービスの提供事業者における安全管理ガイドライン」の対象事業者には該当しません。",
  },
  {
    question: "推奨環境は？",
    answer:
      "最新のChrome、Firefox、Safari、Edgeでの使用を推奨します。モバイルではiOS 16.4以上、Android最新版での動作を確認しています。古いブラウザや非推奨環境では、一部機能が制限される場合があります。",
  },
  {
    question: "このアプリの開発者は誰？",
    answer: "現役の理学療法士です。趣味でアプリ開発をしています。",
  },
];

/**
 * 個別のFAQアイテムコンポーネント（Props）
 */
type FAQItemProps = {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * FAQアイテム（アコーディオン形式）
 */
function FAQItemComponent({ item, index, isOpen, onToggle }: FAQItemProps) {
  const contentId = `faq-content-${index}`;

  return (
    <div
      className={cn(
        "group border rounded-lg overflow-hidden transition-all duration-200",
        isOpen
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card/30 hover:border-primary/20"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 md:p-5 text-left cursor-pointer"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="font-bold text-foreground pr-4">{item.question}</span>
        <ChevronDown
          className={cn(
            "size-5 text-muted-foreground shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>
      <div
        id={contentId}
        role="region"
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-4 md:px-5 pb-4 md:pb-5 text-muted-foreground leading-relaxed">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * FAQセクションコンポーネント
 *
 * @remarks
 * - トップページの機能セクションと更新履歴セクションの間に表示
 * - 初めて使用するユーザー向けのよくある質問を掲載
 * - アコーディオン形式で開閉可能
 */
export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  /**
   * アコーディオンの開閉を切り替える
   * @param index - トグルするアイテムのインデックス
   */
  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-10 md:py-12 px-6 relative">
      <div className="mx-auto max-w-4xl">
        {/* セクションヘッダー */}
        <div className="flex items-center justify-center md:justify-start gap-3 mb-8">
          <HelpCircle className="size-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            よくある質問
          </h2>
        </div>

        {/* FAQリスト */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <FAQItemComponent
              key={item.question}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
