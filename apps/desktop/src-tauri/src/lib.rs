#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // 外部リンクは JS 側の openExternalUrl で開くため、<a> クリックを横取りする注入スクリプトは無効化する
    .plugin(
      tauri_plugin_opener::Builder::new()
        .open_js_links_on_click(false)
        .build(),
    )
    .setup(|app| {
      // カスタム log::Log を入れる場合: ロガー内で rand を呼ばないこと（AGENTS.md「rand / GHSA-cq8v-f236-94qc」参照）。
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
