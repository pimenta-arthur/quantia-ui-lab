/* Variante 08 · Mesa (terminal desde o início) · funcoes/nen.js
   NEN · Pricing Descolamento: compra e venda do descolamento do NE e do N contra o SE, o preço justo do modelo,
   os fundamentos do deck, a física do problema, o backtest da cotação e do modelo e a metodologia.
   Dados FICTÍCIOS da variante 07 (window.PD) e as contas autorizadas dela (ContaDescolamento, CVC), carregados pela
   index.html; as funções de cálculo das páginas da 07 (compra_venda.js, app.js, metodologias) vieram para dentro daqui.
   Telas: 1 COT Cotação · 2 DES Descolamento · 3 FUN Fundamentos e realizado · 4 FIS Física · 5 BT Backtest da cotação ·
   6 MOD Desempenho do modelo · 7 MET Metodologia. Nenhum nome global além de Mesa.registrar; localStorage "mesa.nen.*". */
(function () {
  "use strict";
  if (typeof Mesa === "undefined") return;
  const PD = window.PD || {};
  const CHAVES = ["meta", "sazonal_se", "meses", "historico_periodos", "fund_periodos", "cv_backtest", "cv_historico", "cv_exemplo",
    "fundamentos", "desempenho", "historico_rodadas", "hidr_ne", "hist_marcos"];
  const faltam = CHAVES.filter(k => !PD[k]).concat(window.ContaDescolamento ? [] : ["ContaDescolamento"], window.CVC ? [] : ["CVC"]);
  if (faltam.length) {
    const msg = `<p class="leg">Dados do Pricing Descolamento indisponíveis (${faltam.join(", ")}). Confira os scripts da variante 07 na index.html.</p>`;
    Mesa.registrar({ cod: "NEN", mesa: false, decisao: false, nome: "Pricing Descolamento", desc: "Compra e venda do descolamento do NE e do N",
      sinal: () => ({ v: "sem dados", tom: "neutro" }), resumo: el => { el.innerHTML = msg; }, alertas: () => [],
      telas: [{ cod: "COT", nome: "Cotação", montar: a => { a.innerHTML = msg; } }] });
    return;
  }

  // ================================================================ dados, contas e utilidades
  const META = PD.meta, M = PD.meses, CVB = PD.cv_backtest, CVH = PD.cv_historico, FD = PD.fundamentos, DS = PD.desempenho;
  const HP = PD.historico_periodos, FP = PD.fund_periodos, CVC = window.CVC;
  const CONTA = window.ContaDescolamento.criar(M, PD.sazonal_se.fator);
  const IDX = CONTA.IDX, horas = CONTA.horas;
  const mesN = p => +p.slice(5, 7);
  const dn = (v, c = 1) => (v == null || !isFinite(v) ? "—" : (v < -0.5 * 10 ** -c ? "−" : "") + n(Math.abs(v), c));
  const pc0 = v => (v == null || !isFinite(v) ? "—" : n(v * 100, 0) + "%");
  const media = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const parseNum = s => { if (s == null) return null; s = String(s).trim().replace(/\s/g, "").replace(/R\$/i, "").replace("−", "-"); if (!s) return null;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const v = Number(s); return isFinite(v) ? v : null; };
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const LS = {
    ler(k, def) { try { const v = localStorage.getItem("mesa.nen." + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    gravar(k, v) { try { localStorage.setItem("mesa.nen." + k, JSON.stringify(v)); } catch (e) {} },
    apagar(k) { try { localStorage.removeItem("mesa.nen." + k); } catch (e) {} },
  };
  const SUBS = ["NE", "N"];
  const COR = { SE: "var(--sm-se)", S: "var(--sm-s)", NE: "var(--sm-ne)", N: "var(--sm-n)" };
  const NOMESUB = { S: "Sul", NE: "NE", N: "N", SE: "SE" };
  const rotPer = p => (p.includes("-T") ? `T${p.slice(-1)}/${p.slice(2, 4)}` : `${p.slice(-1)}º sem/${p.slice(2, 4)}`);
  // períodos de cada ano do horizonte, com rótulo
  const PER = CONTA.PER.map(a => {
    const yy = String(a.y).slice(2);
    return { ...a, rot: a.meses.length === 12 ? String(a.y) : a.meses.length === 1 ? rot(a.meses[0]) : `${rot(a.meses[0]).slice(0, 3)}–${rot(a.meses.at(-1))}`,
      S: a.S.map(s => ({ ...s, rot: `${s.s}º sem/${yy}` })), T: a.T.map(t => ({ ...t, rot: `T${t.t}/${yy}` })) };
  });
  const ANO = PER.find(a => a.meses.length === 12) || PER.at(-1);       // o primeiro ano cheio do horizonte (2027)
  const PROX = { rot: rot(M[0].mes), meses: [M[0].mes] };              // o próximo produto: o primeiro mês do horizonte
  function produtos(tipo) {
    const L = [];
    PER.forEach(a => {
      if (tipo === "ano") L.push({ rot: a.rot, meses: a.meses, parcial: a.meses.length < 12 });
      if (tipo === "sem") a.S.forEach(s => s.meses.length && L.push({ rot: s.rot, meses: s.meses, parcial: s.meses.length < 6 }));
      if (tipo === "tri") a.T.forEach(t => t.meses.length && L.push({ rot: t.rot, meses: t.meses, parcial: t.meses.length < 3 }));
      if (tipo === "mes") a.meses.forEach(p => L.push({ rot: rot(p), meses: [p], parcial: false }));
    });
    return L;
  }
  const ABAS_PROD = [["ano", "Ano"], ["sem", "Semestre"], ["tri", "Trimestre"], ["mes", "Mês"]];
  function rotuloChave(k) {
    if (k[0] === "A") return k.slice(1); if (k[0] === "M") return rot(k.slice(1));
    const [y, i] = k.slice(1).split("-"); return k[0] === "S" ? `${i}º sem/${y.slice(2)}` : `T${i}/${y.slice(2)}`;
  }
  const premissas = () => `Deck NEWAVE ${rot(META.deck)} · modelo ${META.versao} · dados horários até ${dataBr(META.dados_ate)} · ${M[0].cen.length}–${Math.max(...M.map(m => m.cen.length))} anos climáticos · piso ${n(META.piso, 2)} e teto ${n(META.teto, 2)} · rodada ${dataHoraBr(META.rodada)} · dados fictícios`;

  // ---------------------------------------------------------------- curva do SE (salva no navegador) e política de cotação
  const SE_EXEMPLO = 220;
  const entExemplo = () => Object.fromEntries(CONTA.ANOS.map(y => [`A${y}`, SE_EXEMPLO]));
  const salva = LS.ler("curva", null);
  let EXEMPLO = !(salva && salva.ent), ENT = EXEMPLO ? entExemplo() : salva.ent, SAZM = (salva && salva.saz) || "plana";
  function salvarCurva() { EXEMPLO = false; LS.gravar("curva", { ent: ENT, saz: SAZM }); aoMudar(); }
  function voltarAoExemplo() { LS.apagar("curva"); EXEMPLO = true; ENT = entExemplo(); SAZM = "plana"; aoMudar(); }
  const CONSERVADOR = { compra: { p: 0.30, alfa: 0.10, lam: 1 }, venda: { p: 0.30, alfa: 0.10, lam: 1 }, ancora: true };
  const copia = o => JSON.parse(JSON.stringify(o));
  let EST = copia(CONSERVADOR);
  { const s = LS.ler("politica", null); if (s && s.compra && s.venda && typeof s.ancora === "boolean") EST = s; }
  const salvarEst = () => { LS.gravar("politica", EST); aoMudar(); };
  const mesmosParametros = () => JSON.stringify([EST.compra, EST.venda]) === JSON.stringify([CONSERVADOR.compra, CONSERVADOR.venda]);
  const nomePolitica = () => (!mesmosParametros() ? "Personalizado" : EST.ancora ? "Conservador" : "Conservador, sem âncora");

  let RSV = null, RES = {}, MEMO = {};
  function recalcular() { RSV = CONTA.resolver(ENT, SAZM); RES = CONTA.calcular(RSV.se); MEMO = {}; }
  recalcular();
  const temCurva = () => Object.keys(RES).length > 0;
  const precificado = ms => ms.length > 0 && ms.every(p => RES[p]);
  const agregar = ms => CONTA.agregar(RES, ms);
  const FUNDM = Object.fromEntries(FP.serie.map(x => [x.mes, x]));
  const textoAviso = a => (a.tipo === "media"
    ? `${rotuloChave(a.chave)}: os períodos informados dão média ${n(a.media, 1)}, diferente de ${n(a.v, 1)}.`
    : `${rot(a.mes)}: SE derivado de ${n(a.v, 1)} abaixo do piso (${n(a.piso, 2)}); descolamento zero.`);

  // ---------------------------------------------------------------- cotação (porte de compra_venda.js da 07, com o submercado explícito)
  // valor de cada ano climático no produto (média dos meses ponderada por horas); só anos presentes em todos os meses
  function valoresPorAno(ms, sub) {
    const H = horas(ms), wm = p => M[IDX[p]].horas / H;
    const ids = RES[ms[0]].cen.map(c => c.id).filter(id => ms.every(p => RES[p].cen.some(c => c.id === id)));
    return ids.map(id => ({ ano: id.split("|")[0], v: ms.reduce((a, p) => a + RES[p].cen.find(x => x.id === id)[sub] * wm(p), 0) }));
  }
  // histórico realizado do mês do calendário: o maior (menos negativo) valor em fração da folga e o ano que o deu
  function histMes(p, sub) {
    const arr = (CVH[sub] || {})[String(mesN(p))]; if (!arr || !arr.length) return null;
    const b = arr.reduce((a, x) => (x[1] > a[1] ? x : a)); return { f: b[1], ano: b[0], se: b[2], d: b[3] };
  }
  // SE e descolamento realizados do MESMO produto num ano (mesmos meses do calendário), se todos os meses estão no histórico
  function realizadoProduto(ms, ano, sub) {
    let hh = 0, se = 0, d = 0;
    for (const p of ms) {
      const mm = p.slice(5, 7), r = CVH.real[`${ano}-${mm}`]; if (!r) return null;
      const x = new Date(ano, +mm, 0).getDate() * 24;
      hh += x; se += r[0] * x; d += r[sub === "NE" ? 1 : 2] * x;
    }
    return { se: se / hh, d: d / hh };
  }
  function mesesDoProduto(ms, sub) {
    return ms.map(p => { const hm = histMes(p, sub), folga = Math.max(RES[p].se - M[IDX[p]].piso, 0);
      return { mes: p, h: M[IDX[p]].horas, se: RES[p].se, anos: RES[p].cen.map(c => c[sub]), ids: RES[p].cen.map(c => c.id.split("|")[0]), hist: hm ? hm.f * folga : null, info: hm }; });
  }
  function cotar(ms, sub) {
    const key = `c|${sub}|${ms.join(",")}`; if (key in MEMO) return MEMO[key];
    let out = null;
    const g = precificado(ms) ? agregar(ms) : null;
    if (g) {
      const anos = valoresPorAno(ms, sub), amostra = anos.map(a => a.v), justo = g[sub];
      if (amostra.length) {
        const meses = mesesDoProduto(ms, sub);
        let compra = CVC.cotarLado(amostra, "compra", EST.compra), limitada = false;
        let venda = EST.ancora ? CVC.vendaProduto(meses, EST.venda, true) : CVC.cotarLado(amostra, "venda", EST.venda);
        if (compra > justo) { compra = justo; limitada = true; }   // a compra nunca acima do justo oficial
        if (venda < justo) { venda = justo; limitada = true; }
        out = { se: g.se, justo, compra, venda, anos, meses, ms, na: amostra.length, limitada, trava: g.trava };
      }
    }
    MEMO[key] = out; return out;
  }
  // composição do ano: a cotação do ano e como cada pedaço contribui para ela (D051)
  function comp(a, sub) {
    const key = `k|${sub}|${a.y}`; if (key in MEMO) return MEMO[key];
    let out = null;
    const c = cotar(a.meses, sub);
    if (c) {
      const H = horas(a.meses), vA = valoresPorAno(a.meses, sub);
      const pior = vA.reduce((x, y) => (y.v < x.v ? y : x)), melhor = vA.reduce((x, y) => (y.v > x.v ? y : x));
      const usa = m => { const mod = CVC.precificar(m.anos, EST.venda).venda; return m.hist != null ? Math.max(mod, m.hist) : mod; };
      const porMes = {}; c.meses.forEach(m => { porMes[m.mes] = usa(m); });
      const doAno = (ms, ref) => valoresPorAno(ms, sub).find(x => x.ano === ref.ano).v;
      const venda0 = ms => (EST.ancora ? ms.reduce((t, p) => t + porMes[p] * M[IDX[p]].horas, 0) / horas(ms) : doAno(ms, melhor));
      const compra0 = ms => doAno(ms, pior);
      const dC = c.compra - compra0(a.meses), dV = c.venda - venda0(a.meses);
      const lin = (rotulo, ms) => { const g = agregar(ms); return { rot: rotulo, ms, w: horas(ms) / H, se: g.se, compra: compra0(ms) + dC, justo: g[sub], venda: venda0(ms) + dV }; };
      out = { c, H, pior, melhor, lin };
    }
    MEMO[key] = out; return out;
  }
  // linha de um produto: o produto sozinho (padrão) ou a contribuição dele para o ano ("Fechar o ano")
  function linhaProduto(k, rotulo, ms, ref, sub) {
    if (!ms.length) return null;
    const c = cotar(ms, sub), contrib = k ? k.lin(rotulo, ms) : null;
    const solo = c ? { rot: rotulo, ms, w: contrib ? contrib.w : 0, se: c.se, compra: c.compra, justo: c.justo, venda: c.venda } : null;
    const base = ref === "ano" && contrib ? contrib : solo;
    return base ? { ...base, solo, contrib } : null;
  }
  function linha(rotulo, ms, sub, ref) {
    if (!ms.length) return null;
    const a = PER.find(x => x.meses.includes(ms[0]));
    return linhaProduto(a ? comp(a, sub) : null, rotulo, ms, ref, sub);
  }
  // indicativo (D074): a compra do ano montada pelos trimestres cotados sozinhos (média por horas)
  function compraAnoPelosTri(ms, sub) {
    const a = PER.find(x => x.meses.length === 12 && x.meses.length === ms.length && x.meses.every(p => ms.includes(p))); if (!a) return null;
    const cs = a.T.map(t => cotar(t.meses, sub)); if (cs.some(x => !x)) return null;
    return a.T.reduce((t, x, i) => t + cs[i].compra * horas(x.meses), 0) / horas(a.meses);
  }

  // ---------------------------------------------------------------- backtest das políticas (porte de compra_venda_metodologia e compra_venda.js)
  const POL = { A: { p: 0.30, alfa: 0.10, lam: 0.50 }, B: { p: 0.30, alfa: 0.10, lam: 1 } };
  const NOMEPOL = { A: "Antes · v1 (λ 0,50)", B: "λ = 1, sem âncora", C: "Conservador" };
  const CORPOL = { A: "var(--nen-pa)", B: "var(--bar-saz)", C: "var(--accent)" };
  function cotCaso(c, sub, k) {
    const am = c.anos[sub], meses = c.meses.map(m => ({ h: m.h, anos: m.anos[sub], hist: m.hist[sub] }));
    if (k === "A") return { compra: CVC.cotarLado(am, "compra", POL.A), venda: CVC.cotarLado(am, "venda", POL.A) };
    if (k === "B") return { compra: CVC.cotarLado(am, "compra", POL.B), venda: CVC.cotarLado(am, "venda", POL.B) };
    if (k === "X") return { compra: CVC.cotarLado(am, "compra", EST.compra), venda: EST.ancora ? CVC.vendaProduto(meses, EST.venda, true) : CVC.cotarLado(am, "venda", EST.venda) };
    return { compra: CVC.cotarLado(am, "compra", POL.B), venda: CVC.vendaProduto(meses, POL.B, true) };
  }
  const MEMO_BT = {};
  function metricas(tipo, sub, k) {
    const key = `${tipo}|${sub}|${k}|${k === "X" ? JSON.stringify(EST) : ""}`; if (MEMO_BT[key]) return MEMO_BT[key];
    const por = {}, perdasC = [], perdasV = [], casos = CVB.casos.filter(c => c.tipo === tipo);
    casos.forEach(c => {
      const r = c.real[sub], q = cotCaso(c, sub, k);
      (por[c.periodo] = por[c.periodo] || []).push({ pc: r < q.compra ? 1 : 0, pv: r > q.venda ? 1 : 0, gc: r - q.compra, gv: q.venda - r, l: q.venda - q.compra });
      if (r < q.compra) perdasC.push(q.compra - r);
      if (r > q.venda) perdasV.push(r - q.venda);
    });
    const ps = Object.keys(por).sort(), tot = kk => media(ps.map(p => media(por[p].map(x => x[kk]))));
    const porPer = ps.map(p => ({ p, n: por[p].length, pc: media(por[p].map(x => x.pc)), pv: media(por[p].map(x => x.pv)), gc: media(por[p].map(x => x.gc)), gv: media(por[p].map(x => x.gv)), l: media(por[p].map(x => x.l)) }));
    return (MEMO_BT[key] = { n: casos.length, periodos: ps.length, porPer, pc: tot("pc"), pv: tot("pv"), gc: tot("gc"), gv: tot("gv"), l: tot("l"),
      sevC: media(perdasC), sevV: media(perdasV), worstC: Math.max(0, ...perdasC), worstV: Math.max(0, ...perdasV) });
  }

  // ================================================================ peças de interface
  let REDESENHAR = [];
  function aoMudar() { recalcular(); redesenharTudo(); }
  function redesenharTudo() { REDESENHAR.forEach(f => f()); atualizarSinal(); }
  // quando a curva ou a política mudam, a casca refaz a barra de funções e a fita a partir de sinal() e fita()
  function atualizarSinal() { if (typeof Mesa !== "undefined" && Mesa.atualizarSinal) Mesa.atualizarSinal(); }
  // painel que se redesenha: desenhar(p, aba) recebe o painel e a aba atual; entra em REDESENHAR (curva, política, chaves)
  function painelVivo(g, o, desenhar) {
    let aba, pp;
    const op = { ...o };
    if (o.abas) op.aoTrocar = (v, p) => { aba = v; pp = p; p.corpo.replaceChildren(); desenhar(p, v); };
    const p = Mesa.painel(g, op); pp = p;
    if (!o.abas) desenhar(p);
    const re = () => { pp.corpo.replaceChildren(); desenhar(pp, aba); };
    if (!o.fixo) REDESENHAR.push(re);
    p.re = re;
    return p;
  }
  function decisaoViva(area, itens) {
    let el = Mesa.decisao(area, itens());
    REDESENHAR.push(() => { const tmp = mk("div"); const novo = Mesa.decisao(tmp, itens()); el.replaceWith(novo); el = novo; });
  }
  const barra = (pai, cls) => { const b = mk("div", "nen-barra" + (cls ? " " + cls : "")); pai.append(b); return b; };
  function grupoAbas(pai, rotulo, opcoes, atual, aoTrocar) {
    const g = mk("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo);
    opcoes.forEach(([v, t]) => { const b = mk("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(String(v) === String(atual))); g.append(b); });
    g.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); aoTrocar(b.dataset.v); });
    pai.append(g); return g;
  }
  function chave(pai, texto, valor, aoMudarChave, titulo) {
    const l = mk("label", "nen-tog", `<input type="checkbox"${valor ? " checked" : ""}><span>${texto}</span>`);
    if (titulo) l.title = titulo;
    l.querySelector("input").addEventListener("change", e => aoMudarChave(e.target.checked));
    pai.append(l); return l;
  }
  function botao(pai, texto, aoClicar, cls) { const b = mk("button", "nen-btn" + (cls ? " " + cls : ""), texto); b.type = "button"; b.addEventListener("click", aoClicar); pai.append(b); return b; }
  function seletor(pai, rotulo, opcoes, atual, aoMudarSel) {
    const l = mk("label", "nen-sel", `<span>${rotulo}</span><select>${opcoes.map(([v, t]) => `<option value="${v}"${v === atual ? " selected" : ""}>${t}</option>`).join("")}</select>`);
    l.querySelector("select").addEventListener("change", e => aoMudarSel(e.target.value)); pai.append(l); return l;
  }
  function copiar(txt, aviso) {
    const ok = m => { aviso.textContent = m; setTimeout(() => { aviso.textContent = ""; }, 4000); };
    const plano = () => { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); ok("Tabela copiada"); } catch (e) { ok("Selecione e copie manualmente"); } t.remove(); };
    try { navigator.clipboard.writeText(txt).then(() => ok("Copiada; cole no Excel"), plano); } catch (e) { plano(); }
  }
  const xl = v => (v == null || !isFinite(v) ? "" : v.toFixed(2).replace(".", ","));
  const semCurva = () => mk("p", "nen-vazio", "Sem curva do SE: digite o SE na COT (NEN-1) ou use o exemplo fictício de R$ 220/MWh.");
  const tabela = (pai, html, cls, rolagem) => { const box = mk("div", "rolagem" + (rolagem ? " nen-rol" : "")); box.innerHTML = `<table class="nen-t ${cls || ""}">${html}</table>`; pai.append(box); return box; };
  const trio = itens => `<div class="nen-trio">${itens.map(([t, v, d, at]) => `<div${at ? ' class="ativo"' : ""}><span>${t}</span><b class="num">${v}</b>${d ? `<small>${d}</small>` : ""}</div>`).join("")}</div>`;

  // régua: anos climáticos (pontos) e marcas verticais (compra, justo, venda), para o inspetor
  function regua(caixa, o) {
    grafico(caixa, (svg, W, H) => {
      const mg = { l: 14, r: 14, t: 30, b: 20 };
      const vals = [...o.pontos.map(p => p.v), ...o.marcas.map(m => m.v)].filter(v => v != null && isFinite(v));
      if (!vals.length) return;
      const e = eixo(Math.min(...vals), Math.max(...vals), 4);
      const X = v => mg.l + (W - mg.l - mg.r) * (v - e.a) / ((e.b - e.a) || 1), y0 = H - mg.b;
      S(svg, "line", { x1: mg.l, x2: W - mg.r, y1: y0, y2: y0, stroke: "var(--rule)" });
      e.t.forEach(t => { S(svg, "line", { x1: X(t), x2: X(t), y1: y0, y2: y0 + 3, stroke: "var(--ink-3)" }); S(svg, "text", { x: X(t), y: H - 5, "text-anchor": "middle" }, o.fmtEixo(t)); });
      const rotulos = [];
      o.marcas.forEach(m => {
        S(svg, "line", { x1: X(m.v), x2: X(m.v), y1: mg.t - 6, y2: y0, stroke: m.cor, "stroke-width": 2, "stroke-dasharray": m.tracejado ? "3 3" : null });
        const t = S(svg, "text", { x: X(m.v), y: mg.t - 9, "text-anchor": "middle", style: `fill:${m.cor};font-weight:600` }, m.rot);
        rotulos.push({ el: t, x: X(m.v), y: mg.t - 9 });
        const alvo = S(svg, "line", { x1: X(m.v), x2: X(m.v), y1: mg.t - 6, y2: y0, stroke: "transparent", "stroke-width": 12 });
        dicaEm(alvo, m.dica);
      });
      empilharRotulos(rotulos, 22, 10);
      const ym = (mg.t + y0) / 2;
      o.pontos.forEach((p, i) => {
        const c = S(svg, "circle", { cx: X(p.v), cy: ym + (i % 2 ? 7 : -7), r: 5, fill: p.cor || o.cor, stroke: "var(--surface)", "stroke-width": 1.5, opacity: p.vazio ? 0.45 : 1 });
        dicaEm(c, p.dica);
      });
    }, "baixo", o.rotulo);
  }

  // ================================================================ inspetor: descritivos
  // descritivo de um lado da cotação de um produto (porte de detalheCotacao e descritivoProduto)
  function descritivo(el, r, sub, lado, modo) {
    const c = temCurva() ? cotar(r.ms, sub) : null;
    if (!c) { el.innerHTML = `<p class="m-insp-vazio">Sem preço do SE em todos os meses de ${r.rot}.</p>`; return; }
    const pld = modo === "pld", f = (v, se = c.se) => (pld ? n(v + se, 1) : dn(v));
    const sozinho = c[lado], contrib = r.contrib ? r.contrib[lado] : null, dif = contrib != null && Math.abs(sozinho - contrib) > 0.05;
    const pt = lado === "compra" ? compraAnoPelosTri(r.ms, sub) : null;
    const am = c.anos.map(a => a.v), mn = Math.min(...am), mx = Math.max(...am);
    const q = l => CVC.viaQuantil(am, EST[l].p)[l], ca = l => CVC.viaCauda(am, EST[l].alfa, EST[l].lam)[l];
    let html = trio([["Compra", f(c.compra), "", lado === "compra"], ["Justo", f(c.justo)], ["Venda", f(c.venda), "", lado === "venda"]]);
    html += `<p class="nen-ins-l"><b>${lado === "compra" ? "Compra" : "Venda"} de ${sub} ${r.rot}</b>: sozinho <b class="num">${f(sozinho)}</b>` +
      (dif ? ` · fechando o ano <b class="num">${f(contrib, r.contrib.se)}</b>` : "") + (pt == null ? "" : ` · pelos trimestres <b class="num">${f(pt)}</b>`) +
      ` · SE ${n(c.se, 1)} · ${pld ? "PLD implícito" : "descolamento"}, R$/MWh · política ${nomePolitica()}</p><div class="nen-regua"></div>`;
    const anos = [...c.anos].sort((a, b) => a.ano.localeCompare(b.ano)).map(a => {
      const re = realizadoProduto(c.ms, +a.ano, sub);
      const tag = am.length > 1 && a.v === mn ? ' <span class="nen-tag">mais descolado</span>' : am.length > 1 && a.v === mx ? ' <span class="nen-tag">menos</span>' : "";
      return `<tr><td>${a.ano}${tag}</td><td class="n">${f(a.v)}</td><td class="n nen-ref">${re ? n(re.se, 0) : "—"}</td><td class="n nen-ref">${re ? (pld ? n(re.se + re.d, 1) : dn(re.d)) : "—"}</td></tr>`;
    }).join("");
    html += `<h3>Anos climáticos do produto</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Ano</th><th class="n">Modelo</th><th class="n">SE real</th><th class="n">${pld ? "PLD real" : "Real"}</th></tr></thead><tbody>${anos}` +
      `<tr class="destaque"><td>média (justo)</td><td class="n">${f(media(am))}</td><td></td><td></td></tr></tbody></table></div>` +
      `<p class="leg">Em cinza, o SE e o ${pld ? "PLD" : "descolamento"} que de fato ocorreram nesse mesmo produto em cada ano (até ${rot(CVH.ate)}); “—” quando o período não fechou.</p>`;
    html += `<h3>Critério</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Critério</th><th class="n">Compra</th><th class="n">Venda</th></tr></thead><tbody>` +
      `<tr><td>Quantil (p ${n(EST.compra.p * 100, 0)}% / ${n(EST.venda.p * 100, 0)}%)</td><td class="n">${f(q("compra"))}</td><td class="n">${f(q("venda"))}</td></tr>` +
      `<tr><td>Cauda (α ${n(EST.compra.alfa * 100, 0)}% / ${n(EST.venda.alfa * 100, 0)}% · λ ${n(EST.compra.lam, 2)} / ${n(EST.venda.lam, 2)})</td><td class="n">${f(ca("compra"))}</td><td class="n">${f(ca("venda"))}</td></tr>` +
      `<tr class="destaque"><td>Cotação${EST.ancora ? " (venda ancorada)" : " (mais conservador)"}</td><td class="n">${f(c.compra)}</td><td class="n">${f(c.venda)}</td></tr></tbody></table></div>`;
    if (EST.ancora) {
      const H = c.meses.reduce((t, m) => t + m.h, 0), med = gf => c.meses.reduce((t, m) => t + m.h * gf(m), 0) / H;
      const mod = m => CVC.precificar(m.anos, EST.venda).venda, usa = m => (m.hist != null ? Math.max(mod(m), m.hist) : mod(m)), seM = med(m => m.se);
      html += `<h3>Venda mês a mês</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Mês</th><th class="n">Modelo</th><th class="n">Histórico</th><th class="n">Usada</th></tr></thead><tbody>` +
        c.meses.map(m => `<tr><td>${rot(m.mes)}<span class="nen-fx">SE ${n(m.se, 0)}</span></td><td class="n">${f(mod(m), m.se)}</td>` +
          `<td class="n">${m.hist != null ? `${f(m.hist, m.se)}<span class="nen-fx">${m.info.ano} · ${n(m.info.f * 100, 1)}%</span>` : "—"}</td>` +
          `<td class="n"><b>${f(usa(m), m.se)}</b><span class="nen-fx">${m.hist != null && m.hist > mod(m) ? "histórico" : "modelo"}</span></td></tr>`).join("") +
        `<tr class="destaque"><td>média</td><td class="n">${f(med(mod), seM)}</td><td class="n">${c.meses.every(m => m.hist != null) ? f(med(m => m.hist), seM) : "—"}</td><td class="n">${f(med(usa), seM)}</td></tr></tbody></table></div>` +
        `<p class="leg">Venda do mês = o maior entre o melhor ano do modelo no mês e o maior descolamento já realizado naquele mês do calendário (fração da folga, de 2021 até ${rot(CVH.ate)}; ano e % embaixo) × a folga do SE informado (SE − piso). A compra segue o pior ano do produto.</p>`;
    }
    if (c.limitada) html += `<p class="leg">A cotação foi limitada ao preço justo oficial (média mês a mês), que difere da média dos anos completos neste produto.</p>`;
    if (c.na <= 6) html += `<p class="leg">Só ${c.na} anos climáticos: com α = 10%, a cauda é o pior ano e o quantil interpola entre dois anos.</p>`;
    el.innerHTML = html;
    regua(el.querySelector(".nen-regua"), {
      cor: COR[sub], rotulo: `Anos climáticos e cotação de ${sub} ${r.rot}`, fmtEixo: t => (pld ? n(t + c.se, 0) : dn(t, 0)),
      pontos: c.anos.map(a => ({ v: a.v, dica: `<b>Ano climático ${a.ano}</b><br>${sub} ${r.rot}: ${f(a.v)}` })),
      marcas: [["C", c.compra, "var(--ink-2)", true, "Compra"], ["J", c.justo, "var(--accent)", false, "Justo"], ["V", c.venda, "var(--ink-2)", true, "Venda"]]
        .map(([t, v, cor, tr, nome]) => ({ rot: t, v, cor, tracejado: tr, dica: `<b>${nome}</b> ${sub} ${r.rot}: ${f(v)}` })),
    });
  }
  // ficha rápida de um produto: NE e N lado a lado (usada no resumo da MESA)
  function ficha(el, rotulo, ms) {
    el.replaceChildren();
    SUBS.forEach(sub => {
      const c = temCurva() ? cotar(ms, sub) : null;
      const box = mk("div", "nen-ficha");
      if (!c) { box.innerHTML = `<h3>${sub} ${rotulo}</h3><p class="m-insp-vazio">Sem curva do SE.</p>`; el.append(box); return; }
      box.innerHTML = `<h3 style="color:${COR[sub]}">${sub} ${rotulo}</h3>` + trio([["Compra", dn(c.compra)], ["Justo", dn(c.justo)], ["Venda", dn(c.venda)]]) +
        `<p class="leg">PLD implícito ${n(c.se + c.compra, 1)} / ${n(c.se + c.venda, 1)} · SE ${n(c.se, 1)} · ${c.na} anos climáticos</p><div class="nen-regua"></div>`;
      el.append(box);
      regua(box.querySelector(".nen-regua"), { cor: COR[sub], rotulo: `${sub} ${rotulo}`, fmtEixo: t => dn(t, 0),
        pontos: c.anos.map(a => ({ v: a.v, dica: `<b>${a.ano}</b> · ${dn(a.v)}` })),
        marcas: [["C", c.compra, "var(--ink-2)", true], ["J", c.justo, "var(--accent)", false], ["V", c.venda, "var(--ink-2)", true]].map(([t, v, cor, tr]) => ({ rot: t, v, cor, tracejado: tr, dica: `${t === "C" ? "Compra" : t === "J" ? "Justo" : "Venda"}: ${dn(v)}` })) });
    });
    const a = mk("p", "leg", `<a href="#NEN-1">Abrir a cotação completa (NEN COT)</a>`); el.append(a);
  }
  // conferência do ano: compra pelo ano × pelos semestres × pelos trimestres (cada um sozinho); justo e venda
  function conferirAno(el, modo) {
    const pld = modo === "pld";
    let html = "";
    SUBS.forEach(sub => PER.forEach(a => {
      const k = comp(a, sub); if (!k) return;
      const cols = [linhaProduto(k, a.rot, a.meses, "sozinho", sub), ...a.S.map(x => linhaProduto(k, x.rot, x.meses, "sozinho", sub)), ...a.T.map(x => linhaProduto(k, x.rot, x.meses, "sozinho", sub))];
      if (cols.slice(1, 3).filter(Boolean).length < 2) return;
      const y = cols[0], f = v => (pld ? n(v + y.se, 1) : dn(v));
      const med = (rs, l) => { const W = rs.reduce((t, r) => t + r.w, 0); return rs.reduce((t, r) => t + r.w * r[l], 0) / W; };
      const Ss = cols.slice(1, 3).map(r => ({ ...r.solo, w: r.w })), Ts = cols.slice(3).filter(Boolean).map(r => ({ ...r.solo, w: r.w }));
      const pt = compraAnoPelosTri(a.meses, sub), vS = med(Ss, "venda"), vT = Ts.length === 4 ? med(Ts, "venda") : null;
      const vIgual = [y.venda, vS, vT].filter(v => v != null).every(v => Math.abs(v - y.venda) < 0.06);
      html += `<tr><td>${sub} ${a.rot}</td><td class="n"><b>${f(y.compra)}</b></td><td class="n">${f(med(Ss, "compra"))}</td><td class="n">${pt == null ? "—" : f(pt)}</td><td class="n">${f(y.justo)}</td>` +
        `<td class="n">${vIgual ? f(y.venda) : `${f(y.venda)}<span class="nen-fx">${f(vS)} · ${vT == null ? "—" : f(vT)}</span>`}</td></tr>`;
    }));
    el.innerHTML = html ? `<div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Produto</th><th class="n">Pelo ano</th><th class="n">Pelos sem.</th><th class="n">Pelos tri.</th><th class="n">Justo</th><th class="n">Venda</th></tr></thead><tbody>${html}</tbody></table></div>` +
      `<p class="leg">Compra pelo ano = o ano cotado sozinho; pelos semestres / trimestres = média por horas dos produtos cotados sozinhos, mais conservadora porque o pior ano muda de período (D074: indicativo, não é a cotação do ano). O justo e a venda são os mesmos nas três contas. Backtest só de trimestres e semestres.</p>`
      : `<p class="m-insp-vazio">Sem ano completo com semestres precificados.</p>`;
  }
  // preço justo de um produto: cada ano climático, para o NE e o N, e o mesmo produto realizado no passado
  function justoDetalhe(el, prod) {
    const g = precificado(prod.meses) ? agregar(prod.meses) : null; if (!g) { el.innerHTML = `<p class="m-insp-vazio">Sem SE em todos os meses.</p>`; return; }
    const L = { NE: CONTA.porAno(RES, prod.meses, "NE", false), N: CONTA.porAno(RES, prod.meses, "N", false) };
    const ext = sub => { const vs = L[sub].filter(l => !l.parcial).map(l => l.v); return { mais: Math.min(...vs), menos: Math.max(...vs), k: vs.length }; };
    const E = { NE: ext("NE"), N: ext("N") };
    const nota = (l, sub) => (l.parcial ? ' <span class="nen-tag">parcial</span>' : E[sub].k > 1 && l.v === E[sub].mais ? ' <span class="nen-tag">mais</span>' : E[sub].k > 1 && l.v === E[sub].menos ? ' <span class="nen-tag">menos</span>' : "");
    let html = trio([["SE", n(g.se, 1)], ["NE justo", dn(g.NE), `${dn(g.NEmin)} a ${dn(g.NEmax)}`], ["N justo", dn(g.N), `${dn(g.Nmin)} a ${dn(g.Nmax)}`]]);
    html += `<p class="nen-ins-l">PLD implícito NE ${n(g.se + g.NE, 1)} · N ${n(g.se + g.N, 1)} · NE trava em ${pct(g.trava)} das horas</p>`;
    html += `<h3>Por ano climático</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Ano</th><th class="n">NE</th><th class="n">N</th></tr></thead><tbody>` +
      L.NE.map(l => { const x = L.N.find(z => z.ano === l.ano); return `<tr><td>${l.ano}</td><td class="n">${dn(l.v)}${nota(l, "NE")}</td><td class="n">${x ? dn(x.v) + nota(x, "N") : "—"}</td></tr>`; }).join("") +
      `<tr class="destaque"><td>preço justo</td><td class="n">${dn(g.NE)}</td><td class="n">${dn(g.N)}</td></tr></tbody></table></div>` +
      `<p class="leg">Cada ano traz vento, sol, hidrologia e o k observado nele. O justo é calculado mês a mês; o ano parcial entra só nos meses que tem.</p>`;
    const anosR = [...new Set(Object.keys(CVH.real).map(k => +k.slice(0, 4)))].sort();
    const re = anosR.map(y => ({ y, ne: realizadoProduto(prod.meses, y, "NE"), nn: realizadoProduto(prod.meses, y, "N") })).filter(x => x.ne);
    if (re.length) html += `<h3>O mesmo produto realizado</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Ano</th><th class="n">SE</th><th class="n">NE</th><th class="n">N</th></tr></thead><tbody>` +
      re.map(x => `<tr><td>${x.y}</td><td class="n">${n(x.ne.se, 1)}</td><td class="n">${dn(x.ne.d)}</td><td class="n">${dn(x.nn.d)}</td></tr>`).join("") + `</tbody></table></div><p class="leg">PLD da CCEE até ${rot(CVH.ate)}; o SE de cada ano era outro, por isso o descolamento em R$ não se compara direto (ver % da folga na FUN).</p>`;
    el.innerHTML = html;
  }
  // um mês do horizonte: cenários, o porquê (fundamentos) e o mesmo mês realizado
  function mesDetalhe(el, p) {
    const r = RES[p]; if (!r) { el.innerHTML = `<p class="m-insp-vazio">Sem SE neste mês.</p>`; return; }
    const fm = FUNDM[p] || {}, mo = fm.mod || {}, ra = fm.rea || {}, re = M[IDX[p]].real;
    let html = trio([["SE", n(r.se, 1)], ["NE justo", dn(r.NE), `${dn(r.NEmin)} a ${dn(r.NEmax)}`], ["N justo", dn(r.N), `${dn(r.Nmin)} a ${dn(r.Nmax)}`]]);
    html += `<p class="nen-ins-l">${mesN(p) <= 6 ? "1º semestre: trava o tronco N/NE→SE (sobra do N+NE)" : "2º semestre: trava o limite de exportação do NE"} · NE trava em ${pct(r.trava)} das horas · k ${n(mo.k, 2)}</p>`;
    html += `<h3>Cenários (anos climáticos)</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Ano</th><th class="n">NE</th><th class="n">N</th><th class="n">Trava</th><th class="n">k</th></tr></thead><tbody>` +
      [...r.cen].sort((a, b) => a.id.localeCompare(b.id)).map(c => `<tr><td>${c.id.split("|")[0]}</td><td class="n">${dn(c.NE)}</td><td class="n">${dn(c.N)}</td><td class="n">${pct(c.trava)}</td><td class="n">${n(c.k, 2)}</td></tr>`).join("") + `</tbody></table></div>`;
    html += `<h3>Fundamentos do deck × realizado ${ra.mes ? rot(ra.mes) : ""}</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th></th><th class="n">Modelo</th><th class="n">Realizado</th></tr></thead><tbody>` +
      FUND_CAMPOS.map(([f, t, u]) => `<tr><td>${t}${u ? ` (${u})` : ""}</td><td class="n">${fmtFund(mo[f], f)}</td><td class="n nen-ref">${fmtFund(ra[f], f)}</td></tr>`).join("") + `</tbody></table></div>`;
    if (re && re.se != null) html += `<p class="nen-ins-l">Realizado ${rot(re.mes)}: SE ${n(re.se, 1)} · NE ${dn(re.d_NE)} · N ${dn(re.d_N)} (PLD NE ${n(re.se + re.d_NE, 1)})</p>`;
    el.innerHTML = html;
  }
  const FUND_CAMPOS = [["renov_NE", "Renovável NE", "GW"], ["carga_NE", "Carga NE", "GW"], ["carga_N", "Carga N", "GW"], ["hidr_N", "Hidráulica N", "GW"], ["hidr_NE", "Hidráulica NE", "GW"],
    ["sobra", "Sobra NE", "GW"], ["lim_NE", "Limite de exportação NE", "GW"], ["folga", "Folga até o limite", "GW"], ["trava", "Horas travadas NE", ""], ["k", "Intensidade k", ""]];
  const fmtFund = (v, f) => (v == null || !isFinite(v) ? "—" : f === "trava" ? pct(v) : f === "k" ? n(v, 2) : dn(v, 1));

  // ================================================================ 1 · COT Cotação
  const ST = { fechar: false, justo: false, cotModo: "d", desModo: "d", choque: 10, choqueUn: "rs", fundSub: "NE", fundModo: "d",
    mapaMed: "pct", mapaIni: "2025", mapaNum: false, rTipo: "tri", rSub: "NE", aTipo: "tri", aSub: "NE",
    k: { tipo: "sem", sub: "NE", per: "2026-S1", deck: "", perda: false, justo: false }, d: { tipo: "semestre", per: "2026-S1", deck: "", fora: false } };
  const refAtual = () => (ST.fechar ? "ano" : "sozinho");

  function telaCOT(area) {
    decisaoViva(area, () => {
      const it = [];
      [[PROX.meses, PROX.rot], [ANO.meses, ANO.rot]].forEach(([ms, rt], j) => SUBS.forEach(sub => {
        const c = temCurva() ? cotar(ms, sub) : null;
        it.push({ r: `${sub} ${rt} · compra / venda`, v: c ? `${dn(c.compra)} / ${dn(c.venda)}` : "—", principal: j === 0 && sub === "NE",
          d: c ? `justo ${dn(c.justo)} · PLD ${n(c.se + c.compra, 1)} / ${n(c.se + c.venda, 1)}` : "informe a curva do SE" });
      }));
      return it;
    });
    avisoCurva(area);
    const g = Mesa.grade(area);
    painelCurva(g);
    painelVivo(g, { cod: "NEN-2", titulo: "Cotação por produto · NE e N", unidade: "R$/MWh", tam: "full", ajuda: "cv-telas", abas: [["d", "Descolamento"], ["pld", "PLD implícito"]], abasRotulo: "Medida",
      leg: "Cada célula: compra (em cima) e venda (embaixo); com Mostrar justo, o justo no meio, em itálico. Por padrão é o produto sozinho; Fechar o ano mostra a contribuição de cada pedaço para o preço do ano. Clique num valor: o descritivo abre no inspetor." },
      desenharCotacao);
    painelVivo(g, { cod: "NEN-3", titulo: "Resumo por produto", unidade: "R$/MWh", tam: "xl", ajuda: "cv-telas", abas: [["tri", "Trimestre"], ["sem", "Semestre"], ["ano", "Ano"], ["mes", "Mês"]], abasRotulo: "Produto",
      leg: "Compra: aceita-se comprar o descolamento (recebe o descolamento, paga P). Venda: aceita-se vender (paga o descolamento, recebe P). PLD implícito = SE + descolamento. Segue Fechar o ano e Mostrar justo do NEN-2. Nada aqui considera custos, liquidez nem saída antes do vencimento." },
      desenharResumo);
    painelVivo(g, { cod: "NEN-4", titulo: "Política de cotação", tam: "s", ajuda: "cv-risco" }, desenharPolitica);
    const av = mk("p", "nen-rodape", "<b>Leia antes de usar.</b> A cotação é só variabilidade entre anos climáticos, com a venda ancorada no realizado: <b>não inclui o erro do modelo</b>, o risco do SE, custos, liquidez nem saída antes do vencimento. No backtest (5 períodos de trimestre), sem a âncora a venda do NE perdeu em 27% dos períodos; com ela, em 0%, mas a regra foi escolhida depois de ver os dados e a amostra é pequena. Ponto de partida para discussão. Dados fictícios. O swap (oculto no app) não está nesta mesa: ver MET.");
    area.append(av);
  }
  function avisoCurva(area) {
    const box = mk("div", "nen-aviso"); area.append(box);
    const pintar = () => {
      box.hidden = !EXEMPLO && temCurva();
      box.innerHTML = EXEMPLO
        ? `<b>Curva de exemplo fictícia:</b> SE plano de R$ ${SE_EXEMPLO}/MWh em todos os anos, só para a tela abrir preenchida. Para cotar, digite o SE da mesa no NEN-1 (ano, semestre, trimestre ou mês; pode colar uma linha do Excel) ou use “Todos os anos” e Aplicar. A curva digitada fica salva neste navegador.`
        : `<b>Curva do SE vazia:</b> sem preço do SE não há cotação. Digite o SE no NEN-1 ou clique em “Exemplo R$ ${SE_EXEMPLO}”.`;
    };
    pintar(); REDESENHAR.push(pintar);
  }
  function painelCurva(g) {
    const p = Mesa.painel(g, { cod: "NEN-1", titulo: "Curva do Sudeste", unidade: "R$/MWh", tam: "full", ajuda: "d-curva", fonte: premissas(),
      leg: "Informe o PLD médio do SE no nível em que tiver preço: ano, semestre, trimestre ou mês. Vale o nível mais específico; os demais períodos do mesmo ano são derivados (em cinza) para fechar a média ponderada por horas. Âmbar = digitado. Pode colar uma linha do Excel em qualquer campo." });
    const b = barra(p.corpo);
    const estado = mk("span", "nen-estado"); b.append(estado);
    const todos = mk("label", "nen-sel", `<span>Todos os anos</span><input class="nen-in" inputmode="decimal" placeholder="R$" aria-label="SE para todos os anos" value="${EXEMPLO ? SE_EXEMPLO : ""}">`);
    b.append(todos);
    const inTodos = todos.querySelector("input");
    const aplicar = () => { const v = parseNum(inTodos.value); if (v == null) return; ENT = Object.fromEntries(CONTA.ANOS.map(y => [`A${y}`, v])); salvarCurva(); };
    inTodos.addEventListener("keydown", e => { if (e.key === "Enter") aplicar(); });
    botao(b, "Aplicar", aplicar, "prim");
    botao(b, "Limpar", () => { ENT = {}; salvarCurva(); });
    botao(b, `Exemplo R$ ${SE_EXEMPLO}`, () => { inTodos.value = SE_EXEMPLO; voltarAoExemplo(); });
    b.append(mk("span", "nen-r", "Dentro do período:"));
    const gs = grupoAbas(b, "Forma da curva dentro do período", [["plana", "plana"], ["hist", "sazonalidade do SE"]], SAZM, v => { SAZM = v; salvarCurva(); });
    const SEP = new Set([0, 1, 3, 7]);
    let html = `<thead><tr><th>SE</th>${["Ano", "1º sem", "2º sem", "T1", "T2", "T3", "T4", ...MES].map((t, j) => `<th class="n${SEP.has(j) ? " nen-sep" : ""}">${t}</th>`).join("")}</tr></thead><tbody>`;
    PER.forEach(a => {
      const inp = (k, ok, j) => `<td class="${SEP.has(j) ? "nen-sep" : ""}"><input class="nen-in" inputmode="decimal" data-k="${k}"${ok ? "" : " disabled"} aria-label="SE ${ok ? rotuloChave(k) : ""}"></td>`;
      const ks = [[a.k, true], ...a.S.map(s => [s.k, s.meses.length > 0]), ...a.T.map(t => [t.k, t.meses.length > 0]),
        ...MES.map((m, i) => { const pp = `${a.y}-${String(i + 1).padStart(2, "0")}`; return [`M${pp}`, IDX[pp] != null]; })];
      html += `<tr><th scope="row">${a.rot}</th>${ks.map(([k, ok], j) => inp(k, ok, j)).join("")}</tr>`;
    });
    const box = tabela(p.corpo, html + "</tbody>", "nen-curva");
    const avisos = mk("div", "nen-avisos"); p.corpo.append(avisos);
    const ins = [...box.querySelectorAll("input[data-k]")];
    ins.forEach(i => {
      i.addEventListener("change", () => { const v = parseNum(i.value); if (v == null) delete ENT[i.dataset.k]; else ENT[i.dataset.k] = v; salvarCurva(); });
      i.addEventListener("paste", ev => {
        const txt = (ev.clipboardData || window.clipboardData).getData("text"); if (!/[\t\n]/.test(txt.trim())) return;
        ev.preventDefault();
        const vals = txt.trim().split(/[\t\n\r]+/).map(parseNum), vivos = ins.filter(x => !x.disabled);
        let j = vivos.indexOf(i);
        vals.forEach(v => { const alvo = vivos[j++]; if (!alvo) return; if (v == null) delete ENT[alvo.dataset.k]; else ENT[alvo.dataset.k] = v; });
        salvarCurva();
      });
    });
    const pintar = () => {
      ins.forEach(i => {
        const k = i.dataset.k, inf = RSV.info[k], dig = ENT[k] != null;
        if (document.activeElement !== i) i.value = dig ? n(ENT[k], 2).replace(/,00$/, "") : "";
        i.placeholder = !dig && inf && inf.v != null ? n(inf.v, 1) : "";
        i.classList.toggle("dig", dig);
        i.classList.toggle("alerta", !!(inf && inf.v != null && inf.v < META.piso));
      });
      gs.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === SAZM)));
      estado.className = "nen-estado" + (EXEMPLO ? " ex" : "");
      estado.textContent = EXEMPLO ? "Exemplo fictício" : temCurva() ? "Curva da mesa · salva" : "Curva vazia";
      const L = [...new Set(RSV.avisos.map(textoAviso))].slice(0, 6);
      avisos.innerHTML = L.map(a => `<span>⚠ ${a}</span>`).join("") +
        `<span class="leg">Dentro de cada período sem preço próprio a curva é ${SAZM === "hist" ? `distribuída pela sazonalidade média do SE (${PD.sazonal_se.anos[0]}–${PD.sazonal_se.anos.at(-1)}, instável entre anos)` : "plana"}.</span>`;
    };
    pintar(); REDESENHAR.push(pintar);
  }
  function desenharCotacao(p, modo) {
    ST.cotModo = modo;
    const b = barra(p.corpo);
    chave(b, "Fechar o ano", ST.fechar, v => { ST.fechar = v; redesenharTudo(); }, "Contribuição de cada pedaço para o preço do ano, em vez do produto sozinho");
    chave(b, "Mostrar justo", ST.justo, v => { ST.justo = v; redesenharTudo(); });
    botao(b, "Conferir o ano", () => Mesa.inspecionar("Conferir o ano · compra", el => conferirAno(el, modo)));
    if (!temCurva()) { p.corpo.append(semCurva()); return; }
    const pld = modo === "pld", f = (v, se) => (pld ? n(v + se, 1) : dn(v)), ref = refAtual(), CEL = [];
    const SEP = new Set([0, 1, 3, 7]);
    const colunas = a => [[a.rot, a.meses, "nen-ano"], ...a.S.map(x => [x.rot, x.meses, ""]), ...a.T.map(x => [x.rot, x.meses, ""]),
      ...MES.map((m, i) => { const pp = `${a.y}-${String(i + 1).padStart(2, "0")}`; return [rot(pp), IDX[pp] != null ? [pp] : [], ""]; })];
    let html = `<thead><tr><th>Produto</th>${["Ano", "1º sem", "2º sem", "T1", "T2", "T3", "T4", ...MES].map((t, j) => `<th class="n${SEP.has(j) ? " nen-sep" : ""}">${t}</th>`).join("")}</tr></thead><tbody>`;
    SUBS.forEach((sub, si) => PER.forEach((a, ai) => {
      html += `<tr class="${si > 0 && ai === 0 ? "nen-grupo" : ""}"><th scope="row" class="nen-rot"><i style="background:${COR[sub]}"></i>${sub} ${a.rot}</th>` + colunas(a).map(([rt, ms, cls], j) => {
        const sep = SEP.has(j) ? " nen-sep" : "";
        if (!ms.length) return `<td class="nen-vz${sep}"></td>`;
        const r = linha(rt, ms, sub, ref);
        if (!r) return `<td class="n${sep}">—</td>`;
        const i = CEL.push({ r, sub }) - 1;
        return `<td class="n nen-cv ${cls}${sep}"><button type="button" data-i="${i}" data-l="compra">${f(r.compra, r.se)}</button>${ST.justo ? `<i>${f(r.justo, r.se)}</i>` : ""}<button type="button" data-i="${i}" data-l="venda">${f(r.venda, r.se)}</button></td>`;
      }).join("") + "</tr>";
    }));
    PER.forEach((a, ai) => {
      html += `<tr class="nen-linse${ai === 0 ? " nen-grupo" : ""}"><th scope="row">SE ${a.rot}</th>` + colunas(a).map(([, ms], j) => {
        const gg = precificado(ms) ? agregar(ms) : null; return `<td class="n${SEP.has(j) ? " nen-sep" : ""}">${gg ? n(gg.se, 0) : ""}</td>`;
      }).join("") + "</tr>";
    });
    const box = tabela(p.corpo, html + "</tbody>", "nen-cot");
    box.querySelectorAll("button[data-i]").forEach(bt => {
      const { r, sub } = CEL[+bt.dataset.i], lado = bt.dataset.l, nome = lado === "compra" ? "Compra" : "Venda";
      dicaEm(bt, `<b>${nome} · ${sub} ${r.rot}</b><br>${f(r[lado], r.se)} R$/MWh${ST.fechar && r.contrib && r.ms.length < 12 ? " (contribuição no ano)" : ""} · SE ${n(r.se, 1)}<br>clique para o descritivo`);
      Mesa.alvo(bt, `${nome} · ${sub} ${r.rot}`, el => descritivo(el, r, sub, lado, modo));
    });
  }
  function desenharResumo(p, tipo) {
    const b = barra(p.corpo);
    const aviso = mk("span", "leg");
    const ref = refAtual(), nc = ST.justo ? 3 : 2;
    const L = produtos(tipo).map(pr => ({ pr, cs: { NE: temCurva() ? linha(pr.rot, pr.meses, "NE", ref) : null, N: temCurva() ? linha(pr.rot, pr.meses, "N", ref) : null } })).filter(x => x.cs.NE || x.cs.N);
    botao(b, "Copiar tabela", () => {
      const cab = ["produto", "SE"]; ["desc_NE", "desc_N", "PLD_NE", "PLD_N"].forEach(gr => ["compra", "justo", "venda"].forEach(k => cab.push(`${gr}_${k}`)));
      const lin = L.map(({ pr, cs }) => { const c0 = cs.NE || cs.N, bl = (sub, pld) => { const x = cs[sub]; return x ? ["compra", "justo", "venda"].map(k => xl(x[k] + (pld ? x.se : 0))) : ["", "", ""]; };
        return [pr.rot, xl(c0.se), ...bl("NE", false), ...bl("N", false), ...bl("NE", true), ...bl("N", true)].join("\t"); });
      copiar([cab.join("\t"), ...lin].join("\n"), aviso);
    });
    b.append(aviso);
    if (!L.length) { p.corpo.append(semCurva()); return; }
    const GR = [["Descolamento NE", "NE", false], ["Descolamento N", "N", false], ["PLD implícito NE", "NE", true], ["PLD implícito N", "N", true]];
    const CEL = [];
    let html = `<thead><tr><th rowspan="2">Produto</th><th rowspan="2" class="n">SE</th>${GR.map(([t, sub]) => `<th class="n nen-sep" colspan="${nc}" style="color:${COR[sub]}">${t}</th>`).join("")}</tr><tr>` +
      GR.map(() => `<th class="n nen-sep">Compra</th>${ST.justo ? `<th class="n">Justo</th>` : ""}<th class="n">Venda</th>`).join("") + `</tr></thead><tbody>`;
    L.forEach(({ pr, cs }) => {
      const c0 = cs.NE || cs.N;
      html += `<tr class="${pr.parcial ? "nen-parcial" : ""}"><th scope="row">${pr.rot}${pr.parcial ? "*" : ""}</th><td class="n nen-ref">${n(c0.se, 1)}</td>` + GR.map(([, sub, pld]) => {
        const c = cs[sub]; if (!c) return `<td class="n nen-sep">—</td>${ST.justo ? "<td></td>" : ""}<td class="n">—</td>`;
        const f = v => (pld ? n(v + c.se, 1) : dn(v));
        const cel = (lado, sep) => { if (pld) return `<td class="n${sep}">${f(c[lado])}</td>`; const i = CEL.push({ r: c, sub, lado }) - 1; return `<td class="n${sep}"><button type="button" class="nen-val" data-i="${i}">${f(c[lado])}</button></td>`; };
        return cel("compra", " nen-sep") + (ST.justo ? `<td class="n nen-j">${f(c.justo)}</td>` : "") + cel("venda", "");
      }).join("") + "</tr>";
    });
    const box = tabela(p.corpo, html + "</tbody>", "nen-res");
    box.querySelectorAll("button[data-i]").forEach(bt => { const { r, sub, lado } = CEL[+bt.dataset.i];
      Mesa.alvo(bt, `${lado === "compra" ? "Compra" : "Venda"} · ${sub} ${r.rot}`, el => descritivo(el, r, sub, lado, "d")); });
    if (L.some(x => x.pr.parcial)) p.corpo.append(mk("p", "leg", "* Período parcial: só parte dos meses está no horizonte."));
  }
  function desenharPolitica(p) {
    const desc = !mesmosParametros() ? "Parâmetros alterados: só o λ = 1 com a âncora foi testado como política."
      : EST.ancora ? "Compra no pior ano climático do modelo (λ = 1). Venda no maior valor entre o melhor ano do modelo e o maior descolamento já realizado naquele mês (em fração da folga do SE informado), mês a mês."
        : "Compra no pior ano climático e venda no melhor ano do modelo (λ = 1), sem olhar o realizado. No backtest, a venda do NE perdeu em 27% dos períodos assim.";
    p.corpo.append(mk("div", "nen-pol", `<span class="selo ${nomePolitica() === "Conservador" ? "usar" : "cenario"}">${nomePolitica()}</span><p class="leg">${desc}</p>`));
    const b = barra(p.corpo);
    chave(b, "Ancorar a venda no realizado do mês", EST.ancora, v => { EST.ancora = v; salvarEst(); }, "Maior descolamento já realizado no mês do calendário, em fração da folga");
    if (!(mesmosParametros() && EST.ancora)) botao(b, "Voltar ao Conservador", () => { EST = copia(CONSERVADOR); salvarEst(); });
    const box = tabela(p.corpo, `<thead><tr><th></th><th class="n">p (%)</th><th class="n">α (%)</th><th class="n">λ (0 a 1)</th></tr></thead><tbody>` +
      [["compra", "Compra"], ["venda", "Venda"]].map(([l, t]) => `<tr><th scope="row">${t}</th>${[["p", 100], ["alfa", 100], ["lam", 1]].map(([k, esc]) =>
        `<td class="n"><input class="nen-in" inputmode="decimal" data-l="${l}" data-k="${k}" value="${n(EST[l][k] * esc, esc === 1 ? 2 : 0)}" aria-label="${k === "lam" ? "λ" : k === "alfa" ? "α" : "p"} da ${l}"></td>`).join("")}</tr>`).join("") + `</tbody>`, "nen-par");
    box.querySelectorAll("input").forEach(i => i.addEventListener("change", () => {
      const v = parseNum(i.value), k = i.dataset.k, esc = k === "lam" ? 1 : 100; if (v == null) { p.re(); return; }
      EST[i.dataset.l][k] = Math.min(k === "lam" ? 1 : 0.5, Math.max(k === "lam" ? 0 : 0.01, v / esc)); salvarEst();
    }));
    p.corpo.append(mk("p", "leg", "<b>p</b> = probabilidade de perda tolerada; <b>α</b> = fatia dos piores anos observada; <b>λ</b> = fração da perda média nessa fatia descontada do preço (λ = 1 leva a compra ao pior ano). Cada lado usa o mais conservador dos dois critérios."));
  }

  // ================================================================ 2 · DES Descolamento
  function telaDES(area) {
    decisaoViva(area, () => {
      const ga = temCurva() && precificado(ANO.meses) ? agregar(ANO.meses) : null, gp = temCurva() && precificado(PROX.meses) ? agregar(PROX.meses) : null;
      const s1 = ANO.S[0], g1 = temCurva() && precificado(s1.meses) ? agregar(s1.meses) : null;
      return [
        { r: `NE ${ANO.rot} · preço justo`, v: ga ? dn(ga.NE) : "—", d: ga ? `faixa ${dn(ga.NEmin)} a ${dn(ga.NEmax)} · PLD ${n(ga.se + ga.NE, 1)}` : "sem curva", principal: true },
        { r: `N ${ANO.rot} · preço justo`, v: ga ? dn(ga.N) : "—", d: ga ? `faixa ${dn(ga.Nmin)} a ${dn(ga.Nmax)} · PLD ${n(ga.se + ga.N, 1)}` : "" },
        { r: `NE ${s1.rot} · preço justo`, v: g1 ? dn(g1.NE) : "—", d: g1 ? `trava ${pct(g1.trava)} das horas · N ${dn(g1.N)}` : "" },
        { r: `NE ${PROX.rot} · preço justo`, v: gp ? dn(gp.NE) : "—", d: gp ? `faixa ${dn(gp.NEmin)} a ${dn(gp.NEmax)} · N ${dn(gp.N)}` : "" },
        { r: `Horas travadas NE ${ANO.rot}`, v: ga ? pct(ga.trava) : "—", d: ga ? `SE médio ${n(ga.se, 1)}` : "" },
      ];
    });
    const g = Mesa.grade(area);
    painelVivo(g, { cod: "NEN-5", titulo: "Descolamento previsto por mês", unidade: "R$/MWh", tam: "l", ajuda: "d-produto", abas: [["NE", "NE"], ["N", "N"]], abasRotulo: "Submercado",
      leg: "Média ponderada dos cenários climáticos; faixa = cenário mais e menos descolado em cada mês. Clique num mês: cenários, fundamentos e o realizado no inspetor." }, desenharPorMes);
    painelVivo(g, { cod: "NEN-6", titulo: "Preço justo por produto", unidade: "R$/MWh", tam: "l", ajuda: "d-produto", abas: [["mes", "Mês"], ["tri", "Trimestre"], ["sem", "Semestre"], ["ano", "Ano"]], abasRotulo: "Produto",
      leg: "Justo = média ponderada dos cenários; embaixo, a faixa mínimo–máximo (cada cenário agregado no período). Descolamento negativo = NE/N abaixo do SE. Clique numa linha: cada ano climático no inspetor." }, desenharJusto);
    painelVivo(g, { cod: "NEN-7", titulo: "Choque no PLD do SE", unidade: "R$/MWh", tam: "l", ajuda: "d-choque",
      leg: "O choque vale para a curva do SE informada, em todos os meses. A resposta não é simétrica: com o SE perto do piso, um choque para baixo zera o descolamento em várias horas; ela muda com a hora em que o NE trava e com o semestre." }, desenharChoque);
    painelVivo(g, { cod: "NEN-8", titulo: "Descolamento conforme o nível do SE", unidade: "R$/MWh", tam: "l", ajuda: "d-choque", fixo: false,
      leg: "Derivado do modelo: o justo de cada produto se o SE fosse plano no nível do eixo (todos os meses iguais). Mostra onde o descolamento acelera; a linha vertical marca o SE médio da curva atual no ano." }, desenharNivel);
  }
  function desenharPorMes(p, sub) {
    const b = barra(p.corpo);
    grupoAbas(b, "Medida", [["d", "Descolamento"], ["pld", "PLD implícito"]], ST.desModo, v => { ST.desModo = v; p.re(); });
    const pld = ST.desModo === "pld";
    b.append(mk("span", null, QC.legenda(pld ? [["var(--accent)", `PLD ${sub} justo`, "l"], ["var(--faixa-proj)", "Faixa entre cenários"], ["var(--ink-3)", "SE informado", "l"], ["var(--ink-3)", "Piso", "t"]]
      : [["var(--accent)", "Preço justo", "l"], ["var(--faixa-proj)", "Faixa entre cenários (mín–máx)"]])));
    const ms = M.map(m => m.mes).filter(q => RES[q]);
    if (!ms.length) { p.corpo.append(semCurva()); return; }
    grafico(p.corpo, (svg, w, h) => {
      const mg = { l: 48, r: 12, t: 14, b: 26 };
      const val = q => (pld ? RES[q].se + RES[q][sub] : RES[q][sub]);
      const lo = q => (pld ? RES[q].se : 0) + RES[q][sub + "min"], hi = q => (pld ? RES[q].se : 0) + RES[q][sub + "max"];
      let vals = ms.flatMap(q => [lo(q), hi(q), val(q)]); if (pld) vals = vals.concat(ms.map(q => RES[q].se), [M[0].piso]); else vals.push(0);
      const e = eixo(Math.min(...vals), Math.max(...vals), 5);
      const X = i => mg.l + (ms.length === 1 ? 0.5 : i / (ms.length - 1)) * (w - mg.l - mg.r), Y = v => mg.t + (h - mg.t - mg.b) * (1 - (v - e.a) / (e.b - e.a));
      e.t.forEach(t => { S(svg, "line", { x1: mg.l, x2: w - mg.r, y1: Y(t), y2: Y(t), stroke: "var(--rule)" }); S(svg, "text", { x: mg.l - 6, y: Y(t) + 3, "text-anchor": "end" }, dn(t, 0)); });
      S(svg, "polygon", { points: [...ms.map((q, i) => `${X(i)},${Y(hi(q))}`), ...ms.map((q, i) => `${X(i)},${Y(lo(q))}`).reverse()].join(" "), fill: "var(--faixa-proj)" });
      if (pld) {
        S(svg, "line", { x1: mg.l, x2: w - mg.r, y1: Y(M[0].piso), y2: Y(M[0].piso), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
        S(svg, "polyline", { points: ms.map((q, i) => `${X(i)},${Y(RES[q].se)}`).join(" "), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.4 });
      } else S(svg, "line", { x1: mg.l, x2: w - mg.r, y1: Y(0), y2: Y(0), stroke: "var(--ink-3)" });
      S(svg, "polyline", { points: ms.map((q, i) => `${X(i)},${Y(val(q))}`).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2.2 });
      ms.forEach((q, i) => S(svg, "circle", { cx: X(i), cy: Y(val(q)), r: 2.6, fill: "var(--accent)" }));
      rotulosX(svg, ms.map((_, i) => i), X, h - 8, i => rot(ms[i]), 40);
      const guia = S(svg, "line", { x1: 0, x2: 0, y1: mg.t, y2: h - mg.b, stroke: "var(--ink-2)", opacity: 0 });
      const dx = (w - mg.l - mg.r) / Math.max(ms.length - 1, 1);
      ms.forEach((q, i) => {
        const r = RES[q], alvo = S(svg, "rect", { x: X(i) - dx / 2, y: mg.t, width: dx, height: h - mg.t - mg.b, fill: "transparent", style: "cursor:pointer" });
        dicaEm(alvo, () => {
          guia.setAttribute("x1", X(i)); guia.setAttribute("x2", X(i)); guia.setAttribute("opacity", 0.5);
          const fm = (FUNDM[q] || {}).mod || {}, re = M[IDX[q]].real, base = pld ? r.se : 0, fmt = v => (pld ? n(v, 1) : dn(v));
          const ext = [...r.cen].sort((a, c) => a[sub] - c[sub]);
          let t = `<b>${rot(q)}</b> · SE ${n(r.se, 1)}<br>${pld ? "PLD " : ""}${sub} ${fmt(base + r[sub])} · faixa ${fmt(base + r[sub + "min"])} a ${fmt(base + r[sub + "max"])}`;
          t += mesN(q) <= 6 ? `<br>Por quê (NE): trava ${pct(r.trava)} das horas · k ${n(fm.k, 2)}<br>sobra NE ${dn(fm.sobra)} GW · hidráulica N ${n(fm.hidr_N, 1)} GW`
            : `<br>Por quê (NE): trava ${pct(r.trava)} das horas · k ${n(fm.k, 2)}<br>folga até o limite ${n(fm.folga, 1)} GW`;
          if (re && re.se != null && re["d_" + sub] != null) t += `<br>Realizado ${rot(re.mes)}: SE ${n(re.se, 1)} · ${pld ? "PLD " + sub + " " + n(re.se + re["d_" + sub], 1) : sub + " " + dn(re["d_" + sub])}`;
          if (ext.length > 1) t += `<br>Mais descolado ${ext[0].id.split("|")[0]} · menos ${ext.at(-1).id.split("|")[0]}<br><i>clique para o detalhe</i>`;
          return t;
        });
        alvo.addEventListener("pointerleave", () => guia.setAttribute("opacity", 0));
        alvo.addEventListener("click", () => Mesa.inspecionar(`${rot(q)} · cenários e fundamentos`, el => mesDetalhe(el, q)));
      });
    }, "alto", `${pld ? "PLD implícito" : "Descolamento"} do ${sub} por mês`);
    p.corpo.append(mk("p", "leg", pld ? "PLD implícito = SE informado + descolamento. Piso do ano do deck." : `Descolamento do ${sub} = PLD do ${sub} − PLD do SE.`));
  }
  function desenharJusto(p, tipo) {
    const b = barra(p.corpo), aviso = mk("span", "leg");
    const L = produtos(tipo).map(pr => ({ ...pr, g: precificado(pr.meses) ? agregar(pr.meses) : null }));
    botao(b, "Copiar tabela", () => copiar([["periodo", "SE", "NE_justo", "NE_min", "NE_max", "N_justo", "N_min", "N_max", "PLD_NE", "PLD_N", "horas_travadas_NE"].join("\t"),
      ...L.filter(x => x.g).map(({ rot: r, g }) => [r, xl(g.se), xl(g.NE), xl(g.NEmin), xl(g.NEmax), xl(g.N), xl(g.Nmin), xl(g.Nmax), xl(g.se + g.NE), xl(g.se + g.N), xl(g.trava)].join("\t"))].join("\n"), aviso));
    b.append(aviso);
    if (!temCurva()) { p.corpo.append(semCurva()); return; }
    const fx = (g, s) => (g[s + "min"] != null ? `<span class="nen-fx">${dn(g[s + "min"])} a ${dn(g[s + "max"])}</span>` : "");
    const box = tabela(p.corpo, `<thead><tr><th>Período</th><th class="n">SE</th><th class="n" style="color:${COR.NE}">NE justo</th><th class="n" style="color:${COR.N}">N justo</th><th class="n">PLD NE</th><th class="n">PLD N</th><th class="n">Trava NE</th></tr></thead><tbody>` +
      L.map((x, i) => (x.g ? `<tr data-i="${i}" class="${x.parcial ? "nen-parcial" : ""}"><th scope="row">${x.rot}${x.parcial ? "*" : ""}</th><td class="n">${n(x.g.se, 1)}</td><td class="n"><b>${dn(x.g.NE)}</b>${fx(x.g, "NE")}</td><td class="n"><b>${dn(x.g.N)}</b>${fx(x.g, "N")}</td>` +
        `<td class="n">${n(x.g.se + x.g.NE, 1)}</td><td class="n">${n(x.g.se + x.g.N, 1)}</td><td class="n">${pct(x.g.trava)}</td></tr>` : `<tr><th scope="row">${x.rot}</th><td class="n" colspan="6">informe o SE</td></tr>`)).join("") + `</tbody>`, "nen-lista", true);
    box.querySelectorAll("tr[data-i]").forEach(tr => { const x = L[+tr.dataset.i]; Mesa.alvo(tr, `Preço justo · ${x.rot}`, el => justoDetalhe(el, x)); });
    if (L.some(x => x.parcial)) p.corpo.append(mk("p", "leg", "* Período parcial: só parte dos meses está no horizonte."));
  }
  function desenharChoque(p) {
    const b = barra(p.corpo);
    const lab = mk("label", "nen-sel", `<span>Choque de</span><input class="nen-in" inputmode="decimal" value="${n(ST.choque)}" aria-label="Tamanho do choque">`); b.append(lab);
    const ga = grupoAbas(b, "Unidade do choque", [["rs", "R$/MWh"], ["pct", "% do SE"]], ST.choqueUn, v => { ST.choqueUn = v; tab(); });
    const at = grupoAbas(b, "Atalhos", [["-30", "−30"], ["-10", "−10"], ["10", "+10"], ["30", "+30"]], ST.choqueUn === "rs" ? String(ST.choque) : "", v => {
      ST.choque = +v; ST.choqueUn = "rs"; lab.querySelector("input").value = n(ST.choque); ga.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === "rs"))); tab(); });
    lab.querySelector("input").addEventListener("input", e => { const v = parseNum(e.target.value); if (v == null) return; ST.choque = v;
      at.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(ST.choqueUn === "rs" && +x.dataset.v === v))); tab(); });
    const corpo = mk("div"); p.corpo.append(corpo);
    function tab() {
      corpo.replaceChildren();
      if (!temCurva()) { corpo.append(semCurva()); return; }
      const aj = ST.choqueUn === "pct" ? x => x * (1 + ST.choque / 100) : x => x + ST.choque, ch = CONTA.calcular(RSV.se, aj);
      const anos = produtos("ano"), sems = produtos("sem");
      const L = anos.flatMap(a => [a, ...sems.filter(x => x.meses.every(q => a.meses.includes(q)) && x.meses.length < a.meses.length)]);
      tabela(corpo, `<thead><tr><th>Período</th><th class="n">Δ NE</th><th class="n">Δ N</th><th class="n nen-sep">SE base</th><th class="n">SE choque</th><th class="n nen-sep">NE base</th><th class="n">NE choque</th><th class="n nen-sep">N base</th><th class="n">N choque</th></tr></thead><tbody>` +
        L.map(pr => { const a = precificado(pr.meses) ? agregar(pr.meses) : null, c = a ? CONTA.agregar(ch, pr.meses) : null; if (!a || !c) return "";
          return `<tr class="${pr.parcial ? "nen-parcial" : ""}"><th scope="row">${anos.includes(pr) ? `<b>${pr.rot}</b>` : `&nbsp;&nbsp;${pr.rot}`}</th><td class="n nen-delta"><b>${sn(c.NE - a.NE, 2)}</b></td><td class="n nen-delta"><b>${sn(c.N - a.N, 2)}</b></td>` +
            `<td class="n nen-sep">${n(a.se, 1)}</td><td class="n">${n(c.se, 1)}</td><td class="n nen-sep">${dn(a.NE)}</td><td class="n">${dn(c.NE)}</td><td class="n nen-sep">${dn(a.N)}</td><td class="n">${dn(c.N)}</td></tr>`; }).join("") + `</tbody>`, "nen-lista");
    }
    tab();
  }
  const NIVEIS = (() => { const L = []; for (let v = 60; v <= 420; v += 10) L.push(v); return L; })();
  let CURVAS_NIVEL = null;
  function curvasNivel() {
    if (CURVAS_NIVEL) return CURVAS_NIVEL;
    const prods = [[`NE ${ANO.rot}`, ANO.meses, "NE", "var(--accent)", 2.6], [`NE ${ANO.S[0].rot}`, ANO.S[0].meses, "NE", "var(--sm-ne)", 1.6], [`NE ${ANO.S[1].rot}`, ANO.S[1].meses, "NE", "var(--ink-2)", 1.6],
      [`NE ${PROX.rot}`, PROX.meses, "NE", "var(--ink-3)", 1.4], [`N ${ANO.rot}`, ANO.meses, "N", "var(--sm-n)", 2, true]];
    const res = NIVEIS.map(v => CONTA.calcular(Object.fromEntries(M.map(m => [m.mes, v]))));
    CURVAS_NIVEL = prods.map(([nome, ms, sub, cor, larg, tr]) => ({ nome, cor, larg, tracejado: !!tr, semPonto: true, v: res.map(r => CONTA.agregar(r, ms)[sub]) }));
    return CURVAS_NIVEL;
  }
  function desenharNivel(p) {
    const series = curvasNivel();
    p.corpo.append(mk("div", null, QC.legenda(series.map(s => [s.cor, s.nome, s.tracejado ? "t" : "l"]))));
    const seA = temCurva() && precificado(ANO.meses) ? agregar(ANO.meses).se : null;
    const iA = seA == null ? null : NIVEIS.reduce((b, v, i) => (Math.abs(v - seA) < Math.abs(NIVEIS[b] - seA) ? i : b), 0);
    grafico(p.corpo, (svg, W, H) => linhas(svg, W, H, { n: NIVEIS.length, series, zero: true, fmt: v => dn(v), rotX: i => (NIVEIS[i] % 60 === 0 ? n(NIVEIS[i]) : null),
      titX: i => `SE plano R$ ${n(NIVEIS[i])}/MWh`, marca: iA == null ? null : { i: iA, rot: `curva ${n(seA, 0)}` }, refs: [] }), null, "Descolamento conforme o nível do SE");
    p.corpo.append(mk("p", "leg", `Eixo X: SE plano, R$/MWh (piso ${n(META.piso, 2)}). Abaixo do piso mais a folga mínima o NE não tem como descolar.`));
  }

  // ================================================================ 3 · FUN Fundamentos do deck e realizado
  const FUND = [["renov_NE", "Renovável do NE", "GW", 1], ["carga_NE", "Carga do NE", "GW", 1], ["carga_N", "Carga do N", "GW", 1],
    ["hidr_N", "Hidráulica do N", "GW", 1], ["sobra", "Sobra NE (renov. − carga)", "GW", 1], ["lim_NE", "Limite de exportação NE", "GW", 1],
    ["folga", "Folga até o limite", "GW", 1], ["trava", "Horas travadas NE", "%", 100], ["k", "Intensidade k (quando trava)", "", 1]];
  const COLS_FUND = [["renov_NE", 1, "Renov. NE"], ["carga_NE", 1, "Carga NE"], ["carga_N", 1, "Carga N"], ["hidr_N", 1, "Hidr. N"], ["hidr_NE", 1, "Hidr. NE"], ["sobra", 1, "Sobra NE"],
    ["lim_NE", 1, "Lim. exp."], ["folga", 1, "Folga"], ["trava", "%", "Trava"], ["k", 2, "k NE"]];
  function telaFUN(area) {
    const f0 = FP.mes[0], fa = FP.ano.find(x => x.rot === ANO.rot) || FP.ano.at(-1), ult = HP.reduce((a, b) => (b.ano > a.ano ? b : a));
    Mesa.decisao(area, [
      { r: `Horas travadas NE ${f0.rot}`, v: pct(f0.mod.trava), d: `realizado ${rot(f0.refs[0])}: ${pct(f0.rea.trava)}`, principal: true },
      { r: `Intensidade k NE ${f0.rot}`, v: n(f0.mod.k, 2), d: `realizado ${rot(f0.refs[0])}: ${n(f0.rea.k, 2)}` },
      { r: `Horas travadas NE ${fa.rot}`, v: pct(fa.mod.trava), d: `folga até o limite ${n(fa.mod.folga, 1)} GW` },
      { r: `Sobra NE ${fa.rot}`, v: `${dn(fa.mod.sobra)} GW`, d: `realizado: ${dn(fa.rea.sobra)} GW` },
      { r: `Realizado NE ${ult.rot}`, v: dn(ult.A.d_NE), d: `SE ${n(ult.A.SE, 1)} · N ${dn(ult.A.d_N)}` },
    ]);
    const g = Mesa.grade(area);
    const p9 = Mesa.painel(g, { cod: "NEN-9", titulo: "Fundamentos do deck por mês", unidade: "média dos cenários", tam: "full", ajuda: "f-deck",
      leg: "Insumos do modelo por mês: projeção do deck (linha) e último realizado do mesmo mês do calendário (pontos). Explicam o descolamento e não dependem da curva do SE. Clique num mês: todos os fundamentos no inspetor." });
    p9.corpo.append(mk("div", null, QC.legenda([["var(--accent)", "Modelo (projeção do deck)", "l"], ["var(--ink)", "Último realizado do mesmo mês"]])));
    const box = mk("div", "nen-mult5"); p9.corpo.append(box);
    const serie = FP.serie;
    FUND.forEach(([f, tit, un, esc]) => {
      const d = mk("div", "mini", `<div class="ttl">${tit}<span>${un}</span></div>`); box.append(d);
      grafico(d, (svg, w, h) => {
        const mg = { l: 30, r: 6, t: 6, b: 16 };
        const ms = serie.map(x => x.mes), mod = serie.map(x => x.mod[f] * esc), rea = f === "k" ? serie.map(() => null) : serie.map(x => (x.rea && x.rea[f] != null ? x.rea[f] * esc : null));
        const vs = [...mod, ...rea].filter(v => v != null && isFinite(v)); if (!vs.length) return;
        if (f === "sobra") vs.push(0);
        const e = eixo(Math.min(...vs), Math.max(...vs), 3);
        const X = i => mg.l + i / (ms.length - 1) * (w - mg.l - mg.r), Y = v => mg.t + (h - mg.t - mg.b) * (1 - (v - e.a) / (e.b - e.a));
        const passoE = (e.t[1] - e.t[0]) || 1, casas = passoE < 0.1 ? 2 : passoE < 1 ? 1 : 0;
        e.t.forEach(t => { S(svg, "line", { x1: mg.l, x2: w - mg.r, y1: Y(t), y2: Y(t), stroke: "var(--rule)" }); S(svg, "text", { x: mg.l - 4, y: Y(t) + 3, "text-anchor": "end" }, dn(t, casas)); });
        S(svg, "polyline", { points: mod.map((v, i) => `${X(i)},${Y(v)}`).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 1.8 });
        rea.forEach((v, i) => { if (v != null) S(svg, "circle", { cx: X(i), cy: Y(v), r: 2.4, fill: "var(--ink)" }); });
        ms.forEach((q, i) => {
          if (/-(01|07)$/.test(q)) S(svg, "text", { x: X(i), y: h - 3, "text-anchor": "middle" }, rot(q));
          const dxm = (w - mg.l - mg.r) / Math.max(ms.length - 1, 1), alvo = S(svg, "rect", { x: X(i) - dxm / 2, y: mg.t, width: dxm, height: h - mg.t - mg.b, fill: "transparent", style: "cursor:pointer" });
          const r = serie[i].rea;
          dicaEm(alvo, `<b>${rot(q)}</b> · modelo ${n(mod[i], un === "" ? 2 : 1)} ${un}` + (r && rea[i] != null ? `<br>realizado ${rot(r.mes)}: ${n(rea[i], un === "" ? 2 : 1)} ${un}` : ""));
          alvo.addEventListener("click", () => Mesa.inspecionar(`Fundamentos · ${rot(q)}`, el => fundMes(el, serie[i])));
        });
      }, "baixo", tit);
    });
    painelVivo(g, { cod: "NEN-10", titulo: "Fundamentos por produto", unidade: "GW · trava em % das horas", tam: "full", ajuda: "f-deck", fixo: true, abas: [["mes", "Mês"], ["tri", "Trimestre"], ["sem", "Semestre"], ["ano", "Ano"]], abasRotulo: "Produto",
      leg: "Em negrito, o valor que entra no modelo (projeção do deck; hidráulica do N = média dos cenários). Embaixo, em cinza, o último realizado dos mesmos meses do calendário. Sobra NE = renovável − carga do NE; folga = limite de exportação − sobra (quanto menor, mais o NE trava); k = fração de (SE − piso) perdida nas horas em que trava. * parcial." }, (p, tipo) => {
      const b = barra(p.corpo), aviso = mk("span", "leg");
      const L = FP[tipo];
      botao(b, "Copiar tabela", () => { const c = v => (v == null || !isFinite(v) ? "" : v.toFixed(3).replace(".", ","));
        copiar([["periodo", ...COLS_FUND.flatMap(([f]) => [f + "_modelo", f + "_realizado"])].join("\t"), ...L.map(x => [x.rot, ...COLS_FUND.flatMap(([f]) => [c(x.mod[f]), c(x.rea[f])])].join("\t"))].join("\n"), aviso); });
      b.append(aviso);
      const fmt = (v, c) => (v == null ? "—" : c === "%" ? pct(v) : c === 2 ? n(v, 2) : dn(v, 1));
      tabela(p.corpo, `<thead><tr><th>Período</th>${COLS_FUND.map(([, , t]) => `<th class="n">${t}</th>`).join("")}</tr></thead><tbody>` + L.map(x => {
        const rs = x.refs, ix = q => +q.slice(0, 4) * 12 + +q.slice(5, 7), cont = rs.every((q, i) => i === 0 || ix(q) - ix(rs[i - 1]) === 1);
        const ref = !rs.length ? "" : rs.length === 1 ? rot(rs[0]) : cont ? `${rot(rs[0])} a ${rot(rs.at(-1))}` : rs.map(rot).join(", ");
        return `<tr class="${x.parcial ? "nen-parcial" : ""}"><th scope="row">${x.rot}${x.parcial ? "*" : ""}${ref ? `<span class="nen-fx">real: ${ref}</span>` : ""}</th>` +
          COLS_FUND.map(([f, c]) => `<td class="n"><b>${fmt(x.mod[f], c)}</b><span class="nen-fx">${fmt(x.rea[f], c)}</span></td>`).join("") + "</tr>";
      }).join("") + `</tbody>`, "nen-lista nen-fund");
    });
    painelVivo(g, { cod: "NEN-11", titulo: "Descolamento realizado", unidade: "R$/MWh", tam: "full", ajuda: "f-realizado", fixo: true, abas: [["NE", "NE"], ["N", "N"]], abasRotulo: "Submercado",
      fonte: "PLD da CCEE; física do DESSEM; desde 2021; * ano parcial.",
      leg: "Períodos à esquerda e meses à direita, com o SE médio de cada um em cinza. Quanto mais forte o fundo, mais descolado (escala: percentil 90 dos meses). ▲ / ▼ = bem mais / menos descolado que a média do mesmo período nos anos disponíveis. ◆ = ano de referência da venda ancorada naquele mês do calendário (menor fração da folga já realizada). Clique numa célula: o período contra a média dos mesmos meses nos outros anos." }, desenharRealizado);
  }
  function fundMes(el, x) {
    el.innerHTML = `<p class="nen-ins-l">Projeção do deck ${rot(META.deck)} para ${rot(x.mes)} (média dos cenários) e o último realizado do mesmo mês do calendário${x.rea ? ` (${rot(x.rea.mes)})` : ""}.</p>` +
      `<div class="rolagem"><table class="nen-t nen-det"><thead><tr><th></th><th class="n">Modelo</th><th class="n">Realizado</th></tr></thead><tbody>` +
      FUND_CAMPOS.map(([f, t, u]) => `<tr><td>${t}${u ? ` (${u})` : ""}</td><td class="n">${fmtFund(x.mod[f], f)}</td><td class="n nen-ref">${fmtFund(x.rea ? x.rea[f] : null, f)}</td></tr>`).join("") + `</tbody></table></div>` +
      (x.rea && x.rea.se != null ? `<p class="nen-ins-l">Realizado ${rot(x.rea.mes)}: SE ${n(x.rea.se, 1)} · NE ${dn(x.rea.d_NE)} · N ${dn(x.rea.d_N)}</p>` : "") +
      (RES[x.mes] ? `<p class="leg"><a href="#NEN-2" data-mes>Ver o descolamento previsto deste mês (DES)</a></p>` : "");
  }
  function anoRefVenda(mes, sub) { const arr = (CVH[sub] || {})[String(mesN(mes))]; if (!arr || !arr.length) return null; return arr.reduce((a, x) => (x[1] > a[1] ? x : a))[0]; }
  function histDetalhe(c, sub) {
    const fmt = (v, t) => (v == null ? "—" : t === "rs" ? dn(v) : t === "pct" ? pct(v) : t === "k" ? n(v, 2) : n(v, 1));
    const rotMed = `média ${c.anos[0]}–${String(c.anos.at(-1)).slice(2)}`;
    let html = trio([["SE", n(c.SE, 1)], ["NE", dn(c.d_NE)], ["N", dn(c.d_N)]]);
    html += `<div class="rolagem"><table class="nen-t nen-det"><thead><tr><th></th><th class="n">Valor</th><th class="n">${rotMed}</th><th class="n">Posição</th></tr></thead><tbody>` +
      c.linhas.map(l => {
        if (l === null) return `<tr class="nen-quebra"><td colspan="4"></td></tr>`;
        let d = "";
        if (l.v != null && l.med != null) { if (l.tipo === "pct") d = sn((l.v - l.med) * 100, 0) + " p.p."; else if (Math.abs(l.med) > 0.05) d = sn((l.v / l.med - 1) * 100, 0) + "%"; }
        return `<tr><td>${l.nome}</td><td class="n">${fmt(l.v, l.tipo)}</td><td class="n">${fmt(l.med, l.tipo)}${d ? `<span class="nen-fx">${d}</span>` : ""}</td><td class="n">${l.pos == null ? "—" : `${l.pos}º/${l.n}`}</td></tr>`;
      }).join("") + `</tbody></table></div><p class="leg">Posição: 1º = mais descolado ou maior valor. % da folga = descolamento ÷ (SE − piso), só anos com SE acima do piso.` +
      (c.cob < 0.95 ? ` Física com ${pct(c.cob)} das horas do DESSEM no mês com menos dados.` : "") + `</p>`;
    if (c.meses.length === 1 && anoRefVenda(c.meses[0], sub) === +c.meses[0].slice(0, 4)) html += `<p class="nen-nota">◆ Ano de referência da venda ancorada do ${sub} neste mês do calendário: a menor fração da folga já realizada.</p>`;
    return html;
  }
  function desenharRealizado(p, sub) {
    const b = barra(p.corpo);
    grupoAbas(b, "Medida", [["d", "Descolamento"], ["pld", "PLD implícito"]], ST.fundModo, v => { ST.fundModo = v; p.re(); });
    const pld = ST.fundModo === "pld", ds = c => c["d_" + sub];
    const vm = HP.flatMap(a => Object.values(a.M)).map(c => Math.abs(ds(c))).filter(v => v > 0).sort((a, c) => a - c), esc = vm.length ? vm[Math.floor(0.9 * (vm.length - 1))] : 1;
    const sombra = v => `background:color-mix(in srgb, var(--calor) ${Math.round(Math.min(1, Math.abs(v) / esc) * 55)}%, transparent)`;
    const CEL = [];
    const cel = (c, sep) => {
      if (!c) return `<td class="nen-vz${sep || ""}"></td>`;
      const v = ds(c), eref = c.meses.length === 1 && anoRefVenda(c.meses[0], sub) === +c.meses[0].slice(0, 4), i = CEL.push(c) - 1;
      const mc = c.marca && c.marca[sub] ? `<i class="nen-marca" title="${c.marca[sub] === "▲" ? "bem mais descolado que a média do período" : "bem menos descolado que a média do período"}">${c.marca[sub]}</i>` : "";
      return `<td class="n nen-hc${sep || ""}${eref ? " nen-refv" : ""}" style="${sombra(v)}" data-i="${i}"><b>${mc}${pld ? n(c.SE + v, 1) : dn(v)}${eref ? "◆" : ""}</b><span class="nen-fx">SE ${n(c.SE)}</span></td>`;
    };
    const grid = mk("div", "nen-duas"); p.corpo.append(grid);
    const e1 = mk("div"), e2 = mk("div"); grid.append(e1, e2);
    tabela(e1, `<thead><tr><th>Ano</th><th class="n">Ano</th><th class="n nen-sep">1º sem</th><th class="n">2º sem</th><th class="n nen-sep">T1</th><th class="n">T2</th><th class="n">T3</th><th class="n">T4</th></tr></thead><tbody>` +
      HP.map(a => `<tr><th scope="row">${a.ano}${a.parcial ? "*" : ""}</th>${cel(a.A)}${cel(a.S1, " nen-sep")}${cel(a.S2)}${[1, 2, 3, 4].map(q => cel(a["T" + q], q === 1 ? " nen-sep" : "")).join("")}</tr>`).join("") + `</tbody>`, "nen-calor");
    tabela(e2, `<thead><tr><th>Ano</th>${MES.map((m, i) => `<th class="n${i % 3 === 0 && i ? " nen-sep" : ""}">${m}</th>`).join("")}</tr></thead><tbody>` +
      HP.map(a => `<tr><th scope="row">${a.ano}${a.parcial ? "*" : ""}</th>${MES.map((m, i) => cel(a.M[`${a.ano}-${String(i + 1).padStart(2, "0")}`], i % 3 === 0 && i ? " nen-sep" : "")).join("")}</tr>`).join("") + `</tbody>`, "nen-calor");
    p.corpo.querySelectorAll("td[data-i]").forEach(td => {
      const c = CEL[+td.dataset.i];
      dicaEm(td, `<b>${c.rot}</b> · ${sub} ${pld ? "PLD " + n(c.SE + ds(c), 1) : dn(ds(c))} · SE ${n(c.SE, 1)}<br><i>clique para o detalhe</i>`);
      Mesa.alvo(td, `Realizado · ${c.rot}`, el => { el.innerHTML = histDetalhe(c, sub); });
    });
  }

  // ================================================================ 4 · FIS Física do descolamento (os capítulos da página de fundamentos)
  function telaFIS(area) {
    const auc = FD.auc.NE, aS = auc.find(x => x.var === "Sobra N+NE"), aM = auc.find(x => x.var.startsWith("Margem"));
    const t1 = [...FD.travas].reverse().find(t => t.periodo.endsWith("1S")), t2 = [...FD.travas].reverse().find(t => t.periodo.endsWith("2S"));
    const rp = s => `${s.endsWith("1S") ? "1º" : "2º"} sem/${s.slice(2, 4)}`;
    const ks = FD.k, kMax = ks.reduce((a, b) => (b.k > a.k ? b : a)), kMin = ks.reduce((a, b) => (b.k < a.k ? b : a));
    Mesa.decisao(area, [
      { r: "1º sem: o que separa as horas", v: `AUC ${n(Math.abs(aS["1S"]), 2)}`, d: "sobra do N+NE (trava o tronco N/NE→SE)", principal: true },
      { r: "2º sem: o que separa as horas", v: `AUC ${n(Math.abs(aM["2S"]), 2)}`, d: "margem até o limite de exportação do NE" },
      { r: `Tronco N/NE→SE · ${rp(t1.periodo)}`, v: `${n(t1.REC_SE_NNE)}%`, d: `das ${n(t1["horas descoladas"])} horas descoladas` },
      { r: `Exportação do NE · ${rp(t2.periodo)}`, v: `${n(t2.EXP_NE)}%`, d: `das ${n(t2["horas descoladas"])} horas descoladas` },
      { r: "Intensidade k (1º sem)", v: `${n(kMin.k, 2)} a ${n(kMax.k, 2)}`, d: `${rot(kMin.mes)} raso · ${rot(kMax.mes)} fundo` },
    ]);
    const g = Mesa.grade(area);
    const S_ = FD.serie, ROT = "font-weight:600;font-size:11px";
    const p12 = Mesa.painel(g, { cod: "NEN-12", titulo: "Cap. 1 · É episódico e depende do nível do SE", unidade: "R$/MWh por mês", tam: "full", ajuda: "f-cap1", fonte: `CCEE, jan/21 a ${rot(S_.at(-1).mes)}.`,
      leg: "Em cima, o PLD médio do SE e o piso (tracejado). Embaixo, o descolamento de cada submercado (PLD do submercado − PLD do SE), cada faixa com a sua escala e o mesmo eixo de tempo. Linhas verticais: trimestre (tracejada) e ano (contínua). O Sul descola para cima; o NE e o N, para baixo." });
    p12.corpo.append(mk("div", null, QC.legenda([["var(--ink)", "PLD do SE", "l"], ["var(--ink-3)", "Piso", "t"], [COR.S, "Sul − SE"], [COR.NE, "NE − SE"], [COR.N, "N − SE"]])));
    const mg = { l: 48, r: 12 };
    const eixoX = w => { const larg = (w - mg.l - mg.r) / S_.length; return { larg, X: i => mg.l + (i + 0.5) * larg, bw: larg * 0.7 }; };
    const separadores = (svg, larg, y1, y2) => S_.forEach((r, i) => { const m = mesN(r.mes); if (i === 0 || (m - 1) % 3) return;
      S(svg, "line", { x1: mg.l + i * larg, x2: mg.l + i * larg, y1, y2, stroke: "var(--rule)", "stroke-dasharray": m === 1 ? null : "2 3" }); });
    const alvos = (svg, X, larg, hh) => S_.forEach((r, i) => { const a = S(svg, "rect", { x: X(i) - larg / 2, y: 0, width: larg, height: hh, fill: "transparent" });
      dicaEm(a, `<b>${rot(r.mes)}</b> · SE ${n(r.SE, 1)} (piso ${n(r.piso, 2)})<br>Sul ${dn(r.S)} · NE ${dn(r.NE)} · N ${dn(r.N)}`); });
    grafico(p12.corpo, (svg, w, h) => {
      const { larg, X } = eixoX(w), t = 8, b = 8;
      const e = eixo(0, Math.max(...S_.map(r => r.SE)), 3), Y = v => t + (h - t - b) * (1 - (v - e.a) / (e.b - e.a));
      e.t.forEach(v => { S(svg, "line", { x1: mg.l, x2: w - mg.r, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }); S(svg, "text", { x: mg.l - 6, y: Y(v) + 3, "text-anchor": "end" }, n(v)); });
      separadores(svg, larg, 0, h);
      S(svg, "polyline", { points: S_.map((r, i) => `${X(i)},${Y(r.piso)}`).join(" "), fill: "none", stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
      S(svg, "polyline", { points: S_.map((r, i) => `${X(i)},${Y(r.SE)}`).join(" "), fill: "none", stroke: "var(--ink)", "stroke-width": 2 });
      S(svg, "text", { x: mg.l + 4, y: t + 10, class: "forte", style: ROT }, "SE");
      alvos(svg, X, larg, h);
    }, "baixo", "PLD médio do SE por mês");
    grafico(p12.corpo, (svg, w, h) => {
      const { larg, X, bw } = eixoX(w), faixas = [["S", "Sul − SE"], ["NE", "NE − SE"], ["N", "N − SE"]], fh = (h - 40) / 3;
      separadores(svg, larg, 0, h - 36);
      faixas.forEach(([s_, rotulo], k) => {
        const y0 = k * fh, vals = S_.map(r => r[s_]), ee = eixo(Math.min(0, ...vals), Math.max(0, ...vals), 2);
        const Yk = v => y0 + 18 + (fh - 24) * (1 - (v - ee.a) / (ee.b - ee.a));
        ee.t.forEach(v => { S(svg, "line", { x1: mg.l, x2: w - mg.r, y1: Yk(v), y2: Yk(v), stroke: "var(--rule)" }); S(svg, "text", { x: mg.l - 6, y: Yk(v) + 3, "text-anchor": "end" }, dn(v, 0)); });
        S_.forEach((r, i) => { const v = r[s_], a = Yk(0), c = Yk(v); S(svg, "rect", { x: X(i) - bw / 2, y: Math.min(a, c), width: bw, height: Math.max(Math.abs(c - a), 0.5), fill: COR[s_] }); });
        S(svg, "line", { x1: mg.l, x2: w - mg.r, y1: Yk(0), y2: Yk(0), stroke: "var(--ink-3)" });
        S(svg, "text", { x: mg.l + 4, y: y0 + 12, style: `${ROT};fill:${COR[s_]}` }, rotulo);
      });
      const tri = {};
      S_.forEach((r, i) => { const k = `${r.mes.slice(0, 4)}T${Math.ceil(mesN(r.mes) / 3)}`; (tri[k] = tri[k] || []).push(i); });
      if (larg * 3 >= 16) Object.entries(tri).forEach(([k, ii]) => S(svg, "text", { x: (X(ii[0]) + X(ii.at(-1))) / 2, y: h - 22, "text-anchor": "middle", style: "font-size:9px" }, k.slice(4)));
      S_.forEach((r, i) => { if (/-01$/.test(r.mes)) S(svg, "text", { x: mg.l + i * larg + 2, y: h - 6, "text-anchor": "start" }, r.mes.slice(0, 4)); });
      alvos(svg, X, larg, h);
    }, "alto", "Descolamento de cada submercado por mês");
    p12.corpo.append(mk("p", "nen-conc", "Entre 2022 e meados de 2024 o SE ficou no piso e não houve descolamento: <b>o NE só fica abaixo do SE quando o SE está acima do piso</b>. Por isso o modelo recebe a curva do SE da mesa e calcula o descolamento sobre a distância entre o SE e o piso."));

    painelVivo(g, { cod: "NEN-13", titulo: "Cap. 2 · Tem estação e tem hora", unidade: "mês × hora", tam: "full", ajuda: "f-cap2", fixo: true, abas: [["pct", "% das horas"], ["rs", "R$/MWh médio"]], abasRotulo: "Medida",
      fonte: "CCEE (PLD horário).",
      leg: "Cada célula é um mês do calendário e uma hora do dia. % das horas: fração das horas com o submercado descolado (mais de R$ 1/MWh abaixo do SE). R$/MWh médio: descolamento médio naquela hora (o Sul descola para cima). Mesma escala de cor nos três; com Números, valores a cada 3 horas (sem os zeros)." }, desenharMapas);
    painelVivo(g, { cod: "NEN-14", titulo: "Cap. 3 · Dois gargalos, um em cada semestre", unidade: "% das horas descoladas", tam: "l", ajuda: "f-cap3", fixo: true,
      fonte: "DESSEM, PDO_RESTOPER (multiplicador acima de R$ 1/MWh).",
      leg: "Que restrição de intercâmbio está no limite quando o NE está descolado. Uma hora pode ter mais de uma restrição no limite. Sem descolamento, o semestre não aparece (2023 e 1º sem/24, SE no piso)." }, p => {
      const PRINC = ["REC_SE_NNE", "EXP_NE", "REC_N"];
      const fundo = v => `background:color-mix(in srgb, var(--calor) ${Math.round(Math.min(v, 100) * 0.55)}%, transparent)`;
      tabela(p.corpo, `<thead><tr><th>Semestre</th><th class="n">Horas</th><th class="n">Tronco N/NE→SE</th><th class="n">Exp. NE</th><th class="n">Receb. N</th><th class="n">Outras</th></tr></thead><tbody>` +
        FD.travas.map(r => { const outras = Math.max(0, ...Object.entries(r).filter(([k]) => !PRINC.includes(k) && !["periodo", "horas descoladas", "nenhuma"].includes(k)).map(([, v]) => v)); const [a, s] = r.periodo.split("-");
          return `<tr><th scope="row">${s === "1S" ? "1º" : "2º"} sem/${a.slice(2)}</th><td class="n">${n(r["horas descoladas"])}</td>${PRINC.map(k => `<td class="n" style="${fundo(r[k])}">${n(r[k])}%</td>`).join("")}<td class="n">${n(outras)}%</td></tr>`; }).join("") + `</tbody>`, "nen-lista");
      p.corpo.append(mk("p", "nen-conc", "No <b>1º semestre</b> sobra energia no N e no NE juntos e trava o <b>tronco N/NE→SE</b>: os dois descolam juntos. No <b>2º semestre</b> é o NE sozinho que bate no <b>limite de exportação</b>. Dois mecanismos, dois regimes no modelo."));
    });
    painelVivo(g, { cod: "NEN-15", titulo: "Cap. 4 · O que separa as horas descoladas do NE", unidade: "AUC", tam: "l", ajuda: "f-cap4", fixo: true,
      leg: "AUC: 0,5 = não separa nada; 1 = separa perfeitamente. Horas desde 2024. Em destaque, a variável que o modelo usa em cada semestre." }, p => {
      p.corpo.append(mk("div", null, QC.legenda([["var(--ink-2)", "1º semestre"], ["var(--bar-pers)", "2º semestre"], ["var(--accent)", "variável do modelo"]])));
      const L = [...FD.auc.NE].sort((a, b) => Math.max(Math.abs(b["1S"]), Math.abs(b["2S"])) - Math.max(Math.abs(a["1S"]), Math.abs(a["2S"])));
      grafico(p.corpo, (svg, w, h) => {
        const m2 = { l: Math.min(250, w * 0.42), r: 34, t: 6, b: 20 };
        const bh = (h - m2.t - m2.b) / L.length, X = v => m2.l + (w - m2.l - m2.r) * (v - 0.5) / 0.5;
        [0.5, 0.75, 1].forEach(v => { S(svg, "line", { x1: X(v), x2: X(v), y1: m2.t, y2: h - m2.b, stroke: "var(--rule)" }); S(svg, "text", { x: X(v), y: h - 5, "text-anchor": "middle" }, n(v, 2)); });
        L.forEach((r, i) => {
          const y = m2.t + i * bh;
          S(svg, "text", { x: m2.l - 8, y: y + bh / 2 + 4, "text-anchor": "end", style: "fill:var(--ink-2)" }, r.var);
          [["1S", 0, "var(--ink-2)"], ["2S", 1, "var(--bar-pers)"]].forEach(([s, k, cor]) => {
            const v = Math.abs(r[s]), dest = (s === "1S" && r.var === "Sobra N+NE") || (s === "2S" && r.var.startsWith("Margem"));
            const bar = S(svg, "rect", { x: X(0.5), y: y + bh * (0.1 + k * 0.42), width: Math.max(X(v) - X(0.5), 1), height: bh * 0.36, fill: dest ? "var(--accent)" : cor });
            if (dest) S(svg, "text", { x: X(v) + 4, y: y + bh * (0.1 + k * 0.42) + bh * 0.3, style: "fill:var(--ink);font-weight:600" }, n(v, 2));
            dicaEm(bar, `<b>${r.var}</b> · ${s === "1S" ? "1º" : "2º"} semestre<br>AUC ${n(v, 2)}${r[s] < 0 ? " (relação inversa)" : ""}`);
          });
        });
      }, null, "AUC de cada variável por semestre");
    });
    painelVivo(g, { cod: "NEN-16", titulo: "Cap. 4 · Chance de o NE estar descolado, por faixa", unidade: "% das horas", tam: "l", ajuda: "f-cap4", fixo: true,
      leg: "Cada ponto é um décimo das horas, ordenadas pela variável. 1º semestre: sobra N+NE (renovável + hidráulica + térmica − carga, GW). 2º semestre: margem até o limite de exportação (renovável − carga − limite do NE, GW; perto de zero = no limite)." }, p => {
      const R = FD.resposta;
      grafico(p.corpo, (svg, w, h) => {
        const m2 = { l: 40, r: 10, t: 10, b: 30 }, gap = 30, pw = (w - m2.l - m2.r - gap) / 2;
        ["1S", "2S"].forEach((reg, k) => {
          const P = R[reg].pontos, x0 = m2.l + k * (pw + gap), xs = P.map(q => q.x), lo = Math.min(...xs), hi = Math.max(...xs);
          const X = v => x0 + pw * (v - lo) / (hi - lo || 1), Y = v => m2.t + (h - m2.t - m2.b) * (1 - v);
          [0, 0.5, 1].forEach(v => { S(svg, "line", { x1: x0, x2: x0 + pw, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }); if (!k) S(svg, "text", { x: x0 - 6, y: Y(v) + 3, "text-anchor": "end" }, pct(v)); });
          S(svg, "polyline", { points: P.map(q => `${X(q.x)},${Y(q.p)}`).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2 });
          P.forEach(q => { const c = S(svg, "circle", { cx: X(q.x), cy: Y(q.p), r: 4, fill: "var(--accent)" });
            dicaEm(c, `<b>${R[reg].var}</b><br>${dn(q.lo, 1)} a ${dn(q.hi, 1)} GW · ${pct(q.p)} das horas com o NE descolado`); });
          S(svg, "text", { x: x0 + pw / 2, y: h - 5, "text-anchor": "middle", style: "fill:var(--ink-2)" }, `${reg === "1S" ? "1º sem: sobra N+NE" : "2º sem: margem de exportação"} (GW)`);
          [lo, hi].forEach(v => S(svg, "text", { x: X(v), y: h - 18, "text-anchor": "middle" }, dn(v, 0)));
        });
      }, null, "Chance de o NE estar descolado por faixa da variável");
      p.corpo.append(mk("p", "nen-conc", `Uma variável quase sozinha separa as horas descoladas em cada semestre: a <b>sobra do N+NE</b> no 1º (AUC ${n(Math.abs(aS["1S"]), 2)}) e a <b>margem até o limite de exportação do NE</b> no 2º (${n(Math.abs(aM["2S"]), 2)}). Abaixo de um patamar a chance é quase zero; acima, sobe rápido.`));
    });
    painelVivo(g, { cod: "NEN-17", titulo: "Cap. 5 · Quanto descola quando trava: raso ou fundo", unidade: "k × sobra do N+NE", tam: "l", ajuda: "f-cap5", fixo: true,
      leg: "k = fração da distância entre o SE e o piso que o NE perde nas horas travadas (1 = NE no piso). Sobra sem térmica. Meses do 1º semestre com pelo menos 20 horas travadas, desde 2021; tamanho do ponto = horas travadas." }, p => {
      const anos = [...new Set(FD.k.map(q => q.mes.slice(0, 4)))].sort();
      const CA = { 2021: "var(--ink-3)", 2022: "var(--bar-saz)", 2025: "var(--sm-ne)", 2026: "var(--accent)" };
      p.corpo.append(mk("div", null, QC.legenda(anos.map(a => [CA[a] || "var(--ink-2)", a]))));
      grafico(p.corpo, (svg, w, h) => {
        const m2 = { l: 44, r: 16, t: 12, b: 28 };
        const xs = FD.k.map(q => q.sobra), ex = eixo(Math.min(...xs), Math.max(...xs), 6);
        const X = v => m2.l + (w - m2.l - m2.r) * (v - ex.a) / (ex.b - ex.a), Y = v => m2.t + (h - m2.t - m2.b) * (1 - v);
        [0, 0.25, 0.5, 0.75, 1].forEach(v => { S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }); S(svg, "text", { x: m2.l - 6, y: Y(v) + 3, "text-anchor": "end" }, n(v, 2)); });
        rotulosX(svg, ex.t.map((_, i) => i), i => X(ex.t[i]), h - 10, i => `${dn(ex.t[i], 0)} GW`, 44);
        FD.k.forEach(q => {
          const c = S(svg, "circle", { cx: X(q.sobra), cy: Y(q.k), r: 4 + Math.min(q.horas / 120, 5), fill: CA[q.mes.slice(0, 4)] || "var(--ink-2)", opacity: 0.85, stroke: "var(--surface)", "stroke-width": 1.5 });
          dicaEm(c, `<b>${rot(q.mes)}</b><br>k ${n(q.k, 2)} · sobra N+NE ${dn(q.sobra, 1)} GW<br>${n(q.horas)} horas travadas · folga média ${n(q.folga)} R$/MWh`);
        });
      }, null, "Intensidade k por sobra do N+NE");
      p.corpo.append(mk("p", "nen-conc", "Com pouca sobra (início de 2026) a trava é rasa; com sobra grande (2025) o NE vai ao piso. <b>A intensidade muda de um ano para o outro</b>: é a parte mais difícil de prever e a principal fonte de erro do 1º semestre."));
    });
    painelVivo(g, { cod: "NEN-18", titulo: "Do diagnóstico ao modelo", tam: "full", ajuda: "f-modelo", fixo: true,
      fonte: "Dados realizados: PLD horário da CCEE e resultados diários do DESSEM (balanço por submercado e restrições de intercâmbio), desde 2021." }, p => {
      p.corpo.append(mk("div", "nen-fluxo", [["Capítulo 1", "SE da mesa", "O descolamento é calculado sobre a distância entre o SE informado e o piso.", "d-curva"],
        ["Capítulos 2 e 3", "Horário, dois regimes", "Cada hora é simulada; 1º e 2º semestres têm ajustes separados.", "d-regimes"],
        ["Capítulo 4", "Chance de travar", "Regressão sobre a sobra N+NE e a margem de exportação do NE.", "d-trava"],
        ["Capítulo 5", "Intensidade e cenários", "k por ano climático e faixa pelos anos históricos.", "d-k"]]
        .map(([c, t, x, an]) => `<div><span class="rotulo">${c}</span><b>${t}</b><p>${x}</p><a href="#NEN-7" data-met="${an}">metodologia ›</a></div>`).join("")));
      p.corpo.querySelectorAll("a[data-met]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); irMet(a.dataset.met); }));
    });
  }
  function desenharMapas(p, med) {
    ST.mapaMed = med;
    const b = barra(p.corpo);
    grupoAbas(b, "Desde", [["2021", "2021 em diante"], ["2024", "2024 em diante"], ["2025", "2025 em diante"]], ST.mapaIni, v => { ST.mapaIni = v; p.re(); });
    chave(b, "Números", ST.mapaNum, v => { ST.mapaNum = v; p.re(); });
    const SUBM = ["S", "NE", "N"], dados = SUBM.map(s_ => FD.mapa[`${s_}_${ST.mapaIni}`][med]);
    const lim = Math.max(...dados.flatMap(MM => MM.flat().filter(v => v != null).map(v => Math.abs(v))));
    b.append(mk("span", "leg", `Cor mais forte = ${med === "pct" ? pct(lim) + " das horas descoladas" : n(lim) + " R$/MWh em módulo"}`));
    const box = mk("div", "nen-mapas"); p.corpo.append(box);
    SUBM.forEach((s_, k) => {
      const MM = dados[k], d = mk("div", "nen-mapa", `<div class="ttl" style="color:${COR[s_]}">${NOMESUB[s_]}</div>`); box.append(d);
      grafico(d, (svg, w, h) => {
        const m2 = { l: 30, r: 4, t: 4, b: 18 }, cw = (w - m2.l - m2.r) / 24, chh = (h - m2.t - m2.b) / 12;
        MM.forEach((lin, i) => {
          S(svg, "text", { x: m2.l - 4, y: m2.t + (i + 0.5) * chh + 3, "text-anchor": "end" }, MES[i]);
          lin.forEach((v, hh) => {
            const fr = v == null ? 0 : Math.max(0, Math.min(1, Math.abs(v) / lim));
            const r = S(svg, "rect", { x: m2.l + hh * cw + 0.5, y: m2.t + i * chh + 0.5, width: Math.max(cw - 1, 0.5), height: Math.max(chh - 1, 0.5), fill: `color-mix(in srgb, ${COR[s_]} ${Math.round(fr * 100)}%, var(--vazio))` });
            dicaEm(r, `<b>${NOMESUB[s_]} · ${MES[i]}, ${hh}h</b> (${ST.mapaIni} em diante)<br>${med === "pct" ? `${pct(v)} das horas descolado` : `descolamento médio ${dn(v)} R$/MWh`}`);
            if (ST.mapaNum && hh % 3 === 0 && v != null) { const txt = med === "pct" ? Math.round(v * 100) : Math.round(v);
              if (txt !== 0) S(svg, "text", { x: m2.l + (hh + 0.5) * cw, y: m2.t + (i + 0.5) * chh + 4, "text-anchor": "middle", style: `fill:${fr > 0.55 ? "var(--surface)" : "var(--ink)"};pointer-events:none` }, String(txt).replace("-", "−")); }
          });
        });
        for (let hh = 0; hh < 24; hh += 3) S(svg, "text", { x: m2.l + (hh + 0.5) * cw, y: h - 4, "text-anchor": "middle" }, `${hh}h`);
      }, null, `Mapa mês por hora, ${NOMESUB[s_]}`);
    });
    p.corpo.append(mk("p", "nen-conc", "No período úmido (fev a mai) o NE e o N descolam quase o dia todo, mais forte à noite e de madrugada; no 2º semestre, só o NE, nas horas de vento. Ao meio-dia quase nunca: o SE fica barato com a solar. <b>Por isso o modelo é horário e separa os dois semestres.</b>"));
  }

  // ================================================================ 5 · BT Backtest da cotação
  function telaBT(area) {
    decisaoViva(area, () => {
      const ne = metricas("tri", "NE", "X"), nn = metricas("tri", "N", "X"), nome = nomePolitica();
      return [
        { r: "Venda NE perdeu · trimestres", v: pc0(ne.pv), d: `${nome} · ${ne.periodos} períodos, ${ne.n} casos`, principal: true },
        { r: "Compra NE perdeu · trimestres", v: pc0(ne.pc), d: `ganho médio ${sn(ne.gc, 1)} R$/MWh` },
        { r: "Venda N perdeu · trimestres", v: pc0(nn.pv), d: `ganho médio ${sn(nn.gv, 1)} R$/MWh` },
        { r: "Compra N perdeu · trimestres", v: pc0(nn.pc), d: nn.pc > 0.05 ? `em média ${n(nn.sevC, 1)}, no máximo ${n(nn.worstC, 1)}` : "" },
        { r: "Banda NE · venda − compra", v: n(ne.l, 1), d: "R$/MWh, média dos períodos" },
      ];
    });
    const g = Mesa.grade(area);
    painelVivo(g, { cod: "NEN-19", titulo: "Três políticas lado a lado", tam: "l", ajuda: "cv-resultado", fixo: true, abas: [["tri", "Trimestres"], ["sem", "Semestres"]], abasRotulo: "Produto",
      fonte: `Backtest ${CVB.meta.versao}: decks de ${rot(CVB.meta.decks[0])} a ${rot(CVB.meta.decks.at(-1))}, SE realizado como insumo; histórico só até D−2.`,
      leg: "Cada período pesa o mesmo (todos os decks erram o mesmo período do mesmo jeito). Perder = o realizado ficar abaixo da compra (quem compra perde) ou acima da venda (quem vende perde). Em azul, o melhor nas frequências e nos ganhos. Largura = venda − compra." }, (p, tipo) => {
      ST.rTipo = tipo;
      const b = barra(p.corpo);
      grupoAbas(b, "Submercado", [["NE", "NE"], ["N", "N"]], ST.rSub, v => { ST.rSub = v; p.re(); });
      const sub = ST.rSub, Mx = { A: metricas(tipo, sub, "A"), B: metricas(tipo, sub, "B"), C: metricas(tipo, sub, "C") };
      b.append(mk("span", "leg", `${Mx.A.n} casos em ${Mx.A.periodos} períodos`));
      const L = [["Quantas vezes a venda perdeu", "pv", pc0, -1], ["Perda média da venda (R$)", "sevV", v => n(v, 1), 0], ["Maior perda da venda (R$)", "worstV", v => n(v, 1), 0],
        ["Quantas vezes a compra perdeu", "pc", pc0, -1], ["Perda média da compra (R$)", "sevC", v => n(v, 1), 0], ["Maior perda da compra (R$)", "worstC", v => n(v, 1), 0],
        ["Ganho médio de quem vende (R$)", "gv", v => sn(v, 1), 1], ["Ganho médio de quem compra (R$)", "gc", v => sn(v, 1), 1], ["Largura da banda (R$)", "l", v => n(v, 1), 0]];
      tabela(p.corpo, `<thead><tr><th></th>${["A", "B", "C"].map(k => `<th class="n${k === "C" ? " nen-cons" : ""}">${NOMEPOL[k]}</th>`).join("")}</tr></thead><tbody>` +
        L.map(([t, key, f, bom]) => { const vs = ["A", "B", "C"].map(k => Mx[k][key]), mel = bom === 0 ? null : bom > 0 ? Math.max(...vs) : Math.min(...vs);
          return `<tr><th scope="row">${t}</th>${vs.map((v, j) => `<td class="n${mel !== null && Math.abs(v - mel) < 1e-9 ? " nen-melhor" : ""}${j === 2 ? " nen-cons" : ""}">${f(v)}</td>`).join("")}</tr>`; }).join("") + `</tbody>`, "nen-lista");
      const A = Mx.A, C = Mx.C;
      p.corpo.append(mk("p", "nen-conc", `<b>${sub}, ${tipo === "tri" ? "trimestres" : "semestres"}:</b> a venda que perdia em ${pc0(A.pv)} dos períodos passou a perder em ${pc0(C.pv)}; a compra perde em ${pc0(C.pc)}` +
        (C.pc > 0.05 ? `, em média por R$ ${n(C.sevC, 1)} (no máximo R$ ${n(C.worstC, 1)})` : "") + `. A banda ficou R$ ${n(C.l - A.l, 1)} mais larga (R$ ${n(C.l, 1)} contra R$ ${n(A.l, 1)}).`));
    });
    painelVivo(g, { cod: "NEN-20", titulo: "Política atual, período a período", tam: "l", ajuda: "cv-resultado", abas: [["tri", "Trimestres"], ["sem", "Semestres"]], abasRotulo: "Produto",
      leg: "A política escolhida na COT (NEN-4), nos períodos que o modelo já tinha treino. Ganhos em R$/MWh por unidade de energia. Em vermelho, mais de 15 pontos acima do p escolhido. Clique num período: os casos (decks) no inspetor." }, (p, tipo) => {
      const b = barra(p.corpo);
      grupoAbas(b, "Submercado", [["NE", "NE"], ["N", "N"]], ST.aSub, v => { ST.aSub = v; p.re(); });
      const sub = ST.aSub, mx = metricas(tipo, sub, "X");
      b.append(mk("span", "leg", `${nomePolitica()} · ${mx.n} casos em ${mx.periodos} períodos`));
      const alto = (v, lado) => (v > EST[lado].p + 0.15 ? " nen-alto" : "");
      const box = tabela(p.corpo, `<thead><tr><th>Período</th><th class="n">Casos</th><th class="n">Perda compra</th><th class="n">Perda venda</th><th class="n">Ganho compra</th><th class="n">Ganho venda</th><th class="n">Largura</th></tr></thead><tbody>` +
        mx.porPer.map(x => `<tr data-p="${x.p}"><th scope="row">${rotPer(x.p)}</th><td class="n">${x.n}</td><td class="n${alto(x.pc, "compra")}">${pc0(x.pc)}</td><td class="n${alto(x.pv, "venda")}">${pc0(x.pv)}</td><td class="n">${sn(x.gc, 1)}</td><td class="n">${sn(x.gv, 1)}</td><td class="n">${n(x.l, 1)}</td></tr>`).join("") +
        `<tr class="destaque"><th scope="row">Média</th><td class="n">${mx.n}</td><td class="n${alto(mx.pc, "compra")}">${pc0(mx.pc)}</td><td class="n${alto(mx.pv, "venda")}">${pc0(mx.pv)}</td><td class="n">${sn(mx.gc, 1)}</td><td class="n">${sn(mx.gv, 1)}</td><td class="n">${n(mx.l, 1)}</td></tr></tbody>`, "nen-lista");
      box.querySelectorAll("tr[data-p]").forEach(tr => Mesa.alvo(tr, `Casos · ${rotPer(tr.dataset.p)} · ${sub}`, el => periodoCasos(el, tr.dataset.p, tipo, sub)));
      if (EST.ancora) p.corpo.append(mk("p", "leg", "A regra da venda ancorada foi escolhida depois de ver dados e testada nesta mesma amostra: não é garantia."));
    });
    const p21 = Mesa.painel(g, { cod: "NEN-21", titulo: "Previsto e realizado, caso a caso", unidade: "R$/MWh", tam: "full", ajuda: "cv-casos",
      leg: "Cada linha é um deck (a data da cotação) e um período: o que ocorreu e a compra e a venda que cada política teria cotado, com o SE realizado como insumo. Vermelho = esse lado perdeu. Clique numa linha: a conta do justo e a régua no inspetor." });
    const p22 = Mesa.painel(g, { cod: "NEN-22", titulo: "Faixas de compra e venda contra o realizado", unidade: "R$/MWh", tam: "full", ajuda: "cv-casos",
      leg: "Cada grupo de três barras é um deck, do mais antigo ao mais novo; cada barra vai da compra (embaixo) à venda (em cima) de uma política; a linha escura é o que ocorreu. Linha acima da barra: quem vendeu perdeu; abaixo: quem comprou perdeu. Cada painel tem a sua escala. Segue o produto e o submercado do NEN-21." });
    const desenhar = () => { p21.corpo.replaceChildren(); p22.corpo.replaceChildren(); desenharCasos(p21, p22); };
    desenhar();
  }
  function linhasCasos(tipo, sub) {
    return CVB.casos.filter(c => c.tipo === tipo).map(c => ({ c, r: c.real[sub], j: media(c.anos[sub].filter(y => y != null && isFinite(y))), q: { A: cotCaso(c, sub, "A"), B: cotCaso(c, sub, "B"), C: cotCaso(c, sub, "C") } }));
  }
  function desenharCasos(p21, p22) {
    const K = ST.k, base = linhasCasos(K.tipo, K.sub);
    const re = () => { p21.corpo.replaceChildren(); p22.corpo.replaceChildren(); desenharCasos(p21, p22); };
    const b = barra(p21.corpo);
    grupoAbas(b, "Produto", [["tri", "Trimestres"], ["sem", "Semestres"]], K.tipo, v => { K.tipo = v; K.per = v === "tri" ? "2026-T1" : "2026-S1"; re(); });
    grupoAbas(b, "Submercado", [["NE", "NE"], ["N", "N"]], K.sub, v => { K.sub = v; re(); });
    const pers = [...new Set(base.map(x => x.c.periodo))].sort(), decks = [...new Set(base.map(x => x.c.deck))].sort();
    if (K.per && !pers.includes(K.per)) K.per = ""; if (K.deck && !decks.includes(K.deck)) K.deck = "";
    seletor(b, "Período", [["", "todos"], ...pers.map(x => [x, rotPer(x)])], K.per, v => { K.per = v; re(); });
    seletor(b, "Deck", [["", "todos"], ...decks.map(x => [x, rot(x)])], K.deck, v => { K.deck = v; re(); });
    chave(b, "Só com perda", K.perda, v => { K.perda = v; re(); });
    chave(b, "Mostrar justo", K.justo, v => { K.justo = v; re(); });
    const perdeu = x => ["A", "B", "C"].some(k => x.r < x.q[k].compra || x.r > x.q[k].venda);
    const L = base.filter(x => (!K.per || x.c.periodo === K.per) && (!K.deck || x.c.deck === K.deck) && (!K.perda || perdeu(x))).sort((a, c) => (a.c.periodo + a.c.deck).localeCompare(c.c.periodo + c.c.deck));
    b.append(mk("span", "leg", `${L.length} de ${base.length} casos`));
    const J = K.justo;
    const box = tabela(p21.corpo, `<thead><tr><th rowspan="2">Deck</th><th rowspan="2">Período</th><th class="n" rowspan="2">Realizado</th>${J ? `<th class="n" rowspan="2">Justo</th>` : ""}` +
      ["A", "B", "C"].map(k => `<th class="n nen-sep${k === "C" ? " nen-cons" : ""}" colspan="2">${NOMEPOL[k]}</th>`).join("") + `</tr><tr>` +
      ["A", "B", "C"].map(k => `<th class="n nen-sep${k === "C" ? " nen-cons" : ""}">Compra</th><th class="n${k === "C" ? " nen-cons" : ""}">Venda</th>`).join("") + `</tr></thead><tbody>` +
      (L.map((x, i) => `<tr data-i="${i}"><td>${rot(x.c.deck)}</td><td>${rotPer(x.c.periodo)}</td><td class="n"><b>${dn(x.r)}</b></td>${J ? `<td class="n nen-j" data-j="${i}">${dn(x.j)}</td>` : ""}` +
        ["A", "B", "C"].map(k => `<td class="n nen-sep${x.r < x.q[k].compra ? " nen-perda" : ""}${k === "C" ? " nen-cons" : ""}">${dn(x.q[k].compra)}</td><td class="n${x.r > x.q[k].venda ? " nen-perda" : ""}${k === "C" ? " nen-cons" : ""}">${dn(x.q[k].venda)}</td>`).join("") + `</tr>`).join("") ||
        `<tr><td colspan="${J ? 10 : 9}" class="nen-vazio">Nenhum caso com esses filtros.</td></tr>`) + `</tbody>`, "nen-lista", true);
    box.querySelectorAll("tr[data-i]").forEach(tr => { const x = L[+tr.dataset.i]; Mesa.alvo(tr, `Caso · ${rotPer(x.c.periodo)} · deck ${rot(x.c.deck)}`, el => casoDetalhe(el, x, K.sub)); });
    box.querySelectorAll("td[data-j]").forEach(td => dicaEm(td, () => dicaJusto(L[+td.dataset.j], K.sub)));
    // faixas contra o realizado, por período (a partir de 2025)
    p22.corpo.append(mk("div", null, QC.legenda([[CORPOL.A, NOMEPOL.A], [CORPOL.B, NOMEPOL.B], [CORPOL.C, NOMEPOL.C], ["var(--ink)", "Realizado", "l"]])));
    const mult = mk("div", "nen-mult"); p22.corpo.append(mult);
    [...new Set(base.map(x => x.c.periodo))].sort().filter(q => q >= "2025").forEach(per => {
      const cs = base.filter(x => x.c.periodo === per).sort((a, c) => a.c.deck.localeCompare(c.c.deck)), real = cs[0].r;
      const vals = cs.flatMap(x => ["A", "B", "C"].flatMap(k => [x.q[k].compra, x.q[k].venda])).concat([real, 0]);
      const e = eixo(Math.min(...vals), Math.max(...vals), 4);
      const d = mk("div", "mini", `<div class="ttl">${rotPer(per)}<span>realizado ${dn(real)}</span></div>`); mult.append(d);
      grafico(d, (svg, w, h) => {
        const m2 = { l: 36, r: 6, t: 8, b: 20 };
        const larg = (w - m2.l - m2.r) / cs.length, X = i => m2.l + (i + 0.5) * larg, Y = v => m2.t + (h - m2.t - m2.b) * (1 - (v - e.a) / (e.b - e.a));
        e.t.forEach(t => { S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(t), y2: Y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m2.l - 4, y: Y(t) + 3, "text-anchor": "end" }, dn(t, 0)); });
        S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(0), y2: Y(0), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
        const bw = Math.max(3, Math.min(7, larg / 4));
        cs.forEach((x, i) => {
          ["A", "B", "C"].forEach((k, j) => { const cx = X(i) + (j - 1) * (bw + 1.5), q = x.q[k];
            S(svg, "rect", { x: cx - bw / 2, y: Y(q.venda), width: bw, height: Math.max(1.5, Y(q.compra) - Y(q.venda)), fill: CORPOL[k], opacity: 0.85 }); });
          if (cs.length <= 5 || i % 2 === 0) S(svg, "text", { x: X(i), y: h - 5, "text-anchor": "middle" }, rot(x.c.deck));
          const alvo = S(svg, "rect", { x: X(i) - larg / 2, y: m2.t, width: larg, height: h - m2.t - m2.b, fill: "transparent", style: "cursor:pointer" });
          dicaEm(alvo, `<b>Deck ${rot(x.c.deck)}</b> · ${rotPer(per)}<br>realizado ${dn(x.r)}` + ["A", "B", "C"].map(k => `<br>${NOMEPOL[k]}: ${dn(x.q[k].compra)} a ${dn(x.q[k].venda)}`).join(""));
          alvo.addEventListener("click", () => Mesa.inspecionar(`Caso · ${rotPer(per)} · deck ${rot(x.c.deck)}`, el => casoDetalhe(el, x, K.sub)));
        });
        S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(real), y2: Y(real), stroke: "var(--ink)", "stroke-width": 1.8 });
      }, null, `Compra, venda e realizado, ${rotPer(per)}`);
    });
  }
  // nome do i-ésimo mês de um período do backtest ("2026-T1", "2025-S2")
  function mesDoCaso(per, i) {
    const y = per.slice(0, 4), k = +per.slice(-1), m0 = per.includes("-T") ? (k - 1) * 3 + 1 : (k - 1) * 6 + 1;
    return rot(`${y}-${String(m0 + i).padStart(2, "0")}`);
  }
  function dicaJusto(x, sub) {
    const v = [...x.c.anos[sub]].filter(y => y != null && isFinite(y)).sort((a, b) => a - b), C = x.q.C;
    return `<b>${rotPer(x.c.periodo)} · deck ${rot(x.c.deck)} · ${sub}</b><br>Anos climáticos: ${v.map(y => dn(y)).join(" · ")}<br>` +
      `Justo = média dos ${v.length} anos: <b>${dn(x.j)}</b><br>Realizado ${dn(x.r)} · erro ${sn(x.r - x.j, 1)}<br>Conservador: ${dn(C.compra)} (${n(x.j - C.compra, 1)} abaixo) a ${dn(C.venda)} (${n(C.venda - x.j, 1)} acima)`;
  }
  function casoDetalhe(el, x, sub) {
    const v = [...x.c.anos[sub]].filter(y => y != null && isFinite(y)).sort((a, b) => a - b);
    let html = trio([["Realizado", dn(x.r)], ["Justo", dn(x.j), `erro ${sn(x.r - x.j, 1)}`], ["Anos", String(v.length)]]);
    html += `<p class="nen-ins-l">${sub} · ${rotPer(x.c.periodo)} cotado no deck de ${rot(x.c.deck)}, com o SE realizado como insumo.</p><div class="nen-regua"></div>`;
    html += `<div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Política</th><th class="n">Compra</th><th class="n">Venda</th><th class="n">Ganho C / V</th></tr></thead><tbody>` +
      ["A", "B", "C"].map(k => { const q = x.q[k]; return `<tr${k === "C" ? ' class="destaque"' : ""}><td>${NOMEPOL[k]}</td><td class="n${x.r < q.compra ? " nen-perda" : ""}">${dn(q.compra)}</td><td class="n${x.r > q.venda ? " nen-perda" : ""}">${dn(q.venda)}</td><td class="n">${sn(x.r - q.compra, 1)} / ${sn(q.venda - x.r, 1)}</td></tr>`; }).join("") + `</tbody></table></div>`;
    html += `<h3>Venda ancorada mês a mês</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Mês</th><th class="n">Horas</th><th class="n">Modelo</th><th class="n">Histórico</th></tr></thead><tbody>` +
      x.c.meses.map((m, i) => `<tr><td>${mesDoCaso(x.c.periodo, i)}</td><td class="n">${n(m.h)}</td><td class="n">${dn(CVC.precificar(m.anos[sub], POL.B).venda)}</td><td class="n">${m.hist[sub] != null ? dn(m.hist[sub]) : "—"}</td></tr>`).join("") + `</tbody></table></div>`;
    html += `<p class="leg">Anos climáticos do produto, do menor ao maior: ${v.map(y => dn(y)).join(" · ")}. Só entram os anos presentes em todos os meses. O justo é o mesmo nas três políticas; vermelho = esse lado perdeu.</p>`;
    el.innerHTML = html;
    regua(el.querySelector(".nen-regua"), { cor: COR[sub], rotulo: "Anos climáticos, cotação e realizado", fmtEixo: t => dn(t, 0),
      pontos: x.c.anos[sub].filter(y => y != null && isFinite(y)).map(y => ({ v: y, dica: `Ano climático: ${dn(y)}` })),
      marcas: [{ rot: "R", v: x.r, cor: "var(--ink)", dica: `<b>Realizado</b>: ${dn(x.r)}` }, { rot: "C", v: x.q.C.compra, cor: "var(--accent)", tracejado: true, dica: `<b>Compra Conservador</b>: ${dn(x.q.C.compra)}` },
        { rot: "V", v: x.q.C.venda, cor: "var(--accent)", tracejado: true, dica: `<b>Venda Conservador</b>: ${dn(x.q.C.venda)}` }, { rot: "J", v: x.j, cor: "var(--ink-3)", dica: `<b>Justo</b>: ${dn(x.j)}` }] });
  }
  function periodoCasos(el, per, tipo, sub) {
    const L = CVB.casos.filter(c => c.tipo === tipo && c.periodo === per).sort((a, b) => a.deck.localeCompare(b.deck));
    el.innerHTML = `<p class="nen-ins-l">${sub} · ${rotPer(per)} · política ${nomePolitica()} · realizado ${dn(L[0] ? L[0].real[sub] : null)}</p>` +
      `<div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Deck</th><th class="n">Compra</th><th class="n">Venda</th><th class="n">Largura</th></tr></thead><tbody>` +
      L.map(c => { const q = cotCaso(c, sub, "X"), r = c.real[sub]; return `<tr><td>${rot(c.deck)}</td><td class="n${r < q.compra ? " nen-perda" : ""}">${dn(q.compra)}</td><td class="n${r > q.venda ? " nen-perda" : ""}">${dn(q.venda)}</td><td class="n">${n(q.venda - q.compra, 1)}</td></tr>`; }).join("") +
      `</tbody></table></div><p class="leg">Vermelho = esse lado perdeu. Todos os decks do período erram do mesmo jeito: o resultado é “tudo ou nada” por período.</p>`;
  }

  // ================================================================ 6 · MOD Desempenho do modelo (backtest do descolamento)
  const C_ = DS.comparacao;
  const pega = (per, alvo, rec, ab) => C_[per].find(r => r.alvo === alvo && r.recorte === rec && r.abordagem === ab) || {};
  const ABORD = [["modelo v2.2", "Modelo v2.2"], ["assumir zero", "Assumir zero"], ["climatologia", "Climatologia estatística"], ["repetir ano anterior", "Repetir o ano anterior"]];
  const nomeAb = k => (ABORD.find(a => a[0] === k) || [k, k])[1];
  const mT = pega("trimestre", "2026", "treinada", "modelo v2.2"), mS = pega("semestre", "2026", "treinada", "modelo v2.2");
  const ALTS = ABORD.slice(1).map(([k, r]) => ({ k, r, e: pega("trimestre", "2026", "treinada", k).eam_NE })).sort((a, b) => a.e - b.e);
  const CLIM = pega("trimestre", "2026", "treinada", "climatologia"), ZERO = pega("trimestre", "2026", "treinada", "assumir zero");
  function telaMOD(area) {
    const hr = PD.hidr_ne.resumo;
    Mesa.decisao(area, [
      { r: "Erro médio NE · trimestres 2026", v: n(mT.eam_NE, 1), d: `R$/MWh · ${mT.n} casos com treino`, principal: true },
      { r: "Contra a melhor alternativa", v: `−${n((1 - mT.eam_NE / ALTS[0].e) * 100)}%`, d: `${ALTS[0].r}: ${n(ALTS[0].e, 1)}` },
      { r: "Realizado dentro da faixa", v: pct(mT.cobertura), d: `faixa média R$ ${n(mT.largura_NE, 1)} · clim. ${pct(CLIM.cobertura)}` },
      { r: "CRPS NE · modelo × clim.", v: `${n(mT.crps_NE, 1)} × ${n(CLIM.crps_NE, 1)}`, d: "menor é melhor" },
      { r: `Hidráulica NE · ${PD.hidr_ne.janela} meses`, v: `${n(hr.eam_ultimos_pct, 1)}%`, d: hr.acima_gatilho ? "acima do gatilho: repetir testes" : `erro do nível; gatilho ${n(PD.hidr_ne.gatilho_pct)}%` },
    ]);
    const g = Mesa.grade(area);
    painelVivo(g, { cod: "NEN-23", titulo: "Erro médio por abordagem", unidade: "R$/MWh", tam: "m", ajuda: "d-resultado", fixo: true,
      leg: `NE, trimestres de 2026, ${mT.n} casos com treino; menor é melhor. O modelo errou ${n((1 - mT.eam_NE / ALTS[0].e) * 100)}% menos que a alternativa de menor erro.` }, p => {
      grafico(p.corpo, (svg, w, h) => {
        const m2 = { l: Math.min(170, w * 0.44), r: 44, t: 6, b: 6 };
        const L = ABORD.map(([k, r]) => ({ k, r, v: pega("trimestre", "2026", "treinada", k).eam_NE })).sort((a, b) => a.v - b.v);
        const vmax = Math.max(...L.map(x => x.v)), bh = (h - m2.t - m2.b) / L.length;
        L.forEach((x, i) => {
          const y = m2.t + i * bh, larg = (w - m2.l - m2.r) * x.v / vmax, mod = x.k === "modelo v2.2";
          S(svg, "text", { x: m2.l - 8, y: y + bh / 2 + 4, "text-anchor": "end", style: `fill:var(${mod ? "--ink" : "--ink-2"});font-weight:${mod ? 600 : 400}` }, x.r);
          const r = S(svg, "rect", { x: m2.l, y: y + bh * 0.18, width: Math.max(larg, 2), height: bh * 0.64, fill: mod ? "var(--accent)" : "var(--bar-pers)" });
          S(svg, "text", { x: m2.l + larg + 6, y: y + bh / 2 + 4, style: `fill:var(--ink);font-weight:${mod ? 600 : 400}` }, n(x.v, 1));
          dicaEm(r, `<b>${x.r}</b><br>erro médio ${n(x.v, 1)} R$/MWh por trimestre em 2026`);
        });
      }, null, "Erro médio de cada abordagem");
    });
    painelVivo(g, { cod: "NEN-24", titulo: "Comparação com as alternativas", unidade: "R$/MWh", tam: "xl", ajuda: "d-desempenho", fixo: true, abas: [["2026", "2026"], ["todos", "Todos os recortes"]], abasRotulo: "Recorte",
      leg: `Erro médio = média de |previsto − realizado|. Só casos em que o modelo tinha histórico do semestre na data do deck (${mT.n} trimestres e ${mS.n} semestres de 2026). Cobertura só vale junto com a largura; CRPS pune errar o centro e abrir demais. Viés negativo = previu mais descolamento. Decks: ${DS.decks.map(rot).join(", ")}.` }, (p, rec) => {
      if (rec === "2026") {
        const n25 = pega("trimestre", "2025", "treinada", "modelo v2.2").n;
        tabela(p.corpo, `<thead><tr><th>Abordagem</th><th class="n">NE 2026 tri.</th><th class="n">NE 2026 sem.</th><th class="n">N 2026 tri.</th><th class="n">Dentro da faixa</th><th class="n">Largura média</th><th class="n">NE 2025 tri.*</th></tr></thead><tbody>` +
          ABORD.map(([k, r]) => { const t = pega("trimestre", "2026", "treinada", k), se = pega("semestre", "2026", "treinada", k), t25 = pega("trimestre", "2025", "treinada", k);
            return `<tr class="${k === "modelo v2.2" ? "destaque" : ""}"><th scope="row">${r}</th><td class="n">${n(t.eam_NE, 1)}</td><td class="n">${n(se.eam_NE, 1)}</td><td class="n">${n(t.eam_N, 1)}</td><td class="n">${t.cobertura != null ? pct(t.cobertura) : "sem faixa"}</td><td class="n">${t.largura_NE != null ? n(t.largura_NE, 1) : "—"}</td><td class="n">${n(t25.eam_NE, 1)}</td></tr>`; }).join("") + `</tbody>`, "nen-lista");
        p.corpo.append(mk("p", "leg", `* 2025: ${n25} trimestres, só do 2º semestre (não havia histórico de 1º semestre na época). Todas as abordagens usam o mesmo SE realizado.`));
      } else {
        tabela(p.corpo, `<thead><tr><th>Produto</th><th>Alvo</th><th>Abordagem</th><th class="n">Casos</th><th class="n">Erro NE</th><th class="n">Viés NE</th><th class="n">Erro N</th><th class="n">Dentro</th><th class="n">Largura</th><th class="n">CRPS NE</th></tr></thead><tbody>` +
          ["trimestre", "semestre"].flatMap(per => C_[per].filter(r => r.recorte === "treinada").map(r => `<tr class="${r.abordagem === "modelo v2.2" ? "destaque" : ""}"><td>${per === "trimestre" ? "Trimestre" : "Semestre"}</td><td>${r.alvo}${r.alvo === "2025" ? " (2º sem)" : ""}</td>` +
            `<td>${nomeAb(r.abordagem)}</td><td class="n">${r.n}</td><td class="n">${n(r.eam_NE, 1)}</td><td class="n">${dn(r.vies_NE)}</td><td class="n">${n(r.eam_N, 1)}</td><td class="n">${r.cobertura != null ? pct(r.cobertura) : "—"}</td><td class="n">${r.largura_NE != null ? n(r.largura_NE, 1) : "—"}</td><td class="n">${r.crps_NE != null ? n(r.crps_NE, 1) : "—"}</td></tr>`)).join("") + `</tbody>`, "nen-lista", true);
      }
    });
    const D2026 = DS.casos.trimestre.filter(c => c.periodo.startsWith("2026"));
    painelVivo(g, { cod: "NEN-26", titulo: "Previsto × realizado nos trimestres de 2026 (NE)", unidade: "R$/MWh", tam: "full", ajuda: "d-resultado", fixo: true,
      leg: "Cada grupo é a previsão de um deck para o trimestre, do mais antigo ao mais novo, só decks que já tinham histórico do semestre. Cada painel tem a sua escala (o T3 tem valores bem menores). Onde ainda erra: T2/26 travou nas horas de SE mais caro, que o perfil médio não capta; o regime do k (raso × fundo) é a principal fonte de erro do 1º semestre." }, p => {
      p.corpo.append(mk("div", null, QC.legenda([["var(--ink)", "Realizado", "l"], ["var(--accent)", "Modelo v2.2 (barra = faixa)"], ["var(--nen-clim)", "Climatologia estatística"], ["var(--nen-rep)", "Repetir o ano anterior"], ["var(--ink-3)", "Assumir zero", "t"]])));
      const mult = mk("div", "nen-mult"); p.corpo.append(mult);
      [...new Set(D2026.map(c => c.periodo))].sort().forEach(per => {
        const cs = D2026.filter(c => c.periodo === per).sort((a, b) => a.deck.localeCompare(b.deck));
        const vals = cs.flatMap(c => [c.NE_real, c.NE_mod, c.NE_mod_min, c.NE_mod_max, c.NE_clim, c.NE_clim_min, c.NE_clim_max, c.NE_repetir].filter(v => v != null)); vals.push(0);
        const e = eixo(Math.min(...vals), 0, 4);
        const d = mk("div", "mini", `<div class="ttl">${rotPer(per)}<span>realizado ${dn(cs[0].NE_real)}</span></div>`); mult.append(d);
        grafico(d, (svg, w, h) => {
          const m2 = { l: 36, r: 6, t: 8, b: 20 };
          const larg = (w - m2.l - m2.r) / cs.length, X = i => m2.l + (i + 0.5) * larg, Y = v => m2.t + (h - m2.t - m2.b) * (1 - (v - e.a) / (e.b - e.a));
          e.t.forEach(t => { S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(t), y2: Y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m2.l - 4, y: Y(t) + 3, "text-anchor": "end" }, dn(t, 0)); });
          S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(0), y2: Y(0), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
          S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(cs[0].NE_real), y2: Y(cs[0].NE_real), stroke: "var(--ink)", "stroke-width": 1.8 });
          cs.forEach((c, i) => {
            const x = X(i), dx = Math.min(9, larg / 4);
            S(svg, "line", { x1: x, x2: x, y1: Y(c.NE_mod_min), y2: Y(c.NE_mod_max), stroke: "var(--accent)", "stroke-width": 3, opacity: 0.35 });
            S(svg, "circle", { cx: x, cy: Y(c.NE_mod), r: 4, fill: "var(--accent)" });
            if (c.NE_clim_min != null) S(svg, "line", { x1: x - dx, x2: x - dx, y1: Y(c.NE_clim_min), y2: Y(c.NE_clim_max), stroke: "var(--nen-clim)", "stroke-width": 3, opacity: 0.35 });
            S(svg, "rect", { x: x - dx - 3.5, y: Y(c.NE_clim) - 3.5, width: 7, height: 7, fill: "var(--nen-clim)" });
            const yr = Y(c.NE_repetir);
            S(svg, "polygon", { points: `${x + dx},${yr - 5} ${x + dx + 5},${yr + 4} ${x + dx - 5},${yr + 4}`, fill: "var(--nen-rep)" });
            if (cs.length <= 5 || i % 2 === 0) S(svg, "text", { x, y: h - 5, "text-anchor": "middle" }, rot(c.deck));
            const alvo = S(svg, "rect", { x: x - larg / 2, y: m2.t, width: larg, height: h - m2.t - m2.b, fill: "transparent", style: "cursor:pointer" });
            dicaEm(alvo, `<b>Deck ${rot(c.deck)}</b> · ${rotPer(per)}<br>realizado ${dn(c.NE_real)}<br>modelo ${dn(c.NE_mod)} (faixa ${dn(c.NE_mod_min)} a ${dn(c.NE_mod_max)})` +
              `<br>climatologia ${dn(c.NE_clim)}${c.NE_clim_min != null ? ` (${dn(c.NE_clim_min)} a ${dn(c.NE_clim_max)})` : ""}<br>repetir ${dn(c.NE_repetir)} · zero 0,0`);
            alvo.addEventListener("click", () => Mesa.inspecionar(`Caso · ${rotPer(per)} · deck ${rot(c.deck)}`, el => casoModelo(el, c)));
          });
        }, null, `Previsto e realizado, ${rotPer(per)}`);
      });
    });
    painelVivo(g, { cod: "NEN-27", titulo: "Previsto e realizado, caso a caso", unidade: "R$/MWh", tam: "xl", ajuda: "d-desempenho", fixo: true,
      leg: "Modelo e climatologia estatística: justo em negrito e, embaixo, a faixa. Assumir zero prevê 0,0 em todos os casos. Só casos com histórico do semestre na data do deck. Clique numa linha: o caso no inspetor." }, p => desenharCasosModelo(p));
    painelVivo(g, { cod: "NEN-28", titulo: "Acerto por trimestre fechado", unidade: "NE, R$/MWh", tam: "s", ajuda: "d-resultado", fixo: true,
      leg: "Previsão do deck mais recente antes do início do trimestre. Sem treino = o modelo ainda não tinha histórico daquele semestre e previa zero." }, p => {
      tabela(p.corpo, `<thead><tr><th>Tri.</th><th>Deck</th><th class="n">Real</th><th class="n">Previsto</th><th class="n">Erro</th></tr></thead><tbody>` +
        DS.periodos.map(q => `<tr><th scope="row">T${q.periodo.slice(-1)}/${q.periodo.slice(2, 4)}</th><td>${rot(q.deck)}</td><td class="n">${dn(q.real)}</td>` +
          (q.treinada ? `<td class="n">${dn(q.prev)}<span class="nen-fx">${dn(q.min)} a ${dn(q.max)}</span></td><td class="n">${dn(q.erro)}</td>` : `<td class="n nen-ref" colspan="2">sem treino</td>`) + `</tr>`).join("") + `</tbody>`, "nen-lista");
    });
    const H = PD.historico_rodadas, MARCOS = PD.hist_marcos || [], SEMR = { "1S": "1º semestre", "2S": "2º semestre" };
    const ANOS_H = ["2027", "2028", "2029"], CORH = ["var(--accent)", "var(--ink-2)", "var(--bar-saz)"];
    const ne27 = d => { const r = H.find(x => x.deck === d); return r && r.anos["2027"] ? dn(r.anos["2027"].NE) : "—"; };
    painelVivo(g, { cod: "NEN-29", titulo: "Histórico de rodadas", unidade: "NE por ano, R$/MWh", tam: "l", ajuda: "d-rodadas", fixo: true,
      leg: MARCOS.map(m => `◆ Degrau em ${rot(m.deck)}: NE 2027 ${ne27(m.deck_antes)} → ${ne27(m.deck)}. Não é erro nem mudança de deck: o ${SEMR[m.regime]} tinha só ${n(m.horas_antes)} horas descoladas no treino (mínimo ${n(m.minimo)}) e passou a ${n(m.horas)} com dados até ${rot(m.dados_ate)}.`).join(" ") +
        ` Cada rodada com a mesma curva de referência: SE plano em R$ ${n(H.length ? H[0].se_ref : 200)}/MWh.` }, p => {
      p.corpo.append(mk("div", null, QC.legenda([...ANOS_H.map((a, i) => [CORH[i], `NE ${a}`, i === 2 ? "t" : "l"]), ["var(--ink)", "Publicada"]]) ));
      grafico(p.corpo, (svg, w, h) => {
        const m2 = { l: 44, r: 14, t: 12, b: 24 };
        const vals = H.flatMap(r => ANOS_H.map(a => r.anos[a] && r.anos[a].NE).filter(v => v != null)); vals.push(0);
        const e = eixo(Math.min(...vals), Math.max(...vals), 4);
        const X = i => m2.l + (H.length === 1 ? 0.5 : i / (H.length - 1)) * (w - m2.l - m2.r), Y = v => m2.t + (h - m2.t - m2.b) * (1 - (v - e.a) / (e.b - e.a));
        e.t.forEach(t => { S(svg, "line", { x1: m2.l, x2: w - m2.r, y1: Y(t), y2: Y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m2.l - 6, y: Y(t) + 3, "text-anchor": "end" }, dn(t, 0)); });
        ANOS_H.forEach((a, k) => {
          const pts = H.map((r, i) => (r.anos[a] ? [X(i), Y(r.anos[a].NE), r] : null)).filter(Boolean);
          S(svg, "polyline", { points: pts.map(q => `${q[0]},${q[1]}`).join(" "), fill: "none", stroke: CORH[k], "stroke-width": 2, "stroke-dasharray": k === 2 ? "5 4" : null });
          pts.forEach(([x, y, r]) => { const c = S(svg, "circle", { cx: x, cy: y, r: 3.2, fill: r.reconstruida ? "var(--surface)" : "var(--ink)", stroke: CORH[k], "stroke-width": 1.5 });
            dicaEm(c, `<b>Deck ${rot(r.deck)}</b> · ${r.versao}${r.reconstruida ? " (reconstruída)" : " (publicada)"}<br>NE ${a}: ${dn(r.anos[a].NE)} · N ${a}: ${dn(r.anos[a].N)}<br>trava ${pct(r.anos[a].trava)} · renovável NE ${n(r.anos[a].renov_NE, 1)} GW`); });
        });
        rotulosX(svg, H.map((_, i) => i), X, h - 6, i => (/-(01|07)$/.test(H[i].deck) ? rot(H[i].deck) : null), 40);
        MARCOS.forEach(m => { const i = H.findIndex(r => r.deck === m.deck); if (i < 0) return;
          S(svg, "line", { x1: X(i), x2: X(i), y1: m2.t, y2: h - m2.b, stroke: "var(--ink-3)", "stroke-dasharray": "1 4" });
          const tx = S(svg, "text", { x: X(i) + 4, y: m2.t + 10, style: "fill:var(--accent);cursor:help" }, "◆"); dicaEm(tx, `${SEMR[m.regime]} entra no treino em ${rot(m.deck)} (ver a legenda)`); });
      }, "alto", "Descolamento do NE por ano ao longo dos decks");
    });
    painelVivo(g, { cod: "NEN-30", titulo: "Rodadas", unidade: "R$/MWh · GW", tam: "l", ajuda: "d-rodadas", fixo: true,
      leg: "Mais nova em cima. Rodadas reconstruídas (em cinza) mostram como a versão vigente teria visto cada deck do passado; não são o que foi publicado. Clique numa rodada: todos os anos e semestres no inspetor." }, p => {
      const HR = [...H].reverse(), v = (r, a, s) => (r.anos[a] ? dn(r.anos[a][s]) : "—"), gw = (r, a, s) => (r.anos[a] ? n(r.anos[a][s], 1) : "—");
      const box = tabela(p.corpo, `<thead><tr><th>Deck</th><th>Versão</th><th class="n">NE 27</th><th class="n">NE 28</th><th class="n">NE 29</th><th class="n">N 27</th><th class="n">N 28</th><th class="n">Renov. 27</th><th class="n">Lim. 27</th></tr></thead><tbody>` +
        HR.map((r, i) => `<tr data-i="${i}" class="${r.reconstruida ? "nen-recon" : ""}"><th scope="row">${rot(r.deck)}${MARCOS.some(m => m.deck === r.deck) ? " ◆" : ""}</th><td>${r.versao}</td><td class="n">${v(r, "2027", "NE")}</td><td class="n">${v(r, "2028", "NE")}</td><td class="n">${v(r, "2029", "NE")}</td>` +
          `<td class="n">${v(r, "2027", "N")}</td><td class="n">${v(r, "2028", "N")}</td><td class="n">${gw(r, "2027", "renov_NE")}</td><td class="n">${gw(r, "2027", "lim_NE")}</td></tr>`).join("") + `</tbody>`, "nen-lista", true);
      box.querySelectorAll("tr[data-i]").forEach(tr => { const r = HR[+tr.dataset.i]; Mesa.alvo(tr, `Rodada · deck ${rot(r.deck)}`, el => rodadaDetalhe(el, r)); });
    });
    painelVivo(g, { cod: "NEN-25", titulo: "O mesmo trimestre em anos diferentes", unidade: "NE realizado, R$/MWh", tam: "m", ajuda: "d-resultado", fixo: true,
      leg: "Descolamento realizado do NE por trimestre (média ponderada por horas) e, em cinza, o SE médio. Com o SE no piso (2022–2024 em boa parte do ano) não há como o NE descolar." }, p => {
      const T = DS.trimestres, anos = [...new Set(T.map(t => t.ano))].sort();
      tabela(p.corpo, `<thead><tr><th>Tri.</th>${anos.map(a => `<th class="n">${a}</th>`).join("")}</tr></thead><tbody>` +
        [1, 2, 3, 4].map(q => `<tr><th scope="row">T${q}</th>` + anos.map(a => { const t = T.find(x => x.ano === a && x.tri === q);
          return t ? `<td class="n"><b>${dn(t.NE)}</b><span class="nen-fx">SE ${n(t.SE)}</span></td>` : `<td class="n nen-ref">—</td>`; }).join("") + `</tr>`).join("") + `</tbody>`, "nen-lista");
      const t25 = DS.trimestres.find(t => t.ano === 2025 && t.tri === 1), t26 = DS.trimestres.find(t => t.ano === 2026 && t.tri === 1);
      p.corpo.append(mk("p", "nen-conc", `O T1 foi de 0 em 2023–24 (SE no piso) a ${dn(t25 && t25.NE)} em 2025 e ${dn(t26 && t26.NE)} em 2026. Nos trimestres de 2026 avaliados, o descolamento médio foi R$ ${n(ZERO.eam_NE, 1)} (o erro de quem prevê zero); o erro do modelo equivale a ${n(mT.eam_NE / ZERO.eam_NE * 100)}% disso.`));
    });
    painelVivo(g, { cod: "NEN-31", titulo: "Acompanhamento da hidráulica do NE", unidade: "nível usado × realizado", tam: "xl", ajuda: "d-hidr", fixo: true,
      leg: `O modelo repete, em todos os cenários, a hidráulica do NE do mesmo mês no ano mais recente. Gatilho para repetir os testes (itens 24 e 25): erro médio absoluto do nível acima de ${n(PD.hidr_ne.gatilho_pct)}% por ${n(PD.hidr_ne.janela)} meses seguidos (fixado antes de ver a série). Reconstrução com a versão vigente; só meses com pelo menos 60% das horas do DESSEM; erro = usado − realizado, em % do realizado.` }, p => {
      const A = PD.hidr_ne, R = A.resumo, L = A.linhas;
      const duas = mk("div", "nen-duas"); p.corpo.append(duas);
      const e1 = mk("div"), e2 = mk("div"); duas.append(e1, e2);
      e1.append(mk("div", "nen-fatos", `<p><span class="rotulo">Desde ${rot(L[0].mes)}</span> Erro médio absoluto do nível: <b>${n(R.eam_pct, 1)}%</b> em ${R.n} meses, com viés de ${sn(R.vies_pct, 1)}% (positivo = o modelo usou mais do que aconteceu).</p>` +
        `<p><span class="rotulo">Últimos ${A.janela} meses</span> Erro médio absoluto <b>${n(R.eam_ultimos_pct, 1)}%</b>, viés ${sn(R.vies_ultimos_pct, 1)}%; ${R.mesmo_sinal_ultimos} dos ${A.janela} no mesmo sentido. ${R.acima_gatilho ? "<b>Acima do gatilho:</b> repetir os testes." : `Abaixo do gatilho de ${n(A.gatilho_pct)}%.`}</p>`));
      grafico(e1, (svg, W, Hh) => linhas(svg, W, Hh, { n: L.length, series: [{ nome: "Usado", v: L.map(x => x.usado), cor: "var(--accent)" }, { nome: "Realizado", v: L.map(x => x.real), cor: "var(--ink)", larg: 1.5 }],
        fmt: v => n(v, 2) + " GW", rotX: i => (/-(01|07)$/.test(L[i].mes) ? rot(L[i].mes) : null), titX: i => `${rot(L[i].mes)} · deck ${rot(L[i].deck)} · perfil de ${L[i].ano_usado} · erro ${sn(L[i].erro_pct, 1)}%` }), "baixo", "Hidráulica do NE usada e realizada");
      tabela(e2, `<thead><tr><th>Mês</th><th>Deck</th><th>Perfil</th><th class="n">Usado</th><th class="n">Real</th><th class="n">Erro</th></tr></thead><tbody>` +
        [...L].reverse().map(r => `<tr><th scope="row">${rot(r.mes)}</th><td>${rot(r.deck)}</td><td>${r.ano_usado}</td><td class="n">${n(r.usado, 2)}</td><td class="n">${n(r.real, 2)}</td><td class="n"><b>${sn(r.erro_pct, 1)}%</b></td></tr>`).join("") + `</tbody>`, "nen-lista", true);
    });
  }
  function desenharCasosModelo(p) {
    const K = ST.d, base = DS.casos[K.tipo];
    const b = barra(p.corpo);
    grupoAbas(b, "Produto", [["trimestre", "Trimestre"], ["semestre", "Semestre"]], K.tipo, v => { K.tipo = v; K.per = ""; p.re(); });
    const pers = [...new Set(base.map(c => c.periodo))].sort(), decks = [...new Set(base.map(c => c.deck))].sort();
    if (K.per && !pers.includes(K.per)) K.per = ""; if (K.deck && !decks.includes(K.deck)) K.deck = "";
    seletor(b, "Período", [["", "todos"], ...pers.map(x => [x, rotPer(x)])], K.per, v => { K.per = v; p.re(); });
    seletor(b, "Deck", [["", "todos"], ...decks.map(x => [x, rot(x)])], K.deck, v => { K.deck = v; p.re(); });
    chave(b, "Só fora da faixa do modelo", K.fora, v => { K.fora = v; p.re(); });
    const L = base.filter(c => (!K.per || c.periodo === K.per) && (!K.deck || c.deck === K.deck) && (!K.fora || c.NE_real < c.NE_mod_min - 1 || c.NE_real > c.NE_mod_max + 1)).sort((a, c) => (a.periodo + a.deck).localeCompare(c.periodo + c.deck));
    b.append(mk("span", "leg", `${L.length} de ${base.length} casos`));
    const fx = (c, s, a) => (c[`${s}_${a}_min`] != null ? `<span class="nen-fx">${dn(c[`${s}_${a}_min`])} a ${dn(c[`${s}_${a}_max`])}</span>` : "");
    const box = tabela(p.corpo, `<thead><tr><th>Deck</th><th>Período</th><th class="n">SE</th><th class="n nen-sep">NE real</th><th class="n">NE modelo</th><th class="n">NE clim.</th><th class="n">NE repetir</th><th class="n nen-sep">N real</th><th class="n">N modelo</th><th class="n">N clim.</th><th class="n">N repetir</th></tr></thead><tbody>` +
      (L.map((c, i) => `<tr data-i="${i}"><td>${rot(c.deck)}</td><td>${rotPer(c.periodo)}</td><td class="n">${n(c.SE, 1)}</td>` +
        SUBS.map(s => `<td class="n nen-sep"><b>${dn(c[s + "_real"])}</b></td><td class="n"><b>${dn(c[s + "_mod"])}</b>${fx(c, s, "mod")}</td><td class="n">${dn(c[s + "_clim"])}${fx(c, s, "clim")}</td><td class="n">${dn(c[s + "_repetir"])}</td>`).join("") + `</tr>`).join("") ||
        `<tr><td colspan="11" class="nen-vazio">Nenhum caso com esses filtros.</td></tr>`) + `</tbody>`, "nen-lista", true);
    box.querySelectorAll("tr[data-i]").forEach(tr => { const c = L[+tr.dataset.i]; Mesa.alvo(tr, `Caso · ${rotPer(c.periodo)} · deck ${rot(c.deck)}`, el => casoModelo(el, c)); });
  }
  function casoModelo(el, c) {
    let html = `<p class="nen-ins-l">${rotPer(c.periodo)} previsto no deck de ${rot(c.deck)}, SE realizado ${n(c.SE, 1)} como insumo${c.treinada ? "" : " (sem treino do semestre)"}.</p>`;
    SUBS.forEach(s => {
      html += `<h3 style="color:${COR[s]}">${s} · realizado ${dn(c[s + "_real"])}</h3><div class="nen-regua" data-s="${s}"></div><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Abordagem</th><th class="n">Previsto</th><th class="n">Faixa</th><th class="n">Erro</th></tr></thead><tbody>` +
        [["mod", "Modelo v2.2"], ["clim", "Climatologia estatística"], ["repetir", "Repetir o ano anterior"], ["zero", "Assumir zero"]].map(([k, t]) => {
          const v = c[`${s}_${k}`]; return `<tr${k === "mod" ? ' class="destaque"' : ""}><td>${t}</td><td class="n">${dn(v)}</td><td class="n">${c[`${s}_${k}_min`] != null ? `${dn(c[`${s}_${k}_min`])} a ${dn(c[`${s}_${k}_max`])}` : "—"}</td><td class="n">${sn(v - c[s + "_real"], 1)}</td></tr>`; }).join("") +
        `</tbody></table></div><p class="leg">CRPS modelo ${n(c["crps_" + s], 2)} × climatologia ${n(c["crps_clim_" + s], 2)} (menor é melhor).</p>`;
    });
    el.innerHTML = html;
    el.querySelectorAll(".nen-regua").forEach(rg => { const s = rg.dataset.s;
      regua(rg, { cor: COR[s], rotulo: `Previsto e realizado ${s}`, fmtEixo: t => dn(t, 0), pontos: [],
        marcas: [{ rot: "R", v: c[s + "_real"], cor: "var(--ink)", dica: `Realizado ${dn(c[s + "_real"])}` }, { rot: "M", v: c[s + "_mod"], cor: "var(--accent)", dica: `Modelo ${dn(c[s + "_mod"])}` },
          { rot: "C", v: c[s + "_clim"], cor: "var(--nen-clim)", tracejado: true, dica: `Climatologia ${dn(c[s + "_clim"])}` }, { rot: "A", v: c[s + "_repetir"], cor: "var(--nen-rep)", tracejado: true, dica: `Repetir o ano anterior ${dn(c[s + "_repetir"])}` }, { rot: "0", v: 0, cor: "var(--ink-3)", tracejado: true, dica: "Assumir zero" }] }); });
  }
  function rodadaDetalhe(el, r) {
    const anos = Object.keys(r.anos).sort();
    el.innerHTML = `<p class="nen-ins-l">Deck ${rot(r.deck)} · ${r.versao} · ${r.reconstruida ? "reconstruída com a versão vigente" : `publicada em ${dataHoraBr(r.rodada)}`} · dados até ${rot(r.dados_ate)} · SE plano R$ ${n(r.se_ref)}</p>` +
      `<div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Ano</th><th class="n">NE</th><th class="n">N</th><th class="n">Trava</th><th class="n">Renov.</th><th class="n">Carga</th><th class="n">Lim.</th></tr></thead><tbody>` +
      anos.map(a => { const x = r.anos[a]; return `<tr><td>${a}</td><td class="n">${dn(x.NE)}</td><td class="n">${dn(x.N)}</td><td class="n">${pct(x.trava)}</td><td class="n">${n(x.renov_NE, 1)}</td><td class="n">${n(x.carga_NE, 1)}</td><td class="n">${n(x.lim_NE, 1)}</td></tr>`; }).join("") + `</tbody></table></div>` +
      (r.semestres ? `<h3>Semestres</h3><div class="rolagem"><table class="nen-t nen-det"><thead><tr><th>Semestre</th><th class="n">NE</th><th class="n">N</th></tr></thead><tbody>` +
        Object.entries(r.semestres).map(([k, x]) => `<tr><td>${rotPer(k)}</td><td class="n">${dn(x.NE)}</td><td class="n">${dn(x.N)}</td></tr>`).join("") + `</tbody></table></div>` : "") +
      `<p class="leg">GW do NE (renovável, carga e limite de exportação). Trava = % das horas com o NE travado.</p>`;
  }

  // ================================================================ 7 · MET Metodologia (compra e venda; descolamento; fundamentos)
  let irMetAlvo = null;
  function irMet(ancora) { const i = TELAS.findIndex(t => t.cod === "MET") + 1; irMetAlvo = ancora; Mesa.ir("NEN", i); }
  function secoesMet() {
    const CV = PD.cv_exemplo, per = rotPer(CV.meta.periodo), NE = CV.cenarios.map(c => c.NE);
    const mesesEx = CV.meses.map(m => ({ h: m.h, anos: m.anos.NE, hist: m.hist.NE }));
    const exCompra = CVC.cotarLado(NE, "compra", POL.B), exVendaB = CVC.cotarLado(NE, "venda", POL.B), exVendaC = CVC.vendaProduto(mesesEx, POL.B, true), exJusto = media(NE);
    const MA = { A: metricas("tri", "NE", "A"), B: metricas("tri", "NE", "B"), C: metricas("tri", "NE", "C") }, MN = { A: metricas("tri", "N", "A"), B: metricas("tri", "N", "B"), C: metricas("tri", "N", "C") };
    const nTri = CVB.casos.filter(c => c.tipo === "tri").length, pTri = new Set(CVB.casos.filter(c => c.tipo === "tri").map(c => c.periodo)).size;
    const nSem = CVB.casos.filter(c => c.tipo === "sem").length, pSem = new Set(CVB.casos.filter(c => c.tipo === "sem").map(c => c.periodo)).size;
    const histMedia = (() => { const hs = CV.meses.map(m => (m.hist.NE != null ? m.hist.NE : CVC.precificar(m.anos.NE, POL.B).venda)); return hs.reduce((a, v, i) => a + v * CV.meses[i].h, 0) / CV.meses.reduce((a, m) => a + m.h, 0); })();
    const LEIT = { "0.2|1": "p menor: lados mais próximos dos extremos", "0.3|1": "política Conservador (sem âncora)", "0.4|1": "p maior: lados mais perto do justo", "0.3|0.5": "λ menor: compra mais perto do justo", "0.3|0.15": "λ pequeno: compra quase no justo" };
    const dif = CV.cenarios.map(c => c["NE-N"]);
    const tab = (cab, linhas) => `<div class="rolagem"><table class="nen-t nen-lista"><thead><tr>${cab.map(c => `<th${/^n:/.test(c) ? ' class="n"' : ""}>${c.replace(/^n:/, "")}</th>`).join("")}</tr></thead><tbody>${linhas.join("")}</tbody></table></div>`;
    const lista = itens => `<ul class="lista">${itens.map(([t, x]) => `<li><span class="tag">${t}</span><span>${x}</span></li>`).join("")}</ul>`;
    const tec = (titulo, html) => `<details class="nen-tec"><summary>${titulo}</summary><div>${html}</div></details>`;
    const S0 = [];
    const sec = (grupo, id, titulo, html) => S0.push({ grupo, id, titulo, html });
    const GCV = "Compra e venda", GD = "Descolamento (modelo)", GF = "Fundamentos e física", GR = "Referência";
    // ---- compra e venda
    sec(GCV, "cv-resumo", "Em uma tela", `<p>Nos trimestres do NE, a <b>compra</b> perdia em ${pc0(MA.A.pc)} dos períodos e passou a perder em ${pc0(MA.C.pc)}; a <b>venda</b> caiu de ${pc0(MA.A.pv)} para ${pc0(MA.B.pv)} com o λ = 1 e para <b>${pc0(MA.C.pv)}</b> com o Conservador. Em troca, a banda foi de R$ ${n(MA.A.l, 1)} para R$ ${n(MA.C.l, 1)}.</p>` +
      tab(["Política", "n:Compra perdeu", "n:Venda perdeu", "n:Ganho compra", "n:Ganho venda", "n:Banda"], ["A", "B", "C"].map(k => `<tr${k === "C" ? ' class="destaque"' : ""}><td>${NOMEPOL[k]}</td><td class="n">${pc0(MA[k].pc)}</td><td class="n">${pc0(MA[k].pv)}</td><td class="n">${sn(MA[k].gc, 1)}</td><td class="n">${sn(MA[k].gv, 1)}</td><td class="n">${n(MA[k].l, 1)}</td></tr>`)) +
      `<p class="leg">NE, trimestres: ${MA.A.n} casos em ${MA.A.periodos} períodos (cada período pesa igual). No N: venda ${pc0(MN.A.pv)} → ${pc0(MN.B.pv)} → ${pc0(MN.C.pv)} e compra ${pc0(MN.A.pc)} → ${pc0(MN.B.pc)} → ${pc0(MN.C.pc)}, por poucos reais. Os valores são R$/MWh do descolamento (PLD do submercado − PLD do SE, negativo quando fica abaixo do SE). Os exemplos usam o deck ${rot(CV.meta.deck)} com SE plano de R$ ${n(CV.meta.se)} e <b>não são cotações</b>.</p>`);
    sec(GCV, "cv-processo", "Do SE à cotação, em seis passos", `<ol class="nen-passos">
      <li><b>A mesa informa a curva do Sudeste.</b> O SE é insumo da mesa: nunca vem do NEWAVE e o modelo não o projeta. Pode ser informado por ano, semestre, trimestre ou mês; cada período usa o nível mais específico.</li>
      <li><b>O modelo calcula o descolamento em cada ano climático.</b> Para a curva informada, estima hora a hora quanto o NE e o N ficam abaixo do SE, em cada ano climático (2021 em diante), o que dá cinco ou seis valores por produto. O preço justo é a média.</li>
      <li><b>Cada produto vira uma pequena distribuição.</b> O valor do produto em cada ano climático é a média dos seus meses, ponderada por horas. São poucos pontos.</li>
      <li><b>A compra e a venda saem de uma política de risco.</b> A compra fica abaixo do justo, a venda acima. A política vigente é a Conservador: compra no pior ano climático do produto e venda no melhor ano do modelo, sem nunca ficar abaixo do que já se realizou.</li>
      <li><b>A venda é ancorada no que o mercado já fez.</b> Mês a mês, a venda é o maior entre o melhor ano do modelo e o maior descolamento já realizado naquele mês do calendário (em fração da folga do SE informado).</li>
      <li><b>O trader negocia dentro da banda.</b> A mesa cota a banda; o justo fica no meio como referência. Os preços não incluem custos, liquidez, saída antes do vencimento nem o risco do SE.</li></ol>`);
    sec(GCV, "cv-instrumento", "O instrumento", `<p>O produto paga o <b>descolamento</b> do período: o PLD do submercado (NE ou N) menos o PLD do SE, em R$/MWh, médio no período e ponderado por horas. Períodos: mês, trimestre, semestre e ano.</p>
      <div class="eq">d = PLD do submercado − PLD do SE (média do período)<br>comprar a P: recebe d e paga P → ganho = d − P (perde se o descolamento vier abaixo de P)<br>vender a P: paga d e recebe P → ganho = P − d (perde se vier acima de P)</div>
      <p>O descolamento do NE e do N costuma ser negativo: comprar a um P mais negativo é comprar mais barato; vender a um P menos negativo é vender mais caro. O preço do submercado é a leitura equivalente: SE + descolamento.</p>
      <h3>Exemplo: ${per} do NE, SE a R$ ${n(CV.meta.se)}</h3>` +
      tab(["Ano climático", "n:NE", "n:N"], [...CV.cenarios.map(c => `<tr><td>${c.ano}</td><td class="n">${dn(c.NE)}</td><td class="n">${dn(c.N)}</td></tr>`), `<tr class="destaque"><td>Preço justo</td><td class="n">${dn(exJusto)}</td><td class="n">${dn(media(CV.cenarios.map(c => c.N)))}</td></tr>`]) +
      `<p>Com a Conservador, a mesa cotaria compra a <b>${dn(exCompra)}</b> e venda a <b>${dn(exVendaC)}</b>. Ganho de cada lado conforme o realizado:</p>` +
      tab(["Se o realizado for…", "n:Valor", "n:Quem compra", "n:Quem vende"], [["o pior ano", Math.min(...NE)], ["o preço justo", exJusto], ["o melhor ano", Math.max(...NE)]].map(([t, x]) => `<tr><td>${t}</td><td class="n">${dn(x)}</td><td class="n"><b>${sn(x - exCompra, 1)}</b></td><td class="n"><b>${sn(exVendaC - x, 1)}</b></td></tr>`)));
    sec(GCV, "cv-politicas", "As três políticas comparadas", tab(["Política", "Compra", "Venda", "Em uma frase"], [
      `<tr><td><b>Antes</b> · v1, λ = 0,50</td><td>Quantil p = 0,30 ou cauda α = 10% com λ = 0,50, o mais conservador</td><td>O mesmo, no espelho</td><td>Ponto de partida: banda estreita, perto do justo. Nunca testada como política da mesa.</td></tr>`,
      `<tr><td><b>λ = 1</b>, sem âncora</td><td>Pior ano climático do produto</td><td>Melhor ano climático do produto</td><td>A banda cobre os dois extremos dos anos climáticos, sem olhar o realizado.</td></tr>`,
      `<tr class="destaque"><td><b>Conservador</b> · λ = 1 + âncora</td><td>Pior ano climático (igual à anterior)</td><td>Mês a mês, o maior entre o melhor ano do modelo e o maior descolamento já realizado no mês</td><td>O que a mesa usa. Só a venda sobe.</td></tr>`]) +
      `<p>De “Antes” para “λ = 1”, os <i>dois</i> lados foram aos extremos. De “λ = 1” para “Conservador”, só a <i>venda</i> mudou: nos testes, o realizado ficou menos negativo que o melhor ano do modelo em vários meses, e quem vende barato demais perde.</p>`);
    sec(GCV, "cv-ancora", "Venda: o histórico realizado", `<p><b>O problema.</b> A venda só pelos anos climáticos ficou baixa demais em testes da mesa: no ${per} do NE (SE plano R$ ${n(CV.meta.se)}) a venda pelo modelo com λ = 1 sai em <b>${dn(exVendaB)}</b>, mas em fev/26 o descolamento realizado foi só −2,3 com o SE em R$ 382. Os anos climáticos não incluem o que já se realizou naquele mês do calendário.</p>
      <p><b>A regra (âncora no realizado).</b> Mês a mês, a venda é o <b>maior</b> entre:</p>` + lista([["Venda do modelo", "A venda climática do mês com λ = 1: o melhor ano climático naquele mês."],
        ["Venda pelo histórico", "O descolamento já realizado naquele mês do calendário (2021 até D−2), em <b>fração da folga</b> (descolamento ÷ (SE − piso)), aplicado à folga do SE informado. Vale a maior fração (a menos negativa); só anos com folga de pelo menos R$ 20. O ano que a deu é o “ano de referência” (◆ na FUN)."]]) +
      `<p>O produto é a média dos meses ponderada por horas. A compra não muda. A âncora é uma chave na política (NEN-4).</p><h3>Exemplo: ${per} do NE</h3>` +
      tab(["Mês", "n:Venda do modelo", "n:Venda pelo histórico", "n:Ano · % da folga", "n:Venda usada"], [...CV.meses.map(m => { const mod = CVC.precificar(m.anos.NE, POL.B).venda, hh = m.hist.NE, ref = m.ref.NE, usa = hh != null ? Math.max(mod, hh) : mod;
        return `<tr><td>${rot(m.mes)}</td><td class="n">${dn(mod)}</td><td class="n">${hh != null ? dn(hh) : "—"}</td><td class="n">${ref ? `${ref.ano} · ${dn(ref.fracao * 100, 1)}%` : "—"}</td><td class="n"><b>${dn(usa)}</b> ${hh != null && hh > mod ? "histórico" : "modelo"}</td></tr>`; }),
        `<tr class="destaque"><td>Trimestre</td><td class="n">${dn(CVC.vendaProduto(mesesEx, POL.B, false))}</td><td class="n">${dn(histMedia)}</td><td></td><td class="n">${dn(exVendaC)}</td></tr>`]) +
      `<div class="nota"><b>Por que fração da folga e não R$.</b> Em mar/21 o descolamento foi −31,0, menor em R$ que o de mar/26 (−51,5); mas em 2021 o SE estava em R$ 109 e −31,0 consumiu 52% da folga, enquanto em 2026 (SE R$ 302) −51,5 consumiu 21%. <b>O ano de referência de cada mês é fixo</b> para um dado histórico: o SE digitado só muda a folga em que a fração é aplicada.</div>`);
    sec(GCV, "cv-resultado", "Resultado do backtest", `<p>Para cada deck e cada trimestre ou semestre que ainda não tinha começado na data do deck, calculamos a compra e a venda de cada política e comparamos com o descolamento que ocorreu. Só entram os casos em que o modelo já tinha histórico do período (${nTri} casos de trimestre em ${pTri} períodos e ${nSem} de semestre em ${pSem}). Cada período pesa o mesmo, porque todos os decks erram o mesmo período do mesmo jeito. <b>Perder</b> é o realizado ficar abaixo da compra (quem compra perde) ou acima da venda (quem vende perde).</p><p>A tabela das três políticas está na BT (NEN-19), e a política escolhida na COT, período a período, no NEN-20. Uma perda média menor não é melhor se a perda acontece mais vezes; a largura mede a cautela (e a perda de competitividade) da banda.</p>`);
    sec(GCV, "cv-casos", "Previsto e realizado, caso a caso", `<p>Cada linha do NEN-21 é um deck (a data da cotação) e um período: o que ocorreu e a compra e a venda que cada política teria cotado naquela data, com o SE realizado como insumo (isola o erro do modelo do erro da curva do SE). A célula fica em vermelho quando aquele lado perdeu. “Só com perda” deixa os casos em que alguma política perdeu; “Mostrar justo” acrescenta a média dos anos climáticos, com a conta no tooltip. O NEN-22 mostra as mesmas faixas como barras contra o realizado.</p>`);
    sec(GCV, "cv-limites", "O que o backtest não prova", lista([["Poucos períodos", "Cinco trimestres e três semestres distintos. Os casos de trimestre valem, na prática, 5 observações independentes. Ler como direção, não como significância."],
      ["Âncora escolhida depois", "A regra Conservador nasceu de um caso da mesa (T1/27 a R$ 270) e foi testada na mesma amostra. A próxima prova são os períodos que ainda vão fechar."],
      ["SE realizado", "O teste dá ao modelo o SE que ocorreu. O risco da curva do SE da mesa <b>não está no preço</b>."], ["Sem preço de mercado", "Ganho ao vencimento contra o realizado; não se sabe se a banda é competitiva nem o resultado de sair antes."],
      ["Custo da cautela", "Banda mais larga perde negócios para quem cota mais apertado; o volume não feito não é medido."], ["Compra do N", "Perde em mais da metade dos períodos, mas por poucos reais. Ponto em aberto da política."]]));
    sec(GCV, "cv-telas", "Como ler as telas da mesa", lista([["COT", "Linha de decisão com a compra e a venda do NE e do N no próximo produto e no ano. NEN-1 é a entrada (curva do SE); NEN-2 é a tabela principal: NE e N por ano, semestres, trimestres e meses, com compra em cima e venda embaixo; NEN-3 é a lista por produto, para copiar ao Excel; NEN-4 é a política."],
      ["Descritivo", "Clicar numa compra ou venda abre no inspetor: os três números, a régua dos anos climáticos, cada ano com o realizado do mesmo produto, o critério (quantil × cauda) e a venda mês a mês."],
      ["DES", "O descolamento previsto: por mês com a faixa, o preço justo por produto, o choque no SE e a resposta ao nível do SE."], ["FUN e FIS", "Os fundamentos do deck, o realizado (com o ano de referência da venda) e os cinco capítulos da física."],
      ["BT e MOD", "Como a cotação e o modelo se saíram no passado, caso a caso."]]) +
      `<h3>Semestres e trimestres fecham o ano</h3><p><b>Produto sozinho</b> é o padrão: a cotação do período como produto próprio (o que foi testado e o que se negocia). <b>Fechar o ano</b> mostra a <b>contribuição</b> de cada pedaço para a cotação do ano: a média por horas dos semestres (e dos trimestres) reproduz o ano. A venda do pedaço é a média da venda usada dos meses; a compra é o valor dele no ano climático que sustenta a compra do ano (o pior).</p>
      <div class="nota"><b>Contribuição não é a cotação do produto sozinho.</b> Quem negocia só o 2º semestre cota com o pior ano do próprio semestre, que pode ser outro. O descritivo mostra as duas leituras.</div>
      <p><b>O ano pelos trimestres (indicativo).</b> Em “Conferir o ano” e no descritivo da compra do ano aparece também a compra montada pelos trimestres cotados sozinhos: a conta de quem fecha trimestre a trimestre, mais conservadora. Não é a cotação do ano (D074).</p>
      <p><b>Produto informado abaixo do ano.</b> Se o SE foi informado só para um semestre, trimestre ou mês, os produtos completos aparecem pela cotação deles sozinhos; células sem preço em todos os meses mostram “—”.</p>`);
    sec(GCV, "cv-risco", "Política de risco: p, α e λ", `<p>Cada lado usa o mais conservador de dois critérios (método “combinado”). São <b>política de risco, não ajuste por dado</b>, e podem ser editados no NEN-4. A Conservador usa p = 0,30, α = 10% e λ = 1.</p>` +
      lista([["p (quantil)", "A compra fica no nível que o descolamento supera em (1 − p) dos cenários; com p = 0,30, perda tolerada de cerca de 30% de cada lado. A venda é o espelho."], ["α e λ (cauda)", "Olha os α piores cenários (α = 10%: com seis anos, o pior) e desconta da compra λ vezes a perda média neles. λ = 1 leva a compra ao pior ano."],
        ["Por que os dois", "O quantil sozinho deixava a compra no justo quando há muitos valores perto de zero e cauda para baixo (caso do NE); a cauda sozinha deixava a venda exposta."]]) +
      `<h3>Exemplo: ${per} do NE, sem âncora</h3>` + tab(["p", "λ", "n:Compra", "n:Venda", "Leitura"], [[0.2, 1], [0.3, 1], [0.4, 1], [0.3, 0.5], [0.3, 0.15]].map(([pp, l]) => {
        const k = `${pp}|${l}`; return `<tr${k === "0.3|1" ? ' class="destaque"' : ""}><td>${n(pp, 2)}</td><td>${n(l, 2)}</td><td class="n">${dn(CVC.cotarLado(NE, "compra", { p: pp, alfa: 0.10, lam: l }))}</td><td class="n">${dn(CVC.cotarLado(NE, "venda", { p: pp, alfa: 0.10, lam: l }))}</td><td>${LEIT[k]}</td></tr>`; })) +
      `<div class="nota"><b>Por que não “otimizar”.</b> Há só ${CV.meta.n_cenarios} anos climáticos neste período (${Object.values(CV.meta.n_cenarios_trimestres).join(", ")} nos trimestres de 2027): α = 10% é exatamente o pior ano e o quantil interpola entre dois anos. Ajustar por dado seria falsa precisão.</div>`);
    sec(GCV, "cv-naocobre", "O que o preço não cobre", lista([["Risco do SE", "O SE é a curva da mesa; o modelo não o projeta. Quanto mais alto o SE, mais negativo o descolamento."], ["Erro do modelo", "A banda é variabilidade climática mais a âncora. Nos trimestres de 2026 a faixa cobriu cerca de 75% a 78% dos realizados; não inclui o regime do k nem o erro dos insumos do deck."],
      ["Poucos anos", "Cinco ou seis cenários por período: quantis e caudas são aproximações grosseiras."], ["Saída antecipada", "Sem preço de mercado, sair antes de liquidar não é medido."], ["Custos e liquidez", "Comissões, garantias, liquidez e contraparte não entram."], ["Piso e teto", "Com o SE perto do piso o descolamento vai a zero; o modelo respeita os limites do ano."]]));
    sec(GCV, "cv-swap", "Swap (fora desta mesa)", `<p>Um swap troca duas pernas (submercado, período, curva de SE e volume); o preço é o spread. Com uma perna no SE, o risco vem só do descolamento da outra: a cotação é a do produto deslocada pela diferença de SE (spread = PLD de quem recebe − k × PLD de quem paga). <b>NE × N</b> está em teste: nenhum método atendeu os critérios pré-registrados. A interface de swap está oculta no app e <b>não foi trazida para a mesa</b>.</p><h3>Exemplo: NE e N, ${per}</h3>` +
      tab(["Ano climático", "n:NE", "n:N", "n:NE − N"], CV.cenarios.map(c => `<tr><td>${c.ano}</td><td class="n">${dn(c.NE)}</td><td class="n">${dn(c.N)}</td><td class="n"><b>${dn(c["NE-N"], 2)}</b></td></tr>`)) +
      `<p class="leg">O NE e o N descolam juntos neste trimestre: a diferença fica perto de zero e só um ano a separa (${dn(CV.swap_ne_n.max, 2)}). Com a Conservador, o spread NE − N sairia entre ${dn(CVC.cotarLado(dif, "compra", POL.B), 2)} e ${dn(CVC.cotarLado(dif, "venda", POL.B), 2)}.</p><div class="nota"><b>Duas premissas.</b> O risco do SE de cada perna não está no modelo; o mesmo ano climático nas duas pernas pode subestimar o risco entre períodos diferentes.</div>`);
    sec(GCV, "cv-prereg", "Pré-registros e o caminho até aqui", `<p>Cada fase foi escrita <b>antes</b> de rodar o teste.</p>` + lista([["Fase 2a", "A cotação só climática (v1) não estava calibrada: com p = 30%, a venda do NE perdeu em cerca de 60% dos períodos e a compra do N em cerca de 73%. O erro é tudo ou nada por período e o sinal muda com o trimestre."],
      ["Fase 2a-bis", "Calibrar o resíduo em torno do justo (R$ ou fração da folga) reduziu o erro de calibração de cerca de 0,26 para 0,06 em validação por período."], ["Exploração", "Misturar meses entre anos estreitou a distribuição e não ajudou. Cruzar a hidrologia do N alarga a cauda da compra (perda de 23% para 7%) e não mexe na venda."],
      ["Venda ancorada", "Compor a venda mês a mês com o maior realizado levou a perda da venda do NE em trimestres de 27% para 0% e a largura de 24,3 para 28,9. Regra definida depois de ver os dados."], ["Swap NE × N", "Nenhum dos quatro métodos testados atendeu os critérios; compra pelo cruzado e venda pela âncora zerou as perdas, mas é exploração pós-hoc."]]));
    sec(GCV, "cv-decisoes", "Decisões e o motivo de cada uma", tab(["ID", "Decisão", "Por quê"], [
      ["D042", "Cada lado (compra e venda) é calculado sozinho, com uma curva de SE e os seus parâmetros.", "Quem opera um lado não precisa informar o outro."],
      ["D043", "Comprar = receber d e pagar P; vender = pagar d e receber P.", "O descolamento isolado é o que o modelo estima; o PLD do submercado é leitura equivalente."],
      ["D044", "p, α e λ são entradas editáveis.", "É política de risco da mesa; ajustar por dado seria falsa precisão."], ["D045", "Swap = diferença ano climático a ano climático.", "Preserva a correlação entre as pernas."],
      ["D046", "Backtest ao vencimento, com SE realizado como insumo.", "Não há preço de mercado; o risco do SE fica fora."], ["D047", "O erro do modelo entra como parcela separada, calibrada só com alvos encerrados.", "Deixa visível o que vem do clima, do erro e da margem. Até lá a cotação não inclui o erro."],
      ["D049", "Uma só política, a Conservador, com a âncora como chave; p, α e λ no avançado.", "Quanto mais entradas, pior para decidir; só o λ = 1 tem backtest."],
      ["D050", "Venda = maior entre o melhor ano do modelo e o maior realizado do mês (fração da folga), mês a mês; compra = pior ano.", "A venda do modelo ficou negativa demais (fev/26 −2,3 com SE R$ 382); perda da venda do NE de 27% para 0% com largura 19% maior."],
      ["D051", "Fechar o ano mostra a contribuição de cada pedaço.", "A soma dos pedaços tem de reproduzir o preço do ano."], ["D052", "Produtos informados abaixo do ano aparecem sozinhos.", "A mesa precifica por pedaços."],
      ["D055", "O valor principal de cada célula é o produto sozinho.", "O backtest validou o produto sozinho; a contribuição é menos conservadora."], ["D056", "“Antes” = v1 com λ = 0,50.", "O λ = 0,30 da v1 nunca foi testado; 0,50 é só referência."],
      ["D074", "A compra do ano pelos trimestres é só indicativo.", "O produto maior sozinho não perdeu mais que a média das peças; a compra pelos trimestres seria R$ 3 a 6 mais baixa sem ganho de risco medido."]].map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`)));
    // ---- descolamento (modelo)
    sec(GD, "d-resumo", "Em uma tela", `<p>O modelo estima quanto o PLD do NE e do N fica abaixo do PLD do SE, mês a mês, a partir da curva do SE informada pela mesa e dos insumos físicos do último deck do NEWAVE.</p>` +
      lista([["1 · Insumos", "Curva do SE da mesa (nunca do NEWAVE) e, do deck, só renovável, carga e limites de intercâmbio."], ["2 · Quando trava", "Em cada hora, a chance de a energia do NE/N ficar presa, pela sobra física da região."],
        ["3 · Quanto descola", "Quando trava, o preço do NE/N cai uma fração k da distância entre o SE e o piso."], ["4 · Preço justo", "Cada ano histórico é um cenário de vento, sol e chuva; o justo é a média e a faixa vai do pior ao melhor ano."]]) +
      `<div class="eq">descolamento do mês = − média das horas de [ chance de travar × k × máx(SE da hora − piso, 0) ]</div>`);
    sec(GD, "d-dados", "1. Dados e corte de informação", `<p>O modelo aprende com o histórico horário do DESSEM (geração, carga, fluxos e restrições) e com o PLD horário, desde 2021. Para um deck do mês D, só entram dados até o fim de D−2. Do NEWAVE não se usa o preço, só os insumos de planejamento.</p>` +
      tec("Detalhe técnico", lista([["Fontes", "CCEE: DESSEM (<code>PDO_SIST</code>, <code>PDO_RESTOPER</code>), PLD horário, decks NEWAVE (<code>SISTEMA.DAT</code>, <code>AGRINT.DAT</code>). ONS: corte de geração (diagnóstico)."], ["Corte", "Treino e perfis com horas anteriores ao início de D−1; testes verificam que a previsão não muda com dados posteriores a D−2."], ["PLD", "PLD = CMO limitado ao piso e ao teto do ano. Descolamento = PLD do submercado − PLD do SE."]])));
    sec(GD, "d-regimes", "2. Dois regimes", `<p>No <b>1º semestre</b> (úmido) sobra energia no N e no NE juntos e trava o tronco N/NE→SE: N e NE descolam juntos. No <b>2º semestre</b> (ventos) o NE sozinho exporta perto do limite e trava o limite de exportação do NE. O modelo é ajustado separado para cada semestre (FIS, capítulos 2 e 3).</p>`);
    sec(GD, "d-trava", "3. Chance de travar", `<p>Para cada hora, o modelo estima a probabilidade de o NE (e o N) estar descolado a partir de duas medidas: quanto sobra de energia no N+NE e quão perto o NE está do limite de exportação.</p>` +
      tec("Detalhe técnico", `<div class="eq">P(trava<sub>h</sub>) = logística( β<sub>0</sub> + β<sub>1</sub>·sobra N+NE<sub>h</sub> + β<sub>2</sub>·margem de exportação NE<sub>h</sub> )</div>` + lista([["Ajuste", "Regressão logística por semestre e submercado, variáveis padronizadas, horas desde jan/2024 até D−2. Alvo: hora com descolamento maior que R$ 1/MWh."]])));
    sec(GD, "d-k", "4. Intensidade quando trava (k)", `<p>Quando trava, o NE/N não vai necessariamente ao piso. O k mede quanto da distância entre o SE e o piso é perdida: k = 1 é o NE no piso; k = 0,4, 40% do caminho. Cada ano climático usa o k observado naquele mesmo ano e semestre (k pareado): anos de muita sobra travam fundo, de pouca sobra, raso.</p>` +
      tec("Detalhe técnico", `<div class="eq">k = média, nas horas travadas, de clip( (SE − PLD<sub>sub</sub>) ÷ (SE − piso), 0, 1 )</div>` + lista([["Pareado", "Para o cenário do ano a e semestre s: k do mesmo ano e semestre, se completo até D−2, com pelo menos 50 horas travadas e folga média de pelo menos R$ 50/MWh."], ["Reserva", "Ano não elegível: média do semestre nas horas de treino desde 2024."]])));
    sec(GD, "d-balanco", "5. O balanço físico", `<p>As duas medidas saem do mesmo balanço: o que o NE e o N geram menos o que consomem. A <b>feature 1 (sobra N+NE)</b> mede quanto os dois precisam escoar pelo tronco; a <b>feature 2 (margem de exportação)</b>, quão perto o NE está do limite. Térmica fica fora (é despacho, não insumo).</p>` +
      tec("Detalhe técnico", `<div class="eq">sobra do NE = renovável NE − carga NE<br>sobra do N = renovável N + hidráulica N − carga N<br>feature 1 = sobra do NE + hidráulica NE + sobra do N<br>feature 2 = sobra do NE − limite de exportação do NE</div>` +
        tab(["Termo", "No treino", "Na projeção", "Entra em"], [["Renovável do NE", "DESSEM, balanço do NE", "perfil do ano climático × nível do deck", "1 e 2"], ["Carga do NE", "DESSEM", "perfil do ano × carga do deck × viés", "1 e 2"], ["Hidráulica do NE", "DESSEM", "perfil do ano mais recente no mesmo mês", "1"],
          ["Renovável e hidráulica do N", "DESSEM, balanço do N", "a do próprio ano climático", "1"], ["Carga do N", "DESSEM", "perfil do ano × carga do deck × viés", "1"], ["Limite de exportação do NE", "limite da restrição no DESSEM", "<code>AGRINT.DAT</code> do deck", "2"], ["Térmica", "fora", "fora", "nenhuma"]].map(r => `<tr>${r.map(x => `<td>${x}</td>`).join("")}</tr>`)) +
        `<div class="nota"><b>Testado, não adotado (D037).</b> Somar a hidráulica do NE à margem melhora o ajuste (AUC do 2º semestre de 0,90 para 0,93) mas piora a previsão: o erro médio do NE nos trimestres de 2026 vai de 10,4 para 10,7 (até 15,7 nas duas medidas). A definição fica como está.</div>`));
    sec(GD, "d-cenarios", "6. Cenários climáticos", `<p>Cada ano histórico (desde 2021) é um cenário: a forma horária de vento, sol, carga e a hidrologia do Norte daquele ano, com renovável e carga do NE e do N levadas ao nível do deck para o mês-alvo. Todos os anos têm o mesmo peso.</p>`);
    sec(GD, "d-horario", "7. Do SE mensal ao SE de cada hora", `<p>O SE da mesa é mensal; o descolamento depende do SE em cada hora. O modelo distribui o SE do mês pelas horas com o perfil médio do SE (preço da hora ÷ preço do mês) daquele mês do calendário. Em nenhuma hora o NE vai abaixo do piso.</p>` +
      tec("Detalhe técnico", `<div class="eq">d<sub>mês</sub> = − Σ<sub>h</sub> c<sub>h</sub> · máx( SE · perfil<sub>h</sub> − piso, 0 ), c<sub>h</sub> = (soma de P(trava)·k nas horas h) ÷ horas do mês</div><p>Os c<sub>h</sub> e o perfil não dependem do SE: por isso a mesa recalcula o modelo exato para qualquer curva digitada. Piso: o do ano do deck.</p>`));
    sec(GD, "d-produto", "8. Preço justo e faixa", `<p>O preço justo de um produto é a média dos meses ponderada pelas horas, com cada mês já sendo a média dos anos climáticos. A faixa é o cenário mais e o menos descolado, cada ano agregado no produto inteiro (só anos presentes em todos os meses). O ano climático mais recente só cobre meses até D−2: entra no justo nos meses que tem e fica fora da faixa dos produtos que incluem meses sem ele.</p>` +
      tec("Exemplo: T1/27, SE R$ 200, deck out/26", tab(["Ano climático", "n:jan/27 744 h", "n:fev/27 672 h", "n:mar/27 744 h", "n:T1/27"], [["2021", "−0,2", "−11,4", "−43,8", "−18,7 menos"], ["2022", "−24,7", "−31,3", "−44,3", "−33,5"], ["2023", "−8,5", "−13,8", "−42,9", "−22,0"], ["2024", "−0,5", "−35,7", "−52,2", "−29,3"],
        ["2025", "−18,5", "−36,5", "−79,3", "−45,1 mais"], ["2026", "−0,9", "−19,3", "−39,9", "−20,1"], ["Preço justo", "−8,9", "−24,7", "−50,4", "−28,1"]].map((r, i) => `<tr${i === 6 ? ' class="destaque"' : ""}><td>${r[0]}</td>${r.slice(1).map(x => `<td class="n">${x}</td>`).join("")}</tr>`)) +
        `<div class="eq">justo T1 = (−8,9 × 744 − 24,7 × 672 − 50,4 × 744) ÷ 2.160 = −28,1 · faixa = −45,1 (2025) a −18,7 (2021)</div><p>Na mesa, clicar numa linha do NEN-6 mostra esse detalhe para a curva digitada.</p>`));
    sec(GD, "d-curva", "9. A curva do SE", `<p>O trader informa o SE no nível em que tiver preço: ano, semestre, trimestre ou mês. Vale o mais específico; os períodos não informados são derivados para fechar a média do nível acima, ponderada por horas. Dentro de cada período sem preço próprio a curva é plana (ou, opcionalmente, com a sazonalidade média do SE, instável entre anos). Sem curva salva, a mesa abre com um <b>exemplo fictício</b> de R$ ${SE_EXEMPLO}/MWh em todos os anos; a curva digitada fica salva neste navegador.</p>` +
      tec("Detalhe técnico", `<div class="eq">SE dos períodos livres = ( SE do pai × horas do pai − Σ SE dos informados × horas ) ÷ horas dos livres</div><p>Exemplo: ano = 200 e 1º semestre = 250 dão 2º semestre ≈ 150,8. Com a mesma média anual, uma curva mais alta no 1º semestre aumenta o descolamento do ano, porque é quando o NE mais trava.</p>`));
    sec(GD, "d-choque", "Choque e nível do SE", `<p>O choque (NEN-7) soma R$ ou % à curva do SE informada, em todos os meses, e recalcula o modelo exato. A resposta não é simétrica: com o SE perto do piso, um choque para baixo zera o descolamento em várias horas; ela muda com a hora em que o NE trava e com o semestre. O NEN-8 é uma derivação do mesmo modelo: o justo de cada produto se o SE fosse plano em cada nível, para ver onde o descolamento acelera.</p>`);
    sec(GD, "d-desempenho", "Desempenho: as alternativas", `<p>Teste do passado: para cada deck antigo o modelo é treinado só com o que existia e prevê os trimestres e semestres seguintes, com o SE realizado como curva. Comparação, nos mesmos casos, com três alternativas sem a física:</p>` +
      lista([["Assumir zero", "PLD do NE e do N igual ao do SE. Régua mínima; o erro é o próprio descolamento realizado."], ["Repetir o ano anterior", "O mesmo mês do último ano realizado, em fração da folga, aplicado ao SE informado."], ["Climatologia estatística", "Todos os anos desde 2021 como cenários (justo = média, faixa = menor a maior), sem a física."]]) +
      tec("Climatologia: conta e exemplo", `<div class="eq">fração do ano a = descolamento do mês em a ÷ (SE em a − piso de a), limitada a [−1, 0]<br>cenário do ano a = fração do ano a × (SE informado − piso)</div><p>Fica de fora o ano em que o SE ficou a menos de R$ 20/MWh do piso. Exemplo: mar/26, deck jan/26, SE 301,9 (folga 244,5): 2021 dá −128,0; 2022–2024 no piso, fora; 2025 dá −244,2; climatologia −186,1 contra realizado −51,5. Só sobram dois anos de trava funda; o modelo, que olha a sobra de cada cenário, ficou bem mais perto.</p>`));
    sec(GD, "d-resultado", "Resultado em 2026 e onde ainda erra", `<p>O modelo errou <b>R$ ${n(mT.eam_NE, 1)}/MWh</b> por trimestre, <b>${n((1 - mT.eam_NE / ALTS[0].e) * 100)}% menos</b> que a alternativa de menor erro (${ALTS[0].r}).</p>` +
      lista([["Faixa", `O realizado ficou dentro da faixa em <b>${pct(mT.cobertura)}</b> dos trimestres, com faixa média de R$ ${n(mT.largura_NE, 1)}. A climatologia cobriu menos (${pct(CLIM.cobertura)}) com faixa ${n(CLIM.largura_NE / mT.largura_NE, 1)} vezes mais larga. Pesando acerto e largura (CRPS), ${n(mT.crps_NE, 1)} contra ${n(CLIM.crps_NE, 1)}.`],
        ["Prever zero", `Errou menos que as alternativas históricas (R$ ${n(ZERO.eam_NE, 1)}) porque elas aplicaram a intensidade de 2025, de trava muito funda, ao SE alto de 2026. Não é método, é a régua mínima.`],
        ["1º sem/2025", "Os decks de 2024 e jan/25 não tinham histórico de 1º semestre com descolamento e previam zero para −103 (T1/25): ficam fora da comparação."],
        ["T2/2026", "Previsto entre −32 e −37 contra −43: o NE travou nas horas de SE mais caro, que o perfil médio do SE não capta."], ["Regime do k", "Anos que travam mais raso ou mais fundo que a média (T1/26 raso, 1º sem/25 fundo): principal fonte de erro do 1º semestre."]]) +
      `<p>Por que a v1 não está na comparação: ela usa o SE dos cenários do NEWAVE, não a curva informada, e foi testada em outros decks.</p>`);
    sec(GD, "d-limites", "Limitações e como usar o preço", lista([["Regime do k", "Há anos em que o NE vai ao piso quando trava (2025) e anos de trava rasa (início de 2026); o k vem do passado e não antecipa o regime."], ["Forma do SE", "O vale do SE ao meio-dia vem se aprofundando com a solar distribuída; o perfil médio é mais achatado."],
      ["Insumos do deck", "O modelo herda o erro das projeções: em 2026 os decks projetaram mais renovável no NE do que a efetiva."], ["Treino curto", "O 1º semestre só entra no treino a partir de 2025."], ["Hidráulica do NE", "Vale o perfil do ano mais recente; é acompanhada no NEN-31."], ["Amostra", "Diferenças menores que cerca de R$ 1/MWh entre versões não são conclusivas."]]) +
      `<div class="nota">A faixa representa a variabilidade climática (os anos históricos), não um intervalo de confiança completo: não inclui o regime do k nem o erro dos insumos do deck. O mês corrente não é precificado nesta versão.</div>`);
    sec(GD, "d-hidr", "Acompanhamento da hidráulica do NE", `<p>O modelo repete, em todos os cenários, a hidráulica do NE do mesmo mês no ano mais recente com dados. O NEN-31 compara o nível usado com o realizado, mês a mês, com o deck do mês anterior. Gatilho para repetir os testes de hidráulica (itens 24 e 25): erro médio absoluto acima de ${n(PD.hidr_ne.gatilho_pct)}% por ${n(PD.hidr_ne.janela)} meses seguidos, fixado antes de ver a série.</p>`);
    sec(GD, "d-rodadas", "Histórico de rodadas", `<p>Como a visão do modelo mudou de um deck para outro, com a mesma curva de referência (SE plano em R$ ${n(PD.historico_rodadas[0].se_ref)}/MWh), para comparar só o que vem do deck e dos dados novos. Rodadas reconstruídas mostram como a versão vigente teria visto cada deck do passado. Quando a versão muda, a linha marca a mudança de método.</p><p><b>Degrau.</b> Sempre que um regime ganha dado pela primeira vez, a regra do mínimo de horas por classe cria um degrau (◆): antes, a chance de travar ficava vazia e o modelo previa zero. Não há evidência de erro que justifique mudar a regra.</p>`);
    sec(GD, "d-versoes", "Versões do modelo", tab(["Versão", "Data", "O que mudou", "Por quê"], [["v2 original", "15/10/26", "Modelo estrutural horário; renovável do NE corrigida pelo viés de 12 meses.", "Ponto de partida."], ["v2.1", "15/10/26", "Renovável do NE = projeção do deck sem correção.", "Erro médio do NE em 2026 de 21,6 para 15,9."],
      ["v2.2 (vigente)", "16/10/26", "k pareado com o ano climático.", "Erro 15,9 → 15,0 e CRPS 14,2 → 11,6."]].map((r, i) => `<tr${i === 2 ? ' class="destaque"' : ""}>${r.map(x => `<td>${x}</td>`).join("")}</tr>`)) +
      `<h3>Testado depois da v2.2 e não entrou</h3>` + lista([["Insumos do NE", "Limite pelo observado, cenários de expansão, descontar o corte: o erro de 2026 veio da renovável projetada."], ["Hidráulica do NE", "Todas as variantes pioram (10,4 → 10,7 a 15,7). Tema encerrado."], ["Hidrologia e treino", "Neutros ou com troca entre anos."],
        ["Intensidade (k)", "k pela sobra do N+NE acerta o 1º semestre pelo motivo físico: candidato 7d-1S, em modelo-sombra até o 1º sem/27 (critério: melhora > R$ 0,5/MWh sem piorar nenhum trimestre nem o N)."], ["Forma horária do SE", "Corrigir melhora T2 a T4 e piora o T1."], ["Mês corrente", "O DECOMP não sinaliza bem o descolamento; precisa de outra dinâmica."]]));
    // ---- fundamentos e física
    sec(GF, "f-deck", "Fundamentos do deck", `<p>Os insumos que entram no modelo, por mês (média dos cenários): a projeção do deck e, para comparar, o último realizado do mesmo mês do calendário (para 2027 em diante a referência continua sendo o último ano realizado). Explicam o comportamento do descolamento e não dependem da curva do SE.</p>` +
      lista([["Sobra NE", "Renovável − carga do NE."], ["Folga", "Limite de exportação do NE − sobra: quanto menor, mais o NE trava."], ["Trava", "Chance média de o NE estar travado (% das horas)."], ["k", "Fração de (SE − piso) perdida nas horas em que trava."], ["Hidráulica N", "Média dos cenários (cada ano climático traz a sua)."]]));
    sec(GF, "f-realizado", "Descolamento realizado", `<p>Realizado desde 2021 (PLD da CCEE; física do DESSEM), por período e por mês, com o SE médio de cada um. Quanto mais forte o fundo, mais descolado (escala: percentil 90 dos meses). O detalhe compara o período com a média dos mesmos meses nos outros anos (posição 1º = mais descolado). Nos meses, ◆ marca o <b>ano de referência</b> da venda ancorada: o ano em que aquele mês do calendário consumiu a menor fração da folga.</p>`);
    sec(GF, "f-cap1", "Cap. 1 · Episódico e dependente do SE", `<p>O PLD do NE só fica abaixo do SE quando o SE está acima do piso. Entre 2022 e meados de 2024 o SE ficou no piso e não houve descolamento. Por isso o modelo recebe a curva do SE da mesa e calcula sobre a distância entre o SE e o piso.</p>`);
    sec(GF, "f-cap2", "Cap. 2 · Estação e hora", `<p>No período úmido (fev a mai) o NE e o N descolam quase o dia todo, mais à noite e de madrugada; no 2º semestre, só o NE, nas horas de vento. Ao meio-dia quase nunca: o SE fica barato com a solar. Por isso o modelo é horário e separa os semestres.</p>`);
    sec(GF, "f-cap3", "Cap. 3 · Dois gargalos", `<p>No 1º semestre trava o tronco N/NE→SE (os dois descolam juntos); no 2º, o limite de exportação do NE. Restrições do DESSEM (<code>PDO_RESTOPER</code>) com multiplicador acima de R$ 1/MWh; uma hora pode ter mais de uma.</p>`);
    sec(GF, "f-cap4", "Cap. 4 · Sobra e margem de exportação", `<p>AUC de cada variável para separar as horas descoladas do NE (0,5 = nada; 1 = perfeito), horas desde 2024. A sobra do N+NE separa o 1º semestre e a margem até o limite de exportação, o 2º; abaixo de um patamar a chance é quase zero. São as duas variáveis do modelo (passo 3).</p>`);
    sec(GF, "f-cap5", "Cap. 5 · Raso ou fundo", `<p>k × sobra do N+NE nos meses do 1º semestre com o NE travado (pelo menos 20 horas, desde 2021). Com pouca sobra a trava é rasa; com sobra grande o NE vai ao piso. A intensidade muda de ano para ano: é a parte mais difícil de prever (passo 4).</p>`);
    sec(GF, "f-modelo", "Do diagnóstico ao modelo", lista([["Capítulo 1", "SE da mesa: o descolamento é calculado sobre a distância entre o SE informado e o piso."], ["Capítulos 2 e 3", "Horário, dois regimes: cada hora é simulada; 1º e 2º semestres têm ajustes separados."], ["Capítulo 4", "Chance de travar: regressão sobre a sobra N+NE e a margem de exportação do NE."], ["Capítulo 5", "Intensidade e cenários: k por ano climático e faixa pelos anos históricos."]]));
    // ---- referência
    sec(GR, "proximos", "Próximos passos", lista([["Descolamento do Sul", "Física própria (descola para cima, no horário solar), com o mesmo desenho: entrada pela curva do SE e faixa por cenário."], ["Mês corrente", "Precificar o mês corrente com informação do próprio mês (revisões do DECOMP/DESSEM, realizado parcial) e atualizar a cada deck sem passo manual."],
      ["Comparar versões", "A v2.2 lado a lado com candidatas em modelo-sombra (a começar pelo 7d-1S), com o acerto de cada uma a cada deck."], ["Swap", "SE × NE e SE × N já têm a conta; NE × N segue em teste. Fechar a estrutura e validar o swap temporal."]]));
    sec(GR, "glossario", "Glossário", `<dl class="glossario">${[["Descolamento (d)", "PLD do submercado (NE ou N) − PLD do SE, médio no período e ponderado por horas. Negativo quando fica abaixo do SE."], ["PLD implícito", "SE + descolamento."], ["Preço justo", "Média dos cenários climáticos, ponderada por horas nos produtos. É a referência; o foco da cotação é a banda."],
      ["Compra / venda", "Comprar a P = receber o descolamento e pagar P; vender a P = pagar o descolamento e receber P."], ["Banda / largura", "Intervalo entre compra e venda; largura = venda − compra."], ["Perda (backtest)", "Quem compra perde se o realizado fica abaixo da compra; quem vende, se fica acima da venda."],
      ["Ano climático", "Um ano histórico usado como cenário de vento, sol, carga e hidrologia."], ["Faixa", "Cenário mais e menos descolado: variabilidade climática."], ["p, α, λ", "Probabilidade de perda tolerada; fatia dos piores cenários; fração da perda média descontada."],
      ["Conservador", "λ = 1 nos dois lados e venda ancorada no realizado."], ["Âncora no realizado", "A venda não fica abaixo do maior descolamento já realizado no mês do calendário (em fração da folga)."], ["Folga", "SE − piso do PLD do ano."], ["Ano de referência", "O ano em que um mês do calendário consumiu a menor fração da folga."],
      ["Contribuição para o ano", "Valor de um pedaço na cotação do ano; não é a cotação do pedaço sozinho."], ["Trava", "Hora em que a energia do NE/N não chega ao SE e o preço separa."], ["k", "Fração da distância SE − piso perdida quando trava (0 a 1)."], ["Sobra", "Renovável e hidráulica acima da carga."],
      ["Feature 1 / 2", "Sobra do N+NE; margem de exportação do NE (sobra do NE − limite)."], ["Piso", "Limite inferior do PLD no ano."], ["D−2", "Último mês completo de dados na data do deck do mês D."], ["CRPS", "Erro da distribuição prevista (justo e faixa juntos), em R$/MWh."], ["Cobertura", "Fração dos casos com o realizado dentro da faixa (tolerância de R$ 1/MWh)."],
      ["Perna / swap", "Lado do swap (submercado, período, curva, volume); troca de duas pernas."]].map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl>`);
    return S0;
  }
  function telaMET(area) {
    Mesa.decisao(area, [
      { r: "Política de cotação", v: nomePolitica(), d: "compra no pior ano; venda ancorada no realizado", principal: true },
      { r: "Modelo do descolamento", v: META.versao, d: "estrutural horário, k pareado" },
      { r: "Deck NEWAVE", v: rot(META.deck), d: `horizonte ${rot(META.horizonte[0])} a ${rot(META.horizonte[1])}` },
      { r: "Dados horários até", v: dataBr(META.dados_ate), d: `rodada ${dataHoraBr(META.rodada)}` },
    ]);
    const secoes = secoesMet();
    const box = Mesa.met(area, secoes);
    box.classList.add("nen-met");
    // índice agrupado: um rótulo antes do primeiro link de cada grupo (Mesa.met recebe uma lista plana)
    const nav = box.querySelector("nav"), links = [...nav.querySelectorAll("a")];
    let ant = null;
    secoes.forEach((s, i) => { if (s.grupo !== ant) { nav.insertBefore(mk("span", "nen-met-grupo", s.grupo), links[i]); ant = s.grupo; } });
    box.querySelectorAll(".m-met-texto section").forEach((s, i) => { if (i === 0 || secoes[i].grupo !== secoes[i - 1].grupo) s.prepend(mk("span", "rotulo", secoes[i].grupo)); });
    if (irMetAlvo) { const id = irMetAlvo; irMetAlvo = null; requestAnimationFrame(() => { const l = nav.querySelector(`a[data-alvo="met-${id}"]`); if (l) l.click(); }); }
  }

  // ================================================================ sinal, resumo e alertas (MESA)
  function sinal() {
    const c = temCurva() ? cotar(PROX.meses, "NE") : null;
    if (!c) return { v: `NE ${PROX.rot} sem curva do SE`, d: "informe a curva do SE", tom: "neutro" };
    return { v: `NE ${PROX.rot} ${dn(c.compra)}/${dn(c.venda)}`, d: `compra/venda · SE ${n(c.se, 0)}${EXEMPLO ? " (exemplo)" : ""}`, tom: "neutro" };
  }
  function resumo(el) {
    const prods = [PROX, { rot: ANO.T[0].rot, meses: ANO.T[0].meses }, { rot: ANO.S[0].rot, meses: ANO.S[0].meses }, { rot: ANO.S[1].rot, meses: ANO.S[1].meses }, { rot: ANO.rot, meses: ANO.meses }];
    if (!temCurva()) { el.append(semCurva()); return; }
    const box = tabela(el, `<thead><tr><th>Produto</th><th class="n">SE</th><th class="n" style="color:${COR.NE}">NE compra / venda</th><th class="n" style="color:${COR.N}">N compra / venda</th></tr></thead><tbody>` +
      prods.map((pr, i) => { const a = cotar(pr.meses, "NE"), b = cotar(pr.meses, "N");
        return `<tr data-i="${i}"><th scope="row">${pr.rot}</th><td class="n nen-ref">${a ? n(a.se, 0) : "—"}</td><td class="n"><b>${a ? `${dn(a.compra)} / ${dn(a.venda)}` : "—"}</b></td><td class="n"><b>${b ? `${dn(b.compra)} / ${dn(b.venda)}` : "—"}</b></td></tr>`; }).join("") + `</tbody>`, "nen-lista");
    box.querySelectorAll("tr[data-i]").forEach(tr => { const pr = prods[+tr.dataset.i]; Mesa.alvo(tr, `Cotação · ${pr.rot}`, e => ficha(e, pr.rot, pr.meses)); });
    el.append(mk("p", "leg", `${EXEMPLO ? `<b class="nen-ex">Curva de exemplo fictícia (SE R$ ${SE_EXEMPLO})</b>` : "Curva da mesa"} · política ${nomePolitica()} · descolamento em R$/MWh · clique num produto para a régua no inspetor.`));
  }
  function alertas() {
    const q = META.rodada, L = [];
    if (EXEMPLO) L.push({ quando: q, texto: `Cotação com curva de exemplo (SE R$ ${SE_EXEMPLO}): informe a curva da mesa`, tela: 1, nivel: "alto" });
    else if (!temCurva()) L.push({ quando: q, texto: "Curva do SE vazia: sem cotação de compra e venda", tela: 1, nivel: "alto" });
    if (temCurva()) {
      const c = cotar(ANO.meses, "NE");
      if (c && EST.ancora) { const k = c.meses.filter(m => m.hist != null && m.hist > CVC.precificar(m.anos, EST.venda).venda).length;
        if (k) L.push({ quando: q, texto: `Venda NE ${ANO.rot} ancorada no realizado em ${k} de ${c.meses.length} meses`, tela: 1 }); }
    }
    const mN = metricas("tri", "N", "C");
    if (mN.pc > 0.5) L.push({ quando: q, texto: `Compra do N perdeu em ${pc0(mN.pc)} dos trimestres no backtest (por R$ ${n(mN.sevC, 1)} em média)`, tela: 5 });
    const R = PD.hidr_ne.resumo;
    L.push({ quando: q, texto: R.acima_gatilho ? `Hidráulica do NE acima do gatilho (${n(R.eam_ultimos_pct, 1)}%): repetir os testes` : `Hidráulica do NE: erro de ${n(R.eam_ultimos_pct, 1)}% em ${PD.hidr_ne.janela} meses, abaixo do gatilho`, tela: 6, nivel: R.acima_gatilho ? "alto" : "normal" });
    return L.slice(0, 4);
  }

  // ================================================================ registro
  const comTela = fn => (area, ctx) => { REDESENHAR = []; fn(area, ctx); };
  const TELAS = [
    { cod: "COT", nome: "Cotação", montar: comTela(telaCOT) },
    { cod: "DES", nome: "Descolamento", montar: comTela(telaDES) },
    { cod: "FUN", nome: "Fundamentos e realizado", montar: comTela(telaFUN) },
    { cod: "FIS", nome: "Física", montar: comTela(telaFIS) },
    { cod: "BT", nome: "Backtest da cotação", montar: comTela(telaBT) },
    { cod: "MOD", nome: "Desempenho do modelo", montar: comTela(telaMOD) },
    { cod: "MET", nome: "Metodologia", montar: comTela(telaMET) },
  ];
  // itens a mais na fita: o ano e o N do próximo produto (o sinal já leva o NE do próximo produto)
  function fita() {
    if (!temCurva()) return [];
    return [[`N ${PROX.rot}`, PROX.meses, "N"], [`NE ${ANO.rot}`, ANO.meses, "NE"], [`N ${ANO.rot}`, ANO.meses, "N"]].map(([r, ms, sub]) => { const c = cotar(ms, sub);
      return c ? { r: `${r} compra/venda`, v: `${dn(c.compra)}/${dn(c.venda)}` } : null; }).filter(Boolean);
  }
  Mesa.registrar({ cod: "NEN", mesa: false, decisao: false, nome: "Pricing Descolamento", desc: "Compra e venda do descolamento do NE e do N contra o SE, por produto", sinal, fita, resumo, alertas, telas: TELAS });
})();
