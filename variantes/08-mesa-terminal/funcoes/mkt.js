/* Variante 08 · Mesa (terminal desde o início) · funcoes/mkt.js
   MKT · Mercado: preços de energia negociados na BBCE por produto (mês, trimestre, semestre e ano), com o SE como
   referência e os outros submercados quando houver negócio. Candles por produto, curva forward com a liquidez de
   cada prazo e fita de negócios ao vivo.
   AINDA NÃO HÁ DADOS: tudo aqui é FICTÍCIO e SIMULADO, gerado neste módulo com semente fixa (histórico de 60 dias
   úteis e o pregão de hoje até 14:30) e, depois de carregar, um gerador de negócios que cria um negócio a cada
   1 a 4 segundos. Um relógio só no módulo; as vistas se inscrevem (ouvir) e saem sozinhas quando o elemento sai
   da tela (isConnected).
   Telas: 1 CAN Candles · 2 CUR Curva · 3 NEG Negócios · 4 MET Fonte e método.
   Nada global além do Mesa.registrar; preferências em localStorage com prefixo "mesa.mkt.". */
(function () {
  "use strict";
  if (typeof Mesa === "undefined") return;

  // =====================================================================================================
  // aleatório com semente (o histórico é sempre o mesmo) e datas
  // =====================================================================================================
  function semente(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const RND = semente(20261115);
  const gauss = (r = RND) => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const poisson = (lam, r = RND) => {
    if (lam <= 0) return 0;
    if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
    const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1;
  };
  const escolher = (lista, r = RND) => lista[Math.floor(r() * lista.length)];

  const HOJE = "2026-11-15";
  const FERIADOS = new Set(["2026-09-07", "2026-10-12", "2026-11-02"]);
  const DSEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const somaDias = (s, k) => { const t = new Date(s + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
  const diaSem = s => DSEM[new Date(s + "T12:00:00Z").getUTCDay()];
  const ddmm = s => dataBr(s).slice(0, 5);
  const DIAS = [];
  for (let t = HOJE; DIAS.length < 60;) { t = somaDias(t, -1); const w = new Date(t + "T12:00:00Z").getUTCDay(); if (w !== 0 && w !== 6 && !FERIADOS.has(t)) DIAS.unshift(t); }
  DIAS.push(HOJE);
  const T = DIAS.length - 1;                       // índice de hoje
  const ABRE = 9 * 3600, FECHA = 18 * 3600;        // pregão das 9h às 18h (horário de Brasília)
  const SIM0 = 14 * 3600 + 30 * 60;                // o pregão simulado começa a correr às 14:30
  const t0 = performance.now();
  const agoraS = () => Math.min(FECHA, SIM0 + (performance.now() - t0) / 1000);
  const p2 = v => String(v).padStart(2, "0");
  const hms = s => `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(Math.floor(s) % 60)}`;
  const hm = s => hms(s).slice(0, 5);
  const hh = s => `${p2(Math.floor(s / 3600))}h`;

  // =====================================================================================================
  // produtos e submercados (fictícios: níveis plausíveis, liquidez que cai com o prazo)
  // lam = negócios por dia no SE, em média; vol = volatilidade diária; tipo e entrega para o inspetor
  // =====================================================================================================
  const PRODS = [
    { id: "M1", rot: "dez/26", h: "M+1", tipo: "Mês", grupo: 0, ent: "01/12/26 a 31/12/26", base: 214, lam: 220, vol: 0.018 },
    { id: "M2", rot: "jan/27", h: "M+2", tipo: "Mês", grupo: 0, ent: "01/01/27 a 31/01/27", base: 222, lam: 45, vol: 0.016 },
    { id: "M3", rot: "fev/27", h: "M+3", tipo: "Mês", grupo: 0, ent: "01/02/27 a 28/02/27", base: 205, lam: 20, vol: 0.015 },
    { id: "T1", rot: "1T27", h: "T+1", tipo: "Trimestre", grupo: 1, ent: "jan/27 a mar/27", base: 212, lam: 24, vol: 0.013 },
    { id: "T2", rot: "2T27", h: "T+2", tipo: "Trimestre", grupo: 1, ent: "abr/27 a jun/27", base: 188, lam: 12, vol: 0.012 },
    { id: "S2", rot: "2S27", h: "S+2", tipo: "Semestre", grupo: 1, ent: "jul/27 a dez/27", base: 248, lam: 6, vol: 0.011 },
    { id: "A1", rot: "Cal 27", h: "A+1", tipo: "Ano", grupo: 2, ent: "jan/27 a dez/27", base: 225, lam: 140, vol: 0.009 },
    { id: "A2", rot: "Cal 28", h: "A+2", tipo: "Ano", grupo: 2, ent: "jan/28 a dez/28", base: 203, lam: 9, vol: 0.007 },
    { id: "A3", rot: "Cal 29", h: "A+3", tipo: "Ano", grupo: 2, ent: "jan/29 a dez/29", base: 192, lam: 1.2, vol: 0.006 },
    { id: "A4", rot: "Cal 30", h: "A+4", tipo: "Ano", grupo: 2, ent: "jan/30 a dez/30", base: 181, lam: 0.35, vol: 0.006 },
    { id: "A5", rot: "Cal 31", h: "A+5", tipo: "Ano", grupo: 2, ent: "jan/31 a dez/31", base: 173, lam: 0.15, vol: 0.005 },
  ];
  const GRUPOS = ["Meses", "Trimestres e semestre", "Anos"];
  const PROD = Object.fromEntries(PRODS.map(p => [p.id, p]));
  // submercado: [código, rótulo, fração da liquidez do SE, spread sobre o SE em R$/MWh, produtos negociados]
  const SUBS = [
    { id: "SE", rot: "SE", nome: "Sudeste/Centro-Oeste", mult: 1, spr: 0, cor: "var(--sm-se)", prods: PRODS.map(p => p.id) },
    { id: "S", rot: "S", nome: "Sul", mult: 0.22, spr: -4.5, cor: "var(--sm-s)", prods: ["M1", "M2", "M3", "T1", "T2", "S2", "A1", "A2", "A3"] },
    { id: "NE", rot: "NE", nome: "Nordeste", mult: 0.12, spr: -27, cor: "var(--sm-ne)", prods: ["M1", "M2", "T1", "A1", "A2"] },
    { id: "N", rot: "N", nome: "Norte", mult: 0.07, spr: -21, cor: "var(--sm-n)", prods: ["M1", "M2", "A1"] },
  ];
  const SUB = Object.fromEntries(SUBS.map(s => [s.id, s]));
  const nomeP = (sub, prod) => `${sub} ${PROD[prod].rot}`;
  const LOTES = { curto: [1, 2, 3, 5, 5, 5, 10, 10, 10, 15, 20, 25, 30], medio: [1, 2, 3, 5, 5, 10], longo: [0.5, 1, 1, 2, 3, 5] };
  const lote = (prod, r) => escolher(["M1", "M2", "T1", "A1"].includes(prod) ? LOTES.curto : ["A3", "A4", "A5"].includes(prod) ? LOTES.longo : LOTES.medio, r);
  const arred = v => Math.round(v * 20) / 20;      // preço em múltiplos de R$ 0,05
  const fmtMW = v => n(v, Math.abs(v % 1) > 1e-9 ? 1 : 0);

  // =====================================================================================================
  // histórico fictício: preço "justo" diário por produto (fator comum + próprio) e negócios em horários sorteados
  // =====================================================================================================
  const C = DIAS.map(() => gauss());
  const JUSTO = {};
  PRODS.forEach(p => {
    const f = [1];
    for (let d = 1; d <= T; d++) f[d] = f[d - 1] * Math.exp(p.vol * (0.75 * C[d] + 0.65 * gauss()));
    if (p.id === "M2") f[T] = f[T - 1] * 1.062;    // choque de hoje em jan/27 (para haver um alerta de variação forte)
    const k = p.base / f[T - 1];
    JUSTO[p.id] = f.map(v => v * k);
  });
  const NEG = [], POR = {};
  let SEQ = 0, VER = 0;
  function addNeg(q) {
    const L = POR[q.sub + "|" + q.prod] || (POR[q.sub + "|" + q.prod] = []);
    q.dp = L.length ? q.p - L[L.length - 1].p : 0;  // tique sobre o negócio anterior do mesmo produto e submercado
    q.id = ++SEQ; NEG.push(q); L.push(q); VER++;
    return q;
  }
  (function gerarHistorico() {
    const brutos = [];
    PRODS.forEach(p => SUBS.forEach(s => {
      if (!s.prods.includes(p.id)) return;
      for (let d = 0; d <= T; d++) {
        let lam = p.lam * s.mult * (0.55 + 0.9 * RND());
        if (d === T) lam *= (SIM0 - ABRE) / (FECHA - ABRE);
        if (p.id === "A5" && d > T - 13) lam = 0;   // Cal 31 sem negócio nos últimos 12 dias úteis
        const qt = poisson(lam), fim = d === T ? SIM0 : FECHA;
        for (let j = 0; j < qt; j++) {
          const sec = Math.floor(ABRE + RND() * (fim - ABRE)), fr = (sec - ABRE) / (FECHA - ABRE);
          const ini = JUSTO[p.id][Math.max(0, d - 1)], fimJ = JUSTO[p.id][d];
          const justo = ini * (1 - fr) + fimJ * fr + s.spr;
          brutos.push({ d, s: sec, prod: p.id, sub: s.id, p: arred(justo * (1 + 0.0028 * gauss())), v: lote(p.id, RND) });
        }
      }
    }));
    brutos.sort((a, b) => a.d - b.d || a.s - b.s).forEach(addNeg);
  })();

  // =====================================================================================================
  // estatísticas por produto e submercado (refeitas só quando entra negócio novo: VER)
  // =====================================================================================================
  const CACHE = {};
  function est(sub, prod) {
    const k = sub + "|" + prod, c = CACHE[k];
    if (c && c.ver === VER) return c;
    const L = POR[k] || [], r = { ver: VER, sub, prod, ult: L[L.length - 1] || null, hoje: [], ant: null, n20: 0, mw20: 0, diasCom: 0, closes: [] };
    let dPrev = -1;
    for (let i = L.length - 1; i >= 0; i--) {
      const q = L[i];
      if (q.d === T) { r.hoje.push(q); continue; }
      if (!r.ant) r.ant = q;
      if (q.d >= T - 20) { r.n20++; r.mw20 += q.v; }
      if (q.d !== dPrev) { r.diasCom++; dPrev = q.d; }
    }
    r.hoje.reverse();
    const H = r.hoje;
    r.nHoje = H.length; r.mwHoje = H.reduce((a, q) => a + q.v, 0);
    r.vwap = H.length ? H.reduce((a, q) => a + q.p * q.v, 0) / r.mwHoje : null;
    r.max = H.length ? Math.max(...H.map(q => q.p)) : null; r.min = H.length ? Math.min(...H.map(q => q.p)) : null;
    r.abre = H.length ? H[0].p : null;
    r.fech = r.ant ? r.ant.p : null;
    r.var = H.length && r.fech != null ? r.ult.p - r.fech : null;
    r.varPct = r.var != null ? r.var / r.fech : null;
    r.diasSem = r.ult ? T - r.ult.d : null;
    if (r.ult && r.ult.d === T) r.diasCom++;
    // fechamento de cada um dos últimos 20 dias úteis com negócio (minigráfico)
    const porDia = {}; for (let i = L.length - 1; i >= 0 && L[i].d > T - 20; i--) if (porDia[L[i].d] == null) porDia[L[i].d] = L[i].p;
    r.closes = Object.keys(porDia).map(Number).sort((a, b) => a - b).map(d => porDia[d]);
    CACHE[k] = r; return r;
  }
  const negHoje = () => { const r = []; for (let i = NEG.length - 1; i >= 0 && NEG[i].d === T; i--) r.push(NEG[i]); return r; };  // mais novo primeiro
  const ultimoNeg = () => NEG[NEG.length - 1];
  const fmtVar = (r, curto) => r.var == null ? (r.ult ? `■ sem negócio hoje` : "■ sem negócio") : `${seta(r.var)} ${sn(r.var, 2)}${curto ? "" : ` (${sn(r.varPct * 100, 1)}%)`}`;
  const fmtVarPct = r => r.var == null ? "■ —" : `${seta(r.var)} ${sn(r.varPct * 100, 1)}%`;
  const quandoUlt = r => !r.ult ? "nunca" : r.ult.d === T ? hms(r.ult.s) : `${ddmm(DIAS[r.ult.d])} (há ${r.diasSem} ${r.diasSem === 1 ? "dia útil" : "dias úteis"})`;
  const FONTE = "Fonte prevista: BBCE (negócios registrados na plataforma). Aqui, dados FICTÍCIOS e simulados, só para visualizar.";

  // =====================================================================================================
  // tempo real simulado: um gerador e um relógio só; as vistas se inscrevem e saem quando somem da tela
  // =====================================================================================================
  const OUV = new Set();
  function ouvir(el, fn) { OUV.add({ el, fn }); }
  const RVIVO = Math.random;
  const JUSTO_VIVO = {};
  SUBS.forEach(s => s.prods.forEach(id => { JUSTO_VIVO[s.id + "|" + id] = JUSTO[id][T] + s.spr; }));
  const PESOS = SUBS.flatMap(s => s.prods.map(id => ({ sub: s.id, prod: id, w: PROD[id].lam * s.mult * (id === "A5" ? 0 : 1) })));
  const PESO_TOT = PESOS.reduce((a, x) => a + x.w, 0);
  let encerrado = false;
  function novoNegocio() {
    const sec = Math.floor(agoraS());
    if (sec >= FECHA) { encerrado = true; return null; }
    let alvo = RVIVO() * PESO_TOT, e = PESOS[0];
    for (const x of PESOS) { alvo -= x.w; if (alvo <= 0) { e = x; break; } }
    const k = e.sub + "|" + e.prod, pr = PROD[e.prod];
    JUSTO_VIVO[k] *= Math.exp(pr.vol * 0.05 * gauss(RVIVO));
    const L = POR[k] || [], ult = L.length ? L[L.length - 1].p : JUSTO_VIVO[k];
    const p = arred(ult + 0.3 * (JUSTO_VIVO[k] - ult) + JUSTO_VIVO[k] * 0.0016 * gauss(RVIVO));
    const u = ultimoNeg();
    return addNeg({ d: T, s: Math.max(sec, u && u.d === T ? u.s : 0), prod: e.prod, sub: e.sub, p, v: lote(e.prod, RVIVO), vivo: true });
  }
  function tique() {
    const q = novoNegocio();
    if (q) {
      OUV.forEach(o => { if (!o.el.isConnected) { OUV.delete(o); return; } try { o.fn(q); } catch (err) { console.error("MKT", err); } });
      atualizarCasca();
    }
    if (!encerrado) setTimeout(tique, 1000 + RVIVO() * 3000);
  }
  setTimeout(tique, 1500);

  // a casca (barra de funções, fita e linha da MESA) é montada uma vez pelo mesa.js; aqui só o texto muda,
  // no lugar, para a fita não recomeçar a correr a cada negócio
  function atualizarCasca() {
    const s = sinal(), ehMkt = a => a && a.textContent.trim().startsWith("MKT");
    const fa = document.querySelector('#m-fn a[data-cod="MKT"]'), fn = fa && fa.querySelector(".sn");
    if (fn) { fn.textContent = s.v; fn.className = "sn " + (s.tom || ""); }
    else if (fa && fa.title) fa.title = fa.title.replace(/ · .*$/, "") + " · " + s.v;   // barra compacta: o sinal fica na dica
    const itens = { MKT: { v: s.v, d: s.dnum } }; fita().forEach(f => { itens[f.r] = f; });
    document.querySelectorAll("[data-fita] .tk").forEach(tk => {
      const it = itens[(tk.querySelector(".tk-r") || {}).textContent]; if (!it) return;
      tk.querySelector(".tk-v").textContent = it.v;
      const d = tk.querySelector(".tk-d"); if (d && it.d != null) { d.textContent = `${seta(it.d)} ${sn(it.d, 2)}`; d.className = "tk-d num " + tom(it.d); }
    });
    document.querySelectorAll(".m-decisao-mesa > div").forEach(c => {
      if (!ehMkt(c.querySelector(".r"))) return;
      c.querySelector(".v").textContent = s.v;
      const d = c.querySelector(".d"); if (d) { d.textContent = s.d; d.className = "d " + s.tom; }
    });
    const u = ultimoNeg();
    document.querySelectorAll("[data-mkt-hora]").forEach(h => { h.textContent = encerrado ? "pregão encerrado" : hms(u.s); });
  }
  const aoVivo = () => `<span class="mkt-ao-vivo" title="Negócios simulados neste navegador; a fonte prevista é a BBCE"><i class="mkt-pulso" aria-hidden="true"></i>BBCE · simulado · último <b class="num" data-mkt-hora>${hms(ultimoNeg().s)}</b></span>`;

  // =====================================================================================================
  // preferências (mesa.mkt.*) e peças de tela
  // =====================================================================================================
  const INT = {
    "5m": { seg: 300, rot: "5 min", jan: [["1", "Hoje"], ["2", "2 dias"]] },
    "15m": { seg: 900, rot: "15 min", jan: [["1", "Hoje"], ["3", "3 dias"]] },
    "1h": { seg: 3600, rot: "1 h", jan: [["5", "5 dias"], ["10", "10 dias"]] },
    "D": { seg: null, rot: "dia", jan: [["20", "20 dias"], ["60", "60 dias"]] },
  };
  const PAD = { resInt: "5m", sub: "SE", prod: "M1", int: "5m", jan: "1", curSubs: "todos", curTab: "SE", negProd: "todos", negSub: "todos" };
  const EST = (() => { try { const v = JSON.parse(localStorage.getItem("mesa.mkt.telas")); return v && typeof v === "object" ? { ...PAD, ...v } : { ...PAD }; } catch (e) { return { ...PAD }; } })();
  const guardar = () => { try { localStorage.setItem("mesa.mkt.telas", JSON.stringify(EST)); } catch (e) { /* sem armazenamento: vale só nesta visita */ } };
  function validar() {
    if (!SUB[EST.sub]) EST.sub = "SE";
    if (!SUB[EST.sub].prods.includes(EST.prod)) EST.prod = "M1";
    if (!INT[EST.int]) EST.int = "5m";
    if (!INT[EST.int].jan.some(j => j[0] === EST.jan)) EST.jan = INT[EST.int].jan[0][0];
    if (!["todos", "SE"].includes(EST.curSubs)) EST.curSubs = "todos";
    if (!SUB[EST.curTab]) EST.curTab = "SE";
    if (EST.negProd !== "todos" && !PROD[EST.negProd]) EST.negProd = "todos";
    if (EST.negSub !== "todos" && !SUB[EST.negSub]) EST.negSub = "todos";
  }
  validar();

  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  function limpar(el) { if (typeof _obs !== "undefined" && _obs) el.querySelectorAll(".graf").forEach(c => _obs.unobserve(c)); el.replaceChildren(); }
  // gráfico de altura fixa, desenhado por grafico() na largura real; redesenhar(c) refaz sem mudar o tamanho
  function G(box, alt, desenhar, rotulo) {
    let c = null;
    c = grafico(box, (svg, W, H) => { c._wh = [W, H]; desenhar(svg, W, H); }, null, rotulo);
    c.style.height = alt + "px"; c._fn = desenhar; c._rot = rotulo;
    return c;
  }
  function redesenhar(c) {
    if (!c || !c.isConnected || !c._wh) return;
    if (c.matches(":hover")) { const d = document.getElementById("dica"); if (d) d.hidden = true; }
    const [W, H] = c._wh; c.replaceChildren();
    c._fn(S(c, "svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": c._rot || "Gráfico" }), W, H);
  }
  function abas(opc, atual, aoTrocar, rotulo) {
    const g = mk("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo || "Opções");
    opc.forEach(([v, t]) => { const b = mk("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(String(v) === String(atual))); g.append(b); });
    g.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); aoTrocar(b.dataset.v); });
    return g;
  }
  function pintarDecisao(d, itens) {
    d.innerHTML = itens.map(i => `<div class="${i.principal ? "principal" : ""}"><span class="r">${i.r}</span><span class="v num">${i.v}</span>${i.d != null ? `<span class="d ${i.tom || ""}">${i.d}</span>` : ""}</div>`).join("");
  }
  const pares = (el, lista) => QC.pares(el, lista.filter(Boolean));
  const nota = (el, t) => { const p = mk("p", "leg", t); el.append(p); return p; };

  // =====================================================================================================
  // candles: montagem por intervalo e desenho
  // =====================================================================================================
  /** candles de um produto: um espaço por intervalo do pregão (9h–18h) em cada dia útil da janela;
   *  espaço sem negócio fica vazio (null), sem candle inventado */
  function velas(sub, prod, int, ndias) {
    const seg = INT[int].seg, porDia = seg ? (FECHA - ABRE) / seg : 1, d0 = Math.max(0, T - ndias + 1);
    const slots = [], vs = [];
    for (let d = d0; d <= T; d++) for (let k = 0; k < porDia; k++) { slots.push({ d, k }); vs.push(null); }
    const L = POR[sub + "|" + prod] || [];
    for (let i = L.length - 1; i >= 0 && L[i].d >= d0; i--) {
      const q = L[i], k = seg ? Math.min(porDia - 1, Math.floor((q.s - ABRE) / seg)) : 0, ix = (q.d - d0) * porDia + k;
      let c = vs[ix];
      if (!c) c = vs[ix] = { o: q.p, h: q.p, l: q.p, c: q.p, v: 0, qt: 0, negs: [], d: q.d, k };
      c.o = q.p;                                    // percorre do mais novo ao mais velho: o último visto é a abertura
      c.h = Math.max(c.h, q.p); c.l = Math.min(c.l, q.p); c.v += q.v; c.qt++; c.negs.push(q);
    }
    vs.forEach(c => { if (c) { c.c = c.negs[0].p; c.negs.reverse(); } });
    return { slots, vs, porDia, d0, seg };
  }
  function rotSlot(V, i, int) {
    const sl = V.slots[i];
    if (!V.seg) return `${dataBr(DIAS[sl.d])} ${diaSem(DIAS[sl.d])}`;
    const a = ABRE + sl.k * V.seg;
    return `${ddmm(DIAS[sl.d])} ${hm(a)}–${hm(a + V.seg)}`;
  }
  /** desenha candles com volume embaixo. o = { sub, prod, int, ndias, compacto, sel: {d,k}, aoClicar(c, rotulo) } */
  function desenharVelas(svg, W, H, o) {
    const V = velas(o.sub, o.prod, o.int, o.ndias), r = est(o.sub, o.prod), cpt = !!o.compacto;
    const m = { l: cpt ? 4 : 8, r: cpt ? 48 : 62, t: 8, b: 18 };
    const hv = Math.round((H - m.t - m.b) * 0.2), yV1 = H - m.b, yV0 = yV1 - hv, yP1 = yV0 - 8;
    const N = V.slots.length, bw = (W - m.l - m.r) / N, xc = i => m.l + (i + 0.5) * bw;
    const cs = V.vs.filter(Boolean);
    // espaço do pregão que ainda não aconteceu (só nos intervalos intradiários, no dia de hoje)
    if (V.seg) {
      const iNow = (T - V.d0) * V.porDia + Math.floor((agoraS() - ABRE) / V.seg) + 1;
      if (iNow < N) {
        const x0 = m.l + iNow * bw;
        S(svg, "rect", { x: x0, y: m.t, width: W - m.r - x0, height: yV1 - m.t, fill: "var(--mkt-futuro)" });
        if (W - m.r - x0 > 70 && !cpt) S(svg, "text", { x: (x0 + W - m.r) / 2, y: m.t + 12, "text-anchor": "middle" }, encerrado ? "pregão encerrado" : "pregão até 18h");
      }
    }
    // rótulos do eixo de tempo e separadores de dia
    const postos = [], rotular = (x, t, forte) => { const lg = t.length * 6.4 + 8; if (postos.some(px => Math.abs(px - x) < lg)) return; postos.push(x); S(svg, "text", { x, y: H - 5, "text-anchor": "middle", class: forte ? "forte" : null }, t); };
    if (!V.seg) {
      V.slots.forEach((sl, i) => { if (i === 0 || DIAS[sl.d].slice(5, 7) !== DIAS[V.slots[i - 1].d].slice(5, 7)) rotular(xc(i), ddmm(DIAS[sl.d]), true); });
      const passoR = Math.max(1, Math.ceil(52 / bw));
      V.slots.forEach((sl, i) => { if ((N - 1 - i) % passoR === 0) rotular(xc(i), ddmm(DIAS[sl.d])); });
    } else {
      const multi = V.slots[0].d !== T;
      V.slots.forEach((sl, i) => {
        if (sl.k !== 0 || !multi) return;
        if (i > 0) S(svg, "line", { x1: m.l + i * bw, x2: m.l + i * bw, y1: m.t, y2: yV1, stroke: "var(--ink-3)", "stroke-dasharray": "2 3", opacity: 0.7 });
        rotular(m.l + i * bw + 18, ddmm(DIAS[sl.d]), true);
      });
      V.slots.forEach((sl, i) => { const a = ABRE + sl.k * V.seg; if (a % 3600 === 0 && (sl.k || !multi)) rotular(m.l + i * bw, hh(a)); });
    }
    if (!cs.length) {
      S(svg, "text", { x: (W - m.r + m.l) / 2, y: (m.t + yP1) / 2, "text-anchor": "middle", class: "forte" }, "Sem negócios nesta janela");
      if (r.ult) S(svg, "text", { x: (W - m.r + m.l) / 2, y: (m.t + yP1) / 2 + 16, "text-anchor": "middle" }, `último: ${rs(r.ult.p)} em ${ddmm(DIAS[r.ult.d])}${cpt ? "" : " · veja o intervalo Dia, 60 dias"}`);
      return;
    }
    const vals = cs.flatMap(c => [c.h, c.l]); if (r.ult) vals.push(r.ult.p);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max((hi - lo) * 0.08, hi * 0.003);
    const e = eixo(lo - pad, hi + pad, cpt ? 3 : H > 300 ? 6 : 4, true);
    const y = v => m.t + (yP1 - m.t) * (1 - (v - e.a) / (e.b - e.a));
    const casas = Math.max(0, Math.ceil(-Math.log10((e.t[1] - e.t[0]) || 1) - 1e-9));
    const yUlt = r.ult ? y(r.ult.p) : -1e9;
    e.t.forEach(t => { if (y(t) < m.t - 1 || y(t) > yP1 + 1) return; S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); if (Math.abs(y(t) - yUlt) > 13) S(svg, "text", { x: W - m.r + 6, y: y(t) + 3.5 }, n(t, casas)); });
    // seleção
    if (o.sel) { const i = V.slots.findIndex(sl => sl.d === o.sel.d && sl.k === o.sel.k); if (i >= 0) S(svg, "rect", { x: m.l + i * bw, y: m.t, width: Math.max(2, bw), height: yV1 - m.t, fill: "var(--mkt-sel)" }); }
    // volume
    const maxV = Math.max(...cs.map(c => c.v)), yv = v => yV1 - hv * v / maxV, bwB = Math.max(1, Math.min(14, bw * 0.68));
    S(svg, "line", { x1: m.l, x2: W - m.r, y1: yV1, y2: yV1, stroke: "var(--rule)" });
    if (!cpt) S(svg, "text", { x: W - m.r + 6, y: yV0 + 14 }, `${n(maxV)} MWm`);
    V.vs.forEach((c, i) => { if (c) S(svg, "rect", { x: xc(i) - bwB / 2, y: yv(c.v), width: bwB, height: Math.max(1, yV1 - yv(c.v)), fill: "var(--mkt-vol)" }); });
    // candles: alta vazada (contorno), baixa cheia, igual como traço; a cor acompanha, não decide sozinha
    V.vs.forEach((c, i) => {
      if (!c) return;
      const x = xc(i), cor = c.c > c.o ? "var(--sobe)" : c.c < c.o ? "var(--desce)" : "var(--ink-2)";
      S(svg, "line", { x1: x, x2: x, y1: y(c.h), y2: y(c.l), stroke: cor, "stroke-width": 1 });
      if (c.c === c.o) { S(svg, "line", { x1: x - bwB / 2, x2: x + bwB / 2, y1: y(c.c), y2: y(c.c), stroke: cor, "stroke-width": 1.6 }); return; }
      const yt = y(Math.max(c.o, c.c)), hb = Math.max(1, Math.abs(y(c.o) - y(c.c)));
      if (c.c > c.o && bwB >= 3) S(svg, "rect", { x: x - bwB / 2 + 0.5, y: yt, width: bwB - 1, height: hb, fill: "var(--surface)", stroke: cor, "stroke-width": 1 });
      else S(svg, "rect", { x: x - bwB / 2, y: yt, width: bwB, height: hb, fill: cor });
    });
    // último preço (âmbar se negociou hoje; cinza se é de outro dia)
    if (r.ult) {
      const yu = y(r.ult.p), hojeU = r.ult.d === T, cor = hojeU ? "var(--t-ambar)" : "var(--ink-3)";
      S(svg, "line", { x1: m.l, x2: W - m.r, y1: yu, y2: yu, stroke: cor, "stroke-dasharray": "3 3", "stroke-width": 1 });
      S(svg, "rect", { x: W - m.r + 1, y: yu - 8, width: m.r - 1, height: 16, fill: cor });
      S(svg, "text", { x: W - m.r + 5, y: yu + 3.5, fill: "var(--t-sobre)", "font-weight": 600, style: "fill: var(--t-sobre)" }, n(r.ult.p, 2));
    }
    // alvos de tooltip e clique
    V.vs.forEach((c, i) => {
      if (!c) return;
      const a = S(svg, "rect", { x: m.l + i * bw, y: m.t, width: Math.max(2, bw), height: yV1 - m.t, fill: "transparent", class: "mkt-alvo" });
      const rt = rotSlot(V, i), forma = c.c > c.o ? "▲ alta" : c.c < c.o ? "▼ baixa" : "■ estável";
      const formando = V.seg && c.d === T && i === (T - V.d0) * V.porDia + Math.floor((agoraS() - ABRE) / V.seg);
      dicaEm(a, `<b>${nomeP(o.sub, o.prod)} · ${rt}</b>${formando ? " · em formação" : ""}<br>Abertura ${n(c.o, 2)} · Máxima ${n(c.h, 2)}<br>Mínima ${n(c.l, 2)} · Fechamento ${n(c.c, 2)}<br>${forma} ${sn(c.c - c.o, 2)} · ${fmtMW(c.v)} MWm · ${c.qt} ${c.qt === 1 ? "negócio" : "negócios"}`);
      if (o.aoClicar) a.addEventListener("click", () => o.aoClicar(c, rt));
    });
  }

  // =====================================================================================================
  // inspetor: candle e produto
  // =====================================================================================================
  function inspVela(sub, prod, int, c, rt) {
    Mesa.inspecionar(`${nomeP(sub, prod)} · ${INT[int].rot}`, el => {
      el.insertAdjacentHTML("beforeend", `<h3>${rt}</h3>`);
      const vw = c.negs.reduce((a, q) => a + q.p * q.v, 0) / c.v;
      pares(el, [["Abertura", rs(c.o)], ["Máxima", rs(c.h)], ["Mínima", rs(c.l)], ["Fechamento", rs(c.c)],
        ["Variação no candle", `<span class="${tom(c.c - c.o)}">${seta(c.c - c.o)} ${srs(c.c - c.o)}</span>`], ["Amplitude", rs(c.h - c.l)],
        ["Volume", `${fmtMW(c.v)} MWm`], ["Negócios", n(c.qt)], ["Preço médio ponderado", rs(vw)]]);
      el.insertAdjacentHTML("beforeend", `<h3>Negócios do candle</h3>`);
      QC.tabela(el, [{ t: "Data e hora" }, { t: "Preço", n: true }, { t: "MWm", n: true }],
        c.negs.slice(-40).reverse().map(q => [`${ddmm(DIAS[q.d])} ${hms(q.s)}`, n(q.p, 2), fmtMW(q.v)]), "densa");
      if (c.negs.length > 40) nota(el, `Mostrando os 40 mais recentes de ${c.negs.length}.`);
      nota(el, `Instantâneo às ${hms(ultimoNeg().s)}. BBCE · simulado: negócios fictícios.`);
    });
  }
  function inspProd(sub, prod) {
    return el => {
      const p = PROD[prod], r = est(sub, prod);
      pares(el, [["Produto", `${p.tipo} · ${p.h}`], ["Entrega", p.ent], ["Submercado", SUB[sub].nome],
        ["Último", r.ult ? `${rs(r.ult.p)} · ${quandoUlt(r)}` : "—"], ["Fech. anterior", r.ant ? `${rs(r.fech)} · ${ddmm(DIAS[r.ant.d])}` : "—"],
        ["Variação do dia", `<span class="${tom(r.var || 0)}">${fmtVar(r)}</span>`],
        r.nHoje ? ["Faixa de hoje", `${n(r.min, 2)} a ${n(r.max, 2)}`] : null, r.nHoje ? ["Médio ponderado hoje", rs(r.vwap)] : null,
        ["Negócios hoje", `${n(r.nHoje)} · ${fmtMW(r.mwHoje)} MWm`], ["Negócios em 20 dias", `${n(r.n20)} · ${n(r.n20 / 20, 1)} por dia`],
        ["Dias com negócio (61)", n(r.diasCom)]]);
      if (r.n20 < 20) nota(el, `<b>Pouco líquido:</b> ${r.n20} negócios nos 20 dias úteis anteriores. O último preço pode estar velho e um negócio só move o candle; leia com a data do último negócio.`);
      el.insertAdjacentHTML("beforeend", "<h3>Candles diários · 20 dias</h3>");
      G(el, 150, (svg, W, H) => desenharVelas(svg, W, H, { sub, prod, int: "D", ndias: 20, compacto: true }), `${nomeP(sub, prod)}: candles diários de 20 dias`);
      const outros = SUBS.filter(s => s.prods.includes(prod));
      if (outros.length > 1) {
        el.insertAdjacentHTML("beforeend", "<h3>Por submercado</h3>");
        const rse = est("SE", prod);
        QC.tabela(el, [{ t: "Sub." }, { t: "Último", n: true }, { t: "− SE", n: true }, { t: "Neg. hoje", n: true }],
          outros.map(s => { const x = est(s.id, prod); return [s.rot, x.ult ? n(x.ult.p, 2) : "—", s.id === "SE" || !x.ult || !rse.ult ? "—" : sn(x.ult.p - rse.ult.p, 2), n(x.nHoje)]; }), "densa");
      }
      nota(el, "BBCE · simulado: negócios fictícios.");
    };
  }

  // =====================================================================================================
  // tela 1 · CAN Candles
  // =====================================================================================================
  function itensCan() {
    const a = est("SE", "M1"), b = est("SE", "A1"), u = ultimoNeg(), H = negHoje();
    return [
      { r: "SE dez/26 · M+1 · último", v: a.ult ? rs(a.ult.p) : "—", d: `${fmtVar(a)} · ${quandoUlt(a)}`, tom: tom(a.var || 0), principal: true },
      { r: "SE Cal 27 · A+1", v: b.ult ? rs(b.ult.p) : "—", d: `${fmtVar(b)} · ${n(b.nHoje)} negócios`, tom: tom(b.var || 0) },
      { r: "Último negócio", v: hms(u.s), d: `${nomeP(u.sub, u.prod)} · ${rs(u.p)} · ${fmtMW(u.v)} MWm` },
      { r: "Hoje · todos os produtos", v: `${n(H.length)} neg.`, d: `${n(H.reduce((x, q) => x + q.v, 0))} MWm · BBCE · simulado` },
    ];
  }
  function montarCan(area) {
    validar();
    const refazer = () => { guardar(); limpar(area); montarCan(area); };
    const dec = Mesa.decisao(area, itensCan());
    const g = Mesa.grade(area), sub = EST.sub, prod = EST.prod, p = PROD[prod];
    const pc = Mesa.painel(g, { cod: "MKT-1", titulo: `${nomeP(sub, prod)} · ${p.tipo} ${p.h} · candles de ${INT[EST.int].rot}`, unidade: "R$/MWh · volume em MWm", tam: "xl", ajuda: "candles",
      leg: "Candle vazado: fechou acima da abertura (▲); cheio: abaixo (▼); traço: abertura igual ao fechamento (ou um negócio só). Intervalo sem negócio fica sem candle. Faixa clara: parte do pregão que ainda não aconteceu. Linha âmbar: último preço. Clique num candle para o detalhe.",
      fonte: FONTE });
    const barra = mk("div", "mkt-barra");
    const gi = mk("span", "mkt-barra-g", '<span class="mkt-barra-r">Intervalo</span>');
    gi.append(abas(Object.entries(INT).map(([k, v]) => [k, v.rot]), EST.int, v => { EST.int = v; EST.jan = INT[v].jan[0][0]; refazer(); }, "Intervalo do candle"));
    const gj = mk("span", "mkt-barra-g", '<span class="mkt-barra-r">Janela</span>');
    gj.append(abas(INT[EST.int].jan, EST.jan, v => { EST.jan = v; refazer(); }, "Janela do gráfico"));
    barra.append(gi, gj); barra.insertAdjacentHTML("beforeend", aoVivo());
    pc.corpo.append(barra);
    const info = mk("div", "mkt-info num"); pc.corpo.append(info);
    let sel = null;
    const caixa = G(pc.corpo, 400, (svg, W, H) => desenharVelas(svg, W, H, { sub, prod, int: EST.int, ndias: +EST.jan, sel,
      aoClicar: (c, rt) => { sel = { d: c.d, k: c.k }; redesenhar(caixa); inspVela(sub, prod, EST.int, c, rt); } }), `${nomeP(sub, prod)}: candles de ${INT[EST.int].rot}`);
    const pintarInfo = () => {
      const r = est(sub, prod);
      info.innerHTML = r.nHoje
        ? `<span>Hoje</span> Abertura <b>${n(r.abre, 2)}</b> · Máx. <b>${n(r.max, 2)}</b> · Mín. <b>${n(r.min, 2)}</b> · Último <b>${n(r.ult.p, 2)}</b> <b class="${tom(r.var)}">${fmtVar(r)}</b> · ${fmtMW(r.mwHoje)} MWm · ${r.nHoje} negócios`
        : `<span>Hoje</span> sem negócio · último ${r.ult ? `${rs(r.ult.p)} em ${quandoUlt(r)}` : "—"} · ${r.n20} negócios em 20 dias úteis`;
    };
    pintarInfo();

    // lista de produtos que troca o gráfico
    const pl = Mesa.painel(g, { cod: "MKT-2", titulo: "Produtos", unidade: "hoje · R$/MWh", tam: "s", ajuda: "produtos",
      leg: "Var.: último de hoje contra o fechamento do dia útil anterior com negócio. 20 d: fechamentos dos dias com negócio. Clique para trocar o gráfico e ver o produto no inspetor." });
    pl.acoes.prepend(abas(SUBS.map(s => [s.id, s.rot]), sub, v => { EST.sub = v; refazer(); }, "Submercado"));
    const caixaT = mk("div", "rolagem"); pl.corpo.append(caixaT);
    const pintarLista = () => {
      const t = mk("table", "densa mkt-tab mkt-lista");
      t.innerHTML = `<thead><tr><th>Produto</th><th class="n">Último</th><th class="n">Var.</th><th class="n">MWm</th><th class="n">Neg.</th><th>20 d</th></tr></thead>`;
      const tb = mk("tbody"); t.append(tb);
      let gAtual = -1;
      SUB[sub].prods.forEach(id => {
        const q = PROD[id], r = est(sub, id);
        if (q.grupo !== gAtual) { gAtual = q.grupo; tb.append(mk("tr", "mkt-grupo", `<td colspan="6">${GRUPOS[q.grupo]}</td>`)); }
        const tr = mk("tr", "mkt-prod" + (id === prod ? " mkt-sel-linha" : ""));
        tr.innerHTML = `<td><b>${q.rot}</b> <span class="mkt-h">${q.h}</span></td><td class="n">${r.ult ? n(r.ult.p, 2) : "—"}${r.ult && r.ult.d !== T ? `<span class="mkt-velho" title="último negócio em ${ddmm(DIAS[r.ult.d])}">${ddmm(DIAS[r.ult.d])}</span>` : ""}</td>` +
          `<td class="n ${tom(r.var || 0)}">${fmtVarPct(r)}</td><td class="n">${r.nHoje ? fmtMW(r.mwHoje) : "—"}</td><td class="n">${n(r.nHoje)}</td><td class="mkt-spark"></td>`;
        if (r.closes.length >= 2) sparkline(tr.lastChild, r.closes, "var(--ink-2)"); else tr.lastChild.innerHTML = `<span class="mkt-h">${r.closes.length ? "1 dia" : "sem neg."}</span>`;
        if (id === prod) tr.setAttribute("aria-current", "true");
        Mesa.alvo(tr, () => `${nomeP(sub, id)} · ${q.tipo} ${q.h}`, inspProd(sub, id));
        tr.addEventListener("click", () => { if (id !== EST.prod) { EST.prod = id; refazer(); Mesa.inspecionar(`${nomeP(sub, id)} · ${q.tipo} ${q.h}`, inspProd(sub, id)); } });
        tb.append(tr);
      });
      caixaT.replaceChildren(t);
    };
    pintarLista();
    ouvir(pc.el, q => {
      pintarDecisao(dec, itensCan());
      pintarLista(); pintarInfo();
      if (q.sub === sub && q.prod === prod) redesenhar(caixa);
    });
  }

  // =====================================================================================================
  // tela 2 · CUR Curva
  // =====================================================================================================
  function itensCur() {
    const a1 = est("SE", "A1"), a2 = est("SE", "A2"), m1 = est("SE", "M1"), ne = est("NE", "M1");
    const semHoje = PRODS.filter(p => !est("SE", p.id).nHoje).length;
    return [
      { r: "SE Cal 27 · A+1", v: a1.ult ? rs(a1.ult.p) : "—", d: `${fmtVar(a1)} · ${n(a1.n20)} negócios em 20 d`, tom: tom(a1.var || 0), principal: true },
      { r: "Cal 28 − Cal 27 · SE", v: a1.ult && a2.ult ? srs(a2.ult.p - a1.ult.p) : "—", d: `inclinação da curva · Cal 28 ${quandoUlt(a2)}` },
      { r: "Spread NE − SE · dez/26", v: m1.ult && ne.ult ? srs(ne.ult.p - m1.ult.p) : "—", d: `NE ${ne.ult ? n(ne.ult.p, 2) : "—"} · ${n(ne.nHoje)} negócios hoje` },
      { r: "Produtos SE sem negócio hoje", v: `${semHoje} de ${PRODS.length}`, d: "BBCE · simulado · último negócio mostra a data" },
    ];
  }
  function desenharCurva(svg, W, H, subs, aoClicar) {
    const m = { l: 46, r: 12, t: 22, b: 40 }, N = PRODS.length, cw = (W - m.l - m.r) / N, xc = i => m.l + (i + 0.5) * cw;
    const DX = { SE: 0, S: -0.26, NE: 0.22, N: 0.36 };
    const vals = [];
    subs.forEach(s => PRODS.forEach(p => { const r = est(s, p.id); if (r.ult) vals.push(r.ult.p); if (r.fech != null) vals.push(r.fech); if (r.nHoje) vals.push(r.max, r.min); }));
    const e = eixo(Math.min(...vals) - 4, Math.max(...vals) + 4, 5);
    const y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    e.t.forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
    // grupos (meses, trimestres e semestre, anos)
    [0, 1, 2].forEach(gk => {
      const is = PRODS.map((p, i) => (p.grupo === gk ? i : -1)).filter(i => i >= 0), x0 = m.l + is[0] * cw, x1 = m.l + (is[is.length - 1] + 1) * cw;
      if (gk) S(svg, "line", { x1: x0, x2: x0, y1: m.t - 14, y2: H - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "2 3" });
      if (x1 - x0 > GRUPOS[gk].length * 6.4) S(svg, "text", { x: x0 + 4, y: m.t - 8, class: "forte" }, GRUPOS[gk]);
    });
    PRODS.forEach((p, i) => { S(svg, "text", { x: xc(i), y: H - 22, "text-anchor": "middle", class: "forte" }, p.rot); S(svg, "text", { x: xc(i), y: H - 9, "text-anchor": "middle" }, p.h); });
    subs.slice().reverse().forEach(sid => {
      const s = SUB[sid], dx = DX[sid] * cw * (subs.length > 1 ? 1 : 0), ehSE = sid === "SE";
      // linha do SE dentro de cada grupo
      if (ehSE) [0, 1, 2].forEach(gk => {
        const pts = PRODS.map((p, i) => ({ p, i, r: est(sid, p.id) })).filter(x => x.p.grupo === gk && x.r.ult).map(x => `${xc(x.i)},${y(x.r.ult.p)}`);
        if (pts.length > 1) S(svg, "polyline", { points: pts.join(" "), fill: "none", stroke: s.cor, "stroke-width": 1.6, opacity: 0.8 });
      });
      PRODS.forEach((p, i) => {
        if (!s.prods.includes(p.id)) return;
        const r = est(sid, p.id); if (!r.ult) return;
        const x = xc(i) + dx;
        if (r.nHoje > 1) S(svg, "line", { x1: x, x2: x, y1: y(r.max), y2: y(r.min), stroke: s.cor, "stroke-width": ehSE ? 2 : 1.4, opacity: 0.55 });
        if (r.fech != null) S(svg, "line", { x1: x - 6, x2: x + 6, y1: y(r.fech), y2: y(r.fech), stroke: "var(--ink-2)", "stroke-width": 1.4 });
        const hojeU = r.ult.d === T;
        S(svg, "circle", { cx: x, cy: y(r.ult.p), r: ehSE ? 4.5 : 3.5, fill: hojeU ? s.cor : "var(--surface)", stroke: s.cor, "stroke-width": 1.6 });
      });
    });
    // tooltip e clique por produto (coluna inteira)
    PRODS.forEach((p, i) => {
      const a = S(svg, "rect", { x: m.l + i * cw, y: m.t - 14, width: cw, height: H - m.b - m.t + 14, fill: "transparent", class: "mkt-alvo" });
      dicaEm(a, () => `<b>${p.rot} · ${p.tipo} ${p.h}</b>` + subs.filter(sid => SUB[sid].prods.includes(p.id)).map(sid => { const r = est(sid, p.id);
        return `<span class="dica-l"><i style="background:${SUB[sid].cor}"></i>${sid}: <b>${r.ult ? n(r.ult.p, 2) : "—"}</b> ${r.var != null ? `${seta(r.var)} ${sn(r.var, 2)}` : `· ${quandoUlt(r)}`} · ${r.nHoje} hoje · ${r.n20} em 20 d</span>`; }).join(""));
      a.addEventListener("click", () => aoClicar(p.id));
    });
  }
  function montarCur(area) {
    validar();
    const refazer = () => { guardar(); limpar(area); montarCur(area); };
    const dec = Mesa.decisao(area, itensCur());
    const g = Mesa.grade(area);
    const subs = EST.curSubs === "SE" ? ["SE"] : SUBS.map(s => s.id);
    const pc = Mesa.painel(g, { cod: "MKT-3", titulo: "Curva forward por produto · último negócio", unidade: "R$/MWh", tam: "xl", ajuda: "curva", fonte: FONTE,
      leg: "Ponto cheio: negociado hoje; vazado: o último negócio é de outro dia (preço velho). Traço cinza: fechamento anterior. Barra vertical: faixa de hoje (mínima a máxima). Meses, trimestres e anos são produtos diferentes e se sobrepõem na entrega: não são uma série contínua." });
    pc.acoes.prepend(abas([["todos", "Todos os submercados"], ["SE", "Só SE"]], EST.curSubs, v => { EST.curSubs = v; refazer(); }, "Submercados no gráfico"));
    const barra = mk("div", "mkt-barra");
    barra.insertAdjacentHTML("beforeend", QC.legenda(subs.map(s => [SUB[s].cor, SUB[s].rot])) + aoVivo());
    pc.corpo.append(barra);
    const abrir = id => { const q = PROD[id]; Mesa.inspecionar(`SE ${q.rot} · ${q.tipo} ${q.h}`, inspProd("SE", id)); };
    const caixa = G(pc.corpo, 330, (svg, W, H) => desenharCurva(svg, W, H, subs, abrir), "Curva forward por produto e submercado");

    // liquidez por produto: negócios em 20 dias úteis e hoje (SE)
    const pq = Mesa.painel(g, { cod: "MKT-4", titulo: "Liquidez por produto · SE", unidade: "negócios", tam: "s", ajuda: "liquidez",
      leg: "Barra: negócios nos 20 dias úteis anteriores (escala raiz, para os prazos longos aparecerem). Número à direita: negócios hoje. Barra cinza: menos de 1 negócio por dia, preço indicativo." });
    const lq = mk("div", "mkt-liq"); pq.corpo.append(lq);
    const pintarLiq = () => {
      const mx = Math.sqrt(Math.max(...PRODS.map(p => est("SE", p.id).n20)) || 1);
      lq.innerHTML = PRODS.map(p => { const r = est("SE", p.id), w = Math.sqrt(r.n20) / mx * 100, pouco = r.n20 < 20;
        return `<div class="mkt-liq-l${pouco ? " pouco" : ""}" data-id="${p.id}"><span class="mkt-liq-r">${p.rot}</span><span class="mkt-liq-b"><i style="width:${w.toFixed(1)}%"></i><b class="num">${n(r.n20)}</b></span><span class="num mkt-liq-h" title="negócios hoje">${n(r.nHoje)}</span></div>`; }).join("") +
        `<div class="mkt-liq-l mkt-liq-cab"><span></span><span>20 dias úteis · ${n(PRODS.reduce((a, p) => a + est("SE", p.id).n20, 0))} no total</span><span>hoje</span></div>`;
      lq.querySelectorAll(".mkt-liq-l[data-id]").forEach(l => Mesa.alvo(l, () => `SE ${PROD[l.dataset.id].rot} · ${PROD[l.dataset.id].tipo} ${PROD[l.dataset.id].h}`, inspProd("SE", l.dataset.id)));
    };
    pintarLiq();

    // tabela por produto do submercado escolhido, com os outros submercados ao lado
    const pt = Mesa.painel(g, { cod: "MKT-5", titulo: "Produtos por submercado", unidade: "R$/MWh", tam: "full", ajuda: "curva",
      leg: "Fech. anterior: último negócio do dia útil anterior com negócio (pode ser de vários dias atrás). Outros submercados: último e diferença para o SE no mesmo produto. Clique numa linha para o detalhe (entrega, faixa do dia, candles diários)." });
    pt.acoes.prepend(abas(SUBS.map(s => [s.id, s.rot]), EST.curTab, v => { EST.curTab = v; guardar(); pintarTab(); }, "Submercado da tabela"));
    const caixaT = mk("div", "rolagem"); pt.corpo.append(caixaT);
    const pintarTab = () => {
      const sid = EST.curTab, outros = SUBS.filter(s => s.id !== sid);
      const t = mk("table", "densa mkt-tab");
      t.innerHTML = `<thead><tr><th>Produto</th><th class="n">Último</th><th class="n">Fech. ant.</th><th class="n">Var.</th><th class="n">Neg. hoje</th><th class="n">Neg. 20 d</th><th class="n">MWm 20 d</th><th>Último negócio</th>${outros.map(s => `<th class="n">${s.rot} (− ${sid})</th>`).join("")}</tr></thead>`;
      const tb = mk("tbody"); t.append(tb);
      SUB[sid].prods.forEach(id => {
        const q = PROD[id], r = est(sid, id), tr = mk("tr");
        tr.innerHTML = `<td><b>${q.rot}</b> <span class="mkt-h">${q.tipo} ${q.h}</span></td><td class="n">${r.ult ? n(r.ult.p, 2) : "—"}</td><td class="n">${r.fech != null ? n(r.fech, 2) : "—"}</td>` +
          `<td class="n ${tom(r.var || 0)}">${r.var == null ? "■ —" : `${seta(r.var)} ${sn(r.var, 2)}`}</td><td class="n">${n(r.nHoje)}</td><td class="n">${n(r.n20)}</td><td class="n">${fmtMW(r.mw20)}</td><td>${quandoUlt(r)}</td>` +
          outros.map(s => { if (!s.prods.includes(id)) return `<td class="n mkt-h">não negocia</td>`; const x = est(s.id, id); return `<td class="n">${x.ult ? `${n(x.ult.p, 2)} <span class="mkt-h">${r.ult ? sn(x.ult.p - r.ult.p, 2) : ""}</span>` : "—"}</td>`; }).join("");
        Mesa.alvo(tr, `${nomeP(sid, id)} · ${q.tipo} ${q.h}`, inspProd(sid, id));
        tb.append(tr);
      });
      caixaT.replaceChildren(t);
    };
    pintarTab();
    ouvir(pc.el, () => { pintarDecisao(dec, itensCur()); redesenhar(caixa); pintarLiq(); pintarTab(); });
  }

  // =====================================================================================================
  // tela 3 · NEG Negócios
  // =====================================================================================================
  function itensNeg() {
    const H = negHoje(), u = ultimoNeg(), cont = {};
    H.forEach(q => { const k = q.sub + "|" + q.prod; cont[k] = (cont[k] || 0) + 1; });
    const top = Object.entries(cont).sort((a, b) => b[1] - a[1])[0] || ["SE|M1", 0], [ts, tp] = top[0].split("|");
    return [
      { r: "Negócios hoje · todos", v: n(H.length), d: `${n(H.reduce((a, q) => a + q.v, 0))} MWm · desde 09:00`, principal: true },
      { r: "Último negócio", v: hms(u.s), d: `${nomeP(u.sub, u.prod)} · ${rs(u.p)} · ${fmtMW(u.v)} MWm` },
      { r: "Mais negociado hoje", v: nomeP(ts, tp), d: `${top[1]} negócios` },
      { r: "Fora do SE hoje", v: `${n(H.filter(q => q.sub !== "SE").length)} neg.`, d: SUBS.filter(s => s.id !== "SE").map(s => `${s.rot} ${H.filter(q => q.sub === s.id).length}`).join(" · ") },
    ];
  }
  function montarNeg(area) {
    validar();
    const dec = Mesa.decisao(area, itensNeg());
    const g = Mesa.grade(area);
    const pf = Mesa.painel(g, { cod: "MKT-6", titulo: "Fita de negócios de hoje", unidade: "R$/MWh · MWm", tam: "xl", ajuda: "negocios", fonte: FONTE,
      leg: "Mais novo em cima; os que acabam de entrar piscam. Tique: ▲▼ contra o negócio anterior do mesmo produto e submercado (■ igual). Mostra até 300 linhas." });
    const barra = mk("div", "mkt-barra");
    const sel = mk("select", "mkt-sel"); sel.setAttribute("aria-label", "Produto");
    sel.innerHTML = `<option value="todos">Todos os produtos</option>` + PRODS.map(p => `<option value="${p.id}"${p.id === EST.negProd ? " selected" : ""}>${p.rot} · ${p.h}</option>`).join("");
    sel.addEventListener("change", () => { EST.negProd = sel.value; guardar(); pintarFita(); });
    const gp = mk("span", "mkt-barra-g", '<span class="mkt-barra-r">Produto</span>'); gp.append(sel);
    const gs = mk("span", "mkt-barra-g", '<span class="mkt-barra-r">Submercado</span>');
    gs.append(abas([["todos", "Todos"], ...SUBS.map(s => [s.id, s.rot])], EST.negSub, v => { EST.negSub = v; guardar(); pintarFita(); }, "Submercado"));
    barra.append(gp, gs); barra.insertAdjacentHTML("beforeend", aoVivo());
    pf.corpo.append(barra);
    const cont = mk("p", "leg mkt-cont"); pf.corpo.append(cont);
    const box = mk("div", "mkt-fita rolagem"); pf.corpo.append(box);
    const t = mk("table", "densa mkt-tab");
    t.innerHTML = `<thead><tr><th>Hora</th><th>Produto</th><th>Sub.</th><th class="n">Preço</th><th class="n">Tique</th><th class="n">MWm</th><th class="n">Var. do dia</th></tr></thead>`;
    const tb = mk("tbody"); t.append(tb); box.append(t);
    const passa = q => (EST.negProd === "todos" || q.prod === EST.negProd) && (EST.negSub === "todos" || q.sub === EST.negSub);
    const linha = (q, novo) => {
      const r = est(q.sub, q.prod), tr = mk("tr", novo ? "mkt-novo" : "");
      const vd = r.fech != null ? q.p - r.fech : null;
      tr.innerHTML = `<td class="num">${hms(q.s)}</td><td><b>${PROD[q.prod].rot}</b> <span class="mkt-h">${PROD[q.prod].h}</span></td><td><span class="mkt-sub" style="--c:${SUB[q.sub].cor}">${q.sub}</span></td>` +
        `<td class="n"><b>${n(q.p, 2)}</b></td><td class="n ${tom(q.dp)}">${seta(q.dp)} ${q.dp ? sn(q.dp, 2) : ""}</td><td class="n">${fmtMW(q.v)}</td><td class="n ${tom(vd || 0)}">${vd == null ? "—" : `${seta(vd)} ${sn(vd / r.fech * 100, 1)}%`}</td>`;
      Mesa.alvo(tr, `${nomeP(q.sub, q.prod)} · negócio das ${hms(q.s)}`, el => {
        pares(el, [["Hora", `${dataBr(HOJE)} ${hms(q.s)}`], ["Produto", `${PROD[q.prod].tipo} ${PROD[q.prod].h} · ${PROD[q.prod].ent}`], ["Submercado", SUB[q.sub].nome],
          ["Preço", rs(q.p)], ["Volume", `${fmtMW(q.v)} MWm`], ["Tique", `<span class="${tom(q.dp)}">${seta(q.dp)} ${srs(q.dp)}</span>`], ["Contra o fech. anterior", vd == null ? "—" : `<span class="${tom(vd)}">${seta(vd)} ${srs(vd)}</span>`]]);
        el.insertAdjacentHTML("beforeend", "<h3>O produto</h3>"); inspProd(q.sub, q.prod)(el);
      });
      return tr;
    };
    const contar = () => { const H = negHoje(), f = H.filter(passa); cont.textContent = `${n(f.length)} de ${n(H.length)} negócios de hoje no filtro · ${n(f.reduce((a, q) => a + q.v, 0))} MWm`; };
    function pintarFita() { tb.replaceChildren(...negHoje().filter(passa).slice(0, 300).map(q => linha(q, false))); contar(); }
    pintarFita();

    // hoje por produto e negócios por hora
    const ph = Mesa.painel(g, { cod: "MKT-7", titulo: "Hoje por produto · SE", unidade: "R$/MWh · MWm", tam: "s", ajuda: "negocios",
      leg: "Médio: preço médio ponderado pelo volume. Barras: negócios por hora de hoje, todos os produtos e submercados." });
    const caixaH = mk("div", "rolagem"); ph.corpo.append(caixaH);
    const caixaB = mk("div"); ph.corpo.append(caixaB);
    const pintarHoje = () => {
      const tt = mk("table", "densa mkt-tab");
      tt.innerHTML = `<thead><tr><th>Produto</th><th class="n">Neg.</th><th class="n">MWm</th><th class="n">Médio</th></tr></thead><tbody>${PRODS.map(p => { const r = est("SE", p.id);
        return `<tr><td><b>${p.rot}</b></td><td class="n">${n(r.nHoje)}</td><td class="n">${r.nHoje ? fmtMW(r.mwHoje) : "—"}</td><td class="n">${r.vwap != null ? n(r.vwap, 2) : "—"}</td></tr>`; }).join("")}</tbody>`;
      caixaH.replaceChildren(tt);
    };
    pintarHoje();
    const horas = [...Array(9).keys()].map(i => 9 + i);
    const cb = G(caixaB, 150, (svg, W, H) => {
      const Hj = negHoje(), v = horas.map(h => Hj.filter(q => Math.floor(q.s / 3600) === h).length);
      barras(svg, W, H, { cats: horas.map(h => `${h}h`), series: [{ nome: "Negócios", v, cor: "color-mix(in srgb, var(--accent) 70%, transparent)" }], fmt: x => n(x) });
    }, "Negócios por hora hoje");
    ouvir(pf.el, q => {
      pintarDecisao(dec, itensNeg());
      if (passa(q)) { tb.prepend(linha(q, true)); while (tb.children.length > 300) tb.lastChild.remove(); }
      contar(); pintarHoje(); redesenhar(cb);
    });
  }

  // =====================================================================================================
  // tela 4 · MET Fonte e método
  // =====================================================================================================
  const SECOES = [
    { id: "simulado", titulo: "Dados simulados", html: `<p><b>Ainda não há dados de mercado neste laboratório.</b> Tudo o que a função MKT mostra é fictício: o histórico (60 dias úteis, de ${dataBr(DIAS[0])} a ${dataBr(DIAS[T - 1])}, e o pregão de hoje, ${dataBr(HOJE)}, até 14:30) é gerado com semente fixa, e um gerador cria um negócio novo a cada 1 a 4 segundos enquanto a página está aberta, com o relógio do pregão andando a partir das 14:30. Os preços não são cotações e não servem para decisão.</p>
      <p>Toda vista mostra <b>BBCE · simulado</b> e a hora do último negócio. Recarregar a página volta o pregão às 14:30 com o mesmo histórico; os negócios ao vivo são outros a cada vez.</p>
      <p>O dia de referência das telas da mesa é ${dataBr(HOJE)} (domingo e feriado no calendário real); no laboratório ele é tratado como dia de pregão para casar com as outras funções.</p>` },
    { id: "produtos", titulo: "Produtos", html: `<p>O mercado livre negocia energia por <b>produto</b>: um período de entrega (mês, trimestre, semestre ou ano), num submercado, em MWm (megawatt médio, a energia entregue por igual em todas as horas do período), a um preço em R$/MWh.</p>
      <ul><li><b>Mês</b> (M+1, M+2, M+3): dez/26, jan/27, fev/27. O M+1 do SE é o produto mais líquido e a referência de preço da mesa.</li>
      <li><b>Trimestre</b> (1T27, 2T27) e <b>semestre</b> (2S27): blocos de meses; o trimestre se sobrepõe aos meses que contém.</li>
      <li><b>Ano</b> (Cal 27 a Cal 31, A+1 a A+5): o Cal 27 é o segundo mais negociado; do A+2 em diante há poucos negócios e, nos anos mais longos, dias e semanas sem nenhum.</li></ul>
      <p>O <b>SE (Sudeste/Centro-Oeste)</b> é o submercado de referência. S, NE e N negociam os mesmos produtos com bem menos negócios, e só alguns prazos.</p>` },
    { id: "fonte", titulo: "De onde vem o preço", html: `<p>A fonte prevista é a <b>BBCE</b> (Balcão Brasileiro de Comercialização de Energia): cada negócio fechado na plataforma tem hora, produto, submercado, preço e volume. As telas usam só negócios fechados, não ofertas de compra e venda.</p>
      <p>Pendências para o dado real: confirmar o formato e a frequência da integração (negócio a negócio ou instantâneos), os nomes dos produtos na BBCE, o horário do pregão e qual referência de fechamento usar (último negócio, médio ponderado do dia ou a curva de referência da plataforma).</p>` },
    { id: "candles", titulo: "Como os candles são montados", html: `<p>Cada candle junta os negócios de um intervalo (5 min, 15 min, 1 h ou o dia): <b>abertura</b> é o primeiro negócio, <b>fechamento</b> o último, <b>máxima</b> e <b>mínima</b> os extremos; o volume (barra embaixo) é a soma dos MWm, e o inspetor mostra o número de negócios e o preço médio ponderado.</p>
      <p>O eixo de tempo tem um espaço por intervalo do pregão (9h às 18h) em cada dia útil da janela. <b>Intervalo sem negócio fica vazio</b>: não se repete o preço anterior nem se inventa candle, para o vazio mostrar a falta de liquidez. A faixa clara à direita é a parte do pregão de hoje que ainda não aconteceu.</p>
      <p>Forma e cor: <b>vazado</b> fechou acima da abertura (▲), <b>cheio</b> fechou abaixo (▼), <b>traço</b> abertura igual ao fechamento, que é o caso de um negócio só. A linha âmbar tracejada é o último preço; fica cinza quando o último negócio é de outro dia. O eixo de preço fica à direita, como nas telas de negociação, para o rótulo do último preço ficar colado a ele.</p>` },
    { id: "produtos-lista", titulo: "Lista de produtos", html: `<p>MKT-2 mostra cada produto do submercado escolhido: último preço (com a data, se não houve negócio hoje), variação do dia em %, volume e negócios de hoje e um minigráfico com o fechamento dos dias úteis com negócio nos últimos 20. Clique troca o gráfico e abre o produto no inspetor.</p>
      <p><b>Variação do dia</b> = último de hoje − fechamento anterior, onde o fechamento anterior é o último negócio do dia útil anterior com negócio. Sem negócio hoje, não há variação (■).</p>` },
    { id: "curva", titulo: "Curva forward", html: `<p>MKT-3 põe lado a lado o último preço de cada produto, do mês mais próximo ao Cal 31, no SE e nos outros submercados. É uma leitura da <b>estrutura a termo</b>: quanto o mercado paga hoje por energia entregue em cada período.</p>
      <p>Cuidados: meses, trimestres e anos são contratos diferentes que se sobrepõem na entrega (o 1T27 contém jan/27 e fev/27; o Cal 27 contém todos); por isso a linha só liga produtos do mesmo grupo. Os pontos vazados são preços de outro dia; num prazo longo, o último negócio pode ter semanas. Para uma curva mensal contínua seria preciso decompor trimestres e anos em meses (com sazonalidade), o que esta tela não faz.</p>` },
    { id: "liquidez", titulo: "Liquidez e produtos pouco líquidos", html: `<p>Na prática há liquidez de verdade até o A+1; do A+2 em diante saem poucos negócios por semana, e até o A+5 só de vez em quando. MKT-4 mostra os negócios dos 20 dias úteis anteriores e os de hoje por produto.</p>
      <ul><li>Com menos de 1 negócio por dia (menos de 20 em 20 dias), o produto é marcado como <b>pouco líquido</b> no inspetor: o último preço é indicativo, não uma cotação.</li>
      <li>Um negócio só faz um candle inteiro (traço); um lote grande ou pequeno pesa igual no último preço. Prefira o médio ponderado e o número de negócios.</li>
      <li>Candles diários de 60 dias mostram melhor um produto longo; candles de 5 min dele quase sempre estão vazios.</li>
      <li>Alerta "sem negócio há N dias úteis": aparece quando um produto anual não negocia há 5 dias úteis ou mais.</li></ul>` },
    { id: "negocios", titulo: "Fita de negócios", html: `<p>MKT-6 lista os negócios de hoje, o mais novo em cima, com filtro por produto e submercado. <b>Tique</b> compara com o negócio anterior do mesmo produto e submercado; <b>Var. do dia</b>, com o fechamento anterior. MKT-7 resume o dia por produto (negócios, MWm e médio ponderado) e por hora.</p>` },
    { id: "mesa", titulo: "Na MESA, sinal e alertas", html: `<p><b>Sinal</b>: último do SE dez/26 (M+1) com a seta e a variação do dia em %; a fita mostra também SE Cal 27, 1T27 e Cal 28. O <b>resumo</b> da MESA (dois terços da largura) traz os candles do SE M+1 (5 min ou 15 min de hoje, ou diários de 20 dias), com uma linha compacta de último, variação, Cal 27, negócios do dia e hora do último negócio, atualizada a cada negócio.</p>
      <p><b>Alertas</b> (dos dados simulados): maior variação do dia no SE quando passa de 2,5% com pelo menos 3 negócios; produto anual sem negócio há 5 dias úteis ou mais; spread NE − SE do M+1 maior que R$ 25.</p>` },
  ];

  // =====================================================================================================
  // MESA: sinal, fita, resumo e alertas
  // =====================================================================================================
  function sinal() {
    const r = est("SE", "M1"), u = ultimoNeg();
    return { v: r.ult ? `SE dez/26 ${rs(r.ult.p)} ${fmtVarPct(r)}` : "SE dez/26 —", d: `${r.var != null ? `${srs(r.var)} no dia` : "sem negócio hoje"} · ${hms(u.s)} · BBCE simulado`, tom: tom(r.var || 0), dnum: r.var || 0 };
  }
  function fita() {
    return [["A1", "SE Cal 27"], ["T1", "SE 1T27"], ["A2", "SE Cal 28"]].map(([id, rt]) => { const r = est("SE", id); return { r: rt, v: r.ult ? n(r.ult.p, 2) : "—", d: r.var || 0 }; });
  }
  // resumo na MESA (painel "xl", 8 de 12 colunas): linha compacta no topo, sem cartões grandes, e candles do SE M+1
  const RES_INT = [["5m", "5 min · hoje", "1"], ["15m", "15 min · hoje", "1"], ["D", "dia · 20 d", "20"]];
  function resumo(el) {
    if (!RES_INT.some(x => x[0] === EST.resInt)) EST.resInt = "5m";
    const acoes = el.closest(".painel") && el.closest(".painel").querySelector(".p-acoes");
    const topo = mk("div", "mkt-res"); el.append(topo);
    const pintar = () => {
      const a = est("SE", "M1"), b = est("SE", "A1"), H = negHoje();
      topo.innerHTML = `<span class="mkt-res-i"><span class="r">SE dez/26 · M+1</span> <b class="v num">${a.ult ? rs(a.ult.p) : "—"}</b> <span class="${tom(a.var || 0)}">${fmtVar(a)}</span></span>` +
        `<span class="mkt-res-i"><span class="r">Cal 27</span> <b class="num">${b.ult ? n(b.ult.p, 2) : "—"}</b> <span class="${tom(b.var || 0)}">${fmtVarPct(b)}</span></span>` +
        `<span class="mkt-res-i"><span class="r">Hoje</span> <b class="num">${n(H.length)}</b> neg. · ${n(H.reduce((x, q) => x + q.v, 0))} MWm</span>${aoVivo()}`;
    };
    pintar();
    let sel = null;
    const box = mk("div"); el.append(box);
    let caixa = null;
    const montarG = () => {
      limpar(box); sel = null;
      const [iv, rt, nd] = RES_INT.find(x => x[0] === EST.resInt);
      caixa = G(box, 290, (svg, W, H) => desenharVelas(svg, W, H, { sub: "SE", prod: "M1", int: iv, ndias: +nd, sel,
        aoClicar: (c, r) => { sel = { d: c.d, k: c.k }; redesenhar(caixa); inspVela("SE", "M1", iv, c, r); } }), `SE dez/26: candles de ${rt}`);
    };
    if (acoes) acoes.prepend(abas(RES_INT.map(x => [x[0], x[1]]), EST.resInt, v => { EST.resInt = v; guardar(); montarG(); }, "Intervalo dos candles"));
    montarG();
    nota(el, "Candle vazado: alta (▲); cheio: baixa (▼); traço: abertura igual ao fechamento. Intervalo sem negócio fica vazio. Linha âmbar: último preço. Clique num candle para o detalhe.");
    ouvir(el, q => { pintar(); if (q.sub === "SE" && q.prod === "M1") redesenhar(caixa); });
  }
  function alertas() {
    const u = ultimoNeg(), quando = `${HOJE}T${hm(u.s)}`, L = [];
    const fortes = PRODS.map(p => est("SE", p.id)).filter(r => r.nHoje >= 3 && r.varPct != null && Math.abs(r.varPct) >= 0.025).sort((a, b) => Math.abs(b.varPct) - Math.abs(a.varPct));
    if (fortes.length) { const r = fortes[0]; L.push({ quando, tela: 1, nivel: Math.abs(r.varPct) >= 0.04 ? "alto" : "normal", texto: `SE ${PROD[r.prod].rot} ${seta(r.var)} ${sn(r.varPct * 100, 1)}% no dia (${rs(r.ult.p)}, ${r.nHoje} negócios) · simulado` }); }
    const velhos = PRODS.filter(p => p.grupo === 2).map(p => est("SE", p.id)).filter(r => r.ult && r.diasSem >= 5).sort((a, b) => b.diasSem - a.diasSem);
    if (velhos.length) { const r = velhos[0]; L.push({ quando, tela: 2, nivel: "normal", texto: `SE ${PROD[r.prod].rot} sem negócio há ${r.diasSem} dias úteis (último ${rs(r.ult.p)} em ${ddmm(DIAS[r.ult.d])}) · simulado` }); }
    const m1 = est("SE", "M1"), ne = est("NE", "M1");
    if (m1.ult && ne.ult && Math.abs(ne.ult.p - m1.ult.p) > 25) L.push({ quando, tela: 2, nivel: "normal", texto: `Spread NE − SE dez/26 em ${srs(ne.ult.p - m1.ult.p)} · simulado` });
    return L;
  }

  // =====================================================================================================
  // registro
  // =====================================================================================================
  Mesa.registrar({
    cod: "MKT", nome: "Mercado", desc: "Preços da BBCE por produto (simulados): candles, curva forward e negócios ao vivo",
    sinal, fita, resumo, alertas, mesa: { ordem: 1, tam: "xl" },
    telas: [
      { cod: "CAN", nome: "Candles", montar: area => montarCan(area) },
      { cod: "CUR", nome: "Curva", montar: area => montarCur(area) },
      { cod: "NEG", nome: "Negócios", montar: area => montarNeg(area) },
      { cod: "MET", nome: "Fonte e método", montar: area => Mesa.met(area, SECOES) },
    ],
  });
})();
