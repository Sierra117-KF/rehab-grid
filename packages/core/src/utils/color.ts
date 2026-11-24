/**
 * 色関連のユーティリティ関数
 */

/**
 * HEX 色を白地に指定の濃さで重ねたときの不透明な色を返す
 *
 * @remarks
 * 半透明色（rgba）は react-pdf の描画で色味が変わることがあるため、
 * Canvas と PDF の見た目を揃えたい箇所では、白との合成済みの不透明色を使う。
 *
 * @param hex - `#RRGGBB` 形式の色（大文字・小文字どちらでもよい）
 * @param opacity - 重ねる濃さ（0 で白、1 で元の色）
 * @returns 合成後の色（`#rrggbb` 形式の小文字）
 *
 * @example
 * ```typescript
 * mixWithWhite("#3b82f6", 0.3); // "#c4dafc"
 * ```
 */
export function mixWithWhite(hex: string, opacity: number): string {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16);
    const mixed = Math.round(255 + (value - 255) * opacity);
    return mixed.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}
