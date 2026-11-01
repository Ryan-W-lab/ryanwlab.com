/* ============================================================
   LOCAL LLM GATE — 交互逻辑
   ============================================================ */
(function () {
  "use strict";
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- 读取滚动进度条 ---------- */
  function onScroll() {
    const docH = document.body.scrollHeight - innerHeight;
    const p = docH > 0 ? (scrollY / docH) * 100 : 0;
    const bar = $(".progress");
    if (bar) bar.style.width = p + "%";
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Typewriter 打字机 ---------- */
  function typewriter(el, text, speed, ondone) {
    if (!el) return;
    let i = 0; el.textContent = "";
    (function t() {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(t, speed);
      } else if (ondone) ondone();
    })();
  }
  const tyEl = $("#tw");
  const lines = document.documentElement.lang.startsWith("en") ? ["> Start small. Run locally.", "> Check the sources. Test the commands."] : [
    "> ./boot local_ai.sys --homebrew",
    "> 从小模型开始 · 先跑通再调优",
    "> 每一行代码，都不该被云端遥控。"
  ];
  let li = 0;
  function tyLoop() {
    if (!tyEl) return;
    const cur = li % lines.length;
    typewriter(tyEl, lines[cur], 26, () => {
      setTimeout(() => { li++; tyLoop(); }, 1400);
    });
  }
  tyLoop();

  /* ---------- 滚动 section 高亮：右侧 TOC + 顶部逐节 ---------- */
  const tocSc = $("#sidenav") ? $("#sidenav .sn-scroll") : null;
  const tocLinks = $$("#sidenav .tocL");
  const topLinks = $$("#topNav a[data-go]");
  const drawerLinks = $$("#navDrawer .nd-list a");
  const deepIds = ["moe", "kv", "sampling", "structured"];
  const snDeep = $("#snDeep");
  const guruBtn = $("#guruJump");
  function openSnDeep(auto) { if (snDeep && auto) snDeep.setAttribute("open", ""); }
  function setActive(id) {
    let inD = deepIds.includes(id);
    tocLinks.forEach((a) => {
      const on = a.dataset.go === id;
      a.classList.toggle("on", on);
      if (on) {
        if (tocSc) { const h = a.offsetTop - tocSc.clientHeight / 2; tocSc.scrollTo({ top: Math.max(0, h), behavior: "smooth" }); }
      }
    });
    topLinks.forEach((a) => a.classList.toggle("on", a.dataset.go === id));
    drawerLinks.forEach((a) => a.classList.toggle("on", a.dataset.go === id));
    if (guruBtn) guruBtn.classList.toggle("on", inD || id === "players");
    if (inD) openSnDeep(true);
    // Scrollspy highlights navigation without rewriting the clicked URL hash.
  }
  const spy = new IntersectionObserver(
    (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }); },
    { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
  );
  $$("section[id]").forEach((s) => spy.observe(s));

  /* ---------- 右侧 TOC 的开合（窄屏抽屉 + 深水组） ---------- */
  const tog = $("#sn-toggle"), sn = $("#sidenav");
  if (tog && sn) {
    tog.addEventListener("click", () => { sn.classList.toggle("open"); });
    sn.addEventListener("click", (e) => {
      const t = e.target.closest(".tocL");
      if (t && t.dataset.go !== "moe") sn.classList.remove("open");
    });
  }
  /* 顶部 ⟠ 深水按钮：先补展开深水组，再跳到 §09 顶部并高亮 */
  if (guruBtn) guruBtn.addEventListener("click", () => {
    const sn = $("#sidenav"), m = $("#moe");
    openSnDeep(true);
    if (sn && !sn.classList.contains("open") && !window.matchMedia("(min-width:1710px)").matches) sn.classList.add("open");
    if (m) { m.scrollIntoView({ behavior: "smooth", block: "start" }); setActive("moe"); }
  });

  /* ---------- 移动端章节抽屉（≤900px 汉堡菜单） ----------
     两步可达：① 点 ☰ 章节  ② 点章节链接
     支持 Esc 关闭、点击遮罩关闭、焦点圈定（Tab 循环）、打开时锁定页面滚动
  ------------------------------------------------ */
  const navToggle = $("#navToggle"), navDrawer = $("#navDrawer");
  if (navToggle && navDrawer) {
    const panel = $(".nd-panel", navDrawer);
    const closeBtn = $("#navDrawerClose");
    let lastFocus = null;

    function drawerOpen() { return navDrawer.classList.contains("open"); }

    function openDrawer() {
      lastFocus = document.activeElement;
      navDrawer.classList.add("open");
      navToggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      const first = closeBtn || (panel && panel.querySelector("a,button"));
      if (first) first.focus();
    }
    function closeDrawer() {
      navDrawer.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    navToggle.addEventListener("click", () => {
      drawerOpen() ? closeDrawer() : openDrawer();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    /* 点击遮罩（面板外）或点击任一章节链接后关闭 */
    navDrawer.addEventListener("click", (e) => {
      if (e.target === navDrawer || !e.target.closest(".nd-panel")) { closeDrawer(); return; }
      const a = e.target.closest(".nd-list a");
      if (a) closeDrawer();
    });

    /* Esc 关闭 + Tab 焦点圈定（模态对话框行为） */
    navDrawer.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll('a[href],button:not([disabled])'))
        .filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* 视口回到 >900px 时强制收起，避免抽屉残留 */
    const mq = window.matchMedia("(min-width:901px)");
    const onWide = (ev) => { if (ev.matches && drawerOpen()) closeDrawer(); };
    mq.addEventListener ? mq.addEventListener("change", onWide) : mq.addListener(onWide);
  }

  /* ---------- Reveal 滚动进入 ---------- */
  $$(".reveal-seed").forEach((el) => {
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const kids = Array.from(entry.target.children);
          kids.forEach((c, i) => setTimeout(() => c.classList.add("is-in"), i * 70));
          io.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px 100px 0px" }
    );
    io.observe(el);
  });

  /* ---------- Veil 开机加载 ---------- */
  const veil = $("#veil");
  const bootlines = [
    "[ OK ] mounting /proc/geek_fs ........... done",
    "[ OK ] probing VRAM .................. done",
    "[ OK ] loading transformer.wight ..... done",
    "[ OK ] calibrating tokenizer ......... done",
    "Initializing LOCAL LLM GATE ...",
  ];
  function bootVeil() {
    if (!veil) return;
    veil.classList.add("on");
    const log = $("#bootlog");
    let i = 0;
    (function next() {
      if (i < bootlines.length) {
        if (log) log.textContent += "  " + bootlines[i] + "\n";
        i++;
        setTimeout(next, 110);
      } else {
        setTimeout(() => { veil.classList.add("done"); setTimeout(() => veil.remove(), 700); }, 350);
      }
    })();
  }
  bootVeil();

  /* ---------- 统计数字滚动 ---------- */
  function animCount(el, to, dur) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const t0 = performance.now();
    (function tick(t) {
      const p = Math.min(1, (t - t0) / (dur || 1200));
      el.textContent = Math.round(to * (0.5 - 0.5 * Math.cos(Math.PI * p)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  const cio = new IntersectionObserver((es) => {
    es.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.querySelectorAll("[data-count]").forEach((n) =>
        animCount(n, parseInt(n.dataset.count, 10), 1400)
      );
      cio.unobserve(en.target);
    });
  }, { threshold: 0.4 });
  $$("[data-count-block]").forEach((b) => cio.observe(b));

  /* ---------- 平滑跳转并保持导航 ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length <= 1) return;
      const t = $(id);
      if (t) {
        e.preventDefault();
        t.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", id);
      }
    });
  });

  /* ---------- 年份 ---------- */
  const yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- 模型墙数据 + 渲染 ---------- */
  /* 分两类：
     ① 上方「前沿超大模型」表 —— 能力上限，单机跑不动，看趋势用
     ② 本表「本地可部署」—— 能用本地算力跑起来的（含 Flash / 中大模型 / 多卡档）
     数据核对于 2026-11-01，来源见每张卡片底部「官方模型与许可」。
     显存为量化后估算：权重字节 ≈ 参数量 × 量化位宽 ÷ 8，再加 KV-Cache 与运行时开销。
     许可证以发布方仓库为准，商业使用前务必逐版核对。 */
  const KIND = { full:"全能", chat:"对话/通用", reason:"深度推理", code:"代码/智能体", vision:"视觉/多模态", edge:"轻量/端侧" };
  const ARS = [
    { n:"Qwen3.6 / Qwen3.8（27B 档）", org:"阿里 · 通义", kinds:["full","chat","code"], licText:"Apache-2.0",
      params:"27B 稠密 ｜ 35B-A3B（激活 3B）", ctx:"262,144（可 YaRN 扩到 1,010,000）", date:"2026-04 / 2026-08", tier:"t1",
      b:"2026 年的本地主力：27B 稠密 + 35B-A3B MoE，全尺寸 Apache-2.0。注意 3.8 的 27B 本身是视觉语言模型，且官方未发 GGUF。",
      sizes:"27b（稠密）· 35b-A3B · 另有 coding / MTP 变体", gpu:"27B Q4≈18–19GB，正好装进单张 24GB；35B-A3B≈23GB（激活仅 3B，KV-Cache 极小）",
      source:"https://huggingface.co/Qwen/Qwen3.6-27B" },
    { n:"Qwen3.5 全家族", org:"阿里 · 通义", kinds:["full","chat","vision","edge"], licText:"Apache-2.0",
      params:"0.8B → 397B-A17B（激活 17B）", ctx:"262,144（可扩到 1,010,000）", date:"2026-02", tier:"t1",
      b:"同一家族从 0.8B 覆盖到 397B-A17B 且全 Apache-2.0，原生多模态（图文视频）。",
      sizes:"0.8b · 2b · 4b · 9b · 27b · 35b-A3B · 122b-A10B · 397b-A17B", gpu:"0.8B≈1.2GB 起；9B≈6.6GB；27B≈17GB；35B-A3B≈22GB；122b-A10B≈81GB（需多卡）",
      source:"https://huggingface.co/Qwen/Qwen3.5-35B-A3B" },
    { n:"Qwen3-VL（视觉）", org:"阿里 · 通义", kinds:["vision"], licText:"Apache-2.0",
      params:"2B · 4B · 8B · 30B-A3B（激活 3B）· 32B · 235B-A22B", ctx:"262,144（YaRN 可扩到 1,000,000）", date:"2025-09 / 2025-10", tier:"t1",
      b:"视觉下探到 2B，本地 OCR、截图理解最现实的家族；官方称支持 32 种语言 OCR。",
      sizes:"官方 GGUF 全尺寸；Ollama 有 qwen3-vl:2b/4b/8b/30b/32b", gpu:"2B≈1.6GB、8B≈5.4GB、32B≈21GB、235B-A22B≈142GB",
      source:"https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct" },
    { n:"Qwen3-Next-80B-A3B / Coder-Next", org:"阿里 · 通义", kinds:["code","full"], licText:"Apache-2.0",
      params:"80B 总参 / 激活 3B", ctx:"262,144", date:"2025-09 / 2026-01", tier:"t2",
      b:"超稀疏 MoE：80B 总参只激活 3B，推理成本接近 8B 档；Coder-Next 是同架构的编程特化版。",
      sizes:"qwen3-next:80b · qwen3-coder-next:80b", gpu:"Q4 约 50–52GB，48–56GB 显存或双 24GB 卡可跑",
      source:"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct" },
    { n:"Gemma 4", org:"Google DeepMind", kinds:["full","vision","edge"], licText:"Apache-2.0",
      params:"E2B 2.3B ｜ E4B 4.5B ｜ 12B ｜ 26B-A4B（激活 3.8B）｜ 31B", ctx:"128K（E 档）｜ 256K（中大型）", date:"2026-03", tier:"t1",
      b:"本轮唯一「全尺寸 Apache-2.0 + 原生音频输入」的开放权重家族；注意 Gemma 4 改用了 Apache-2.0，与 Gemma 1–3 的条款不同。",
      sizes:"e2b · e4b · 12b · 26b-a4b · 31b（官方 QAT GGUF + Ollama 标签）", gpu:"E2B≈4.6GB；E4B≈6.6GB；12B≈8GB；26b-A4B≈18GB；31B≈20GB",
      source:"https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4" },
    { n:"Muse-Glimmer-30B", org:"Meta · 新开放权重品牌", kinds:["full","vision"], licText:"Apache-2.0",
      params:"29.6B（含约 1.8B 视觉编码器）", ctx:"131,072+", date:"2026-08", tier:"t1",
      b:"Meta 开放权重的新起点（并不存在 Llama 5 开放权重，官方改用 Muse 品牌）；首个 Apache-2.0 原生多模态开放模型。",
      sizes:"30b（官方 GGUF；Ollama muse-glimmer）", gpu:"Q4≈18GB，单张 24GB 即可",
      source:"https://huggingface.co/meta-models/Muse-Glimmer-30B" },
    { n:"GLM-4.7-Flash（30B-A3B）", org:"智谱 Z.ai", kinds:["full","chat","code"], licText:"MIT",
      params:"30B 总参 / 激活 3B", ctx:"202,752（4.7 本体）", date:"2026-01", tier:"t1",
      b:"Flash 档的 GLM：30B 总参只激活 3B，一张 24GB 卡就能跑 —— 本地党最友好的 GLM 入口。",
      sizes:"30b-A3B（另有 355B-A32B 的 GLM-4.7 本体）", gpu:"Q4≈19GB 单卡可跑；激活仅 3B，长上下文也不涨显存",
      source:"https://huggingface.co/zai-org/GLM-4.7-Flash" },
    { n:"GLM-5.3-Flash（320B-A18B）", org:"智谱 Z.ai", kinds:["full","vision","chat"], licText:"MIT",
      params:"320B 总参 / 激活 18B", ctx:"1,048,576", date:"2026-08", tier:"t2",
      b:"GLM-5 系列的 Flash：320B 总参激活 18B，原生多模态 + 1M 上下文，仍保留 MIT。",
      sizes:"320b-A18b（Ollama 仅有 :cloud）", gpu:"Q4≈180GB（4×48GB 或 2×96GB 级服务器）；本地需自建 vLLM",
      source:"https://huggingface.co/zai-org/GLM-5.3-Flash" },
    { n:"GLM-4.6V / 4.6V-Flash（视觉）", org:"智谱 Z.ai", kinds:["vision"], licText:"MIT",
      params:"4.6V：107.7B（MoE，取 8）｜ Flash：10.3B 稠密", ctx:"131,072", date:"2025-12", tier:"t1",
      b:"把富格式页面当图片直接读，联合理解文字/版面/图表/表格；Flash 是 9B 级的轻量视觉选择。",
      sizes:"4.6v · 4.6v-flash（官方给 GGUF，无 Ollama 标签）", gpu:"Flash Q4≈6GB 单卡轻松；4.6V Q4≈60GB 需多卡",
      source:"https://huggingface.co/zai-org/GLM-4.6V" },
    { n:"MiniMax M3 / M3.1-Flash", org:"MiniMax", kinds:["full","code","vision"], licText:"社区许可（限非商业）",
      params:"428B 总参 / 激活 23B", ctx:"1,048,576", date:"2026-06 / 2026-10", tier:"t2",
      b:"428B 总参激活 23B，原生多模态 + 1M 上下文；M3.1-Flash 还可调 thinking depth。",
      sizes:"428b-A23b（Ollama 仅有 :cloud）", gpu:"Q4≈240GB（4×80GB 或大内存 offload）；本地需自建服务",
      source:"https://huggingface.co/MiniMaxAI/MiniMax-M3" },
    { n:"MiniMax-M2.7 / M2.5", org:"MiniMax", kinds:["full","code"], licText:"禁商用（M2.7）· 自定义（M2.5）",
      params:"229B 总参 / 激活 10B", ctx:"204,800（M2.7）", date:"2026-02 / 2026-04", tier:"t2",
      b:"许可证一年三变：M2 修改 MIT → M2.5 自定义 → M2.7 直接禁商用。",
      sizes:"229b-A10b", gpu:"Q4≈130GB（2×80GB 或 128GB+ 内存 + 部分 offload）",
      source:"https://huggingface.co/MiniMaxAI/MiniMax-M2.7" },
    { n:"DeepSeek-V4.1-Flash", org:"DeepSeek · 中国", kinds:["full","vision","reason"], licText:"MIT",
      params:"552B 总参 / 激活 8–16B（384 专家 + 1 shared，取 6）", ctx:"1,048,576", date:"2026-09", tier:"t2",
      b:"552B 总参却只激活 8–16B，原生多模态 + 1M 上下文，是 DeepSeek 系里最接近本地能跑的形态。",
      sizes:"552b-A8~16b（Ollama 仅有 :cloud）", gpu:"Q4≈310GB（4×96GB 或 8×48GB 级机器）",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash" },
    { n:"DeepSeek-V4-Flash", org:"DeepSeek · 中国", kinds:["full","reason"], licText:"MIT",
      params:"284B 总参 / 激活 13B", ctx:"1,048,576", date:"2026-04 / 2026-07", tier:"t2",
      b:"284B-A13B，1M 上下文的轻量版；稀疏注意力让长文推理成本大幅下降。",
      sizes:"284b-A13b（Ollama 仅有 :cloud）", gpu:"Q4≈160GB（2×96GB 或 4×48GB）",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro" },
    { n:"DeepSeek-V3.2", org:"DeepSeek · 中国", kinds:["full","reason"], licText:"MIT",
      params:"671B 总参 / 激活 37B（256 专家 + 1 shared，取 8）", ctx:"163,840", date:"2025-09 / 2025-12", tier:"t2",
      b:"671B-A37B 的成熟版，首发 DSA 稀疏注意力 + thinking-with-tools。",
      sizes:"671b-A37b（Ollama 无官方标签）", gpu:"Q4≈375GB（8×48GB 或 4×96GB）",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-V3.2" },
    { n:"Qwen3.8-Flash-Next（125B-A6B）", org:"阿里 · 通义", kinds:["full","reason"], licText:"Qwen Community License 1.0",
      params:"125B 总参 / 激活 6B（另含 51B n-gram embedding 与 4B MTP）", ctx:"262,144（可扩到 1,000,000）", date:"2026-08", tier:"t2",
      b:"Qwen4 架构预览：125B 总参激活 6B，262K 原生上下文可扩到 1M。",
      sizes:"125b-A6b", gpu:"Q4≈120GB（2×80GB 或 3×48GB）；许可非 Apache，商用前逐条核对",
      source:"https://huggingface.co/Qwen/Qwen3.8-Flash-Next" },
    { n:"Step 3.5 Flash / 3.7 Flash", org:"阶跃星辰", kinds:["full","reason","vision"], licText:"Apache-2.0",
      params:"3.5：196B / 激活 11B ｜ 3.7：198B（196B 语言 + 1.8B 视觉塔）", ctx:"256,000", date:"2026-02 / 2026-05", tier:"t2",
      b:"阶跃主线收敛到 Flash 系列，是这一窗口开源程度最高的动作之一；3.7 起加入原生图像与视频理解。",
      sizes:"Step-3.5-Flash · Step-3.7-Flash（Base 与 Midtrain 权重一并开放）", gpu:"3.5 Q4≈110GB（2×80GB 级）；3.7 同量级",
      source:"https://huggingface.co/stepfun-ai/Step-3.5-Flash" },
    { n:"Ling 3.0-flash / 3.1-flash", org:"蚂蚁 · 百灵", kinds:["full","reason"], licText:"MIT",
      params:"约 560B 总参 / 每步约 25B 激活", ctx:"厂商未公开", date:"2026-07 / 2026-10", tier:"t2",
      b:"蚂蚁通用线的 Flash 档，主打数小时级长程任务的状态维持与自我纠错；MIT 许可。",
      sizes:"Ling-3.0-flash · Ling-3.1-flash（含 tiny 与 GGUF 变体）", gpu:"3.0-flash Q4≈310GB；另有 tiny 小档可单卡",
      source:"https://huggingface.co/inclusionAI/Ling-3.1-flash" },
    { n:"Hy-SimulMT-30B-A3B（同声传译）", org:"腾讯 · 混元", kinds:["full","vision"], licText:"Apache-2.0",
      params:"30B 总参 / 激活 3B", ctx:"262,144", date:"2026-10", tier:"t1",
      b:"实时中英同声传译，支持实时声音克隆；腾讯在语言模型上基本走开放权重路线。",
      sizes:"30B-A3B（官方 FP8 与 GGUF 齐备）", gpu:"Q4≈18GB，单张 24GB 可跑",
      source:"https://huggingface.co/tencent/Hy-SimulMT-30B-A3B" },
    { n:"ERNIE 4.5 / 4.5-VL", org:"百度", kinds:["full","chat","vision"], licText:"Apache-2.0",
      params:"窗口内新发：21B-A3B-Thinking ｜ VL-28B-A3B-Thinking；300B-A47B 为 2025-06 首发", ctx:"厂商未公开", date:"2025-09 / 2025-11", tier:"t2",
      b:"百度的开放权重线，覆盖 300B 稠密与 28B-A3B 视觉两档；另有 ERNIE-Image 与 Unlimited-OCR。",
      sizes:"ERNIE-4.5-21B-A3B-Thinking · ERNIE-4.5-VL-28B-A3B-Thinking（社区 GGUF）", gpu:"21B-A3B Q4≈13GB 单卡可跑；VL-28B-A3B Q4≈17GB 也可单卡",
      source:"https://huggingface.co/baidu/ERNIE-4.5-300B-A47B-PT" },
    { n:"gpt-oss-20b / 120b / safeguard", org:"OpenAI", kinds:["reason","code"], licText:"Apache-2.0",
      params:"20B（激活 3.6B）｜ 120B（激活 5.1B）", ctx:"131,072", date:"2025-08 / 2025-09", tier:"t1",
      b:"OpenAI 至今唯一的开放权重系列（没有 gpt-oss-2）；MoE + MXFP4 量化。",
      sizes:"gpt-oss:20b / 120b；safeguard 20b/120b 可做本地安全分类", gpu:"20B Q4≈14GB；120B Q4≈65GB（64–96GB 卡）",
      source:"https://huggingface.co/openai/gpt-oss-20b" },
    { n:"Mistral Large 4 / Medium 3.5", org:"Mistral AI", kinds:["full","code"], licText:"Mistral 生态开放许可(Large4) · Modified MIT(Medium3.5)",
      params:"Large 4：1T-A52B ｜ Medium 3.5：128B 稠密", ctx:"Medium 3.5：262,144", date:"2026-03 / 2026-09", tier:"t2",
      b:"Mistral 主线：Large 4 是 1T 级的 MoE 开放权重（用自有许可），Medium 3.5 是罕见的 128B 稠密旗舰。",
      sizes:"mistral-medium-3.5:128b（Ollama）｜ Large 4 权重已开放", gpu:"Medium 3.5 Q4≈80GB；Large 4 Q4≈580GB",
      source:"https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B" },
    { n:"Ministral 3（14B / 8B / 3B）", org:"Mistral AI", kinds:["full","edge"], licText:"Apache-2.0",
      params:"14B / 8B / 3B", ctx:"厂商未公开", date:"2025-10", tier:"t1",
      b:"Mistral 的 Apache-2.0 小模型线，工具调用与结构化输出稳定，适合做内部服务底座。",
      sizes:"Ministral-3-14B / 8B / 3B-Instruct", gpu:"3B≈2GB、8B≈5GB、14B≈9GB",
      source:"https://huggingface.co/mistralai/Ministral-3-8B-Instruct-2512" },
    { n:"Nemotron 3.5 Super / Lightning / Bolt", org:"NVIDIA", kinds:["full","code"], licText:"需核验（NVIDIA 开放模型许可）",
      params:"Super 120B-A12B ｜ Lightning 30B-A3B ｜ Bolt 74B-A9B ｜ Bolt-E4B-4GB", ctx:"训练至 1M", date:"2026-08 / 2026-10", tier:"t2",
      b:"Bolt 74B-A9B-24GB 是官方专门为「单张 24GB 显卡」设计的权重；Super 与 Lightning 是 120B/30B 的低激活主力。",
      sizes:"官方 BF16 / NVFP4 checkpoint；Bolt 有官方 GGUF", gpu:"Bolt 24GB 档按 24GB 显存设计（注意 Ollama 只有 :e4b 档）；Super Q4≈66GB；Lightning Q4≈18GB",
      source:"https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-74B-A9B-24GB-GGUF" },
    { n:"Command A+", org:"Cohere", kinds:["full","reason","code"], licText:"Apache-2.0",
      params:"218B 总参 / 激活 25B", ctx:"厂商未公开", date:"2026-05", tier:"t2",
      b:"Cohere 旗舰 agentic 模型，Apache-2.0；企业客户可私有部署。",
      sizes:"command-a-plus-05-2026（bf16 / w4a4）", gpu:"Q4 估算≈120GB；官方称 1×B200 或 2×H100 即可部署",
      source:"https://huggingface.co/CohereLabs/command-a-plus-05-2026-bf16" },
    { n:"Devstral Small 2 / Devstral 2", org:"Mistral AI", kinds:["code"], licText:"Apache-2.0(Small) · Modified MIT+营收条款(2)",
      params:"Small 2：24B ｜ 2：123B", ctx:"262,144", date:"2025-11", tier:"t1",
      b:"面向 SWE agent 的编码模型；注意 123B 版带营收条款，全球月营收超 2000 万美元需另行授权。",
      sizes:"devstral-small-2:24b · devstral-2:123b", gpu:"24B Q4≈13GB（官方称单张 4090 或 32GB 内存的 Mac 可跑）；123B Q4≈68GB",
      source:"https://huggingface.co/mistralai/Devstral-Small-2-24B-Instruct-2512" },
    { n:"MiniCPM-V 4.7（35B-A3B / 1B）", org:"OpenBMB", kinds:["vision","edge"], licText:"Apache-2.0",
      params:"35.2B / 激活 3B ｜ 1.55B", ctx:"262,144", date:"2026-10", tier:"t1",
      b:"首个端侧平滑 MoE 的 VLM；1B 版官方称在效率与得分上都超过 Qwen3.5-0.8B。",
      sizes:"MiniCPM-V-4.7-35B-A3B · -1B（官方 GGUF + Ollama）", gpu:"1B≈1.0GB；35B-A3B≈20GB（官方称 iPhone 上 3GB 内存可达 13+ tok/s）",
      source:"https://huggingface.co/openbmb/MiniCPM-V-4.7-35B-A3B" },
    { n:"Step3-VL-10B", org:"阶跃星辰", kinds:["vision"], licText:"Apache-2.0",
      params:"10.17B", ctx:"64K（顺序推理）/ 128K（并行协同推理）", date:"2026-01", tier:"t1",
      b:"官方称「10B 级最强开源多模态模型」，主打视觉感知与复杂推理。",
      sizes:"Step3-VL-10B（官方 FP8；无 Ollama 标签）", gpu:"Q4≈6GB，单张 24GB 轻松",
      source:"https://huggingface.co/stepfun-ai/Step3-VL-10B" },
    { n:"DeepSeek-OCR-2", org:"DeepSeek · 中国", kinds:["vision","edge"], licText:"Apache-2.0",
      params:"3.39B", ctx:"厂商未公开", date:"2026-01", tier:"t1",
      b:"深度 OCR 专精，3.4B 就能做文档结构化识别。",
      sizes:"DeepSeek-OCR-2（Ollama 有 deepseek-ocr:3b）", gpu:"Q4≈2GB",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-OCR-2" },
    { n:"EXAONE 4.5-33B", org:"LG AI Research", kinds:["full","vision"], licText:"EXAONE 许可 1.2（禁商用）",
      params:"33B（语言 31.7B + 视觉 1.29B）", ctx:"262,144", date:"2026-04", tier:"t2",
      b:"LG 首个开放权重视觉语言模型，官方称文档理解与韩语上下文推理超越同尺寸 SOTA；注意禁商用。",
      sizes:"EXAONE-4.5-33B（官方 GGUF；无 Ollama 标签）", gpu:"Q4≈19GB",
      source:"https://huggingface.co/LGAI-EXAONE/EXAONE-4.5-33B" },
    { n:"Intern-S1 / Intern-S1-Pro", org:"上海AI Lab", kinds:["reason","vision"], licText:"Apache-2.0",
      params:"S1：240.7B（Qwen3-235B MoE + 6B 视觉塔）｜ Pro：1T / 激活 22B", ctx:"厂商未公开", date:"2025-07 / 2026-02", tier:"t2",
      b:"面向科学推理（化学、材料、生命科学）的开放权重线；官方建议用 LMDeploy/vLLM 服务化跑。",
      sizes:"internlm/Intern-S1（官方有 GGUF；无 Ollama 标签）", gpu:"S1 Q4≈135GB；Pro 是万亿级，只能服务端",
      source:"https://huggingface.co/internlm/Intern-S1" },
    { n:"SmolLM3-3B", org:"Hugging Face", kinds:["full","chat","edge"], licText:"Apache-2.0",
      params:"3.08B", ctx:"65,536（YaRN 可到 128K/256K）", date:"2025-07", tier:"t1",
      b:"数据、代码、权重全公开的 3B 模型，6 种语言，带双模态推理开关。",
      sizes:"SmolLM3-3B（官方 ggml-org GGUF；无 Ollama 标签）", gpu:"Q4≈1.8GB",
      source:"https://huggingface.co/HuggingFaceTB/SmolLM3-3B" },
    { n:"granite4.2 / Nemotron Nano", org:"IBM · NVIDIA", kinds:["full","chat","edge"], licText:"Apache-2.0 · 需核验（NVIDIA）",
      params:"granite4.2：3B / 8B / 30B ｜ Nano：4B / 30B-A3B", ctx:"", date:"2026-08", tier:"t1",
      b:"企业向小模型两件套：granite4.2 三档全 Apache-2.0；Nemotron Nano 4B/30B-A3B 是同系列轻量档。",
      sizes:"granite4.2:3b / 8b / 30b ｜ nemotron-3-nano:4b / 30b-a3b", gpu:"3B≈2.2GB；8B≈5.3GB；30B≈18GB",
      source:"https://huggingface.co/ibm-granite/granite-4.2-3b" },
    { n:"LFM3-1.7B", org:"Liquid AI", kinds:["edge","chat"], licText:"LFM Open License v1.0",
      params:"1.7B", ctx:"262,144", date:"2026-10", tier:"t1",
      b:"1.7B 就给 256K 上下文 + agentic 训练，端侧长文本的极端例子。",
      sizes:"lfm3:1.7b（官方 GGUF / MLX / ONNX 齐备）", gpu:"Q4≈1.1GB，6GB 卡甚至纯 CPU 都能跑",
      source:"https://huggingface.co/LiquidAI/LFM3-1.7B" },
    { n:"MedGemma 1.5 / MiniCPM-V 4.6", org:"Google Health · OpenBMB", kinds:["vision","edge"], licText:"需核验（Gemma 系）· Apache-2.0",
      params:"MedGemma 1.5：4.3B ｜ MiniCPM-V 4.6：1.3B", ctx:"", date:"2026-01 / 2026-04", tier:"t1",
      b:"垂直与端侧多模态：MedGemma 1.5 是医疗领域 4B 专用权重；MiniCPM-V 4.6 只有 1.3B 却能做图文问答。",
      sizes:"medgemma1.5:4b（3.3GB）· minicpm-v4.6（1.6GB）", gpu:"3.3GB / 1.6GB，纯端侧可跑",
      source:"https://huggingface.co/openbmb/MiniCPM-V-4.6" },
    { n:"DeepSeek-R1（蒸馏系，仍在服役）", org:"DeepSeek · 中国", kinds:["reason"], licText:"MIT",
      params:"1.5B – 70B 稠密蒸馏", ctx:"32,768 – 131,072（按档位）", date:"2025-01", tier:"t1",
      b:"首个把长链推理内化进开源模型的作品；近一年没有新的 R1 权重，但蒸馏档仍是社区最省显存的推理选择。",
      sizes:"1.5b · 7b · 8b · 14b · 32b · 70b", gpu:"7B 量化≈6–9GB；32B≈20GB+",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-R1" },
    { n:"Ling 3.0-flash / 3.0-tiny", org:"蚂蚁 · 百灵", kinds:["full","reason"], licText:"MIT",
      params:"flash：124B / 激活 5.1B（混合线性注意力 MoE）｜ tiny：7.9B / 激活 1.3B", ctx:"256K（flash）｜ 131,072（tiny）", date:"2026-08 / 2026-09", tier:"t2",
      b:"蚂蚁通用线的两个档：tiny 是 7.9B 的高吞吐小模型，flash 是 124B 混合线性注意力 MoE —— 官方 GGUF 齐备。",
      sizes:"官方 GGUF：flash Q4_K_M≈77GB、tiny Q4_K_M≈4.8GB", gpu:"tiny Q4≈4.8GB 单卡可跑（官方称 M4 Pro 上 86–90 tok/s）；flash Q4≈77GB 需 80GB 卡",
      source:"https://huggingface.co/inclusionAI/Ling-3.0-flash" },
    { n:"Ling 3.1-flash", org:"蚂蚁 · 百灵", kinds:["full","reason"], licText:"MIT",
      params:"560B 总参 / 激活 25B", ctx:"1,048,576", date:"2026-10", tier:"t2",
      b:"主打数小时级长程任务的状态维持与自我纠错；1M 上下文，MIT 许可。",
      sizes:"Ling-3.1-flash（含 1019 刷新版；官方暂无 GGUF）", gpu:"Q4 估算≈310GB，需 4×80GB 级；官方建议 SGLang TP8+EP8",
      source:"https://huggingface.co/inclusionAI/Ling-3.1-flash" },
    { n:"MiMo-V2.6-Distill-Qwen-9B / Flash / Pro", org:"小米 · MiMo", kinds:["full","chat","code"], licText:"MIT",
      params:"Distill-9B：9.41B ｜ Flash：309B / 激活 15B ｜ Pro：1.02T / 激活 42B", ctx:"262,144（9B）｜ 1,048,576（Flash / Pro）", date:"2026-09", tier:"t1",
      b:"小米的开放权重线，全系 MIT；9B 蒸馏版官方称在智能体与代码基准上超过同尺寸的 Qwen3.5-9B。",
      sizes:"bartowski 的 MiMo-V2.6-Distill-Qwen-9B-GGUF 已被下载近百万次", gpu:"9B Q4≈5.7GB 单卡轻松；Flash Q4≈170GB 需多卡",
      source:"https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B" },
    { n:"Spark X2.6（讯飞星火）", org:"科大讯飞 · 星火", kinds:["full","chat","code"], licText:"Apache-2.0",
      params:"4.11B / 1.71B", ctx:"1,048,576", date:"2026-08 / 2026-10", tier:"t1",
      b:"讯飞的端侧智能体家族，Apache-2.0；官方称同尺寸里表现最好，支持三档思考强度。",
      sizes:"官方 GGUF：X2.6-4B Q4_K_M≈3.5GB、X2.6-1.7B≈1GB", gpu:"4B Q4≈3.5GB 单卡可跑 —— 4B 档就有 1M 上下文",
      source:"https://huggingface.co/XHToken/Spark-X2.6-4B" },
    { n:"Kimi-Linear-48B-A3B", org:"月之暗面", kinds:["full","reason"], licText:"MIT",
      params:"48B 总参 / 激活 3B", ctx:"1,048,576", date:"2025-10", tier:"t1",
      b:"混合线性注意力：官方称 1M 上下文下 KV-Cache 需求最多降 75%、解码吞吐最高 6 倍；MIT 许可。",
      sizes:"Kimi-Linear-48B-A3B-Instruct / -Base（社区 GGUF）", gpu:"Q4≈27GB，接近单张 32GB 卡",
      source:"https://huggingface.co/moonshotai/Kimi-Linear-48B-A3B-Instruct" },
    { n:"LLaDA2.2-mini / flash（扩散语言模型）", org:"蚂蚁", kinds:["reason","full"], licText:"Apache-2.0",
      params:"mini：16B / 激活 1.4B ｜ flash：102.9B", ctx:"131,072", date:"2026-07 / 2026-09", tier:"t1",
      b:"扩散式（非自回归）语言模型，支持 Levenshtein 式局部改写；架构上是一条新路线。",
      sizes:"LLaDA2.2-mini · LLaDA2.2-flash", gpu:"mini Q4≈9GB 单卡可跑；flash Q4≈57GB",
      source:"https://huggingface.co/inclusionAI/LLaDA2.2-mini" },
    { n:"MiniCPM5-2B / 1B", org:"OpenBMB", kinds:["full","chat","edge"], licText:"Apache-2.0",
      params:"2.52B ｜ 1.08B", ctx:"131,072", date:"2026-05 / 2026-09", tier:"t1",
      b:"OpenBMB 的纯文本新旗舰，官方称 2B 档的端侧水平已到 SOTA 区间。",
      sizes:"官方 GGUF：2B Q4_K_M≈1.6GB、1B≈0.7GB（另出 MLX / GPTQ / DSpark 草稿头）", gpu:"1B Q4≈0.7GB；2B Q4≈1.6GB —— 端侧长上下文",
      source:"https://huggingface.co/openbmb/MiniCPM5-2B" },
    { n:"JanusCoder-8B / 14B", org:"上海AI Lab", kinds:["code"], licText:"Apache-2.0",
      params:"8.25B ｜ 14.77B", ctx:"32,768", date:"2025-10", tier:"t1",
      b:"解耦前瞻（decoupled-lookback）代码模型：一次前向同时产出多个候选 token 再挑优。",
      sizes:"JanusCoder-8B / -14B（社区 GGUF）", gpu:"8B Q4≈5GB；14B Q4≈8.5GB",
      source:"https://huggingface.co/internlm/JanusCoder-14B" },
    { n:"InternVL3.5 Flash 家族", org:"上海AI Lab", kinds:["vision"], licText:"Apache-2.0",
      params:"1.15B · 2.49B · 4.91B · 8.81B · 15.5B · 30.99B · 39.56B · 241.71B-A28B", ctx:"40,960（语言骨干）", date:"2025-09", tier:"t1",
      b:"视觉 agent 与 GUI 操作见长的家族，一次覆盖八个尺寸；官方在 2025-09 补齐 Flash 变体。",
      sizes:"官方 GGUF（2B / 8B / 14B）；1B–8B 单卡可跑", gpu:"8B Q4≈5GB；14B Q4≈9GB；241B 需集群",
      source:"https://huggingface.co/OpenGVLab/InternVL3_5-8B" },
    { n:"Hy3（腾讯混元）", org:"腾讯 · 混元", kinds:["full","reason"], licText:"Apache-2.0",
      params:"295B 总参 / 激活 21B（另有 +3.8B MTP）", ctx:"262,144", date:"2026-07", tier:"t2",
      b:"腾讯的语言模型主线走开放权重：Hy3 是推理与智能体 MoE，官方称在同等规模下成本效率领先。",
      sizes:"Hy3 与 Hy3-FP8（社区 GGUF）", gpu:"Q4≈182GB，2×80GB 级可跑",
      source:"https://huggingface.co/tencent/Hy3" },
    { n:"Hy-Memory-30B-A3B / Hy-MT2-7B", org:"腾讯 · 混元", kinds:["full","chat"], licText:"Apache-2.0",
      params:"30.06B / 激活 3B ｜ 8.03B 稠密", ctx:"262,144", date:"2026-05 / 2026-10", tier:"t1",
      b:"两个小而专的模型：记忆写入智能体，与 22 语种机器翻译；都是 Apache-2.0 且有官方 GGUF。",
      sizes:"官方 GGUF：Hy-Memory Q4_K_M≈18.2GB、Hy-MT2-7B≈4.6GB", gpu:"Hy-Memory Q4≈18GB；Hy-MT2-7B Q4≈4.6GB —— 22 语种翻译",
      source:"https://huggingface.co/tencent/Hy-Memory-30B-A3B" },
    { n:"Nanbeige4.3-33B", org:"Nanbeige · 纳米贝格", kinds:["full","chat","code"], licText:"Apache-2.0",
      params:"33.12B（稠密，Llama 架构）", ctx:"524,288", date:"2026-10", tier:"t1",
      b:"官方称在多数智能体与协作基准上领先 Qwen3.8-27B；524K 上下文在 33B 档不常见。",
      sizes:"官方 INT4/INT8/FP8；社区 GGUF Q4_K_M≈20.8GB", gpu:"Q4≈20.8GB，单张 24GB 可跑（长上下文需压到 16K 左右）",
      source:"https://huggingface.co/Nanbeige/Nanbeige4.3-33B" },
    { n:"dots.llm1（小红书）", org:"小红书 · RedNote", kinds:["full","chat"], licText:"MIT",
      params:"142B 总参 / 激活 14B（128 专家取 6）", ctx:"32,768", date:"2025-06", tier:"t2",
      b:"小红书的 MIT MoE 开放模型；官方卡片口径 142B，权重索引约 285GB。",
      sizes:"dots.llm1.base / .inst（社区 GGUF）", gpu:"Q4≈80GB，需 80GB 卡或多卡",
      source:"https://huggingface.co/rednote-hilab/dots.llm1.inst" },
    { n:"SenseNova-Loop-9B / AREX-2", org:"商汤 · 智源", kinds:["full","vision","reason"], licText:"Apache-2.0",
      params:"Loop-9B：9.66B 骨干（循环权重）｜ AREX-2：27B（Qwen3.5 架构）", ctx:"262,144", date:"2026-07 / 2026-09", tier:"t1",
      b:"两个有意思的架构尝试：商汤的循环式多模态模型，与智源的长程 agent 模型 AREX-2。",
      sizes:"SenseNova-Loop-9B-Preview · AREX-2（社区 GGUF）", gpu:"Loop-9B Q4≈5.5GB；AREX-2 Q4≈15GB",
      source:"https://huggingface.co/sensenova/SenseNova-Loop-9B-Preview" },
    { n:"Seed-OSS-36B", org:"字节跳动 · Seed", kinds:["full","chat"], licText:"Apache-2.0",
      params:"36.15B 稠密", ctx:"524,288", date:"2025-08", tier:"t1",
      b:"字节最后一个真正的开放权重 LLM：36B 稠密 + 512K 上下文；此后的 Seed 主线全部闭源。",
      sizes:"Seed-OSS-36B-Base / -Instruct", gpu:"Q4≈21GB，单张 24GB 可跑",
      source:"https://huggingface.co/ByteDance-Seed/Seed-OSS-36B" },
    { n:"Stable-DiffCoder-8B（扩散式代码模型）", org:"字节跳动 · Seed", kinds:["code"], licText:"MIT",
      params:"8.25B", ctx:"8,192", date:"2026-01", tier:"t1",
      b:"用掩码扩散做代码生成、推理与局部编辑 —— 不同于自回归的另一种写法。",
      sizes:"Stable-DiffCoder-8B-Base / -Instruct", gpu:"Q4≈5GB",
      source:"https://huggingface.co/ByteDance-Seed/Stable-DiffCoder-8B-Instruct" },
    { n:"Qianfan-VL-70B / 8B / 3B", org:"百度", kinds:["vision"], licText:"MIT（70B）· 其他（3B/8B）",
      params:"71.8B ｜ 8.8B ｜ 2.44B", ctx:"厂商未公开", date:"2025-09", tier:"t2",
      b:"百度的视觉语言线；70B 档用的是 MIT，3B/8B 档不是。",
      sizes:"Qianfan-VL-70B / -8B / -3B", gpu:"3B Q4≈1.5GB、8B Q4≈5GB、70B Q4≈40GB 需多卡",
      source:"https://huggingface.co/baidu/Qianfan-VL-70B" },
    { n:"WeVisOne-VL-4B / 2B", org:"腾讯", kinds:["vision","edge"], licText:"Apache-2.0",
      params:"4.83B ｜ 2.44B", ctx:"262,144", date:"2026-10", tier:"t1",
      b:"统一视觉感知：检测、指代、计数、指点、OCR、抠图一个模型全包。",
      sizes:"WeVisOne-VL-4B / -2B", gpu:"2B Q4≈1.5GB、4B Q4≈3GB",
      source:"https://huggingface.co/tencent/WeVisOne-VL-4B" },
    { n:"Youtu-LLM-2B", org:"腾讯 · 优图", kinds:["full","edge","chat"], licText:"youtu-llm（专有）",
      params:"1.96B", ctx:"131,072", date:"2025-12", tier:"t1",
      b:"2B 的通用智能体小模型，权重很小；许可为腾讯自有协议，商用需另看条款。",
      sizes:"Youtu-LLM-2B（GGUF 在仓库分支上）", gpu:"Q4≈1.2GB",
      source:"https://huggingface.co/tencent/Youtu-LLM-2B" },
    { n:"Ming-3.0 音频系列（flash / asr-tiny / tts）", org:"蚂蚁 · 明", kinds:["full","edge"], licText:"MIT",
      params:"flash：126B / 激活 6.5B ｜ asr-tiny：8.87B ｜ tts：1.48B", ctx:"131,072（flash）｜ 8,192（asr-tiny）", date:"2026-09 / 2026-10", tier:"t2",
      b:"蚂蚁的全模态音频线：识别、音频理解与语音合成一体，全部 MIT。",
      sizes:"Ming-3.0-audio-flash · -audio-tiny · -asr-tiny · -tts-0.5B", gpu:"asr-tiny Q4≈5GB 单卡可跑；tts Q4≈1GB；flash Q4≈70GB",
      source:"https://huggingface.co/inclusionAI/Ming-3.0-asr-tiny" },
    { n:"Ring 2.6-1T / 2.5-1T（蚂蚁环）", org:"蚂蚁 · 环", kinds:["reason"], licText:"MIT",
      params:"1,025B（2.6）｜ 1,012B（2.5）", ctx:"128K → 256K（YaRN）", date:"2026-02 / 2026-05", tier:"t3",
      b:"首个万亿级混合线性注意力开源思考模型，推理强度可调（high/xhigh）。",
      sizes:"Ring-2.6-1T · Ring-2.5-1T（无 GGUF，需 BF16/FP8 多卡）", gpu:"Q4 估算≈560GB 以上，且无 GGUF —— 基本是服务端量级",
      source:"https://huggingface.co/inclusionAI/Ring-2.6-1T" },
    { n:"Intern-S2-397B / -Mobius", org:"上海AI Lab", kinds:["full","vision","reason"], licText:"Apache-2.0",
      params:"397B 档：403.42B（Qwen3.5-397B-A17B 架构）｜ Mobius：35.96B（2560 专家取 8）", ctx:"262,144", date:"2026-05 / 2026-07", tier:"t2",
      b:"面向科学智能与长程智能体的多模态基座；Mobius 用「超多专家」路线压低激活成本。",
      sizes:"Intern-S2-397B · -Mobius · -Preview（社区 GGUF）", gpu:"Mobius Q4≈21GB；397B 档 Q4 约 230GB 需多卡",
      source:"https://huggingface.co/internlm/Intern-S2-397B" },
    { n:"Intern-Decision-4B / 2B / 0.8B", org:"上海AI Lab", kinds:["reason","vision","edge"], licText:"Apache-2.0",
      params:"4.54B ｜ 2.44B ｜ 0.87B", ctx:"262,144", date:"2026-09", tier:"t1",
      b:"多模态结构化决策模型，小到能在手机上跑完整推理链。",
      sizes:"Intern-Decision-4B / -2B / -0.8B（有 GGUF）", gpu:"0.8B Q4≈0.5GB、4B Q4≈2.5GB",
      source:"https://huggingface.co/internlm/Intern-Decision-4B" },
    { n:"Step-5-Preview", org:"阶跃星辰", kinds:["full","reason","vision"], licText:"StepFun Model License 1.0",
      params:"600B 总参 / 激活 27B（FP8 权重 604.3B）", ctx:"1,048,576", date:"2026-09", tier:"t3",
      b:"阶跃的 agentic 旗舰：文本+图像+视频输入、1M 上下文；许可对营收与硬件内置有额外条款。",
      sizes:"Step-5-Preview（BF16 / NVFP4）", gpu:"Q4 估算≈330GB，需多卡集群",
      source:"https://huggingface.co/stepfun-ai/Step-5-Preview" },
    { n:"MiMo-V2.6-Pro（小米）", org:"小米 · MiMo", kinds:["full","reason","vision"], licText:"MIT",
      params:"1.02T 总参 / 激活 42B（384 专家取 8）", ctx:"1,048,576", date:"2026-09", tier:"t3",
      b:"小米的万亿级 MoE，混合 SWA/全局注意力 6:1；MIT 许可，服务端使用。",
      sizes:"MiMo-V2.6-Pro-RL / -Pro-MOPD", gpu:"Q4 估算≈560GB，服务端量级",
      source:"https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL" },
    { n:"MiMo-Audio-7B / MiMo-Embodied-7B", org:"小米 · MiMo", kinds:["edge","full"], licText:"MIT",
      params:"8.0B（音频）｜ 8.0B（具身）", ctx:"厂商未公开", date:"2025-09 / 2025-11", tier:"t1",
      b:"小米的音频与具身两个垂直方向，都是 MIT、都是 8B 以内。",
      sizes:"MiMo-Audio-7B-Base / -Instruct · MiMo-Embodied-7B", gpu:"Q4≈4.5GB",
      source:"https://huggingface.co/XiaomiMiMo/MiMo-Audio-7B-Instruct" },
    { n:"Baichuan-M3-235B（百川）", org:"百川智能", kinds:["full","chat"], licText:"Apache-2.0",
      params:"235.09B（Qwen3-MoE 架构，128 专家取 8）", ctx:"40,960（对 235B 旗舰来说偏短）", date:"2026-01", tier:"t2",
      b:"百川的旗舰 MoE，Apache-2.0；训练分三阶段做多专家融合。上下文只有 40K，是它最明显的短板。",
      sizes:"官方 Q4_K_M GGUF（约 131GB）", gpu:"Q4≈131GB，需 2×80GB 级",
      source:"https://huggingface.co/baichuan-inc/Baichuan-M3-235B" },
    { n:"SenseNova-MARS-32B / U1.5-8B-MoT", org:"商汤", kinds:["vision","reason"], licText:"MIT（MARS）· Apache-2.0（U1.5）",
      params:"MARS：32B ｜ U1.5：17.5B", ctx:"厂商未公开", date:"2026-01 / 2026-08", tier:"t1",
      b:"商汤的多模态检索 agent 与 any-to-any 多图/视频模型。",
      sizes:"SenseNova-MARS-32B · SenseNova-U1.5-8B-MoT", gpu:"MARS Q4≈19GB；U1.5 Q4≈10GB",
      source:"https://huggingface.co/sensenova/SenseNova-MARS-32B" },
    { n:"MOSS-VL-Realtime", org:"OpenMOSS", kinds:["vision"], licText:"Apache-2.0",
      params:"11.34B", ctx:"262,144", date:"2026-07", tier:"t1",
      b:"流式视觉语言模型，会主动判断该���不说话；跨注意力设计。",
      sizes:"MOSS-VL-Realtime", gpu:"Q4≈6.5GB",
      source:"https://huggingface.co/OpenMOSS-Team/MOSS-VL-Realtime" },
    { n:"AutoGLM-Phone-9B / UI2Code_N", org:"智谱 Z.ai", kinds:["full","code"], licText:"MIT",
      params:"9.66B", ctx:"厂商未公开", date:"2025-11 / 2025-12", tier:"t1",
      b:"两个很具体的 agent：手机操作代理，以及界面截图转代码。",
      sizes:"AutoGLM-Phone-9B · UI2Code_N · WebVIA-Agent", gpu:"Q4≈5.5GB",
      source:"https://huggingface.co/zai-org/AutoGLM-Phone-9B" },
    { n:"Confucius4（网易有道 · 实时语音翻译）", org:"网易有道", kinds:["edge","full"], licText:"Apache-2.0 · 需核验(R2T2)",
      params:"厂商未公开", ctx:"厂商未公开", date:"2026-05", tier:"t1",
      b:"实时语音翻译线：边说边译，官方有 GGUF。",
      sizes:"Confucius4 · -R2T2 · -T3PO（官方 GGUF）", gpu:"厂商未公开",
      source:"https://huggingface.co/netease-youdao/Confucius4-R2T2" },
    { n:"BFS-Prover-V2-32B / 7B（定理证明）", org:"字节跳动 · Seed", kinds:["reason"], licText:"Apache-2.0",
      params:"32.8B ｜ 7.6B", ctx:"厂商未公开", date:"2025-09 / 2025-10", tier:"t1",
      b:"Lean 4 定理证明方向的开放权重模型，属于少见的垂直能力。",
      sizes:"BFS-Prover-V2-32B · -7B", gpu:"7B Q4≈4.5GB；32B Q4≈18GB",
      source:"https://huggingface.co/ByteDance-Seed/BFS-Prover-V2-32B" },
    { n:"Qwen-AgentWorld-35B-A3B / Tongyi-DeepResearch-30B-A3B", org:"阿里 · 通义", kinds:["reason","full"], licText:"Apache-2.0",
      params:"36.0B / 激活 3B", ctx:"厂商未公开", date:"2025-09 / 2026-06", tier:"t2",
      b:"阿里的智能体训练环境与深度研究 agent，都开放了权重。",
      sizes:"Qwen-AgentWorld-35B-A3B · Tongyi-DeepResearch-30B-A3B", gpu:"Q4≈21GB",
      source:"https://huggingface.co/Qwen/Qwen-AgentWorld-35B-A3B" },
    { n:"BitCPM-CANN（比特级端侧模型）", org:"OpenBMB", kinds:["edge"], licText:"Apache-2.0",
      params:"0.5B / 1B / 3B / 8B", ctx:"厂商未公开", date:"2026-05", tier:"t1",
      b:"按比特而非按 token 压缩的端侧模型，1B 级就能在极低比特预算下跑。",
      sizes:"BitCPM-CANN-0.5B / 1B / 3B / 8B（1B 与 8B 有官方 GGUF）", gpu:"1B Q4≈0.6GB；8B Q4≈4.5GB",
      source:"https://huggingface.co/openbmb/BitCPM-CANN-1B" },
    { n:"OLMo 3 / 3.1（Ai2）", org:"Allen Institute for AI", kinds:["full","reason","chat"], licText:"Apache-2.0",
      params:"7.30B ｜ 32.23B（均稠密）", ctx:"65,536", date:"2025-11 / 2025-12", tier:"t1",
      b:"唯一把整个模型流程都公开的：权重 + 数据 + 代码 + 训练日志 + 每个中间 checkpoint。",
      sizes:"olmo-3:7b / 32b · olmo-3.1:32b（Ollama 官方标签）", gpu:"7B Q4≈7.3GB；32B Q4≈19.7GB（滑窗让 KV 很小）",
      source:"https://huggingface.co/allenai/Olmo-3.1-32B-Think" },
    { n:"Granite 4.0 / 4.1（IBM）", org:"IBM", kinds:["full","chat","reason"], licText:"Apache-2.0",
      params:"4.0：0.35B / 1B ｜ 4.1：3.40B / 8.79B / 28.87B", ctx:"131,072（4.1）", date:"2025-10 / 2026-04", tier:"t1",
      b:"企业向全 Apache-2.0：12 种语言、内置 <think> 推理与工具调用、训练来源全部公开。",
      sizes:"granite4:350m / 1b / 3b · granite4.1:3b / 8b / 30b（IBM 官方 GGUF + Ollama 标签）", gpu:"8B Q4≈6.8GB；30B Q4≈18.9GB（满 128K 上下文需 48GB+）",
      source:"https://huggingface.co/ibm-granite/granite-4.1-8b" },
    { n:"North Mini Code 1.0（Cohere）", org:"Cohere", kinds:["code","reason"], licText:"Apache-2.0",
      params:"30.48B 总参 / 激活 3B", ctx:"262,144（最大输出 64K）", date:"2026-06", tier:"t1",
      b:"面向软件工程与终端的 agentic MoE，交错思考；Cohere 家族里第一个真正 Apache-2.0 的模型。",
      sizes:"north-mini-code-1.0（Ollama 官方标签，含 MLX 与 NVFP4 变体）", gpu:"Q4≈17.9GB，单张 24GB 可跑",
      source:"https://huggingface.co/CohereLabs/North-Mini-Code-1.0" },
    { n:"K-EXAONE 2.0（LG）", org:"LG AI Research", kinds:["full","chat"], licText:"Apache-2.0",
      params:"749.4B 总参 / 激活 37B（256 专家取 8）", ctx:"262,144", date:"2026-07", tier:"t3",
      b:"LG 的十语种主权模型；许可从 EXAONE 的禁商用条款直接升到 Apache-2.0。",
      sizes:"K-EXAONE-2.0-750B-A37B（FP8 / NVFP4 / DSpark）", gpu:"Q4 估算≈412GB，服务端量级",
      source:"https://huggingface.co/LGAI-EXAONE/K-EXAONE-2.0-750B-A37B" },
    { n:"Apertus v1.5（Swiss AI）", org:"Swiss AI · ETH/EPFL", kinds:["full","chat","vision"], licText:"Apache-2.0",
      params:"8.90B ｜ 72.01B", ctx:"262,144", date:"2026-02 / 2026-07", tier:"t1",
      b:"全开放程度最高的发布：权重 + 数据 + 价值观章程 + 训练配方 + 中间 checkpoint；v1.5 起支持图像与音频输入。",
      sizes:"Apertus-v1.5-8B / -70B（社区 GGUF）", gpu:"8B Q4≈5GB 起；70B 需多卡",
      source:"https://huggingface.co/swiss-ai/Apertus-v1.5-8B" },
    { n:"Fara1.5（微软 GUI 代理）", org:"微软", kinds:["full","vision"], licText:"MIT",
      params:"4.54B ｜ 9.41B ｜ 27.36B", ctx:"262,144", date:"2026-05 / 2026-07", tier:"t1",
      b:"多截图 GUI grounding 的电脑操作代理；MIT 许可，比同尺寸模型更省。",
      sizes:"Fara1.5-4B / -9B / -27B", gpu:"4B Q4≈4GB；9B Q4≈7GB；27B Q4≈18GB 单卡可跑",
      source:"https://huggingface.co/microsoft/Fara1.5-27B" },
    { n:"Mage-VL / FrogNano-4B（微软）", org:"微软", kinds:["vision","code"], licText:"Apache-2.0 · MIT",
      params:"Mage-VL：4.74B ｜ FrogNano：4.66B", ctx:"Mage-VL 未公开 ｜ FrogNano 约 131,072", date:"2026-07 / 2026-09", tier:"t1",
      b:"Mage-VL 用 codec 原生流式处理视频，视觉 token 少 75%；FrogNano 是 4B 的代码代理。",
      sizes:"Mage-VL · FrogNano-4B-2609", gpu:"均 Q4≈2.6GB",
      source:"https://huggingface.co/microsoft/Mage-VL" },
    { n:"Trinity Mini / Nano（Arcee）", org:"Arcee AI", kinds:["full","chat"], licText:"Arcee Trinity Licence（专有）",
      params:"Mini：26.12B / 激活 3B ｜ Nano：6.12B / 激活 1B", ctx:"131,072", date:"2025-12", tier:"t1",
      b:"以「一家给企业做微调的平台」出发的模型家族，Mini 档主打可定制性。",
      sizes:"Trinity-Mini · Trinity-Nano-Preview（官方 GGUF）", gpu:"Nano Q4≈3.4GB；Mini Q4≈15.2GB 单卡可跑",
      source:"https://huggingface.co/arcee-ai/Trinity-Mini" },
    { n:"flint（Recursive）", org:"Recursive", kinds:["code","reason"], licText:"Apache-2.0",
      params:"39.79B 总参 / 激活约 2.5B（256 专家取 6 + 1 shared）", ctx:"262,144", date:"2026-10", tier:"t1",
      b:"专为编码代理做的 MoE：激活只有 2.5B，却能在消费级显卡上跑。",
      sizes:"flint:40b（Ollama 官方标签）", gpu:"Q4≈22GB，单张 24GB 刚好装下",
      source:"https://huggingface.co/RecursiveSI/flint" },
    { n:"Laguna-S-2.1（Poolside）", org:"Poolside", kinds:["code","reason"], licText:"OpenMDW-1.1（宽松）",
      params:"117.6B 总参 / 激活 8B", ctx:"1,048,576", date:"2026-07", tier:"t2",
      b:"1M 上下文的 agentic 编码模型，许可明说「随便用、改了也能商用」。",
      sizes:"laguna-s-2.1（Ollama 官方标签，含 NVFP4 与 MLX 变体）", gpu:"Q4≈65GB，需 80GB 卡或 2×48GB",
      source:"https://huggingface.co/poolside/Laguna-S-2.1" },
    { n:"Kolibri-1（Aleph Alpha）", org:"Aleph Alpha", kinds:["full","chat","reason"], licText:"Apache-2.0",
      params:"78.10B 总参 / 激活 3.46B", ctx:"1,048,576", date:"2026-10", tier:"t2",
      b:"德英双语 MoE + 1M 上下文，许可 unusually 宽松（Apache-2.0）。",
      sizes:"Kolibri-1-78B-A3.46B", gpu:"Q4≈43GB，1M 上下文需 80–120GB",
      source:"https://huggingface.co/Aleph-Alpha/Kolibri-1" },
    { n:"Nemotron 3 Nano 30B-A3B / 4B", org:"NVIDIA", kinds:["full","chat","code"], licText:"NVIDIA Nemotron Open Model License",
      params:"30B / 激活 3.5B ｜ 4B", ctx:"1,048,576（30B）｜ 262,144（4B）", date:"2025-12 / 2026-03", tier:"t1",
      b:"混合 Mamba-2 + MoE 的高吞吐 agentic 模型；30B 档还带 1M 上下文与开放数据集与配方。",
      sizes:"nemotron-3-nano:30b / :4b（Ollama 官方标签）", gpu:"4B Q4≈3.5GB；30B-A3B Q4≈18.7GB 单卡可跑",
      source:"https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16" },
    { n:"Nemotron 3.5 Lightning 30B-A3B", org:"NVIDIA", kinds:["full","chat","code"], licText:"OpenMDW-1.1（宽松）",
      params:"30B 总参 / 激活 3B", ctx:"1,048,576", date:"2026-08", tier:"t1",
      b:"当时最快的 30B MoE，面向常驻 agent；许可 OpenMDW-1.1 实际很宽松。",
      sizes:"nemotron-3.5-lightning:30b（Ollama 官方标签）+ ggml-org GGUF", gpu:"Q4≈17.8GB，单卡可跑",
      source:"https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16" },
    { n:"Nemotron 3.5 Bolt E4B-4GB", org:"NVIDIA", kinds:["edge","full"], licText:"OpenMDW-1.1（宽松）",
      params:"8B（有效 4B，从 Gemma-4-E4B 蒸馏）", ctx:"65,536（输入 64K / 输出 64K）", date:"2026-10", tier:"t1",
      b:"4GB 的 agentic 小语言模型，做本地语音与设备助手绰绰有余。",
      sizes:"nemotron-3.5-bolt:e4b（Ollama 官方标签）", gpu:"官方 4GB 构建；Q4 估算约 5.9GB",
      source:"https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB" },
    { n:"Mistral Large 3 / Small 4", org:"Mistral AI", kinds:["full","chat"], licText:"Apache-2.0",
      params:"Large 3：675B / 激活 41B ｜ Small 4：119.4B / 激活 6.5B", ctx:"Small 4：1,048,576", date:"2025-11 / 2026-01", tier:"t2",
      b:"Mistral 的 Apache-2.0 全 Apache 线：Large 3 是 675B MoE，Small 4 是 119B-A6.5B 且 1M 上下文。",
      sizes:"Mistral-Large-3-675B · Mistral-Small-4", gpu:"Large 3 Q4≈371GB；Small 4 Q4≈71GB 需 80GB 卡",
      source:"https://huggingface.co/mistralai/Mistral-Small-4" },
    { n:"Falcon-H1R 7B / H1-Tiny", org:"TII", kinds:["full","reason","edge"], licText:"Falcon-LLM License（可商用）",
      params:"H1R：7.59B（混合 Mamba+注意力）｜ Tiny：90M / 0.6B / 100M", ctx:"262,144", date:"2025-10 / 2026-01", tier:"t1",
      b:"H1-Tiny 是最便宜的实用工具调用模型系列（90M 就能调工具）；H1R 是混合架构的推理刷新版。",
      sizes:"Falcon-H1R-7B；H1-Tiny 有 Base / Instruct / Coder / Tool-Calling / R 变体（官方 GGUF）", gpu:"90M 几乎不占显存；H1R Q4≈5.1GB",
      source:"https://huggingface.co/tiiuae/Falcon-H1-Tiny-90M-Instruct" },
    { n:"INTELLECT-3.1（Prime Intellect）", org:"Prime Intellect", kinds:["reason","full"], licText:"MIT",
      params:"106.85B 总参 / 激活 12B", ctx:"131,072", date:"2026-01", tier:"t2",
      b:"分布式训练出来的 RL 模型，许可 MIT（少见地宽松）；底座来自 GLM-4.5-Air。",
      sizes:"INTELLECT-3.1", gpu:"Q4≈59GB，需 80GB 卡",
      source:"https://huggingface.co/PrimeIntellect/INTELLECT-3.1" },
    { n:"LFM2.5 / d1（Liquid AI）", org:"Liquid AI", kinds:["edge","chat","reason"], licText:"LFM Open License v1.0（营收 1000 万美元门槛）",
      params:"LFM2.5：1.17B / 8.47B / 24.0B ｜ d1：3.12B / 2.0B", ctx:"厂商未公开", date:"2026-01 / 2026-10", tier:"t1",
      b:"混合卷积注意力的端侧家族；d1 是非自回归的决策模型。",
      sizes:"lfm2.5:1.2b / 8b / 24b ｜ d1:2b / 3b（Ollama 标签）", gpu:"1.2B Q4≈0.7GB；24B-A2B Q4≈13GB",
      source:"https://huggingface.co/LiquidAI/LFM2.5-8B" },
    { n:"Bonsai 8B（三值量化）", org:"Prism-ml", kinds:["edge","full"], licText:"Apache-2.0",
      params:"8.19B", ctx:"65,536", date:"2026-03", tier:"t1",
      b:"把 8B 模型压到 1.15GB 的三值量化版本，端侧极端例子。",
      sizes:"Bonsai-8B-gguf（Q1_0 三值量化）", gpu:"参数内存仅 1.15GB（FP16 是 16.38GB），27 倍压缩",
      source:"https://huggingface.co/prism-ml/Bonsai-8B-gguf" },
    { n:"Edge0-35B-A3B（按需专家流式）", org:"Edge0", kinds:["full","reason"], licText:"Apache-2.0",
      params:"34.66B 总参 / 激活 3B（256 专家取 4）", ctx:"厂商未公开", date:"2026-09", tier:"t1",
      b:"一种新的部署模型：不常驻全部权重，而是按需流式加载专家。",
      sizes:"Edge0-35B-A3B-preview", gpu:"官方称峰值内存约 3 GiB、4-bit 下 15 tok/s —— 只常驻激活的那几个专家",
      source:"https://huggingface.co/Edge0/Edge0-35B-A3B-preview" },
    { n:"Clover-35B-A3B（扩散式语言模型）", org:"DiffuSpace", kinds:["full","reason"], licText:"Apache-2.0",
      params:"34.66B 总参 / 激活 3B", ctx:"131,072", date:"2026-10", tier:"t1",
      b:"块扩散式语言模型，发布时是最快的开放扩散 LM。",
      sizes:"Clover-35B-A3B-Preview（官方 GGUF）", gpu:"Q4≈19GB，单张 24GB 可跑",
      source:"https://huggingface.co/Diffuspace/Clover-35B-A3B-Preview" },
    { n:"Arctic-AWM（Snowflake）", org:"Snowflake", kinds:["full","reason"], licText:"Apache-2.0",
      params:"4B / 8.19B / 14B", ctx:"厂商未公开", date:"2026-02", tier:"t1",
      b:"面向企业流程的 agentic 世界模型，不是聊天模型。",
      sizes:"Arctic-AWM-4B / -8B / -14B", gpu:"8B Q4≈4.5GB",
      source:"https://huggingface.co/Snowflake/Arctic-AWM-8B" },
    { n:"Hermes 4.3 36B / NousCoder 14B", org:"Nous Research", kinds:["full","code"], licText:"Apache-2.0",
      params:"36.15B ｜ 14.77B", ctx:"厂商未公开", date:"2025-11 / 2025-12", tier:"t1",
      b:"Hermes 是后训练系列；NousCoder 专攻竞赛编程（官方称 LiveCodeBench v6 通过率 67.87%）。",
      sizes:"Hermes-4.3-36B（官方 GGUF）· NousCoder-14B", gpu:"14B Q4≈8.1GB；36B Q4≈20GB",
      source:"https://huggingface.co/NousResearch/NousCoder-14B" },
    { n:"HyperCLOVA X SEED Think 32B", org:"Naver", kinds:["vision","reason"], licText:"HyperCLOVA X SEED 许可（专有）",
      params:"33.31B", ctx:"131,072", date:"2025-12", tier:"t1",
      b:"以韩语为中心的统一视觉语言推理模型。",
      sizes:"HyperCLOVAX-SEED-Think-32B · SEED-Omni-8B", gpu:"32B Q4≈18.3GB；8B Q4≈6GB",
      source:"https://huggingface.co/naver-hyperclovax/HyperCLOVAX-SEED-Think-32B" },
    { n:"Moondream 3.1 9B-A2B", org:"Moondream", kinds:["vision","edge"], licText:"Moondream Model License 1.0（托管 API 需商业授权）",
      params:"9.27B 总参 / 激活 2B", ctx:"厂商未公开", date:"2026-06", tier:"t1",
      b:"检测与指点见长的 VLM，输出结构化结果（query / detect / point / caption）。",
      sizes:"moondream3.1-9B-A2B", gpu:"Q4≈5GB",
      source:"https://huggingface.co/moondream/moondream3.1-9B-A2B" },
    { n:"tiny-aya（Cohere 多语小模型）", org:"Cohere", kinds:["edge","chat"], licText:"CC-BY-NC-4.0（禁商用）",
      params:"3.35B", ctx:"厂商未公开", date:"2026-02", tier:"t1",
      b:"Aya 血统的 3B 多语小模型；注意禁商用。",
      sizes:"tiny-aya-global / fire / water / earth（官方 GGUF，需同意条款）", gpu:"Q4≈1.8GB",
      source:"https://huggingface.co/CohereLabs/tiny-aya-global" },
    { n:"Reka Edge 2603", org:"Reka", kinds:["vision","edge"], licText:"Reka 许可（营收 100 万美元以下可商用）",
      params:"7.13B", ctx:"厂商未公开", date:"2026-03", tier:"t1",
      b:"7B 的边缘 VLM：同样 1024×1024 输入只要 331 个 token，比同类少一大截。",
      sizes:"reka-edge-2603", gpu:"Q4≈4GB",
      source:"https://huggingface.co/RekaAI/reka-edge-2603" },
    { n:"LAR-27B（亚马逊）", org:"亚马逊", kinds:["full","chat"], licText:"Apache-2.0",
      params:"26.90B", ctx:"厂商未公开", date:"2026-10", tier:"t2",
      b:"亚马逊第一批真正的开放权重 LLM（此前只有嵌入与时序模型）。",
      sizes:"amazon/LAR-27B（另有 LAR-9B）", gpu:"Q4≈15GB，单卡可跑",
      source:"https://huggingface.co/amazon/LAR-27B" },
    { n:"SimpleSD 30B / CLaRa 7B（苹果 · 仅研究用）", org:"苹果", kinds:["full","chat"], licText:"Apple ML Research 许可（仅研究用途）",
      params:"SimpleSD：30B ｜ 4B ｜ CLaRa：7B", ctx:"厂商未公开", date:"2025-12 / 2026-03", tier:"t2",
      b:"苹果的研究计划确实放权重，但许可写明「仅限研究用途」，不能商用。",
      sizes:"SimpleSD-30B-instruct · SimpleSD-4B-thinking · CLaRa-7B", gpu:"30B Q4≈17GB；7B Q4≈4GB",
      source:"https://huggingface.co/apple/SimpleSD-30B-instruct" },
    { n:"MobileMoE（Meta FAIR · 禁商用）", org:"Meta FAIR", kinds:["edge","full"], licText:"FAIR 非商业研究许可",
      params:"5.33B ｜ 2.82B ｜ 1.26B", ctx:"厂商未公开", date:"2026-06", tier:"t1",
      b:"Meta 的端侧 MoE 研究线；许可仅限非商业研究。",
      sizes:"facebook/MobileMoE-L / -M / -S-Base（需申请）", gpu:"1.26B Q4≈0.7GB",
      source:"https://huggingface.co/facebook/MobileMoE-L-Base" },
  ];
  // 首屏统计里的「模型款数」直接取目录长度 —— 以后加模型不会再忘了改数字
  $$("[data-count-src='models']").forEach((n) => { n.dataset.count = String(ARS.length); });

  const wall = $("#mwall");
  const stat = $("#mstat");
  const escHtml = (s) => String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const licClass = (t)=> (t==="MIT"||t.startsWith("Apache-2.0")||t.startsWith("Modified MIT")||t.startsWith("LFM Open")) ? "mit" : "other";
  const TIER = { t1:"单卡 24GB 可跑", t2:"多卡 / 大内存", t3:"仅服务端 · 云端" };
  function chip(k){return `<span class="badge b-cyan">${KIND[k]}</span>`;}
  function cardHTML(d){
    const chips = d.kinds.map(chip).join("");
    const tier = TIER[d.tier] ? `<span class="tier ${d.tier}">${TIER[d.tier]}</span>` : "";
    const rows = [];
    if (d.params) rows.push(`<b>参数规模</b> ${escHtml(d.params)}`);
    if (d.ctx)    rows.push(`<b>上下文</b> ${escHtml(d.ctx)}`);
    if (d.sizes)  rows.push(`<b>可用档位</b> ${escHtml(d.sizes)}`);
    if (d.gpu)    rows.push(`<b>显存门槛</b> ${escHtml(d.gpu)}`);
    if (d.date)   rows.push(`<b>发布时间</b> ${escHtml(d.date)}`);
    return `<article class="mcard" data-kinds="${d.kinds.join(" ")}">
      <div class="top"><div><div class="org">${escHtml(d.org)}</div>
        <div class="nm">${escHtml(d.n)}</div></div>
        <span class="lic ${licClass(d.licText)}">${escHtml(d.licText)}</span></div>
      <div class="rt">${escHtml(d.b)}</div>
      <div class="spec">${chips}${tier}</div>
      <div class="vc">${rows.join("<br>")}</div>
      <p class="model-source"><a href="${d.source}" target="_blank" rel="noopener">官方模型与许可 ↗</a></p>
    </article>`;
  }
  function renderW(list){
    if(!wall)return;
    wall.innerHTML = list.map(cardHTML).join("");
    if(stat) stat.textContent = `${list.length} 个精选 · 附量化与硬件估算`;
  }
  renderW(ARS);

  /* filter 按钮 */
  const fbtns = $$(".fbtn");
  fbtns.forEach((b) => {
    b.addEventListener("click", () => {
      const k = b.dataset.filter;
      const tier = b.dataset.tier || "";
      fbtns.forEach((x) => x.classList.toggle("on", x === b));
      if (!k && !tier) { renderW(ARS); return; }
      const hit = ARS.filter((d) => (k ? d.kinds.includes(k) : true) && (tier ? d.tier === tier : true));
      renderW(hit);
      if (!hit.length) wall.innerHTML = `<div class="callout g"><span class="head">搜索完成</span>这个类目暂未收录，去 Ollama / HF 淘一淘吧。</div>`;
    });
  });

  /* ASCII 小彩蛋 footer 载入计数器（非重点，仅装饰） */

  /* 回到顶部 */
  const tt = $("#backtotop");
  if (tt) tt.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
})();  /* end IIFE */




