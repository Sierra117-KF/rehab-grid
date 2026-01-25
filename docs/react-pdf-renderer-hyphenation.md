# @react-pdf/renderer v4.x 日本語ハイフン問題の完全解決ガイド

**v4.3.2で日本語テキストの行末にハイフンが表示される問題は、`Font.registerHyphenationCallback` の実装方法を変更することで解決できます。** 最も信頼性の高い解決策は、各文字の後に空文字列を挿入する `flatMap` 方式です。この問題は @react-pdf/textkit v6.1.0 で導入された新しいハイフネーションアルゴリズムの仕様変更に起因しており、従来の `word.split("")` だけでは不十分なケースがあります。

## 問題の根本原因を理解する

@react-pdf/renderer v4.x では、内部の **@react-pdf/textkit v6.1.0** でハイフネーションアルゴリズムが大幅に改修されました。この変更により、ハイフン表示の制御方法が変わっています。

従来のバージョンでは `Font.registerHyphenationCallback(word => word.split(""))` で文字単位に分割するだけで改行できましたが、v4.x では**ソフトハイフン文字（`\u00AD`）の有無**がハイフン表示を決定する仕組みに変更されました。問題は、デフォルトの行分割処理が音節の区切りごとにハイフンを挿入しようとする点にあります。CJK文字を単純に分割しただけでは、各文字が「音節の終端」として認識され、ハイフンが挿入される場合があります。

## 最も効果的な解決策

### 推奨実装：flatMap方式（確実に動作）

```javascript
import { Font } from '@react-pdf/renderer';

// 日本語・CJK向けハイフネーション設定
Font.registerHyphenationCallback((word) =>
  Array.from(word).flatMap((char) => [char, ''])
);
```

この方法が最も信頼性が高い理由は、**各文字の後に空文字列 `''` を明示的に挿入する**ことで、ハイフン文字を空に置き換えているためです。GitHub Issue #1568 で韓国語対応として提案され、Qiita の日本語記事でも成功が報告されています。16以上の高評価を受けており、日本語・韓国語・中国語すべてで動作確認されています。

### 英語と日本語を混在させる場合

```javascript
import { Font } from '@react-pdf/renderer';

// CJK文字を判定する関数
const isCJK = (char) => {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||  // CJK統合漢字
    (code >= 0x3040 && code <= 0x309F) ||  // ひらがな
    (code >= 0x30A0 && code <= 0x30FF) ||  // カタカナ
    (code >= 0xFF00 && code <= 0xFFEF) ||  // 全角文字
    (code >= 0x3000 && code <= 0x303F)     // CJK記号
  );
};

Font.registerHyphenationCallback((word, originalHyphenationCallback) => {
  // CJK文字を含む場合は空文字挿入方式
  if ([...word].some(isCJK)) {
    return Array.from(word).flatMap((char) => [char, '']);
  }
  // 英語はデフォルトのハイフネーションを使用
  if (originalHyphenationCallback) {
    return originalHyphenationCallback(word);
  }
  return [word];
});
```

v4.x では `registerHyphenationCallback` に**第2引数として `originalHyphenationCallback`** が渡されるようになりました。これを活用することで、英語テキストには通常のハイフネーションを適用しつつ、日本語テキストではハイフンを無効化できます。

## 代替アプローチと比較

| 方式 | コード | 効果 | 推奨度 |
|------|--------|------|--------|
| **flatMap方式** | `Array.from(word).flatMap((char) => [char, ''])` | 確実にハイフン非表示 | ⭐⭐⭐⭐⭐ |
| **単純分割** | `word.split("")` | v4.xで不完全な場合あり | ⭐⭐⭐ |
| **完全無効化** | `[word]` を返す | 長い単語が溢れる可能性 | ⭐⭐ |
| **cjk-regex使用** | CJK判定ライブラリ併用 | 英語混在に最適 | ⭐⭐⭐⭐ |

`word.split("")` のみの実装が v4.x で動作しない理由は、textkit の内部処理で音節配列の各要素が改行候補として扱われ、行末に到達した際にデフォルトのハイフン文字が挿入されるためです。`flatMap` で空文字を追加することで、この挿入文字を明示的に上書きしています。

