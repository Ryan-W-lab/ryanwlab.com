# 更新日志

本站的维护记录。新增条目放在最上面，按时间倒序。

记录约定：每条写清「改了什么 / 为什么 / 怎么验证」。涉及模型参数、上下文长度、
许可证一类会随时间过期的信息，必须在条目里写明核对日期与来源。

---

## 2026-11-01 · 模型信息更新到 2026 年 11 月（核对于 2026-11-01）

**改了什么**

- §03 硬件表：甜点区模型全部换成当前可跑的（`qwen3.5:0.8b`…`qwen3-next:80b`、`gemma4:*`、
  `muse-glimmer:30b`、`nemotron-3.5-bolt-74b-a9b` 等），并标注 Ollama 标签写法。
- §04 重构成两块：**「前沿超大模型追踪」**（本地跑不动、看趋势用：DeepSeek-V4-Pro 1.6T、
  Kimi K3 2.8T、Qwen3.8 2.4T、Kimi K2.5 1T、Muse-Spark 816B、GLM-5.x 约 753B）
  在上，**「本地可部署清单」**在下（中英各 21 个模型，每条附官方来源链接）。
- 本地清单按显存从 1GB 端侧一路排到 4 张 80GB 级服务器，并明确写入分界线：
  **本地清单 = Q4 约 320GB 以内**，再往上归入前沿板块。
- 补齐此前被漏掉的 **Flash 与低激活中大模型**：GLM-4.7-Flash（30B-A3B，19GB）、
  GLM-5.3-Flash（320B-A18B）、MiniMax M3 / M3.1-Flash（428B-A23B）、
  DeepSeek-V4.1-Flash（552B-A8~16B）、DeepSeek-V4-Flash（284B-A13B）、
  Qwen3.8-Flash-Next（125B-A6B）、Mistral Medium 3.5（128B 稠密）、DeepSeek-V3.2、
  Nemotron 3.5 Bolt、granite4.2 / Nemotron Nano、MedGemma 1.5 / MiniCPM-V 4.6。
- §03 硬件表从 5 档扩到 6 档，新增「48–96GB 单/双专业卡」与「96GB+ 多卡服务器」两档。
- `scripts/check_i18n.py` 增加模型名单对齐检查：各表按 `id` 配对比较行数，
  中文 JS 卡片墙的条数必须等于英文本地清单行数，并按型号 token 逐条比对 ——
  防止两页名单悄悄错位（本次就是靠它发现英文表格被覆盖的失误）。
- 新增 `scripts/gen_model_catalogue.py`：**中英两份清单改为由单一数据源生成**，
  每个模型一条记录同时给出中英两种写法与全部字段。此前两份是手工维护，
  正是「英文表格被覆盖」的根源。
- §04 扩为六个板块：前沿超大模型（开放权重、单机跑不动）· 闭源旗舰（只能走 API）·
  本地可部署清单（LLM，35 个）· 嵌入与重排 · 语音 · 视频与 3D。
- 闭源旗舰表收录 18 个前沿模型（GPT-6 系、Claude 5.5 系、Gemini 4、Grok 4.7、
  Muse Wonder、Mistral Large 4、DeepSeek V4、Qwen3.8-Max、Kimi K3.1 Pro、GLM-5.3、
  ERNIE 5.1、Seed 2.1 等），并写明 2026-11-01 观测到的官方定价。
- 垂直模型三张表补上手册一直缺的领域：嵌入/重排（Qwen3 系、jina v5、BGE-M3、
  gte、EmbeddingGemma 2）、语音（Qwen3-ASR/TTS/Omni、GLM-ASR-Nano、Fun-ASR-Nano、
  SenseVoice、FireRedASR2、omniASR、Voxtral）、视频与 3D（Wan2.2、HunyuanVideo-1.5、
  LTX-2.x、TRELLIS.2）。
- 本地清单从 21 个扩到 35 个，补入 Step 3.5/3.7 Flash、Ling 3.0/3.1、
  Hy-SimulMT、ERNIE 4.5、Command A+、Mistral Large 4、Ministral 3、
  Nemotron 3.5 Super/Lightning/Bolt、GLM-4.6V、MiniCPM-V 4.7、Step3-VL-10B、
  DeepSeek-OCR-2、EXAONE 4.5、Intern-S1、SmolLM3、Devstral Small 2 等。
- **许可一律以 Hugging Face 模型卡 API 实测为准**，不采信二手转述：实测发现
  GLM-5.3 是 `other`（专有）而 GLM-5.3-Flash 是 `mit`；Mistral Large 4 是 `other`；
  Qwen3.8-27B 是 Apache-2.0 而 2.4T 版是 `other`。据此修正了「GLM-5.3 属 MIT」
  的错误说法，并纠正 Kimi K3.1 Pro「已开放权重」的表述（公开权重仓库尚未上线）。
- §04 免责声明加上**核对日期**，首次部署建议改用当前模型。
- §13 厂商表、时间线、11 处「现役视角」段落更新到 2026-11。

**这一轮核到的关键事实（均有官方来源）**

- **Qwen3.5 / 3.6 / 3.8** 全尺寸 Apache-2.0，原生 262,144 上下文（可 YaRN 扩到 1,010,000）；
  `qwen3.6:27b` Q4 约 18–19GB，单张 24GB 刚好装下。**Qwen3.8 的 2.4T 版换成了专有许可**，
  本地实际可用的是 27B 档。
- **Gemma 4**（2026-03）是唯一「全尺寸 Apache-2.0 + 原生音频输入」的开放权重家族，
  含 26B-A4B（激活 3.8B）。
- **Meta 没有 Llama 5 开放权重**，开放路线改用 **Muse** 品牌：`Muse-Glimmer-30B`（Apache-2.0）。
- **OpenAI 没有 gpt-oss-2**，`gpt-oss-20b/120b` 仍是唯一开放权重系列。
- **DeepSeek 没有 R2**，窗口内也没有新的 R1 权重；V4 系把 1M 上下文做成默认，
  但 **Ollama 只有 `:cloud` 标签，没有本地权重**。
- **许可证开始分叉**：GLM-5.3、MiniMax-M2.7（禁商用）、Kimi K3、Qwen3.8 的 2.4T 版
  都改用专有或禁商用条款；MiniMax 一年内从修改 MIT 一路改到 M2.7 禁商用、M3 社区许可。
  仍为 MIT/Apache-2.0 的本地出口：GLM-4.7-Flash、GLM-5.3-Flash、Gemma 4、
  Muse-Glimmer-30B、Qwen3.6-27B。
- **NVIDIA Nemotron 3.5 Bolt 74B-A9B-24GB** 是官方为「单张 24GB 显卡」定制的权重。

**怎么验证**

```sh
python3 scripts/check_site.py          # 链接与锚点
python3 scripts/check_i18n.py          # 中英结构与文案一致
node --check assets/js/main.js         # 模型墙数据语法
node --test tests/messages.test.mjs    # 后端回归
```

未核对到一手来源的字段（GLM-5.x 的激活参数量、部分专有许可条款、若干上下文长度）
**没有写进页面**。

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
