/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly DEV: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
