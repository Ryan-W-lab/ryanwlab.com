/* ============================================================
   §16 · 2026 折腾主场 — 独立数据层（可单独回滚）
   口径：2026-09 视角。命令以 Ollama / HF 常见路径为准；
   显存为“量化后大致门槛”估算，随上下文与引擎浮动。
   ============================================================ */
window.HB_DATA = {
  updated: "2026-09",
  items: [
    {
      name: "DeepSeek-V4-Flash",
      org: "DeepSeek · 深度求索",
      tier: "hard",              // sweet | mid | hard | cloud
      mode: "MoE 稀疏（总 284B / 激活 13B）· 1M 上下文 · 三档思考",
      why: "2026 年开源圈最热的长上下文推理选手之一：激活只 13B，理论上“算得动”的成本远低于总参量级，官方以技术报告与权重开放博得大量折腾讨论。",
      local: [
        "官方/镜像多为 <code>:cloud</code> 形态（Ollama 可直接 pull 云端档体验，不走本地算力）",
        "民间攻坚：社区把权重做成低比特 GGUF / 单文件（Apple Silicon 128GB 级内存有人跑到约 33 tok/s）",
        "结论：想“真本地”属于大内存工作站 / Apple 顶配档；普通 16GB 卡建议先用 <code>:cloud</code> 或改用 R1 蒸馏版"
      ],
      cmds: [
        { t: "云端直玩（不占本地显存）", c: "ollama run deepseek-v4-flash:cloud" },
        { t: "看有哪些 tag（含社区量化）", c: "ollama show deepseek-v4-flash --modelfile || true" }
      ],
      caveat: "V4 为预览系列，许可与发布节奏以官方仓库/HF 页为准；低比特民间量化质量参差，长文任务先验再上。"
    },
    {
      name: "Qwen3.8-27B",
      org: "阿里 · 通义 Qwen",
      tier: "mid",
      mode: "27B 稠密 · 视觉 + 工具 + thinking",
      why: "2026 年 Qwen 家的“全能中坚”：27B 体量、多模态与工具调用齐全，编程/研究/长任务都能打，社区量化贴多，是 24GB 卡上话题度极高的一档。",
      local: [
        "24GB 卡：社区有 Q4（约 100K 上下文）本地配方，直接可跑",
        "16GB 卡：降到 Q3/Q4 并压上下文（8K~32K）也能起步",
        "纯 CPU/小内存：不推荐；改用同家族更小档或 Qwen3.5 低激活 MoE"
      ],
      cmds: [
        { t: "Ollama 拉取（按你显存选 tag）", c: "ollama run qwen3.8:27b" },
        { t: "自定义上下文与量化档", c: "ollama run qwen3.8:27b-q4_K_M --num-ctx 32768" }
      ],
      caveat: "视觉/工具能力是否在你的推理引擎里被完整支持，取决于引擎版本；先跑文本、再开多模态。"
    },
    {
      name: "Qwen3.5-35B-A3B",
      org: "阿里 · 通义 Qwen",
      tier: "mid",
      mode: "MoE（总 35B / 激活 3B）· 多模态家族",
      why: "“总参看着大、每 token 只叫 3B”的典型：显存按 35B 量化放，算力却接近小模型，是个人工作站上体验接近“大模型智商”的性价比路线。",
      local: [
        "约 20–24GB 显存：Q4 量化跑得挺舒服",
        "内存够大时：llama.cpp 可把部分层放内存，速度换容量",
        "低激活意味着 decode 快，长对话不易卡成幻灯片"
      ],
      cmds: [
        { t: "拉取并运行", c: "ollama run qwen3.5:35b-a3b" },
        { t: "看模型信息与参数量", c: "ollama show qwen3.5:35b-a3b" }
      ],
      caveat: "MoE 对“存储/带宽”更敏感；磁盘空间按量化后体积预留，别只按激活参算。"
    },
    {
      name: "GLM-5.3-Flash",
      org: "智谱 Z.ai",
      tier: "mid",
      mode: "多模态（总约 320B / 激活约 18B）· 1M 上下文 · 权重开放",
      why: "2026 年 Z.ai 的招牌之一：激活只 18B 却把代码/Agent 基准拉得很高，且权重开放（其仓注明 MIT），中文场景口碑好，是“敢在本地试”的新面孔。",
      local: [
        "官方主要为云推理（Ollama <code>:cloud</code>），追求本地需看官方/社区放出的权重与量化",
        "中小档量化 + 大内存机为民间路线；普通卡建议先云试其风格再决定是否投入"
      ],
      cmds: [
        { t: "云端体验", c: "ollama run glm-5.3-flash:cloud" },
        { t: "查阅官方权重仓", c: "echo '见 z.ai/blog + huggingface zai-org/GLM-5.3-Flash'  # 浏览器打开为准" }
      ],
      caveat: "MIT 等许可标注以官方发布页为准；“Flash”不等于小体积，仍要看总参量化后的实际占用。"
    },
    {
      name: "gpt-oss · 20B / 120B",
      org: "OpenAI",
      tier: "mid",
      mode: "开放权重 · 推理/Agent 向 · MoE（120B 档）",
      why: "OpenAI 少见的开放权重动作：20B 档在个人卡上可跑，120B 档给更强的 Agent/推理体验，社区讨论度极高（“巨头终于给权重了”）。",
      local: [
        "20B 档：约 11–16GB 显存（Q4）可跑，主流甜品卡友好",
        "120B 档：需要大显存或多卡/大内存，属工作站档",
        "Ollama 已收录 <code>gpt-oss</code>，拉取最省事"
      ],
      cmds: [
        { t: "小档（个人卡）", c: "ollama run gpt-oss:20b" },
        { t: "大档（工作站）", c: "ollama run gpt-oss:120b" }
      ],
      caveat: "开放权重 ≠ 无限制，使用前读其 license；推理模型中“思考档”会显著拉长输出时间。"
    },
    {
      name: "Gemma 4（12B / 27B / edge 档）",
      org: "Google DeepMind",
      tier: "sweet",
      mode: "开源家族 · 多模态 · 推理与 Agent 优化",
      why: "Google 的开源牌：每档都强调“在该体积上尽量能打”，小档能塞进普通笔记本，是入门折腾的稳妥选择；版本迭代快，常年在库热门。",
      local: [
        "edge/小档：CPU 或小显存也能跑",
        "12B/27B：甜品卡到工作站档，量化后门槛友好",
        "Ollama 收录齐全，命令最短"
      ],
      cmds: [
        { t: "小档", c: "ollama run gemma4:12b" },
        { t: "较大档", c: "ollama run gemma4:27b" }
      ],
      caveat: "家族档位命名与可用 tag 以 Ollama/Gemma 官方页为最新准；多模态需引擎支持。"
    }
  ]
};

