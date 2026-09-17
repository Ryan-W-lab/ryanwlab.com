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
  const lines = [
    "> ./boot local_ai.sys --homebrew",
    "> 以本地之力 · 驯服万亿参数巨兽",
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
    if (guruBtn) guruBtn.classList.toggle("on", inD || id === "players");
    if (inD) openSnDeep(true);
    history.replaceState(null, "", id === "top" ? location.pathname : "#" + id);
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
      { threshold: 0.1 }
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

  /* ---------- term 复制按钮 ---------- */
  $$(".bar .copy").forEach((b) => {
    b.addEventListener("click", () => {
      const pre = b.closest(".term").querySelector("pre");
      if (navigator.clipboard && pre) {
        const plain = pre.textContent.replace(/\u200b/g, "");
        navigator.clipboard.writeText(plain).then(() => {
          const old = b.textContent; b.textContent = "✓ copied";
          setTimeout(() => (b.textContent = old), 1400);
        });
      }
    });
  });

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
  const KIND = { full:"全能", chat:"对话/通用", reason:"深度推理", code:"代码/智能体", vision:"视觉/多模态", edge:"轻量/端侧" };
  const ARS = [   // 近一年多 可本地部署的开源强模型（量化后大致门槛）
    { n:"DeepSeek-R1", org:"DeepSeek · 中国", kinds:["reason"], licText:"MIT",
      b:"首个将长链推理(Reinforcement)→思维链内化的开源；1.5B 迷你版都带推理痕迹。",
      sizes:"1.5b · 7b · 8b · 14b · 32b · 70b · 671b", gpu:"7B/量化≈6–9GB，32B 约20GB+，全网最热本地推理之一" },
    { n:"DeepSeek-V3 系", org:"DeepSeek · 中国", kinds:["full","chat"], licText:"MIT",
      b:"MoE 671B 总参数、仅 37B 激活的旗舰；稠密对话质量世界级，本地入门建议 quant 蒸馏或租卡。",
      sizes:"671B-A37B（亦有开源小配方）", gpu:"单双卡难完整；Q4 仍需 ~380GB+，中小机请用 R1 蒸馏档或 API 平替" },
    { n:"Qwen3", org:"阿里 · 开源", kinds:["full","chat","reason"], licText:"Apache-2.0?",
      b:"Qwen 生态年度集大成：自带 thinking 开关、工具调用；稠密 0.6B→32B 完美覆盖个人机。",
      sizes:"0.6b·1.7b·4b·8b·14b·30b·32b(A3B MoE)·235b", gpu:"8B/14B 量化 8–12GB 亲测流畅；MoE 32B 更轻" },
    { n:"Qwen2.5-Coder", org:"阿里 · 开源", kinds:["code"], licText:"Apache-2.0?",
      b:"编程领域开源常青树，0.5B–32B 全覆盖，配合本地 IDE 补全性价比极高。",
      sizes:"0.5b · 1.5b · 3b · 7b · 14b · 32b", gpu:"7B/14B 量化 6–12GB 即可起飞" },
    { n:"Llama 3.2 / 3.3", org:"Meta", kinds:["full","edge"], licText:"Llama 3",
      b:"3.2 主打轻量(1B/3B 端侧)，3.3-70B 稠密逼近前沿；Llama 系生态与工具链最成熟。",
      sizes:"3.2: 1b·3b | 3.3: 70b", gpu:"3B 可纯CPU；1B 手机级；70B Q4≈45GB" },
    { n:"Gemma 3", org:"Google DeepMind", kinds:["full","vision","edge"], licText:"Gemma",
      b:"单 GPU 能力的天花板选手之一，多模态 + 极长上下文；1B 起极小本也能啃。",
      sizes:"1b · 4b · 12b · 27b", gpu:"4B/12B 量化 4–10GB" },
    { n:"Phi-4 / Phi-4-mini", org:"Microsoft", kinds:["chat","full"], licText:"MIT",
      b:"微软以小博大：Phi-4-14B 稠密训练中庸数据质量取胜，Phi-4-mini 3.8B 端侧明星。",
      sizes:"3.8b · 14b", gpu:"3.8B≈3GB 直插手机边缘盒" },
    { n:"GLM-4-9B 系", org:"智谱Z.ai", kinds:["full","chat"], licText:"MIT",
      b:"GLM-4-9B-0414 以 9B 体量追 14B 级别中文能力，家族含长文本/图像变体；中文原生友好。",
      sizes:"9b（另有 长文本・vision・air 变体）", gpu:"Q4≈5–6GB，中文场景强烈推荐" },
    { n:"InternLM3-8B", org:"上海AI Lab", kinds:["chat","full"], licText:"Apache-2.0?",
      b:"书生系：开源训练全链条，8B 在 Agent/工具调用上平衡出色。",
      sizes:"8b", gpu:"8–10GB 轻松跑" },
    { n:"Mistral / Nemo", org:"Mistral AI", kinds:["full","edge"], licText:"Apache-2.0?",
      b:"欧洲之光；Mistral-7B-v0.3 与 Mistral-Nemo-12B(量级 GPT-4 启发架构) 性价比老将。",
      sizes:"7b · 12b(Nemo)", gpu:"7B≈6GB 起" },
    { n:"gpt-oss-20b", org:"OpenAI", kinds:["reason","code"], licText:"Apache-2.0(MIT)?" ,
      b:"OpenAI 首个开放权重：gpt-oss-20b/120b，强推理/Agent 定位，桌面级可选 20B。",
      sizes:"20b · 120b(MoE)", gpu:"20B(GPT-OSS-20B-A4B)Q4 约11GB" },
    { n:"Qwen3-Coder / 前沿预览", org:"阿里/多源", kinds:["code","full"], licText:"Apache-2.0?",
      b:"Qwen3-Coder-30B-A3B 让 30B 总/MoE 落到单卡；开发最热刷新中。",
      sizes:"30b-A3B · 亦有 agent 变体", gpu:"Q3/Q4 约12–16GB" },
  ];
  const wall = $("#mwall");
  const stat = $("#mstat");
  const escHtml = (s) => String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const licClass = (t)=> (t==="MIT"||t==="Apache-2.0*") ? "mit" : "other";
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




