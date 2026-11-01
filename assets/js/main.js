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
  /* 数据核对于 2026-11-01，来源见每张卡片底部「官方模型与许可」。
     显存为量化后估算：权重字节 ≈ 参数量 × 量化位宽 ÷ 8，再加 KV-Cache 与运行时开销。
     许可证以发布方仓库为准，商业使用前务必逐版核对。 */
  const KIND = { full:"全能", chat:"对话/通用", reason:"深度推理", code:"代码/智能体", vision:"视觉/多模态", edge:"轻量/端侧" };
  const ARS = [
    { n:"Qwen3.6 / Qwen3.8（27B 档）", org:"阿里 · 通义", kinds:["full","chat","code"], licText:"Apache-2.0",
      b:"2026 年的本地主力：27B 稠密 + 35B-A3B MoE，全尺寸 Apache-2.0，原生 262,144 上下文（可 YaRN 扩到 1,010,000）。",
      sizes:"27b（稠密）· 35b-A3B · 另有 coding / MTP 变体", gpu:"27B Q4≈18–19GB，正好装进单张 24GB；35B-A3B≈23GB（激活仅 3B，KV-Cache 极小）",
      source:"https://huggingface.co/Qwen/Qwen3.6-27B" },
    { n:"Qwen3.5 全家族", org:"阿里 · 通义", kinds:["full","chat","vision","edge"], licText:"Apache-2.0",
      b:"同一家族从 0.8B 覆盖到 397B-A17B 且全 Apache-2.0，原生多模态（图文视频），本地首选的全尺寸入门路线。",
      sizes:"0.8b · 2b · 4b · 9b · 27b · 35b-A3B · 122b-A10B · 397b-A17B",
      gpu:"0.8B≈1.2GB 起；9B≈6.6GB；27B≈17GB；35B-A3B≈22GB；122B-A10B≈81GB（需多卡）",
      source:"https://huggingface.co/Qwen/Qwen3.5-35B-A3B" },
    { n:"Qwen3-VL / Qwen3-Omni", org:"阿里 · 通义", kinds:["vision"], licText:"Apache-2.0（VL）· 需核验（Omni）",
      b:"视觉下探到 2B，是本地 OCR、截图理解最现实的家族；Omni 是目前唯一开源的全模态（文/图/音/视频输入 + 语音输出）。",
      sizes:"VL：2b · 4b · 8b · 30b-A3B · 32b · 235b-A22B ｜ Omni：30b-A3B",
      gpu:"VL 8B≈6.2GB、32B≈21GB；Omni Q4≈21–23GB（仅社区 GGUF，无 Ollama 官方标签）",
      source:"https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct" },
    { n:"Qwen3-Next-80B-A3B / Coder-Next", org:"阿里 · 通义", kinds:["code","full"], licText:"Apache-2.0",
      b:"超稀疏 MoE：80B 总参只激活 3B，推理成本接近 8B 档；Coder-Next 是同架构的编程特化版。",
      sizes:"qwen3-next:80b · qwen3-coder-next:80b", gpu:"Q4 约 50–52GB，48–56GB 显存或双 24GB 卡可跑",
      source:"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct" },
    { n:"Gemma 4", org:"Google DeepMind", kinds:["full","vision","edge"], licText:"Apache-2.0",
      b:"本轮唯一「全尺寸 Apache-2.0 + 原生音频输入」的开放权重家族；E2B/E4B 支持文本 + 图像 + 音频。",
      sizes:"e2b · e4b · 12b · 26b-A4B · 31b",
      gpu:"E2B≈4.6GB；E4B≈6.6GB；12B≈8GB；26B-A4B≈18GB（激活 3.8B）；31B≈20GB",
      source:"https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4" },
    { n:"Muse-Glimmer-30B", org:"Meta · 新开放权重品牌", kinds:["full","vision"], licText:"Apache-2.0",
      b:"Meta 开放权重的新起点（注意：并不存在 Llama 5 开放权重，官方改用 Muse 品牌）；首个 Apache-2.0 的原生多模态开放模型。",
      sizes:"30b（含约 1.8B 视觉编码器）", gpu:"Q4≈18GB，单张 24GB 即可",
      source:"https://huggingface.co/meta-models/Muse-Glimmer-30B" },
    { n:"GLM-5.3-Flash / GLM-4.7-Flash", org:"智谱 Z.ai", kinds:["full","chat","code"], licText:"MIT",
      b:"GLM 主线已到约 753B / 1M 上下文，但 5.3 换成专有许可；Flash 档保留 MIT，是本地能放心用的出口。",
      sizes:"GLM-4.7-Flash：30b-A3B ｜ GLM-5.3-Flash：320b-A18b",
      gpu:"4.7-Flash Q4≈19GB 单卡可跑；5.3-Flash 原生多模态 + 1M 上下文，Ollama 仅有 :cloud",
      source:"https://huggingface.co/zai-org/GLM-5.3-Flash" },
    { n:"DeepSeek-V4.1-Flash / V4", org:"DeepSeek · 中国", kinds:["full","reason"], licText:"MIT",
      b:"1M 上下文成为官方默认；V4.1-Flash 是原生多模态的 MoE。注意：Ollama 只有 :cloud 标签，没有本地权重分发。",
      sizes:"V4-Pro：1.6T-A49B ｜ V4-Flash：284b-A13b ｜ V4.1-Flash：552b-A8~16b",
      gpu:"V4-Flash Q4≈160–170GB；V4-Pro Q4≈900GB+ —— 本地只能自建 vLLM 服务",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash" },
    { n:"MiniMax-M2.7 / M3", org:"MiniMax", kinds:["full","code"], licText:"禁商用（M2.7）· 社区许可（M3）",
      b:"许可证一年三变：M2 修改 MIT → M2.5 自定义许可 → M2.7 直接禁商用 → M3 社区许可。商用前必须逐版核对。",
      sizes:"M2.x：229b-A10b ｜ M3：428b-A23b",
      gpu:"M2.7 Q4≈130GB；M3 原生多模态 + 1M 上下文，Ollama 仅有 :cloud",
      source:"https://huggingface.co/MiniMaxAI/MiniMax-M2.7" },
    { n:"Kimi K3 / K2.5", org:"月之暗面 Moonshot", kinds:["full","code","vision"], licText:"专有许可（K3）· 修改 MIT（K2.5）",
      b:"K3 是首个开放的 3T 级模型（2.8T 总参 / 激活 104B / 896 专家取 16），1M 上下文；但 K3 已改用专有许可。",
      sizes:"K2.5：1T-A32b ｜ K3：2.8T-A104b",
      gpu:"K2.5 Q4≈560GB+；K3 仅 :cloud —— 两者本地都需要多卡集群",
      source:"https://huggingface.co/moonshotai/Kimi-K3" },
    { n:"gpt-oss-20b / 120b", org:"OpenAI", kinds:["reason","code"], licText:"Apache-2.0",
      b:"OpenAI 至今唯一的开放权重系列（没有 gpt-oss-2）；MoE + MXFP4 量化，20B 是社区最通用的桌面推理模型。",
      sizes:"20b（激活 3.6B）· 120b（激活 5.1B）", gpu:"20B Q4≈14GB；120B Q4≈65GB",
      source:"https://huggingface.co/openai/gpt-oss-20b" },
    { n:"Nemotron 3.5 Bolt", org:"NVIDIA", kinds:["full","code"], licText:"需核验（NVIDIA 开放模型许可）",
      b:"官方为「单张 24GB 显卡」量身定制的权重：74B 总参只激活 9B，官方直接提供 GGUF。",
      sizes:"74b-A9b-24GB · 30b-A3b（Lightning）· E4B-4GB",
      gpu:"Bolt 24GB 档按 24GB 显存设计；更大的 Super（120b-A12b）Q4≈90GB",
      source:"https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-74B-A9B-24GB-GGUF" },
    { n:"Mistral Medium 3.5", org:"Mistral AI", kinds:["full","code"], licText:"Modified MIT",
      b:"罕见的稠密 128B 开放权重旗舰（没有 MoE 的激活红利），256K 上下文，且有 Ollama 官方标签。",
      sizes:"128b（稠密）", gpu:"Q4≈80GB，单机需大内存或 CPU offload",
      source:"https://huggingface.co/mistralai/Mistral-Medium-3.5-128B" },
    { n:"granite4.2", org:"IBM", kinds:["full","chat"], licText:"Apache-2.0",
      b:"企业向 Apache-2.0 小模型：3B/8B/30B 三档，工具调用与结构化输出稳定，适合做内部服务底座。",
      sizes:"3b · 8b · 30b", gpu:"3B≈2.2GB；8B≈5.3GB；30B≈18GB",
      source:"https://huggingface.co/ibm-granite/granite-4.2-3b" },
    { n:"LFM3-1.7B", org:"Liquid AI", kinds:["edge","chat"], licText:"LFM Open License v1.0",
      b:"1.7B 就给 256K 上下文 + agentic 训练，Q4 只有 1.1GB —— 端侧长文本的极端例子。",
      sizes:"1.7b", gpu:"Q4≈1.1GB，6GB 卡甚至纯 CPU 都能跑",
      source:"https://huggingface.co/LiquidAI/LFM3-1.7B" },
    { n:"DeepSeek-R1（蒸馏系，仍在服役）", org:"DeepSeek · 中国", kinds:["reason"], licText:"MIT",
      b:"首个把长链推理内化进开源模型的作品，1.5B 迷你版都带推理痕迹。近一年没有新的 R1 权重，但蒸馏档仍是社区最省显存的推理选择。",
      sizes:"1.5b · 7b · 8b · 14b · 32b · 70b", gpu:"7B 量化≈6–9GB；32B≈20GB+",
      source:"https://huggingface.co/deepseek-ai/DeepSeek-R1" },
  ];
  const wall = $("#mwall");
  const stat = $("#mstat");
  const escHtml = (s) => String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const licClass = (t)=> (t==="MIT"||t.startsWith("Apache-2.0")||t.startsWith("Modified MIT")||t.startsWith("LFM Open")) ? "mit" : "other";
  function chip(k){return `<span class="badge b-cyan">${KIND[k]}</span>`;}
  function cardHTML(d){
    const chips = d.kinds.map(chip).join("");
    return `<article class="mcard" data-kinds="${d.kinds.join(" ")}">
      <div class="top"><div><div class="org">${escHtml(d.org)}</div>
        <div class="nm">${escHtml(d.n)}</div></div>
        <span class="lic ${licClass(d.licText)}">${escHtml(d.licText)}</span></div>
      <div class="rt">${escHtml(d.b)}</div>
      <div class="spec">${chips}</div>
      <div class="vc"><b>可用档位 · </b>${d.sizes}<br><b>量化后大致门槛 · </b>${d.gpu}</div>
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
  $$(".fbtn").forEach((b) => {
    b.addEventListener("click", () => {
      const k = b.dataset.filter;
      $$(".fbtn").forEach((x) => x.classList.toggle("on", x === b));
      if (k === "all") { renderW(ARS); return; }
      const hit = ARS.filter((d) => d.kinds.includes(k));
      renderW(hit);
      if (!hit.length) wall.innerHTML = `<div class="callout g"><span class="head">搜索完成</span>这个类目暂未收录，去 Ollama / HF 淘一淘吧。</div>`;
    });
  });

  /* ASCII 小彩蛋 footer 载入计数器（非重点，仅装饰） */

  /* 回到顶部 */
  const tt = $("#backtotop");
  if (tt) tt.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
})();  /* end IIFE */




