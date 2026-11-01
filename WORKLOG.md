# 工作日志 · 2026-11-01

面向接手维护者的工作记录：这一轮做了什么、为什么这么做、踩过哪些坑。
面向访客的版本变更记录在 [`CHANGELOG.md`](CHANGELOG.md)。

---

## 一、这一轮的总目标

1. 留言框：删掉只给站长看的内部提示，只保留对访客有用的信息
2. 留言内容要**随交付可查**（脚本 + 文档 + 备份）
3. 把网站做成"能看出有人在维护"的样子：内容更新到 2026-11、加更新日志、加 CI
4. 模型内容补齐：不只看小模型，Flash 与中大模型也要进"本地可部署"，跑不动的另开板块

---

## 二、留言框提示精简

### 做了什么

- 删除「留言内容」下方的三段内部说明：每日限额明细、90 天清理机制、IP 摘要机制
- 保留一行 `1—500 个字符` + 右侧实时计数
- 补一行访客真正用得上的额度说明：`同一网络地址每天最多提交 3 条，两次提交之间至少间隔 60 秒`
- 追加留存口径：仅站长可见、90 天后自动删除、不公开不自动回复
- `aria-describedby` 从 `message-rules message-count` 改为 `message-count message-note`

### 为什么额度说明要留着

限流是**后端强制**的（`backend/migrations/0001_messages.sql` 的触发器）。删掉提示后，
被拒的访客只会看到一句报错，容易被当成网站坏了或被恶意刷。删掉的是实现细节，
保留的是会被真实拦住用户的规则 —— 这两者的边界就是判断标准。

### 同步改动

`assets/css/style.css` 删除已无引用的 `.message-rules`，新增 `.message-note`；
`scripts/check_i18n.py` 会拦截"内部说明重新出现在页面上"。

---

## 三、GitHub 推送授权（本次最大的坑）

### 现象

`git push` 一直 403 / 反复超时。根因有四层，逐层剥开：

| 层 | 现象 | 原因 |
|---|---|---|
| 1 | `could not read Username for 'https://github.com'` | 这台机器**从 2026-09 起就没有任何 GitHub 凭据**：无 `gh` CLI、无 token、无 SSH key、keychain 里也没有条目 |
| 2 | 设备码流程反复 `authorization_pending` 超时 | 浏览器授权页能打开，但「Allow」那一步始终没提交；浏览器不是用户当前操作的窗口 |
| 3 | 拿到令牌但 push 仍 403，`x-oauth-scopes` 为空 | **GitHub 不会在已有授权上扩权**。重复授权只会拿回当初那份额度（这里是零），必须先 Revoke 再授权 |
| 4 | 令牌有权限了但推 `.github/workflows/` 被拒 | 细粒度 PAT 需要额外勾 **Workflows → Read and write**（经典 PAT 则是 `workflow` scope） |

### 结论与做法

- 长期方案：**建一个细粒度 PAT**，`Repository access` 选 **Only select repositories**，
  勾选目标仓库；`Repository permissions` 里按需给 `Contents: Read and write`、
  `Workflows: Read and write`。**不要选 "Public repositories (read-only)"** ——
  本仓库是公开仓库，选它就等于只读（本次就踩了这个坑）。
- 绕过 workflow 限制的做法：**先把 CI 文件单独放一个本地分支**，内容照常推 `main`，
  等权限到位再推那个分支。期间 `origin/main` 的普通提交完全不受影响。

### 教训

- 「登录成功」≠「有写权限」，要分别确认：登录状态（`gh auth status`）、
  scope（`x-oauth-scopes` 响应头）、仓库权限（写入探针：建一个临时分支再删）。
- 页面授权类操作在无人值守环境里不可靠，能用表单 + 复制粘贴就别用 OAuth 跳转。

---

## 四、文档与交接

