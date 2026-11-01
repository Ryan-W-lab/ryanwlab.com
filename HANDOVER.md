# 交付与交接手册

> 面向「接手维护这个网站的人」，也面向「准备把它交出去的人」。
> 读完这一页你应该能独立完成：看留言、发版、改内容、排障、交接。

最后更新：2026-11-01

---

## 1. 一页速览

| 项 | 值 |
|---|---|
| 站点 | https://ryanwlab.com （中文） / https://ryanwlab.com/en/ （英文） |
| 定位 | 本地大模型科普手册（静态站）+ 私密留言箱 |
| 代码仓库 | https://github.com/Ryan-W-lab/ryanwlab.com（分支 `main` = 生产） |
| 静态托管 | Cloudflare Workers（`ryanwlab-com`），Git 集成自动构建 |
| 留言后端 | Cloudflare Worker `ryanwlab-messages` + D1 库 `ryanwlab-messages` |
| 构建 | `node scripts/build-site.mjs` → 产物在 `site-dist/` |
| 发布方式 | push 到 `main` 即自动发布，**无手工发布步骤** |
| 许可 | 内容 CC BY-NC-SA 4.0（见 `LICENSE`） |

站点是**纯静态**的：没有 Node 服务、没有数据库读接口、没有后台登录页。
唯一的动态部分是留言箱的**写入**接口。

---

## 2. 资产清单（交接时必须逐项确认）

| 资产 | 位置 / 标识 | 交接要点 |
|---|---|---|
| GitHub 仓库 | `Ryan-W-lab/ryanwlab.com` | 需要**写权限**（Contents:write + Administration:write 才能改 ruleset） |
| Cloudflare 账号 | `ryan_w_lab@outlook.com`（Account ID `ed010bdbe3fc9f49c4875719ea11e49b`） | 整个站都在这个账号下，**这是最关键的一项** |
| 静态站 Worker | `ryanwlab-com` | 由 Cloudflare Git 集成自动构建部署 |
| 留言 Worker | `ryanwlab-messages`（`*.ryan-w-lab.workers.dev`） | 手动部署，配置在 `backend/wrangler.jsonc` |
| D1 数据库 | `ryanwlab-messages`，ID `0cc931df-0f6a-4d4a-86c1-3c1016fc6555` | 留言实体；只允许 Cloudflare 账号访问 |
| 域名 | `ryanwlab.com`（+ `www`） | DNS 在 Cloudflare，Worker 的 `ALLOWED_ORIGINS` 依赖它 |
| Cloudflare API Token | 由账号所有者创建 | 见第 3 节，**不要写进仓库** |

> ⚠️ **Cloudflare 账号是单点**。GitHub 仓库可以转手，但 D1、Worker、域名、
> 自动发布集成全在 Cloudflare 一个账号里。交接前必须把 Cloudflare 账号
> 权限（成员邀请 / 账号移交）一起谈好，否则对方拿到 GitHub 仓库也发不了版。

---

## 3. 密钥与凭据

| 凭据 | 存放位置 | 谁需要它 | 轮换方式 |
|---|---|---|---|
| `IP_HASH_SECRET` | Cloudflare Worker 的 secret（**不可读取，只能重设**） | 只有部署者 | `npx wrangler secret put IP_HASH_SECRET --config backend/wrangler.jsonc`（≥32 字节随机） |
| Cloudflare OAuth 登录态 | `~/Library/Preferences/.wrangler/config/default.toml`（600） | 本机 | `npx wrangler login` |
| GitHub 凭据 | 本机 keychain（`gh auth`） | 本机 | `gh auth login` 或新建 PAT |
| D1 数据库凭据 | 无（不是密码数据库），靠 Cloudflare 账号权限 | Cloudflare 账号 | — |

**红线**

- 仓库里**永远不放**任何 token / secret / cookie / IP 哈希密钥。`.gitignore` 已挡
  `.dev.vars*`、`.env*`、`.wrangler/`。
- `IP_HASH_SECRET` 轮换会**清空当前所有 IP 的日额度**，改完当天用户可能需要重新等待。
- 留言库不是密码数据库，但仍是敏感数据：**不要把 D1 绑定到公开可读的 Worker**。

---

## 4. 发布链路

