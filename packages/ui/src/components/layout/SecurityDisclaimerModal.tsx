"use client";

import {
  BUTTON_CANCEL,
  SECURITY_DISCLAIMER_AGREE_BUTTON,
  SECURITY_DISCLAIMER_CHECKBOX_LABEL,
  SECURITY_DISCLAIMER_DEVICE_DESCRIPTION,
  SECURITY_DISCLAIMER_DEVICE_TITLE,
  SECURITY_DISCLAIMER_INCOGNITO_DESCRIPTION,
  SECURITY_DISCLAIMER_INCOGNITO_TITLE,
  SECURITY_DISCLAIMER_PRIVACY_DESCRIPTION,
  SECURITY_DISCLAIMER_PRIVACY_TITLE,
  SECURITY_DISCLAIMER_SCROLL_HINT,
  SECURITY_DISCLAIMER_SECURITY_DESCRIPTION,
  SECURITY_DISCLAIMER_SECURITY_TITLE,
  SECURITY_DISCLAIMER_TERMS_LINK,
  SECURITY_DISCLAIMER_TITLE,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { Checkbox } from "@rehab-grid/ui/components/ui/checkbox";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import {
  AlertTriangle,
  ArrowRight,
  EyeOff,
  Monitor,
  ShieldAlert,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useState } from "react";

// ==============================================================================
// 型定義
// ==============================================================================

/**
 * SecurityDisclaimerModalコンポーネントのProps
 */
export type SecurityDisclaimerModalProps = {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 同意ボタンクリック時のハンドラ */
  onAgree: () => void;
  /** キャンセルボタンクリック時のハンドラ（省略時はモーダルを閉じるのみ） */
  onCancel?: () => void;
  /** true の場合、外側クリックや Escape キーでモーダルが閉じない */
  preventDismiss?: boolean;
  /** キャンセルボタンを表示するかどうか（デフォルト: true） */
  showCancelButton?: boolean;
};

/**
 * 注意事項アイテムの型
 */
type DisclaimerItem = {
  /** アイコン */
  icon: ReactNode;
  /** タイトル */
  title: string;
  /** 説明文 */
  description: string;
  /** ハイライト表示するかどうか */
  isHighlighted?: boolean;
};

/**
 * DisclaimerItemCardコンポーネントのProps
 */
type DisclaimerItemCardProps = {
  /** 表示する注意事項アイテム */
  item: DisclaimerItem;
};

// ==============================================================================
// 定数
// ==============================================================================

/**
 * 注意事項リスト
 */
const DISCLAIMER_ITEMS: DisclaimerItem[] = [
  {
    icon: <UserX className="size-5" />,
    title: SECURITY_DISCLAIMER_PRIVACY_TITLE,
    description: SECURITY_DISCLAIMER_PRIVACY_DESCRIPTION,
    isHighlighted: true,
  },
  {
    icon: <ShieldAlert className="size-5" />,
    title: SECURITY_DISCLAIMER_SECURITY_TITLE,
    description: SECURITY_DISCLAIMER_SECURITY_DESCRIPTION,
  },
  {
    icon: <Monitor className="size-5" />,
    title: SECURITY_DISCLAIMER_DEVICE_TITLE,
    description: SECURITY_DISCLAIMER_DEVICE_DESCRIPTION,
  },
  {
    icon: <EyeOff className="size-5" />,
    title: SECURITY_DISCLAIMER_INCOGNITO_TITLE,
    description: SECURITY_DISCLAIMER_INCOGNITO_DESCRIPTION,
  },
];

// ==============================================================================
// サブコンポーネント: DisclaimerItemCard
// ==============================================================================

/**
 * 注意事項カードコンポーネント
 *
 * 個々の注意事項を表示するカード
 */
function DisclaimerItemCard({ item }: DisclaimerItemCardProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3 transition-colors",
        item.isHighlighted
          ? "border-amber-500/30 bg-yellow-100/50 dark:bg-yellow-900/20"
          : "border-border/50 bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          item.isHighlighted
            ? "bg-red-500/20 text-red-500"
            : "bg-muted text-muted-foreground",
        )}
      >
        {item.icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          {item.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>
    </div>
  );
}

// ==============================================================================
// メインコンポーネント: SecurityDisclaimerModal
// ==============================================================================

/**
 * セキュリティ免責モーダルコンポーネント
 *
 * エディタページへ遷移する前に、セキュリティに関する注意事項を表示する
 */
export function SecurityDisclaimerModal({
  open,
  onOpenChange: handleOpenChange,
  onAgree: handleAgree,
  onCancel: handleCancel,
  preventDismiss = false,
  showCancelButton = true,
}: SecurityDisclaimerModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  /**
   * モーダルの開閉状態変更ハンドラ
   *
   * モーダルが閉じる際にチェック状態をリセットする
   */
  const handleDialogOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setIsConfirmed(false);
      }
      handleOpenChange(newOpen);
    },
    [handleOpenChange],
  );

  /**
   * チェックボックスの状態変更ハンドラ
   */
  const handleCheckedChange = useCallback(
    (checked: boolean | "indeterminate") => {
      setIsConfirmed(checked === true);
    },
    [],
  );

  /**
   * 同意ボタンクリックハンドラ
   *
   * 次回モーダルを開いたときのためにチェック状態をリセットしてから、
   * 親コンポーネントへ同意を通知する
   */
  const handleAgreeClick = useCallback(() => {
    setIsConfirmed(false);
    handleAgree();
  }, [handleAgree]);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="flex max-h-[90dvh] max-w-lg flex-col"
        showCloseButton={false}
        preventDismiss={preventDismiss}
        aria-describedby={undefined}
      >
        {/* ヘッダー（固定） */}
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <AlertTriangle className="size-6 text-amber-500" />
            {SECURITY_DISCLAIMER_TITLE}
            <AlertTriangle className="size-6 text-amber-500" />
          </DialogTitle>
        </DialogHeader>

        {/* 注意事項リスト（スクロール可能） */}
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {SECURITY_DISCLAIMER_SCROLL_HINT}
          </p>
          <div className="space-y-2">
            {DISCLAIMER_ITEMS.map((item) => (
              <DisclaimerItemCard key={item.title} item={item} />
            ))}
          </div>
        </div>

        {/* フッター（固定） */}
        <div className="shrink-0 space-y-6 pt-4">
          {/* 利用規約リンク */}
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/terms"
              className="text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => handleDialogOpenChange(false)}
            >
              {SECURITY_DISCLAIMER_TERMS_LINK}
            </Link>
          </p>

          {/* 確認チェックボックス */}
          <div className="flex items-center justify-center gap-2">
            <Checkbox
              id="security-disclaimer-confirm"
              checked={isConfirmed}
              onCheckedChange={handleCheckedChange}
            />
            <Label
              htmlFor="security-disclaimer-confirm"
              className="cursor-pointer text-sm"
            >
              {SECURITY_DISCLAIMER_CHECKBOX_LABEL}
            </Label>
          </div>

          <DialogFooter
            className={showCancelButton ? undefined : "justify-center"}
          >
            {showCancelButton ? (
              <Button
                variant="outline"
                onClick={() => {
                  handleDialogOpenChange(false);
                  handleCancel?.();
                }}
              >
                {BUTTON_CANCEL}
              </Button>
            ) : null}
            <Button
              onClick={handleAgreeClick}
              disabled={!isConfirmed}
              className="bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-600/50"
            >
              {SECURITY_DISCLAIMER_AGREE_BUTTON}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
