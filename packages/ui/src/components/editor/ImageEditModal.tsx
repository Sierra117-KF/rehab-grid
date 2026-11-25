"use client";

/**
 * 画像編集モーダル
 *
 * カードの画像を左右反転（全体／2 コマずつ）・90° 回転・5:3 でトリミングし、
 * 矢印・丸・四角の注釈を描き込む。結果は呼び出し側が新しい画像として保存する（元の画像は残る）。
 */

import {
  ANNOTATION_CLEAR_LABEL,
  ANNOTATION_COLOR_LABEL,
  ANNOTATION_COLORS,
  ANNOTATION_STROKE_LABEL,
  ANNOTATION_STROKE_WIDTHS,
  ANNOTATION_TOOL_ARROW_LABEL,
  ANNOTATION_TOOL_CIRCLE_LABEL,
  ANNOTATION_TOOL_RECT_LABEL,
  ANNOTATION_UNDO_LABEL,
  BUTTON_CANCEL,
  IMAGE_EDIT_ANNOTATION_HEADING,
  IMAGE_EDIT_ANNOTATION_HINT,
  IMAGE_EDIT_CROP_HEADING,
  IMAGE_EDIT_CROP_HINT,
  IMAGE_EDIT_CROP_TOGGLE_LABEL,
  IMAGE_EDIT_DESCRIPTION,
  IMAGE_EDIT_FLIP_PANELS_HINT,
  IMAGE_EDIT_FLIP_PANELS_LABEL,
  IMAGE_EDIT_FLIP_WHOLE_LABEL,
  IMAGE_EDIT_LABEL,
  IMAGE_EDIT_MAX_ZOOM,
  IMAGE_EDIT_ORIENTATION_HEADING,
  IMAGE_EDIT_PREVIEW_MAX_SIZE,
  IMAGE_EDIT_ROTATE_LABEL,
  IMAGE_EDIT_SAVE_LABEL,
  IMAGE_EDIT_SAVING_LABEL,
  IMAGE_EDIT_ZOOM_LABEL,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  type Annotation,
  type AnnotationShape,
  applyOrientation,
  clampCrop,
  type CropState,
  drawEditedImage,
  type EditableImage,
  getCropRect,
  isTinyAnnotation,
  type OrientationOperation,
  panCrop,
  transformAnnotation,
  transformCrop,
  viewToImagePoint,
} from "@rehab-grid/core/utils/imageEdit";
import { Checkbox } from "@rehab-grid/ui/components/ui/checkbox";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import {
  Circle,
  Eraser,
  FlipHorizontal2,
  MoveUpRight,
  RotateCw,
  Square,
  Undo2,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

/**
 * 保存する編集内容
 */
export type ImageEditResult = {
  /** 向きを変えたあとの画像 */
  image: EditableImage;
  /** トリミング（null ならトリミングしない） */
  crop: CropState | null;
  /** 注釈 */
  annotations: Annotation[];
};

/**
 * ImageEditModal コンポーネントの Props
 */
export type ImageEditModalProps = {
  /** 編集の元になる画像（いまカードに設定されている画像） */
  image: EditableImage;
  /** モーダルを閉じるときのコールバック */
  onClose: () => void;
  /**
   * 保存ボタンが押されたときのコールバック
   *
   * @remarks
   * 保存（エンコード・IndexedDB への保存・カードへの反映）とエラー表示は呼び出し側で行う。
   * 完了するまで保存ボタンを押せなくする
   */
  onSave: (result: ImageEditResult) => Promise<void>;
};

/** 注釈ツールの選択肢 */
const ANNOTATION_TOOLS: {
  shape: AnnotationShape;
  label: string;
  icon: typeof Circle;
}[] = [
  { shape: "arrow", label: ANNOTATION_TOOL_ARROW_LABEL, icon: MoveUpRight },
  { shape: "circle", label: ANNOTATION_TOOL_CIRCLE_LABEL, icon: Circle },
  { shape: "rect", label: ANNOTATION_TOOL_RECT_LABEL, icon: Square },
];

/** トリミングを始めたときの初期状態（画像の中央に最大の枠） */
const INITIAL_CROP: CropState = { zoom: 1, centerX: 0.5, centerY: 0.5 };

/** 拡大率スライダーの刻み */
const ZOOM_STEP = 0.05;

/**
 * プレビュー上のポインター位置を 0〜1 の割合で求める
 */
function getViewPosition(event: React.PointerEvent<HTMLCanvasElement>): {
  x: number;
  y: number;
} {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

/**
 * セクションの見出し
 */
function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="text-sm font-semibold">
      {children}
    </h3>
  );
}