## v4.x での重要な仕様変更

@react-pdf/textkit v6.1.0 のリリースノートによると、以下の変更が行われました：

**破壊的変更として**、カスタムハイフネーションコールバックを使用している場合、行折り返し時にハイフンを挿入したい音節の末尾に**ソフトハイフン文字（`'\u00AD'`）を付ける必要がある**と明記されています。逆に言えば、ソフトハイフンを含まない音節では、分割は可能でもハイフン文字は表示されません。

この仕様を活用した実装：

```javascript
Font.registerHyphenationCallback((word) => {
  // ソフトハイフンなしで文字を返す = ハイフン表示なし
  return word.split("");
});
```

理論上、v4.x ではこれだけで動作するはずですが、一部のケースで問題が報告されているため、**flatMap方式の使用を推奨**します。

## 完全な実装例

```javascript
import {
  Document,
  Page,
  Text,
  View,
  Font,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

// 1. 日本語フォントを登録
Font.register({
  family: 'NotoSansJP',
  fonts: [
    { src: '/fonts/NotoSansJP-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSansJP-Bold.ttf', fontWeight: 'bold' },
  ],
});

// 2. ハイフネーション設定（最重要）
Font.registerHyphenationCallback((word) =>
  Array.from(word).flatMap((char) => [char, ''])
);

// 3. スタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'NotoSansJP',
    fontSize: 11,
  },
  text: {
    marginBottom: 10,
    lineHeight: 1.6,
  },
});

// 4. ドキュメントコンポーネント
const MyDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View>
        <Text style={styles.text}>
          日本語テキストが正しく改行されます。
          ハイフンが挿入されることなく、自然な折り返しが実現できます。
          長い文章でも問題なく表示されます。
        </Text>
      </View>
    </Page>
  </Document>
);

export default MyDocument;
```

## Web Worker 環境での注意点

Next.js の Web Worker 内で PDF を生成する場合、`Font.registerHyphenationCallback` は **Worker のコンテキスト内で実行する必要があります**。Worker 側のファイルで以下のように設定してください：

```javascript
// pdf.worker.js
import { Font, pdf } from '@react-pdf/renderer';

// Worker内でハイフネーション設定を行う
Font.registerHyphenationCallback((word) =>
  Array.from(word).flatMap((char) => [char, ''])
);

// PDF生成関数
export async function generatePDF(documentComponent) {
  const blob = await pdf(documentComponent).toBlob();
  return blob;
}
```

メインスレッドではなく Worker 側で設定することで、PDF 生成時に正しくコールバックが適用されます。

## 関連する GitHub Issues と修正状況

この問題に関連する主な Issue は以下のとおりです：

- **Issue #1662**（Closed）: CJK文字の折り返しエラー。PR #3188 と #3268 で修正済み
- **Issue #1568**（Closed）: 非英語言語の改行対応。空文字挿入方式が提案され、高評価を獲得
- **Issue #3018**（Closed）: v4.x でのソフトハイフン処理の問題。PR #3188 で修正
- **Issue #419**（Open）: 日本語ハイフネーション無効化の問題。v1.0.0 で報告された古い Issue だが、根本的な解決策として flatMap 方式が有効

PR #3188 でハイフネーションアルゴリズムが大幅に改修され、ソフトハイフンベースの制御が導入されました。v4.x を使用している場合は、このPRの変更が適用されています。

## 結論

**`Font.registerHyphenationCallback((word) => Array.from(word).flatMap((char) => [char, '']))` を使用することで、v4.3.2 の日本語ハイフン問題は解決します。** この方式は複数のコミュニティメンバーによって検証されており、CJK言語全般で信頼性の高い解決策です。

実装時のポイントは3つあります。`Font.register` でフォントを登録した後に `registerHyphenationCallback` を呼び出すこと、Web Worker を使用する場合は Worker 側で設定すること、英語と日本語の混在文書では CJK 判定ロジックを追加することです。これらを守れば、ハイフンのない自然な日本語テキストの改行を実現できます。