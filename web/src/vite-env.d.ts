/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // Google Cloud Console "Web application" OAuth client ID — public by
  // design (identifies the app, not a secret). Google Sign-In is skipped
  // entirely if unset.
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
