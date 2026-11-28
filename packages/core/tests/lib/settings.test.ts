import { DEFAULT_THEME_COLOR } from "@rehab-grid/core/lib/constants";
import {
  isLayoutType,
  resolveDosageLabels,
  resolveProjectSettings,
  resolveSheetHeader,
} from "@rehab-grid/core/lib/settings";
import { describe, expect, it } from "vitest";

/** PDF ヘッダーの項目のデフォルト値（2-3 より前と同じ「タイトル＋氏名欄」） */
const DEFAULT_SHEET_HEADER = {
  showPatientNameBox: true,
  dateMode: "none",
};

/** 2-2・2-3 で追加した項目のデフォルト値（現行の見た目と同じになる値） */
const DEFAULT_PRINT_STYLE = {
  printColorMode: "color",
  textScale: "standard",
  pageOrientation: "auto",
  showCardNumbers: false,
  dosageLabels: { reps: "回数", sets: "セット", frequency: "頻度" },
  header: DEFAULT_SHEET_HEADER,
  checkTable: "none",
};

describe("isLayoutType", () => {
  it.each(["grid1", "grid2", "grid3", "grid4", "slide"])("'%s' で true を返す", (value) => {
    expect(isLayoutType(value)).toBeTruthy();
  });

  it.each([["invalid"], ["grid5"], [""], ["Grid2"], ["toString"], [2], [undefined]])(
    "%s で false を返す",
    (value) => {
      expect(isLayoutType(value)).toBeFalsy();
    }
  );
});

describe("resolveDosageLabels", () => {
  it("未指定ならデフォルトのラベルになる", () => {
    expect(resolveDosageLabels(undefined)).toEqual(
      DEFAULT_PRINT_STYLE.dosageLabels
    );
  });

  it("指定したキーだけを差し替え、空欄・空白だけの値はデフォルトに戻す", () => {
    expect(resolveDosageLabels({ reps: "秒数", sets: "", frequency: "  " })).toEqual({
      reps: "秒数",
      sets: "セット",
      frequency: "頻度",
    });
  });

  it("6 文字を超えた分は切り捨てる", () => {
    expect(resolveDosageLabels({ reps: "ながいラベルです" }).reps).toBe("ながいラベル");
  });

  it("文字列以外の値（壊れたデータ）はデフォルトに戻す", () => {
    expect(
      // @ts-expect-error - IndexedDB の破損データ等で不正値が入った場合を想定
      resolveDosageLabels({ reps: 10, sets: null })
    ).toEqual(DEFAULT_PRINT_STYLE.dosageLabels);
  });
});

describe("resolveSheetHeader", () => {
  it("未指定なら氏名欄だけを出すデフォルト値になる", () => {
    expect(resolveSheetHeader(undefined)).toEqual(DEFAULT_SHEET_HEADER);
  });

  it("指定したキーだけを差し替える", () => {
    expect(resolveSheetHeader({ dateMode: "blank" })).toEqual({
      ...DEFAULT_SHEET_HEADER,
      dateMode: "blank",
    });
  });

  it("氏名欄は false を指定したときだけ消す", () => {
    expect(
      resolveSheetHeader({ showPatientNameBox: false }).showPatientNameBox
    ).toBeFalsy();
  });

  it("廃止された項目を含む旧データでも余分なキーを含めずに解決する", () => {
    expect(
      resolveSheetHeader({
        showPatientNameBox: true,
        dateMode: "printed",
        // @ts-expect-error - 旧バージョンで保存された廃止項目が含まれる場合を想定
        facilityName: "○○病院",
        therapistName: "山田",
        overallNote: "メモ",
      })
    ).toEqual({
      showPatientNameBox: true,
      dateMode: "printed",
    });
  });

  it("不正な値（IndexedDB の破損データ等）はデフォルト値になる", () => {
    expect(
      resolveSheetHeader({
        // @ts-expect-error - 真偽値以外の値が入った場合を想定
        showPatientNameBox: "no",
        // @ts-expect-error - 選択肢にない日付欄が入った場合を想定
        dateMode: "today",
      })
    ).toEqual(DEFAULT_SHEET_HEADER);
  });
});

describe("resolveProjectSettings", () => {
  it("正しい設定はそのまま返す（テーマカラーの大文字表記も保つ）", () => {
    expect(
      resolveProjectSettings({ layoutType: "grid4", themeColor: "#ABCDEF" })
    ).toEqual({
      layoutType: "grid4",
      themeColor: "#ABCDEF",
      ...DEFAULT_PRINT_STYLE,
    });
  });

  it("スライドのレイアウトをそのまま残す", () => {
    expect(resolveProjectSettings({ layoutType: "slide" }).layoutType).toBe(
      "slide"
    );
  });

  it("印刷スタイルの設定値を保つ", () => {
    const settings = {
      layoutType: "grid2",
      themeColor: "#059669",
      printColorMode: "monochrome",
      textScale: "large",
      pageOrientation: "landscape",
      showCardNumbers: true,
      dosageLabels: { reps: "秒数", sets: "左右", frequency: "目安" },
      header: {
        showPatientNameBox: false,
        dateMode: "printed",
      },
      checkTable: "monthly",
    } as const;
    expect(resolveProjectSettings(settings)).toEqual(settings);
  });

  it.each([
    ["undefined", undefined],
    ["空オブジェクト", {}],
  ])("設定が %s の場合はすべてデフォルト値になる", (_, settings) => {
    expect(resolveProjectSettings(settings)).toEqual({
      layoutType: "grid2",
      themeColor: DEFAULT_THEME_COLOR,
      ...DEFAULT_PRINT_STYLE,
    });
  });

  it.each(["red", "#fff", "#12345g", "3b82f6", ""])(
    "テーマカラー '%s' は不正なのでデフォルト値になる",
    (themeColor) => {
      expect(
        resolveProjectSettings({ layoutType: "grid3", themeColor })
      ).toMatchObject({ layoutType: "grid3", themeColor: DEFAULT_THEME_COLOR });
    }
  );

  it("不正なレイアウトタイプは grid2 になり、テーマカラーは保たれる", () => {
    expect(
      resolveProjectSettings({
        // @ts-expect-error - IndexedDB の破損データ等で不正値が入った場合を想定
        layoutType: "grid9",
        themeColor: "#059669",
      })
    ).toMatchObject({ layoutType: "grid2", themeColor: "#059669" });
  });

  it("印刷スタイルの不正値（IndexedDB の破損データ等）はデフォルト値になる", () => {
    expect(
      resolveProjectSettings({
        layoutType: "grid2",
        themeColor: "#059669",
        // @ts-expect-error - 選択肢にない印刷の色づかいが入った場合を想定
        printColorMode: "sepia",
        // @ts-expect-error - 選択肢にない文字サイズが入った場合を想定
        textScale: "huge",
        // @ts-expect-error - プロトタイプのキー名が入った場合を想定
        pageOrientation: "toString",
        // @ts-expect-error - 真偽値以外の値が入った場合を想定
        showCardNumbers: "yes",
        // @ts-expect-error - オブジェクト以外の値が入った場合を想定
        dosageLabels: "秒数",
        // @ts-expect-error - オブジェクト以外の値が入った場合を想定
        header: "invalid",
        // @ts-expect-error - 選択肢にない実施チェック表が入った場合を想定
        checkTable: "daily",
      })
    ).toEqual({
      layoutType: "grid2",
      themeColor: "#059669",
      ...DEFAULT_PRINT_STYLE,
    });
  });
});
