/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_PARTNER_ID?: string;
}

declare module 'plotly.js-dist-min';
