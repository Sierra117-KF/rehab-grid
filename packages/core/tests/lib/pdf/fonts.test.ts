// @vitest-environment node
/**
 * PDF 用サブセットフォントの文字収録テスト
 *
 * packages/assets/fonts/NotoSansJP-{Regular,Bold}.woff に、
 * PDF 出力で使われる固定ラベル・定型文・公式テンプレートの文字がすべて収録されているかを検証する。
 *
 * サブセットに含まれない文字が PDF に含まれると、@react-pdf/renderer が標準フォント（Helvetica）へ
 * フォールバックし、WinAnsiEncoding の別文字（例: ○ → Ë）への文字化けや文字重なりが起きるため、
 * ラベルやテンプレートの追加時に欠落を即座に検知する。
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

import {
  CHECK_TABLE_WEEKDAYS,
  DOSAGE_LABEL_SUGGESTIONS,
  LABELS,
  PDF_LABELS,
  PRECAUTION_SNIPPETS,
} from "@rehab-grid/core/lib/constants";
import { describe, expect, it } from "vitest";

/** WOFF ファイルを読み込み、cmap テーブルに収録されている Unicode コードポイント集合を返す */
function readWoffCodePoints(woffPath: string): Set<number> {
  const buf = readFileSync(woffPath);
  // WOFF 1.0 シグネチャ ("wOFF" = 0x774F4646)
  expect(buf.readUInt32BE(0)).toBe(0x774f4646);

  const numTables = buf.readUInt16BE(12);
  let cmapTable: Buffer | undefined;

  for (let i = 0; i < numTables; i++) {
    const offset = 44 + i * 20;
    const tag = buf.toString("ascii", offset, offset + 4);
    if (tag !== "cmap") continue;

    const tableOffset = buf.readUInt32BE(offset + 4);
    const compLength = buf.readUInt32BE(offset + 8);
    const origLength = buf.readUInt32BE(offset + 12);
    const raw = buf.subarray(tableOffset, tableOffset + compLength);
    cmapTable = compLength < origLength ? inflateSync(raw) : raw;
    break;
  }

  if (cmapTable === undefined) {
    throw new Error(`cmap テーブルが見つかりません: ${woffPath}`);
  }

  const codePoints = new Set<number>();
  const numSubtables = cmapTable.readUInt16BE(2);

  for (let i = 0; i < numSubtables; i++) {
    const recOffset = 4 + i * 8;
    const platformId = cmapTable.readUInt16BE(recOffset);
    const encodingId = cmapTable.readUInt16BE(recOffset + 2);
    const subtableOffset = cmapTable.readUInt32BE(recOffset + 4);

    // Unicode (platform 0) または Windows Unicode (platform 3, encoding 1 / 10)
    const isUnicode =
      platformId === 0 ||
      (platformId === 3 && (encodingId === 1 || encodingId === 10));
    if (!isUnicode) continue;

    const format = cmapTable.readUInt16BE(subtableOffset);

    if (format === 4) {
      const segCount = cmapTable.readUInt16BE(subtableOffset + 6) / 2;
      const endCodesOffset = subtableOffset + 14;
      const startCodesOffset = endCodesOffset + segCount * 2 + 2;
      const idDeltasOffset = startCodesOffset + segCount * 2;
      const idRangeOffsetsOffset = idDeltasOffset + segCount * 2;

      for (let s = 0; s < segCount; s++) {
        const endCode = cmapTable.readUInt16BE(endCodesOffset + s * 2);
        const startCode = cmapTable.readUInt16BE(startCodesOffset + s * 2);
        if (startCode === 0xffff) break;

        const idDelta = cmapTable.readInt16BE(idDeltasOffset + s * 2);
        const idRangeOffset = cmapTable.readUInt16BE(
          idRangeOffsetsOffset + s * 2
        );

        for (let cp = startCode; cp <= endCode; cp++) {
          let glyphId = 0;
          if (idRangeOffset === 0) {
            glyphId = (cp + idDelta) & 0xffff;
          } else {
            const glyphOffset =
              idRangeOffsetsOffset +
              s * 2 +
              idRangeOffset +
              (cp - startCode) * 2;
            const rawGlyphId = cmapTable.readUInt16BE(glyphOffset);
            glyphId = rawGlyphId === 0 ? 0 : (rawGlyphId + idDelta) & 0xffff;
          }
          if (glyphId !== 0) codePoints.add(cp);
        }
      }
    } else if (format === 12) {
      const numGroups = cmapTable.readUInt32BE(subtableOffset + 12);
      for (let g = 0; g < numGroups; g++) {
        const groupOffset = subtableOffset + 16 + g * 12;
        const startCode = cmapTable.readUInt32BE(groupOffset);
        const endCode = cmapTable.readUInt32BE(groupOffset + 4);
        for (let cp = startCode; cp <= endCode; cp++) {
          codePoints.add(cp);
        }
      }
    }
  }

  return codePoints;
}

