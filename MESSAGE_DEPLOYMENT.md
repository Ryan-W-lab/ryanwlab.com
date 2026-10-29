# 私密留言箱：部署与查看

当前状态：实现与本地测试完成，尚未连接生产 Cloudflare D1 / Worker。GitHub 存代码和静态网页；留言在私有 D1，不进入仓库。没有公开留言读取接口，也没有客户端数据库密钥。

## 功能规则

- 留言去掉首尾空白后 1–500 个 Unicode 码点，标点和内部空格计入；昵称选填，最多 20 个码点。
- 每个 IP 每个北京时间自然日最多成功保存 3 条；同日成功提交间隔至少 60 秒。
- 北京时间零点同时重置每日额度和冷却。共享出口网络共享额度；更换 IP 可绕过，不是个人身份验证或完整反机器人方案。
- 后端从 Cloudflare 边缘提供的 CF-Connecting-IP 取地址，不相信 JSON 或 X-Forwarded-For。
- D1 SQLite 触发器在写入时检查限额，防止并发突破。失败写入不占额度。
- 页面生成请求 UUID；网络失败后保持内容不变并重试，沿用同一 UUID。同日及次日重试不重复保存。刷新/关闭页面后 UUID 不保留。
- 不公开展示留言。按日 HMAC 标识用于限流；应用数据库不保存原始 IP。平台基础设施日志需由账号所有者另行检查其设置。
- 90 天后由每日任务清理，因此正常清理可能比 90 天多不到一天。不自动发送邮件或回复。

## 本地验证（不需要账号）

需要 Node.js 22.13+，推荐当前 LTS；Node 内置 SQLite 支持必须可用。

```sh
node --test tests/messages.test.mjs
python3 scripts/check_site.py
node scripts/preview-messages.mjs
```

访问 http://127.0.0.1:8766/#messages 。测试数据只在内存，停止服务即消失；只监听本机，无云写入。预览不会运行定时清理。不要输入真实个人资料来测试。

## 部署后端（需要 Cloudflare 登录）

在本项目根目录执行。通过 Cloudflare 官方 Wrangler CLI 的浏览器 OAuth 登录，不要把令牌发到聊天或提交仓库。以下使用 npm 官方包 `wrangler`。

```sh
npx wrangler login
npx wrangler d1 create ryanwlab-messages --config backend/wrangler.jsonc
```

将创建结果的 database_id 填入 `backend/wrangler.jsonc`，替换 `REPLACE_WITH_CREATED_D1_DATABASE_ID`。确认允许来源为正式网站的准确 Origin（协议＋域名），不要设置为 `*`。

```sh
npx wrangler d1 migrations apply ryanwlab-messages --remote --config backend/wrangler.jsonc
npx wrangler secret put IP_HASH_SECRET --config backend/wrangler.jsonc
npx wrangler deploy --config backend/wrangler.jsonc
```

IP_HASH_SECRET 应在本地生成至少 32 字节随机值，通过 Wrangler 的隐蔽交互输入设置；不要贴到聊天、代码或网页。保持稳定，变更密钥会重置当前 IP 额度。密钥缺失时后端返回 503，不会假装保存成功。

部署后取得 Worker 的公开 URL，接口地址为 `https://你的-worker域名/api/messages`。这只是公开接口地址，不是秘密。不要部署含占位 database_id 的配置。

## 连接网页

### 已使用 Cloudflare Workers 托管静态网页

根目录 `wrangler.jsonc` 保留原 Worker 名称，新增 build 命令，静态目录改为 `site-dist`，避免把 backend、测试、Git 数据或本地秘密发布成静态文件。

在原构建环境添加公开环境变量 `MESSAGE_API_URL`，其值为上面部署好的 `/api/messages` URL，再重新构建并发布。构建脚本同时设置中英文页面。

```sh
MESSAGE_API_URL=https://你的-worker域名/api/messages node scripts/build-site.mjs
npx wrangler deploy
```

若使用 Cloudflare Pages 的 Git 集成：构建命令 `node scripts/build-site.mjs`，输出目录 `site-dist`，同样设置公开变量 MESSAGE_API_URL。后端使用单独的 Worker，不混用 Pages Functions。

### 使用 GitHub Pages

也可继续用 GitHub Pages。先按上面命令生成 `site-dist`，将 **site-dist 的内容** 作为 Pages 发布产物。已有 Actions 工作流的具体改法应在核实实际仓库发布设置后决定，不要盲目替换。

若直接从仓库分支发布，需将根目录中英文 HTML 的 `<meta name="message-api" content="">` 填成公开接口 URL。不要把数据库令牌放入 HTML。根目录未配置该值时显示“留言箱尚未接通”，提交按钮保持禁用。

## 查看留言

Cloudflare 控制台 → Workers & Pages → D1 → ryanwlab-messages → Console，可运行：

```sql
SELECT datetime(created_at, 'unixepoch', '+8 hours') AS beijing_time,
       nickname, message
FROM messages
ORDER BY created_at DESC
LIMIT 100;
```

无需开发管理员登录页；数据库查看权限依赖你的 Cloudflare 账号。只按纯文本处理留言，不把 HTML 文本插入管理页面执行。

## 上线验收

用明确标注的测试留言确认中英文都能提交、D1 中能看到记录；同日重复间隔与第四条被拒绝。使用相同请求 UUID 重试不会重复保存。测试共享网络与真实域名 CORS。确认数据库绑定、定时任务和消息查看权限后再宣布功能上线。正式平台的配额及潜在费用在部署时查看，不承诺永远免费。
