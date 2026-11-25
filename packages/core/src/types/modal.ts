/**
 * モーダルストア関連の型定義
 */

/**
 * ルーター互換インターフェース
 *
 * @remarks
 * Next.js の useRouter と互換性を持たせつつ、テストでのモックを容易にするための型。
 */
export type RouterLike = {
  push: (url: string) => void;
};

/**
 * モーダルの状態を管理するストアの型定義
 */
export type ModalState = {
  /** セキュリティ免責モーダルの開閉状態 */
  isSecurityDisclaimerOpen: boolean;
  /** セキュリティ免責モーダルを開く */
  openSecurityDisclaimer: () => void;
  /** セキュリティ免責モーダルを閉じる */
  closeSecurityDisclaimer: () => void;
  /**
   * セキュリティモーダルの表示が必要かどうかを判定
   *
   * @remarks
   * sessionStorage（タブ単位）と localStorage（時間ベース）を確認し、
   * モーダルを表示すべきかどうかを返す。
   *
   * @returns モーダル表示が必要な場合は true
   */
  checkDisclaimerRequired: () => boolean;
  /**
   * セキュリティモーダルへの同意を記録
   *
   * @remarks
   * sessionStorage にセッションフラグを、localStorage にタイムスタンプを保存する。
   */
  recordDisclaimerConsent: () => void;
  /**
   * エディタへの遷移を試行
   *
   * @remarks
   * モーダル表示が必要な場合はモーダルを開き、不要な場合は直接エディタへ遷移する。
   *
   * @param router - ルーターオブジェクト（Next.js の useRouter()）
   */
  tryNavigateToEditor: (router: RouterLike) => void;
  /** デザイン設定ダイアログの開閉状態 */
  isDesignSettingsOpen: boolean;
  /** デザイン設定ダイアログを開いたときに表示するセクション（null は先頭） */
  designSettingsSection: DesignSettingsSection | null;
  /**
   * デザイン設定ダイアログの開閉を設定
   *
   * @remarks
   * ヘッダー以外（Canvas 等）からも開けるよう、ローカル state ではなくストアで持つ
   *
   * @param open - 開くなら true
   * @param section - 開いたときに表示するセクション（省略時は先頭）
   */
  setDesignSettingsOpen: (
    open: boolean,
    section?: DesignSettingsSection
  ) => void;
};

/**
 * デザイン設定ダイアログのセクション（開いたときにそこまでスクロールする）
 *
 * - sheet: ヘッダー・チェック表（PDF）
 */
export type DesignSettingsSection = "sheet";
