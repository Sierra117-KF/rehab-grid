/**
 * @rehab-grid/ui パッケージのバレルエクスポート
 *
 * 共通UIコンポーネント（shadcn/ui、ラッパー、エディタ、レイアウト、PDF）を
 * 一括でエクスポートします。
 *
 * 注意: ui/ と wrapped/ で同名のコンポーネントがある場合、
 * wrapped/ のカスタマイズ版を優先してエクスポートします。
 */

// ========================================
// editor コンポーネント
// ========================================
export { Canvas } from "./components/editor/Canvas";
export { EditorHeader } from "./components/editor/EditorHeader";
export { GridSelectDialog } from "./components/editor/GridSelectDialog";
export { ImageLibraryPanel } from "./components/editor/ImageLibraryPanel";
export { PdfPreviewModal } from "./components/editor/PdfPreviewModal";
export { PrecautionSnippetDialog } from "./components/editor/PrecautionSnippetDialog";
export { PropertyPanel } from "./components/editor/PropertyPanel";
export { TemplateSelectModal } from "./components/editor/TemplateSelectModal";

// ========================================
// layout コンポーネント
// ========================================
export { DisclaimerModalProvider } from "./components/layout/DisclaimerModalProvider";
export { FAQ, FAQ_ITEMS } from "./components/layout/FAQ";
export { Footer } from "./components/layout/Footer";
export { Header } from "./components/layout/Header";
export { MobileDropdownMenu } from "./components/layout/MobileDropdownMenu";
export { MobileFloatingHeader } from "./components/layout/MobileFloatingHeader";
export { MobileSidebar } from "./components/layout/MobileSidebar";
export { RecentUpdates } from "./components/layout/RecentUpdates";
export { ScrollAnimationSection } from "./components/layout/ScrollAnimationSection";
export { SecurityDisclaimerModal } from "./components/layout/SecurityDisclaimerModal";

// ========================================
// pdf コンポーネント
// ========================================
export { TrainingSheetPDF } from "./components/pdf/TrainingSheetPDF";

// ========================================
// ui コンポーネント（shadcn/ui ベース）
// wrapped/ に対応がないコンポーネントのみエクスポート
// ========================================
export * from "./components/ui/card";
export * from "./components/ui/checkbox";
export * from "./components/ui/hover-card";
export * from "./components/ui/select";

// ui/ の buttonVariants はラッパー側で必要なため明示的にエクスポート
export { buttonVariants } from "./components/ui/button";

// ========================================
// wrapped コンポーネント（カスタマイズ層）
// アプリケーションコードでは原則こちらを使用
// ========================================
export * from "./components/wrapped/AlertDialog";
export * from "./components/wrapped/Button";
export * from "./components/wrapped/Dialog";
export * from "./components/wrapped/DropdownMenu";
export { ExternalLink } from "./components/wrapped/ExternalLink";
export * from "./components/wrapped/Input";
export * from "./components/wrapped/Label";
export * from "./components/wrapped/Textarea";
export { Toaster } from "./components/wrapped/Toaster";
