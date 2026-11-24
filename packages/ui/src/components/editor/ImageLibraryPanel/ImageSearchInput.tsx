/**
 * 画像検索入力欄コンポーネント
 *
 * 画像ライブラリを運動名（表示ファイル名）で絞り込むためのキーワード入力欄
 */

import {
  IMAGE_LIBRARY_SEARCH_CLEAR,
  IMAGE_LIBRARY_SEARCH_LABEL,
  IMAGE_LIBRARY_SEARCH_PLACEHOLDER,
} from "@rehab-grid/core/lib/constants";
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { Search, X } from "lucide-react";

/**
 * 画像検索入力欄の Props
 */
type ImageSearchInputProps = {
  /** 現在の検索語 */
  value: string;
  /** 検索語変更時のコールバック */
  onValueChange: (value: string) => void;
};

/**
 * 画像検索入力欄コンポーネント
 */
export function ImageSearchInput({
  value,
  onValueChange,
}: ImageSearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        aria-label={IMAGE_LIBRARY_SEARCH_LABEL}
        placeholder={IMAGE_LIBRARY_SEARCH_PLACEHOLDER}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
        }}
        className="pl-9 pr-8"
      />
      {value !== "" && (
        <button
          type="button"
          aria-label={IMAGE_LIBRARY_SEARCH_CLEAR}
          title={IMAGE_LIBRARY_SEARCH_CLEAR}
          className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            onValueChange("");
          }}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