| 文件 | 作用 |
|---|---|
| `HANDOVER.md` | 交付与交接手册：资产清单、凭据红线、发布链路、日常维护、**还缺什么模块（P0/P1/P2）**、故障排查表、交接检查清单 |
| `CHANGELOG.md` | 对外的更新日志 + 维护约定（含「模型信息必须带核对日期与来源」这条硬规矩） |
| `WORKLOG.md` | 本文件，工作过程记录 |
| `VALIDATION.md` | 每次改动的验证方式与验证结果、验证边界 |
| `DEPLOYMENT_STATUS.md` | 生产环境当前状态快照 |
| `MESSAGE_DEPLOYMENT.md` | 留言箱部署细则 + 查看/备份脚本用法 |

### 关键结论：Cloudflare 账号是单点

GitHub 仓库可以转手，但静态站 Worker、留言 Worker、D1、域名、自动发布集成**全在同一个
Cloudflare 账号**（`ryan_w_lab@outlook.com`，Account ID `ed010bdbe3fc9f49c4875719ea11e49b`）。
交接时必须一起谈，否则对方拿到仓库也发不了版、也看不到留言。

---

## 五、工具与自动化

| 工具 | 作用 | 备注 |
|---|---|---|
| `.github/workflows/ci.yml` | push/PR 自动跑三个校验 + 线上冒烟 | 仓库此前**完全没有** `.github/`，校验全靠人手 |
| `scripts/check_i18n.py` | 中英结构、文案、模型名单三方对齐 | 含模型名单逐条比对，防止两页名单悄悄错位 |
| `scripts/list-messages.sh` | 终端查看生产留言箱（只读），`--watch` 实时刷新 | 复用本机 Cloudflare OAuth，不含密钥 |
| `scripts/backup-messages.sh` | 导出留言 CSV 到 `backups/`（已 gitignore） | 90 天自动清理后没有它就不可恢复 |
| `scripts/shot-section.sh` | 把某一节单独渲染并截图，用于排版自检 | 见下 |

### `shot-section.sh` 为什么需要

站点有开场遮罩与滚动渐显动画，直接截图只会得到一张黑图。这个脚本会复制一份 `site-dist/`，
注入 `#veil{display:none}` 与 `.reveal-seed>*{opacity:1}` 之类的覆盖样式，
再把 `<main>` 里除目标 `<section>` 外的兄弟节点全部隐藏，最后用无头 Chrome 截图。

用法：`scripts/shot-section.sh models /tmp/out.png 1500 2800`

这一轮就是靠它发现了「英文站两个表格被写串」的问题 —— 肉眼读 HTML 很难发现。

---

## 六、模型内容更新（核对于 2026-11-01）

### 调研方法

分四路并行做，每路都要求**只用一手来源**（官方 Hugging Face 模型卡 / 官方 GitHub release notes /
官方博客 / 官方定价页），SEO 聚合站只能用来"发现候选"，不能作为事实来源。
任何查不到的字段一律写 `UNVERIFIED — do not publish`，**宁可少写也不猜**。

| 路 | 范围 |
|---|---|
| A | 国内厂商（腾讯混元、字节 Seed、百度 ERNIE、阶跃、蚂蚁、小米、昆仑、华为、上海AI Lab、OpenBMB…） |
| B | 海外厂商（NVIDIA Nemotron、AI2 OLMo/Tulu、IBM Granite、Cohere、LG EXAONE、TII Falcon、Mistral、SmolLM…） |
| C | 多模态与垂直（视觉、音频、语音、视频、3D、代码专家、**嵌入/重排**、端侧小模型） |
| D | 闭源旗舰（OpenAI / Anthropic / Google / xAI / 各家 API 与 App 产品线） |

### 调研纠正的事实（曾被广泛误传）

