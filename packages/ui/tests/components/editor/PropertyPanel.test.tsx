import {
  APPLY_DOSAGES_TO_ALL_TOOLTIP,
  APPLY_PRECAUTIONS_TO_ALL_TOOLTIP,
  createApplyDosagesToAllTooltip,
  DELETE_CONFIRM_DESCRIPTION,
  DELETE_CONFIRM_TITLE,
  DUPLICATE_BUTTON_LABEL,
  EXERCISE_CARD_SAVE_LABEL,
  IMAGE_EDIT_LABEL,
  IMAGE_FLIP_BUTTON_LABEL,
  MAX_PRECAUTIONS_COUNT,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { type EditorItem } from "@rehab-grid/core/types";
import {
  PropertyPanel,
  type PropertyPanelProps,
} from "@rehab-grid/ui/components/editor/PropertyPanel";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * nanoid のモック
 *
 * @remarks 注意点追加時にIDが必要なため、安定したIDを返す
 */
const { mockNanoid } = vi.hoisted(() => ({
  mockNanoid: vi.fn(() => "mocked-id"),
}));
vi.mock("nanoid", () => ({
  nanoid: mockNanoid,
}));

/**
 * テスト用のEditorItemを生成
 */
function createTestItem(overrides: Partial<EditorItem> = {}): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps(): PropertyPanelProps {
  return {
    selectedItem: null,
    onItemChange: vi.fn(),
    onItemDelete: vi.fn(),
  };
}

/**
 * PropertyPanel のセットアップヘルパー
 */
function setupPropertyPanel(
  overrides: Partial<PropertyPanelProps> = {}
): PropertyPanelProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<PropertyPanel {...props} />);
  return props;
}

