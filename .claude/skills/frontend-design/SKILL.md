---
name: frontend-design
description: フロントエンドUI/UXデザインの品質を向上させるガイドラインです。コンポーネント、ページ、アプリケーションのUI作成時に参照してください。
---

# フロントエンドデザインガイドライン

「AIらしい」ジェネリックなデザインを避け、独自性のある高品質なUIを生成するためのガイドラインです。

---

## なぜこのガイドラインが必要か

LLMは学習データの「安全で一般的な選択」に収束しやすい傾向があります。これにより、Inter フォント、紫のグラデーション、白背景といった「AI slop」と呼ばれる画一的なデザインが生成されがちです。

このガイドラインは、その収束を防ぎ、コンテキストに応じた独自性のあるデザインを実現するためのものです。

---

## デザイン思考プロセス

コーディングを始める前に、以下を明確にしてください：

| 観点 | 質問 |
|------|------|
| **目的** | このインターフェースはどんな問題を解決するか？誰が使うか？ |
| **トーン** | 極端な方向性を選ぶ：ミニマル、マキシマリスト、レトロフューチャー、オーガニック、ラグジュアリー、プレイフル、エディトリアル、ブルータリスト、アールデコ、ソフト＆パステル、インダストリアル など |
| **制約** | フレームワーク、パフォーマンス、アクセシビリティの要件 |
| **記憶点** | ユーザーが覚えている「一つのこと」は何か？ |

**重要**: 明確なコンセプトを選び、精密に実行すること。大胆なマキシマリズムも洗練されたミニマリズムも、どちらも正解。鍵は**意図の明確さ**です。

---

## デザイン要素ガイドライン

### 1. タイポグラフィ

タイポグラフィは品質を即座に伝えます。

#### 絶対に使わないフォント
- Inter
- Roboto
- Arial
- Open Sans
- Lato
- システムフォント（sans-serif のみ）

#### 推奨フォントカテゴリ

| カテゴリ | フォント例 |
|----------|------------|
| **コード系** | JetBrains Mono, Fira Code, IBM Plex Mono |
| **エディトリアル** | Playfair Display, Crimson Pro, Newsreader |
| **テクニカル** | IBM Plex Sans/Serif, Source Sans 3, Atkinson Hyperlegible |
| **個性的** | Bricolage Grotesque, Archivo, Plus Jakarta Sans, Sora, Outfit |
| **日本語** | Noto Sans JP, Zen Kaku Gothic, BIZ UDGothic, Shippori Mincho |

#### ペアリング原則
- **高コントラスト** = 興味深い組み合わせ
  - ディスプレイ + モノスペース
  - セリフ + ジオメトリックサンセリフ
  - 可変フォントで極端なウェイト差

#### ウェイト・サイズの使い方
```
悪い例: 400 vs 600（違いが弱い）
良い例: 100/200 vs 800/900（明確なコントラスト）

悪い例: 1.5倍のサイズジャンプ
良い例: 3倍以上のサイズジャンプ
```

### 2. カラー＆テーマ

#### 基本原則
- CSS変数で一貫性を保つ
- **支配色 + シャープなアクセント** > 均等に分散した控えめなパレット
- ライト/ダーク両テーマを意識する

#### カラーパレット設計

```css
/* 良い例: 明確な階層構造 */
:root {
  --color-bg-primary: #0a0a0b;
  --color-bg-secondary: #141416;
  --color-text-primary: #fafafa;
  --color-text-muted: #71717a;
  --color-accent: #f97316;     /* オレンジアクセント */
  --color-accent-subtle: #fdba74;
}
```

#### テーマのインスピレーション源
- IDEテーマ（Dracula, Nord, Tokyo Night, Catppuccin）
- 文化的美学（和モダン、北欧、インダストリアル）
- 時代的スタイル（レトロ80s、Y2K、ミッドセンチュリー）

### 3. モーション＆アニメーション

#### 原則
- **少数の高インパクト** > 散発的なマイクロインタラクション
- ページロード時のスタッガードアニメーションは効果的
- CSSアニメーションを優先（Reactの場合はMotion/Framer Motion）

#### 効果的なアニメーションパターン