- **不存在 Llama 5 开放权重** —— Meta 的开放路线改用 **Muse** 品牌（Muse-Glimmer-30B / Muse-Spark-Open）
- **不存在 gpt-oss-2** —— OpenAI 至今只有 gpt-oss-20b/120b 与 safeguard 版
- **不存在 DeepSeek-R2** —— 窗口内也没有新的 R1 权重
- **Qwen3.5 / 3.6 / 3.8 本身就是原生视觉语言模型**，没有 "Qwen3.5-VL" 这种独立仓库（社区把文本模型叫 VLM）
- **Qwen3.8 的 2.4T 版换成专有许可**（Qwen3.8-Max License），本地实际可用的是 Apache-2.0 的 27B
- 许可证这一年明显分叉：GLM-5.3、MiniMax-M2.7（禁商用）、Kimi K3、Qwen3.8 2.4T 转专有；
  而 Gemma 4、Muse-Glimmer-30B 走 Apache-2.0

### 页面结构的三分法

原来的 §04 只列"个人机跑得动"的模型，把 Flash 与低激活中大模型一律归到"跑不动"，这是错的。
现在改成三块：

1. **前沿超大模型**（开放权重但单机跑不动，看趋势）
2. **闭源旗舰**（只能走 API/订阅，用于了解行业上限）
3. **本地可部署清单**（能真在本地跑起来的，从 1GB 端侧到 4 张 80GB 卡）

分界线写在页面上：**本地清单 = Q4 约 320GB 以内**，再往上归前沿板块。

### 模型卡为什么加字段

每张卡从「一句话描述」升级为：**参数规模 / 上下文 / 可用档位 / 显存门槛 / 发布时间 / 本地档位徽章**。
理由：手册的价值在于"能据此判断要不要装"，参数和上下文是判断的最小信息集。

---

## 七、本轮踩过的坑（都在代码里留了防护）

| 坑 | 后果 | 防护 |
|---|---|---|
| 批量替换英文表格时，前一个 `<tbody>` 选错 | 前沿表被写成了本地清单，旧清单留在下面 | `scripts/check_i18n.py` 增加「行数 + 型号 token 逐条比对」，两种错位都做了反向测试 |
| 生成的 JS 里空字段写成 `ctx:,` | 整个 `main.js` 语法错误，模型墙全白 | 提交前跑 `node --check assets/js/main.js`；CI 里也有 |
| PAT 选了 "Public repositories (read-only)" | push 403，误以为是网络问题 | 文档写进 `HANDOVER.md`；本次即用 `x-oauth-scopes` 响应头定位 |
| 细粒度 PAT 没给 Workflows 权限 | `.github/workflows/` 无法推送 | CI 文件单独分支，内容先推 |

---

## 八、页面自查（2026-11-01 下午）

新增 `scripts/audit_models.py` 做**内容审计**，加上 `scripts/shot-section.sh` 做**排版自检**，
两者合起来替代"肉眼扫一遍"。这一轮它们抓出的**真错误**：

| # | 问题 | 后果 | 怎么发现的 |
|---|---|---|---|
| 1 | 英文本地清单表的**表头还是旧的 6 列**，数据行已经是 8 列 | 英文页表格列名与内容对不上，读者完全看不懂哪列是什么 | 审计脚本比对表头 `<th>` 数与每行 `<td>` 数 |
| 2 | 嵌入表里 Nemotron 那行**少了一列**（缺「维度」） | 该行少一格，列错位 | 同上 |
| 3 | 英文 §04 导语写 "Six blocks"，实际列了七块 | 自相矛盾 | 审计脚本核对导语关键词与板块数 |
| 4 | 厂商列太窄，「阿里 · 通义」被折成两行 | 排版凌乱 | 截图肉眼发现 → 加 `white-space:nowrap` |
| 5 | 窄屏表格被硬切，看不出能横向滑 | 手机端体验差 | 手机尺寸截图 → 导语加提示 + 表格容器已有 `overflow-x:auto` |

审计脚本本身也修了几处误报（`<thead>` 被当成 `<th>`、合法英文 "None" 被当占位符、`}}` 是 CSS 语法）。