```
git push origin main
      │
      ├─→ Cloudflare Git 集成检测到 main 更新
      │     └─ 运行构建命令：node scripts/build-site.mjs
      │     └─ 产物目录：site-dist/
      │     └─ 自动部署到 Worker ryanwlab-com
      │
      └─→ 约 30–60 秒后线上生效
```

要点：

- 构建脚本 `scripts/build-site.mjs` 用**显式白名单**拷贝文件
  （`index.html`、`en/`、`assets/`、`examples/` 等），
  **backend、tests、脚本、Git 数据都不会被发布**。新增静态文件时必须
  把它加进 `publicFiles` 数组，否则线上看不到。
- `MESSAGE_API_URL` 环境变量用于覆盖页面里的留言接口地址；
  仓库根目录的中英文 HTML 已写死生产接口地址
  `https://ryanwlab-messages.ryan-w-lab.workers.dev/api/messages`。
- **仓库里没有 `.github/workflows`**：发布不依赖 GitHub Actions，
  所以换 GitHub 托管方不影响发布，但换 Cloudflare 账号就会断。
- 留言 Worker 是**手动部署**的（改 `backend/` 下的代码才需要）：

```sh
npx wrangler deploy --config backend/wrangler.jsonc
```

---

## 5. 日常维护

### 5.1 改内容

1. 改 `index.html` / `en/index.html`（**两份都要改**，这是最容易漏的一步）
2. 改 `assets/css/style.css` / `assets/js/*.js`
3. 跑校验：`python3 scripts/check_site.py` && `node --test tests/messages.test.mjs`
4. 提交 + 写 `CHANGELOG.md` + push `main`

### 5.2 看留言

```sh
scripts/list-messages.sh          # 最近 20 条
scripts/list-messages.sh 100      # 最近 100 条
```

只读 SELECT，复用本机 Cloudflare OAuth 登录态，不含任何密钥。
网页方式：Cloudflare 控制台 → D1 → `ryanwlab-messages` → **Console** 标签 → 选 `inbox` 视图。

### 5.3 本地预览（不碰生产）

```sh
node scripts/preview-messages.mjs   # http://127.0.0.1:8766/#messages
```

内存数据、只监听本机、停止即消失，**不会写云端**。

---

## 6. 现有模块盘点

| 模块 | 状态 | 位置 |
|---|---|---|
| 内容手册（中英双版） | ✅ 完整 | `index.html`、`en/index.html` |
| 静态构建（白名单） | ✅ | `scripts/build-site.mjs` |
| 私密留言（写入） | ✅ 已上线 | `backend/worker.mjs` + D1 |
| 留言读取（私密视图 + 脚本） | ✅ | `backend/migrations/0002_inbox_view.sql`、`scripts/list-messages.sh` |
| 限流 / 冷却 / 幂等 | ✅ 有回归测试 | `tests/messages.test.mjs` |
| 90 天清理 | ✅ 定时任务 | `backend/wrangler.jsonc` 的 `crons` |
| 链接与示例一致性校验 | ✅ | `scripts/check_site.py` |
| SEO（sitemap / robots / _headers） | ✅ | `sitemap.xml`、`robots.txt`、`_headers` |
| 更新日志 | ✅ 本次新增 | `CHANGELOG.md` |
| 部署说明 | ✅ | `MESSAGE_DEPLOYMENT.md`、`DEPLOYMENT_STATUS.md` |

---

## 7. 还缺什么（交接前建议补齐）

按「不补会出什么问题」排序。

### P0 —— 不补就交接不了 / 会丢数据

| 缺口 | 风险 | 建议 |
|---|---|---|
| **CI 自动巡检** | 仓库无 `.github/`，`check_site.py` 和 8 项后端测试全靠人手跑。换人接手后没人记得跑，破洞会静悄悄上线 | 加 `.github/workflows/ci.yml`：push/PR 时跑两个校验脚本 + 一条部署后冒烟检查 |
| **D1 导出 / 备份** | 90 天自动清理 + 无备份。误清库、或想把历史留言留档时**无法恢复** | 加 `scripts/backup-messages.sh`（导出 CSV/JSON 到本地，建议加密） |
| **凭据交接清单的确认动作** | 第 2、3 节是文档，但交接时「谁把 Cloudflare 账号权限给谁」需要落到纸面 | 交接时逐项打勾（第 9 节） |
| **中英一致性校验** | 中英两份手写 HTML 已经多次不同步（§13 章节闭合、页脚、Licenses 拼写都出过问题） | 加脚本比对两边的章节 id / 数量 / 关键文案，纳入 CI |

