"use client";

/**
 * 1 行に収まるよう自動でフォントサイズを縮小するテキストコンポーネント
 *
 * 親コンテナの幅に対してテキストがはみ出す場合のみ、1 行のまま収まるサイズまで縮小する。
 * 短いテキストは基準サイズのまま表示される。
 */

import { cn } from "@rehab-grid/core/lib/utils";
import { useEffect, useRef } from "react";

/** 自動縮小時の最小フォントサイズ（px） */
const MIN_AUTO_FIT_FONT_SIZE_PX = 4;

/**
 * コンテナ幅に合わせてテキスト要素のフォントサイズを 1 行に収める
 *
 * @param container - 基準フォントサイズと利用可能幅を持つ親要素
 * @param textEl - 縮小対象のテキスト要素（inline-block かつ whitespace-nowrap）
 */
function fitTextToContainer(container: HTMLElement, textEl: HTMLElement): void {
  const availableWidth = container.clientWidth;
  // jsdom や非表示要素では幅が 0 になるため、何もしない
  if (availableWidth <= 0) return;

  // 親要素の基準フォントサイズに戻して自然幅を測る（同期処理内のためちらつかない）
  textEl.style.fontSize = "";
  const naturalWidth = textEl.scrollWidth;
  if (naturalWidth <= availableWidth || naturalWidth === 0) return;

  const baseFontSize = Number.parseFloat(getComputedStyle(container).fontSize);
  if (!Number.isFinite(baseFontSize) || baseFontSize <= 0) return;

  const rawNext = baseFontSize * (availableWidth / naturalWidth);
  let nextSize = Math.max(
    MIN_AUTO_FIT_FONT_SIZE_PX,
    Math.floor(rawNext * 100) / 100
  );
  textEl.style.fontSize = `${String(nextSize)}px`;

  // プロポーショナルフォントのヒンティング差で 1〜2px はみ出す場合だけ 1 回補正する
  if (
    textEl.scrollWidth > availableWidth &&
    nextSize > MIN_AUTO_FIT_FONT_SIZE_PX
  ) {
    nextSize = Math.max(
      MIN_AUTO_FIT_FONT_SIZE_PX,
      Math.floor(nextSize * (availableWidth / textEl.scrollWidth) * 100) / 100
    );
    textEl.style.fontSize = `${String(nextSize)}px`;
  }
}

/**
 * コンテナ幅・テキスト・基準サイズの変化に応じて 1 行に収まるフォントサイズを維持するフック
 *
 * @remarks
 * useEffect の例外的使用（ResizeObserver による DOM 実測幅の監視と Web フォント読込完了検知という
 * システム制御）。AGENTS.md の規約に従いカスタムフックに隠蔽する。
 *
 * @param text - 表示するテキスト
 * @param sizeKey - 基準フォントサイズが変わったことを検知するキー（クラス名など）
 * @returns 親コンテナとテキスト要素に付ける ref
 */
function useAutoFitFontSize(text: string, sizeKey: string | undefined) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (container === null || textEl === null) return;

    let disposed = false;
    const fit = () => {
      if (disposed) return;
      fitTextToContainer(container, textEl);
    };

    fit();

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(fit);
      observer.observe(container);
    }

    // Web フォントの遅延読み込み後に文字幅が変わることがあるため再計測する
    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(fit);
    }

    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [text, sizeKey]);

  return { containerRef, textRef };
}

/**
 * AutoFitText コンポーネントの Props
 */
export type AutoFitTextProps = {
  /** 表示するテキスト */
  text: string;
  /** 親コンテナのクラス（基準フォントサイズや配置を指定する） */
  containerClassName?: string;
  /**
   * 親コンテナのインラインスタイル（コンテナクエリ単位などで基準フォントサイズを指定する）
   *
   * @remarks
   * cqw 指定でも getComputedStyle は px に解決した値を返し、幅の変化は ResizeObserver が拾う
   */
  containerStyle?: React.CSSProperties;
  /** テキスト要素のクラス（太字・文字色・下線など） */
  textClassName?: string;
  /** テキスト要素のインラインスタイル */
  textStyle?: React.CSSProperties;
  /** ツールチップ（インライン編集の案内など） */
  title?: string;
  /** ダブルクリックハンドラ（インライン編集の開始用） */
  onDoubleClick?: React.MouseEventHandler<HTMLSpanElement>;
};

/**
 * 1 行に収まるよう自動でフォントサイズを縮小するテキストコンポーネント
 */
export function AutoFitText({
  text,
  containerClassName,
  containerStyle,
  textClassName,
  textStyle,
  title,
  onDoubleClick,
}: AutoFitTextProps) {
  const { containerRef, textRef } = useAutoFitFontSize(
    text,
    `${containerClassName ?? ""}|${String(containerStyle?.fontSize ?? "")}`
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex w-full min-w-0 justify-center overflow-hidden",
        containerClassName
      )}
      style={containerStyle}
    >
      <span
        ref={textRef}
        className={cn("inline-block whitespace-nowrap", textClassName)}
        style={textStyle}
        title={title}
        onDoubleClick={onDoubleClick}
      >
        {text}
      </span>
    </div>
  );
}
