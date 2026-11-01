# 会话状态快照（2026-11-01）

> 用途：上下文压缩后仍能据此恢复工作。项目路径：
> `/Users/dingwenwen/Documents/ChatGPT/本地 mac 大模型主机搭建/ryanwlab-site`

## 当前状态

| 项 | 值 |
|---|---|
| 分支 / HEAD | `main` = `d6c71e1`（已推送，CI 绿） |
| 线上 | https://ryanwlab.com （中） / `/en/`（英），与本地 `site-dist/` 指纹一致 |
| 生产后端 | Cloudflare Worker `ryanwlab-messages` + D1 `ryanwlab-messages`（ID `0cc931df-0f6a-4d4a-86c1-3c1016fc6555`） |
| Cloudflare 账号 | `ryan_w_lab@outlook.com`，Account ID `ed010bdbe3fc9f49c4875719ea11e49b` |

## 今天做完的事

1. **留言框**：删掉三段内部提示（限流/留存/IP 摘要），保留 `1—500 个字符` + 计数，补一行额度说明（每天 3 条 / 间隔 60 秒）+ 留存口径。
2. **§04 模型库重构为七个板块**（中英双版，单一数据源生成）：
   前沿超大模型 16 · 闭源旗舰 18 · 本地可部署 **99** · 嵌入重排 12 · 文档 OCR 13 · 语音 19 · 视频 3D 6
3. **交付文档**：`HANDOVER.md`（含 P0/P1/P2 缺口分析）、`CHANGELOG.md`、`WORKLOG.md`（含页面自查一节）、`VALIDATION.md`、`DEPLOYMENT_STATUS.md`。
4. **工具**：`scripts/gen_model_catalogue.py`（单源生成中英两边）、`check_i18n.py`（结构+型号对齐）、`audit_models.py`（内容审计）、`shot-section.sh`（单节截图排版自检）、`list-messages.sh`（`--watch`）、`backup-messages.sh`。
5. **CI**：`.github/workflows/ci.yml` —— 站点校验 + 中英一致性 + 内容审计 + 后端 8 项回归 + 线上冒烟。
6. **页面修正**：首屏「12款」→ 动态取目录长度（99）；导语行宽 820→960px + 两端对齐；英文本地表表头 6 列→8 列；嵌入表缺列；厂商列折行；窄屏横滑提示。

## 维护规矩（写进 CHANGELOG/Maintenance）

- 改内容必须同步：中英两页 + `CHANGELOG.md`
- **模型信息必须带核对日期与官方来源**；许可一律以 Hugging Face 模型卡 API 实测为准，不采信二手转述
- 每次改动跑：`check_site.py` / `check_i18n.py` / `audit_models.py` / `node --test tests/messages.test.mjs` / `git diff --check`
- 加模型只改 `scripts/gen_model_catalogue.py` 一条记录，然后跑生成器

## 遗留 / 下一步

| 项 | 优先级 |
|---|---|
| 访客可见的独立隐私页（`/privacy`） | P1 |
| Worker observability 仍关闭（无提交量/错误率统计） | P1 |
| 留言回复通知 / 已读标记 / 反滥用 | P2 |
| `_probe` 分支删不掉（仓库 ruleset 禁删所有分支，需加 Exclude） | 低 |
| 测试留言 3 条（codex 验收数据）未清 | 低（用户说留着） |

## 凭据

- 本轮用的 GitHub 经典 PAT（`repo, workflow`）在
  `/private/var/folders/sc/fxvbzm9j6ynfr5c32ntwn2yr0000gn/T/opencode/ghflow/pat.txt`（600），**用完应删除并在 GitHub 撤销**。
- Cloudflare 登录态在 `~/Library/Preferences/.wrangler/config/default.toml`（仓库外）。