### P1 —— 影响长期可信度与合规

| 缺口 | 风险 | 建议 |
|---|---|---|
| **访客可见的隐私说明** | 现在页面上只有一句「留言仅站长可见，不保证逐条回复」；**留存 90 天、用按日哈希做限流**这些口径只有仓库里的 .md 写 | 加 `/privacy`（或留言区折叠块）说明用途、保存期限、不公开、可申请删除 |
| **模型信息的有效期标注** | 模型参数/上下文/许可证几个月就变。现在的写法是「2026-09 视角」，容易整体过期 | 每条模型描述标注**核对日期 + 来源链接**；`CHANGELOG.md` 记录每次复核 |
| **可观测性** | `backend/wrangler.jsonc` 里 `observability.enabled: false`，没有提交量、错误率、限流命中数 | 打开 Workers Analytics，或在 D1 加一张每日计数表 |
| **内容更新节奏** | 「让人看出有人在维护」需要固定信号：更新日志页 + 页面上的最后修订日期 + 定期复核 | 加 `/changelog` 页面并在页脚链接；每季度做一次模型信息复核 |

### P2 —— 想把留言箱当正经功能运营时才需要

| 缺口 | 说明 |
|---|---|
| **回复与通知** | 现在留言进去了没有通知，回复全靠人肉轮询 D1。可选：邮件通知（Cloudflare Email Workers）、或 GitHub Issues 兜底 |
| **已读 / 已回标记** | `messages` 表没有状态字段，无法区分「已处理」和「没看」 |
| **单条删除 / 导出单条** | 误发、垃圾留言需要能单独删（当前只能按条件批量删） |
| **更强的反滥用** | 现在只靠 IP 日配额，共享网络会被误伤、换 IP 可绕过。真做公开服务需要 CAPTCHA 或邮箱验证 |
| **管理端** | 如果确实需要，**必须**是账号鉴权 + 纯文本转义，不能做成公开可读接口 |

---

## 8. 故障排查速查

| 症状 | 多半是 | 处理 |
|---|---|---|
| 页脚/留言区显示乱码 | 响应头缺 charset | 确认 `_headers` 生效（`/*.md`、`/LICENSE`） |
| 提交按钮灰着，提示「尚未接通」 | 页面里 `message-api` meta 为空 | 根目录中英文 HTML 第 6 行，填公开接口地址 |
| 提交返回 503 | `IP_HASH_SECRET` 未设置或被删 | `npx wrangler secret put IP_HASH_SECRET --config backend/wrangler.jsonc` |
| 提交被拒「今日已提交 3 条」 | 限额生效，**不是故障** | 页面已写明该规则 |
| 提交 CORS 报错 | 域名不在 `ALLOWED_ORIGINS` | 改 `backend/wrangler.jsonc` 的 `vars` 后重新部署 |
| 线上看不到新改的文件 | 该文件没进 `publicFiles` 白名单 | 改 `scripts/build-site.mjs` |
| `git push` 403 | 凭据无写权限 | `gh auth status` 看 scope；用 fine-grained PAT 时要 `Only select repositories` + `Contents: Read and write` |
| 分支删不掉 | 仓库 ruleset `main` 覆盖 `~ALL` 且禁删、无 bypass | 规则集里加 Exclude，或在 ruleset 里放开 |

---

## 9. 交接检查清单

- [ ] Cloudflare 账号已加成员 / 已移交，对方能进 D1 与 Worker
- [ ] GitHub 仓库已加协作者（Contents:write；若要改 ruleset 需 Administration:write）
- [ ] 域名 DNS 权限确认在谁手上
- [ ] `IP_HASH_SECRET` 交接方式已约定（**不要**用明文聊天传递）
- [ ] 双方都能跑通：`npx wrangler login` → `scripts/list-messages.sh`
- [ ] 双方都能跑通：`python3 scripts/check_site.py`、`node --test tests/messages.test.mjs`
- [ ] 新接手的人能独立发一版：改一行 → push `main` → 线上生效
- [ ] `CHANGELOG.md` 的维护约定已当面讲一遍
- [ ] 确认 P0 三项（CI、备份脚本、中英一致性）是否已补齐
