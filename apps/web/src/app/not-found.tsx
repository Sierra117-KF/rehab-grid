"use client";

import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** リダイレクトまでの秒数 */
const REDIRECT_DELAY_SECONDS = 5;

/**
 * 404 Not Foundページ
 *
 * 存在しないページにアクセスした際に表示されるエラーページ。
 * 5秒後に自動的にトップページへリダイレクトし、
 * 手動でのナビゲーションリンクも提供する。
 *
 * @remarks
 * - useEffectはタイマー制御（システム制御）のため例外として使用
 * - Header/Footerを含まないシンプルな全画面デザイン
 */
export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);

  // カウントダウン & 自動リダイレクト処理
  // 注: タイマー制御はシステム制御のため、useEffectの例外として許容
  useEffect(() => {
    // 1秒ごとにカウントダウン
    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 5秒後にリダイレクト
    const timeoutId = setTimeout(() => {
      router.push("/");
    }, REDIRECT_DELAY_SECONDS * 1000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex items-center justify-center">
      {/* 背景ノイズ & 装飾 */}
      <div className="fixed inset-0 z-[-1] bg-noise" />
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px] mix-blend-multiply opacity-40" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-secondary/10 blur-[100px] mix-blend-multiply opacity-30" />
      </div>

      {/* メインコンテンツ */}
      <main className="relative px-6 py-12 text-center">
        {/* エラータグ */}
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-destructive/30 bg-destructive/5 text-sm font-mono text-destructive tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
            Page Not Found
          </span>
        </div>

        {/* 404 大型表示 */}
        <h1 className="mt-8 text-[10rem] md:text-[14rem] lg:text-[18rem] font-black leading-none tracking-tighter animate-fade-up animate-fade-up-delay-1">
          <span className="text-transparent bg-clip-text bg-linear-to-br from-primary via-primary-light to-primary">
            404
          </span>
        </h1>

        {/* メッセージ */}
        <div className="animate-fade-up animate-fade-up-delay-2 space-y-2">
          <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            ページが見つかりません
          </p>
          <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
            お探しのページは存在しないか、移動した可能性があります
          </p>
        </div>

        {/* カウントダウン & ナビゲーション */}
        <div className="mt-10 space-y-6 animate-fade-up animate-fade-up-delay-3">
          {/* カウントダウン表示 */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">
                <span className="font-mono text-lg font-bold text-primary tabular-nums">
                  {countdown}
                </span>
                秒後にトップページへ移動します
              </span>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="w-full max-w-xs mx-auto h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${((REDIRECT_DELAY_SECONDS - countdown) / REDIRECT_DELAY_SECONDS) * 100}%`,
              }}
            />
          </div>

          {/* ナビゲーションボタン */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/">
                <Home className="mr-2 size-4" />
                トップページへ戻る
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 size-4" />
              前のページへ
            </Button>
          </div>
        </div>

        {/* 装飾要素 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
          <div className="absolute inset-0 border border-dashed border-border/30 rounded-full animate-[spin_60s_linear_infinite]" />
          <div className="absolute inset-8 border border-dashed border-border/20 rounded-full animate-[spin_45s_linear_infinite_reverse]" />
        </div>
      </main>
    </div>
  );
}