/* ---------- 渲染器（独立，不影响 main.js） ---------- */
(function () {
  "use strict";
  var mount = document.getElementById("hbwall");
  if (!mount) return;
  var D = window.HB_DATA || { items: [] };

  var TIER = {
    sweet: { label: "甜品卡可跑", cls: "b-green" },
    mid:   { label: "工作站优选", cls: "b-cyan" },
    hard:  { label: "民间攻坚 / 大内存", cls: "b-amber" },
    cloud: { label: "云端轻用", cls: "b-red" }
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // 允许数据里出现受控的 <code> / <b> 标签，其余转义
  function rich(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/&lt;code&gt;/g, "\u0001").replace(/&lt;\/code&gt;/g, "\u0002")
      .replace(/&lt;b&gt;/g, "\u0003").replace(/&lt;\/b&gt;/g, "\u0004")
      .replace(/<(?!\/?(code|b)[ >])/g, "&lt;")
      .replace(/\u0001/g, "<code>").replace(/\u0002/g, "</code>")
      .replace(/\u0003/g, "<b>").replace(/\u0004/g, "</b>");
  }

  function cmdBlock(c) {
    return '<div class="hb-cmd">' +
      '<div class="hb-cmd-t">' + esc(c.t) + "</div>" +
      '<div class="term"><div class="bar">' +
        '<span class="dots"><span></span><span></span><span></span></span>' +
        '<span class="hb-cmd-label">shell</span>' +
        '<span class="copy" data-copy="' + esc(c.c) + '">⧉ 复制</span>' +
      "</div><pre>" + esc(c.c) + "</pre></div></div>";
  }

  function cardHTML(d) {
    var t = TIER[d.tier] || TIER.mid;
    return '<article class="mcard hb-card">' +
      '<div class="top"><div>' +
        '<div class="org">' + esc(d.org) + "</div>" +
        '<div class="nm">' + esc(d.name) + "</div>" +
      "</div>" +
      '<span class="badge ' + t.cls + '">' + t.label + "</span></div>" +
      '<div class="spec"><span class="badge b-cyan">' + rich(d.mode) + "</span></div>" +
      '<div class="rt">' + rich(d.why) + "</div>" +
      '<div class="vc" style="border-top:1px dashed var(--line);padding-top:10px;margin-top:8px">' +
        "<b>本地怎么折腾 · </b><ul class='hb-list'>" +
          d.local.map(function (x) { return "<li>" + rich(x) + "</li>"; }).join("") +
        "</ul>" +
      "</div>" +
      '<div class="hb-cmds">' + d.cmds.map(cmdBlock).join("") + "</div>" +
      '<div class="hb-cav"><b>注意 · </b>' + rich(d.caveat) + "</div>" +
    "</article>";
  }

  mount.innerHTML = D.items.map(cardHTML).join("");

  var stat = document.getElementById("hbstat");
  if (stat) stat.textContent = D.items.length + " 款 · 更新 " + (D.updated || "");

  // 命令复制（新块自带，避免依赖 main.js 的旧绑定）
  mount.addEventListener("click", function (e) {
    var b = e.target.closest(".copy");
    if (!b) return;
    var txt = b.getAttribute("data-copy") || "";
    if (navigator.clipboard && txt) {
      navigator.clipboard.writeText(txt).then(function () {
        var old = b.textContent; b.textContent = "✓ copied";
        setTimeout(function () { b.textContent = old; }, 1400);
      });
    }
  });
})();
