/**
 * ImageLibraryPanel コンポーネントのユニットテスト
 *
 * 画像ライブラリパネルの振る舞いをユーザー視点でテストする
 *
 * @remarks
 * - dnd-kit モックは tests/setup.jsdom.ts でグローバルに登録済み
 * - next/image モックは共通モックファイルを使用
 */
import {
  BUTTON_ADD_CARD,
  BUTTON_CANCEL,
  BUTTON_DELETE,
  createDeleteAllLabel,
  createSelectedImagesDeleteLabel,
  IMAGE_DELETE_DESCRIPTION,
  IMAGE_DELETE_TITLE,
  IMAGE_LIBRARY_BULK_DELETE,
  IMAGE_LIBRARY_BULK_DELETE_END,
  IMAGE_LIBRARY_CLICK_INSTRUCTION,
  IMAGE_LIBRARY_DROP_INSTRUCTION,
  IMAGE_LIBRARY_NO_MATCHES,
  IMAGE_LIBRARY_SEARCH_CLEAR,
  IMAGE_LIBRARY_SEARCH_LABEL,
  IMAGE_LIBRARY_UPLOADING,
  SAMPLE_IMAGES,
} from "@rehab-grid/core/lib/constants";
import { ImageLibraryPanel } from "@rehab-grid/ui/components/editor/ImageLibraryPanel";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// next/imageモック（動的インポートでホイスト問題を回避）
vi.mock("next/image", async () => {
  const { mockNextImage } = await import("@/tests/mocks/next-image");
  return mockNextImage;
});

// useLiveQueryモック
const { mockUseLiveQuery } = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(),
}));
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

// useImageUploadモック（動的に状態を変更可能）
const { mockUploadImages, mockClearError, mockUseImageUpload } = vi.hoisted(
  () => ({
    mockUploadImages: vi.fn(),
    mockClearError: vi.fn(),
    mockUseImageUpload: vi.fn(),
  })
);
vi.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: mockUseImageUpload,
}));

// useObjectUrlsモック
const { mockUseObjectUrls } = vi.hoisted(() => ({
  mockUseObjectUrls: vi.fn(() => new Map<string, string>()),
}));
vi.mock("@/hooks/useObjectUrls", () => ({
  useObjectUrls: mockUseObjectUrls,
}));

// useEditorStoreモック
const { mockDeleteImageAndClearReferences } = vi.hoisted(() => ({
  mockDeleteImageAndClearReferences: vi.fn(),
}));
vi.mock("@/lib/store/useEditorStore", () => ({
  useEditorStore: (selector: (state: unknown) => unknown) =>
    selector({
      deleteImageAndClearReferences: mockDeleteImageAndClearReferences,
    }),
}));

// sonnerモック
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * テスト用の画像データを生成
 */
function createTestImage(
  overrides: Partial<{ id: string; fileName: string }> = {}
) {
  return {
    id: "test-image-1",
    blob: new Blob(["test"], { type: "image/png" }),
    createdAt: new Date(),
    fileName: "test_image",
    ...overrides,
  };
}

/**
 * ImageLibraryPanel セットアップヘルパー
 */
type SetupOptions = {
  images?: ReturnType<typeof createTestImage>[];
  isUploading?: boolean;
  error?: string | null;
};

/**
 * ImageLibraryPanel セットアップヘルパー
 */
function setupImageLibraryPanel(
  props: Partial<{
    onAddCard: () => void;
    canAddCard: boolean;
    onImageSelect: (imageId: string) => void;
    isMobile: boolean;
  }> = {},
  options: SetupOptions = {}
) {
  const { images, isUploading = false, error = null } = options;

  // デフォルトのモック戻り値を設定
  mockUseLiveQuery.mockReturnValue(images);
  mockUseObjectUrls.mockReturnValue(
    new Map(
      images?.map((img) => [img.id, `blob:http://localhost/${img.id}`]) ?? []
    )
  );
  mockUseImageUpload.mockReturnValue({
    uploadImages: mockUploadImages,
    isUploading,
    error,
    clearError: mockClearError,
  });

  const defaultProps = {
    onAddCard: vi.fn(),
    canAddCard: true,
    onImageSelect: vi.fn(),
    isMobile: false,
    ...props,
  };

  render(<ImageLibraryPanel {...defaultProps} />);
  return defaultProps;
}

