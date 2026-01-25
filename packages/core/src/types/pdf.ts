/**
 * PDF出力関連の型定義
 */

import { type EditorItem, type LayoutType } from "./editor";
import { type ProjectMeta } from "./project";

/**
 * PDF生成に必要なデータ
 */
export type PdfGenerationData = {
  /** プロジェクトのメタ情報 */
  meta: ProjectMeta;
  /** レイアウトタイプ */
  layoutType: LayoutType;
  /** アイテム一覧 */
  items: EditorItem[];
  /** 画像データ（ID -> Base64 data URL のマップ） */
  images: Record<string, string>;
};

/**
 * Web Worker へのメッセージ
 */
export type PdfWorkerRequest = {
  type: "generate";
  data: PdfGenerationData;
};

/**
 * Web Worker からの応答
 */
export type PdfWorkerResponse =
  | {
      type: "success";
      blob: Blob;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "progress";
      progress: number;
    };

/**
 * PDF生成の状態
 */
export type PdfGenerationState = {
  /** 生成中かどうか */
  isGenerating: boolean;
  /** 進捗（0-100） */
  progress: number;
  /** エラーメッセージ */
  error: string | null;
};

/**
 * PDFヘッダー情報
 */
export type PdfHeaderInfo = {
  /** 病院名 */
  hospitalName?: string;
  /** 氏名 */
  patientName?: string;
};