describe("PropertyPanel", () => {
  describe("空状態", () => {
    it("selectedItem が null のとき空状態が表示される", () => {
      setupPropertyPanel();

      expect(screen.getByText("カードを選択")).toBeInTheDocument();
      expect(
        screen.getByText("編集するカードをクリックしてください")
      ).toBeInTheDocument();
    });

    it("selectedItem が null のとき編集フォームが表示されない", () => {
      setupPropertyPanel();

      expect(screen.queryByLabelText("運動名")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("説明")).not.toBeInTheDocument();
    });
  });

  describe("編集フォーム表示", () => {
    it("selectedItem があるとき編集フォームが表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({ title: "スクワット" }),
      });

      expect(screen.getByLabelText("運動名")).toBeInTheDocument();
      expect(screen.getByLabelText("説明")).toBeInTheDocument();
      expect(screen.getByText("回数")).toBeInTheDocument();
      expect(screen.getByText("セット")).toBeInTheDocument();
      expect(screen.getByText("頻度")).toBeInTheDocument();
      expect(screen.getByText("注意点")).toBeInTheDocument();
    });

    it("用量の入力欄と見出しは、デザイン設定の用量ラベルで表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem(),
        dosageLabels: { reps: "秒数", sets: "左右", frequency: "目安" },
      });

      expect(screen.getByLabelText("秒数")).toBeInTheDocument();
      expect(screen.getByLabelText("左右")).toBeInTheDocument();
      expect(screen.getByLabelText("目安")).toBeInTheDocument();
      expect(screen.getByText("秒数・左右・目安")).toBeInTheDocument();
      expect(screen.queryByText("回数")).not.toBeInTheDocument();
    });

    it("タイトルが入力フィールドに表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({ title: "スクワット" }),
      });

      const titleInput = screen.getByLabelText("運動名");
      expect(titleInput).toHaveValue("スクワット");
    });

    it("説明がテキストエリアに表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({
          description: "膝を曲げてゆっくり立ち上がる",
        }),
      });

      const descriptionTextarea = screen.getByLabelText("説明");
      expect(descriptionTextarea).toHaveValue("膝を曲げてゆっくり立ち上がる");
    });

    it("dosages（回数・セット・頻度）が入力フィールドに表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({
          dosages: {
            reps: "10回",
            sets: "3セット",
            frequency: "1日2回",
          },
        }),
      });

      expect(screen.getByDisplayValue("10回")).toBeInTheDocument();
      expect(screen.getByDisplayValue("3セット")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1日2回")).toBeInTheDocument();
    });

    it("precautions（注意点）が入力フィールドに表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({
          precautions: [
            { id: "p1", value: "痛みが出たら中止" },
            { id: "p2", value: "呼吸を止めない" },
          ],
        }),
      });

      expect(screen.getByDisplayValue("痛みが出たら中止")).toBeInTheDocument();
      expect(screen.getByDisplayValue("呼吸を止めない")).toBeInTheDocument();
    });

    it("残り文字数が表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({ title: "テスト" }),
      });

      // タイトル「テスト」は3文字なので、残りは TEXT_LIMITS.title - 3
      const expectedRemaining = TEXT_LIMITS.title - 3;
      expect(
        screen.getByText(`残り ${expectedRemaining} 文字`)
      ).toBeInTheDocument();
    });
  });

  describe("タイトル入力", () => {
    it("タイトルを変更すると onItemChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupPropertyPanel({
        selectedItem: createTestItem({ id: "item-1", title: "既存" }),
      });

      const titleInput = screen.getByLabelText("運動名");
      // 1文字入力して検証（制御されたコンポーネントのため、モックでは状態が更新されない）
      await user.type(titleInput, "A");

      expect(props.onItemChange).toHaveBeenCalledWith(
        "item-1",
        { title: "既存A" },
        { mergeKey: "item-1:title" }
      );
    });

    it("タイトル入力フィールドに maxLength が設定されている", () => {
      setupPropertyPanel({
        selectedItem: createTestItem(),
      });

      const titleInput = screen.getByLabelText("運動名");
      expect(titleInput).toHaveAttribute(
        "maxLength",
        String(TEXT_LIMITS.title)
      );
    });
  });

  describe("説明入力", () => {
    it("説明を変更すると onItemChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupPropertyPanel({
        selectedItem: createTestItem({
          id: "item-1",
          description: "既存の説明",
        }),
      });

      const descriptionTextarea = screen.getByLabelText("説明");
      await user.type(descriptionTextarea, "追");

      expect(props.onItemChange).toHaveBeenCalledWith(
        "item-1",
        { description: "既存の説明追" },
        { mergeKey: "item-1:description" }
      );
    });

    it("説明テキストエリアに maxLength が設定されている", () => {
      setupPropertyPanel({
        selectedItem: createTestItem(),
      });

      const descriptionTextarea = screen.getByLabelText("説明");
      expect(descriptionTextarea).toHaveAttribute(
        "maxLength",
        String(TEXT_LIMITS.description)
      );
    });
  });

  describe("dosages（回数・セット・頻度）入力", () => {
    it("回数を変更すると onItemChange が dosages 全体を含めて呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupPropertyPanel({
        selectedItem: createTestItem({
          id: "item-1",
          dosages: { reps: "10", sets: "3セット", frequency: "毎日" },
        }),
      });

      // 回数フィールドを値で取得
      const repsInput = screen.getByDisplayValue("10");
      await user.type(repsInput, "回");

      expect(props.onItemChange).toHaveBeenCalledWith(
        "item-1",
        {
          dosages: {
            reps: "10回",
            sets: "3セット",
            frequency: "毎日",
          },
        },
        { mergeKey: "item-1:dosages" }
      );
    });

    it("セット数を変更すると onItemChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupPropertyPanel({
        selectedItem: createTestItem({
          id: "item-1",
          dosages: { reps: "10回", sets: "3", frequency: "" },
        }),
      });

      const setsInput = screen.getByDisplayValue("3");
      await user.type(setsInput, "回");

      expect(props.onItemChange).toHaveBeenCalledWith(
        "item-1",
        {
          dosages: {
            reps: "10回",
            sets: "3回",
            frequency: "",
          },
        },
        { mergeKey: "item-1:dosages" }
      );
    });

    it("頻度を変更すると onItemChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupPropertyPanel({
        selectedItem: createTestItem({
          id: "item-1",
          dosages: { reps: "10回", sets: "3セット", frequency: "毎日" },
        }),
      });

      const frequencyInput = screen.getByDisplayValue("毎日");
      await user.type(frequencyInput, "2");

      expect(props.onItemChange).toHaveBeenCalledWith(
        "item-1",
        {
          dosages: {
            reps: "10回",
            sets: "3セット",
            frequency: "毎日2",
          },
        },
        { mergeKey: "item-1:dosages" }
      );
    });
  });

  describe("注意点管理", () => {
    it("「追加」ボタンをクリックすると新しい注意点が追加される", async () => {
      const user = userEvent.setup();
      mockNanoid.mockReturnValueOnce("new-precaution-id");
      const props = setupPropertyPanel({
        selectedItem: createTestItem({
          id: "item-1",
          precautions: [],
        }),
      });

      const addButton = screen.getByRole("button", { name: /追加/ });
      await user.click(addButton);

      expect(props.onItemChange).toHaveBeenCalledWith("item-1", {
        precautions: [{ id: "new-precaution-id", value: "" }],
      });
    });

    it("注意点を更新すると onItemChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupPropertyPanel({
        selectedItem: createTestItem({
          id: "item-1",
          precautions: [{ id: "p1", value: "痛み" }],
        }),
      });

      const precautionInput = screen.getByDisplayValue("痛み");
      await user.type(precautionInput, "注意");

      // 1文字目の入力を検証
      expect(props.onItemChange).toHaveBeenNthCalledWith(
        1,
        "item-1",
        { precautions: [{ id: "p1", value: "痛み注" }] },
        { mergeKey: "item-1:precaution:p1" }
      );
    });

    it("注意点の削除ボタンをクリックすると該当の注意点が削除される", async () => {
      const user = userEvent.setup();
      const props = setupPropertyPanel({
        selectedItem: createTestItem({
          id: "item-1",
          precautions: [
            { id: "p1", value: "注意1" },
            { id: "p2", value: "注意2" },
          ],
        }),
      });

      // aria-label を使用して削除ボタンを取得（最初のボタンが "注意1" 用）
      const deleteButtons = screen.getAllByLabelText("注意点を削除");
      expect(deleteButtons[0]).toBeDefined();
      await user.click(deleteButtons[0]!);

      expect(props.onItemChange).toHaveBeenCalledWith("item-1", {
        precautions: [{ id: "p2", value: "注意2" }],
      });
    });

    it("注意点が最大数に達すると追加ボタンが無効になる", () => {
      const maxPrecautions = Array.from(
        { length: MAX_PRECAUTIONS_COUNT },
        (_, i) => ({
          id: `p${i}`,
          value: `注意${i}`,
        })
      );

      setupPropertyPanel({
        selectedItem: createTestItem({
          precautions: maxPrecautions,
        }),
      });

      const addButton = screen.getByRole("button", { name: /追加/ });
      expect(addButton).toBeDisabled();
    });

    it("注意点に maxLength が設定されている", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({
          precautions: [{ id: "p1", value: "" }],
        }),
      });

      const precautionInput = screen.getByPlaceholderText("注意点を入力");
      expect(precautionInput).toHaveAttribute(
        "maxLength",
        String(TEXT_LIMITS.precaution)
      );
    });
  });

  describe("削除機能", () => {
    it("onItemDelete が渡された場合、削除ボタンが表示される", () => {
      setupPropertyPanel({
        selectedItem: createTestItem(),
        onItemDelete: vi.fn(),
      });

      expect(
        screen.getByRole("button", { name: /このカードを削除/ })
      ).toBeInTheDocument();
    });

    it("onItemDelete が渡されない場合、削除ボタンが表示されない", () => {
      setupPropertyPanel({
        selectedItem: createTestItem(),
        onItemDelete: undefined,
      });

      expect(
        screen.queryByRole("button", { name: /このカードを削除/ })
      ).not.toBeInTheDocument();
    });

    it("削除ボタンをクリックすると確認ダイアログが表示される", async () => {
      const user = userEvent.setup();
      setupPropertyPanel({
        selectedItem: createTestItem(),
        onItemDelete: vi.fn(),
      });

      await user.click(
        screen.getByRole("button", { name: /このカードを削除/ })
      );

      expect(screen.getByText(DELETE_CONFIRM_TITLE)).toBeInTheDocument();
      expect(screen.getByText(DELETE_CONFIRM_DESCRIPTION)).toBeInTheDocument();
    });

    it("確認ダイアログでキャンセルをクリックするとダイアログが閉じる", async () => {
      const user = userEvent.setup();
      const mockOnItemDelete = vi.fn();
      setupPropertyPanel({
        selectedItem: createTestItem(),
        onItemDelete: mockOnItemDelete,
      });

      await user.click(
        screen.getByRole("button", { name: /このカードを削除/ })
      );

      const cancelButton = screen.getByRole("button", { name: "キャンセル" });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText(DELETE_CONFIRM_TITLE)
        ).not.toBeInTheDocument();
      });
      expect(mockOnItemDelete).not.toHaveBeenCalled();
    });

    it("確認ダイアログで削除をクリックすると onItemDelete が呼ばれる", async () => {
      const user = userEvent.setup();
      const mockOnItemDelete = vi.fn();
      setupPropertyPanel({
        selectedItem: createTestItem({ id: "delete-me" }),
        onItemDelete: mockOnItemDelete,
      });

      await user.click(
        screen.getByRole("button", { name: /このカードを削除/ })
      );

      const deleteConfirmButton = screen.getByRole("button", { name: "削除" });
      await user.click(deleteConfirmButton);

      expect(mockOnItemDelete).toHaveBeenCalledWith("delete-me");
    });
  });

  describe("複製機能", () => {
    it("onItemDuplicate が渡された場合、複製ボタンで選択中カードの ID が渡される", async () => {
      const user = userEvent.setup();
      const mockOnItemDuplicate = vi.fn();
      setupPropertyPanel({
        selectedItem: createTestItem({ id: "copy-me" }),
        onItemDuplicate: mockOnItemDuplicate,
      });

      await user.click(
        screen.getByRole("button", { name: DUPLICATE_BUTTON_LABEL })
      );

      expect(mockOnItemDuplicate).toHaveBeenCalledWith("copy-me");
    });

    it("onItemDuplicate が渡されない場合、複製ボタンが表示されない", () => {
      setupPropertyPanel({ selectedItem: createTestItem() });

      expect(
        screen.queryByRole("button", { name: DUPLICATE_BUTTON_LABEL })
      ).not.toBeInTheDocument();
    });
  });

  describe("マイ運動に保存", () => {
    it("onSaveAsExerciseCard が渡された場合、保存ボタンで選択中のカードが渡される", async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn();
      const item = createTestItem({
        id: "save-me",
        dosages: { reps: "10回", sets: "", frequency: "" },
      });
      setupPropertyPanel({ selectedItem: item, onSaveAsExerciseCard: mockOnSave });

      await user.click(
        screen.getByRole("button", { name: EXERCISE_CARD_SAVE_LABEL })
      );

      expect(mockOnSave).toHaveBeenCalledWith(item);
    });

    it("onSaveAsExerciseCard が渡されない場合、保存ボタンが表示されない", () => {
      setupPropertyPanel({ selectedItem: createTestItem() });

      expect(
        screen.queryByRole("button", { name: EXERCISE_CARD_SAVE_LABEL })
      ).not.toBeInTheDocument();
    });
  });

  describe("全カードに反映", () => {
    const getDosagesButton = () =>
      screen.getByRole("button", { name: APPLY_DOSAGES_TO_ALL_TOOLTIP });
    const getPrecautionsButton = () =>
      screen.getByRole("button", { name: APPLY_PRECAUTIONS_TO_ALL_TOOLTIP });

    it("コールバックが渡されない場合（カード 1 枚）はボタンを表示しない", () => {
      setupPropertyPanel({ selectedItem: createTestItem() });

      expect(
        screen.queryByRole("button", { name: APPLY_DOSAGES_TO_ALL_TOOLTIP })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: APPLY_PRECAUTIONS_TO_ALL_TOOLTIP })
      ).not.toBeInTheDocument();
    });

    it("用量の 3 項目がすべて空（空白のみ含む）のときは用量の反映ボタンが無効になる", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({
          dosages: { reps: "", sets: " ", frequency: "" },
        }),
        onApplyDosagesToAll: vi.fn(),
        onApplyPrecautionsToAll: vi.fn(),
      });

      expect(getDosagesButton()).toBeDisabled();
    });

    it("用量の反映ボタンで選択中カードの用量が渡される", async () => {
      const user = userEvent.setup();
      const mockOnApply = vi.fn();
      setupPropertyPanel({
        selectedItem: createTestItem({
          dosages: { reps: "10回", sets: "", frequency: "" },
        }),
        onApplyDosagesToAll: mockOnApply,
        onApplyPrecautionsToAll: vi.fn(),
      });

      await user.click(getDosagesButton());

      expect(mockOnApply).toHaveBeenCalledWith({
        reps: "10回",
        sets: "",
        frequency: "",
      });
    });

    it("デザイン設定の用量ラベルに合わせて、用量の反映ボタンの名前も変わる", () => {
      const dosageLabels = { reps: "秒数", sets: "左右", frequency: "目安" };
      setupPropertyPanel({
        selectedItem: createTestItem({
          dosages: { reps: "30秒", sets: "", frequency: "" },
        }),
        onApplyDosagesToAll: vi.fn(),
        onApplyPrecautionsToAll: vi.fn(),
        dosageLabels,
      });

      const button = screen.getByRole("button", {
        name: createApplyDosagesToAllTooltip(dosageLabels),
      });
      expect(button).toHaveAttribute(
        "title",
        createApplyDosagesToAllTooltip(dosageLabels)
      );
    });

    it("空でない注意点がないときは注意点の反映ボタンが無効になる", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({
          precautions: [{ id: "p1", value: "  " }],
        }),
        onApplyDosagesToAll: vi.fn(),
        onApplyPrecautionsToAll: vi.fn(),
      });

      expect(getPrecautionsButton()).toBeDisabled();
    });

    it("注意点の反映ボタンで空欄を除いた文言が渡される", async () => {
      const user = userEvent.setup();
      const mockOnApply = vi.fn();
      setupPropertyPanel({
        selectedItem: createTestItem({
          precautions: [
            { id: "p1", value: "痛みが出たら中止" },
            { id: "p2", value: "" },
            { id: "p3", value: "呼吸を止めない" },
          ],
        }),
        onApplyDosagesToAll: vi.fn(),
        onApplyPrecautionsToAll: mockOnApply,
      });

      await user.click(getPrecautionsButton());

      expect(mockOnApply).toHaveBeenCalledWith([
        "痛みが出たら中止",
        "呼吸を止めない",
      ]);
    });
  });

  describe("画像の編集", () => {
    const getFlipButton = () =>
      screen.getByRole("button", { name: IMAGE_FLIP_BUTTON_LABEL });
    const getEditButton = () =>
      screen.getByRole("button", { name: IMAGE_EDIT_LABEL });

    it("左右反転・画像を編集ボタンでカードIDが渡される", async () => {
      const user = userEvent.setup();
      const onImageFlip = vi.fn();
      const onImageEdit = vi.fn();
      setupPropertyPanel({
        selectedItem: createTestItem({ id: "item-1", imageSource: "img-1" }),
        onImageFlip,
        onImageEdit,
      });

      await user.click(getFlipButton());
      await user.click(getEditButton());

      expect(onImageFlip).toHaveBeenCalledWith("item-1");
      expect(onImageEdit).toHaveBeenCalledWith("item-1");
    });

    it("画像の処理中は押せない", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({ imageSource: "img-1" }),
        onImageFlip: vi.fn(),
        onImageEdit: vi.fn(),
        isImageProcessing: true,
      });

      expect(getFlipButton()).toBeDisabled();
      expect(getEditButton()).toBeDisabled();
    });

    it("画像がないカードではボタンを表示しない", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({ imageSource: "" }),
        onImageFlip: vi.fn(),
        onImageEdit: vi.fn(),
      });

      expect(
        screen.queryByRole("button", { name: IMAGE_FLIP_BUTTON_LABEL })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: IMAGE_EDIT_LABEL })
      ).not.toBeInTheDocument();
    });

    it("コールバックが渡されない場合はボタンを表示しない", () => {
      setupPropertyPanel({
        selectedItem: createTestItem({ imageSource: "img-1" }),
      });

      expect(
        screen.queryByRole("button", { name: IMAGE_FLIP_BUTTON_LABEL })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: IMAGE_EDIT_LABEL })
      ).not.toBeInTheDocument();
    });
  });
});
