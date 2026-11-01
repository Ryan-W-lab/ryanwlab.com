# 更新日志

本站的维护记录。新增条目放在最上面，按时间倒序。

记录约定：每条写清「改了什么 / 为什么 / 怎么验证」。涉及模型参数、上下文长度、
许可证一类会随时间过期的信息，必须在条目里写明核对日期与来源。

---

## 2026-11-01 · 留言框提示精简 + 额度提示 + 留言查看脚本

**改了什么**

- `index.html` / `en/index.html`：删除「留言内容」输入框下方的三段内部说明
  （每日限额明细、90 天清理机制、IP 摘要机制），只保留一行面向访客的
  `1—500 个字符` 与右侧实时计数 `0 / 500`。
- `index.html` / `en/index.html`：补一行面向访客的额度说明
  「同一网络地址每天最多提交 3 条，两次提交之间至少间隔 60 秒」。
  理由：限流仍由后端强制执行，页面上完全不写会让被拒的访客误以为网站坏了。
- `assets/js/messages.js` 无需改动（`aria-describedby` 指向已更新的 id）。
- `assets/css/style.css`：移除已无引用的 `.message-rules` 规则，新增 `.message-note`。
- 新增 `scripts/list-messages.sh`：终端里一条命令查看生产 D1 留言箱。

**为什么**

内部实现细节（IP 摘要、清理任务、零点重置机制）属于运维信息，对访客没有帮助，
只会让留言框显得像一份技术文档。额度规则不同——它会真实拦住用户，必须写明。

**怎么验证**

```sh
python3 scripts/check_site.py          # 链接、ID 唯一性、示例源码一致性
node --test tests/messages.test.mjs    # 后端限额/冷却/幂等回归，8 项
scripts/list-messages.sh               # 读取生产留言箱（只读 SELECT）
```

线上核对：中文站与英文站均显示新提示，旧提示关键词 0 残留。

---

## 2026-10-29 · 留言箱上线（私密留言功能首版）

- 新增后端 Worker `backend/worker.mjs` + D1 迁移（`0001_messages.sql`、`0002_inbox_view.sql`）
- 新增私密留言视图 `inbox`（北京时间 / 昵称 / 留言）
- 原子限额：同一 IP 每北京时间日 3 条、间隔 60 秒，由数据库触发器强制
- 90 天保留期 + 每日定时清理
- 幂等：同一请求 UUID 重试不重复保存
- 新增校验脚本 `scripts/check_site.py` 与回归测试 `tests/messages.test.mjs`
- 中英文页面接入私密留言表单

---

## 2026-09-18 · 乱码与标记修复

- `LICENSE` 乱码：文件为 UTF-8 无扩展名，浏览器默认按 Latin-1 解码 →
  在 `_headers` 显式声明 `Content-Type: text/plain; charset=utf-8`
- 页脚 ASCII 字标按标准 figlet 修复；英文站补齐字标
- `Licences` → `Licenses` 拼写
- 页脚版权署名改为 Ryan W Lab 并挂载 CC BY-NC-SA 4.0 许可链接（中英双版）
- 清除 AI 写稿草稿痕迹（细说大厂区块的交付说明、标题草稿标记）
- §01 ASCII 推理图改用确定性宽度字符并严格对齐（中英双版）
- 英文站 §16 改为静态卡片，去掉 JS 依赖；修正 §13 章节闭合

---

## 维护约定（给后续维护者）

1. **改内容 = 改 commit + 改这份日志**，两者一起提交。
2. **模型信息必须带核对日期与来源链接**。参数、上下文长度、许可证会变，
   没有来源的模型描述不要写进页面。
3. **每次改动后跑一遍**：`python3 scripts/check_site.py` 和
   `node --test tests/messages.test.mjs`。
4. **推送 `main` 即发布**（Cloudflare Git 集成自动构建），不需要额外发布步骤。
5. 涉及限流、留存、隐私口径的改动，**中英文页面都要改**，并同步
   `MESSAGE_DEPLOYMENT.md`。
