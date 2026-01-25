# jsdom環境でのテスト

jsdom環境での単体テスト・結合テストのガイドラインです。

---

## 単体テスト

**「部品の品質検査」** — 外部依存を排除し、ロジックそのものを検証します。

### 対象

- `src/utils/` 配下の純粋な関数
- `src/hooks/` 配下のカスタムフック（複雑な状態遷移を持つもの）
- `src/actions/` 配下の Server Actions
- Zustand / Redux などの Store ロジック

> **注記**: UI コンポーネント単体のレンダリングテストは、ロジックが含まれない限り原則不要

### Server Actions のテスト

Server Actions は純粋な非同期関数として単体テストします。

```typescript
// src/actions/user.ts
"use server";
export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  return { success: true, userId: "123" };
}

// src/actions/user.test.ts
describe("createUser", () => {
  it("正しいFormDataで新規ユーザーを作成できる", async () => {
    const formData = new FormData();
    formData.append("name", "Taro");
    const result = await createUser(formData);
    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
  });
});
```

### ベストプラクティス

#### エッジケースを網羅する

- 配列が空の場合
- 数値が 0 や負の値の場合
- API レスポンスが `null` や `undefined` の場合

#### モックは最小限に

**モックすべきもの**: 不確定要素（`Date.now()`、`Math.random()`）、外部API、ファイルシステム

#### パラメータ化テスト

```typescript
describe("calculateTax", () => {
  it.each([
    [100, 10],
    [0, 0],
    [-100, 0],
  ])("価格 %i のとき、税額は %i になる", (price, expected) => {
    expect(calculateTax(price)).toBe(expected);
  });
});
```

---

## 結合テスト（jsdom環境）

**「組み立て後の動作確認」** — React Testing Library でユーザー操作をシミュレートします。

### 対象

- **Client Components** (`'use client'` 付き）
- ページ構成要素、機能単位の大きなコンポーネント
- フォーム入力から送信までのフロー

> **重要**: RSC（Server Components）の結合テストは jsdom 環境では困難です。RSC は E2E テストで検証してください。

### クエリの優先順位

1. **`getByRole`**（最優先: ボタン、リンク、見出し）
2. **`getByLabelText`**（フォーム要素）
3. **`getByPlaceholderText`**
4. **`getByText`**（非対話的テキスト）
5. **`getByTestId`**（最終手段）

```typescript
// 良い例
const button = screen.getByRole("button", { name: /送信/ });
const input = screen.getByLabelText("メールアドレス");

// 悪い例
const button = screen.getByTestId("submit-button");
const input = container.querySelector(".email-input");
```

### ユーザーイベント

`fireEvent` ではなく `@testing-library/user-event` を使用：

```typescript
import userEvent from '@testing-library/user-event'

it('フォーム送信が正しく動作する', async () => {
  const user = userEvent.setup()
  render(<ContactForm />)
  await user.type(screen.getByLabelText('名前'), '山田太郎')
  await user.click(screen.getByRole('button', { name: '送信' }))
  expect(screen.getByText('送信完了')).toBeInTheDocument()
})
```

### 非同期処理の待ち方

```typescript
// 要素が表示されるのを待つ
const message = await screen.findByText("読み込み完了");

// 要素が消えるのを待つ
await waitForElementToBeRemoved(() => screen.getByText("読み込み中..."));

// 複数の条件を待つ
await waitFor(() => {
  expect(screen.getByText("成功")).toBeInTheDocument();
  expect(mockCallback).toHaveBeenCalled();
});

// 不要な waitFor
await waitFor(() => screen.getByText("完了")); // findByText を使うべき
```

### 外部 API は MSW でモック

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users", () => {
    return HttpResponse.json([{ id: 1, name: "Alice" }]);
  }),
];

// テストごとにハンドラーを上書き
it('エラー時の表示を確認', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.json({ message: 'Error' }, { status: 500 }))
  )
  render(<UserList />)
  expect(await screen.findByText('エラーが発生しました')).toBeInTheDocument()
})
```

---

## Vitest v4 便利機能

### vi.hoisted: モックを確実にホイスト

```typescript
const mockFetch = vi.hoisted(() => vi.fn());
vi.mock("node-fetch", () => ({ default: mockFetch }));
```

### expect.soft: 失敗しても続行

```typescript
expect.soft(result.name).toBe("Taro");
expect.soft(result.age).toBe(25);
```

### vi.waitFor: 条件が満たされるまで待機

```typescript
await vi.waitFor(
  () => {
    expect(mockCallback).toHaveBeenCalled();
  },
  { timeout: 3000 }
);
```

### TypeScript とテスト

```typescript
// モックの型定義
const mockRouter = vi.fn() as vi.MockedFunction<typeof useRouter>;

// カスタムマッチャーの型定義 (vitest.d.ts)
declare module "vitest" {
  interface Assertion<T = any> {
    toBeWithinRange(min: number, max: number): T;
  }
}
```

---

## Automock インスタンスメソッドの分離（v4）

```typescript
vi.mock("./UserRepository");
const repo1 = new UserRepository();
const repo2 = new UserRepository();

// インスタンスメソッドは分離
repo1.findById.mockReturnValue({ id: 1 });
expect(repo1.findById()).toEqual({ id: 1 });
expect(repo2.findById()).toBeUndefined();

// プロトタイプの呼び出し回数は共有
expect(UserRepository.prototype.findById).toHaveBeenCalledTimes(2);
```

---

## コンストラクタをモックする場合

```typescript
vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockFn };
  },
}));
```

---

## チェックリスト

### 基本事項

- [ ] テスト名から目的が分かるか
- [ ] 他のテスト順序に依存していないか
- [ ] 実装詳細に依存していないか
- [ ] クリーンアップは適切か

### 非同期処理

- [ ] `act(...)` の警告が出ていないか
- [ ] `findBy*` または `waitFor` を適切に使用しているか

### モック

- [ ] API, Router は適切にモックされているか
- [ ] `vi.hoisted` でモック関数を定義しているか
- [ ] コンストラクタは `class` 構文を使用しているか

### カバレッジ

- [ ] 正常系 / ローディング / エラー / 空データ / エッジケース
