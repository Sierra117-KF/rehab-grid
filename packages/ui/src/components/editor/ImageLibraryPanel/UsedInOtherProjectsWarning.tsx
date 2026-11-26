/**
 * 他の指導箋で使われている画像を削除するときの警告表示
 */

import { AlertTriangle } from "lucide-react";
import { type ReactNode } from "react";

/**
 * UsedInOtherProjectsWarning の Props
 */
type UsedInOtherProjectsWarningProps = {
  /** 警告文 */
  children: ReactNode;
};

/**
 * 削除確認ダイアログ内に出す、他の指導箋で使われている画像の警告
 */
export function UsedInOtherProjectsWarning({
  children,
}: UsedInOtherProjectsWarningProps) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <span>{children}</span>
    </p>
  );
}
