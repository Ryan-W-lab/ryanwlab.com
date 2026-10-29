# Website quality revision — 2026-10-29

Scope: retain the static handbook and terminal visual style. No checkout, subscriptions, analytics or business-service funnel was added.

Changes:
- Add a device-oriented beginner path on Chinese and English pages.
- Correct Qwen3 dense/MoE names, obvious hardware-table overclaims and unsupported Ollama CLI flags.
- Replace placeholder GGUF download instructions with the official Hugging Face repository loader.
- Replace the unsourced frontier-model recommendation section with four source-linked local starter tags. This is not a latest-model ranking.
- Replace ambiguous family-license badges with explicit per-version checks and source links; this revision is not a legal/license audit.
- Replace the broken RAG snippet with a downloadable, standard-library keyword-retrieval + Ollama generation example; disclose its limits.
- Increase secondary-text contrast; make code-copy controls keyboard accessible and show copying failures honestly. Exclude decorative prompts and sample output from copying.
- Reuse navigation/copy behavior on the English page; keep chapter content visible during anchor jumps.

Validation:
- `python3 scripts/check_site.py`: passed for both languages (IDs, local links, exact displayed/downloaded example consistency, retrieval and mocked local API request/response).
- `node --check assets/js/main.js`, `homebrew.js`, `quality.js`: passed.
- `git diff --check`: passed.
- Browser: Chinese and English beginner paths render; device details expand; copy yields exactly `ollama --version` and `ollama run qwen3:1.7b` without prompt symbols.
- Official Ollama model-page tags checked: qwen3:1.7b, qwen3:8b, qwen2.5-coder:7b, deepseek-r1:8b. Listed download sizes are snapshots, not runtime-memory guarantees.

Limits:
- The local Ollama service was not running, so no real-model inference, performance benchmark or download was performed.
- No mobile-device test was performed. Responsive CSS was adjusted, but needs device verification.
- Historical chapters, third-party external links, all deployment commands and licensing have not received a complete audit. LoRA remains illustrative, not a complete training program.
- GitHub HTTPS push permission could not be verified: the terminal has no available GitHub username/authentication. No remote branch or production deployment has been changed.

Preview: run `python3 -m http.server 8765 --bind 127.0.0.1` from the repository, then open http://127.0.0.1:8765/.

## Private message box — 2026-10-29

Chinese/English forms added with 1–500 Unicode code points, optional 20-character nickname, no attachments and no public read API. D1 trigger enforces 3 successful messages/IP/Beijing day and 60-second same-day cooldown atomically. UUID retry IDs prevent double inserts within the retry window. IP addresses are stored only as a daily HMAC in the application table; infrastructure request handling remains subject to Cloudflare settings. A daily scheduled cleanup removes rows older than 90 days.

Eight Node/SQLite tests passed: quota, bursts, retries, midnight reset, input/body limits, origins/methods/configuration, SQL-text safety, database failure and scheduled cleanup. Browser integration on loopback confirmed successful submission and clearing, disabling submission at 501 characters, and preserving text after a cooldown rejection; the English form also rendered correctly. Cloudflare production runtime, D1 binding and mobile devices remain unverified. No production deployment or GitHub push occurred.

Public endpoint configuration is intentionally empty until deployment: the source form is disabled and never reports a fake success. The dedicated preview uses an in-memory SQLite adapter and a loopback-only API. Static builds use an explicit public-file allowlist; backend sources and local secrets are excluded.