**教训**：中英两份手写 HTML 必然漂移。第 4、5 号错误都是"改了数据忘了改表头"或"改了文案忘了改另一份语言"造成的。
现在的防线是三道：
1. **单一数据源** —— `scripts/gen_model_catalogue.py` 同时生成中英两边
2. **结构校验** —— `scripts/check_i18n.py` 按 table id 配对比对行数与型号 token
3. **内容审计 + 截图** —— `scripts/audit_models.py` 查字段/占位符/列数，`scripts/shot-section.sh` 查排版

---

## 九、版面复检：改数不等于好看（同日第二次自查）

第一次自查靠截图，结论是「已修好」。但用户仍然问「为什么开头字没顶满就换行」——
说明截图看着像好了，实际没量。

改用量尺寸：给无头 Chrome 注入脚本，读 `getBoundingClientRect()`。结果：

| 项 | 实测 | 结论 |
|---|---|---|
| `.lead` 宽 | 960px，容器内容宽 1052px | 仍短 92px，上次只做了对齐没做宽度 |
| 英文 `#tbl-local` | 表 1103px，容器 1052px | 桌面端要横向滚 51px，最右列看不见 |
| 厂商列 | 单行 | ✓ 上次的 nowrap 有效 |

修完再量，三个宽度（1500/1280/1024）下全部 0 溢出。

**踩坑记录**：先用 `table-layout:fixed` + 百分比列宽，确实能塞进容器，但
「Released」被掰成「Releas / ed」、「Apache-2.0」被掰成「Apache- / 2.0」。
**能塞下 ≠ 好看**。改用自动布局 + 表头换行 + 收窄内边距，文字保持完整。

另一个坑：`@media` 写在基础规则前面会被后面的 `table.tbl{...}` 覆盖，
断点必须放在文件末尾或提高选择器优先级。

**新增 `scripts/check_layout.sh`**：把「导语满宽 / 表格不溢出 / 厂商列不折行」
变成可执行断言。验证方式是把 CSS 故意改坏再跑，确认它报的正是原始症状
（`阿里 · 通义` 折行、导语 900/1052）。CI 的 ubuntu runner 没有 Chrome，
所以这个脚本只在本地跑。

---

## 十、遗留事项

| 项 | 优先级 | 状态 |
|---|---|---|
| 无 `read:org` 的 PAT 无法存进 `gh` keyring | 低 | 需要时给经典 PAT 补 `read:org` scope |
| `_probe` 分支删不掉 | 低 | 仓库 ruleset 禁删所有分支，需先加 Exclude |
| Worker observability 仍关闭 | 中 | 没有提交量/错误率统计 |
| 留言无回复通知 / 已读标记 | 中 | 要把留言箱当正经功能运营才需要 |
| 访客可见的独立隐私页 | 中 | 已在留言框写清留存口径，独立页面未做 |
| 闭源模型板块 | 本轮 | 已按调研结果补入 |

---

## 十一、验证清单（每次改动都跑）

```sh
python3 scripts/check_site.py          # 链接、锚点、示例源码一致
python3 scripts/check_i18n.py          # 中英结构 + 文案 + 模型名单对齐
node --check assets/js/main.js         # 模型墙数据语法
node --test tests/messages.test.mjs    # 后端限额/冷却/幂等回归（8 项）
python3 scripts/audit_models.py        # 模型目录内容审计（字段/占位符/列数/来源）
git diff --check                       # 空白与行尾
scripts/check_layout.sh                # 版面断言：导语满宽/表格不溢出/厂商列不折行（需 Chrome）
scripts/shot-section.sh models /tmp/out.png   # 截图自查（可选）
```

线上核对：`https://ryanwlab.com/` 与 `https://ryanwlab.com/en/` 应同时出现新提示、
旧提示 0 残留；GitHub Actions 的 `Site checks` 需为 success。