/**
 * 画像編集モーダル
 *
 * @remarks
 * 開いている間だけ描画する（閉じるときはアンマウントし、編集状態を破棄する）
 */
export function ImageEditModal({ image: sourceImage, onClose, onSave }: ImageEditModalProps) {
  const orientationHeadingId = useId();
  const cropHeadingId = useId();
  const annotationHeadingId = useId();
  const cropToggleId = useId();
  const zoomId = useId();

  const [image, setImage] = useState(sourceImage);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [tool, setTool] = useState<AnnotationShape | null>(null);
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0].value);
  const [strokeRatio, setStrokeRatio] = useState<number>(
    ANNOTATION_STROKE_WIDTHS[1].ratio
  );
  const [isSaving, setIsSaving] = useState(false);

  // トリミング枠をドラッグで動かしている間の直前のポインター位置（描画に関係しないので ref で持つ）
  const panOriginRef = useRef<{ x: number; y: number } | null>(null);

  const cropRect = getCropRect(image.width, image.height, crop);
  const isEdited =
    image !== sourceImage || crop !== null || annotations.length > 0;

  // プレビューの Canvas は編集状態が変わるたびに描き直す必要がある。
  // React 19 の ref コールバックは依存が変わるたびに呼び直されるため、
  // useEffect を使わずに DOM（Canvas）への描画だけをここで行う。保存時と同じ描画関数を使う
  const previewRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (canvas === null) return;
      drawEditedImage(
        canvas,
        image,
        crop,
        draft === null ? annotations : [...annotations, draft],
        IMAGE_EDIT_PREVIEW_MAX_SIZE,
        // 拡大してトリミング枠が小さくなっても、プレビューの表示サイズが変わらないようにする
        true
      );
    },
    [image, crop, annotations, draft]
  );

  /**
   * 向きを変える（注釈とトリミング枠も画像の内容に合わせて動かす）
   */
  const handleOrientation = (operation: OrientationOperation) => {
    const next = applyOrientation(image, operation);
    setImage(next);
    setAnnotations(annotations.map((a) => transformAnnotation(a, operation)));
    if (crop !== null) {
      setCrop(
        clampCrop(transformCrop(crop, operation), next.width, next.height)
      );
    }
  };

  /**
   * トリミングの有無を切り替える
   */
  const handleCropToggle = (checked: boolean) => {
    setCrop(checked ? clampCrop(INITIAL_CROP, image.width, image.height) : null);
  };

  /**
   * 拡大率を変える
   */
  const handleZoomChange = (zoom: number) => {
    if (crop === null) return;
    setCrop(clampCrop({ ...crop, zoom }, image.width, image.height));
  };

  /**
   * ポインターを押したとき：注釈ツールを選んでいれば描き始め、そうでなければトリミング枠を動かし始める
   */
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSaving) return;

    if (tool !== null) {
      const view = getViewPosition(event);
      const point = viewToImagePoint(
        view.x,
        view.y,
        cropRect,
        image.width,
        image.height
      );
      event.currentTarget.setPointerCapture(event.pointerId);
      setDraft({ shape: tool, color, strokeRatio, start: point, end: point });
      return;
    }

    if (crop !== null) {
      event.currentTarget.setPointerCapture(event.pointerId);
      panOriginRef.current = { x: event.clientX, y: event.clientY };
    }
  };

  /**
   * ポインターを動かしたとき
   */
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (draft !== null) {
      const view = getViewPosition(event);
      setDraft({
        ...draft,
        end: viewToImagePoint(view.x, view.y, cropRect, image.width, image.height),
      });
      return;
    }

    const origin = panOriginRef.current;
    if (origin !== null && crop !== null) {
      // 画面上の移動量を、トリミング前の画像の px に換算する
      const scale =
        cropRect.width / event.currentTarget.getBoundingClientRect().width;
      setCrop(
        panCrop(
          crop,
          (event.clientX - origin.x) * scale,
          (event.clientY - origin.y) * scale,
          image.width,
          image.height
        )
      );
      panOriginRef.current = { x: event.clientX, y: event.clientY };
    }
  };

  /**
   * ポインターを離したとき：描いた注釈を確定する（クリックだけの小さな注釈は捨てる）
   */
  const handlePointerUp = () => {
    if (draft !== null && !isTinyAnnotation(draft, image.width, image.height)) {
      setAnnotations([...annotations, draft]);
    }
    setDraft(null);
    panOriginRef.current = null;
  };

  /**
   * ポインター操作が中断されたとき：描きかけの注釈は捨てる
   */
  const handlePointerCancel = () => {
    setDraft(null);
    panOriginRef.current = null;
  };

  /**
   * 保存する
   */
  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ image, crop, annotations });
    setIsSaving(false);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        // 外側クリックや Escape で編集内容を失わないようにする（閉じるのは × かキャンセル）
        preventDismiss
        // 列を minmax(0,1fr) にして、プレビュー Canvas の実寸（最大 800px）でモーダルが画面からはみ出さないようにする
        className="max-h-[95dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>{IMAGE_EDIT_LABEL}</DialogTitle>
          <DialogDescription>{IMAGE_EDIT_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
          {/* プレビュー（保存結果と同じ描画） */}
          <div className="flex min-h-48 items-center justify-center rounded-lg bg-muted/40 p-2">
            <canvas
              ref={previewRef}
              role="img"
              aria-label="編集中の画像"
              className={cn(
                "max-h-[55dvh] max-w-full touch-none select-none shadow-sm",
                tool !== null
                  ? "cursor-crosshair"
                  : crop !== null
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-default"
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            />
          </div>

          {/* 操作パネル */}
          <div className="flex flex-col gap-5">
            {/* 向き */}
            <section
              aria-labelledby={orientationHeadingId}
              className="flex flex-col gap-2"
            >
              <SectionHeading id={orientationHeadingId}>
                {IMAGE_EDIT_ORIENTATION_HEADING}
              </SectionHeading>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                disabled={isSaving}
                onClick={() => handleOrientation("flipWhole")}
              >
                <FlipHorizontal2 className="size-4" />
                {IMAGE_EDIT_FLIP_WHOLE_LABEL}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                title={IMAGE_EDIT_FLIP_PANELS_HINT}
                disabled={isSaving}
                onClick={() => handleOrientation("flipPanels")}
              >
                <FlipHorizontal2 className="size-4" />
                {IMAGE_EDIT_FLIP_PANELS_LABEL}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {IMAGE_EDIT_FLIP_PANELS_HINT}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                disabled={isSaving}
                onClick={() => handleOrientation("rotate")}
              >
                <RotateCw className="size-4" />
                {IMAGE_EDIT_ROTATE_LABEL}
              </Button>
            </section>

            {/* トリミング */}
            <section
              aria-labelledby={cropHeadingId}
              className="flex flex-col gap-2"
            >
              <SectionHeading id={cropHeadingId}>
                {IMAGE_EDIT_CROP_HEADING}
              </SectionHeading>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={cropToggleId}
                  checked={crop !== null}
                  disabled={isSaving}
                  onCheckedChange={(checked) =>
                    handleCropToggle(checked === true)
                  }
                />
                <Label htmlFor={cropToggleId} className="text-sm font-normal">
                  {IMAGE_EDIT_CROP_TOGGLE_LABEL}
                </Label>
              </div>
              {crop !== null ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={zoomId} className="shrink-0 text-xs">
                      {IMAGE_EDIT_ZOOM_LABEL}
                    </Label>
                    <input
                      id={zoomId}
                      type="range"
                      min={1}
                      max={IMAGE_EDIT_MAX_ZOOM}
                      step={ZOOM_STEP}
                      value={crop.zoom}
                      disabled={isSaving}
                      onChange={(e) => handleZoomChange(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {IMAGE_EDIT_CROP_HINT}
                  </p>
                </>
              ) : null}
            </section>

            {/* 注釈 */}
            <section
              aria-labelledby={annotationHeadingId}
              className="flex flex-col gap-2"
            >
              <SectionHeading id={annotationHeadingId}>
                {IMAGE_EDIT_ANNOTATION_HEADING}
              </SectionHeading>
              <div className="grid grid-cols-3 gap-1.5">
                {ANNOTATION_TOOLS.map((annotationTool) => (
                  <Button
                    key={annotationTool.shape}
                    variant={
                      tool === annotationTool.shape ? "default" : "outline"
                    }
                    size="sm"
                    className="gap-1"
                    aria-pressed={tool === annotationTool.shape}
                    disabled={isSaving}
                    // 選択中のツールをもう一度押すと解除する（トリミング枠を動かせるようになる）
                    onClick={() =>
                      setTool(
                        tool === annotationTool.shape
                          ? null
                          : annotationTool.shape
                      )
                    }
                  >
                    <annotationTool.icon className="size-3.5" />
                    {annotationTool.label}
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {IMAGE_EDIT_ANNOTATION_HINT}
              </p>

              <div
                role="group"
                aria-label={ANNOTATION_COLOR_LABEL}
                className="flex items-center gap-2"
              >
                <span className="w-8 text-xs">{ANNOTATION_COLOR_LABEL}</span>
                {ANNOTATION_COLORS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "size-7 rounded-full border-2 border-white transition-transform",
                      color === value
                        ? "scale-110 ring-2 ring-primary ring-offset-2"
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: value }}
                    aria-label={label}
                    aria-pressed={color === value}
                    disabled={isSaving}
                    onClick={() => setColor(value)}
                  />
                ))}
              </div>

              <div
                role="group"
                aria-label={ANNOTATION_STROKE_LABEL}
                className="flex items-center gap-2"
              >
                <span className="w-8 text-xs">{ANNOTATION_STROKE_LABEL}</span>
                {ANNOTATION_STROKE_WIDTHS.map(({ ratio, label }) => (
                  <Button
                    key={ratio}
                    variant={strokeRatio === ratio ? "default" : "outline"}
                    size="sm"
                    className="h-7 flex-1 px-0"
                    aria-pressed={strokeRatio === ratio}
                    disabled={isSaving}
                    onClick={() => setStrokeRatio(ratio)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  disabled={isSaving || annotations.length === 0}
                  onClick={() => setAnnotations(annotations.slice(0, -1))}
                >
                  <Undo2 className="size-3.5" />
                  {ANNOTATION_UNDO_LABEL}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  disabled={isSaving || annotations.length === 0}
                  onClick={() => setAnnotations([])}
                >
                  <Eraser className="size-3.5" />
                  {ANNOTATION_CLEAR_LABEL}
                </Button>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>
              {BUTTON_CANCEL}
            </Button>
          </DialogClose>
          <Button
            disabled={!isEdited || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? IMAGE_EDIT_SAVING_LABEL : IMAGE_EDIT_SAVE_LABEL}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
