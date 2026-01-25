import {
  type BadgeInfo,
  type BadgeRow,
  type BadgeType,
  type Dosages,
  type EditorItem,
  type LayoutType,
} from "@rehab-grid/core/types";

/**
 * Canvas の並び替え（ドラッグ＆ドロップ）結果を計算する純粋関数
 *
 * dnd-kit の `DragEndEvent` から取り出した `activeId` / `overId` を渡すことで、
 * `items` の並び順を更新し、`order` を 0..N-1 で再採番した配列を返す。
 *
 * 何も変更がない場合（`overId` が無い／同じID／IDが見つからない等）は `null` を返す。
 */
export function reorderEditorItems(
  items: readonly EditorItem[],
  activeId: string,
  overId: string | null | undefined
): EditorItem[] | null {
  if (overId === null || overId === undefined || activeId === overId) {
    return null;
  }

  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);

  if (oldIndex < 0 || newIndex < 0) {
    return null;
  }

  const next = items.slice();
  const [moved] = next.splice(oldIndex, 1);
  if (moved === undefined) return null;

  next.splice(newIndex, 0, moved);

  return next.map((item, index) => ({
    ...item,
    order: index,
  }));
}

/**
 * 用量バッジのレイアウト構造を計算する
 *
 * layoutType に応じて、どのバッジをどの行に配置するかを決定する純粋関数。
 * - 4列レイアウト（grid4）: 2行構成（回数・セット / 頻度）
 * - 通常レイアウト: 3列構成（回数・セット・頻度）
 *
 * @param dosages - アイテムの用量情報
 * @param layoutType - レイアウトタイプ
 * @returns バッジレイアウトの行配列（空配列の場合はバッジ非表示）
 */
export function getDosageBadgeLayout(
  dosages: Dosages | undefined,
  layoutType: LayoutType
): BadgeRow[] {
  if (!dosages || (!dosages.reps && !dosages.sets && !dosages.frequency)) {
    return [];
  }

  const badges: Record<BadgeType, BadgeInfo> = {
    reps: { type: "reps", value: dosages.reps, hasValue: dosages.reps !== "" },
    sets: { type: "sets", value: dosages.sets, hasValue: dosages.sets !== "" },
    frequency: {
      type: "frequency",
      value: dosages.frequency,
      hasValue: dosages.frequency !== "",
    },
  };

  if (layoutType === "grid4") {
    const rows: BadgeRow[] = [];

    // 1行目: 回数・セット（どちらかがあれば表示）
    if (badges.reps.hasValue || badges.sets.hasValue) {
      rows.push({ badges: [badges.reps, badges.sets] });
    }

    // 2行目: 頻度（横幅いっぱい）
    if (badges.frequency.hasValue) {
      rows.push({ badges: [badges.frequency], isFullWidth: true });
    }

    return rows;
  }

  // 通常レイアウト: 3列構成
  return [{ badges: [badges.reps, badges.sets, badges.frequency] }];
}