```css
/* スタッガードフェードイン */
.item {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeUp 0.6s ease-out forwards;
}
.item:nth-child(1) { animation-delay: 0.1s; }
.item:nth-child(2) { animation-delay: 0.2s; }
.item:nth-child(3) { animation-delay: 0.3s; }

@keyframes fadeUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### 注力すべきモーメント
- ページ初期表示（スタッガード表示）
- ホバーステート（予想外の変化）
- スクロールトリガー
- ステート変更時のトランジション

### 4. 空間構成＆レイアウト

#### 脱・予測可能レイアウト
- **非対称性**を活用
- 要素の**重なり**（overlap）
- **斜め**の視線誘導
- グリッドを**意図的に破る**要素
- **余白の極端な使い方**（極度に広いか、制御された密度か）

```css
/* グリッドを破る要素 */
.hero-image {
  position: relative;
  left: -5vw;
  width: calc(100% + 10vw);
}

/* 非対称グリッド */
.grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr;
  gap: 2rem;
}
```

### 5. 背景＆ビジュアルディテール

単色背景を**デフォルトにしない**。雰囲気と深みを作り出す。

#### テクニック

| 技法 | 用途 |
|------|------|
| **グラデーションメッシュ** | ヒーローセクション、カード背景 |
| **ノイズテクスチャ** | 深みと質感の追加 |
| **ジオメトリックパターン** | 技術的・モダンな印象 |
| **レイヤード透明** | カードやモーダルの奥行き |
| **ドラマチックシャドウ** | 要素の浮遊感 |
| **装飾ボーダー** | セクション区切り |
| **グレインオーバーレイ** | フィルム的な質感 |

```css
/* グレインオーバーレイ */
.grain-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.03;
  pointer-events: none;
}

/* メッシュグラデーション風 */
.mesh-bg {
  background:
    radial-gradient(at 20% 30%, #3b82f6 0%, transparent 50%),
    radial-gradient(at 80% 70%, #8b5cf6 0%, transparent 50%),
    #0f0f10;
}
```

---

## 避けるべきパターン（AI slop）

以下は「AIが生成した」と即座に認識されるパターンです：

### タイポグラフィ
- ❌ Inter, Roboto, Arial をそのまま使用
- ❌ 控えめなウェイト差（400 vs 500）
- ❌ 無難なサイズ設計

### カラー
- ❌ 紫グラデーション × 白背景（最も典型的なAI slop）
- ❌ 均等に分散した薄いパステル
- ❌ 意図のない「なんとなくモダン」な配色

### レイアウト
- ❌ 完全対称の予測可能なグリッド
- ❌ 全要素が同じマージン
- ❌ 装飾のない単調なカード

### インタラクション
- ❌ アニメーションなし
- ❌ 全要素に同じ `transition: all 0.3s ease`

---

## 実装の心得

### 美学とコード量のバランス

| デザイン方向 | 実装アプローチ |
|-------------|---------------|
| **マキシマリスト** | 複雑なアニメーション、多層エフェクト、装飾要素 |
| **ミニマリスト** | 精密なスペーシング、繊細なタイポグラフィ、抑制された動き |

**重要**: ミニマリズムは「コードが少ない」ではない。**精密さへの集中**です。

### コンポーネント生成時のセルフチェック

```
□ フォントは Inter/Roboto/Arial 以外か？
□ 配色に明確な意図があるか？
□ レイアウトに予想外の要素があるか？
□ 少なくとも1つのアニメーション効果があるか？
□ 背景に深みがあるか（単色でないか）？
□ 前回生成したものと明らかに違うか？
```

---

## React/Next.js での実装例

```tsx
// 良い例: 意図的なデザイン選択
export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* メッシュグラデーション背景 */}
      <div className="absolute inset-0 bg-[#0a0a0b]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl" />
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 container mx-auto px-6 pt-32">
        <h1 
          className="font-display text-7xl font-black tracking-tight text-white"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Something
          <span className="block text-orange-400">Remarkable</span>
        </h1>
      </div>
    </section>
  );
}
```

---

## まとめ

Claudeは優れたデザイン理解を持っていますが、明確な方向性がないと統計的に「安全」な選択に収束します。

このガイドラインの目的は：
1. 収束を防ぐ明示的な指示を与える
2. コンテキストに応じた独自のデザインを促す
3. 毎回異なる、記憶に残るUIを生成する

**覚えておくこと**: 大胆であれ。意図的であれ。同じものを二度作るな。
