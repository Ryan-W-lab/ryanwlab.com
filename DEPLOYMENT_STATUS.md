# Deployment status — 2026-10-29

- Main website: Cloudflare static Worker `ryanwlab-com`, GitHub repository `Ryan-W-lab/ryanwlab.com`, production branch `main`.
- Message API: https://ryanwlab-messages.ryan-w-lab.workers.dev/api/messages
- D1 database: `ryanwlab-messages`, ID `0cc931df-0f6a-4d4a-86c1-3c1016fc6555`. Both migrations applied; private Studio view `inbox` shows Beijing time, nickname, message.
- Worker code deployed, DB bound, allowed origins configured, IP_HASH_SECRET stored as a Cloudflare secret, daily cleanup scheduled.
- Production API verified: first save 201, identical UUID retry 200 without duplication. Clearly labeled test data exists.
- Local backend tests: 8 passed. Site link and source checks passed.
- Website changes are being verified on `codex/site-quality-fixes` before merge and production frontend verification.
- No password, token, cookie or IP hashing secret is stored in this repository.
