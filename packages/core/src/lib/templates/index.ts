/**
 * テンプレートメタデータの定義
 *
 * 利用可能なテンプレート一覧を管理する
 */

import { type TemplateMetadata } from "@rehab-grid/core/types";

/**
 * 利用可能なテンプレート一覧
 *
 * @remarks
 * 各テンプレートのデータは `public/templates/{path}/project.json` に配置
 * 画像は `public/templates/{path}/images/` に配置
 */
export const TEMPLATES: TemplateMetadata[] = [
  {
    id: "in-bed-for-stroke",
    name: "【脳卒中】ベッド上の自主トレ",
    description: "脳卒中後の患者さん向け",
    cardCount: 6,
    path: "in-bed-for-stroke",
  },
  {
    id: "seated-in-a-chair-for-stroke",
    name: "【脳卒中】座位の自主トレ",
    description: "脳卒中後の患者さん向け",
    cardCount: 5,
    path: "seated-in-a-chair-for-stroke",
  },
  {
    id: "upper-extremity-for-stroke",
    name: "【脳卒中】上肢の自主トレ",
    description: "脳卒中後の患者さん向け",
    cardCount: 6,
    path: "upper-extremity-for-stroke",
  },
  {
    id: "swallowing",
    name: "嚥下体操",
    description: "嚥下機能向上のための間接的自主トレ",
    cardCount: 5,
    path: "swallowing",
  },
  {
    id: "full-body-workout",
    name: "全身の自主トレ",
    description: "全身をバランスよく鍛えるための自主トレ",
    cardCount: 6,
    path: "full-body-workout",
  },
  {
    id: "after-lower-limb-orthopedic-surgery",
    name: "下肢の整形外科術後の自主トレ",
    description: "術後急性期からベッド上でできる自主トレ",
    cardCount: 8,
    path: "after-lower-limb-orthopedic-surgery",
  },
  {
    id: "low-back-pain",
    name: "腰痛体操",
    description: "主に腰椎屈曲傾向の患者さん向けの自主トレ",
    cardCount: 6,
    path: "low-back-pain",
  },
  {
    id: "shoulder-stiffness",
    name: "肩こり体操",
    description: "肩こりの改善と予防のための自主トレ",
    cardCount: 6,
    path: "shoulder-stiffness",
  },
];

/**
 * テンプレートIDからメタデータを取得
 *
 * @param id - テンプレートID
 * @returns テンプレートメタデータ、見つからない場合は undefined
 */
export function getTemplateById(id: string): TemplateMetadata | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
