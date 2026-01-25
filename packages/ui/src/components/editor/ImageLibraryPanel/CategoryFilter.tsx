/**
 * カテゴリフィルターコンポーネント
 *
 * 画像ライブラリのカテゴリ（姿勢別、取り込み画像等）を選択するドロップダウン
 */

import {
  IMAGE_FILTER_CATEGORIES,
  IMAGE_LIBRARY_CATEGORY_PLACEHOLDER,
} from "@rehab-grid/core/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rehab-grid/ui/components/ui/select";
import { Filter } from "lucide-react";

/**
 * カテゴリフィルターの Props
 */
type CategoryFilterProps = {
  /** 現在選択中のフィルター値 */
  value: string;
  /** フィルター変更時のコールバック */
  onValueChange: (value: string) => void;
  /** 無効化フラグ */
  disabled?: boolean;
};

/**
 * カテゴリフィルターコンポーネント
 */
export function CategoryFilter({
  value,
  onValueChange,
  disabled = false,
}: CategoryFilterProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <Filter className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder={IMAGE_LIBRARY_CATEGORY_PLACEHOLDER} />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" className="z-[80]">
        {IMAGE_FILTER_CATEGORIES.map((category) => (
          <SelectItem
            key={category.value}
            value={category.value}
            className="justify-center pl-8 text-center"
          >
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
