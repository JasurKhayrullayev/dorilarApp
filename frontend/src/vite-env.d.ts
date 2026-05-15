/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** To'liq API ildizi, oxirida /api */
  readonly VITE_API_BASE?: string;
  /** VITE_API_BASE bilan bir xil ma'noda (nomlangan qayta nom) */
  readonly VITE_BACKEND_URL?: string;
  /** Faqat domen — /api qo'shiladi */
  readonly VITE_API_URL?: string;
  /** VITE_API_URL bilan bir xil ma'noda */
  readonly VITE_BACKEND_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
