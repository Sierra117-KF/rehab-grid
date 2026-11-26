// @vitest-environment node
/**
 * lib/constants/sampleImages.ts のテスト
 *
 * マニフェストと packages/assets の実ファイル（元画像・一覧用サムネイル）の対応を確かめる。
 * サンプル画像を追加してサムネイル生成（scripts/generate-sample-thumbnails.mjs）を忘れると落ちる。
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  getSampleThumbnailPath,
  SAMPLE_IMAGES,
} from "@rehab-grid/core/lib/constants";
import { describe, expect, it } from "vitest";

/** 公開パス（`/images/samples/...`）を packages/assets 内の実ファイルパスに変換する */
const toAssetFilePath = (publicPath: string) =>
  fileURLToPath(
    new URL(`../../../../assets${publicPath}`, import.meta.url)
  );

describe("getSampleThumbnailPath", () => {
  it("ファイル名の直前に thumbs/ を挟む", () => {
    expect(getSampleThumbnailPath("/images/samples/standing_05_squat.webp")).toBe(
      "/images/samples/thumbs/standing_05_squat.webp"
    );
  });
});

describe("SAMPLE_IMAGES と実ファイルの対応", () => {
  it.each(SAMPLE_IMAGES.map((img) => [img.id, img.path]))(
    "%s の元画像とサムネイルが存在する",
    (_id, path) => {
      expect(existsSync(toAssetFilePath(path))).toBeTruthy();
      expect(
        existsSync(toAssetFilePath(getSampleThumbnailPath(path)))
      ).toBeTruthy();
    }
  );
});
