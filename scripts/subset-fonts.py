#!/usr/bin/env python3
"""
Noto Sans JP フォントサブセット化スクリプト

使用方法:
  pip install fonttools brotli zopfli
  python scripts/subset-fonts.py

依存パッケージ:
  - fonttools: フォント操作ライブラリ
  - brotli: WOFF2圧縮（必須）
  - zopfli: WOFF圧縮最適化（オプション）
"""

import subprocess
import sys
from pathlib import Path


def subset_font(input_path: Path, output_path: Path, chars_file: Path, flavor: str = "woff2"):
    """
    フォントをサブセット化

    chars.txt に含まれる文字のみを抽出してフォントサイズを削減する。
    
    Args:
        input_path: 入力フォントファイルのパス
        output_path: 出力フォントファイルのパス
        chars_file: 文字リストファイルのパス
        flavor: 出力形式 ("woff2", "woff", または None でTTF)
    """
    cmd = [
        sys.executable, "-m", "fontTools.subset",
        str(input_path),
        f"--text-file={chars_file}",  # 文字リストファイル
        f"--output-file={output_path}",
        "--layout-features=",   # レイアウト機能を全て削除（PDFでは不要）
        "--name-IDs=0,1,2,4,6",  # 必要最小限のフォント名のみ
        "--no-hinting",         # ヒンティング削除（サイズ削減）
        "--desubroutinize",     # サブルーチン展開（互換性向上）
        # 不要テーブルを積極的に削除
        "--drop-tables+=DSIG,GPOS,GDEF,GSUB,MATH,COLR,CPAL,SVG,MVAR,STAT,BASE",
        # 追加の最適化オプション
        "--notdef-outline",     # .notdefグリフのアウトラインを保持（互換性）
        "--recommended-glyphs", # .notdef, space, CR, NULLを含む
        "--ignore-missing-glyphs",  # 欠落グリフを無視
        "--no-prune-unicode-ranges",  # unicodeRangesを維持（ブラウザ互換性）
    ]
    
    # WOFF2/WOFF形式で出力（大幅なサイズ削減）
    if flavor:
        cmd.append(f"--flavor={flavor}")

    print(f"  実行: {' '.join(cmd[:4])}...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  エラー: {result.stderr}")
        return False

    return True


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    fonts_dir = project_root / "packages" / "assets" / "fonts"
    originals_dir = fonts_dir / "originals"
    chars_file = script_dir / "chars.txt"

    # 文字リストファイルの確認
    if not chars_file.exists():
        print(f"エラー: {chars_file} が存在しません")
        print("scripts/chars.txt を作成してください")
        sys.exit(1)

    # 元フォントディレクトリの確認
    if not originals_dir.exists():
        print(f"エラー: {originals_dir} が存在しません")
        print("元フォントファイルを packages/assets/fonts/originals/ に配置してください")
        sys.exit(1)

    # 文字数をカウント
    with open(chars_file, "r", encoding="utf-8") as f:
        chars = f.read()
        char_count = len(set(chars.replace("\n", "").replace("\r", "")))
    
    # WOFF形式で出力（@react-pdf/rendererがWOFF2非対応のため）
    font_files = [
        ("NotoSansJP-Regular.ttf", "NotoSansJP-Regular.woff"),
        ("NotoSansJP-Bold.ttf", "NotoSansJP-Bold.woff"),
    ]

    print("=" * 50)
    print("Noto Sans JP フォントサブセット化")
    print("=" * 50)
    print(f"文字リスト: {chars_file}")
    print(f"文字数: {char_count} 文字")
    print(f"出力形式: WOFF (Zlib圧縮)")

    target_min = 500  # KB
    target_max = 700  # KB
    all_success = True

    for input_name, output_name in font_files:
        input_path = originals_dir / input_name
        output_path = fonts_dir / output_name

        if not input_path.exists():
            print(f"スキップ: {input_path} が見つかりません")
            continue

        print(f"\n処理中: {input_name}")
        input_size = input_path.stat().st_size / 1024 / 1024
        print(f"  入力サイズ: {input_size:.2f} MB")

        if subset_font(input_path, output_path, chars_file, flavor="woff"):
            output_size = output_path.stat().st_size / 1024
            print(f"  出力サイズ: {output_size:.2f} KB")
            reduction = (1 - output_size / 1024 / input_size) * 100
            print(f"  削減率: {reduction:.1f}%")

            if output_size > target_max:
                print(f"  ⚠️  警告: 目標サイズ（{target_max}KB）を超えています")
                all_success = False
            elif output_size < target_min:
                print(f"  ⚠️  注意: 目標サイズ（{target_min}KB）未満です（文字が不足している可能性）")
            else:
                print(f"  ✅ 目標範囲内 ({target_min}-{target_max}KB)")
        else:
            print(f"  失敗: {input_name} のサブセット化に失敗しました")
            sys.exit(1)

    print("\n" + "=" * 50)
    if all_success:
        print("✅ 完了! 全てのフォントが目標サイズ内です")
    else:
        print("⚠️  完了（警告あり）")
        print("\nサイズ削減のヒント:")
        print("  1. chars.txt から使用頻度の低い漢字を削除")
        print("  2. JIS第一水準から医療・リハビリ関連の漢字のみに絞る")
        print("  3. 記号や特殊文字を削減")
    print("=" * 50)


if __name__ == "__main__":
    main()

