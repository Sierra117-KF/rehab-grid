/**
 * ExerciseCardLibraryModal（マイ運動）のユニットテスト
 */
import {
  BUTTON_DELETE,
  createMaxItemCountReachedMessage,
  EXERCISE_CARD_DELETE_SUCCESS_MESSAGE,
  EXERCISE_CARD_EMPTY_MESSAGE,
  EXERCISE_CARD_NO_MATCHES,
  EXERCISE_CARD_SEARCH_LABEL,
  MAX_ITEM_COUNT,
} from "@rehab-grid/core/lib/constants";
import type { ExerciseCardRecord } from "@rehab-grid/core/types";
import { ExerciseCardLibraryModal } from "@rehab-grid/ui/components/editor/ExerciseCardLibraryModal";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUseLiveQuery,
  mockUseCanvasImages,
  mockDeleteExerciseCard,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(),
  mockUseCanvasImages: vi.fn(),
  mockDeleteExerciseCard: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

vi.mock("@/lib/db", () => ({
  listExerciseCards: vi.fn(),
  deleteExerciseCard: mockDeleteExerciseCard,
}));

// カードの画像URL（IndexedDB の読み出しはここでは確かめない）
vi.mock("@/hooks/useCanvasImages", () => ({
  useCanvasImages: mockUseCanvasImages,
}));

vi.mock("next/image", async () => {
  const { mockNextImage } = await import("@/tests/mocks/next-image");
  return mockNextImage;
});

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

/** マイ運動のレコードを作る */
function createCard(
  id: string,
  item: Partial<ExerciseCardRecord["item"]>
): ExerciseCardRecord {
  const title = item.title ?? "運動";
  return {
    id,
    title,
    updatedAt: new Date(2026, 10, 26),
    item: {
      id: `${id}-item`,
      order: 0,
      title,
      imageSource: "",
      description: "",
      ...item,
    },
  };
}

const SQUAT = createCard("card-1", {
  title: "スクワット",
  imageSource: "img-1",
  dosages: { reps: "10回", sets: "3セット", frequency: "" },
});
const BRIDGE = createCard("card-2", {
  title: "ブリッジ",
  description: "お尻を持ち上げる",
});

/** 「スクワット」を追加するボタンの名前（削除ボタンと区別するため、用量まで含める） */
const ADD_SQUAT = /スクワット.*10回/;

/**
 * マイ運動モーダルを開いた状態で描画する
 */
function setupModal({
  cards = [SQUAT, BRIDGE],
  canAdd = true,
}: { cards?: ExerciseCardRecord[]; canAdd?: boolean } = {}) {
  mockUseLiveQuery.mockReturnValue(cards);
  const props = { onOpenChange: vi.fn(), onAdd: vi.fn() };
  render(<ExerciseCardLibraryModal open canAdd={canAdd} {...props} />);
  return props;
}

describe("ExerciseCardLibraryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCanvasImages.mockReturnValue(new Map([["img-1", "blob:squat"]]));
    mockDeleteExerciseCard.mockResolvedValue(undefined);
  });

  it("モーダルが閉じている間は画像URL生成フックに空配列を渡す", () => {
    mockUseLiveQuery.mockReturnValue([SQUAT, BRIDGE]);
    render(
      <ExerciseCardLibraryModal
        open={false}
        onOpenChange={vi.fn()}
        canAdd
        onAdd={vi.fn()}
      />
    );

    expect(mockUseCanvasImages).toHaveBeenCalledWith([]);
  });

  it("保存したマイ運動を、用量（なければ説明）と画像付きで一覧表示する", () => {
    setupModal();

    expect(screen.getByText("スクワット")).toBeInTheDocument();
    expect(screen.getByText("10回 / 3セット")).toBeInTheDocument();
    expect(screen.getByText("お尻を持ち上げる")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ADD_SQUAT })).toContainHTML(
      "blob:squat"
    );
  });

  it("保存したマイ運動がなければ案内を表示する", () => {
    setupModal({ cards: [] });

    expect(screen.getByText(EXERCISE_CARD_EMPTY_MESSAGE)).toBeInTheDocument();
  });

  it("選んだマイ運動のカードを渡してモーダルを閉じる", async () => {
    const user = userEvent.setup();
    const props = setupModal();

    await user.click(screen.getByRole("button", { name: ADD_SQUAT }));

    expect(props.onAdd).toHaveBeenCalledWith(SQUAT.item);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("運動名で絞り込め、一致しなければ案内を表示する", async () => {
    const user = userEvent.setup();
    setupModal();
    const search = screen.getByRole("textbox", {
      name: EXERCISE_CARD_SEARCH_LABEL,
    });

    await user.type(search, "ブリッジ");
    expect(screen.queryByText("スクワット")).not.toBeInTheDocument();
    expect(screen.getByText("ブリッジ")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "腕立て");
    expect(screen.getByText(EXERCISE_CARD_NO_MATCHES)).toBeInTheDocument();
  });

  it("カードが上限に達していれば追加できず、案内を表示する", () => {
    setupModal({ canAdd: false });

    expect(screen.getByRole("button", { name: ADD_SQUAT })).toBeDisabled();
    expect(
      screen.getByText(createMaxItemCountReachedMessage(MAX_ITEM_COUNT))
    ).toBeInTheDocument();
  });

  it("確認ダイアログを経てマイ運動を削除でき、一覧は開いたまま", async () => {
    const user = userEvent.setup();
    const props = setupModal();

    await user.click(screen.getByRole("button", { name: "スクワットを削除" }));
    await user.click(screen.getByRole("button", { name: BUTTON_DELETE }));

    expect(mockDeleteExerciseCard).toHaveBeenCalledWith(SQUAT.id);
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        EXERCISE_CARD_DELETE_SUCCESS_MESSAGE
      );
    });
    expect(props.onAdd).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
