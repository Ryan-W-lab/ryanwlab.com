# Deployment status — 2026-11-01

- Main website: Cloudflare static Worker `ryanwlab-com`, GitHub repository `Ryan-W-lab/ryanwlab.com`, production branch `main`. Push to `main` auto-deploys (Cloudflare Git integration, no GitHub Actions in this repo).
- Message API: https://ryanwlab-messages.ryan-w-lab.workers.dev/api/messages
- D1 database: `ryanwlab-messages`, ID `0cc931df-0f6a-4d4a-86c1-3c1016fc6555`. Both migrations applied; private Studio view `inbox` shows Beijing time, nickname, message.
- Worker code deployed, DB bound, allowed origins configured, IP_HASH_SECRET stored as a Cloudflare secret, daily cleanup scheduled.
- Production API verified: first save 201, identical UUID retry 200 without duplication. Clearly labeled test data exists.
- Local backend tests: 8 passed. Site link and source checks passed.
- Website changes are merged and live on `main` (`c5471ae`); the `codex/site-quality-fixes` branch is merged and can be deleted.
- No password, token, cookie or IP hashing secret is stored in this repository.

## 运维工具（2026-11-01 新增）

| 命令 | 用途 |
|---|---|
| `scripts/list-messages.sh [条数]` | 终端查看生产留言箱（只读 SELECT）。`--watch` 每 30 秒自动刷新 |
| `scripts/backup-messages.sh [--days N]` | 导出留言箱到 `backups/*.csv`（已被 `.gitignore` 排除，含个人数据） |

两者都复用本机 Cloudflare OAuth 登录态（`~/Library/Preferences/.wrangler/config/default.toml`，仓库之外），不含任何密钥；首次使用需 `npx wrangler@4.156.0 login`。

## 文档

| 文件 | 内容 |
|---|---|
| `HANDOVER.md` | 交付与交接手册：资产清单、凭据、发布链路、日常维护、**还缺什么模块**、故障排查、交接清单 |
| `CHANGELOG.md` | 更新日志 + 维护约定 |
| `MESSAGE_DEPLOYMENT.md` | 留言箱部署与查看细则 |
| `VALIDATION.md` | 校验脚本说明 |

## 已知待办（优先级见 HANDOVER.md 第 7 节）

- P0：无 CI（仓库无 `.github/workflows`）、无中英一致性校验脚本
- P1：访客可见的隐私说明页、模型信息核对日期标注、可观测性（Worker observability 关闭）
- P2：留言回复通知、已读标记、反滥用加强
