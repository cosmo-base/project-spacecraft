/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** プレイデータの送信先（Google Apps Script ウェブアプリの URL） */
  readonly VITE_ANALYTICS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