describe("ImageLibraryPanel", () => {
  describe("初期表示", () => {
    it("カード追加ボタンが表示される", () => {
      setupImageLibraryPanel();

      expect(
        screen.getByRole("button", { name: BUTTON_ADD_CARD })
      ).toBeInTheDocument();
    });

    it("ドロップゾーンが表示される", () => {
      setupImageLibraryPanel();

      expect(
        screen.getByText(IMAGE_LIBRARY_DROP_INSTRUCTION)
      ).toBeInTheDocument();
      expect(
        screen.getByText(IMAGE_LIBRARY_CLICK_INSTRUCTION)
      ).toBeInTheDocument();
    });

    it("取り込み画像がない場合、サンプル画像が表示される", () => {
      // images: [] は IndexedDB の取り込み画像が空の状態
      // SAMPLE_IMAGES はデフォルトで表示されるため、プレースホルダーではなくサンプル画像が表示される
      setupImageLibraryPanel({}, { images: [] });

      // サンプル画像がすべて表示されることを確認
      // 各サンプル画像は fileName を alt 属性として持つ
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(SAMPLE_IMAGES.length);
    });
  });

  describe("カード追加機能", () => {
    it("カード追加ボタンクリックでonAddCardが呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupImageLibraryPanel();

      await user.click(screen.getByRole("button", { name: BUTTON_ADD_CARD }));

      expect(props.onAddCard).toHaveBeenCalledTimes(1);
    });

    it("canAddCard=false のときボタンが無効になる", () => {
      setupImageLibraryPanel({ canAddCard: false });

      expect(
        screen.getByRole("button", { name: BUTTON_ADD_CARD })
      ).toBeDisabled();
    });
  });

  describe("画像表示", () => {
    it("画像があるときサムネイルが表示される", () => {
      const testImage = createTestImage({
        id: "img-1",
        fileName: "exercise_01",
      });
      setupImageLibraryPanel({}, { images: [testImage] });

      // 画像は fileName を alt 属性として持つ
      const image = screen.getByAltText("exercise_01");
      expect(image).toBeInTheDocument();
    });

    it("複数画像が正しく表示される", () => {
      const images = [
        createTestImage({ id: "img-1", fileName: "exercise_01" }),
        createTestImage({ id: "img-2", fileName: "exercise_02" }),
        createTestImage({ id: "img-3", fileName: "exercise_03" }),
      ];
      setupImageLibraryPanel({}, { images });

      // 各画像の alt 属性（ファイル名）で存在を確認
      expect(screen.getByAltText("exercise_01")).toBeInTheDocument();
      expect(screen.getByAltText("exercise_02")).toBeInTheDocument();
      expect(screen.getByAltText("exercise_03")).toBeInTheDocument();
    });

    it("ファイル名がalt属性に設定される", () => {
      const testImage = createTestImage({
        id: "img-1",
        fileName: "standing_squat",
      });
      setupImageLibraryPanel({}, { images: [testImage] });

      // 画像要素の alt 属性にファイル名が設定される
      const image = screen.getByAltText("standing_squat");
      expect(image).toBeInTheDocument();
    });
  });

  describe("アップロード状態", () => {
    it("アップロード中に『アップロード中...』が表示される", () => {
      setupImageLibraryPanel({}, { isUploading: true });

      expect(screen.getByText(IMAGE_LIBRARY_UPLOADING)).toBeInTheDocument();
    });
  });

  describe("エラー表示", () => {
    it("エラー時にエラーメッセージが表示される", () => {
      const errorMessage = "ファイルサイズが大きすぎます";
      setupImageLibraryPanel({}, { error: errorMessage });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe("フィルター機能", () => {
    it("フィルターコンボボックスが表示される", () => {
      setupImageLibraryPanel();

      // フィルタードロップダウンが存在する
      const filterTrigger = screen.getByRole("combobox");
      expect(filterTrigger).toBeInTheDocument();
    });

    // Note: Radix UIのSelectはjsdom環境でPortalが正しく動作しないため、
    // フィルターの選択動作はブラウザテストまたはE2Eで検証する
  });

  describe("まとめて削除モード", () => {
    it("「まとめて削除」ボタンでモード切り替え", async () => {
      const user = userEvent.setup();
      const images = [createTestImage({ id: "img-1" })];
      setupImageLibraryPanel({}, { images });

      // まとめて削除ボタンをクリック
      const bulkDeleteButton = screen.getByRole("button", {
        name: IMAGE_LIBRARY_BULK_DELETE,
      });
      await user.click(bulkDeleteButton);

      // モード切り替え後のUIを確認
      expect(
        screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE_END })
      ).toBeInTheDocument();
    });

    it("画像がない場合、まとめて削除ボタンが無効になる", () => {
      setupImageLibraryPanel({}, { images: [] });

      const bulkDeleteButton = screen.getByRole("button", {
        name: IMAGE_LIBRARY_BULK_DELETE,
      });
      expect(bulkDeleteButton).toBeDisabled();
    });

    it("「まとめて削除を終わる」でモード終了", async () => {
      const user = userEvent.setup();
      const images = [createTestImage({ id: "img-1" })];
      setupImageLibraryPanel({}, { images });

      // まとめて削除モードに入る
      await user.click(
        screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE })
      );

      // モードを終了
      await user.click(
        screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE_END })
      );

      // 元の状態に戻る
      expect(
        screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE })
      ).toBeInTheDocument();
    });

    it("選択画像がない場合、選択削除ボタンが無効になる", async () => {
      const user = userEvent.setup();
      const images = [createTestImage({ id: "img-1" })];
      setupImageLibraryPanel({}, { images });

      // まとめて削除モードに入る
      await user.click(
        screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE })
      );

      // 「選択した画像を削除（0件）」ボタンを確認
      const deleteSelectedButton = screen.getByRole("button", {
        name: /選択した画像を削除/,
      });
      expect(deleteSelectedButton).toBeDisabled();
    });
  });

  describe("個別削除", () => {
    it("サムネイル内の削除ボタンから確認ダイアログを経て画像を削除できる", async () => {
      const user = userEvent.setup();
      const images = [createTestImage({ id: "img-1", fileName: "test_image" })];
      setupImageLibraryPanel({}, { images });

      // 画像が表示されていることを確認
      expect(screen.getByAltText("test_image")).toBeInTheDocument();

      // サムネイルカード内の削除ボタンを取得
      const deleteButton = screen.getByRole("button", { name: /画像を削除/i });
      await user.click(deleteButton);

      // 確認ダイアログが表示される
      expect(screen.getByText(IMAGE_DELETE_TITLE)).toBeInTheDocument();
      expect(screen.getByText(IMAGE_DELETE_DESCRIPTION)).toBeInTheDocument();

      // 削除を実行
      const confirmDeleteButton = screen.getByRole("button", {
        name: BUTTON_DELETE,
      });
      await user.click(confirmDeleteButton);

      // ストアの削除関数が呼ばれることを確認
      expect(mockDeleteImageAndClearReferences).toHaveBeenCalledWith("img-1");
    });
  });

  describe("ドロップゾーン操作", () => {
    it("ドロップゾーンがtabIndex=0を持ちキーボード操作可能", () => {
      setupImageLibraryPanel();

      // ドロップゾーンはrole=buttonでフォーカス可能
      const dropzone = screen.getByRole("button", {
        name: /ドラッグ＆ドロップ/i,
      });
      expect(dropzone).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("サンプル画像", () => {
    it("サンプル画像には削除ボタンが表示されない", () => {
      // images: [] はサンプル画像のみ表示される状態
      setupImageLibraryPanel({}, { images: [] });

      // 削除ボタンが存在しないことを確認
      expect(
        screen.queryByRole("button", { name: /画像を削除/i })
      ).not.toBeInTheDocument();
    });

    it("取り込み画像には削除ボタンが表示される", () => {
      const testImage = createTestImage({ id: "img-1", fileName: "test_image" });
      setupImageLibraryPanel({}, { images: [testImage] });

      // 削除ボタンが存在することを確認
      expect(
        screen.getByRole("button", { name: /画像を削除/i })
      ).toBeInTheDocument();
    });
  });

  describe("モバイルモード", () => {
    it("isMobile=true の場合、カード追加ボタンが表示されない", () => {
      setupImageLibraryPanel({ isMobile: true, canAddCard: true });

      expect(
        screen.queryByRole("button", { name: BUTTON_ADD_CARD })
      ).not.toBeInTheDocument();
    });

    it("isMobile=true の場合、ドロップゾーンの代わりにモバイルボタンが表示される", () => {
      setupImageLibraryPanel({ isMobile: true });

      // ドロップゾーンが表示されないことを確認
      expect(
        screen.queryByRole("button", { name: /ドラッグ＆ドロップ/i })
      ).not.toBeInTheDocument();
    });

    it("モバイルでサムネイルをクリックするとonImageSelectが呼ばれる", async () => {
      const user = userEvent.setup();
      const testImage = createTestImage({ id: "img-1", fileName: "test_image" });
      const props = setupImageLibraryPanel({ isMobile: true }, { images: [testImage] });

      // サムネイル画像をクリック
      const thumbnail = screen.getByAltText("test_image");
      await user.click(thumbnail);

      expect(props.onImageSelect).toHaveBeenCalledWith("img-1");
    });

    it("モバイルでも検索欄が表示される", () => {
      setupImageLibraryPanel({ isMobile: true });

      expect(
        screen.getByRole("textbox", { name: IMAGE_LIBRARY_SEARCH_LABEL })
      ).toBeInTheDocument();
    });
  });

  describe("キーワード検索", () => {
    /** 検索欄に入力する */
    async function search(
      user: ReturnType<typeof userEvent.setup>,
      query: string
    ) {
      await user.type(
        screen.getByRole("textbox", { name: IMAGE_LIBRARY_SEARCH_LABEL }),
        query
      );
    }

    it("ひらがなでカタカナの運動名のサンプル画像に絞り込める", async () => {
      const user = userEvent.setup();
      setupImageLibraryPanel({}, { images: [] });

      await search(user, "すくわっと");

      expect(screen.getAllByRole("img")).toHaveLength(1);
      expect(
        screen.getByAltText("standing_05_スクワット")
      ).toBeInTheDocument();
    });

    it("小文字の英字で「足上げ（SLR）」がヒットする", async () => {
      const user = userEvent.setup();
      setupImageLibraryPanel({}, { images: [] });

      await search(user, "slr");

      expect(screen.getAllByRole("img")).toHaveLength(1);
      expect(screen.getByAltText("lying_02_足上げ（SLR）")).toBeInTheDocument();
    });

    it("空白区切りの複数語はすべてを含む画像だけに絞り込む", async () => {
      const user = userEvent.setup();
      setupImageLibraryPanel({}, { images: [] });

      await search(user, "股関節 伸展");

      const altTexts = screen
        .getAllByRole("img")
        .map((img) => img.getAttribute("alt"));
      expect(altTexts).toEqual([
        "lying_05_股関節伸展",
        "lying_18_四つ這い股関節伸展1",
        "lying_19_四つ這い股関節伸展2",
      ]);
    });

    it("取り込み画像もファイル名で検索できる", async () => {
      const user = userEvent.setup();
      setupImageLibraryPanel(
        {},
        {
          images: [
            createTestImage({ id: "img-1", fileName: "knee_exercise.png" }),
            createTestImage({ id: "img-2", fileName: "shoulder_exercise.png" }),
          ],
        }
      );

      await search(user, "knee");

      expect(screen.getAllByRole("img")).toHaveLength(1);
      expect(screen.getByAltText("knee_exercise.png")).toBeInTheDocument();
    });

    it("該当する画像がないとき「該当なし」を表示する", async () => {
      const user = userEvent.setup();
      setupImageLibraryPanel({}, { images: [] });

      await search(user, "存在しない運動");

      expect(screen.queryAllByRole("img")).toHaveLength(0);
      expect(screen.getByText(IMAGE_LIBRARY_NO_MATCHES)).toBeInTheDocument();
    });

    it("クリアボタンで検索語が消え、全画像の表示に戻る", async () => {
      const user = userEvent.setup();
      setupImageLibraryPanel({}, { images: [] });

      await search(user, "すくわっと");
      await user.click(
        screen.getByRole("button", { name: IMAGE_LIBRARY_SEARCH_CLEAR })
      );

      expect(
        screen.getByRole("textbox", { name: IMAGE_LIBRARY_SEARCH_LABEL })
      ).toHaveValue("");
      expect(screen.getAllByRole("img")).toHaveLength(SAMPLE_IMAGES.length);
      expect(
        screen.queryByRole("button", { name: IMAGE_LIBRARY_SEARCH_CLEAR })
      ).not.toBeInTheDocument();
    });

    describe("まとめて削除モードとの併用", () => {
      const importedImages = [
        createTestImage({ id: "img-1", fileName: "knee_exercise.png" }),
        createTestImage({ id: "img-2", fileName: "shoulder_exercise.png" }),
      ];

      it("検索結果の取り込み画像だけが「表示中の画像を削除」の対象になる", async () => {
        const user = userEvent.setup();
        setupImageLibraryPanel({}, { images: importedImages });

        await user.click(
          screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE })
        );
        await search(user, "knee");

        expect(
          screen.getByRole("button", { name: createDeleteAllLabel(1, true) })
        ).toBeEnabled();
      });

      it("検索結果が 0 件のとき「表示中の画像を削除」を押せない", async () => {
        const user = userEvent.setup();
        setupImageLibraryPanel({}, { images: importedImages });

        await user.click(
          screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE })
        );
        await search(user, "存在しない");

        expect(
          screen.getByRole("button", { name: createDeleteAllLabel(0, true) })
        ).toBeDisabled();
      });

      it("検索語を変えると画像の選択が解除される", async () => {
        const user = userEvent.setup();
        setupImageLibraryPanel({}, { images: importedImages });

        await user.click(
          screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE })
        );
        await user.click(screen.getByAltText("shoulder_exercise.png"));
        expect(
          screen.getByRole("button", {
            name: createSelectedImagesDeleteLabel(1),
          })
        ).toBeEnabled();

        // 選択した「shoulder」が非表示になる検索語に変える
        await search(user, "knee");

        expect(
          screen.getByRole("button", {
            name: createSelectedImagesDeleteLabel(0),
          })
        ).toBeDisabled();
      });
    });
  });

  describe("サムネイルのクリック", () => {
    it("デスクトップの通常モードではクリックしても何もしない（配置は D&D で行う）", async () => {
      const user = userEvent.setup();
      const props = setupImageLibraryPanel(
        {},
        { images: [createTestImage({ id: "img-1", fileName: "test_image" })] }
      );

      await user.click(screen.getByAltText("test_image"));

      expect(props.onImageSelect).not.toHaveBeenCalled();
      expect(props.onAddCard).not.toHaveBeenCalled();
    });

    it("まとめて削除モード中はクリックで選択を切り替える", async () => {
      const user = userEvent.setup();
      setupImageLibraryPanel(
        {},
        { images: [createTestImage({ id: "img-1", fileName: "test_image" })] }
      );

      await user.click(
        screen.getByRole("button", { name: IMAGE_LIBRARY_BULK_DELETE })
      );
      await user.click(screen.getByAltText("test_image"));

      expect(
        screen.getByRole("button", { name: createSelectedImagesDeleteLabel(1) })
      ).toBeEnabled();
    });

    it.each([
      { buttonName: BUTTON_DELETE, label: "削除" },
      { buttonName: BUTTON_CANCEL, label: "キャンセル" },
    ])(
      "モバイルで削除確認ダイアログの $label を押しても画像は反映されない",
      async ({ buttonName }) => {
        const user = userEvent.setup();
        const props = setupImageLibraryPanel(
          { isMobile: true },
          { images: [createTestImage({ id: "img-1", fileName: "test_image" })] }
        );

        await user.click(screen.getByRole("button", { name: /画像を削除/i }));
        await user.click(screen.getByRole("button", { name: buttonName }));

        expect(props.onImageSelect).not.toHaveBeenCalled();
      }
    );
  });
});
