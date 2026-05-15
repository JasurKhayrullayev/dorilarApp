/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** To'liq API ildizi, oxirida /api. Masalan https://dorilarapp.onrender.com/api */
  readonly VITE_API_BASE?: string;
  /** Ixtiyoriy: faqat domen. Masalan https://dorilarapp.onrender.com — client /api qo'shadi */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