/** 文字列から制御文字・改行を除いた欠落文字（コードポイント付き）を抽出する */
function findMissingChars(
  text: string,
  codePoints: Set<number>
): string[] {
  const missing = new Set<string>();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || cp < 0x20) continue;
    if (!codePoints.has(cp)) {
      missing.add(`${ch} (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`);
    }
  }
  return Array.from(missing);
}

/** オブジェクト内の全文字列を再帰的に収集する */
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

const FONT_FILES = [
  {
    name: "NotoSansJP-Regular.woff",
    path: fileURLToPath(
      new URL("../../../../assets/fonts/NotoSansJP-Regular.woff", import.meta.url)
    ),
  },
  {
    name: "NotoSansJP-Bold.woff",
    path: fileURLToPath(
      new URL("../../../../assets/fonts/NotoSansJP-Bold.woff", import.meta.url)
    ),
  },
] as const;

const TEMPLATES_DIR = fileURLToPath(
  new URL("../../../../assets/templates", import.meta.url)
);

describe("PDF 用サブセットフォントの文字収録", () => {
  const loadedFonts = FONT_FILES.map((font) => ({
    name: font.name,
    codePoints: readWoffCodePoints(font.path),
  }));

  it.each(loadedFonts)(
    "$name に PDF の固定ラベル・箇条書き・切り詰め記号がすべて収録されている",
    ({ codePoints }) => {
      const texts = [
        ...Object.values(PDF_LABELS),
        ...Object.values(LABELS),
        ...CHECK_TABLE_WEEKDAYS,
        ...Object.values(DOSAGE_LABEL_SUGGESTIONS).flat(),
        // PDF 生成処理内で直接挿入する記号（注意点の行頭記号・切り詰め記号・よく使う記号）
        "•…○〇×°〜々箋嚥",
      ];
      expect(findMissingChars(texts.join(""), codePoints)).toEqual([]);
    }
  );

  it.each(loadedFonts)(
    "$name に注意点の定型文の文字がすべて収録されている",
    ({ codePoints }) => {
      const text = PRECAUTION_SNIPPETS.map((snippet) => snippet.value).join("");
      expect(findMissingChars(text, codePoints)).toEqual([]);
    }
  );

  it.each(loadedFonts)(
    "$name に全公式テンプレートの文字がすべて収録されている",
    ({ codePoints }) => {
      const templateDirs = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      expect(templateDirs.length).toBeGreaterThan(0);

      for (const dir of templateDirs) {
        const jsonPath = `${TEMPLATES_DIR}/${dir}/project.json`;
        const data: unknown = JSON.parse(readFileSync(jsonPath, "utf8"));
        const text = collectStrings(data).join("");
        expect(findMissingChars(text, codePoints), `template: ${dir}`).toEqual(
          []
        );
      }
    }
  );
});
