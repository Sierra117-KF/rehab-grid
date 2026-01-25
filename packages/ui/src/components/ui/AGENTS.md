# shadcn/ui コンポーネント規約

- `components/ui/`ディレクトリ内の shadcn/ui ベースコンポーネントは**直接編集禁止**
- カスタマイズ不要なコンポーネント（Separator, Skeleton 等）は `ui/` から直接インポートしてもOK
- プロジェクト固有スタイルのコンポーネントは `components/wrapped/` に配置されているラッパーを使用すること
