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
    { n:"Qwen3.6 / Qwen3.8（27B 档）", org:"阿里 · 通义", kinds:["full","chat","code"],
      params:"27B 稠密 ｜ 35B-A3B（激活 3B）", ctx:"262,144（可 YaRN 扩到 1,010,000）", date:"2026-04（3.6）｜ 2026-08（3.8）", tier:"t1", licText:"Apache-2.0",
      b:"2026 年的本地主力：27B 稠密 + 35B-A3B MoE，全尺寸 Apache-2.0，原生 262,144 上下文（可 YaRN 扩到 1,010,000）。",
      sizes:"27b（稠密）· 35b-A3B · 另有 coding / MTP 变体", gpu:"27B Q4≈18–19GB，正好装进单张 24GB；35B-A3B≈23GB（激活仅 3B，KV-Cache 极小）",
      source:"https://huggingface.co/Qwen/Qwen3.6-27B" },
    { n:"Qwen3.5 全家族", org:"阿里 · 通义", kinds:["full","chat","vision","edge"],
      params:"0.8B → 397B-A17B（激活 17B）", ctx:"262,144（可扩到 1,010,000）", date:"2026-02", tier:"t1", licText:"Apache-2.0",
      b:"同一家族从 0.8B 覆盖到 397B-A17B 且全 Apache-2.0，原生多模态（图文视频）；从端侧到多卡服务器都有对应档位。",
      sizes:"0.8b · 2b · 4b · 9b · 27b · 35b-A3B · 122b-A10B · 397b-A17B",
      gpu:"0.8B≈1.2GB 起；9B≈6.6GB；27B≈17GB；35B-A3B≈22GB；122b-A10B≈81GB（64–96GB 卡或 CPU offload）",
      source:"https://huggingface.co/Qwen/Qwen3.5-35B-A3B" },
    { n:"Qwen3-VL / Qwen3-Omni", org:"阿里 · 通义", kinds:["vision"],
      params:"VL 2B–235B-A22B ｜ Omni 30B-A3B（激活 3B）", ctx:"262,144（VL）｜ 32,768（Omni）", date:"2025-09 / 2025-10", tier:"t1", licText:"Apache-2.0（VL）· 需核验（Omni）",
      b:"视觉下探到 2B，是本地 OCR、截图理解最现实的家族；Omni 是目前唯一开源的全模态（文/图/音/视频输入 + 语音输出）。",
      sizes:"VL：2b · 4b · 8b · 30b-A3B · 32b · 235b-A22B ｜ Omni：30b-A3B",
      gpu:"VL 8B≈6.2GB、32B≈21GB；Omni Q4≈21–23GB（仅社区 GGUF，无 Ollama 官方标签）",
      source:"https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct" },
    { n:"Qwen3-Next-80B-A3B / Coder-Next", org:"阿里 · 通义", kinds:["code","full"],
      params:"80B 总参 / 激活 3B", ctx:"262,144", date:"2025-09（Next）｜ 2026-01（Coder-Next）", tier:"t2", licText:"Apache-2.0",
      b:"超稀疏 MoE：80B 总参只激活 3B，推理成本接近 8B 档；Coder-Next 是同架构的编程特化版。48–56GB 显存即可。",
      sizes:"qwen3-next:80b · qwen3-coder-next:80b", gpu:"Q4 约 50–52GB，48–56GB 显存或双 24GB 卡可跑",
      source:"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct" },
    { n:"Gemma 4", org:"Google DeepMind", kinds:["full","vision","edge"],
      params:"E2B 2.3B ｜ E4B 4.5B ｜ 12B ｜ 26B-A4B（激活 3.8B）｜ 31B", ctx:"128K（E 档）｜ 256K（中大型）", date:"2026-03", tier:"t1", licText:"Apache-2.0",
      b:"本轮唯一「全尺寸 Apache-2.0 + 原生音频输入」的开放权重家族；E2B/E4B 支持文本 + 图像 + 音频。",
      sizes:"e2b · e4b · 12b · 26b-A4B · 31b",
      gpu:"E2B≈4.6GB；E4B≈6.6GB；12B≈8GB；26b-A4B≈18GB（激活 3.8B）；31B≈20GB",
      source:"https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4" },
    { n:"Muse-Glimmer-30B", org:"Meta · 新开放权重品牌", kinds:["full","vision"],
      params:"29.6B（含约 1.8B 视觉编码器）", ctx:"131,072+", date:"2026-08", tier:"t1", licText:"Apache-2.0",
      b:"Meta 开放权重的新起点（注意：并不存在 Llama 5 开放权重，官方改用 Muse 品牌）；首个 Apache-2.0 的原生多模态开放模型。",
      sizes:"30b（含约 1.8B 视觉编码器）", gpu:"Q4≈18GB，单张 24GB 即可",
      source:"https://huggingface.co/meta-models/Muse-Glimmer-30B" },
    { n:"GLM-4.7-Flash（30B-A3B）", org:"智谱 Z.ai", kinds:["full","chat","code"],
      params:"30B 总参 / 激活 3B", ctx:"202,752（4.7 本体）", date:"2026-01", tier:"t1", licText:"MIT",
      b:"Flash 档的 GLM：30B 总参只激活 3B，Q4 约 19GB，一张 24GB 卡就能跑起来 —— 本地党最友好的 GLM 入口。",
      sizes:"30b-A3B（另有 355B-A32B 的 GLM-4.7 本体）", gpu:"Q4≈19GB 单卡可跑；激活仅 3B，长上下文也不涨显存",
      source:"https://huggingface.co/zai-org/GLM-4.7-Flash" },
    { n:"GLM-5.3-Flash（320B-A18B）", org:"智谱 Z.ai", kinds:["full","vision","chat"],
      params:"320B 总参 / 激活 18B", ctx:"1,048,576", date:"2026-08", tier:"t2", licText:"MIT",
      b:"GLM-5 系列的 Flash：320B 总参激活 18B，原生多模态 + 1M 上下文，仍保留 MIT —— 专有许可下最值得关注的出口。",
      sizes:"320b-A18b", gpu:"Q4≈180GB（4×48GB 或 2×96GB 级服务器）；Ollama 目前只有 :cloud 标签，本地需自建 vLLM",
      source:"https://huggingface.co/zai-org/GLM-5.3-Flash" },
    { n:"MiniMax M3 / M3.1-Flash", org:"MiniMax", kinds:["full","code","vision"],
      params:"428B 总参 / 激活 23B", ctx:"1,048,576", date:"2026-06（M3）｜ 2026-10（M3.1-Flash）", tier:"t2", licText:"社区许可（M3）",
      b:"428B 总参激活 23B，原生多模态 + 1M 上下文；M3.1-Flash 还可调 thinking depth。激活低是关键 —— 算力按 23B 走，存储按 428B 走。",
      sizes:"428b-A23b（M3 与 M3.1-Flash 同架构）", gpu:"Q4≈240GB（4×80GB 或大内存 offload）；Ollama 仅有 :cloud，需自建服务",
      source:"https://huggingface.co/MiniMaxAI/MiniMax-M3" },
    { n:"MiniMax-M2.7 / M2.5", org:"MiniMax", kinds:["full","code"],
      params:"229B 总参 / 激活 10B", ctx:"204,800（M2.7）", date:"2026-02（M2.5）｜ 2026-04（M2.7）", tier:"t2", licText:"禁商用（M2.7）· 自定义（M2.5）",
      b:"229B-A10B 的老牌主力，10B 激活、吞吐高。注意许可证一年三变：M2 修改 MIT → M2.5 自定义 → M2.7 直接禁商用。",
      sizes:"229b-A10b", gpu:"Q4≈130GB（2×80GB 或 128GB+ 内存 + 部分 offload）",
      source:"https://huggingface.co/MiniMaxAI/MiniMax-M2.7" },
    { n:"DeepSeek-V4.1-Flash", org:"DeepSeek · 中国", kinds:["full","vision","reason"],
      params:"552B 总参 / 激活 8–16B（384 专家 + 1 shared，取 6）", ctx:"1,048,576", date:"2026-09", tier:"t2", licText:"MIT",
      b:"552B 总参却只激活 8–16B 的 MoE，原生多模态 + 1M 上下文，是 DeepSeek 系里最接近「本地能跑」的大模型形态。",
      sizes:"552b-A8~16b", gpu:"Q4≈310GB（4×96GB 或 8×48GB 级机器）；Ollama 只有 :cloud，需自建 vLLM",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash" },
    { n:"DeepSeek-V4-Flash", org:"DeepSeek · 中国", kinds:["full","reason"],
      params:"284B 总参 / 激活 13B", ctx:"1,048,576", date:"2026-04（Preview）｜ 2026-07（0731）", tier:"t2", licText:"MIT",
      b:"284B-A13B，1M 上下文的轻量版；稀疏注意力让长文推理成本大幅下降。",
      sizes:"284b-A13b", gpu:"Q4≈160GB（2×96GB 或 4×48GB）；Ollama 只有 :cloud",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro" },
    { n:"DeepSeek-V3.2", org:"DeepSeek · 中国", kinds:["full","reason"],
      params:"671B 总参 / 激活 37B（256 专家 + 1 shared，取 8）", ctx:"163,840", date:"2025-09（Exp）｜ 2025-12（正式）", tier:"t2", licText:"MIT",
      b:"671B-A37B 的成熟版，首发 DSA 稀疏注意力 + thinking-with-tools；本地需要真正的多卡服务器。",
      sizes:"671b-A37b", gpu:"Q4≈375GB（8×48GB 或 4×96GB）；Ollama 无官方标签，需社区量化或自建",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-V3.2" },
    { n:"Qwen3.8-Flash-Next（125B-A6B）", org:"阿里 · 通义", kinds:["full","reason"],
      params:"125B 总参 / 激活 6B（另含 51B n-gram embedding 与 4B MTP）", ctx:"262,144（可扩到 1,000,000）", date:"2026-08", tier:"t2", licText:"Qwen Community License 1.0",
      b:"Qwen4 架构的预览版：125B 总参激活 6B，262K 原生上下文可扩到 1M，另带 51B n-gram embedding 与 4B MTP 头。",
      sizes:"125b-A6b", gpu:"Q4≈120GB（2×80GB 或 3×48GB）；许可非 Apache，商用前逐条核对",
      source:"https://huggingface.co/Qwen/Qwen3.8-Flash-Next" },
    { n:"gpt-oss-20b / 120b / safeguard", org:"OpenAI", kinds:["reason","code"],
      params:"20B（激活 3.6B）｜ 120B（激活 5.1B）", ctx:"131,072", date:"2025-08（首发）｜ 2025-09（safeguard）", tier:"t1", licText:"Apache-2.0",
      b:"OpenAI 至今唯一的开放权重系列（没有 gpt-oss-2）；MoE + MXFP4。safeguard 版是可本地跑的内容安全分类器。",
      sizes:"20b（激活 3.6B）· 120b（激活 5.1B）· safeguard 20b/120b", gpu:"20B Q4≈14GB；120B Q4≈65GB（64–96GB 卡）",
      source:"https://huggingface.co/openai/gpt-oss-20b" },
    { n:"Mistral Medium 3.5（128B 稠密）", org:"Mistral AI", kinds:["full","code"],
      params:"128B 稠密（没有 MoE 激活红利）", ctx:"262,144", date:"2026-03", tier:"t2", licText:"Modified MIT",
      b:"罕见的稠密 128B 开放权重旗舰（没有 MoE 的激活红利），256K 上下文，且有 Ollama 官方标签。",
      sizes:"128b（稠密）", gpu:"Q4≈80GB（单张 96GB 卡，或大内存 + offload）",
      source:"https://huggingface.co/mistralai/Mistral-Medium-3.5-128B" },
    { n:"Nemotron 3.5 Bolt", org:"NVIDIA", kinds:["full","code"],
      params:"74B-A9B ｜ 30B-A3B ｜ E4B", date:"2026-08（Lightning）｜ 2026-10（Bolt）", tier:"t1", licText:"需核验（NVIDIA 开放模型许可）",
      b:"官方为「单张 24GB 显卡」量身定制的权重：74B 总参只激活 9B，官方直接提供 GGUF。",
      sizes:"74b-A9b-24GB · 30b-A3b（Lightning）· E4B-4GB", gpu:"Bolt 24GB 档按 24GB 显存设计；Super（120b-A12b）Q4≈90GB",
      source:"https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-74B-A9B-24GB-GGUF" },
    { n:"granite4.2 / Nemotron Nano", org:"IBM · NVIDIA", kinds:["full","chat","edge"],
      params:"3B ｜ 8B ｜ 30B ｜ Nano 4B / 30B-A3B", date:"2026-08", tier:"t1", licText:"Apache-2.0 · 需核验（NVIDIA）",
      b:"企业向小模型两件套：granite4.2 三档全 Apache-2.0，工具调用与结构化输出稳定；Nemotron Nano 4B/30B-A3B 是同系列轻量档。",
      sizes:"granite4.2：3b · 8b · 30b ｜ nemotron-3-nano：4b · 30b-A3b", gpu:"3B≈2.2GB；8B≈5.3GB；30B≈18GB",
      source:"https://huggingface.co/ibm-granite/granite-4.2-3b" },
    { n:"LFM3-1.7B", org:"Liquid AI", kinds:["edge","chat"],
      params:"1.7B", ctx:"262,144", date:"2026-10", tier:"t1", licText:"LFM Open License v1.0",
      b:"1.7B 就给 256K 上下文 + agentic 训练，Q4 只有 1.1GB —— 端侧长文本的极端例子。",
      sizes:"1.7b", gpu:"Q4≈1.1GB，6GB 卡甚至纯 CPU 都能跑",
      source:"https://huggingface.co/LiquidAI/LFM3-1.7B" },
    { n:"MedGemma 1.5 / MiniCPM-V 4.6", org:"Google Health · OpenBMB", kinds:["vision","edge"],
      params:"MedGemma 1.5：4.3B ｜ MiniCPM-V 4.6：1.3B", date:"2026-01 / 2026-04", tier:"t1", licText:"需核验（Gemma 系）· Apache-2.0",
      b:"垂直与端侧多模态：MedGemma 1.5 是医疗领域 4B 专用权重；MiniCPM-V 4.6 只有 1.3B 却能做图文问答。",
      sizes:"medgemma1.5:4b（3.3GB）· minicpm-v4.6（1.6GB）", gpu:"3.3GB / 1.6GB，纯端侧可跑",
      source:"https://huggingface.co/openbmb/MiniCPM-V-4.6" },
    { n:"DeepSeek-R1（蒸馏系，仍在服役）", org:"DeepSeek · 中国", kinds:["reason"],
      params:"1.5B – 70B 稠密蒸馏", ctx:"32,768 – 131,072（按档位）", date:"2025-01（首发，窗口内无新权重）", tier:"t1", licText:"MIT",
      b:"首个把长链推理内化进开源模型的作品，1.5B 迷你版都带推理痕迹。近一年没有新的 R1 权重，但蒸馏档仍是社区最省显存的推理选择。",
      sizes:"1.5b · 7b · 8b · 14b · 32b · 70b", gpu:"7B 量化≈6–9GB；32B≈20GB+",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-R1" },
  ];
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




