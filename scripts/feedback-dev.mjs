// Local feedback service for `npm run dev`: database in feedback/dev.db, the account from .env is admin
// (so /experimente shows the evaluation). Vite forwards /feedback-api here.
process.env.FEEDBACK_DB ??= new URL('../feedback/dev.db', import.meta.url).pathname;
process.env.FEEDBACK_ADMINS ??= process.env.AT_USERNAME ?? '';
process.env.API_BASE ??= process.env.VITE_API_BASE ?? 'https://stable.alpha-trader.com';
await import('../feedback/server.mjs');
