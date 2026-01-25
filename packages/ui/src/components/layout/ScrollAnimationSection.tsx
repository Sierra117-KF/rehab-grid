"use client";

import { cn } from "@rehab-grid/core/lib/utils";
import { type ReactNode, useCallback, useRef, useState } from "react";

/**
 * スクロールアニメーション用フックのオプション
 */
type UseScrollAnimationOptions = {
  /** アニメーションを発火させるビューポート内の閾値 (0-1) */
  threshold?: number;
  /** ルートマージン（例: "-50px"） */
  rootMargin?: string;
  /** 一度だけアニメーションを実行するか */
  triggerOnce?: boolean;
};

/**
 * スクロールアニメーションセクションのProps
 */
type ScrollAnimationSectionProps = {
  /** 子要素 */
  children: ReactNode;
  /** 追加のCSSクラス */
  className?: string;
};

/**
 * Intersection Observer を使用したスクロールアニメーションフック
 *
 * @internal
 */
function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      // 既存のオブザーバーをクリーンアップ
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;

          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce) {
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current = observer;
      observer.observe(element);
    },
    [threshold, rootMargin, triggerOnce]
  );

  return { ref, isVisible };
}

/**
 * スクロールアニメーション付きセクションコンポーネント
 *
 * 要素がビューポートに入ったときに下からふわっと浮き上がるエフェクトを適用
 *
 * @example
 * ```tsx
 * <ScrollAnimationSection className="py-24 px-6">
 *   <div>コンテンツ</div>
 * </ScrollAnimationSection>
 * ```
 */
export function ScrollAnimationSection({
  children,
  className,
}: ScrollAnimationSectionProps) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      data-testid="scroll-animation-section"
      className={cn("scroll-animate", isVisible && "is-visible", className)}
    >
      {children}
    </section>
  );
}
