import {
  ANNOTATION_CLEAR_LABEL,
  ANNOTATION_TOOL_ARROW_LABEL,
  ANNOTATION_UNDO_LABEL,
  BUTTON_CANCEL,
  IMAGE_EDIT_CROP_TOGGLE_LABEL,
  IMAGE_EDIT_FLIP_PANELS_LABEL,
  IMAGE_EDIT_FLIP_WHOLE_LABEL,
  IMAGE_EDIT_LABEL,
  IMAGE_EDIT_SAVE_LABEL,
  IMAGE_EDIT_ZOOM_LABEL,
} from "@rehab-grid/core/lib/constants";
import { type EditableImage } from "@rehab-grid/core/utils/imageEdit";
import {
  ImageEditModal,
  type ImageEditModalProps,
} from "@rehab-grid/ui/components/editor/ImageEditModal";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * テスト用の画像を生成（描画はモックするため中身は空の Canvas でよい）
 */
function createImage(): EditableImage {
  return {
    source: document.createElement("canvas"),
    width: 1000,
    height: 600,
  };
}

/** 向きを変えたあとの画像（applyOrientation のモックが返す） */
const FLIPPED_IMAGE = createImage();

const { mockApplyOrientation, mockDrawEditedImage } = vi.hoisted(() => ({
  mockApplyOrientation: vi.fn(),
  mockDrawEditedImage: vi.fn(),
}));

/**
 * Canvas への描画（jsdom では Canvas API が使えない）だけをモックし、座標計算は実装を使う
 */
vi.mock(import("@rehab-grid/core/utils/imageEdit"), async (importOriginal) => ({
  ...(await importOriginal()),
  applyOrientation: mockApplyOrientation,
  drawEditedImage: mockDrawEditedImage,
}));

/**
 * ImageEditModal のセットアップヘルパー
 */
function setupModal(
  overrides: Partial<ImageEditModalProps> = {}
): ImageEditModalProps {
  const props: ImageEditModalProps = {
    image: createImage(),
    onClose: vi.fn(),
    onSave: vi.fn(async () => Promise.resolve()),
    ...overrides,
  };
  render(<ImageEditModal {...props} />);
  return props;
}

/**
 * プレビュー上でドラッグして注釈を描く
 *
 * @remarks
 * jsdom ではレイアウトが計算されないため、プレビューの位置と大きさを固定する
 */
function drawOnPreview(from: [number, number], to: [number, number]) {
  const preview = screen.getByRole("img", { name: "編集中の画像" });
  vi.spyOn(preview, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 500, height: 300 })
  );
  fireEvent.pointerDown(preview, { clientX: from[0], clientY: from[1], pointerId: 1 });
  fireEvent.pointerMove(preview, { clientX: to[0], clientY: to[1], pointerId: 1 });
  fireEvent.pointerUp(preview, { clientX: to[0], clientY: to[1], pointerId: 1 });
}

describe("ImageEditModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyOrientation.mockReturnValue(FLIPPED_IMAGE);
    // jsdom にはポインターキャプチャがないため空の実装を置く
    HTMLElement.prototype.setPointerCapture = vi.fn();
  });

  it("タイトルとプレビューを表示し、プレビューは保存と同じ描画関数で描く", () => {
    const props = setupModal();

    expect(
      screen.getByRole("dialog", { name: IMAGE_EDIT_LABEL })
    ).toBeInTheDocument();
    expect(mockDrawEditedImage).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      props.image,
      null,
      [],
      expect.any(Number),
      true
    );
  });

  it("何も編集していないときは保存できない", () => {
    setupModal();

    expect(
      screen.getByRole("button", { name: IMAGE_EDIT_SAVE_LABEL })
    ).toBeDisabled();
  });

  it.each([
    [IMAGE_EDIT_FLIP_WHOLE_LABEL, "flipWhole"],
    [IMAGE_EDIT_FLIP_PANELS_LABEL, "flipPanels"],
  ])("「%s」で %s を適用し、保存すると向きを変えた画像が渡される", async (label, operation) => {
    const user = userEvent.setup();
    const props = setupModal();

    await user.click(screen.getByRole("button", { name: label }));
    await user.click(screen.getByRole("button", { name: IMAGE_EDIT_SAVE_LABEL }));

    expect(mockApplyOrientation).toHaveBeenCalledWith(props.image, operation);
    expect(props.onSave).toHaveBeenCalledWith({
      image: FLIPPED_IMAGE,
      crop: null,
      annotations: [],
    });
  });

  it("トリミングを有効にすると拡大率を選べ、保存時に中央の枠が渡される", async () => {
    const user = userEvent.setup();
    const props = setupModal();

    expect(screen.queryByLabelText(IMAGE_EDIT_ZOOM_LABEL)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: IMAGE_EDIT_CROP_TOGGLE_LABEL })
    );
    fireEvent.change(screen.getByLabelText(IMAGE_EDIT_ZOOM_LABEL), {
      target: { value: "2" },
    });
    await user.click(screen.getByRole("button", { name: IMAGE_EDIT_SAVE_LABEL }));

    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        crop: { zoom: 2, centerX: 0.5, centerY: 0.5 },
      })
    );
  });

  it("注釈ツールを選んでドラッグすると注釈が描かれ、1つ戻す・全消去で消せる", async () => {
    const user = userEvent.setup();
    const props = setupModal();
    const undoButton = screen.getByRole("button", { name: ANNOTATION_UNDO_LABEL });
    const clearButton = screen.getByRole("button", { name: ANNOTATION_CLEAR_LABEL });
    expect(undoButton).toBeDisabled();
    expect(clearButton).toBeDisabled();

    const arrowButton = screen.getByRole("button", {
      name: ANNOTATION_TOOL_ARROW_LABEL,
    });
    await user.click(arrowButton);
    expect(arrowButton).toHaveAttribute("aria-pressed", "true");

    drawOnPreview([50, 30], [250, 150]);
    drawOnPreview([100, 100], [300, 200]);
    expect(undoButton).toBeEnabled();

    await user.click(undoButton);
    await user.click(screen.getByRole("button", { name: IMAGE_EDIT_SAVE_LABEL }));

    // プレビュー 500x300 は画像 1000x600 全体に対応する
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        annotations: [
          expect.objectContaining({
            shape: "arrow",
            start: { x: 0.1, y: 0.1 },
            end: { x: 0.5, y: 0.5 },
          }),
        ],
      })
    );

    drawOnPreview([50, 30], [250, 150]);
    await user.click(clearButton);
    expect(clearButton).toBeDisabled();
  });

  it("ツールを選んでいないときのドラッグでは注釈を描かない", async () => {
    const user = userEvent.setup();
    setupModal();

    drawOnPreview([50, 30], [250, 150]);

    expect(
      screen.getByRole("button", { name: ANNOTATION_UNDO_LABEL })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: IMAGE_EDIT_SAVE_LABEL })
    ).toBeDisabled();
    // 選択中のツールをもう一度押すと解除される
    const arrowButton = screen.getByRole("button", {
      name: ANNOTATION_TOOL_ARROW_LABEL,
    });
    await user.click(arrowButton);
    await user.click(arrowButton);
    expect(arrowButton).toHaveAttribute("aria-pressed", "false");
  });

  it("キャンセルで onClose が呼ばれ、保存はされない", async () => {
    const user = userEvent.setup();
    const props = setupModal();

    await user.click(screen.getByRole("button", { name: BUTTON_CANCEL }));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
  });
});
