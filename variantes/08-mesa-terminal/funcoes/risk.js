/* Variante 08 · Mesa (terminal desde o início) · funcoes/risk.js
   RISK · Risk Lab DESSEM: PLD horário do DESSEM contra o DECOMP e simulador do PLD médio do mês.
   Dados FICTÍCIOS da variante 07 (window.RLD, de ../07-terminal-app/risk_lab_dessem/dados.js) e a mesma conta do
   simulador (window.ContaSimulador, de simulador_conta.js). As contas de desenho vêm do app.js da 07, copiadas para
   dentro deste módulo; o que muda é a organização: seis telas que cabem na tela, linha de decisão no topo de cada
   uma e o detalhe (dia, revisão, mês, linha) no inspetor, em vez de blocos longos que abrem.
   Telas: 1 MON Monitor · 2 SIM Simulador · 3 PER Perfis · 4 IND Indicadores · 5 DES Desempenho · 6 MET Metodologia.
   Nada global além do Mesa.registrar; preferências em localStorage com prefixo "mesa.risk.". */
(function () {
  "use strict";
  const D = window.RLD;
  if (!D || typeof Mesa === "undefined" || !window.ContaSimulador) return;

  // ---------- constantes (as da 07) ----------
  const SUBN = { SIN: "SIN", SE: "SE/CO", S: "S", NE: "NE", N: "N" };
  const SUBS_PRECO = [["SE", "SE/CO"], ["S", "S"], ["NE", "NE"], ["N", "N"]], SUBS_FIS = [["SIN", "SIN"], ...SUBS_PRECO];
  const ehPreco = v => v === "pld" || v === "decomp";
  const subDe = (sub, v) => (sub === "SIN" && ehPreco(v) ? "SE" : sub);
  const rotSub = (sub, v) => (sub === "SIN" && ehPreco(v) ? "SE/CO (SIN não tem PLD)" : SUBN[sub]);
  const DIR = { desconto: "Desconto", neutro: "Neutro", "prêmio": "Prêmio" };
  const VALE_H = [8, 9, 10, 11, 12, 13, 14, 15], PONTA_H = [18, 19, 20, 21], NV = VALE_H.length, NP = PONTA_H.length;
  const HORAS = [...Array(24).keys()];
  const DEMAIS_H = HORAS.filter(x => !VALE_H.includes(x) && !PONTA_H.includes(x));
  const BLOCOS = [["vale", "Vale 8h–15h", "var(--risk-vale)"], ["ponta", "Ponta 18h–21h", "var(--risk-ponta)"], ["demais", "Demais horas", "var(--risk-demais)"]];
  const TIPOS = [["útil", "Dia útil", "var(--risk-util)"], ["sábado", "Sábado", "var(--risk-sab)"], ["domingo/feriado", "Domingo/feriado", "var(--risk-dom)"]];
  const SOMBRAS = [[8, 15, "var(--risk-sombra-vale)"], [18, 21, "var(--risk-sombra-ponta)"]];
  const VARS = [["pld", "PLD", "R$/MWh"], ["decomp", "DECOMP vigente", "R$/MWh"], ["carga_liquida", "Carga líquida", "MW"], ["demanda", "Demanda bruta", "MW"], ["demanda_sem_mmgd", "Demanda sem MMGD", "MW"],
    ["renov_com_mmgd", "Renovável com MMGD", "MW"], ["renov_sem_mmgd", "Renovável sem MMGD", "MW"], ["renov_saida", "Renovável gerada (saída)", "MW"]];
  const VCURTO = { pld: "PLD", decomp: "DECOMP", carga_liquida: "Carga líq.", demanda: "Demanda", demanda_sem_mmgd: "Dem. s/MMGD", renov_com_mmgd: "Ren. c/MMGD", renov_sem_mmgd: "Ren. s/MMGD", renov_saida: "Ren. gerada" };
  const classe = d => (d < -5 ? "desconto" : d > 5 ? "prêmio" : "neutro");
  const tomDir = d => (d === "desconto" ? "desce" : d === "prêmio" ? "sobe" : "neutro");
  const corDir = d => (d === "desconto" ? "var(--risk-vale)" : d === "prêmio" ? "var(--risk-verm)" : "var(--ink-3)");
  const corAno = a => `var(--risk-a${a}, var(--ink))`;
  const corTipo = t => (TIPOS.find(x => x[0] === t) || [, , "var(--ink-3)"])[2];
  const nomeTipo = t => (TIPOS.find(x => x[0] === t) || [, t])[1];
  const REG = "2025-03";

  const ref = D.referencia[0], ESTADO = D.estado, ULT = ref.ultimo_dia;
  const meses = Object.keys(D.perfis.pld.SE).sort(), ultMes = meses[meses.length - 1];
  const anos = [...new Set(meses.map(m => +m.slice(0, 4)))];
  const DSEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const diaSem = s => DSEM[new Date(s + "T12:00:00Z").getUTCDay()];
  const somaDias = (s, k) => { const t = new Date(s + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
  const inicioSemana = d => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 1) % 7); return t.toISOString().slice(0, 10); };
  const difDias = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
  const REV = Object.fromEntries((D.revisoes || []).map(r => [r[0], r]));
  const ante = k => (k === 1 ? "1 mês" : k + " meses");
  const ddmm = s => dataBr(s).slice(0, 5);
  const media = a => { const v = a.filter(x => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const notaCalc = ref.ultimo_publicado < ULT ? `PLD de ${ddmm(somaDias(ref.ultimo_publicado, 1))} a ${ddmm(ULT)} calculado do deck pela regra da CCEE (publicação pendente)` : "";
  const FONTE = `Decks do DESSEM e do DECOMP da CCEE e PLD horário publicado até ${dataBr(ref.ultimo_publicado)}${notaCalc ? "; " + notaCalc : ""}. Dados fictícios.`;

  // ---------- preferências das telas (mesa.risk.*) ----------
  function ler(k, pad) { try { const v = JSON.parse(localStorage.getItem("mesa.risk." + k)); return v && typeof v === "object" ? { ...pad, ...v } : { ...pad }; } catch (e) { return { ...pad }; } }
  function gravar(k, v) { try { localStorage.setItem("mesa.risk." + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: vale só nesta visita */ } }
  const EST = ler("telas", { sub: "SE", perN: "mes", hist: "12m", mesDias: null, pSub: "SE", pVar: "pld", pMes: null, visao: "hora", medida: "piso", mesH: null,
    iSub: "SIN", iPer: "ano", cSub: "SE", perC: "3m", pmT: "útil", pmMes: null, hBt: null, hdT: "útil", hpPer: "6m", pjT: "útil" });
  const guardar = () => gravar("telas", EST);
  const valido = (v, opc, pad) => (opc.some(o => String(o[0]) === String(v)) ? v : pad);

  // ---------- peças de tela ----------
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  function limpar(el) { if (typeof _obs !== "undefined" && _obs) el.querySelectorAll(".graf").forEach(c => _obs.unobserve(c)); el.replaceChildren(); }
  // gráfico responsivo de altura fixa (px), desenhado por grafico() do padrão na largura real
  function G(box, alt, desenhar, rotulo) { const c = grafico(box, desenhar, null, rotulo); c.style.height = alt + "px"; return c; }
  const mt = (el, esq, dir) => { const d = mk("div", "risk-mt", `<b>${esq}</b>${dir ? `<span>${dir}</span>` : ""}`); el.append(d); return d; };
  const nota = (el, t) => { const p = mk("p", "leg", t); el.append(p); return p; };
  const ttl3 = (el, t) => el.append(mk("h3", null, t));
  const pares = (el, lista) => QC.pares(el, lista.filter(Boolean));
  const legenda = (el, itens) => el.insertAdjacentHTML("beforeend", QC.legenda(itens));
  // abas com a opção guardada marcada (QC.abas marca sempre a primeira)
  function abas(opc, atual, aoTrocar, rotulo) {
    const g = mk("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo || "Opções");
    opc.forEach(([v, t]) => { const b = mk("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(String(v) === String(atual))); g.append(b); });
    g.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); aoTrocar(b.dataset.v); });
    return g;
  }
  function selecao(opc, atual, aoTrocar, rotulo) {
    const s = mk("select", "risk-sel"); s.setAttribute("aria-label", rotulo || "Escolha");
    opc.forEach(([v, t]) => { const o = mk("option", null, t); o.value = v; o.selected = String(v) === String(atual); s.append(o); });
    s.addEventListener("change", () => aoTrocar(s.value)); return s;
  }
  const noCab = (p, el) => p.acoes.insertBefore(el, p.acoes.querySelector(".p-ajuda"));
  const abasEm = (p, ...a) => noCab(p, abas(...a));
  const selEm = (p, ...a) => noCab(p, selecao(...a));
  // barra de controles da tela (vale para os painéis abaixo dela)
  function barra(area, itens) {
    const b = mk("div", "risk-barra");
    itens.filter(it => it.opc || it.txt).forEach(it => {
      const g = mk("div", "risk-barra-g"); g.append(mk("span", "risk-barra-r", it.rot));
      if (it.opc) g.append(it.sel ? selecao(it.opc, it.atual, it.aoTrocar, it.rot) : abas(it.opc, it.atual, it.aoTrocar, it.rot));
      if (it.txt) g.append(mk("span", "risk-barra-t", it.txt));
      b.append(g);
    });
    area.append(b); return b;
  }
  // elemento que abre o inspetor: fn() → { t: título, c: html ou (el) => desenha }
  function alvoR(el, fn) { if (!el) return; let r;  // sem elemento (ex.: tela com decisao: false, cards vazios), nada a ligar
    Mesa.alvo(el, () => (r = fn()).t, c => { if (typeof r.c === "function") r.c(c); else c.innerHTML = r.c; }); }
  const remontar = (area, fn) => { const st = area.scrollTop; limpar(area); fn(area); area.scrollTop = st; };

  // ---------- gráfico de linhas genérico (o do app.js da 07) + alvo: clique abre o inspetor ----------
  // series: [{nome, cor, pts: [[x, y]...], larg, tracejado, opac, pontos, rotFim}]; xs: valores de x; rotX(x, i) rótulo
  function linhasA(svg, o) {
    const w = o.w, hh = o.h, m = { l: o.ml ?? 42, r: o.mr ?? 8, t: o.mt ?? 10, b: 24 };
    const ys = o.series.flatMap(s => s.pts.map(p => p[1])).filter(v => v != null && isFinite(v));
    if (!ys.length) { S(svg, "text", { x: w / 2, y: hh / 2, "text-anchor": "middle" }, "sem dados no período"); return; }
    const ax = eixo(o.y0 != null ? Math.min(o.y0, ...ys) : Math.min(...ys), o.y1 != null ? Math.max(o.y1, ...ys) : Math.max(...ys), o.nt || 5, o.justo);
    const xs = o.xs, ix = new Map(xs.map((v, i) => [String(v), i]));
    const x = o.centro ? (v => m.l + (ix.get(String(v)) + 0.5) * (w - m.l - m.r) / xs.length)
      : (v => m.l + (xs.length === 1 ? 0.5 : ix.get(String(v)) / (xs.length - 1)) * (w - m.l - m.r));
    const y = v => m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
    (o.sombras || []).forEach(([a, b, cor]) => S(svg, "rect", { x: x(a) - 4, y: m.t, width: x(b) - x(a) + 8, height: hh - m.t - m.b, fill: cor }));
    ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, (o.fmtY || n)(t)); });
    let ultX = -1e9;
    xs.forEach((v, i) => { const r = o.rotX(v, i); if (!r) return; const t = r.t ?? r, px = x(v);
      if (px - ultX < Math.max(14, String(t).length * 6.4 + 4)) return;
      S(svg, "text", { x: px, y: hh - 6, "text-anchor": "middle", class: r.forte ? "forte" : null }, t); ultX = px; });
    if (o.antes) o.antes({ x, y, m, w, h: hh, ix });
    (o.barras || []).forEach(b => { S(svg, "rect", { x: x(b.x) - b.lw / 2, y: y(Math.max(0, b.v)), width: b.lw, height: Math.abs(y(b.v) - y(0)), fill: b.cor }); });
    o.series.forEach(s => {
      let d = "", pen = false;
      s.pts.forEach(([xv, yv]) => { if (yv == null || !isFinite(yv) || !ix.has(String(xv))) { pen = false; return; } d += `${pen ? "L" : "M"}${x(xv)},${y(yv)}`; pen = true; });
      if (d) S(svg, "path", { d, fill: "none", stroke: s.cor, "stroke-width": s.larg || 2, "stroke-dasharray": s.tracejado ? "4 3" : null, opacity: s.opac ?? 1, "stroke-linejoin": "round", "stroke-linecap": "round" });
      if (s.pontos) s.pts.forEach(([xv, yv]) => { if (yv != null && ix.has(String(xv))) S(svg, "circle", { cx: x(xv), cy: y(yv), r: 2.6, fill: s.cor }); });
    });
    if (o.rotFim) {
      const fins = o.series.filter(s => s.rotFim).map(s => { const p = [...s.pts].reverse().find(q => q[1] != null && ix.has(String(q[0]))); return p ? { s, y: y(p[1]), x: x(p[0]) } : null; }).filter(Boolean).sort((a, b) => a.y - b.y);
      for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 11) fins[i].y = fins[i - 1].y + 11;
      fins.forEach(f => S(svg, "text", { x: f.x + 5, y: f.y + 3, style: `fill:${f.s.cor}`, class: "forte" }, f.s.rotFim));
    }
    if (o.depois) o.depois({ x, y, m, w, h: hh, ix });
    const bw = o.centro ? (w - m.l - m.r) / xs.length : (w - m.l - m.r) / Math.max(1, xs.length - 1);
    const foco = S(svg, "line", { y1: m.t, y2: hh - m.b, stroke: "var(--ink-3)", opacity: 0 });
    xs.forEach(v => {
      const a = S(svg, "rect", { x: x(v) - bw / 2, y: m.t, width: bw, height: hh - m.t - m.b, fill: "transparent", class: "risk-alvo" });
      a.addEventListener("pointerenter", () => { foco.setAttribute("x1", x(v)); foco.setAttribute("x2", x(v)); foco.setAttribute("opacity", 0.6); });
      a.addEventListener("pointerleave", () => foco.setAttribute("opacity", 0));
      dicaEm(a, () => o.dica(v));
      if (o.alvo && xs.length <= 400) alvoR(a, () => o.alvo(v));
    });
  }

  // barras empilhadas por bloco de horas (vale, ponta, demais) com o desvio total em ponto
  function empilhado(svg, rows, w, hh, rotX, titulo, alvo) {
    const m = { l: 40, r: 6, t: 10, b: 24 };
    if (!rows.length) { S(svg, "text", { x: w / 2, y: hh / 2, "text-anchor": "middle" }, "sem dados no período"); return; }
    const segs = rows.map(r => { let pos = 0, neg = 0; const s = BLOCOS.map(([k, , cor]) => { const v = r[k] || 0; let a, b; if (v >= 0) { a = pos; b = pos += v; } else { a = neg; b = neg += v; } return { a, b, cor }; }); return { r, s, pos, neg }; });
    const ax = eixo(Math.min(0, ...segs.map(d => Math.min(d.neg, d.r.delta))), Math.max(0, ...segs.map(d => Math.max(d.pos, d.r.delta))), hh < 200 ? 4 : 5);
    const y = v => m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
    const bw = (w - m.l - m.r) / rows.length, x = i => m.l + i * bw;
    ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
    const larg = Math.max(1, bw * 0.72);
    let ultX = -1e9;
    segs.forEach((d, i) => {
      d.s.forEach(s => { if (s.a !== s.b) S(svg, "rect", { x: x(i) + (bw - larg) / 2, y: y(Math.max(s.a, s.b)), width: larg, height: Math.max(0.5, Math.abs(y(s.a) - y(s.b))), fill: s.cor, opacity: d.r.parcial ? 0.45 : null }); });
      if (d.r.parcial) { const topo = y(Math.max(d.pos, 0)), base = y(Math.min(d.neg, 0)); S(svg, "rect", { x: x(i) + (bw - larg) / 2, y: topo, width: larg, height: Math.max(1, base - topo), fill: "none", stroke: "var(--ink-2)", "stroke-dasharray": "3 2" }); }
      S(svg, "circle", { cx: x(i) + bw / 2, cy: y(d.r.delta), r: Math.max(1.6, Math.min(3, bw / 3)), fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1 });
      const lab = rotX(d.r, i), px = x(i) + bw / 2;
      if (lab && px - ultX >= Math.max(14, String(lab.t).length * 6.4 + 4)) { S(svg, "text", { x: px, y: hh - 6, "text-anchor": "middle", class: lab.forte ? "forte" : null }, lab.t); ultX = px; }
      const a = S(svg, "rect", { x: x(i), y: m.t, width: bw, height: hh - m.t - m.b, fill: "transparent", class: "risk-alvo" });
      dicaEm(a, `<b>${titulo(d.r)}</b><br>desvio ${sn(d.r.delta, 1)} R$/MWh<br>vale ${sn(d.r.vale, 1)} · ponta ${sn(d.r.ponta, 1)} · demais ${sn(d.r.demais, 1)}` + (d.r.extra || ""));
      if (alvo) alvoR(a, () => alvo(d.r));
    });
  }
  const legBlocos = el => legenda(el, [...BLOCOS.map(([, nome, cor]) => [cor, nome]), ["var(--ink)", "Desvio total (ponto)"]]);

  // ---------- revisões do DECOMP: grupos de dias por semana operativa (sábado a sexta) ----------
  const _grupos = {};
  function gruposRev(sub) {
    if (_grupos[sub]) return _grupos[sub];
    const lin = (D.dias_nivel || {})[sub] || [], ult = lin.length ? lin[lin.length - 1][0] : ULT, gs = [];
    lin.forEach((r, i) => { const ini = inicioSemana(r[0]); let g = gs[gs.length - 1]; if (!g || g.ini !== ini) { g = { ini, i0: i, i1: i, dias: [] }; gs.push(g); } g.i1 = i; g.dias.push(r); });
    gs.forEach(g => { const rv = REV[g.ini]; g.rv = rv ? rv[1] : null; g.pmo = rv ? rv[2] : null; g.fim = somaDias(g.ini, 6);
      g.decomp = media(g.dias.map(r => r[2])); g.dessem = media(g.dias.map(r => r[1])); g.piso = media(g.dias.map(r => r[4]));
      g.emCurso = g.fim > ult; g.nome = g.rv == null ? "RV ?" : `RV${g.rv}`; });
    return (_grupos[sub] = gs);
  }
  const descrRev = g => `${g.nome} · ${ddmm(g.ini)}–${ddmm(g.fim)}${g.emCurso ? ` · em curso (${g.dias.length} ${g.dias.length === 1 ? "dia" : "dias"})` : ""}`;
  const rvAtual = (gruposRev("SE").slice(-1)[0] || {}).rv;

  // =====================================================================================================
  // SIMULADOR: estado (mesa.risk.sim) e conta, a mesma da 07 (simulador_conta.js)
  // =====================================================================================================
  const TIPOS_SIM = [["útil", "parte_util", "Dia útil"], ["sábado", "parte_sabado", "Sábado"], ["domingo/feriado", "parte_domingo", "Domingo/feriado"]];
  const CAMPOS = ["horas_piso", "frac_fora", "premio_ponta"];
  const JANS = D.premissas_janelas, JAN_OPC = Object.keys(JANS).filter(x => /^\d+$/.test(x));
  const cal = [...D.calendario].sort((a, b) => (a.mes < b.mes ? -1 : 1));
  const CONTA = window.ContaSimulador.criar(NV, NP);
  const P90_MES = D.sensibilidade.preco, PCT0 = D.sensibilidade.pct, REGUA = [5, 25, 50, 75, 100];
  const ESTR = Object.fromEntries(TIPOS_SIM.map(([t]) => [t, { com: D.estresse[t].com, sem: D.estresse[t].sem, sens: D.estresse[t].com }]));
  const MES0 = Math.max(0, cal.findIndex(c => !c.rv0_publicada));
  const padraoJ = (jan, t, k) => (k === "frac_fora" && D.ref_fora && D.ref_fora[t].valor != null ? D.ref_fora[t].valor : JANS[jan][t][k]);
  const copiaJan = jan => Object.fromEntries(TIPOS_SIM.map(([t]) => [t, Object.fromEntries(CAMPOS.map(k => [k, padraoJ(jan, t, k)]))]));
  const fixVazio = () => Object.fromEntries(TIPOS_SIM.map(([t]) => [t, { ponta: null, sens: null }]));
  const simPadrao = () => ({ mesI: MES0, dec: Math.round(ref.decomp_vigente), jan: String(D.janela_padrao), prem: copiaJan(String(D.janela_padrao)), fix: fixVazio(), pct: PCT0 });
  function carregarSim() {
    const p = simPadrao(), ok = x => typeof x === "number" && isFinite(x);
    let v = null; try { v = JSON.parse(localStorage.getItem("mesa.risk.sim")); } catch (e) { v = null; }
    if (!v || typeof v !== "object") return p;
    if (Number.isInteger(v.mesI) && v.mesI >= 0 && v.mesI < cal.length) p.mesI = v.mesI;
    if (ok(v.dec) && v.dec >= 0 && v.dec <= 5000) p.dec = v.dec;
    if (JAN_OPC.includes(v.jan)) { p.jan = v.jan; p.prem = copiaJan(v.jan); }
    if (v.prem) TIPOS_SIM.forEach(([t]) => CAMPOS.forEach(k => { if (v.prem[t] && ok(v.prem[t][k])) p.prem[t][k] = v.prem[t][k]; }));
    if (v.fix) TIPOS_SIM.forEach(([t]) => ["ponta", "sens"].forEach(k => { if (v.fix[t] && ok(v.fix[t][k])) p.fix[t][k] = v.fix[t][k]; }));
    if (REGUA.includes(v.pct)) p.pct = v.pct;
    return p;
  }
  const SIM = carregarSim();
  const salvarSim = () => gravar("sim", SIM);
  const padrao = (t, k) => padraoJ(SIM.jan, t, k);
  const editouPrem = () => TIPOS_SIM.some(([t]) => CAMPOS.some(k => Math.abs(SIM.prem[t][k] - padrao(t, k)) > 1e-6) || Object.values(SIM.fix[t]).some(v => v != null));
  // preço da ponta: acompanha o DECOMP (DECOMP + prêmio) até o usuário digitar um preço, que fica fixo (D058)
  const premioEf = (t, k, Dm) => (k === "sens" && t !== "útil" ? premioEf(t, "ponta", Dm) : k === "sens" && SIM.fix[t][k] == null && P90_MES != null ? P90_MES - Dm : SIM.fix[t][k] != null ? SIM.fix[t][k] - Dm : k === "ponta" ? SIM.prem[t].premio_ponta : ESTR[t][k]);
  const precoEf = (t, k, Dm, P) => Math.max(Dm + premioEf(t, k, Dm), P);
  const premios = (k, Dm) => Object.fromEntries(TIPOS_SIM.map(([t]) => [t, premioEf(t, k, Dm)]));
  function prever(c, Dm, cenario) {
    const P = c.piso;
    const { tot, pld, vpiso, fora, ponta, porTipo } = CONTA.somar(c, Dm, t => SIM.prem[t], t => premioEf(t, cenario || "ponta", Dm));
    const delta = pld - Dm, dir = classe(delta);
    const conf = D.confianca.filter(r => r.h === c.h), k = conf.find(r => r.direcao_prevista === dir), e = conf[0];
    return { pld, tot, delta, vpiso, fora, ponta, porTipo, dir, acerto: k ? k.acerto : null, meses: k ? k.meses : 0, lo: Math.max(pld - e.erro_p90, P), hi: pld - e.erro_p10, e };
  }
  function simular() {
    const c = cal[SIM.mesI], DEC = SIM.dec, r = prever(c, DEC), cen = prever(c, DEC, "sens");
    const mix = q => Math.max((1 - q) * r.tot + q * cen.tot, c.piso), editado = editouPrem();
    const R = CONTA.resumo(D, c, DEC, SIM.prem, premios("ponta", DEC), premios("sens", DEC), SIM.pct, editado);
    return { c, DEC, r, cen, mix, sens: mix(SIM.pct / 100), pu: precoEf("útil", "sens", DEC, c.piso), R, editado, ante: ante(c.h) };
  }
  function sinal() {
    const s = simular();
    return { v: `${rot(s.c.mes)} R$ ${n(s.r.pld, 0)} ${sn(s.r.delta, 0)}`, tom: tomDir(s.r.dir), dnum: s.r.delta,
      d: `${seta(s.r.delta)} ${DIR[s.r.dir].toLowerCase()} · faixa ${n(s.r.lo)}–${n(s.r.hi)} · DECOMP ${n(s.DEC)}${s.editado ? " · editado" : ""}` };
  }
  // a casca monta o sinal uma vez; depois de mexer no simulador, o módulo atualiza a própria etiqueta
  function atualizarSinal() { if (typeof Mesa.atualizarSinal === "function") Mesa.atualizarSinal(); }

  // =====================================================================================================
  // INSPETOR: detalhe de dia, revisão, mês, backtest…
  // =====================================================================================================
  const perfilDia = (sub, data) => (((D.dias_perfil || {})[sub] || {})[data.slice(0, 7)] || []).find(x => x.data === data);
  function graficoHoras(el, alt, pts, refs, dica, cor) {
    G(el, alt, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 36, mr: 6, xs: HORAS, sombras: SOMBRAS, y0: 0, nt: 4, rotX: x => (x % 6 === 0 ? x + "h" : null),
      series: [...refs, { nome: "valor", cor: cor || "var(--accent)", pts: HORAS.map(x => [x, pts[x]]), pontos: true }], dica }));
  }
  const blocoMedias = v => ({ vale: media(VALE_H.map(x => v[x])), ponta: media(PONTA_H.map(x => v[x])), demais: media(DEMAIS_H.map(x => v[x])) });
  function inspDia(sub, data) {
    const r = ((D.dias_nivel || {})[sub] || []).find(x => x[0] === data);
    const b = ((D.dias_blocos || {})[sub] || []).find(x => x.data === data), pf = perfilDia(sub, data);
    const g = gruposRev(sub).find(x => x.ini === inicioSemana(data));
    return { t: `${dataBr(data)} ${diaSem(data)} · ${SUBN[sub]}`, c: el => {
      if (!r) { nota(el, "Sem dados para este dia."); return; }
      pares(el, [["Tipo de dia", r[5] || "—"], ["DESSEM médio", rs(r[1], 1)], ["DECOMP vigente", rs(r[2], 1)], ["Desvio", `${seta(r[1] - r[2])} ${sn(r[1] - r[2], 1)}`],
        ["Vale no piso", `${n(r[4])} de 8 h`], ["Mínimo · máximo", `${n(r[6], 1)} · ${n(r[7], 1)}`], ["Piso do ano", rs(r[3], 2)],
        g ? ["Revisão", descrRev(g)] : null, b ? ["Desvio por bloco", `vale ${sn(b.vale, 1)} · ponta ${sn(b.ponta, 1)} · demais ${sn(b.demais, 1)}`] : null]);
      if (pf) {
        ttl3(el, "PLD hora a hora, R$/MWh");
        graficoHoras(el, 170, pf.pld, [{ nome: "Piso", cor: "var(--ink-3)", larg: 1, tracejado: true, pts: HORAS.map(x => [x, r[3]]) }, { nome: "DECOMP", cor: "var(--ink-2)", larg: 1.2, tracejado: true, pts: HORAS.map(x => [x, r[2]]) }],
          x => `<b>${ddmm(data)} · ${x}h</b>${VALE_H.includes(x) ? " · vale" : PONTA_H.includes(x) ? " · ponta" : ""}<br>PLD ${rs(pf.pld[x], 1)}${pf.pld[x] <= r[3] + 0.005 ? " (piso)" : ""}<br>desvio sobre o DECOMP ${sn(pf.pld[x] - r[2], 1)}`);
        const bm = blocoMedias(pf.pld), mx = Math.max(...pf.pld), hx = pf.pld.indexOf(mx);
        pares(el, [["Vale 8h–15h", rs(bm.vale, 1)], ["Ponta 18h–21h", rs(bm.ponta, 1)], ["Demais horas", rs(bm.demais, 1)], ["Hora mais cara", `${hx}h · ${rs(mx, 1)}`]]);
        legenda(el, [["var(--accent)", "DESSEM", "l"], ["var(--ink-2)", "DECOMP", "t"], ["var(--ink-3)", "Piso", "t"]]);
      } else nota(el, "Perfil hora a hora disponível só para os últimos quatro meses.");
      if (data > ref.ultimo_publicado) nota(el, "PLD calculado do deck pela regra da CCEE (publicação oficial pendente).");
    } };
  }
  function semanaPerfil(sub, ini) { for (const m of Object.keys((D.semanas_perfil || {})[sub] || {})) { const s = D.semanas_perfil[sub][m].find(x => x.inicio === ini); if (s) return s; } return null; }
  function inspRev(sub, ini) {
    const g = gruposRev(sub).find(x => x.ini === ini), sp = semanaPerfil(sub, ini);
    return { t: `${g ? g.nome : "Revisão"} · semana de ${ddmm(ini)} · ${SUBN[sub]}`, c: el => {
      if (!g) { nota(el, "Sem dados para esta revisão."); return; }
      pares(el, [["Semana operativa", `${dataBr(g.ini)} a ${dataBr(g.fim)}`], ["PMO", g.pmo ? rot(g.pmo) : "—"], ["Dias com dados", `${g.dias.length}${g.emCurso ? " (em curso)" : ""}`],
        ["DECOMP médio", rs(g.decomp, 1)], ["DESSEM médio", rs(g.dessem, 1)], ["Desvio", `${seta(g.dessem - g.decomp)} ${sn(g.dessem - g.decomp, 1)}`], ["Vale no piso", `${n(g.piso, 1)} h/dia`]]);
      if (sp) {
        ttl3(el, "Perfil horário médio da semana");
        G(el, 160, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 36, mr: 6, xs: HORAS, sombras: SOMBRAS, y0: 0, nt: 4, rotX: x => (x % 6 === 0 ? x + "h" : null),
          series: [{ nome: "DECOMP", cor: "var(--ink-2)", larg: 1.2, tracejado: true, pts: HORAS.map(x => [x, sp.decomp_media]) },
            ...(sp.pld_util ? [{ nome: "Dias úteis", cor: "var(--risk-util)", larg: 1.4, pts: HORAS.map(x => [x, sp.pld_util[x]]) }] : []),
            { nome: "Todos os dias", cor: "var(--accent)", pts: HORAS.map(x => [x, sp.pld[x]]) }],
          dica: x => `<b>${x}h</b><br>todos os dias ${rs(sp.pld[x], 1)}${sp.pld_util ? `<br>dias úteis ${rs(sp.pld_util[x], 1)}` : ""}<br>DECOMP ${n(sp.decomp_media, 1)}` }));
        legenda(el, [["var(--accent)", `Todos (${sp.dias} dias)`, "l"], ["var(--risk-util)", `Úteis (${sp.dias_uteis})`, "l"], ["var(--ink-2)", "DECOMP", "t"]]);
      }
      ttl3(el, "Dias da revisão");
      const box = QC.tabela(el, [{ t: "Dia" }, { t: "DESSEM", n: 1 }, { t: "DECOMP", n: 1 }, { t: "Desvio", n: 1 }], g.dias.map(r => [`${ddmm(r[0])} ${diaSem(r[0])}`, n(r[1], 1), n(r[2], 1), sn(r[1] - r[2], 1)]), "risk-densa");
      box.querySelectorAll("tbody tr").forEach((tr, i) => alvoR(tr, () => inspDia(sub, g.dias[i][0])));
      nota(el, "Clique num dia para ver o perfil hora a hora.");
    } };
  }
  function inspMes(sub, mes) {
    const r = D.desvio_mensal.find(x => x.sub === sub && x.mes === mes);
    const dd = ((D.dias_blocos || {})[sub] || []).filter(x => x.data.startsWith(mes));
    const bt = D.backtest.find(x => x.h === 1 && x.mes === mes), pm = (D.premissas_mensal["útil"] || []).find(x => x.mes === mes);
    return { t: `${rotLongo(mes)} · ${SUBN[sub]}`, c: el => {
      if (!r) { nota(el, "Sem dados para este mês."); return; }
      pares(el, [["DECOMP médio", rs(r.decomp, 1)], ["DESSEM médio", rs(r.dessem, 1)], ["Desvio", `${seta(r.delta)} ${sn(r.delta, 1)} · ${DIR[classe(r.delta)].toLowerCase()}`],
        ["Vale 8h–15h", sn(r.vale, 1)], ["Ponta 18h–21h", sn(r.ponta, 1)], ["Demais horas", sn(r.demais, 1)], ["Dias", `${r.dias}${r.parcial ? ` (parcial, até ${ddmm(ULT)})` : ""}`]]);
      if (dd.length) { ttl3(el, "Por dia, R$/MWh"); G(el, 150, (svg, w, hh) => empilhado(svg, dd, w, hh, (x, i) => (i % 5 === 0 ? { t: x.data.slice(8, 10) } : null), x => `${dataBr(x.data)} ${diaSem(x.data)}`, x => inspDia(sub, x.data))); }
      if (bt && sub === "SE") { ttl3(el, "Simulador com 1 mês de antecedência"); pares(el, [["Previsto", rs(bt.prev, 1)], ["PLD oficial", rs(bt.real, 1)], ["Erro", sn(bt.erro, 1)], ["Direção", `${DIR[bt.direcao_prevista]} → ${DIR[bt.direcao_real]} ${bt.direcao_prevista === bt.direcao_real ? "✓" : "✗"}`]]); }
      if (pm && sub === "SE") { ttl3(el, "Premissas do dia útil no mês"); pares(el, [["Vale no piso", `${n(pm.horas_piso, 1)} h (RV0 ${n(pm.rv0_horas_piso, 1)})`], ["Outras horas", `${sn(pm.frac_fora * 100, 0)}% (RV0 ${sn(pm.rv0_frac_fora * 100, 0)}%)`], ["Ponta", `${rs(pm.ponta_media, 0)} (RV0 ${n(pm.rv0_ponta, 0)})`]]); }
    } };
  }
  function inspBt(mes, hh) {
    const r = D.backtest.find(x => x.mes === mes && x.h === hh), todos = D.backtest.filter(x => x.mes === mes).sort((a, b) => a.h - b.h);
    return { t: `${rotLongo(mes)} · previsão M+${hh}`, c: el => {
      if (!r) { nota(el, "Sem previsão para este mês nesta antecedência."); return; }
      const ok = r.direcao_prevista === r.direcao_real;
      pares(el, [["DECOMP médio", rs(r.decomp, 1)], ["PLD oficial", rs(r.real, 1)], ["Previsto", rs(r.prev, 1)], ["Erro (previsto − oficial)", sn(r.erro, 1)],
        ["Desvio que aconteceu", `${sn(r.delta_real, 1)} · ${DIR[r.direcao_real].toLowerCase()}`], ["Desvio previsto", `${sn(r.delta_prev, 1)} · ${DIR[r.direcao_prevista].toLowerCase()}`], ["Direção", ok ? "certa ✓" : "errada ✗"]]);
      ttl3(el, "O mesmo mês em cada antecedência");
      const box = QC.tabela(el, [{ t: "Antec." }, { t: "Previsto", n: 1 }, { t: "Erro", n: 1 }, { t: "Direção" }], todos.map(x => [`M+${x.h}`, n(x.prev, 1), sn(x.erro, 1), `${DIR[x.direcao_prevista]} ${x.direcao_prevista === x.direcao_real ? "✓" : "✗"}`]), "risk-densa");
      box.querySelectorAll("tbody tr").forEach((tr, i) => { if (todos[i].h === hh) tr.classList.add("destaque"); });
      const pm = TIPOS.map(([t, nome]) => [nome, (D.premissas_mensal[t] || []).find(x => x.mes === mes)]).filter(x => x[1]);
      if (pm.length) { ttl3(el, "Premissas na RV0 → realizado"); QC.tabela(el, [{ t: "Tipo" }, { t: "Piso h", n: 1 }, { t: "Outras", n: 1 }, { t: "Ponta", n: 1 }],
        pm.map(([nome, x]) => [nome.replace("Domingo/feriado", "Dom./fer."), `${n(x.rv0_horas_piso, 1)} → ${n(x.horas_piso, 1)}`, `${sn(x.rv0_frac_fora * 100, 0)} → ${sn(x.frac_fora * 100, 0)}%`, `${n(x.rv0_ponta, 0)} → ${n(x.ponta_media, 0)}`]), "risk-densa"); }
    } };
  }

  // =====================================================================================================
  // 1 · MON Monitor
  // =====================================================================================================
  function telaMON(area) {
    const sub = (EST.sub = valido(EST.sub, SUBS_PRECO, "SE"));
    const todas = (D.dias_nivel || {})[sub] || [], u = todas[todas.length - 1], gs = gruposRev(sub), gA = gs[gs.length - 1];
    const dm = D.desvio_mensal.find(r => r.sub === sub && r.mes === ultMes), s = simular();
    const dec = Mesa.decisao(area, [
      { r: `PLD previsto · ${rot(s.c.mes)} · M+${s.c.h} · SE/CO`, v: rs(s.r.pld, 1), d: `${seta(s.r.delta)} ${DIR[s.r.dir].toLowerCase()} ${sn(s.r.delta, 1)} sobre DECOMP ${n(s.DEC)} · faixa ${n(s.r.lo)}–${n(s.r.hi)}`, tom: tomDir(s.r.dir), principal: true },
      { r: `PLD médio de hoje · ${ddmm(u[0])} ${diaSem(u[0])}`, v: n(u[1], 1), d: `${seta(u[1] - u[2])} ${sn(u[1] - u[2], 1)} sobre DECOMP ${n(u[2], 1)} · vale no piso ${n(u[4])} de 8 h`, tom: tom(u[1] - u[2]) },
      { r: `Desvio da semana · ${gA.nome} ${ddmm(gA.ini)}–${ddmm(gA.fim)}`, v: sn(gA.dessem - gA.decomp, 1), d: `DESSEM ${n(gA.dessem, 1)} × DECOMP ${n(gA.decomp, 1)} · ${gA.dias.length} dias`, tom: tom(gA.dessem - gA.decomp) },
      { r: `Desvio do mês · ${rot(ultMes)} até ${ddmm(ULT)}`, v: sn(dm.delta, 1), d: `vale ${sn(dm.vale, 1)} · ponta ${sn(dm.ponta, 1)} · demais ${sn(dm.demais, 1)}`, tom: tom(dm.delta) },
    ]);
    const [d0, d1, d2, d3] = dec.children;
    alvoR(d0, () => inspSimCurto()); alvoR(d1, () => inspDia(sub, u[0])); alvoR(d2, () => inspRev(sub, gA.ini)); alvoR(d3, () => inspMes(sub, ultMes));
    barra(area, [{ rot: "Submercado", opc: SUBS_PRECO, atual: sub, aoTrocar: v => { EST.sub = v; guardar(); remontar(area, telaMON); } },
      { rot: "Rodada", txt: `deck até ${dataBr(ESTADO.ultimo_deck)} · PLD publicado até ${dataBr(ESTADO.ultimo_publicado)} · modelo ${ESTADO.modelo} · vale ${ESTADO.vale[0]}h–${ESTADO.vale[1]}h · ponta ${ESTADO.ponta[0]}h–${ESTADO.ponta[1]}h` }]);
    const g = Mesa.grade(area);

    // RISK-1 · PLD médio do dia DESSEM × DECOMP, com o horário alinhado embaixo
    const p1 = Mesa.painel(g, { cod: "RISK-1", titulo: "PLD médio do dia · DESSEM × DECOMP", unidade: `R$/MWh · ${SUBN[sub]}`, tam: "xl", ajuda: "nivel",
      leg: "Em cima, a média das 24 horas do dia e o DECOMP da revisão vigente; embaixo, o PLD hora a hora no mesmo eixo de dias (no ano e no histórico, faixa do mínimo ao máximo horário e a média). Faixas alternadas = uma revisão. Clique num dia para o detalhe.", fonte: FONTE });
    const PER_N = [["rev", `RV${rvAtual ?? "?"}`], ["mes", rot(ultMes)], ["3m", "3 meses"], ["ano", ultMes.slice(0, 4)], ["todo", "Histórico"]];
    EST.perN = valido(EST.perN, PER_N, "mes");
    abasEm(p1, PER_N, EST.perN, v => { EST.perN = v; guardar(); desenharNivel(); }, "Período");
    function desenharNivel() {
      limpar(p1.corpo);
      let lin = todas;
      const ult = u[0];
      if (EST.perN === "rev") { const sa = inicioSemana(ult); lin = lin.filter(r => inicioSemana(r[0]) === sa); }
      else if (EST.perN === "mes") lin = lin.filter(r => r[0].startsWith(ult.slice(0, 7)));
      else if (EST.perN === "ano") lin = lin.filter(r => r[0].startsWith(ult.slice(0, 4)));
      else if (EST.perN === "3m") { const d = new Date(ult + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 3); const c = d.toISOString().slice(0, 10); lin = lin.filter(r => r[0] > c); }
      const xs = lin.map(r => r[0]), ul = lin[lin.length - 1] || [];
      const grupos = [], porDia = new Map();
      lin.forEach((r, i) => { const gg = gs.find(x => x.ini === inicioSemana(r[0])); let k = grupos[grupos.length - 1];
        if (!k || k.ini !== gg.ini) { k = { ...gg, i0: i, i1: i, sel: [] }; grupos.push(k); } k.i1 = i; k.sel.push(r); porDia.set(r[0], k); });
      grupos.forEach(k => { k.decompSel = media(k.sel.map(r => r[2])); k.dessemSel = media(k.sel.map(r => r[1])); });
      const modo = EST.perN === "mes" || EST.perN === "rev" ? "completo" : EST.perN === "3m" ? "compacto" : "nenhum";
      const longo = xs.length > 400, passoX = Math.max(1, Math.ceil(xs.length / 12));
      const rotXN = (d, i) => (longo ? (d.slice(5, 10) === "01-01" || i === 0 ? { t: d.slice(0, 4), forte: true } : null)
        : modo === "nenhum" ? (i % passoX === 0 ? ddmm(d) + "/" + d.slice(2, 4) : null)
        : modo === "compacto" ? (d.endsWith("-01") || i === 0 ? { t: rot(d.slice(0, 7)), forte: true } : null) : d.slice(8, 10));
      legenda(p1.corpo, [["var(--accent)", "DESSEM", "l"], ["var(--ink-3)", "DECOMP vigente", "l"], ["var(--ink-3)", "Piso do PLD", "t"]]);
      G(p1.corpo, modo === "nenhum" ? 220 : 250, (svg, W, Hh) => linhasA(svg, { w: W, h: Hh, mt: modo === "nenhum" ? 10 : 58, mr: 84, xs, y0: 0,
        antes: ({ x, m, w, h: hh }) => {
          if (modo === "nenhum") return;
          const modoR = modo === "completo" && w < 640 ? "compacto" : modo;
          const meio = xs.length > 1 ? (x(xs[1]) - x(xs[0])) / 2 : 20;
          divisoesDia(svg, xs.map(d => x(d) - meio), m, hh);
          const niveis = [-1e9, -1e9];
          grupos.forEach((k, j) => {
            const xa = Math.max(m.l, x(xs[k.i0]) - meio), xb = Math.min(w - m.r, x(xs[k.i1]) + meio);
            if (j % 2 === 0) S(svg, "rect", { x: xa, y: m.t, width: xb - xa, height: hh - m.t - m.b, fill: "var(--vazio)", opacity: 0.55 });
            S(svg, "line", { x1: xa, x2: xa, y1: 4, y2: hh - m.b, stroke: "var(--ink-3)", opacity: 0.7 });
            let l1, l2;
            if (modoR === "completo") { l1 = descrRev(k); l2 = `DECOMP ${n(k.decompSel, 0)} · DESSEM ${n(k.dessemSel, 0)}`; }
            else { const mudou = j === 0 || grupos[j - 1].pmo !== k.pmo; l1 = k.nome + (mudou && k.pmo ? " " + MES[+k.pmo.slice(5, 7) - 1] : ""); l2 = `${n(k.decompSel, 0)}·${n(k.dessemSel, 0)}`; }
            const larg = Math.max(l1.length, l2.length) * (modoR === "completo" ? 6.3 : 5.9);
            let xt = xa + 3, anc = null; if (xt + larg > w - m.r) { xt = w - m.r; anc = "end"; }
            const ini = anc ? xt - larg : xt, nv = ini > niveis[0] + 6 ? 0 : 1; niveis[nv] = anc ? xt : xt + larg;
            S(svg, "text", { x: xt, y: 12 + nv * 24, class: "forte", "text-anchor": anc }, l1);
            S(svg, "text", { x: xt, y: 23 + nv * 24, "text-anchor": anc }, l2);
          });
        },
        series: [{ nome: "Piso", cor: "var(--ink-3)", larg: 1, tracejado: true, pts: lin.map(r => [r[0], r[3]]) },
          { nome: "DECOMP", cor: "var(--ink-3)", larg: longo ? 1.2 : 2, pts: lin.map(r => [r[0], r[2]]), rotFim: "DECOMP " + n(ul[2]) },
          { nome: "DESSEM", cor: "var(--accent)", larg: longo ? 1.2 : 2, pts: lin.map(r => [r[0], r[1]]), rotFim: "DESSEM " + n(ul[1]) }],
        rotFim: true, rotX: rotXN, centro: true,
        dica: d => { const r = lin.find(x => x[0] === d), k = porDia.get(d);
          return `<b>${dataBr(d)} ${diaSem(d)}</b>${r[5] ? " · " + r[5] : ""}<br>DESSEM ${n(r[1], 1)} · DECOMP ${n(r[2], 1)}<br>desvio ${sn(r[1] - r[2], 1)} · ${r[4]} h do vale no piso` + (k ? `<br><b>${descrRev(k)}</b>` : ""); },
        alvo: d => inspDia(sub, d) }));
      mt(p1.corpo, "PLD horário do DESSEM, alinhado aos dias de cima", "R$/MWh");
      desenharNivelHora(p1.corpo, lin, grupos, modo, rotXN, porDia, sub);
    }
    desenharNivel();

    // RISK-25 · preços por hora dos quatro submercados (como o PLD-4 do catálogo), ao lado do RISK-1
    const p25 = Mesa.painel(g, { cod: "RISK-25", titulo: "Preços por hora · 4 submercados", unidade: "R$/MWh", tam: "s", ajuda: "precos-hora",
      leg: "Em destaque, as horas no piso. Spreads contra o SE/CO. Clique numa linha para o dia no inspetor." });
    const HOR = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"]];
    EST.ph = valido(EST.ph, HOR, "hoje");
    const ctl25 = mk("div", "risk-ctl"); ctl25.append(abas(HOR, EST.ph, v => { EST.ph = v; guardar(); desenharPH(); }, "Horizonte")); p25.corpo.before(ctl25);
    const legPH = p25.el.querySelector(".leg");
    function desenharPH() {
      limpar(p25.corpo);
      const dSE = ((D.dias_nivel || {}).SE || []).map(r => r[0]), k = { hoje: 1, ontem: 1, "7d": 7, "30d": 30 }[EST.ph];
      const datas = EST.ph === "ontem" ? dSE.slice(-2, -1) : dSE.slice(-k);
      const pisoDe = new Map((D.dias_nivel.SE || []).map(r => [r[0], r[3]]));
      const SUBS4 = ["SE", "S", "NE", "N"], linhas = [];
      datas.slice().reverse().forEach(d => { const pf = Object.fromEntries(SUBS4.map(sb => [sb, perfilDia(sb, d)]));
        const hs = HORAS.map(x => ({ d, x, v: SUBS4.map(sb => (pf[sb] ? pf[sb].pld[x] : null)) }));
        hs.forEach(l => linhas.push(l)); });  // dias do mais recente ao mais antigo; dentro do dia, 00h → 23h
      const um = k === 1, cs = um ? 2 : k === 30 ? 0 : 1, cel = (v, d) => (v == null ? "—" : `<span class="${v <= pisoDe.get(d) + 0.005 ? "no-piso" : ""}">${n(v, cs)}</span>`);
      const cols = [{ t: um ? "Hora" : "Data e hora" }, ...SUBS4.map(sb => ({ t: SUBN[sb], n: 1 })), { t: "NE − SE", n: 1 }, { t: "N − SE", n: 1 }];
      const sp = (a, b) => (a == null || b == null ? null : a - b);
      const vals = l => [...l.v, sp(l.v[2], l.v[0]), sp(l.v[3], l.v[0])];
      const box = QC.tabela(p25.corpo, cols, linhas.map(l => [`${um ? "" : `<span class="risk-ph-d${l.x ? " risk-ph-oculta" : ""}">${ddmm(l.d)}</span> `}${String(l.x).padStart(2, "0")}h`, ...l.v.map(v => cel(v, l.d)), sn(sp(l.v[2], l.v[0]), cs), sn(sp(l.v[3], l.v[0]), cs)]), "risk-densa risk-ph");
      box.classList.add("risk-ph-box");
      const est = j => { const c = linhas.map(l => vals(l)[j]).filter(v => v != null); return c.length ? [c.reduce((a, b) => a + b, 0) / c.length, Math.min(...c), Math.max(...c)] : [null, null, null]; };
      const E7 = [0, 1, 2, 3, 4, 5].map(est), fmt = (j, v) => (j < 4 ? n(v, cs) : sn(v, cs));
      box.querySelector("table").insertAdjacentHTML("beforeend", "<tfoot>" + ["Média", "Mínimo", "Máximo"].map((nm, q) => `<tr><td>${nm}</td>${E7.map((e, j) => `<td class="n">${fmt(j, e[q])}</td>`).join("")}</tr>`).join("") + "</tfoot>");
      box.querySelectorAll("tbody tr").forEach((tr, i) => { const l = linhas[i]; if (!um && l.x === 0 && i > 0) tr.classList.add("risk-ph-dia"); if (VALE_H.includes(l.x) || PONTA_H.includes(l.x)) tr.classList.add(PONTA_H.includes(l.x) ? "risk-h-ponta" : "risk-h-vale");
        alvoR(tr, () => inspDia(sub, l.d)); });
      const calc = datas.filter(d => d > ref.ultimo_publicado);
      legPH.textContent = `${um ? `${dataBr(datas[0])} ${diaSem(datas[0])}` : `${ddmm(datas[0])} a ${ddmm(datas[datas.length - 1])}, dias do mais recente ao mais antigo, horas de 00h a 23h; fio = virada do dia`}. Em destaque, as horas no piso (${rs(pisoDe.get(datas[0]), 2)}); marca azul à esquerda = vale, vermelha = ponta. Spreads contra o SE/CO. No fim, média, mínimo e máximo de cada coluna.${calc.length ? ` ${calc.map(ddmm).join(" e ")}: PLD calculado do deck.` : ""} Clique numa linha para o dia no inspetor (no submercado da barra).`;
    }
    desenharPH();

    // RISK-26 · protótipo: PLD do dia num gráfico só (faixa mín–máx, vale, ponta, média, DECOMP em degraus), para comparar com o RISK-1
    const p26 = Mesa.painel(g, { cod: "RISK-26", titulo: "PLD do dia · DESSEM × DECOMP · protótipo", unidade: `R$/MWh · ${SUBN[sub]}`, tam: "full", ajuda: "pld-dia-proto" });
    EST.perN26 = valido(EST.perN26, PER_N, "mes");
    abasEm(p26, PER_N, EST.perN26, v => { EST.perN26 = v; guardar(); desenhar26(); }, "Período");
    const bHor = mk("button", "risk-btn", "ver horário"); bHor.type = "button"; bHor.setAttribute("aria-pressed", String(!!EST.p26h)); noCab(p26, bHor);
    bHor.addEventListener("click", () => { EST.p26h = !EST.p26h; bHor.setAttribute("aria-pressed", String(EST.p26h)); bHor.textContent = EST.p26h ? "ver símbolos" : "ver horário"; guardar(); desenhar26(); });
    bHor.textContent = EST.p26h ? "ver símbolos" : "ver horário";
    const leg26 = mk("p", "leg"); p26.el.append(leg26);
    function desenhar26() {
      limpar(p26.corpo);
      const ult = u[0];
      let lin = todas;
      if (EST.perN26 === "rev") { const sa = inicioSemana(ult); lin = lin.filter(r => inicioSemana(r[0]) === sa); }
      else if (EST.perN26 === "mes") lin = lin.filter(r => r[0].startsWith(ult.slice(0, 7)));
      else if (EST.perN26 === "ano") lin = lin.filter(r => r[0].startsWith(ult.slice(0, 4)));
      else if (EST.perN26 === "3m") { const d = new Date(ult + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 3); const c = d.toISOString().slice(0, 10); lin = lin.filter(r => r[0] > c); }
      const horasM = new Map(); Object.values((D.dias_perfil || {})[sub] || {}).flat().forEach(d => horasM.set(d.data, d.pld));
      let itens = lin.map(r => { const v = horasM.get(r[0]), it = { d: r[0], med: r[1], dec: r[2], piso: r[3], vp: r[4], tipo: r[5], mn: r[6], mx: r[7], h: v || null, calc: r[0] > ref.ultimo_publicado };
        if (v) { const b = blocoMedias(v); it.vale = b.vale; it.ponta = b.ponta; it.hmn = v.indexOf(Math.min(...v)); it.hmx = v.indexOf(Math.max(...v)); } return it; });
      // histórico longo: uma barra por semana operativa (sábado a sexta)
      const semanal = itens.length > 400;
      if (semanal) { const gs2 = []; itens.forEach(it => { const ini = inicioSemana(it.d); let k = gs2[gs2.length - 1]; if (!k || k.ini !== ini) { k = { ini, dias: [] }; gs2.push(k); } k.dias.push(it); });
        itens = gs2.map(k => ({ d: k.ini, semana: true, n: k.dias.length, med: media(k.dias.map(x => x.med)), dec: media(k.dias.map(x => x.dec)), piso: k.dias[k.dias.length - 1].piso,
          mn: Math.min(...k.dias.map(x => x.mn).filter(v => v != null)), mx: Math.max(...k.dias.map(x => x.mx).filter(v => v != null)), calc: k.dias.some(x => x.calc) })); }
      const N = itens.length;
      // revisões (só com dias): grupos de itens da mesma semana operativa
      const grupos = [];
      if (!semanal) itens.forEach((it, i) => { const ini = inicioSemana(it.d); let k = grupos[grupos.length - 1]; if (!k || k.ini !== ini) { const gg = gs.find(x => x.ini === ini) || { nome: "RV ?", ini }; k = { ...gg, ini, i0: i, i1: i, sel: [] }; grupos.push(k); } k.i1 = i; k.sel.push(it); });
      grupos.forEach(k => { k.dc = media(k.sel.map(x => x.dec)); k.ds = media(k.sel.map(x => x.med)); });
      legenda(p26.corpo, [["color-mix(in srgb, var(--ink-2) 55%, transparent)", "Mínimo a máximo do dia"], ["var(--accent)", "Média do dia", "l"], ["var(--risk-vale)", "Vale 8h–15h", "l"], ["var(--risk-ponta)", "Ponta 18h–21h", "l"], ["var(--ink-2)", "DECOMP", "t"], ["var(--ink-3)", "Piso", "t"]]);
      G(p26.corpo, 236, (svg, w, hh) => {
        const comCab = grupos.length > 0, m = { l: 42, r: 10, t: comCab ? 22 : 8, b: N <= 45 && !semanal ? 30 : 20 };
        if (!N) { S(svg, "text", { x: w / 2, y: hh / 2, "text-anchor": "middle" }, "sem dados no período"); return; }
        // um pico isolado não achata o resto: o eixo vai até ~1,1 × o percentil 90 dos máximos; acima disso, ▲ no topo (valor na dica)
        const mxs = itens.map(x => x.mx).filter(v => v != null).sort((a, b) => a - b), q90 = mxs.length ? mxs[Math.floor((mxs.length - 1) * 0.9)] : 0;
        const top = Math.max(...itens.map(x => Math.max(x.med, x.dec)), q90 * 1.1);
        const ax = eixo(0, top, 4), y = v => Math.max(m.t, m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a)));
        const bw = (w - m.l - m.r) / N, x0 = i => m.l + i * bw, xc = i => x0(i) + bw / 2;
        // fundo: revisões alternadas e fins de semana/feriados
        grupos.forEach((k, j) => { if (j % 2 === 0) S(svg, "rect", { x: x0(k.i0), y: m.t, width: x0(k.i1 + 1) - x0(k.i0), height: hh - m.t - m.b, fill: "var(--vazio)", opacity: 0.55 });
          S(svg, "line", { x1: x0(k.i0), x2: x0(k.i0), y1: 2, y2: hh - m.b, stroke: "var(--ink-3)", opacity: 0.6 }); });
        if (!semanal) itens.forEach((it, i) => { if (it.tipo && it.tipo !== "útil") S(svg, "rect", { x: x0(i), y: m.t, width: bw, height: hh - m.t - m.b, fill: "color-mix(in srgb, var(--ink) 6%, transparent)" }); });
        ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
        // cabeçalho de cada revisão: "RV2 · DECOMP 141 · DESSEM 109 · ▼ −32" (encurta quando não cabe)
        grupos.forEach(k => { const larg = x0(k.i1 + 1) - x0(k.i0) - 6, dv = k.ds - k.dc, dvT = `${seta(dv)} ${sn(dv, 0)}`;
          const cheio = `${k.nome} · DECOMP ${n(k.dc, 0)} · DESSEM ${n(k.ds, 0)} · `, curto = `${k.nome} · `;
          const pre = (cheio.length + dvT.length) * 6.2 <= larg ? cheio : (curto.length + dvT.length) * 6.2 <= larg ? curto : null; if (pre == null) return;
          const t = S(svg, "text", { x: x0(k.i0) + 4, y: 14, class: "forte" }); S(t, "tspan", {}, pre); S(t, "tspan", { style: `fill:var(--${dv < 0 ? "desce" : "sobe"})` }, dvT); });
        // piso e DECOMP em degraus
        const degrau = key => itens.map((it, i) => `${i ? "L" : "M"}${x0(i)},${y(it[key])}L${x0(i + 1)},${y(it[key])}`).join("");
        S(svg, "path", { d: degrau("piso"), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1, "stroke-dasharray": "3 3" });
        S(svg, "path", { d: degrau("dec"), fill: "none", stroke: "var(--ink-2)", "stroke-width": 1.6, "stroke-dasharray": "6 3" });
        const finos = bw < 6;
        if (EST.p26h && !semanal) {
          // linha hora a hora no espaço de cada dia, na mesma escala
          let d = "", pen = false;
          itens.forEach((it, i) => { if (!it.h) { pen = false; return; } it.h.forEach((z, k) => { if (z == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x0(i) + (k + 0.5) * bw / 24},${y(z)}`; pen = true; }); });
          S(svg, "path", { d, fill: "none", stroke: "var(--accent)", "stroke-width": N > 40 ? 0.9 : 1.3, "stroke-linejoin": "round" });
        } else {
          itens.forEach((it, i) => { if (it.mn == null || it.mx == null) return;
            S(svg, "rect", { x: xc(i) - (bw >= 4 ? 1.5 : 0.5), y: y(it.mx), width: bw >= 4 ? 3 : 1, height: Math.max(1, y(it.mn) - y(it.mx)), fill: "color-mix(in srgb, var(--ink-2) 55%, transparent)", opacity: it.calc ? 0.5 : 1, stroke: it.calc ? "var(--ink-2)" : null, "stroke-dasharray": it.calc ? "2 2" : null, "stroke-width": it.calc ? 0.8 : null });
            if (it.mx > ax.b) S(svg, "text", { x: xc(i), y: m.t + 8, "text-anchor": "middle", style: "fill:var(--ink-2);font-size:9px" }, "▲");
            if (!finos && it.vale != null) { const tw = Math.min(bw * 0.38, 9);
              S(svg, "line", { x1: xc(i) - tw, x2: xc(i) + tw, y1: y(it.vale), y2: y(it.vale), stroke: "var(--risk-vale)", "stroke-width": 2.2, opacity: it.calc ? 0.6 : 1 });
              S(svg, "line", { x1: xc(i) - tw, x2: xc(i) + tw, y1: y(it.ponta), y2: y(it.ponta), stroke: "var(--risk-ponta)", "stroke-width": 2.2, opacity: it.calc ? 0.6 : 1 }); } });
          S(svg, "path", { d: itens.map((it, i) => `${i ? "L" : "M"}${xc(i)},${y(it.med)}`).join(""), fill: "none", stroke: "var(--accent)", "stroke-width": 1, opacity: 0.8 });
          if (bw >= 4) itens.forEach((it, i) => S(svg, "circle", { cx: xc(i), cy: y(it.med), r: Math.min(3, bw / 3), fill: it.calc ? "var(--surface)" : "var(--accent)", stroke: "var(--accent)", "stroke-width": 1.2 }));
        }
        // eixo X: dia e inicial do dia da semana; com muitos dias, só os inícios de mês (ou de ano, no semanal)
        let ultX = -1e9;
        itens.forEach((it, i) => {
          if (semanal) { if (i === 0 || it.d.slice(0, 4) !== itens[i - 1].d.slice(0, 4)) { const t = it.d.slice(0, 4); if (xc(i) - ultX > 36) { S(svg, "text", { x: xc(i), y: hh - 6, "text-anchor": "middle", class: "forte" }, t); ultX = xc(i); } } return; }
          if (N <= 45) { if (bw < 14 && i % 2) return; S(svg, "text", { x: xc(i), y: hh - 17, "text-anchor": "middle", class: it.tipo && it.tipo !== "útil" ? null : "forte" }, it.d.slice(8, 10)); S(svg, "text", { x: xc(i), y: hh - 5, "text-anchor": "middle" }, diaSem(it.d)[0]); return; }
          const novo = it.d.endsWith("-01") || i === 0, t = novo ? rot(it.d.slice(0, 7)) : it.d.slice(8, 10);
          if ((novo || (N <= 120 && it.d.slice(8, 10) % 7 === 1)) && xc(i) - ultX > t.length * 6.4 + 6) { S(svg, "text", { x: xc(i), y: hh - 6, "text-anchor": "middle", class: novo ? "forte" : null }, t); ultX = xc(i); } });
        // alvos: tooltip e clique por dia (ou semana)
        itens.forEach((it, i) => { const a = S(svg, "rect", { x: x0(i), y: m.t, width: bw, height: hh - m.t - m.b, fill: "transparent", class: "risk-alvo" });
          const dv = it.med - it.dec;
          dicaEm(a, it.semana ? `<b>Semana de ${dataBr(it.d)}</b> · ${it.n} dias<br>média ${rs(it.med, 1)} · mínimo ${n(it.mn, 1)} · máximo ${n(it.mx, 1)}<br>DECOMP ${n(it.dec, 1)} · desvio ${seta(dv)} ${sn(dv, 1)}`
            : `<b>${dataBr(it.d)} ${diaSem(it.d)}</b>${it.tipo ? " · " + it.tipo : ""}${it.calc ? " · calculado do deck" : ""}<br>média ${rs(it.med, 1)}<br>mínimo ${n(it.mn, 1)}${it.h ? ` (${it.hmn}h)` : ""} · máximo ${n(it.mx, 1)}${it.h ? ` (${it.hmx}h)` : ""}` +
              (it.vale != null ? `<br>vale ${n(it.vale, 1)} · ponta ${n(it.ponta, 1)}` : "") + `<br>DECOMP ${n(it.dec, 1)} · desvio ${seta(dv)} ${sn(dv, 1)}`);
          if (N <= 400) alvoR(a, () => (it.semana ? inspRev(sub, it.d) : inspDia(sub, it.d))); });
      }, "PLD do dia: faixa do mínimo ao máximo, vale, ponta, média e DECOMP");
      const calc = itens.filter(x => x.calc && !x.semana).map(x => ddmm(x.d));
      leg26.textContent = (semanal ? "Histórico longo: uma barra por semana operativa (sábado a sexta), com mínimo, máximo e média da semana. " : "Um símbolo por dia: barra do mínimo ao máximo horário, traço azul = média do vale (8h–15h), vermelho = média da ponta (18h–21h), ponto = média do dia. ") +
        (!semanal && itens.some(x => x.vale != null) && (w26() < 6) ? "Com muitos dias, só a faixa e a média. " : "") +
        "▲ = máximo acima da escala (valor na dica). DECOMP em degraus por revisão; piso tracejado. Faixas alternadas = revisões, com DECOMP, DESSEM e desvio no topo; fundo mais escuro = fim de semana ou feriado." +
        (calc.length ? ` ${calc.join(" e ")}: calculados do deck (barra tracejada, ponto vazado).` : "") + (EST.p26h ? " Modo horário: linha hora a hora na mesma escala." : "") + " Clique num dia para o perfil horário.";
      function w26() { return (p26.corpo.clientWidth - 52) / Math.max(1, N); }
    }
    desenhar26();

    // RISK-2 · revisões do DECOMP
    const p2 = Mesa.painel(g, { cod: "RISK-2", titulo: "Revisões do DECOMP", unidade: `R$/MWh · ${SUBN[sub]}`, tam: "s", ajuda: "nivel",
      leg: "Semana operativa de sábado a sexta; DECOMP = PLD semanal da revisão; DESSEM = média dos dias da semana com dados. Clique numa revisão para os dias e o perfil horário." });
    const ultG = gs.slice(-12).reverse();
    const tb = QC.tabela(p2.corpo, [{ t: "RV" }, { t: "Semana" }, { t: "DECOMP", n: 1 }, { t: "DESSEM", n: 1 }, { t: "Desvio", n: 1 }, { t: "Piso h", n: 1 }],
      ultG.map(k => [`${k.nome}${k.pmo ? ` <span class="risk-cinza">${MES[+k.pmo.slice(5, 7) - 1]}</span>` : ""}`, `${ddmm(k.ini)}${k.emCurso ? " *" : ""}`, n(k.decomp, 1), n(k.dessem, 1), `<span class="${tom(k.dessem - k.decomp)}">${seta(k.dessem - k.decomp)} ${sn(k.dessem - k.decomp, 1)}</span>`, n(k.piso, 1)]), "risk-densa");
    tb.querySelectorAll("tbody tr").forEach((tr, i) => alvoR(tr, () => inspRev(sub, ultG[i].ini)));
    nota(p2.corpo, "* semana em curso. Piso h = horas do vale no piso por dia, média da semana.");

    // RISK-3 · desvio por bloco, mensal · RISK-4 · o mês por dia
    const p3 = Mesa.painel(g, { cod: "RISK-3", titulo: "Desvio por bloco · mensal", unidade: "R$/MWh", tam: "s", ajuda: "blocos",
      leg: "Contribuição de cada bloco ao desvio médio do mês; o mês em curso aparece claro e tracejado (realizado até o último deck). Mês civil; DECOMP = média das semanas vigentes ponderada pelos dias. Sem fev–mar/2023 (decks ausentes). Clique num mês para o detalhe e para vê-lo por dia ao lado." });
    const HIST = [["ano", `No ano (${ultMes.slice(0, 4)})`], ["12m", "12 meses"], ["24m", "24 meses"], ["todo", "Histórico"]];
    EST.hist = valido(EST.hist, HIST, "12m");
    const ctl3 = mk("div", "risk-ctl"); ctl3.append(abas(HIST, EST.hist, v => { EST.hist = v; guardar(); desenharMensal(); }, "Período do histórico")); p3.corpo.before(ctl3);
    const p4 = Mesa.painel(g, { cod: "RISK-4", titulo: "O mês, por dia", unidade: "R$/MWh", tam: "s", ajuda: "blocos", leg: "Mesmos blocos e cores do mês a mês, em escala própria. Clique num dia para o perfil horário." });
    const todosDias = ((D.dias_blocos || {})[sub] || []);
    const mesesDias = [...new Set(todosDias.map(r => r.data.slice(0, 7)))].sort().reverse();
    EST.mesDias = mesesDias.includes(EST.mesDias) ? EST.mesDias : mesesDias[0];
    const selDias = selEm(p4, mesesDias.map(m => [m, rot(m) + (m === ultMes ? " (corrente)" : "")]), EST.mesDias, v => { EST.mesDias = v; guardar(); desenharDias(); }, "Mês do gráfico por dia");
    function desenharMensal() {
      limpar(p3.corpo); legBlocos(p3.corpo);
      let dm2 = D.desvio_mensal.filter(r => r.sub === sub).sort((a, b) => (a.mes < b.mes ? -1 : 1));
      if (EST.hist === "ano") dm2 = dm2.filter(r => r.mes.startsWith(ultMes.slice(0, 4)));
      if (EST.hist === "12m") dm2 = dm2.slice(-12);
      if (EST.hist === "24m") dm2 = dm2.slice(-24);
      const curto = EST.hist !== "todo";
      const rowsM = dm2.map(r => ({ ...r, extra: `<br>DECOMP ${n(r.decomp, 1)} · DESSEM ${n(r.dessem, 1)}` + (r.parcial ? `<br>mês em curso: ${r.dias} dias, até ${dataBr(ULT)}` : "") }));
      G(p3.corpo, 280, (svg, w, hh) => empilhado(svg, rowsM, w, hh,
        r => (curto ? { t: rot(r.mes) + (r.parcial ? "*" : ""), forte: r.mes.endsWith("-01") } : r.mes.endsWith("-01") ? { t: r.mes.slice(0, 4), forte: true } : null), r => rotLongo(r.mes) + (r.parcial ? " (parcial)" : ""),
        r => { if (mesesDias.includes(r.mes) && r.mes !== EST.mesDias) { EST.mesDias = r.mes; guardar(); selDias.value = r.mes; requestAnimationFrame(desenharDias); } return inspMes(sub, r.mes); }));
    }
    function desenharDias() {
      limpar(p4.corpo);
      const dd = todosDias.filter(r => r.data.startsWith(EST.mesDias)).sort((a, b) => (a.data < b.data ? -1 : 1));
      const dm3 = D.desvio_mensal.find(r => r.sub === sub && r.mes === EST.mesDias);
      mt(p4.corpo, rotLongo(EST.mesDias) + (EST.mesDias === ultMes ? ` · até ${ddmm(ULT)}` : ""), dm3 ? `mês ${sn(dm3.delta, 1)}` : "");
      G(p4.corpo, 300, (svg, w, hh) => empilhado(svg, dd.map(r => ({ ...r, extra: `<br>DECOMP ${n(r.decomp, 1)} · DESSEM ${n(r.dessem, 1)}` })), w, hh,
        (r, i) => (i % Math.max(1, Math.ceil(dd.length / 8)) === 0 ? { t: r.data.slice(8, 10) } : null), r => `${dataBr(r.data)} · ${diaSem(r.data)}`, r => inspDia(sub, r.data)));
    }
    desenharMensal(); desenharDias();
    g.append(p2.el);  // linha de baixo: mês a mês, o mês por dia e as revisões, um terço cada
  }
  // divisão entre dias no eixo X: tique curto; com até ~45 dias, também linha pontilhada clara
  function divisoesDia(svg, xsDia, m, hh) {
    const linha = xsDia.length <= 45;
    xsDia.forEach((xx, i) => { if (i === 0) return;
      if (linha) S(svg, "line", { x1: xx, x2: xx, y1: m.t, y2: hh - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "2 3", opacity: 0.35 });
      S(svg, "line", { x1: xx, x2: xx, y1: hh - m.b, y2: hh - m.b + (linha ? 8 : 5), stroke: "var(--ink-2)", "stroke-width": 1 }); });
  }
  // horário alinhado embaixo do diário: cada dia ocupa a mesma largura, dividida em 24 horas
  function desenharNivelHora(box, lin, grupos, modo, rotX, porDia, sub) {
    const horas = new Map(); Object.values((D.dias_perfil || {})[sub] || {}).flat().forEach(d => horas.set(d.data, d.pld));
    G(box, 170, (svg, w, hh) => {
      const m = { l: 42, r: 84, t: 10, b: 24 }, N = lin.length;
      if (!N) { S(svg, "text", { x: w / 2, y: hh / 2, "text-anchor": "middle" }, "sem dados no período"); return; }
      const curto = modo !== "nenhum";
      const dw = (w - m.l - m.r) / N, xd = i => m.l + i * dw, xc = i => xd(i) + dw / 2, xh = (i, k) => xd(i) + (k + 0.5) * dw / 24;
      let vals = [];
      if (curto) lin.forEach(r => { const v = horas.get(r[0]); if (v) vals.push(...v); }); else lin.forEach(r => vals.push(r[6], r[7]));
      vals = vals.filter(v => v != null);
      const ax = eixo(0, Math.max(100, ...vals), 4), y = v => m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
      if (curto) grupos.forEach((k, j) => { const xa = xd(k.i0), xb = xd(k.i1 + 1);
        if (j % 2 === 0) S(svg, "rect", { x: xa, y: m.t, width: xb - xa, height: hh - m.t - m.b, fill: "var(--vazio)", opacity: 0.55 });
        S(svg, "line", { x1: xa, x2: xa, y1: m.t, y2: hh - m.b, stroke: "var(--ink-3)", opacity: 0.7 }); });
      ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
      if (curto) divisoesDia(svg, lin.map((_, i) => xd(i)), m, hh);
      S(svg, "path", { d: lin.map((r, i) => `${i ? "L" : "M"}${xd(i)},${y(r[3])}L${xd(i + 1)},${y(r[3])}`).join(""), fill: "none", stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
      let fim = null;
      if (curto) {
        let d = "", pen = false;
        lin.forEach((r, i) => { const v = horas.get(r[0]); if (!v) { pen = false; return; }
          v.forEach((z, k) => { if (z == null) { pen = false; return; } d += `${pen ? "L" : "M"}${xh(i, k)},${y(z)}`; pen = true; fim = [xh(i, k), z]; }); });
        S(svg, "path", { d, fill: "none", stroke: "var(--accent)", "stroke-width": N > 40 ? 0.9 : 1.3, "stroke-linejoin": "round" });
      } else {
        const ok = lin.map((r, i) => [i, r]).filter(([, r]) => r[6] != null && r[7] != null);
        S(svg, "path", { d: ok.map(([i, r], k) => `${k ? "L" : "M"}${xc(i)},${y(r[7])}`).join("") + [...ok].reverse().map(([i, r]) => `L${xc(i)},${y(r[6])}`).join("") + "Z", fill: "color-mix(in srgb, var(--accent) 22%, transparent)" });
        S(svg, "path", { d: lin.map((r, i) => `${i ? "L" : "M"}${xc(i)},${y(r[1])}`).join(""), fill: "none", stroke: "var(--accent)", "stroke-width": 1.2 });
        fim = [xc(N - 1), lin[N - 1][1]];
      }
      if (fim) S(svg, "text", { x: w - m.r + 6, y: y(fim[1]) + 3, class: "forte", style: "fill:var(--accent)" }, "DESSEM " + n(fim[1]));
      let ultX = -1e9;
      lin.forEach((r, i) => { const lab = rotX(r[0], i); if (!lab) return; const t = lab.t ?? lab; if (xc(i) - ultX < Math.max(14, String(t).length * 6.4 + 4)) return;
        S(svg, "text", { x: xc(i), y: hh - 6, "text-anchor": "middle", class: lab.forte ? "forte" : null }, t); ultX = xc(i); });
      const foco = S(svg, "line", { y1: m.t, y2: hh - m.b, stroke: "var(--ink-3)", opacity: 0 });
      lin.forEach((r, i) => {
        const a = S(svg, "rect", { x: xd(i), y: m.t, width: dw, height: hh - m.t - m.b, fill: "transparent", class: "risk-alvo" });
        const horaDe = e => { const b = svg.getBoundingClientRect(); const px = (e.clientX - b.left) / b.width * w; return Math.max(0, Math.min(23, Math.floor((px - xd(i)) / dw * 24))); };
        a.addEventListener("pointermove", e => { const xx = curto ? xh(i, horaDe(e)) : xc(i); foco.setAttribute("x1", xx); foco.setAttribute("x2", xx); foco.setAttribute("opacity", 0.6); });
        a.addEventListener("pointerleave", () => foco.setAttribute("opacity", 0));
        const k = porDia.get(r[0]);
        dicaEm(a, e => {
          if (!curto) return `<b>${dataBr(r[0])} ${diaSem(r[0])}</b><br>PLD horário: mínimo ${n(r[6], 1)} · média ${n(r[1], 1)} · máximo ${n(r[7], 1)}`;
          const hr = horaDe(e), v = (horas.get(r[0]) || [])[hr];
          return `<b>${dataBr(r[0])} ${diaSem(r[0])} · ${hr}h</b>${VALE_H.includes(hr) ? " · vale" : PONTA_H.includes(hr) ? " · ponta" : ""}<br>PLD ${v == null ? "—" : rs(v, 1)}${v != null && v <= r[3] + 0.005 ? " (piso)" : ""}` + (k ? `<br>${descrRev(k)}` : "");
        });
        if (N <= 400) alvoR(a, () => inspDia(sub, r[0]));
      });
    });
  }
  // resumo do simulador no inspetor (a partir da linha de decisão do Monitor)
  function inspSimCurto() {
    const s = simular(), R = s.R;
    return { t: `Simulador · ${rotLongo(s.c.mes)}`, c: el => {
      pares(el, [["PLD previsto", rs(s.r.pld, 1)], ["DECOMP médio", rs(s.DEC, 0)], ["Desvio", `${sn(s.r.delta, 1)} · ${DIR[s.r.dir].toLowerCase()}`], ["Faixa 10–90%", `${n(s.r.lo)} a ${n(s.r.hi)}`],
        ["Antecedência", `${s.ante} · ${s.c.rv0_publicada ? "RV0 publicada" : "RV0 ~" + ddmm(s.c.rv0)}`], ["Estresse de ponta", `${n(s.sens, 1)} (ponta útil ${rs(s.pu, 0)} em ${SIM.pct}% dos dias)`],
        ["De onde vem", ["vpiso", "fora", "ponta"].map(k => `${{ vpiso: "vale", fora: "outras", ponta: "ponta" }[k]} ${sn(R.de_onde_vem[k].valor, 1)}`).join(" · ")]]);
      if (s.editado) nota(el, "Premissas editadas no simulador.");
      const b = mk("button", "risk-btn", "Abrir o simulador · RISK 2"); b.type = "button"; b.addEventListener("click", () => Mesa.ir("RISK", 2)); el.append(b);
    } };
  }

  // =====================================================================================================
  // 2 · SIM Simulador
  // =====================================================================================================
  const GRUPOS = [["vpiso", "Vale no piso"], ["fora", "Outras horas"], ["ponta", "Ponta"]];
  const G_DE = { horas_piso: "vpiso", frac_fora: "fora", ponta: "ponta" };
  function telaSIM(area) {
    const topo = mk("div", "risk-topo"); area.append(topo);
    const g1 = Mesa.grade(area);
    const p5 = Mesa.painel(g1, { cod: "RISK-5", titulo: "Simulação do mês", unidade: "SE/CO · R$/MWh", tam: "xl", ajuda: "passos" });
    const p6 = Mesa.painel(g1, { cod: "RISK-6", titulo: "Resumo para a mesa", tam: "s", ajuda: "resumo", leg: "ⓘ em cada item: como é calculado. Alertas no fim, só quando valem." });
    const HPP = [["6m", "6 meses"], ["12m", "12 meses"], ["todo", "Desde jan/2025"]];
    EST.hpPer = valido(EST.hpPer, HPP, "6m");
    barra(area, [{ rot: `Histórico das premissas · janela móvel de ${D.premissas_hist.janela} dias`, opc: HPP, atual: EST.hpPer, aoTrocar: v => { EST.hpPer = v; guardar(); desenharPJ(); desenharHP(); } }]);
    const g2 = Mesa.grade(area);
    const p7 = Mesa.painel(g2, { cod: "RISK-7", titulo: "Preço da ponta · médias móveis", unidade: "R$/MWh", tam: "s", ajuda: "historico" });
    const p8 = Mesa.painel(g2, { cod: "RISK-8", titulo: "Horas do vale no piso", unidade: "de 8, por dia", tam: "s", ajuda: "historico" });
    const p9 = Mesa.painel(g2, { cod: "RISK-9", titulo: "Desconto das outras horas", unidade: "% do espaço", tam: "s", ajuda: "historico" });
    const p10 = Mesa.painel(g2, { cod: "RISK-10", titulo: "Premissas mês a mês · o que aconteceu", unidade: "SE/CO", tam: "full", ajuda: "premissas-mes" });

    // ---------- entrada: mês, DECOMP, janela, padrão, dias ----------
    const ent = mk("div", "risk-entrada"); p5.corpo.append(ent);
    const cMes = mk("label", "risk-campo", "<span>Mês</span>"); const selM = selecao(cal.map((c, i) => [i, `${rot(c.mes)} · ${ante(c.h)}`]), SIM.mesI, v => { SIM.mesI = +v; mudou(); }, "Mês simulado"); cMes.append(selM);
    const cDec = mk("div", "risk-campo", "<span>DECOMP médio · R$/MWh</span>"); const lDec = mk("div", "risk-lin"); cDec.append(lDec);
    const inpDec = mk("input"); inpDec.type = "number"; inpDec.min = "0"; inpDec.max = "2000"; inpDec.step = "1"; inpDec.value = SIM.dec; inpDec.setAttribute("aria-label", "DECOMP médio do mês, R$/MWh");
    inpDec.addEventListener("input", () => { const v = Number(inpDec.value); if (inpDec.value !== "" && isFinite(v) && v >= 0) { SIM.dec = v; mudou(); } });
    inpDec.addEventListener("blur", () => { inpDec.value = SIM.dec; });
    const bVig = mk("button", "risk-btn", "vigente"); bVig.type = "button"; bVig.title = `DECOMP vigente: ${n(ref.decomp_vigente, 2)}`; bVig.addEventListener("click", () => { SIM.dec = Math.round(ref.decomp_vigente); inpDec.value = SIM.dec; mudou(); });
    lDec.append(inpDec, bVig);
    const cJan = mk("div", "risk-campo", '<span class="risk-jan-r"></span>');
    const abJan = abas(JAN_OPC.map(x => [x, `${x}d${+x === D.janela_padrao ? "*" : ""}`]), SIM.jan, v => { SIM.jan = v; SIM.prem = copiaJan(v); TIPOS_SIM.forEach(([t]) => { SIM.fix[t].ponta = null; }); montarPrem(); mudou(true); }, "Janela das premissas");
    cJan.append(abJan);
    const cAc = mk("div", "risk-acoes");
    const bPad = mk("button", "risk-btn", "↺ Premissas padrão"); bPad.type = "button";
    bPad.addEventListener("click", () => { const p = simPadrao(); SIM.jan = p.jan; SIM.prem = p.prem; SIM.fix = p.fix; SIM.pct = p.pct; abJan.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === SIM.jan))); montarPrem(); mudou(true); });
    const bDias = mk("button", "risk-btn", "Dias do mês ›"); bDias.type = "button";
    alvoR(bDias, () => inspDiasSim());
    cAc.append(bPad, bDias);
    ent.append(cMes, cDec, cJan, cAc);

    // ---------- tabela de premissas (D090): premissa × tipo de dia, efeito no mês e peso ----------
    const tabBox = mk("div", "rolagem"); p5.corpo.append(tabBox);
    const tab = mk("table", "risk-prem"); tabBox.append(tab);
    tab.innerHTML = `<thead><tr><th>Premissa</th><th class="n" data-th="útil"></th><th class="n" data-th="sábado"></th><th class="n" data-th="domingo/feriado"></th><th class="n col-mes">No mês<small>R$/MWh</small></th><th class="n col-mes">Peso</th></tr></thead><tbody></tbody>`;
    const tPrem = tab.tBodies[0];
    let FORA_DICA = "", FORA_EF = "", LEG_SENS = "";
    const LINHAS_PREM = [
      { k: "horas_piso", rot: "Vale no piso", un: "h/dia, de 8", dica: "Horas do vale (8h–15h) no piso por dia: média dos dias da janela, por tipo de dia.", passo: 0.1, de: v => v, para: v => Math.min(Math.max(v, 0), NV), casas: 1 },
      { k: "frac_fora", rot: "Outras horas", un: "% do espaço · todos os dias", unico: true, dica: "Desconto das horas fora do piso e da ponta sobre o DECOMP, em % do espaço DECOMP − piso, um número só para os três tipos de dia. Padrão: média dos 12 meses encerrados (com DECOMP acima do piso) (D087).", passo: 0.5, de: v => v * 100, para: v => v / 100, casas: 1,
        extra: () => { const c = cal[SIM.mesI], esp = Math.max(SIM.dec - c.piso, 0), v = SIM.prem["útil"].frac_fora * esp, jt = JANS[SIM.jan].todos, rt = D.ref_fora_tipo;
          const jan = jt.espaco_fora != null && jt.espaco_fora < 20 ? `janela ${SIM.jan}d no piso: ${sn(jt.desvio_fora, 0)} R$/h` : `janela ${SIM.jan}d ${sn(jt.frac_fora * 100, 0)}%`;
          const efeito = esp > 0 ? `${sn(v, 1)} R$/h sobre o DECOMP` : "DECOMP no piso: sem efeito";
          const porTipo = rt ? `12 meses por tipo: útil ${sn(rt["útil"].valor * 100, 0)}% · sáb. ${sn(rt["sábado"].valor * 100, 0)}% · dom. ${sn(rt["domingo/feriado"].valor * 100, 0)}%` : "";
          FORA_DICA = `<b>${efeito}</b><br>${jan}${porTipo ? "<br>" + porTipo : ""}<br>Padrão: média dos 12 meses encerrados, um número para todos os dias (D087).`;
          return efeito; } },
      { k: "ponta", rot: "Preço da ponta", un: "R$/MWh 18h–21h", dica: "Preço médio da ponta = DECOMP digitado + prêmio da janela (preço − DECOMP dos mesmos dias). Digite um preço para fixá-lo.", passo: 1, preco: true, casas: 0 },
    ];
    const inpPrem = {}, extraPrem = {};
    function montarPrem() {
      tPrem.replaceChildren();
      LINHAS_PREM.forEach(L => {
        const tr = mk("tr");
        tr.innerHTML = `<td><span class="risk-rot-prem" tabindex="0">${L.rot}</span><small>${L.un}</small></td>`;
        dicaEm(tr.querySelector(".risk-rot-prem"), L.dica);
        TIPOS_SIM.forEach(([t]) => {
          if (L.unico && t !== "útil") return;
          const td = mk("td", "n"); if (L.unico) td.colSpan = 3;
          const inp = mk("input"); inp.type = "number"; inp.step = String(L.passo);
          inp.setAttribute("aria-label", L.unico ? `${L.rot} · todos os dias` : `${L.rot} · ${t}`);
          const lerV = () => (L.preco ? precoEf(t, L.k, SIM.dec, cal[SIM.mesI].piso) : L.de(SIM.prem[t][L.k]));
          inp.value = +lerV().toFixed(L.casas);
          inp.addEventListener("input", () => { const v = Number(inp.value); if (inp.value === "" || !isFinite(v)) return;
            if (L.preco) SIM.fix[t][L.k] = Math.max(v, 0); else if (L.unico) TIPOS_SIM.forEach(([q]) => { SIM.prem[q][L.k] = L.para(v); }); else SIM.prem[t][L.k] = L.para(v);
            mudou(); });
          inp.addEventListener("blur", () => { inp.value = +lerV().toFixed(L.casas); });
          inpPrem[L.k + "|" + t] = inp;
          if (L.unico) { const w = mk("div", "risk-lin"); w.append(inp); const i = mk("span", "risk-info", "ⓘ"); i.tabIndex = 0; i.setAttribute("aria-label", "Detalhes do desconto das outras horas"); w.append(i); dicaEm(i, () => FORA_DICA + (FORA_EF ? "<br>" + FORA_EF : "")); td.append(w); }
          else td.append(inp);
          if (L.extra || L.preco) { const sm = mk("small", "extra"); td.append(sm); extraPrem[L.k + "|" + t] = sm; }
          if (!L.unico) td.insertAdjacentHTML("beforeend", `<small class="contrib" data-c="${L.k}|${t}"></small>`);
          tr.append(td);
        });
        tr.insertAdjacentHTML("beforeend", `<td class="n col-mes" data-m="${L.k}"></td><td class="n col-mes" data-p="${L.k}"></td>`);
        tPrem.append(tr);
      });
      tPrem.insertAdjacentHTML("beforeend", `<tr class="destaque"><td>Desvio do mês</td>${TIPOS_SIM.map(([t]) => `<td class="n" data-dt="${t}"></td>`).join("")}<td class="n col-mes" data-m="tot"></td><td class="n col-mes">100%</td></tr>`);
    }
    montarPrem();

    // ---------- sensibilidade de ponta (D062, D073) ----------
    const sens = mk("div", "risk-sens"); p5.corpo.append(sens);
    sens.innerHTML = `<div class="risk-sens-l"><span class="risk-rot-prem" tabindex="0">Estresse de ponta</span><small>preço da ponta do dia útil e % dos dias úteis</small></div>`;
    const inpS = mk("input"); inpS.type = "number"; inpS.step = "1"; inpS.setAttribute("aria-label", "Preço da ponta do dia útil no cenário, R$/MWh");
    inpS.addEventListener("input", () => { const v = Number(inpS.value); if (inpS.value === "" || !isFinite(v)) return; SIM.fix["útil"].sens = Math.max(v, 0); mudou(); });
    inpS.addEventListener("blur", () => { inpS.value = Math.round(precoEf("útil", "sens", SIM.dec, cal[SIM.mesI].piso)); });
    const sInp = mk("div", "risk-sens-i"); sInp.append(inpS); const sExtra = mk("small"); sInp.append(sExtra);
    const regua = mk("div", "risk-regua"); regua.setAttribute("role", "group"); regua.setAttribute("aria-label", "% dos dias úteis com a ponta no preço do cenário");
    const escolher = e => { const b = e.target.closest("[data-q]"); if (!b || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return; e.preventDefault(); SIM.pct = +b.dataset.q; mudou(); };
    regua.addEventListener("click", escolher); regua.addEventListener("keydown", escolher);
    sens.append(sInp, regua);
    dicaEm(sens.querySelector(".risk-rot-prem"), () => LEG_SENS);
    const legSim = mk("p", "leg"); p5.el.append(legSim);
    const res = mk("div", "risk-res"); p6.corpo.append(res);

    function marcarEditados() {
      const j = JANS[SIM.jan], c = cal[SIM.mesI];
      LINHAS_PREM.forEach(L => TIPOS_SIM.forEach(([t]) => {
        const inp = inpPrem[L.k + "|" + t]; if (!inp) return;
        if (L.preco) {
          const outro = Math.abs(SIM.prem[t].premio_ponta - padrao(t, "premio_ponta")) > 0.05;
          inp.classList.toggle("editado", SIM.fix[t][L.k] != null || outro);
          if (document.activeElement !== inp) inp.value = Math.round(precoEf(t, L.k, SIM.dec, c.piso));
          const pr = premioEf(t, L.k, SIM.dec);
          extraPrem[L.k + "|" + t].textContent = SIM.fix[t][L.k] != null ? `fixado · prêmio ${sn(pr, 0)}` : `${n(SIM.dec)} ${pr < 0 ? "−" : "+"} ${n(Math.abs(pr), 0)}${outro ? " (etiqueta)" : ""}`;
          const jt = j[t]; inp.title = `Na janela: média ${n(jt.ponta_media)} · menor dia ${n(jt.ponta_min_dia)} · maior dia ${n(jt.ponta_max_dia)} · hora mais cara ${n(jt.ponta_max_hora)}`;
          return;
        }
        inp.classList.toggle("editado", Math.abs(padrao(t, L.k) - SIM.prem[t][L.k]) > 1e-6);
        if (document.activeElement !== inp) inp.value = +L.de(SIM.prem[t][L.k]).toFixed(L.casas);
        if (L.extra) extraPrem[L.k + "|" + t].innerHTML = L.extra(t);
      }));
      [["útil", "Útil", "parte_util"], ["sábado", "Sábado", "parte_sabado"], ["domingo/feriado", "Dom./<wbr>feriado", "parte_domingo"]].forEach(([t, nome, col]) => {
        tab.querySelector(`[data-th="${t}"]`).innerHTML = `${nome}<small>${pct(c[col])} do mês · ${n(j[t].dias)} dias</small>`; });
      inpDec.classList.toggle("editado", Math.abs(SIM.dec - Math.round(ref.decomp_vigente)) > 0.5);
      if (document.activeElement !== inpDec) inpDec.value = SIM.dec;
      if (+selM.value !== SIM.mesI) selM.value = SIM.mesI;
      cJan.querySelector(".risk-jan-r").textContent = `Janela ${ddmm(j.inicio)}–${ddmm(j.fim)} · * padrão`;
      // sensibilidade
      inpS.classList.toggle("editado", SIM.fix["útil"].sens != null);
      if (document.activeElement !== inpS) inpS.value = Math.round(precoEf("útil", "sens", SIM.dec, c.piso));
      const pr = premioEf("útil", "sens", SIM.dec);
      sExtra.textContent = SIM.fix["útil"].sens == null && P90_MES != null ? `p90 da ponta de ${rot(D.sensibilidade.mes)}` : SIM.fix["útil"].sens != null ? `fixado · prêmio ${sn(pr, 0)}` : `${n(SIM.dec)} ${pr < 0 ? "−" : "+"} ${n(Math.abs(pr), 0)}`;
    }
    function desenharPeso(r) {
      const absTot = GRUPOS.reduce((a, [k]) => a + Math.abs(r[k]), 0) || 1, tipos = TIPOS_SIM.filter(([t]) => r.porTipo[t]);
      const curtoT = { "útil": "útil", "sábado": "sáb.", "domingo/feriado": "dom." }, q = s => tPrem.querySelector(s);
      Object.entries(G_DE).forEach(([k, gg]) => {
        const m = q(`[data-m="${k}"]`), p = q(`[data-p="${k}"]`);
        if (m) m.innerHTML = `<b>${sn(r[gg], 1)}</b>`; if (p) p.textContent = pct(Math.abs(r[gg]) / absTot);
        if (k === "frac_fora") FORA_EF = "Efeito no mês por tipo: " + tipos.map(([t]) => `${curtoT[t]} ${sn(r.porTipo[t].s * r.porTipo[t][gg], 1)}`).join(" · ");
        else TIPOS_SIM.forEach(([t]) => { const cc = q(`[data-c="${k}|${t}"]`); if (cc) cc.textContent = r.porTipo[t] ? `efeito ${sn(r.porTipo[t].s * r.porTipo[t][gg], 1)}` : "—"; });
      });
      TIPOS_SIM.forEach(([t]) => { const cc = q(`[data-dt="${t}"]`), d = r.porTipo[t]; if (cc) cc.textContent = d ? sn(d.s * (d.vpiso + d.fora + d.ponta), 1) : "—"; });
      const mtot = q('[data-m="tot"]'); if (mtot) mtot.innerHTML = `<b>${sn(r.delta, 1)}</b>`;
    }
    function desenharRegua(mix, pu) {
      regua.innerHTML = REGUA.map(k => `<span role="button" tabindex="0" data-q="${k}" class="${k === SIM.pct ? "sel" : ""}"><b>${k}%</b>${n(mix(k / 100), 1)}</span>`).join("");
      regua.querySelectorAll("[data-q]").forEach(b => dicaEm(b, `<b>${b.dataset.q}% dos dias úteis</b> com a ponta em ${rs(pu, 0)}<br>PLD do mês ${n(mix(+b.dataset.q / 100), 1)}`));
      const dias = (D.ponta_dias || {})["útil"] || [], k = dias.filter(v => v >= pu).length;
      LEG_SENS = `PLD do mês por % dos dias úteis com a ponta em ${rs(pu, 0)} (clique na régua para escolher). Nos últimos 12 meses, a ponta ficou em ${rs(pu, 0)} ou mais em ${pct(dias.length ? k / dias.length : null)} dos dias úteis (${k} de ${dias.length}). Conta: (1 − p) × previsto + p × cenário com a ponta no preço escolhido.`;
    }
    function desenharResumo(s) {
      const R = s.R, c = s.c, hh = c.h, nomeDir = DIR[R.direcao].toLowerCase(), H = R.direcao_hist, inicioBt = rot((D.backtest.filter(x => x.h === hh).map(x => x.mes).sort()[0]) || "2024-07");
      const [lo, hi] = R.faixa_10_90, Em = R.erro_medio, A = R.alertas, an = s.ante;
      const pesos = GRUPOS.map(([k, nome]) => [nome.toLowerCase(), R.de_onde_vem[k].valor, R.de_onde_vem[k].peso]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const p12 = R.premio_ponta.media_12m, p12t = TIPOS_SIM.map(([t]) => sn(p12[t], 0)).join(" / "), pjt = TIPOS_SIM.map(([t]) => sn(SIM.prem[t].premio_ponta, 0)).join(" / ");
      const itens = [
        { l: "Direção", v: H.pouco_historico ? `${DIR[R.direcao]} · pouco histórico` : `${DIR[R.direcao]} · acertou ${pct(H.acertos_desde_mar25 / H.previsoes_desde_mar25)}`,
          c: H.pouco_historico ? (H.previsoes_desde_jul24 ? `Previu ${nomeDir} ${H.previsoes_desde_jul24}× com ${an}; acertou ${H.acertos_desde_jul24}.` : `O modelo nunca previu ${nomeDir} com ${an}.`) : `Previu ${nomeDir} ${H.previsoes_desde_mar25}× com ${an}; veio ${nomeDir} em ${H.acertos_desde_mar25}.`,
          d: (H.pouco_historico ? `Pouco histórico = menos de 5 previsões da mesma direção desde mar/2025. ${H.meses_com_a_direcao.length ? `Meses com ${nomeDir}: ${H.meses_com_a_direcao.map(rot).join(", ")}. ` : ""}Contagem desde ${inicioBt}.` : `Previsões de ${nomeDir} com ${an} desde mar/2025 (regime atual). ${DIR[R.direcao]} ocorreu em ${H.meses_com_a_direcao.length} de ${H.meses_total} meses desde ${inicioBt}.`) + " Backtest fora da amostra com o DECOMP realizado; zona neutra de ±5 R$/MWh." },
        { l: "Faixa provável", v: `${n(lo)} a ${n(hi)}`, c: `Erro médio com ${an}: R$ ${n(Em.antecedencia, 0)}.`,
          d: `Do 10º ao 90º percentil dos erros (previsto − oficial) dos meses encerrados com ${an} de antecedência, somados ao previsto${lo <= c.piso + 0.5 ? `; o limite de baixo é o piso (${n(c.piso, 2)})` : ""}.${hh > 1 && Em.um_mes != null ? ` Com 1 mês de antecedência: R$ ${n(Em.um_mes, 0)}.` : ""}` },
        { l: "De onde vem", leve: true, v: pesos.map(([nm, v, p]) => `${nm} ${sn(v, 1)} (${pct(p)})`).join(" · "), c: "",
          d: `Contribuição de cada grupo de horas ao desvio do mês, já ponderada pelo calendário. Trocando só o prêmio da ponta pela média dos 12 meses (útil / sáb. / dom.: ${p12t} em vez de ${pjt}), o mês dá ${n(R.pld_ponta_na_media_12m, 1)}.` },
        { l: "Estresse de ponta", leve: true, v: `ponta útil ${rs(s.pu, 0)} em ${n(SIM.pct)}% dos dias → <b>${n(s.sens, 1)}</b> (${sn(s.sens - R.pld_previsto, 1)})`, c: "",
          d: (SIM.fix["útil"].sens == null && P90_MES != null ? `${rs(s.pu, 0)} = p90 das horas de ponta dos dias úteis do mês corrente. ` : "") + LEG_SENS },
        { l: "Quando muda", v: c.rv0_publicada ? `RV0 publicada em ${ddmm(c.rv0)}` : `RV0 ~${ddmm(c.rv0)}`,
          c: c.rv0_publicada ? `Erro médio de 1 mês: R$ ${n(Em.um_mes, 0)}.` : `Erro médio R$ ${n(Em.antecedencia, 0)} → R$ ${n(Em.apos_rv0, 0)} após a RV0.`,
          d: (c.rv0_publicada ? "" : `Até a RV0 de ${rot(c.mes)} sair, vale a precisão de ${an}; depois, a de ${ante(Math.max(hh - 1, 1))}. `) + "Antecedência pela RV0: 1 mês se a RV0 do mês já saiu; senão, 1 + as RV0 ainda não publicadas até a do mês (D057). RV0 futura estimada como a sexta antes do sábado que abre a semana operativa do dia 1º." },
      ];
      const alertas = [], hp = A.historico_no_piso, esp = s.DEC - c.piso;
      if (A.decomp_perto_do_piso) alertas.push(`DECOMP ${esp < 5 ? "no piso" : "perto do piso"}: só há espaço para prêmio; o desconto das outras horas não atua.` + (hp ? ` Nos ${hp.meses} meses no piso desde 2021: média ${sn(hp.media, 1)}, máx. ${sn(hp.max, 1)} (${rot(hp.mes_max)})${hp.previsao_acima_de_todos ? `; ${sn(R.desvio, 1)} fica acima de todos` : ""}.` : ""));
      const pju = R.premio_ponta.janela["útil"], p12u = p12["útil"];
      if (A.ponta_afastada_da_media_12m) alertas.push(`Prêmio da ponta útil na janela (${sn(pju, 0)}) ${pju > p12u ? "bem acima" : "bem abaixo"} da média de 12 meses (${sn(p12u, 0)}): o resultado depende disso.`);
      if (A.premissas_editadas) alertas.push("Premissas editadas: o histórico e a faixa valem para as premissas padrão.");
      const corD = corDir(R.direcao);
      res.innerHTML = `<div class="risk-res-num"><b>${n(R.pld_previsto, 1)}</b><span>R$/MWh previsto · ${rot(c.mes)} · DECOMP ${n(s.DEC)}</span></div>
        <div class="risk-res-dir" style="color:${corD}">${seta(R.desvio)} ${R.direcao === "neutro" ? `Neutro: ${sn(R.desvio, 1)} sobre o DECOMP` : `${DIR[R.direcao]} de ${sn(R.desvio, 1)} R$/MWh`}</div>
        <div class="risk-res-itens">${itens.map(it => `<div class="risk-res-item"><div class="risk-res-l">${it.l} <span class="risk-info" tabindex="0" aria-label="Como é calculado">ⓘ</span></div><div class="risk-res-v${it.leve ? " leve" : ""}">${it.v}</div>${it.c ? `<div class="risk-res-c">${it.c}</div>` : ""}</div>`).join("")}</div>` +
        (alertas.length ? `<ul class="risk-res-alertas">${alertas.map(a => `<li>${a}</li>`).join("")}</ul>` : "");
      res.querySelectorAll(".risk-res-item .risk-info").forEach((e, i) => dicaEm(e, itens[i].d));
    }
    function desenharDecisao(s) {
      const R = s.R, c = s.c, Em = R.erro_medio, H = R.direcao_hist;
      const d = Mesa.decisao(area, [
        { r: `PLD médio previsto · ${rot(c.mes)} · SE/CO`, v: rs(s.r.pld, 1), d: `${seta(s.r.delta)} ${DIR[s.r.dir].toLowerCase()} ${sn(s.r.delta, 1)} sobre DECOMP ${n(s.DEC)}${s.editado ? " · premissas editadas" : ""}`, tom: tomDir(s.r.dir), principal: true },
        { r: `Faixa 10–90% · ${s.ante}`, v: `${n(s.r.lo)}–${n(s.r.hi)}`, d: `erro médio R$ ${n(Em.antecedencia, 0)}${c.rv0_publicada ? "" : ` · R$ ${n(Em.apos_rv0, 0)} após a RV0`}` },
        { r: "Direção no backtest", v: DIR[R.direcao], d: H.pouco_historico ? "pouco histórico para medir" : `acertou ${H.acertos_desde_mar25} de ${H.previsoes_desde_mar25} desde mar/25`, tom: tomDir(R.direcao) },
        { r: `Estresse de ponta · ${SIM.pct}% dos dias úteis`, v: n(s.sens, 1), d: `ponta útil ${rs(s.pu, 0)} · ${sn(s.sens - s.r.pld, 1)} sobre o previsto`, tom: tom(s.sens - s.r.pld) },
        { r: "Quando muda", v: c.rv0_publicada ? `RV0 ${ddmm(c.rv0)}` : `RV0 ~${ddmm(c.rv0)}`, d: `piso ${rs(c.piso, 2)}${c.piso_estimado ? " (estimado)" : ""} · janela ${SIM.jan} dias` },
      ]);
      topo.replaceChildren(d);
    }
    function legendaSim(s) {
      const c = s.c, j = JANS[SIM.jan];
      const longo = `${rotLongo(c.mes)}: ${pct(c.parte_util)} dias úteis, ${pct(c.parte_sabado)} sábados, ${pct(c.parte_domingo)} domingos e feriados; piso ${rs(c.piso, 2)}${c.piso_estimado ? " (piso do ano ainda não publicado: usado o último)" : ""}. Premissas: ${SIM.jan} dias, ${dataBr(j.inicio)} a ${dataBr(j.fim)}${s.editado ? " (editadas)" : ""}. ` +
        (c.rv0_publicada ? `A RV0 do mês saiu em ${dataBr(c.rv0)}: confiança medida como previsão de 1 mês.` : `RV0 do mês ainda não publicada (prevista para ~${dataBr(c.rv0)}): confiança medida como previsão de ${s.ante}, o lado conservador.`) +
        (SIM.mesI === 0 && c.rv0_publicada ? " O mês já está em curso: a parte realizada não entra na conta." : "");
      legSim.innerHTML = `Campos com borda âmbar = editados (ficam guardados neste navegador). Piso ${rs(c.piso, 2)} · premissas de ${SIM.jan} dias (${ddmm(j.inicio)}–${ddmm(j.fim)}) · ${c.rv0_publicada ? `RV0 publicada em ${ddmm(c.rv0)}` : `RV0 prevista ~${ddmm(c.rv0)}`} <span class="risk-info" tabindex="0" aria-label="Detalhes">ⓘ</span>`;
      dicaEm(legSim.querySelector(".risk-info"), longo);
    }
    let diasAberto = null;
    function inspDiasSim() {
      const s = simular(), c = s.c, L = CONTA.diasMes(c, SIM.dec, SIM.prem, premios("ponta", SIM.dec), premios("sens", SIM.dec), SIM.pct), N = L.length || 1;
      const pldMes = Math.max(L.reduce((a, x) => a + x.pld_dia, 0) / N, c.piso), confere = Math.abs(pldMes - s.r.pld) < 0.05;
      const sensMes = Math.max(L.reduce((a, x) => a + x.pld_dia_esperado_com_pct, 0) / N, c.piso);
      const tt = `Dias de ${rotLongo(c.mes)} · simulação`; diasAberto = tt;
      return { t: tt, c: el => {
        const nU = L.filter(x => x._cod === "u").length, nS = L.filter(x => x._cod === "s").length;
        pares(el, [["Dias", `${nU} úteis · ${nS} sábados · ${L.length - nU - nS} dom./feriados`], ["Média dos dias", `${n(pldMes, 1)}${confere ? " = previsto ✓" : ""}`], [`Com estresse ${SIM.pct}%`, n(sensMes, 1)]]);
        const box = QC.tabela(el, [{ t: "Dia" }, { t: "Piso h", n: 1 }, { t: "Outras", n: 1 }, { t: "Ponta", n: 1 }, { t: "PLD", n: 1 }, { t: `Estr. ${SIM.pct}%`, n: 1 }],
          L.map(x => [`${ddmm(x.data)} ${x.dia}`, n(x.horas_piso, 1), n(x.outras_horas, 0), n(x.ponta, 0), `<b>${n(x.pld_dia, 1)}</b>`, n(x.pld_dia_esperado_com_pct, 1)]), "risk-densa");
        box.querySelectorAll("tbody tr").forEach((tr, i) => { if (L[i]._cod !== "u") tr.classList.add("risk-fds"); });
        const b = mk("button", "risk-btn", "Baixar CSV"); b.type = "button"; b.addEventListener("click", () => baixarCsv(c, L, pldMes, sensMes, s.pu)); el.append(b);
        nota(el, `No modelo, todos os dias do mesmo tipo têm o mesmo preço: a tabela mostra como o PLD do mês se forma pelo calendário, não uma previsão de cada dia. PLD do dia = [horas do vale no piso × piso + (20 − horas no piso) × outras horas + 4 × ponta] / 24. A última coluna é o PLD esperado do dia útil com a ponta em ${rs(s.pu, 0)} em ${SIM.pct}% dos dias úteis.`);
      } };
    }
    // CSV para o Excel em português: separador ";", vírgula decimal, BOM para os acentos
    function baixarCsv(c, L, pldMes, sensMes, pu) {
      const j = JANS[SIM.jan], f = (v, k = 2) => (v == null || !isFinite(v) ? "" : v.toFixed(k).replace(".", ","));
      const meta = [["Simulação do PLD médio do mês (SE/CO)", ""], ["Mês", c.mes], ["DECOMP médio digitado (R$/MWh)", f(SIM.dec)], ["Piso (R$/MWh)", f(c.piso)],
        ["Premissas", `janela de ${SIM.jan} dias (${dataBr(j.inicio)} a ${dataBr(j.fim)})${editouPrem() ? ", editadas" : ""}`], ["Desconto das outras horas (% do espaço)", f(SIM.prem["útil"].frac_fora * 100, 1)],
        ["PLD previsto do mês (R$/MWh)", f(pldMes)], ["Sensibilidade", `ponta útil a R$ ${f(pu, 0)} em ${SIM.pct}% dos dias úteis: ${f(sensMes)} R$/MWh`], ["Dados", "fictícios (laboratório)"]];
      const cab = ["Data", "Dia", "Tipo", "Vale no piso (h/dia)", "Outras horas (R$/MWh)", "Ponta 18h-21h (R$/MWh)", "PLD do dia (R$/MWh)", `PLD do dia com a ponta útil a R$ ${f(pu, 0)} o dia todo (R$/MWh)`, `PLD esperado do dia com a ponta útil a R$ ${f(pu, 0)} em ${SIM.pct}% dos dias úteis (R$/MWh)`];
      const lin = L.map(x => [`${x.data.slice(8, 10)}/${x.data.slice(5, 7)}/${x.data.slice(0, 4)}`, x.dia, x.tipo, f(x.horas_piso, 1), f(x.outras_horas), f(x.ponta), f(x.pld_dia), x._cod === "u" ? f(x.pld_dia_ponta_estressada) : "", f(x.pld_dia_esperado_com_pct)]);
      const csv = "﻿" + [...meta.map(m => m.join(";")), "", cab.join(";"), ...lin.map(l => l.join(";")), ["Média", "", "", "", "", "", f(pldMes), "", f(sensMes)].join(";")].join("\r\n");
      const a = mk("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `simulacao_pld_${c.mes}_decomp${Math.round(SIM.dec)}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    function atualizar() {
      const s = simular();
      desenharDecisao(s); desenharRegua(s.mix, s.pu); marcarEditados(); desenharPeso(s.r); desenharResumo(s); legendaSim(s);
      chipsPJ(); desenharHM(); atualizarSinal();
      if (diasAberto && document.getElementById("insp-titulo").textContent === diasAberto) { const r = inspDiasSim(); Mesa.inspecionar(r.t, r.c); }
    }
    function mudou(jan) { salvarSim(); atualizar(); if (jan) desenharTraj(); }

    // ---------- RISK-7 · preço da ponta: médias móveis de 7/14/30/60 dias e referência de 12 meses ----------
    const PJA = D.ponta_janelas, JN = [["7", "7 dias", "var(--risk-dom)", 1.2], ["14", "14 dias · premissa", "var(--accent)", 2.4], ["30", "30 dias", "var(--risk-sab)", 1.4], ["60", "60 dias", "var(--ink-2)", 1.4]];
    EST.pjT = valido(EST.pjT, TIPOS, "útil");
    const abPJ = abas(TIPOS.map(([t, nome]) => [t, nome.replace("Domingo/feriado", "Dom./feriado")]), EST.pjT, v => { EST.pjT = v; guardar(); desenharPJ(); }, "Tipo de dia do preço da ponta");
    const chips = mk("div", "risk-chips"); const pjG = mk("div"); const trP = mk("div");
    p7.corpo.append(abPJ, chips, pjG); mt(p7.corpo, "Cada dia, últimos 60", "traço = DECOMP"); p7.corpo.append(trP);
    const legPJ = mk("p", "leg"); p7.el.append(legPJ);
    chips.addEventListener("click", e => { const b = e.target.closest("button[data-p]"); if (!b) return; SIM.prem[EST.pjT].premio_ponta = +b.dataset.p; SIM.fix[EST.pjT].ponta = null; mudou(); });
    function chipsPJ() {
      const PJ = PJA[EST.pjT], ult = k => PJ[k][PJ[k].length - 1], T = EST.pjT, st = { premio: SIM.prem[T].premio_ponta, livre: SIM.fix[T].ponta == null, dec: SIM.dec, piso: cal[SIM.mesI].piso };
      chips.innerHTML = JN.map(([k, nome, cor]) => { const v = ult(k), p = ult(k + "p"), dcp = ult(k + "d");
        return `<button type="button" style="--c:${cor}" data-p="${p}" aria-pressed="${st.livre && Math.abs(st.premio - p) < 0.05}" title="Média R$ ${n(v)} com DECOMP médio ${n(dcp)}; prêmio ${sn(p)}; com o DECOMP digitado (${n(st.dec)}): R$ ${n(Math.max(st.dec + p, st.piso))}. Clique para usar este prêmio."><small>${nome}</small>R$ ${n(v)}<small>prêmio ${sn(p)} → ${n(Math.max(st.dec + p, st.piso))}</small></button>`; }).join("");
    }
    function desenharPJ() {
      const T = EST.pjT, PJ = PJA[T], Rf = PJ.ref12, ult = k => PJ[k][PJ[k].length - 1], nomeT = nomeTipo(T);
      const N = PJ.datas.length, ini = EST.hpPer === "todo" ? 0 : Math.max(0, N - (EST.hpPer === "6m" ? 183 : 365)), xs = PJ.datas.slice(ini);
      const rotXd = (d, i) => (d.endsWith("-01") && (d.slice(5, 7) === "01" || i === 0) ? { t: rot(d.slice(0, 7)), forte: true } : d.endsWith("-01") && (EST.hpPer === "6m" || +d.slice(5, 7) % 3 === 1) ? MES[+d.slice(5, 7) - 1] : null);
      const serie = k => xs.map((d, i) => [d, PJ[k][ini + i]]);
      limpar(pjG);
      G(pjG, 140, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 40, mr: 66, xs, y0: 0, nt: 5, justo: true, rotX: rotXd, rotFim: true,
        series: [{ nome: "DECOMP", cor: "var(--ink-3)", larg: 1.2, tracejado: true, pts: serie("14d"), rotFim: "DEC " + n(ult("14d")) },
          { nome: "ref", cor: "var(--risk-ref)", larg: 1.6, tracejado: true, pts: xs.map(d => [d, Rf.valor]), rotFim: "12m " + n(Rf.valor) },
          ...JN.map(([k, nome, cor, larg]) => ({ nome, cor, larg, pts: serie(k), rotFim: `${k}d ${n(ult(k))}` }))],
        dica: d => { const i = PJ.datas.indexOf(d); return `<b>${dataBr(d)}</b> · ${nomeT.toLowerCase()}, dias anteriores<br>` + JN.map(([k, nome]) => `${nome}: R$ ${n(PJ[k][i])} (prêmio ${sn(PJ[k + "p"][i])} sobre DECOMP ${n(PJ[k + "d"][i])})`).join("<br>") + `<br>média 12 meses: R$ ${n(Rf.valor)}`; } }));
      legPJ.textContent = `${nomeT}, 18h–21h; cada ponto usa só os dias anteriores. Amarelo: média de 12 meses (${rot(Rf.de)}–${rot(Rf.ate)}). Etiqueta: prêmio → preço com o DECOMP digitado; clique para usar no simulador.`;
      chipsPJ();
    }
    // os dias da janela (trajetória compacta): ponta (60 dias, janela em destaque), piso e desconto
    const TR = D.trajetoria, iT = Object.fromEntries(TR.colunas.map((c, i) => [c, i]));
    const pisoG = mk("div"), trPiso = mk("div"), foraRef = mk("p", "risk-ref12"), foraG = mk("div"), trFora = mk("div");
    legenda(p8.corpo, TIPOS.map(([, nome, cor]) => [cor, nome.replace("Domingo/feriado", "Dom./feriado"), "l"])); p8.corpo.append(pisoG); const mtPiso = mt(p8.corpo, "Cada dia da janela", "barra = tipo de dia"); p8.corpo.append(trPiso);
    p9.corpo.append(foraRef); legenda(p9.corpo, [["var(--risk-util)", "Todos os dias", "l"], ["var(--ink-3)", "Média 12 meses (padrão)", "t"]]); p9.corpo.append(foraG); const mtFora = mt(p9.corpo, "Cada dia da janela", "vazado = DECOMP no piso"); p9.corpo.append(trFora);
    const legHP = mk("p", "leg"); p8.el.append(legHP);
    nota(p9.el, "Uma curva só (por tipo de dia na dica); tracejado claro = DECOMP no piso, % não comparável. Só informativo.");
    function desenharTraj() {
      const j = JANS[SIM.jan], dias = TR.dias.filter(r => r[0] >= j.inicio && r[0] <= j.fim);
      mtPiso.firstChild.textContent = `Cada um dos ${dias.length} dias da janela (${ddmm(j.inicio)}–${ddmm(j.fim)})`; mtFora.firstChild.textContent = mtPiso.firstChild.textContent;
      const mini = (box, hgt, col, fmt, y0, y1, comBarras, ref2, estendido) => { limpar(box); G(box, hgt, (svg, w, hh) => {
        const dias_ = estendido ? TR.dias.slice(-60) : dias, naJan = r => r[0] >= j.inicio && r[0] <= j.fim;
        const m = { l: 34, r: 6, t: estendido ? 18 : 8, b: 16 }, N = dias_.length; if (!N) return;
        const fracEsp = col === "frac_fora";
        const vals = dias_.filter(r => !fracEsp || r[iT.espaco] >= 20).flatMap(r => [r[iT[col]], ref2 ? r[iT[ref2]] : null]).filter(v => v != null);
        const ax = eixo(Math.min(y0 ?? Infinity, ...vals), Math.max(y1 ?? -Infinity, ...vals), 2);
        const bw = (w - m.l - m.r) / N, x = i => m.l + (i + 0.5) * bw, y = v => m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
        ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 4, y: y(t) + 3, "text-anchor": "end" }, fmt(t)); });
        const base = y(Math.max(ax.a, Math.min(0, ax.b)));
        if (estendido) { const i0 = dias_.findIndex(naJan); if (i0 > 0) { const xs_ = x(i0) - bw / 2; S(svg, "line", { x1: xs_, x2: xs_, y1: m.t - 12, y2: hh - m.b, stroke: "var(--accent)", "stroke-width": 1.2, "stroke-dasharray": "3 3" });
          S(svg, "text", { x: xs_ + 4, y: m.t - 4, class: "forte", style: "fill:var(--accent)" }, `janela de ${dias.length} dias →`); } }
        let ultX = -1e9;
        dias_.forEach((r, i) => {
          const v0 = r[iT[col]], cor = corTipo(r[1]), piso = fracEsp && r[iT.espaco] < 20, v = piso && v0 != null ? Math.max(Math.min(v0, ax.b), ax.a) : v0;
          if (v != null) {
            if (comBarras) S(svg, "rect", { x: x(i) - Math.min(bw * 0.35, 7), y: Math.min(y(v), base), width: Math.min(bw * 0.7, 14), height: Math.max(1, Math.abs(y(v) - base)), fill: cor, opacity: estendido && !naJan(r) ? 0.4 : 1 });
            else if (piso) S(svg, "circle", { cx: x(i), cy: y(v), r: N > 45 ? 2 : 3.2, fill: "none", stroke: cor, "stroke-width": 1.2, opacity: 0.5 });
            else S(svg, "circle", { cx: x(i), cy: y(v), r: N > 45 ? 2 : 3.2, fill: cor });
          }
          if ((i === 0 || i === N - 1 || (r[0].endsWith("-01") && i > Math.max(2, N * 0.06) && i < Math.min(N - 3, N * 0.94))) && (x(i) - ultX > 40 || i === N - 1)) { S(svg, "text", { x: x(i), y: hh - 4, "text-anchor": i === N - 1 ? "end" : "middle" }, ddmm(r[0])); ultX = x(i); }
          const a = S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: hh - m.t - m.b, fill: "transparent", class: "risk-alvo" });
          dicaEm(a, `<b>${dataBr(r[0])} ${diaSem(r[0])}</b> · ${r[1] || "—"}<br>vale no piso ${n(r[iT.horas_piso], 0)} de 8 h · outras horas ${r[iT.espaco] < 20 ? `${sn(r[iT.frac_fora] * 20, 1)} R$/h (no piso)` : `${sn(r[iT.frac_fora] * 100, 0)}% do espaço`}<br>ponta média R$ ${n(r[iT.ponta_media], 0)} (prêmio ${sn(r[iT.premio_ponta], 0)}) · hora mais cara ${n(r[iT.ponta_max_hora], 0)}<br>DECOMP ${n(r[iT.decomp], 1)} · espaço ${n(r[iT.espaco], 1)}`);
          alvoR(a, () => inspDia("SE", r[0]));
        });
        if (ref2) S(svg, "path", { d: dias_.map((r, i) => `${i ? "L" : "M"}${x(i) - bw / 2},${y(r[iT[ref2]])}L${x(i) + bw / 2},${y(r[iT[ref2]])}`).join(""), fill: "none", stroke: "var(--ink)", "stroke-width": 1.4, "stroke-dasharray": "3 2", "pointer-events": "none" });
      }); };
      mini(trPiso, 70, "horas_piso", v => n(v), 0, 8, true);
      mini(trFora, 70, "frac_fora", v => sn(v * 100) + "%", -1, 0, false);
      mini(trP, 72, "ponta_media", v => n(v), 0, null, true, "decomp", true);
    }
    // ---------- RISK-8, RISK-9 · histórico das premissas (janela móvel padrão) ----------
    const HP = D.premissas_hist, iCol = Object.fromEntries(HP.colunas.map((c, i) => [c, i]));
    function desenharHP() {
      const todas = HP.tipos["útil"].map(r => r[0]);
      const ini = EST.hpPer === "todo" ? "2025-01-01" : (() => { const d = new Date(todas[todas.length - 1] + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - (EST.hpPer === "6m" ? 6 : 12)); return d.toISOString().slice(0, 10); })();
      const xs = todas.filter(d => d >= ini);
      const porT = Object.fromEntries(TIPOS.map(([t]) => [t, new Map(HP.tipos[t].map(r => [r[0], r]))]));
      const rotXd = (d, i) => (d.endsWith("-01") && (d.slice(5, 7) === "01" || i === 0) ? { t: rot(d.slice(0, 7)), forte: true } : d.endsWith("-01") && (EST.hpPer === "6m" || +d.slice(5, 7) % 3 === 1) ? MES[+d.slice(5, 7) - 1] : null);
      limpar(pisoG);
      G(pisoG, 140, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 30, mr: 34, xs, y0: 0, y1: 8, nt: 4, fmtY: v => n(v), rotX: rotXd, rotFim: true,
        series: TIPOS.map(([t, nome, cor]) => { const pts = xs.map(d => { const r = porT[t].get(d); return [d, r ? r[iCol.horas_piso] : null]; }); const u = [...pts].reverse().find(p => p[1] != null); return { nome, cor, larg: t === "útil" ? 1.8 : 1.1, pts, rotFim: u ? n(u[1], 1) : null }; }),
        dica: d => `<b>${dataBr(d)}</b> · ${HP.janela} dias antes<br>` + TIPOS.map(([t, nome]) => { const r = porT[t].get(d); return r ? `${nome}: ${n(r[iCol.horas_piso], 1)} h · espaço ${n(r[iCol.espaco])}` : ""; }).join("<br>") }));
      const fmtF = v => sn(v * 100, 0) + "%", porTd = new Map((HP.tipos.todos || []).map(r => [r[0], r])), ESP_MIN = 20;
      const val = d => { const r = porTd.get(d); return r ? r[iCol.frac_fora] : null; };
      const baixo = d => { const r = porTd.get(d); return r != null && (r[iCol.espaco] < ESP_MIN || (r[iCol.frac_dias_piso] ?? 0) >= 0.25); };
      const ptsOk = xs.map(d => [d, baixo(d) ? null : val(d)]);
      const ptsBaixo = xs.map((d, i) => [d, baixo(d) || (i > 0 && baixo(xs[i - 1])) || (i + 1 < xs.length && baixo(xs[i + 1])) ? Math.min(val(d), 0.5) : null]);
      const u = [...xs].reverse().find(d => val(d) != null);
      limpar(foraG);
      G(foraG, 140, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 38, mr: 38, xs, y0: -0.5, y1: 0.2, nt: 4, fmtY: fmtF, rotX: rotXd, rotFim: true,
        series: (D.ref_fora ? [{ nome: "média 12m", cor: "var(--ink-3)", larg: 1.2, tracejado: true, opac: 0.9, pts: xs.map(d => [d, D.ref_fora.todos.valor]) }] : [])
          .concat([{ nome: "DECOMP no piso", cor: "var(--risk-util)", larg: 1.4, tracejado: true, opac: 0.35, pts: ptsBaixo, rotFim: u && baixo(u) ? "no piso" : null },
            { nome: "todos os dias", cor: "var(--risk-util)", larg: 1.8, pts: ptsOk, rotFim: u && !baixo(u) ? fmtF(val(u)) : null }]),
        dica: d => { const r = porTd.get(d); if (!r) return `<b>${dataBr(d)}</b>`;
          const cab = `<b>${dataBr(d)}</b> · ${HP.janela} dias antes · espaço ${n(r[iCol.espaco])}<br>`, nPiso = Math.round((r[iCol.frac_dias_piso] ?? 0) * HP.janela);
          if (baixo(d)) return cab + `${nPiso} de ${HP.janela} dias com DECOMP no piso: ${fmtF(r[iCol.frac_fora])} não é comparável` + (r[iCol.espaco] < ESP_MIN ? `<br>desvio de ${sn(r[iCol.frac_fora] * ESP_MIN, 1)} R$/h sobre o DECOMP` : "");
          return cab + `todos os dias: ${fmtF(r[iCol.frac_fora])}<br>` + TIPOS.map(([t, nome]) => { const x = porT[t].get(d); return x ? `${nome}: ${fmtF(x[iCol.frac_fora])}` : ""; }).join(" · ") + `<br>padrão do simulador (12 meses): ${fmtF(D.ref_fora.todos.valor)}`; } }));
      const rt = D.ref_fora_tipo, cur = { "útil": "útil", "sábado": "sáb.", "domingo/feriado": "dom." };
      foraRef.innerHTML = `<b>Padrão do simulador ${sn(D.ref_fora.todos.valor * 100, 1)}%</b>: média de 12 meses (${rot(D.ref_fora.todos.de)}–${rot(D.ref_fora.todos.ate)}), um número para todos os dias` + (rt ? `<br><small>Por tipo, só para leitura: ` + TIPOS.map(([t, , cor]) => `<span style="color:${cor}">${cur[t]} ${sn(rt[t].valor * 100, 0)}%</span>`).join(" · ") + "</small>" : "");
      legHP.textContent = `Média dos ${HP.janela} dias anteriores a cada data, por tipo de dia; embaixo, cada dia da janela (clique para o perfil horário).`;
    }
    // ---------- RISK-10 · premissas mês a mês, os três tipos de dia (D071) ----------
    const tabHM = mk("div", "rolagem risk-alta risk-alta-b"); p10.corpo.append(tabHM);
    const legHM = mk("p", "leg"); p10.el.append(legHM);
    function desenharHM() {
      const Rm = Object.fromEntries(TIPOS.map(([t]) => [t, Object.fromEntries((D.premissas_mensal[t] || []).map(r => [r.mes, r]))]));
      const xs = Object.keys(Rm["útil"]).sort(), ult = xs[xs.length - 1], parcial = ult === ULT.slice(0, 7), c = cal[SIM.mesI];
      const atual = t => ({ horas_piso: SIM.prem[t].horas_piso, frac_fora: SIM.prem[t].frac_fora, ponta_media: precoEf(t, "ponta", SIM.dec, c.piso) });
      const med12 = (t, k) => (k === "frac_fora" && D.ref_fora ? D.ref_fora[t].valor : k === "ponta_media" ? Math.max(SIM.dec + D.media12[t].premio_ponta, c.piso) : D.media12[t][k]);
      const celF = v => (v == null ? "—" : sn(v * 100, 0) + "%");
      const linha = (rotulo, dec, f, cls) => `<tr class="${cls || ""}"><td>${rotulo}</td><td class="n">${n(dec, 0)}</td>` + TIPOS.map(([t]) => `<td class="n">${n(f(t, "horas_piso"), 1)}</td>`).join("") + TIPOS.map(([t]) => `<td class="n">${celF(f(t, "frac_fora"))}</td>`).join("") + TIPOS.map(([t]) => `<td class="n">${n(f(t, "ponta_media"), 0)}</td>`).join("") + "</tr>";
      tabHM.innerHTML = `<table class="risk-densa risk-hm"><thead><tr><th rowspan="2">Mês</th><th rowspan="2" class="n">DECOMP</th><th colspan="3" class="n">Vale no piso, h</th><th colspan="3" class="n">Outras horas</th><th colspan="3" class="n">Ponta, R$/MWh</th></tr><tr>${"<th class='n'>Útil</th><th class='n'>Sáb.</th><th class='n'>Dom.</th>".repeat(3)}</tr></thead><tbody>` +
        linha("Simulador agora", SIM.dec, (t, k) => atual(t)[k], "destaque") + linha(`Média 12 meses (${rot(D.media12.de)}–${rot(D.media12.ate)})`, SIM.dec, med12, "destaque") +
        xs.slice().reverse().map(mm => linha(`${rot(mm)}${mm === ult && parcial ? " (parcial)" : ""}`, Rm["útil"][mm] && Rm["útil"][mm].decomp, (t, k) => (Rm[t][mm] ? Rm[t][mm][k] : null))).join("") + "</tbody></table>";
      const trs = [...tabHM.querySelectorAll("tbody tr")];
      xs.slice().reverse().forEach((mm, i) => alvoR(trs[i + 2], () => inspPremMes(mm)));
      legHM.textContent = `Média dos dias de cada mês civil, por tipo de dia${parcial ? `; ${rot(ult)} parcial, até ${ddmm(ULT)}` : ""}. No topo, o simulador agora e a média de 12 meses (na ponta, o prêmio de 12 meses sobre o DECOMP de ${n(SIM.dec)}). Clique num mês para RV0 × realizado.`;
    }
    desenharPJ(); desenharTraj(); desenharHP(); atualizar();
  }
  function inspPremMes(mm) {
    const linhas = TIPOS.map(([t, nome]) => [nome, (D.premissas_mensal[t] || []).find(x => x.mes === mm)]).filter(x => x[1]);
    return { t: `Premissas de ${rotLongo(mm)}`, c: el => {
      const u = linhas[0][1];
      pares(el, [["DECOMP médio", rs(u.decomp, 1)], ["Espaço (DECOMP − piso)", rs(u.espaco, 1)], ["RV0 rodada em", dataBr(u.rv0)]]);
      ttl3(el, "Realizado no mês");
      QC.tabela(el, [{ t: "Tipo" }, { t: "Dias", n: 1 }, { t: "Piso h", n: 1 }, { t: "Outras", n: 1 }, { t: "Ponta", n: 1 }, { t: "Prêmio", n: 1 }],
        linhas.map(([nome, x]) => [nome.replace("Domingo/feriado", "Dom./fer."), x.dias, n(x.horas_piso, 1), sn(x.frac_fora * 100, 0) + "%", n(x.ponta_media, 0), sn(x.premio_ponta, 0)]), "risk-densa");
      ttl3(el, "Premissa na RV0 (janela de 14 dias)");
      QC.tabela(el, [{ t: "Tipo" }, { t: "Piso h", n: 1 }, { t: "Outras", n: 1 }, { t: "Ponta", n: 1 }, { t: "Prêmio", n: 1 }],
        linhas.map(([nome, x]) => [nome.replace("Domingo/feriado", "Dom./fer."), n(x.rv0_horas_piso, 1), sn(x.rv0_frac_fora * 100, 0) + "%", n(x.rv0_ponta, 0), sn(x.rv0_premio, 0)]), "risk-densa");
      nota(el, `Maior dia de ponta (útil): ${rs(u.ponta_max_dia, 0)}. Na ponta, a RV0 é o DECOMP realizado do mês mais o prêmio da janela: separa o erro da premissa do erro do DECOMP.`);
    } };
  }

  // =====================================================================================================
  // 3 · PER Perfis
  // =====================================================================================================
  let DESTAQUE = new Set(), DEST_MES = null;
  function telaPER(area) {
    const sub = (EST.pSub = valido(EST.pSub, SUBS_FIS, "SE")), VAR = (EST.pVar = valido(EST.pVar, VARS, "pld"));
    const [, nomeV, un] = VARS.find(v => v[0] === VAR), subV = subDe(sub, VAR), subP = sub === "SIN" ? "SE" : sub;
    const porMes = (((D.perfis_dia || {})[VAR] || {})[subV]) || {}, ms = Object.keys(porMes).sort().reverse();
    EST.pMes = ms.includes(EST.pMes) ? EST.pMes : ms[0];
    const MESP = EST.pMes, M = porMes[MESP], C = D.calor[VAR][subV][MESP];
    if (DEST_MES !== MESP + VAR + sub) { DESTAQUE = new Set([M.dias.length - 1]); DEST_MES = MESP + VAR + sub; }
    const fmtV = v => (v == null ? "—" : un === "MW" ? n(v / 1000, 1) + " GW" : rs(v, 1));
    const fmtY = un === "MW" ? (v => n(v / 1000, v % 1000 ? 1 : 0)) : (v => n(v));
    const unC = un === "MW" ? "GW" : un;

    // decisão: o que o perfil do mês diz para o PLD (sempre PLD do submercado de preço)
    const Cp = D.calor.pld[subP][ultMes], hmes = D.horas.mensal[subP][ultMes] || {}, au = hmes["útil"];
    const valePiso = au ? VALE_H.reduce((a, x) => a + (au[x] && au[x][0] ? au[x][1] / au[x][0] : 0), 0) : null;
    const mmAnt = Object.keys(D.media_mes.pld[subP]).sort().slice(-2)[0], pldM = D.media_mes.pld[subP][ultMes], pldA = D.media_mes.pld[subP][mmAnt];
    const bm = blocoMedias(Cp.hora), Mp = D.perfis_dia.pld[subP][ultMes];
    let mx = { v: -1e9 }; Mp.v.forEach((lin, i) => lin.forEach((v, x) => { if (v != null && v > mx.v) mx = { v, i, x }; }));
    const mec = [...D.mecanismos_se].sort((a, b) => (a.mes < b.mes ? -1 : 1)), mu = mec[mec.length - 1];
    const dec = Mesa.decisao(area, [
      { r: `Vale no piso · dia útil · ${rot(ultMes)} · ${SUBN[subP]}`, v: `${n(valePiso, 1)} de 8 h`, d: `SE acoplado ao N em ${pct(mu.acopl)} dos dias úteis · folga hidráulica ${sn(mu.hid_nec - mu.gh_min, 1)} GW`, principal: true },
      { r: `PLD médio · ${rot(ultMes)} até ${ddmm(ULT)}`, v: n(pldM, 1), d: `${seta(pldM - pldA)} ${sn(pldM - pldA, 1)} contra ${rot(mmAnt)} (${n(pldA, 1)})`, tom: tom(pldM - pldA) },
      { r: "Ponta − vale no perfil do mês", v: sn(bm.ponta - bm.vale, 0), d: `ponta ${n(bm.ponta, 0)} · vale ${n(bm.vale, 0)} · demais ${n(bm.demais, 0)}` },
      { r: "Hora mais cara do mês", v: n(mx.v, 1), d: `${ddmm(Mp.dias[mx.i])} ${diaSem(Mp.dias[mx.i])} às ${mx.x}h · ${Mp.tipos[mx.i]}` },
    ]);
    alvoR(dec.children[0], () => inspMec(mu.mes)); alvoR(dec.children[3], () => inspDia(subP, Mp.dias[mx.i]));
    const g = Mesa.grade(area);
    // filtros do RISK-11 e do RISK-12 (ligados entre si): o mesmo componente da linha de controles do RISK-13
    // (.risk-ctl .risk-ctl13 e .risk-grp), na mesma ordem, para os grupos ficarem alinhados com os de baixo
    const faixa = mk("div", "risk-ctl risk-ctl13 risk-faixa3"); g.append(faixa);
    const grp = (rotulo, conteudo) => { const gr = mk("div", "risk-grp"); gr.append(mk("span", "risk-grp-r", rotulo), conteudo); return gr; };
    const re = () => { guardar(); remontar(area, telaPER); };
    // meses com dado, do mais antigo ao mais recente; com mais de 12, mostra 12 por vez e "◀" / "▶" para andar
    const msA = ms.slice().sort(), JAN12 = 12, iSel = msA.indexOf(MESP);
    let ini = Math.max(0, msA.length - JAN12);
    if (iSel < ini) ini = Math.max(0, iSel - JAN12 + 1);
    const abMes = abas(msA.slice(ini, ini + JAN12).map(m => [m, rot(m)]), MESP, v => { EST.pMes = v; re(); }, "Mês do RISK-11 e RISK-12");
    if (ini > 0) { const b = mk("button", "risk-mes-ant", "◀"); b.type = "button"; b.title = "Meses anteriores"; b.addEventListener("click", ev => { ev.stopPropagation(); EST.pMes = msA[Math.max(0, ini - 1)]; re(); }); abMes.prepend(b); }
    faixa.append(grp("Variável", abas(VARS.map(x => [x[0], VCURTO[x[0]]]), VAR, v => { EST.pVar = v; re(); }, "Variável do RISK-11 e RISK-12")),
      grp("Submercado", abas(SUBS_FIS, sub, v => { EST.pSub = v; re(); }, "Submercado do RISK-11 e RISK-12")),
      grp("Meses", abMes));
    if (sub === "SIN" && ehPreco(VAR)) faixa.append(mk("span", "risk-barra-t risk-aviso", "PLD e DECOMP não têm SIN: mostrando o SE/CO."));
    faixa.append(mk("span", "risk-faixa-vale", "vale para RISK-11 e RISK-12"));

    // RISK-11 · perfil horário do mês, dia a dia
    const p11 = Mesa.painel(g, { cod: "RISK-11", titulo: `Perfil horário dia a dia · ${nomeV} · ${rotSub(sub, VAR)} · ${rot(MESP)}`, unidade: unC, tam: "l", ajuda: "perfis",
      leg: `Uma linha por dia, na cor do tipo de dia; tracejado = média dos ${M.dias.length} dias. Faixas: vale 8h–15h e ponta 18h–21h. Clique num dia (botões) para destacar e ver o detalhe.${MESP === ultMes ? ` Mês corrente até ${dataBr(ULT)}.` : ""} Últimos 6 meses.` });
    const p12 = Mesa.painel(g, { cod: "RISK-12", titulo: `Mapa de calor · ${nomeV} · ${rotSub(sub, VAR)} · ${rot(MESP)}`, unidade: unC, tam: "l", ajuda: "perfis" });
    const legC = mk("p", "leg"); p12.el.append(legC);
    const corT = t => corTipo(t);
    function desenharPerfilDia() {
      limpar(p11.corpo);
      const temD = DESTAQUE.size > 0, media_ = C.hora;
      const series = M.dias.map((d, i) => ({ nome: d, cor: corT(M.tipos[i]), larg: DESTAQUE.has(i) ? 2.6 : 1.1, opac: temD ? (DESTAQUE.has(i) ? 1 : 0.15) : 0.55, pts: HORAS.map(x => [x, M.v[i][x]]), rotFim: DESTAQUE.has(i) ? d.slice(8, 10) : null }));
      series.push({ nome: "Média", cor: "var(--ink)", larg: 2.4, tracejado: true, pts: HORAS.map(x => [x, media_[x]]), rotFim: "média" });
      G(p11.corpo, 270, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 44, mr: 44, xs: HORAS, series, sombras: SOMBRAS, fmtY, y0: ehPreco(VAR) ? 0 : null, nt: 5, justo: true, rotFim: true,
        rotX: x => (x % 3 === 0 ? x + "h" : null),
        dica: x => { const vs = M.v.map((r, i) => [r[x], i]).filter(([v]) => v != null); if (!vs.length) return `<b>${x}h</b>`;
          const a = vs.reduce((p, q) => (q[0] > p[0] ? q : p)), b = vs.reduce((p, q) => (q[0] < p[0] ? q : p));
          return `<b>${rot(MESP)} · ${x}h</b><br>média ${fmtV(media_[x])}<br>maior: ${fmtV(a[0])} (dia ${M.dias[a[1]].slice(8, 10)}) · menor: ${fmtV(b[0])} (dia ${M.dias[b[1]].slice(8, 10)})` +
            [...DESTAQUE].map(i => `<br>dia ${M.dias[i].slice(8, 10)} ${diaSem(M.dias[i])}: ${fmtV(M.v[i][x])}`).join(""); } }));
      const leg = mk("div", "risk-dias"); leg.setAttribute("role", "group"); leg.setAttribute("aria-label", "Dias do mês");
      leg.innerHTML = M.dias.map((d, i) => `<button type="button" data-i="${i}" style="--c:${corT(M.tipos[i])}" aria-pressed="${DESTAQUE.has(i)}" title="${dataBr(d)} ${diaSem(d)} · ${M.tipos[i] || ""}">${d.slice(8, 10)}</button>`).join("") + (temD ? '<button type="button" class="media" data-i="-1">limpar</button>' : "");
      p11.corpo.append(leg);
      leg.querySelectorAll("button[data-i]").forEach(b => { const i = +b.dataset.i;
        if (i < 0) b.addEventListener("click", () => { DESTAQUE.clear(); desenharPerfilDia(); desenharCalor(); });
        else alvoR(b, () => { if (DESTAQUE.has(i)) DESTAQUE.delete(i); else DESTAQUE.add(i); requestAnimationFrame(() => { desenharPerfilDia(); desenharCalor(); }); return inspDiaVar(i); }); });
      legenda(p11.corpo, TIPOS.map(([, nome, cor]) => [cor, nome, "l"]).concat([["var(--ink)", "Média do mês", "t"]]));
    }
    // detalhe de um dia para a variável escolhida
    function inspDiaVar(i) {
      const d = M.dias[i], v = M.v[i];
      return { t: `${dataBr(d)} ${diaSem(d)} · ${nomeV} · ${rotSub(sub, VAR)}`, c: el => {
        const b = blocoMedias(v), vv = v.filter(x => x != null), mxv = Math.max(...vv), mnv = Math.min(...vv);
        pares(el, [["Tipo de dia", M.tipos[i] || "—"], ["Média do dia", fmtV(C.dia[i])], ["Vale 8h–15h", fmtV(b.vale)], ["Ponta 18h–21h", fmtV(b.ponta)], ["Demais horas", fmtV(b.demais)],
          ["Maior hora", `${v.indexOf(mxv)}h · ${fmtV(mxv)}`], ["Menor hora", `${v.indexOf(mnv)}h · ${fmtV(mnv)}`], ["Média do mês", fmtV(C.mes)]]);
        ttl3(el, `${nomeV} hora a hora, ${unC}`);
        G(el, 170, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 36, mr: 6, xs: HORAS, sombras: SOMBRAS, y0: ehPreco(VAR) ? 0 : null, nt: 4, fmtY, rotX: x => (x % 6 === 0 ? x + "h" : null),
          series: [{ nome: "Média do mês", cor: "var(--ink-2)", larg: 1.2, tracejado: true, pts: HORAS.map(x => [x, C.hora[x]]) }, { nome: "Dia", cor: corT(M.tipos[i]), pts: HORAS.map(x => [x, v[x]]), pontos: true }],
          dica: x => `<b>${ddmm(d)} · ${x}h</b><br>${nomeV}: ${fmtV(v[x])}<br>média do mês: ${fmtV(C.hora[x])}` }));
        legenda(el, [[corT(M.tipos[i]), "Dia", "l"], ["var(--ink-2)", "Média do mês", "t"]]);
        if (ehPreco(VAR)) { const bt = mk("button", "risk-btn", "PLD × DECOMP deste dia ›"); bt.type = "button"; bt.addEventListener("click", () => { const r = inspDia(subV, d); Mesa.inspecionar(r.t, r.c); }); el.append(bt); }
      } };
    }
    // mapa de calor: linhas = dias, colunas = horas; escala de um só tom cortada nos percentis 5 e 95 do mês
    function desenharCalor() {
      limpar(p12.corpo);
      const box = mk("div", "rolagem"), dentro = mk("div", "risk-calor"); box.append(dentro); p12.corpo.append(box);
      // linhas com altura pela caixa: depois de desenhar, a caixa cresce até o RISK-12 ter a altura do RISK-11 ao lado
      const ND = M.dias.length, m = { l: 54, r: 4, t: 22, b: 4 }, hT = m.t + (ND + 1) * 12 + 8 + m.b;
      const lo = C.lo, hi = C.hi, tt = v => Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1)));
      const cor = v => `color-mix(in srgb, var(--calor) ${Math.round(8 + 80 * tt(v))}%, var(--calor-0))`;
      const caixa = G(dentro, hT, (svg, w, hh) => {
        const ch = Math.max(12, Math.min(26, (hh - m.t - 8 - m.b) / (ND + 1))), fs = Math.max(8, Math.min(11, ch * 0.55)).toFixed(1);
        const vao = 8, cwM = 40, cw = (w - m.l - m.r - vao - cwM) / 24, xM = w - m.r - cwM, txt = v => (un === "MW" ? n(v / 1000, cw < 26 ? 0 : 1) : n(v, 0));
        HORAS.forEach(x => { const vale = VALE_H.includes(x), ponta = PONTA_H.includes(x);
          S(svg, "text", { x: m.l + (x + 0.5) * cw, y: m.t - 8, "text-anchor": "middle", class: vale || ponta ? "forte" : null, style: ponta ? "fill:var(--risk-ponta)" : vale ? "fill:var(--risk-vale)" : null }, x % 2 === 0 || cw > 26 ? x + "h" : ""); });
        S(svg, "text", { x: xM + cwM / 2, y: m.t - 8, "text-anchor": "middle", class: "forte" }, "média");
        S(svg, "line", { x1: xM - vao / 2, x2: xM - vao / 2, y1: m.t - 4, y2: hh - m.b, stroke: "var(--ink-3)" });
        const celula = (x0, yy, larg, v, dica) => {
          const r = S(svg, "rect", { x: x0 + 0.5, y: yy + 0.5, width: larg - 1, height: ch - 1, fill: cor(v) });
          S(svg, "text", { x: x0 + larg / 2, y: yy + ch / 2 + fs * 0.36, "text-anchor": "middle", style: `font-size:${fs}px;pointer-events:none;fill:${tt(v) > 0.6 ? "var(--surface)" : "var(--ink)"}` }, txt(v));
          dicaEm(r, dica);
        };
        M.dias.forEach((d, i) => {
          const yy = m.t + i * ch;
          const lab = S(svg, "text", { x: m.l - 5, y: yy + ch * 0.75, "text-anchor": "end", class: DESTAQUE.has(i) ? "forte" : null, style: `fill:${corT(M.tipos[i])}` }, `${d.slice(8, 10)} ${diaSem(d)}`);
          M.v[i].forEach((v, x) => { if (v != null) celula(m.l + x * cw, yy, cw, v, `<b>${dataBr(d)} ${diaSem(d)} · ${x}h</b> · ${M.tipos[i] || ""}<br>${nomeV}: ${fmtV(v)}`); });
          celula(xM, yy, cwM, C.dia[i], `<b>${dataBr(d)} ${diaSem(d)} · média do dia</b><br>${nomeV}: ${fmtV(C.dia[i])}` + (C.nh[i] < 24 ? ` (${C.nh[i]} horas)` : ""));
          const a = S(svg, "rect", { x: 0, y: yy, width: m.l, height: ch, fill: "transparent", class: "risk-alvo" });
          dicaEm(a, `<b>${dataBr(d)} ${diaSem(d)}</b> · clique para o detalhe`); alvoR(a, () => inspDiaVar(i)); void lab;
        });
        const ym = m.t + ND * ch + 8, nTot = C.nh.reduce((a, b) => a + b, 0);
        S(svg, "line", { x1: m.l, x2: w - m.r, y1: ym - 4, y2: ym - 4, stroke: "var(--ink-3)" });
        S(svg, "text", { x: m.l - 5, y: ym + ch * 0.75, "text-anchor": "end", class: "forte" }, "média");
        C.hora.forEach((v, x) => { if (v != null) celula(m.l + x * cw, ym, cw, v, `<b>Média do mês · ${x}h</b><br>${nomeV}: ${fmtV(v)}`); });
        celula(xM, ym, cwM, C.mes, `<b>Média do mês</b> · todas as horas<br>${nomeV}: ${fmtV(C.mes)} (${nTot} horas)`);
        [...DESTAQUE].forEach(i => { if (i < ND) S(svg, "rect", { x: m.l, y: m.t + i * ch, width: w - m.l - m.r, height: ch, fill: "none", stroke: "var(--ink)", "stroke-width": 1.4, "pointer-events": "none" }); });
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!caixa.isConnected || p11.el.offsetTop !== p12.el.offsetTop) return;
        const livre = p12.corpo.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;  // o corpo estica (flex: 1): a sobra fica embaixo da caixa
        if (Math.abs(livre) > 2) caixa.style.height = Math.max(hT, caixa.offsetHeight + livre) + "px";
      }));
      legC.textContent = `Cor de um só tom, do mais fraco (≤ ${un === "MW" ? n(lo / 1000, 1) : n(lo, 0)}) ao forte (≥ ${un === "MW" ? n(hi / 1000, 1) : n(hi, 0)}): percentis 5 a 95 do mês, para um pico isolado não apagar o resto. Dia na cor do tipo de dia; o dia destacado aparece contornado. Cabeçalho: vale em azul, ponta em vermelho. À direita, a média do dia; embaixo, a média de cada hora. Clique no dia para o detalhe.`;
    }
    desenharPerfilDia(); desenharCalor();

    // RISK-13 · perfil horário por mês do ano, todos os anos
    // RISK-13 tem os seus próprios filtros (variável, submercado, modo e anos), independentes da barra da tela;
    // guardados em mesa.risk.telas (aVar, aSub, visao, aOcultos). Submercado sem a variável (PLD no SIN): regra D084, mostra o SE/CO.
    EST.aVar = valido(EST.aVar, VARS, "pld"); EST.aSub = valido(EST.aSub, SUBS_FIS, "SE");
    const VIS = [["hora", "Por hora do dia"], ["mes", "Média do mês por ano"]];
    EST.visao = valido(EST.visao, VIS, "hora");
    EST.aOcultos = Array.isArray(EST.aOcultos) ? EST.aOcultos.filter(a => anos.includes(a)) : [];
    if (EST.aOcultos.length >= anos.length) EST.aOcultos = [];
    const p13 = Mesa.painel(g, { cod: "RISK-13", titulo: "Perfil por mês do ano", tam: "full", ajuda: "perfil-ano", classe: "risk-p13" });
    const ctl13 = mk("div", "risk-ctl risk-ctl13"), anosBox = mk("div", "abas risk-anos"); anosBox.setAttribute("role", "group"); anosBox.setAttribute("aria-label", "Anos visíveis");
    const redesenhar = () => { guardar(); desenharPerfil(); };
    // cada grupo de filtros com um rótulo pequeno em cima, para separar onde começa um e termina o outro
    const grupo = (rotulo, conteudo) => { const gr = mk("div", "risk-grp"); gr.append(mk("span", "risk-grp-r", rotulo), conteudo); return gr; };
    ctl13.append(grupo("Variável", abas(VARS.map(v => [v[0], VCURTO[v[0]]]), EST.aVar, v => { EST.aVar = v; redesenhar(); }, "Variável deste painel")),
      grupo("Submercado", abas(SUBS_FIS, EST.aSub, v => { EST.aSub = v; redesenhar(); }, "Submercado deste painel")),
      grupo("Modo", abas([["hora", "Por hora"], ["mes", "Média do mês"]], EST.visao, v => { EST.visao = v; redesenhar(); }, "Modo: perfil por hora do dia ou média do mês por ano")),
      grupo("Anos", anosBox));
    p13.cab.after(ctl13);
    anosBox.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.v === "todos") EST.aOcultos = [];
      else { const a = +b.dataset.v, k = EST.aOcultos.indexOf(a); if (k >= 0) EST.aOcultos.splice(k, 1); else if (EST.aOcultos.length < anos.length - 1) EST.aOcultos.push(a); }
      redesenhar(); });
    const legP = mk("p", "leg"); p13.el.append(legP);
    const varA = () => { const AV = EST.aVar, sb = EST.aSub, [, nomeA, unA] = VARS.find(v => v[0] === AV);
      return { AV, sb, nomeA, unA, unCA: unA === "MW" ? "GW" : unA, subA: subDe(sb, AV), anosV: anos.filter(a => !EST.aOcultos.includes(a)),
        fmtYA: unA === "MW" ? (v => n(v / 1000, v % 1000 ? 1 : 0)) : (v => n(v)), fmtVA: v => (v == null ? "—" : unA === "MW" ? n(v / 1000, 1) + " GW" : rs(v, 1)) }; };
    const chave = (a, mm) => `${a}-${String(mm).padStart(2, "0")}`;
    function desenharPerfil() {
      const { AV, sb, nomeA, unCA, subA, anosV, fmtYA, fmtVA } = varA();
      p13.cab.querySelector(".ttl").innerHTML = `<span class="p-cod">RISK-13</span>Perfil por mês do ano · ${nomeA}<span class="p-uni">${unCA}</span>`;
      anosBox.innerHTML = anos.map(a => `<button type="button" data-v="${a}" style="--c:${corAno(a)}" aria-pressed="${anosV.includes(a)}" title="Mostrar ou esconder ${a}">${a}</button>`).join("") + `<button type="button" data-v="todos" aria-pressed="${anosV.length === anos.length}">todos</button>`;
      limpar(p13.corpo);
      if (subA !== sb) nota(p13.corpo, `${nomeA} não tem SIN: mostrando o SE/CO.`).classList.add("risk-aviso");
      const dd = D.perfis[AV][subA] || {}, mmV = D.media_mes[AV][subA] || {};
      const vis = Object.entries(dd).filter(([k]) => anosV.includes(+k.slice(0, 4))).flatMap(([, v]) => v).filter(v => v != null);
      const y0 = ehPreco(AV) ? 0 : Math.min(...vis), y1 = Math.max(...vis);
      const msV = Object.entries(mmV).filter(([k, v]) => v != null && anosV.includes(+k.slice(0, 4))).map(([, v]) => v), z0 = ehPreco(AV) ? 0 : Math.min(...msV) * 0.9, z1 = Math.max(...msV);
      legenda(p13.corpo, [["var(--risk-sombra-vale)", "Vale 8h–15h"], ["var(--risk-sombra-ponta)", "Ponta 18h–21h"]]);
      const cont = mk("div", "risk-mult-c"), box = mk("div", "risk-mult"); cont.append(box); p13.corpo.append(cont);
      for (let mm = 1; mm <= 12; mm++) {
        const card = mk("div", "mini"); card.innerHTML = `<div class="ttl">${MESL[mm - 1]}<span>${SUBN[subA]}</span></div>`; const gb = mk("div"); card.append(gb); box.append(card);
        alvoR(card, () => inspMesAno(mm));
        if (EST.visao === "mes") G(gb, 160, (svg, w, hh) => {
          const m = { l: 40, r: 6, t: 14, b: 20 }, ax = eixo(z0, z1, 4, true), y = v => m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
          ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 5, y: y(t) + 3, "text-anchor": "end" }, fmtYA(t)); });
          const bw = (w - m.l - m.r) / anosV.length, base = y(Math.max(ax.a, Math.min(0, ax.b)));
          anosV.forEach((a, i) => { const k = chave(a, mm), v = mmV[k], xc = m.l + (i + 0.5) * bw;
            S(svg, "text", { x: xc, y: hh - 6, "text-anchor": "middle" }, String(a).slice(2)); if (v == null) return;
            const parcial = k === ultMes, r = S(svg, "rect", { x: xc - bw * 0.32, y: Math.min(y(v), base), width: bw * 0.64, height: Math.max(1, Math.abs(y(v) - base)), fill: corAno(a), opacity: parcial ? 0.5 : 0.9, stroke: parcial ? corAno(a) : null, "stroke-dasharray": parcial ? "3 2" : null });
            dicaEm(r, `<b>${MESL[mm - 1]} de ${a}</b>${parcial ? " (parcial)" : ""}<br>${nomeA}, média do mês: ${fmtVA(v)}`); });
        }, `${MESL[mm - 1]}: ${nomeA}, média do mês por ano`);
        else { const ss = anosV.map(a => { const v = dd[chave(a, mm)]; return v ? { nome: String(a), cor: corAno(a), pts: HORAS.map(x => [x, v[x]]), larg: 1.6 } : null; }).filter(Boolean);
          G(gb, 160, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 40, mr: 6, mt: 8, xs: HORAS, series: ss, sombras: SOMBRAS, fmtY: fmtYA, y0, y1, nt: 4, justo: true, rotX: x => (x % 6 === 0 ? x + "h" : null),
            dica: x => `<b>${MESL[mm - 1]} · ${x}h</b> · ${nomeA}<br>` + [...ss].reverse().map(s => `${s.nome}: ${fmtVA(s.pts[x][1])}`).join("<br>") }), `${MESL[mm - 1]}: ${nomeA} por hora, um traço por ano`); }
      }
      const avisos = [`${rot(ultMes)} parcial: dados até ${dataBr(ULT)}.`];
      if (["demanda", "renov_com_mmgd"].includes(AV)) avisos.push("Quebra em 29/04/2023: antes, a MMGD vinha descontada da demanda e não aparecia na renovável; compare só de 2024 em diante.");
      if (AV === "renov_saida") avisos.push("Renovável gerada é saída do DESSEM, já com cortes; a prevista é entrada do modelo.");
      legP.textContent = `${nomeA}, ${unCA}, ${SUBN[subA]}; anos ${anosV.length === anos.length ? "todos" : anosV.join(", ")}. ` + (EST.visao === "mes" ? "Uma barra por ano com a média de todas as horas do mês; clara e tracejada = mês parcial. " : "Uma linha por ano (média dos dias do mês por hora). ") +
        "Escala comum aos 12 meses, recalculada com os anos visíveis (clique num ano para mostrar ou esconder). Filtros próprios deste painel, independentes da barra da tela. " + avisos.join(" ") + " Clique num mês para comparar os anos.";
    }
    function inspMesAno(mm) {
      const { AV, sb, nomeA, unA, unCA, subA, anosV, fmtYA, fmtVA } = varA();
      const dd = D.perfis[AV][subA] || {}, ss = anosV.map(a => [a, dd[chave(a, mm)], (D.media_mes[AV][subA] || {})[chave(a, mm)]]).filter(x => x[1]);
      return { t: `${MESL[mm - 1]} · ${nomeA} · ${rotSub(sb, AV)}`, c: el => {
        G(el, 190, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 36, mr: 6, xs: HORAS, sombras: SOMBRAS, fmtY: fmtYA, y0: ehPreco(AV) ? 0 : null, nt: 4, rotX: x => (x % 6 === 0 ? x + "h" : null),
          series: ss.map(([a, v]) => ({ nome: String(a), cor: corAno(a), larg: 1.6, pts: HORAS.map(x => [x, v[x]]) })), dica: x => `<b>${MESL[mm - 1]} · ${x}h</b><br>` + ss.slice().reverse().map(([a, v]) => `${a}: ${fmtVA(v[x])}`).join("<br>") }));
        legenda(el, ss.map(([a]) => [corAno(a), String(a), "l"]));
        const fN = v => (v == null ? "—" : unA === "MW" ? n(v / 1000, 1) : n(v, 1));
        QC.tabela(el, [{ t: "Ano" }, { t: "Média", n: 1 }, { t: "Vale", n: 1 }, { t: "Ponta", n: 1 }], ss.slice().reverse().map(([a, v, md]) => { const b = blocoMedias(v); return [`${a}${chave(a, mm) === ultMes ? " *" : ""}`, fN(md), fN(b.vale), fN(b.ponta)]; }), "risk-densa");
        nota(el, `${unCA}. * mês parcial. Vale 8h–15h, ponta 18h–21h. Só os anos visíveis no painel.`);
      } };
    }
    desenharPerfil();

    // RISK-14 · horas no piso por hora e tipo de dia
    const p14 = Mesa.painel(g, { cod: "RISK-14", titulo: "Horas no piso por hora e tipo", unidade: `% · ${SUBN[subP]}`, tam: "l", ajuda: "horas-piso" });
    const MED = [["piso", "No piso"], ["abaixo", "Abaixo"], ["acima", "Acima"]];
    EST.medida = valido(EST.medida, MED, "piso");
    const Hm = D.horas.mensal[subP] || {}, msH = Object.keys(Hm).sort().slice(-13).reverse();
    EST.mesH = msH.includes(EST.mesH) ? EST.mesH : msH[0];
    const ctl14 = mk("div", "risk-ctl"); ctl14.append(abas(MED, EST.medida, v => { EST.medida = v; guardar(); desenharHora(); }, "Medida"), selecao(msH.map(m => [m, rot(m)]), EST.mesH, v => { EST.mesH = v; guardar(); desenharHora(); }, "Mês"));
    p14.corpo.before(ctl14);
    nota(p14.el, `% das horas de cada hora do dia em que o PLD ficou no piso (ou abaixo, ou acima, do DECOMP vigente), por tipo de dia; embaixo, por semana operativa (revisão do DECOMP), só os dias de cada semana que caem no mês.${sub === "SIN" ? " SIN: mostrando o SE/CO." : ""}`);
    const serieHora = (a, idx) => HORAS.map(x => [x, a && a[x] && a[x][0] ? 100 * a[x][idx] / a[x][0] : null]);
    function desenharHora() {
      limpar(p14.corpo);
      const idx = { piso: 1, abaixo: 2, acima: 3 }[EST.medida], MESH = EST.mesH;
      legenda(p14.corpo, TIPOS.map(([, nome, cor]) => [cor, nome, "l"]));
      const ss = TIPOS.map(([t, nome, cor]) => ({ nome, cor, pts: serieHora(Hm[MESH] && Hm[MESH][t], idx), pontos: true }));
      G(p14.corpo, 150, (svg, w, hh) => linhasA(svg, { w, h: hh, xs: HORAS, series: ss, sombras: SOMBRAS, y0: 0, y1: 100, nt: 4, fmtY: v => v + "%", rotX: x => (x % 2 === 0 ? x + "h" : null),
        dica: x => `<b>${x}h · ${rot(MESH)}</b><br>` + TIPOS.map(([t, nome]) => { const a = Hm[MESH] && Hm[MESH][t] && Hm[MESH][t][x]; return `${nome}: ${a && a[0] ? n(100 * a[idx] / a[0]) + "% de " + a[0] + " h" : "—"}`; }).join("<br>") }));
      const Ws = (D.horas.semanal[subP] || {})[MESH] || {}, sems = Object.keys(Ws).sort();
      mt(p14.corpo, `${rotLongo(MESH)} por revisão do DECOMP`, `${sems.length} semanas`);
      const box = mk("div", "risk-sem"); p14.corpo.append(box);
      if (!sems.length) nota(box, "Sem revisões disponíveis para este mês.");
      sems.forEach(sm => { const Wk = Ws[sm], card = mk("div", "mini"); card.innerHTML = `<div class="ttl">RV${Wk.rv} · ${ddmm(sm)}<span>${Wk.dias} ${Wk.dias === 1 ? "dia" : "dias"}</span></div>`; const gb = mk("div"); card.append(gb); box.append(card);
        alvoR(card, () => inspRev(subP, sm));
        G(gb, 80, (svg, w, hh) => linhasA(svg, { w, h: hh, ml: 32, mr: 4, mt: 6, xs: HORAS, series: TIPOS.map(([t, nome, cor]) => ({ nome, cor, pts: serieHora(Wk[t], idx), larg: 1.6 })), sombras: SOMBRAS, y0: 0, y1: 100, nt: 2, fmtY: v => v + "%", rotX: x => (x % 6 === 0 ? x + "h" : null),
          dica: x => `<b>RV${Wk.rv} · semana de ${dataBr(sm)} · ${x}h</b><br>` + TIPOS.map(([t, nome]) => { const a = Wk[t] && Wk[t][x]; return `${nome}: ${a && a[0] ? n(100 * a[idx] / a[0]) + "% de " + a[0] + " h" : "—"}`; }).join("<br>") })); });
    }
    desenharHora();

    // RISK-15 · mecanismos do vale (SE/CO)
    const p15 = Mesa.painel(g, { cod: "RISK-15", titulo: "Mecanismos do vale · SE/CO", unidade: "GW e %", tam: "l", ajuda: "mecanismos",
      leg: "Por que o vale vai ao piso: quando a hidráulica necessária encosta na mínima, ou quando o SE se acopla ao Norte na cheia de Belo Monte (mar/2026). Valor da água a partir de abr/2025. Clique num mês para os números." });
    const MC = mec.filter(r => r.mes >= "2024-07"), mxs = MC.map(r => r.mes);
    const rotM = (mm, i) => (mm.endsWith("-01") || i === 0 ? { t: rot(mm), forte: true } : +mm.slice(5, 7) % 3 === 1 ? MES[+mm.slice(5, 7) - 1] : null);
    mt(p15.corpo, "Folga hidráulica no vale do dia útil (SIN)", "GW médios, 8h–15h");
    legenda(p15.corpo, [["var(--accent)", "Hidráulica necessária", "l"], ["var(--risk-verm)", "Mínima revelada", "l"], ["color-mix(in srgb, var(--ink-3) 45%, transparent)", "Renovável cortada"]]);
    G(p15.corpo, 135, (svg, w, hh) => linhasA(svg, { w, h: hh, xs: mxs, y0: 0, nt: 4, rotX: rotM, centro: true,
      barras: MC.filter(r => r.corte != null).map(r => ({ x: r.mes, v: r.corte, lw: 8, cor: "color-mix(in srgb, var(--ink-3) 45%, transparent)" })),
      series: [{ nome: "Necessária", cor: "var(--accent)", pts: MC.map(r => [r.mes, r.hid_nec]), pontos: true }, { nome: "Mínima revelada", cor: "var(--risk-verm)", pts: MC.map(r => [r.mes, r.gh_min]), pontos: true }],
      dica: mm => { const r = MC.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b><br>necessária ${n(r.hid_nec, 1)} GW · mínima revelada ${n(r.gh_min, 1)} GW<br>folga ${r.hid_nec != null && r.gh_min != null ? sn(r.hid_nec - r.gh_min, 1) + " GW" : "—"} · renovável cortada ${n(r.corte, 1)} GW<br>dia útil: ${n(r.piso_util, 1)} h do vale no piso`; },
      alvo: mm => inspMec(mm) }));
    const vmax = Math.max(400, ...MC.map(r => r.bm_vagua || 0));
    mt(p15.corpo, "Acoplamento SE–Norte e Belo Monte", `valor da água: 100% = R$ ${n(vmax)}`);
    legenda(p15.corpo, [["color-mix(in srgb, var(--accent) 30%, transparent)", "% dos dias úteis com SE acoplado ao N"], ["var(--risk-verm)", "Valor da água de Belo Monte", "l"]]);
    G(p15.corpo, 135, (svg, w, hh) => linhasA(svg, { w, h: hh, xs: mxs, y0: 0, y1: 100, nt: 4, fmtY: v => v + "%", rotX: rotM, centro: true,
      barras: MC.filter(r => r.acopl != null).map(r => ({ x: r.mes, v: 100 * r.acopl, lw: 8, cor: "color-mix(in srgb, var(--accent) 30%, transparent)" })),
      series: [{ nome: "Valor da água BM", cor: "var(--risk-verm)", pts: MC.map(r => [r.mes, r.bm_vagua == null ? null : 100 * Math.max(0, r.bm_vagua) / vmax]), pontos: true }],
      dica: mm => { const r = MC.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b><br>SE acoplado ao N em ${pct(r.acopl)} dos dias úteis (vale)<br>Belo Monte: valor da água ${r.bm_vagua == null ? "—" : rs(r.bm_vagua, 1)} · geração ${n(r.bm_ger, 1)} GW<br>vertimento em Pimental ${r.pim_ver == null ? "—" : n(r.pim_ver) + " m³/s"}`; },
      alvo: mm => inspMec(mm) }));
  }
  function inspMec(mm) {
    const r = D.mecanismos_se.find(x => x.mes === mm);
    return { t: `Mecanismos do vale · ${rotLongo(mm)}`, c: el => {
      if (!r) { nota(el, "Sem dados."); return; }
      pares(el, [["Vale no piso (dia útil)", `${n(r.piso_util, 1)} de 8 h`], ["Hidráulica necessária", `${n(r.hid_nec, 1)} GW`], ["Mínima revelada", `${n(r.gh_min, 1)} GW`],
        ["Folga", r.hid_nec != null && r.gh_min != null ? `${sn(r.hid_nec - r.gh_min, 1)} GW` : "—"], ["Renovável cortada", `${n(r.corte, 1)} GW`], ["SE acoplado ao N", pct(r.acopl)],
        ["Valor da água BM", r.bm_vagua == null ? "—" : rs(r.bm_vagua, 1)], ["Geração BM", `${n(r.bm_ger, 1)} GW`], ["Vertimento Pimental", r.pim_ver == null ? "—" : `${n(r.pim_ver)} m³/s`]]);
      nota(el, "GW médios no vale (8h–15h) dos dias úteis. Necessária = demanda − renovável prevista − térmica mínima; mínima revelada = hidráulica do DESSEM nos dias com o vale todo no piso.");
    } };
  }

  // =====================================================================================================
  // 4 · IND Indicadores e contribuição
  // =====================================================================================================
  const PERIODOS_IND = [["ano", "Ano"], ["Q1", "Q1"], ["Q2", "Q2"], ["Q3", "Q3"], ["Q4", "Q4"]];
  const NOME_PER = { ano: "ano inteiro", Q1: "jan–mar", Q2: "abr–jun", Q3: "jul–set", Q4: "out–dez" };
  function telaIND(area) {
    const iSub = (EST.iSub = valido(EST.iSub, SUBS_FIS, "SIN")), cSub = (EST.cSub = valido(EST.cSub, SUBS_PRECO, "SE"));
    const PER_C = [["corrente", rot(ultMes)], ["ultimo", "Último mês"], ["3m", "3 meses"], ["12m", "12 meses"], ...Object.keys(D.contribuicao.SE).filter(k => k.startsWith("a")).map(k => [k, k.slice(1)])];
    EST.perC = valido(EST.perC, PER_C, "3m"); EST.iPer = valido(EST.iPer, PERIODOS_IND, "ano"); EST.pmT = valido(EST.pmT, TIPOS, "útil");
    const IA = D.indicadores.SIN.ano, ia = IA[IA.length - 1], ib = IA[IA.length - 2], IS = D.indicadores.SE.ano, isA = IS[IS.length - 1], isB = IS[IS.length - 2];
    const Cc = D.contribuicao[cSub][EST.perC], top = [...Cc.linhas].sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib)).slice(0, 2);
    const pmU = D.ponta_mensal["útil"], pu = pmU[pmU.length - 1];
    const dec = Mesa.decisao(area, [
      { r: `PLD ponta − vale · ${isA.ano} (acumulado) · SE/CO`, v: rs(isA.pld_ponta - isA.pld_vale, 0), d: `${seta((isA.pld_ponta - isA.pld_vale) - (isB.pld_ponta - isB.pld_vale))} ${isB.ano}: ${rs(isB.pld_ponta - isB.pld_vale, 0)} · ponta ${n(isA.pld_ponta, 0)} · vale ${n(isA.pld_vale, 0)}`, principal: true },
      { r: `Rampa 12h→19h · SIN · ${ia.ano}`, v: `${sn(ia.rampa / 1000, 1)} GW`, d: `${seta(ia.rampa - ib.rampa)} ${sn((ia.rampa - ib.rampa) / 1000, 1)} GW contra ${ib.ano}`, tom: tom(ia.rampa - ib.rampa) },
      { r: `Contribuição ao desvio · ${PER_C.find(p => p[0] === EST.perC)[1]} · ${SUBN[cSub]}`, v: sn(Cc.total, 1), d: top.map(r => `${r.tipo} ${r.faixa.split(" ")[0].toLowerCase()} ${sn(r.contrib, 1)}`).join(" · "), tom: tom(Cc.total) },
      { r: `Ponta do dia útil · ${rot(pu.mes)}`, v: rs(pu.ponta, 0), d: `prêmio ${sn(pu.premio, 0)} · ${pu.dias_premio_100} de ${pu.dias} dias com prêmio ≥ 100` },
    ]);
    alvoR(dec.children[0], () => inspAno("SE", isA.ano)); alvoR(dec.children[1], () => inspAno("SIN", ia.ano)); alvoR(dec.children[3], () => inspPonta("útil", pu.mes));
    const g = Mesa.grade(area);

    // RISK-16 · indicadores por ano
    const p16 = Mesa.painel(g, { cod: "RISK-16", titulo: "Indicadores por ano", unidade: `GW médios e R$/MWh · ${SUBN[iSub]}${iSub === "SIN" ? " (PLD do SE/CO)" : ""} · ${NOME_PER[EST.iPer]}`, tam: "full", ajuda: "indicadores",
      leg: "GW médios e PLD médio no período (ano inteiro ou trimestre). Vale 8h–15h, ponta 18h–21h; rampa = carga líquida às 19h − às 12h. O ano corrente é acumulado até o último deck. Demanda e renovável com MMGD não se comparam antes de 29/04/2023. Clique num ano para os trimestres." });
    abasEm(p16, PERIODOS_IND, EST.iPer, v => { EST.iPer = v; guardar(); remontar(area, telaIND); }, "Período");
    selEm(p16, SUBS_FIS, iSub, v => { EST.iSub = v; guardar(); remontar(area, telaIND); }, "Submercado dos indicadores");
    const Gw = v => (v == null ? "—" : n(v / 1000, 1)), Pp = v => (v == null ? "—" : n(v, 1));
    const linI = D.indicadores[iSub][EST.iPer], ultAno = anos[anos.length - 1];
    const tb = mk("div", "rolagem"); p16.corpo.append(tb);
    tb.innerHTML = `<table class="risk-densa risk-ind"><thead><tr><th>Ano</th><th class="n">Meses</th><th class="n">Carga líq. vale<small>GW</small></th><th class="n">Carga líq. ponta<small>GW</small></th><th class="n">Rampa 12h→19h<small>GW</small></th><th class="n">Demanda s/ MMGD<small>GW</small></th><th class="n">Renov. c/ MMGD vale<small>GW</small></th><th class="n">PLD médio<small>R$/MWh</small></th><th class="n">PLD ponta<small>18h–21h</small></th><th class="n">PLD vale<small>8h–15h</small></th><th class="n">Ponta − vale<small>R$/MWh</small></th></tr></thead><tbody>` +
      linI.map(r => `<tr class="${r.ano === ultAno ? "destaque" : ""}"><td>${r.ano}${r.ano === ultAno ? " <small>acumulado</small>" : ""}</td><td class="n">${r.meses}</td><td class="n">${Gw(r.cl_vale)}</td><td class="n">${Gw(r.cl_ponta)}</td><td class="n">${r.rampa == null ? "—" : sn(r.rampa / 1000, 1)}</td><td class="n">${Gw(r.demanda)}</td><td class="n">${Gw(r.renov_vale)}</td><td class="n">${Pp(r.pld)}</td><td class="n">${Pp(r.pld_ponta)}</td><td class="n">${Pp(r.pld_vale)}</td><td class="n">${r.pld_ponta == null ? "—" : n(r.pld_ponta - r.pld_vale, 1)}</td></tr>`).join("") + "</tbody></table>";
    tb.querySelectorAll("tbody tr").forEach((tr, i) => alvoR(tr, () => inspAno(iSub, linI[i].ano)));

    // RISK-17 · contribuição e horas por tipo de dia
    const p17 = Mesa.painel(g, { cod: "RISK-17", titulo: "Contribuição e horas por tipo de dia", unidade: `${SUBN[cSub]} · ${Cc.meses.length === 1 ? rotLongo(Cc.meses[0]) : `${rot(Cc.meses[0])} a ${rot(Cc.meses[Cc.meses.length - 1])}`}`, tam: "full", ajuda: "contribuicao",
      leg: "Contribuição = desvio médio da célula × peso das suas horas no período; a soma das células dá o desvio médio do período. À direita: barra cheia = horas abaixo do DECOMP (parte escura = no piso); vazada = horas acima. Feriado = dia de semana sem patamar pesado no deck. Clique numa linha para a célula em todos os períodos." });
    abasEm(p17, PER_C, EST.perC, v => { EST.perC = v; guardar(); remontar(area, telaIND); }, "Período");
    selEm(p17, SUBS_PRECO, cSub, v => { EST.cSub = v; guardar(); remontar(area, telaIND); }, "Submercado da contribuição");
    const linhasC = Cc.linhas.map(r => ({ ...r, cor: corTipo(r.tipo), nomeT: nomeTipo(r.tipo) }));
    const duas = mk("div", "risk-duas"); p17.corpo.append(duas);
    const c1 = mk("div"), c2 = mk("div"); duas.append(c1, c2);
    mt(c1, "Contribuição ao desvio médio, R$/MWh", `total ${sn(Cc.total, 1)}`); mt(c2, "Horas por dia abaixo e acima do DECOMP", "h/dia");
    const nFx = 3;
    G(c1, 250, (svg, w, hh) => {
      const m = { l: 196, r: 44, t: 6, b: 18 }, rh = (hh - m.t - m.b) / linhasC.length;
      const ax = eixo(Math.min(0, ...linhasC.map(r => r.contrib)) * 1.2, Math.max(0, ...linhasC.map(r => r.contrib)) * 1.2, 4), xC = v => m.l + (w - m.l - m.r) * (v - ax.a) / (ax.b - ax.a);
      ax.t.forEach(t => { S(svg, "line", { x1: xC(t), x2: xC(t), y1: m.t, y2: hh - m.b, stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: xC(t), y: hh - 4, "text-anchor": "middle" }, n(t)); });
      linhasC.forEach((r, i) => { const yy = m.t + i * rh;
        if (i % nFx === 0) S(svg, "text", { x: 0, y: yy + rh * 0.7, class: "forte", style: `fill:${r.cor}` }, r.nomeT.replace("Domingo/feriado", "Dom./feriado"));
        S(svg, "text", { x: m.l - 6, y: yy + rh * 0.7, "text-anchor": "end" }, r.faixa);
        S(svg, "rect", { x: Math.min(xC(0), xC(r.contrib)), y: yy + rh * 0.18, width: Math.max(0.5, Math.abs(xC(r.contrib) - xC(0))), height: rh * 0.64, fill: r.cor });
        S(svg, "text", { x: r.contrib >= 0 ? xC(r.contrib) + 4 : xC(r.contrib) - 4, y: yy + rh * 0.7, "text-anchor": r.contrib >= 0 ? "start" : "end", class: "forte" }, sn(r.contrib, 1));
        const a = S(svg, "rect", { x: 0, y: yy, width: w, height: rh, fill: "transparent", class: "risk-alvo" });
        dicaEm(a, `<b>${r.nomeT} · ${r.faixa}</b><br>contribuição ${sn(r.contrib, 1)} R$/MWh<br>desvio médio da célula ${sn(r.medio, 1)} R$/MWh<br>${n(r.dias)} dias`);
        alvoR(a, () => inspContrib(cSub, r.tipo, r.faixa)); });
    });
    G(c2, 250, (svg, w, hh) => {
      const m = { l: 196, r: 28, t: 6, b: 18 }, rh = (hh - m.t - m.b) / linhasC.length, maxH = 12, xH = v => m.l + (w - m.l - m.r) * v / maxH;
      for (let t = 0; t <= maxH; t += 2) { S(svg, "line", { x1: xH(t), x2: xH(t), y1: m.t, y2: hh - m.b, stroke: "var(--rule)" }); S(svg, "text", { x: xH(t), y: hh - 4, "text-anchor": "middle" }, t + "h"); }
      linhasC.forEach((r, i) => { const yy = m.t + i * rh;
        if (i % nFx === 0) S(svg, "text", { x: 0, y: yy + rh * 0.7, class: "forte", style: `fill:${r.cor}` }, r.nomeT.replace("Domingo/feriado", "Dom./feriado"));
        S(svg, "text", { x: m.l - 6, y: yy + rh * 0.7, "text-anchor": "end" }, r.faixa);
        S(svg, "rect", { x: xH(0), y: yy + rh * 0.12, width: xH(r.nh) - xH(0), height: rh * 0.76, fill: "var(--vazio)" });
        S(svg, "rect", { x: xH(0), y: yy + rh * 0.12, width: xH(r.abaixo) - xH(0), height: rh * 0.36, fill: `color-mix(in srgb, ${r.cor} 45%, transparent)` });
        S(svg, "rect", { x: xH(0), y: yy + rh * 0.12, width: xH(r.piso) - xH(0), height: rh * 0.36, fill: r.cor });
        S(svg, "rect", { x: xH(0), y: yy + rh * 0.52, width: xH(r.acima) - xH(0), height: rh * 0.36, fill: "none", stroke: r.cor, "stroke-width": 1.2 });
        const a = S(svg, "rect", { x: 0, y: yy, width: w, height: rh, fill: "transparent", class: "risk-alvo" });
        dicaEm(a, `<b>${r.nomeT} · ${r.faixa}</b> (${r.nh} h por dia)<br>abaixo do DECOMP: ${n(r.abaixo, 1)} h/dia<br>no piso: ${n(r.piso, 1)} h/dia<br>acima do DECOMP: ${n(r.acima, 1)} h/dia`);
        alvoR(a, () => inspContrib(cSub, r.tipo, r.faixa)); });
    });
    legenda(p17.corpo, TIPOS.map(([, nome, cor]) => [cor, nome]));

    // RISK-18 · ponta por mês · RISK-19 · dispersão das horas de ponta
    const p18 = Mesa.painel(g, { cod: "RISK-18", titulo: "Preço da ponta por mês", unidade: "R$/MWh 18h–21h · SE/CO", tam: "xl", ajuda: "ponta-mes" });
    const p19 = Mesa.painel(g, { cod: "RISK-19", titulo: "Dispersão das horas de ponta", unidade: "R$/MWh", tam: "s", ajuda: "ponta-mes" });
    abasEm(p18, TIPOS.map(([t, nome]) => [t, nome.replace("Domingo/feriado", "Dom./feriado")]), EST.pmT, v => { EST.pmT = v; guardar(); desenharPM(); }, "Tipo de dia");
    const legPM = mk("p", "leg"); p18.el.append(legPM); const legD = mk("p", "leg"); p19.el.append(legD);
    function desenharPM() {
      limpar(p18.corpo);
      const rows = D.ponta_mensal[EST.pmT], xs = rows.map(r => r.mes), nomeT = nomeTipo(EST.pmT);
      if (!xs.includes(EST.pmMes)) EST.pmMes = xs[xs.length - 1];
      legenda(p18.corpo, [["var(--accent)", "Média do mês", "l"], ["color-mix(in srgb, var(--accent) 22%, transparent)", "Menor a maior dia"], ["var(--ink-3)", "DECOMP médio", "t"], ["var(--vazio)", "Mês selecionado"]]);
      const rotM2 = (mm, i) => (mm.endsWith("-01") || i === 0 ? { t: rot(mm), forte: true } : +mm.slice(5, 7) % 3 === 1 ? MES[+mm.slice(5, 7) - 1] : null);
      G(p18.corpo, 230, (svg, W, Hh) => linhasA(svg, { w: W, h: Hh, ml: 46, mr: 8, xs, y0: 0, nt: 5, centro: true, justo: true, rotX: rotM2,
        antes: ({ x, y, m, w, h: hh }) => { const meio = (w - m.l - m.r) / xs.length / 2;
          S(svg, "rect", { x: x(EST.pmMes) - meio, y: m.t, width: 2 * meio, height: hh - m.t - m.b, fill: "var(--vazio)", stroke: "var(--accent)", "stroke-width": 1, opacity: 0.9 });
          S(svg, "path", { d: rows.map((r, i) => `${i ? "L" : "M"}${x(r.mes)},${y(r.ponta_max_dia)}`).join("") + [...rows].reverse().map(r => `L${x(r.mes)},${y(r.ponta_min_dia)}`).join("") + "Z", fill: "color-mix(in srgb, var(--accent) 22%, transparent)" }); },
        series: [{ nome: "Máx", cor: "transparent", pts: rows.map(r => [r.mes, r.ponta_max_dia]) }, { nome: "DECOMP", cor: "var(--ink-3)", larg: 1.4, tracejado: true, pts: rows.map(r => [r.mes, r.decomp]) }, { nome: "Ponta", cor: "var(--accent)", pts: rows.map(r => [r.mes, r.ponta]), pontos: true }],
        dica: mm => { const r = rows.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b> · ${nomeT} (${r.dias} dias)<br>ponta média R$ ${n(r.ponta, 0)} · DECOMP ${n(r.decomp, 0)} · prêmio ${sn(r.premio, 0)}<br>menor dia ${n(r.ponta_min_dia, 0)} · maior dia ${n(r.ponta_max_dia, 0)} · hora mais cara ${n(r.ponta_max_hora, 0)}<br><i>clique para a dispersão e os números</i>`; },
        alvo: mm => { if (mm !== EST.pmMes) { EST.pmMes = mm; guardar(); requestAnimationFrame(() => { desenharPM(); }); } return inspPonta(EST.pmT, mm); } }));
      legPM.textContent = `${nomeT}. A média das horas de 18h a 21h de cada mês, com a faixa do menor ao maior dia e o DECOMP médio. O mês corrente é parcial. Clique num mês para a dispersão ao lado e os números no inspetor.`;
      desenharDispersao(p19.corpo, EST.pmT, EST.pmMes, 230);
      legD.textContent = `${nomeT} · ${rotLongo(EST.pmMes)}${EST.pmMes === ULT.slice(0, 7) ? " (parcial)" : ""}. Bolhas juntam horas de preço parecido (tamanho = número de horas); linhas nos percentis 10, 50 e 90 e no DECOMP médio.`;
    }
    desenharPM();
  }
  function desenharDispersao(box, T, mes, alt) {
    limpar(box);
    const vs = ((D.ponta_horas || {})[mes] || {})[T] || [], r = (D.ponta_mensal[T] || []).find(x => x.mes === mes);
    G(box, alt, (svg, w, hh) => {
      const m = { l: 14, r: 14, t: 46, b: 26 };
      if (!vs.length) { S(svg, "text", { x: w / 2, y: hh / 2, "text-anchor": "middle" }, "sem horas de ponta para esse tipo de dia"); return; }
      const ord = [...vs].sort((a, b) => a - b), Q = D.ponta_quantis[mes][T], amp = ord[ord.length - 1] - ord[0], passoB = amp > 600 ? 25 : amp > 250 ? 10 : 5;
      const ax = eixo(Math.min(ord[0], r ? r.decomp : ord[0]), Math.max(ord[ord.length - 1], r ? r.decomp : ord[0]), w < 420 ? 4 : 8);
      const x = v => m.l + (w - m.l - m.r) * (v - ax.a) / (ax.b - ax.a), yc = (m.t + hh - m.b) / 2 + 4;
      ax.t.forEach(t => { S(svg, "line", { x1: x(t), x2: x(t), y1: m.t - 4, y2: hh - m.b, stroke: "var(--rule)" }); S(svg, "text", { x: x(t), y: hh - 8, "text-anchor": "middle" }, n(t)); });
      const mcs = [[Q[0], "p10", "var(--ink-2)"], [Q[1], "p50", "var(--accent)"], [Q[2], "p90", "var(--ink-2)"]]; if (r) mcs.push([r.decomp, "DEC", "var(--ink-3)"]);
      const usados = [];
      mcs.forEach(([v, t, cor]) => { const xx = x(v); S(svg, "line", { x1: xx, x2: xx, y1: m.t - 6, y2: hh - m.b, stroke: cor, "stroke-width": t === "DEC" ? 1.2 : 1.6, "stroke-dasharray": t === "DEC" ? "4 3" : null });
        const nv = usados.filter(u => Math.abs(u - xx) < 56).length; usados.push(xx);
        S(svg, "text", { x: Math.min(Math.max(xx, m.l + 20), w - m.r - 20), y: m.t - 10 - nv * 11, "text-anchor": "middle", class: "forte", style: `fill:${cor}` }, `${t} ${n(v)}`); });
      const bins = new Map(); vs.forEach(v => { const k = Math.floor(v / passoB) * passoB; bins.set(k, (bins.get(k) || 0) + 1); });
      const maxC = Math.max(...bins.values());
      [...bins.entries()].sort((a, b) => a[0] - b[0]).forEach(([k, c]) => {
        const bol = S(svg, "circle", { cx: x(k + passoB / 2), cy: yc, r: 3 + 12 * Math.sqrt(c / maxC), fill: "color-mix(in srgb, var(--accent) 55%, transparent)", stroke: "var(--accent)", "stroke-width": 1 });
        dicaEm(bol, `<b>R$ ${n(k)} a ${n(k + passoB)}</b><br>${c} ${c === 1 ? "hora" : "horas"} (${pct(c / vs.length)} das horas de ponta do mês)`); });
      S(svg, "text", { x: w - m.r, y: hh - m.b - 4, "text-anchor": "end" }, `${vs.length} horas`);
    });
  }
  function inspPonta(T, mm) {
    const r = (D.ponta_mensal[T] || []).find(x => x.mes === mm), Q = (D.ponta_quantis[mm] || {})[T];
    return { t: `Ponta · ${nomeTipo(T).toLowerCase()} · ${rotLongo(mm)}`, c: el => {
      if (!r) { nota(el, "Sem dados."); return; }
      pares(el, [["Ponta média", rs(r.ponta, 1)], ["DECOMP médio", rs(r.decomp, 1)], ["Prêmio", sn(r.premio, 1)], ["Menor dia", rs(r.ponta_min_dia, 0)], ["Maior dia", rs(r.ponta_max_dia, 0)],
        ["Hora mais cara", rs(r.ponta_max_hora, 0)], ["Dias", `${r.dias}${mm === ULT.slice(0, 7) ? " (parcial)" : ""}`], ["Dias com prêmio ≥ 100", `${r.dias_premio_100} de ${r.dias}`], Q ? ["p10 · p50 · p90", `${n(Q[0])} · ${n(Q[1])} · ${n(Q[2])}`] : null]);
      ttl3(el, "Dispersão das horas de ponta"); desenharDispersao(el, T, mm, 160);
    } };
  }
  function inspAno(sub, ano) {
    return { t: `${ano} · indicadores · ${SUBN[sub]}`, c: el => {
      const lin = PERIODOS_IND.map(([k, nome]) => [nome, (D.indicadores[sub][k] || []).find(x => x.ano === ano)]).filter(x => x[1]);
      QC.tabela(el, [{ t: "Período" }, { t: "CL vale", n: 1 }, { t: "CL ponta", n: 1 }, { t: "Rampa", n: 1 }, { t: "PLD", n: 1 }, { t: "P−V", n: 1 }],
        lin.map(([nome, r]) => [nome, n(r.cl_vale / 1000, 1), n(r.cl_ponta / 1000, 1), r.rampa == null ? "—" : sn(r.rampa / 1000, 1), n(r.pld, 0), r.pld_ponta == null ? "—" : n(r.pld_ponta - r.pld_vale, 0)]), "risk-densa");
      const r = lin[0] && lin[0][1];
      if (r) pares(el, [["Demanda sem MMGD", `${n(r.demanda / 1000, 1)} GW`], ["Renovável com MMGD no vale", `${n(r.renov_vale / 1000, 1)} GW`], ["PLD ponta · vale", `${n(r.pld_ponta, 1)} · ${n(r.pld_vale, 1)}`], ["Meses", r.meses]]);
      nota(el, `CL = carga líquida, GW; rampa = CL às 19h − às 12h; P−V = PLD da ponta − PLD do vale, R$/MWh${sub === "SIN" ? " (PLD do SE/CO)" : ""}.`);
    } };
  }
  function inspContrib(sub, tipo, faixa) {
    const C = D.contribuicao[sub], ks = Object.keys(C);
    return { t: `${nomeTipo(tipo)} · ${faixa} · ${SUBN[sub]}`, c: el => {
      const lin = ks.map(k => [k, C[k], C[k].linhas.find(r => r.tipo === tipo && r.faixa === faixa)]).filter(x => x[2]);
      const nomeK = k => ({ corrente: rot(ultMes), ultimo: "Último mês", "3m": "3 meses", "12m": "12 meses" }[k] || k.slice(1));
      QC.tabela(el, [{ t: "Período" }, { t: "Contrib.", n: 1 }, { t: "Médio", n: 1 }, { t: "Abaixo h", n: 1 }, { t: "Piso h", n: 1 }, { t: "Acima h", n: 1 }],
        lin.map(([k, , r]) => [nomeK(k), sn(r.contrib, 1), sn(r.medio, 0), n(r.abaixo, 1), n(r.piso, 1), n(r.acima, 1)]), "risk-densa");
      nota(el, "Contribuição ao desvio médio do período (R$/MWh); médio = desvio médio da célula; horas por dia abaixo do DECOMP, no piso e acima.");
    } };
  }

  // =====================================================================================================
  // 5 · DES Desempenho do simulador
  // =====================================================================================================
  function telaDES(area) {
    const metr = D.desempenho, conf1 = D.confianca.find(r => r.h === 1 && r.direcao_prevista === "desconto");
    const h1 = D.backtest.filter(r => r.h === 1).sort((a, b) => (a.mes < b.mes ? -1 : 1)), bt1 = h1.filter(r => r.mes >= REG);
    const perReg = bt1.length ? `${rot(bt1[0].mes)} a ${rot(bt1[bt1.length - 1].mes)}` : "—";
    const prH1 = h1.filter(r => r.direcao_real === "prêmio"), acP = prH1.filter(r => r.direcao_prevista === "prêmio").length, desP = prH1.filter(r => r.direcao_prevista === "desconto").length;
    const certos1 = h1.filter(r => r.direcao_prevista === r.direcao_real).length;
    const HS = [1, 2, 3, 4, 5, 6].map(k => [k, `M+${k}`]);
    EST.hBt = +valido(EST.hBt, HS, cal[SIM.mesI].h);
    const dec = Mesa.decisao(area, [
      { r: "Erro médio do PLD do mês · M+1", v: rs(metr[0].erro, 1), d: `contra ${rs(metr[0].dec, 1)} supondo PLD = DECOMP · viés ${sn(metr[0].vies, 1)}`, principal: true },
      { r: "Direção certa · M+1", v: pct(metr[0].dir), d: `${certos1} de ${h1.length} meses (desconto, neutro ou prêmio)` },
      { r: "Previu desconto → veio desconto", v: conf1 ? pct(conf1.acerto) : "—", d: conf1 ? `${conf1.meses} meses com 1 mês de antecedência` : "" },
      { r: "Meses de prêmio previstos como prêmio", v: `${acP} de ${prH1.length}`, d: `desde ${rot(h1[0].mes)}; nos outros, ${desP ? `${desP} como desconto` : "previu neutro, nunca desconto"}` },
    ]);
    alvoR(dec.children[0], () => inspMetr(1)); alvoR(dec.children[3], () => ({ t: "Meses de prêmio · M+1", c: el => listaMeses(el, prH1, 1) }));
    barra(area, [{ rot: "Antecedência", opc: HS, atual: EST.hBt, aoTrocar: v => { EST.hBt = +v; guardar(); remontar(area, telaDES); } },
      { rot: "Teste", txt: `fora da amostra, ${perReg} (${bt1.length} meses no regime atual): em cada mês, o simulador rodou só com o que existia na data e foi comparado com o PLD oficial` }]);
    const hS = EST.hBt, an = ante(hS), rows = D.backtest.filter(r => r.h === hS).sort((a, b) => (a.mes < b.mes ? -1 : 1));
    const g = Mesa.grade(area);

    // RISK-20 · mês a mês
    const p20 = Mesa.painel(g, { cod: "RISK-20", titulo: "Mês a mês · o que o simulador disse × o que aconteceu", unidade: `desvio sobre o DECOMP, R$/MWh · M+${hS}`, tam: "xl", ajuda: "backtest" });
    legenda(p20.corpo, [["var(--risk-vale)", "Veio desconto"], ["var(--ink-3)", "Veio neutro"], ["var(--risk-verm)", "Veio prêmio"], ["var(--ink)", "Previsto (losango)"], ["var(--vazio)", "Faixa neutra ±5"]]);
    G(p20.corpo, 270, (svg, w, hh) => {
      const m = { l: 40, r: 8, t: 14, b: 40 }, vals = rows.flatMap(r => [r.delta_real, r.delta_prev]), ax = eixo(Math.min(-10, ...vals), Math.max(10, ...vals), 6);
      const y = v => m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a)), bw = (w - m.l - m.r) / rows.length, x = i => m.l + (i + 0.5) * bw;
      const i0 = rows.findIndex(r => r.mes >= REG);
      if (i0 > 0) { S(svg, "rect", { x: x(i0) - bw / 2, y: m.t, width: w - m.r - (x(i0) - bw / 2), height: hh - m.t - m.b, fill: "var(--vazio)", opacity: 0.35 }); S(svg, "text", { x: x(i0) - bw / 2 + 4, y: m.t + 10, style: "fill:var(--ink-3)" }, "regime atual (desde mar/25)"); }
      S(svg, "rect", { x: m.l, y: y(5), width: w - m.l - m.r, height: y(-5) - y(5), fill: "var(--vazio)", opacity: 0.9 });
      ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, sn(t)); });
      let ultX = -1e9;
      rows.forEach((r, i) => {
        S(svg, "rect", { x: x(i) - bw * 0.32, y: y(Math.max(0, r.delta_real)), width: bw * 0.64, height: Math.max(1, Math.abs(y(r.delta_real) - y(0))), fill: corDir(r.direcao_real), opacity: 0.85 });
        const yp = y(r.delta_prev); S(svg, "rect", { x: x(i) - 4, y: yp - 4, width: 8, height: 8, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1.2, transform: `rotate(45 ${x(i)} ${yp})` });
        const ok = r.direcao_prevista === r.direcao_real;
        S(svg, "text", { x: x(i), y: hh - m.b + 14, "text-anchor": "middle", class: "forte", style: `fill:${ok ? "var(--accent)" : "var(--risk-verm)"}` }, ok ? "✓" : "✗");
        const mm = +r.mes.slice(5, 7), lab = mm === 1 || i === 0 ? [rot(r.mes), "forte"] : mm % 3 === 1 ? [MES[mm - 1], null] : null;
        if (lab && x(i) - ultX >= lab[0].length * 6.4 + 4) { S(svg, "text", { x: x(i), y: hh - 4, "text-anchor": "middle", class: lab[1] }, lab[0]); ultX = x(i); }
        const a = S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: hh - m.t - m.b + 18, fill: "transparent", class: "risk-alvo" });
        dicaEm(a, `<b>${rotLongo(r.mes)}</b> · M+${hS}<br>DECOMP ${n(r.decomp, 1)} · oficial ${n(r.real, 1)} · previsto ${n(r.prev, 1)}<br>aconteceu ${sn(r.delta_real, 1)} (${DIR[r.direcao_real].toLowerCase()}) · previsto ${sn(r.delta_prev, 1)} (${DIR[r.direcao_prevista].toLowerCase()})<br>${ok ? "direção certa" : "direção errada"} · erro ${sn(r.erro, 1)}`);
        alvoR(a, () => inspBt(r.mes, hS));
      });
    });
    const premiosR = rows.filter(r => r.direcao_real === "prêmio"), prReg = rows.filter(r => r.mes >= REG && r.direcao_real === "prêmio"), anosAntes = [...new Set(premiosR.filter(r => r.mes < REG).map(r => r.mes.slice(0, 4)))];
    nota(p20.el, `Desvio = PLD médio do mês − DECOMP médio. Barra: o que aconteceu, na cor da direção (abaixo de −5 desconto, acima de +5 prêmio). Losango: o previsto com as premissas do backtest. ✓/✗ direção certa ou errada. ` +
      (prReg.length ? `Desde mar/2025, ${prReg.length === 1 ? "um mês de prêmio" : `${prReg.length} meses de prêmio`} (${prReg.map(r => rot(r.mes)).join(", ")})${anosAntes.length ? `; antes, prêmio em ${anosAntes.join(" e ")}` : ""}.` : `Desde mar/2025 todos os meses foram de desconto ou neutro${anosAntes.length ? `; os de prêmio são de ${anosAntes.join(" e ")}` : ""}.`) + " Clique num mês para o detalhe.");

    // RISK-21 · matriz previu × veio
    const p21 = Mesa.painel(g, { cod: "RISK-21", titulo: "Quando previu… o que veio", unidade: `${rows.length} meses · M+${hS}`, tam: "s", ajuda: "backtest" });
    const cls = ["desconto", "neutro", "prêmio"];
    const tm = mk("table", "risk-densa risk-mat"); p21.corpo.append(tm);
    tm.innerHTML = `<thead><tr><th>Previu ↓ · veio →</th>${cls.map(v => `<th class="n">${DIR[v]}</th>`).join("")}</tr></thead><tbody>` + cls.map(p => { const lin = rows.filter(r => r.direcao_prevista === p), tot = lin.length;
      return `<tr><td>${DIR[p]}<small>${tot} ${tot === 1 ? "vez" : "vezes"}</small></td>` + cls.map(v => { const k = lin.filter(r => r.direcao_real === v).length; return `<td class="n${p === v && k ? " ok" : ""}" data-p="${p}" data-v="${v}"><b>${k}</b><small>${tot ? pct(k / tot) : "—"}</small></td>`; }).join("") + "</tr>"; }).join("") + "</tbody>";
    tm.querySelectorAll("td[data-p]").forEach(td => alvoR(td, () => ({ t: `Previu ${DIR[td.dataset.p].toLowerCase()} · veio ${DIR[td.dataset.v].toLowerCase()} · M+${hS}`, c: el => listaMeses(el, rows.filter(r => r.direcao_prevista === td.dataset.p && r.direcao_real === td.dataset.v), hS) })));
    const certos = rows.filter(r => r.direcao_prevista === r.direcao_real).length;
    nota(p21.corpo, `Na diagonal, os acertos (${certos} de ${rows.length}). Meses de prêmio: ${premiosR.length}${premiosR.length ? ` (${premiosR.map(r => rot(r.mes)).join(", ")}), previstos como prêmio em ${premiosR.filter(r => r.direcao_prevista === "prêmio").length}` : ""}. Clique numa célula para os meses.`);

    // RISK-22 · faixa 10–90%
    const e = D.confianca.find(r => r.h === hS), rsF = D.backtest.filter(r => r.h === hS && r.mes >= REG).sort((a, b) => a.erro - b.erro);
    const p22 = Mesa.painel(g, { cod: "RISK-22", titulo: "Como a faixa 10–90% é calculada", unidade: `erro, R$/MWh · M+${hS}`, tam: "l", ajuda: "confianca",
      leg: `Cada ponto é um mês do backtest fora da amostra (${perReg}, ${rsF.length} meses), na mesma antecedência. A faixa vai de PLD previsto − p90 (${sn(e.erro_p90, 1)}) a PLD previsto − p10 (${sn(e.erro_p10, 1)}): se o erro repetir o histórico, o oficial cai nela 8 em 10 vezes. É em R$ fixos e não depende da direção prevista. Clique num ponto para o mês.` });
    G(p22.corpo, 160, (svg, w, hh) => {
      const m = { l: 16, r: 16, t: 32, b: 28 }, ax = eixo(Math.min(...rsF.map(r => r.erro), e.erro_p10), Math.max(...rsF.map(r => r.erro), e.erro_p90), w < 500 ? 5 : 8);
      const x = v => m.l + (w - m.l - m.r) * (v - ax.a) / (ax.b - ax.a), yb = hh - m.b;
      S(svg, "rect", { x: x(e.erro_p10), y: m.t - 6, width: x(e.erro_p90) - x(e.erro_p10), height: yb - m.t + 6, fill: "var(--faixa-proj)" });
      ax.t.forEach(t => { S(svg, "line", { x1: x(t), x2: x(t), y1: m.t - 6, y2: yb, stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: x(t), y: hh - 10, "text-anchor": "middle" }, sn(t)); });
      [[e.erro_p10, "p10 " + sn(e.erro_p10, 1)], [e.erro_p90, "p90 " + sn(e.erro_p90, 1)]].forEach(([v, t]) => { S(svg, "line", { x1: x(v), x2: x(v), y1: m.t - 10, y2: yb, stroke: "var(--accent)", "stroke-width": 1.6 }); S(svg, "text", { x: x(v), y: m.t - 14, "text-anchor": "middle", class: "forte" }, t); });
      const niv = {}; rsF.forEach(r => { const k = Math.round(x(r.erro) / 9); niv[k] = (niv[k] || 0) + 1; const yy = yb - 10 - (niv[k] - 1) * 11;
        const c = S(svg, "circle", { cx: x(r.erro), cy: yy, r: 4.5, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1.5, class: "risk-ponto" });
        dicaEm(c, `<b>${rotLongo(r.mes)}</b> · M+${hS}<br>DECOMP ${n(r.decomp, 1)} → previsto ${n(r.prev, 1)}<br>oficial ${n(r.real, 1)} · erro ${sn(r.erro, 1)}`); alvoR(c, () => inspBt(r.mes, hS)); });
    });

    // RISK-23 · resultado por antecedência
    const p23 = Mesa.painel(g, { cod: "RISK-23", titulo: "Resultado por antecedência", unidade: "R$/MWh", tam: "l", ajuda: "backtest" });
    const tr_ = QC.tabela(p23.corpo, [{ t: "Antecedência" }, { t: "Erro médio", n: 1 }, { t: "Só DECOMP", n: 1 }, { t: "Viés", n: 1 }, { t: "Direção certa", n: 1 }, { t: "Desconto → desconto", n: 1 }],
      metr.map(r => { const k = D.confianca.find(x => x.h === r.h && x.direcao_prevista === "desconto"); return [ante(r.h), `<b>${n(r.erro, 1)}</b>`, n(r.dec, 1), sn(r.vies, 1), pct(r.dir), k ? `${pct(k.acerto)} <span class="risk-cinza">(${k.meses})</span>` : "—"]; }), "risk-densa");
    tr_.querySelectorAll("tbody tr").forEach((tr, i) => { if (metr[i].h === hS) tr.classList.add("destaque"); alvoR(tr, () => inspMetr(metr[i].h)); });
    const regH1 = h1.filter(r => r.mes >= REG), nReal = regH1.filter(r => r.direcao_real === "prêmio").length, nPrev = regH1.filter(r => r.direcao_prevista === "prêmio").length;
    nota(p23.corpo, `"Só DECOMP" é o erro de supor PLD = DECOMP: o ganho do simulador é a diferença. Viés + = previu acima.` + (nPrev ? "" : nReal ? ` Houve ${nReal === 1 ? "um mês" : nReal + " meses"} de prêmio, mas o simulador não previu prêmio em nenhum: ainda não há como medir o acerto quando ele prevê prêmio.` : " Não houve mês de prêmio no período.") + " Premissas do teste na metodologia (?).");

    // RISK-24 · onde errou: premissas na RV0 × o que aconteceu
    const p24 = Mesa.painel(g, { cod: "RISK-24", titulo: "Onde errou · premissas na RV0 × o que aconteceu", unidade: "SE/CO · meses encerrados", tam: "full", ajuda: "onde-errou" });
    EST.hdT = valido(EST.hdT, TIPOS, "útil");
    abasEm(p24, TIPOS.map(([t, nome]) => [t, nome.replace("Domingo/feriado", "Dom./feriado")]), EST.hdT, v => { EST.hdT = v; guardar(); desenharHD(); }, "Tipo de dia");
    const bTab = mk("button", "risk-btn", "Tabela ›"); bTab.type = "button"; noCab(p24, bTab);
    const legHD = mk("p", "leg"); p24.el.append(legHD);
    let rowsHD = [];
    alvoR(bTab, () => ({ t: `Premissas na RV0 → realizado · ${nomeTipo(EST.hdT).toLowerCase()}`, c: el => {
      const box = QC.tabela(el, [{ t: "Mês" }, { t: "Piso h", n: 1 }, { t: "Outras", n: 1 }, { t: "Ponta", n: 1 }], rowsHD.slice().reverse().map(r => [rot(r.mes), `${n(r.rv0_horas_piso, 1)}→${n(r.horas_piso, 1)}`, `${sn(r.rv0_frac_fora * 100, 0)}→${sn(r.frac_fora * 100, 0)}%`, `${n(r.rv0_ponta, 0)}→${n(r.ponta_media, 0)}`]), "risk-densa");
      box.querySelectorAll("tbody tr").forEach((tr, i) => { const r = rowsHD[rowsHD.length - 1 - i]; alvoR(tr, () => inspBt(r.mes, 1)); });
      nota(el, "RV0 → realizado. Clique num mês para o backtest dele.");
    } }));
    function desenharHD() {
      limpar(p24.corpo);
      const T = EST.hdT, nomeT = nomeTipo(T);
      rowsHD = (D.premissas_mensal[T] || []).slice().sort((a, b) => (a.mes < b.mes ? -1 : 1)).filter(r => r.mes < ULT.slice(0, 7) && r.rv0_horas_piso != null);
      const xs = rowsHD.map(r => r.mes);
      legenda(p24.corpo, [["var(--accent)", "Realizado no mês", "l"], ["var(--risk-verm)", "Premissa na RV0 (anel)"], ["var(--ink-3)", "DECOMP médio do mês", "t"]]);
      const tres = mk("div", "risk-tres"); p24.corpo.append(tres);
      const rotM3 = (mm, i) => (mm.endsWith("-01") || i === 0 ? { t: rot(mm), forte: true } : +mm.slice(5, 7) % 3 === 1 ? MES[+mm.slice(5, 7) - 1] : null);
      const dicaHM = mm => { const r = rowsHD.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b> · ${nomeT}, ${r.dias} dias<br>DECOMP médio ${n(r.decomp, 0)} · espaço ${n(r.espaco, 0)}<br>vale no piso: RV0 ${n(r.rv0_horas_piso, 1)} → real ${n(r.horas_piso, 1)}<br>outras horas: RV0 ${sn(r.rv0_frac_fora * 100, 0)}% → real ${sn(r.frac_fora * 100, 0)}%<br>ponta: RV0 R$ ${n(r.rv0_ponta, 0)} → real R$ ${n(r.ponta_media, 0)}<br><small>RV0 rodada em ${dataBr(r.rv0)}</small>`; };
      const graf = (titulo, uni, colReal, colRv0, fmt, y0, y1, comDecomp) => { const cx = mk("div"); tres.append(cx); mt(cx, titulo, uni);
        G(cx, 170, (svg, w, hh) => {
          const extra = rowsHD.map(r => [r.mes, r[colRv0]]);
          linhasA(svg, { w, h: hh, ml: 40, mr: 8, xs, y0, y1, nt: 4, fmtY: fmt, centro: true, rotX: rotM3,
            series: [...(comDecomp ? [{ nome: "DECOMP", cor: "var(--ink-3)", larg: 1.3, tracejado: true, pts: rowsHD.map(r => [r.mes, r.decomp]) }] : []),
              { nome: "Realizado", cor: "var(--accent)", larg: 2, pts: rowsHD.map(r => [r.mes, r[colReal]]) }, { nome: "eixo", cor: "transparent", pts: extra }],
            depois: ({ x, y }) => rowsHD.forEach(r => {
              if (r[colRv0] != null) S(svg, "circle", { cx: x(r.mes), cy: y(r[colRv0]), r: 3.2, fill: "none", stroke: "var(--risk-verm)", "stroke-width": 1.6, "pointer-events": "none" });
              if (r[colReal] != null) S(svg, "circle", { cx: x(r.mes), cy: y(r[colReal]), r: 2.4, fill: "var(--accent)", "pointer-events": "none" }); }),
            dica: dicaHM, alvo: mm => inspBt(mm, 1) });
        }); };
      graf("Horas do vale no piso", "de 8", "horas_piso", "rv0_horas_piso", v => n(v, 1), 0, 8);
      graf("Desconto das outras horas", "% do espaço", "frac_fora", "rv0_frac_fora", v => sn(v * 100, 0) + "%", -0.5, 0.2);
      graf("Preço da ponta", "R$/MWh", "ponta_media", "rv0_ponta", v => n(v, 0), 0, null, true);
      legHD.textContent = `${nomeT}. Linha: o que aconteceu no mês. Anel: o que o simulador usaria na rodada da RV0 do mês (média dos ${D.janela_padrao} dias anteriores), a premissa da previsão de 1 mês. Na ponta, o anel é o DECOMP realizado mais o prêmio da janela: separa o erro da premissa do erro do DECOMP. Clique num mês para o backtest; "Tabela" lista todos.`;
    }
    desenharHD();
  }
  function listaMeses(el, lin, hh) {
    if (!lin.length) { nota(el, "Nenhum mês."); return; }
    const box = QC.tabela(el, [{ t: "Mês" }, { t: "DECOMP", n: 1 }, { t: "Oficial", n: 1 }, { t: "Previsto", n: 1 }, { t: "Erro", n: 1 }], lin.map(r => [rot(r.mes), n(r.decomp, 0), n(r.real, 1), n(r.prev, 1), sn(r.erro, 1)]), "risk-densa");
    box.querySelectorAll("tbody tr").forEach((tr, i) => alvoR(tr, () => inspBt(lin[i].mes, hh)));
    nota(el, "Clique num mês para o detalhe.");
  }
  function inspMetr(hh) {
    const r = D.desempenho.find(x => x.h === hh), cs = D.confianca.filter(x => x.h === hh);
    return { t: `Antecedência de ${ante(hh)} (M+${hh})`, c: el => {
      pares(el, [["Erro médio", rs(r.erro, 1)], ["Só DECOMP", rs(r.dec, 1)], ["Ganho sobre só DECOMP", rs(r.dec - r.erro, 1)], ["Viés", sn(r.vies, 1)], ["Direção certa", pct(r.dir)], ["Meses", r.meses],
        cs[0] ? ["Faixa de erro p10 · p90", `${sn(cs[0].erro_p10, 1)} · ${sn(cs[0].erro_p90, 1)}`] : null]);
      ttl3(el, "Acerto por direção prevista");
      QC.tabela(el, [{ t: "Previu" }, { t: "Meses", n: 1 }, { t: "Acerto", n: 1 }, { t: "Veio D/N/P", n: 1 }], cs.map(c => [DIR[c.direcao_prevista], c.meses, pct(c.acerto), `${c.desconto}/${c.neutro}/${c.premio}`]), "risk-densa");
      const b = mk("button", "risk-btn", `Ver mês a mês com M+${hh}`); b.type = "button"; b.addEventListener("click", () => { EST.hBt = hh; guardar(); Mesa.ir("RISK", 5); }); el.append(b);
    } };
  }

  // =====================================================================================================
  // 6 · MET Metodologia (texto da metodologia da 07 + leitura de cada painel; os "?" apontam para cá)
  // =====================================================================================================
  const lista = itens => `<ul class="risk-lista">${itens.map(([t, x]) => `<li><b>${t}</b><span>${x}</span></li>`).join("")}</ul>`;
  const tabela = (cab, lin) => `<div class="rolagem"><table class="risk-densa"><thead><tr>${cab.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${lin.map(l => `<tr>${l.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const eq = t => `<div class="risk-eq">${t}</div>`;
  function telaMET(area) {
    const m1 = D.desempenho[0];
    Mesa.met(area, [
      { id: "pergunta", titulo: "A pergunta", html: `<p>O simulador não tenta prever o DESSEM do zero. Ele parte do DECOMP médio que a mesa espera para o mês e estima quanto o PLD horário vai se afastar dele, olhando o que o DESSEM fez nas últimas semanas: quantas horas o vale foi ao piso, quanto as demais horas ficaram abaixo do DECOMP e quanto a ponta pagou acima dele.</p><p>Dado o DECOMP médio de um mês, o PLD médio desse mês vai sair abaixo (desconto), perto (neutro) ou acima (prêmio) do DECOMP, e quanto?</p>` +
        eq("Δ = PLD<sub>DESSEM</sub> médio do mês civil − DECOMP médio do mês civil<br>DECOMP médio = PLD semanal da revisão vigente em cada dia (com limites), ponderado pelos dias<br>direção: desconto se Δ &lt; −5 · neutro de −5 a +5 · prêmio se Δ &gt; +5 (R$/MWh)") +
        `<p>O foco é o mês seguinte (M+1). Mais longe, o que move o desvio (piso no vale, preço da ponta) muda mais rápido do que qualquer janela acompanha. A tela SIM permite simular os outros meses do calendário, com a confiança medida na antecedência correspondente. Modelo v2 (em uso desde 19/10/2026): o desconto das outras horas é um número só para os três tipos de dia (D087).</p>` },
      { id: "dados", titulo: "Dados usados", html: tabela(["Dado", "Fonte", "Uso"], [
          ["PLD horário", "CCEE, publicado. Dias com deck e ainda sem publicação: calculado do CMO do deck do DESSEM pela regra oficial (D048; diferença máxima de R$ 0,01 em 960 horas conferidas)", "Realizado e premissas"],
          ["DECOMP", "Decks da CCEE: PLD semanal de cada revisão, com o piso e o teto do ano", "DECOMP vigente de cada dia e média do mês"],
          ["Decks do DESSEM", "CCEE (resultados SEMREDE e entradas)", "Tipo de dia (feriado = dia de semana sem patamar pesado), demanda e renovável"],
          ["Limites do PLD", "CCEE, por ano", "Piso de cada mês (2027 ainda sem publicação: usa o último)"]]) +
        `<p>O CMO e o balanço do ONS não entram: o PLD é calculado pela CCEE com os próprios decks, e é isso que o simulador reproduz. Rodada desta tela: deck até ${dataBr(ESTADO.ultimo_deck)}, PLD publicado até ${dataBr(ESTADO.ultimo_publicado)}${notaCalc ? "; " + notaCalc : ""}. Laboratório com dados fictícios: nenhum número vem do Quant Energia App.</p>` },
      { id: "definicoes", titulo: "Definições", html: lista([["Vale", "Horas de 8h a 15h (8 horas por dia; D054). É onde o PLD vai ao piso quando sobra água e sol."], ["Ponta", "Horas de 18h a 21h (4 horas). É onde aparecem os preços altos."],
          ["Outras horas", "As 20 horas fora da ponta que não estão no piso: o vale fora do piso e as demais horas (0h–7h, 16h–17h, 22h–23h)."], ["Tipo de dia", "Útil, sábado, domingo/feriado. Tudo é calculado por tipo de dia e recombinado pelo calendário do mês."],
          ["Espaço", "DECOMP − piso: o máximo que uma hora pode cair abaixo do DECOMP. Com o DECOMP no piso, não há desconto possível."], ["Janela", "Os 14 dias antes da data da previsão (padrão; a tela SIM permite 7, 30, 60 e 90)."]]) },
      { id: "passos", titulo: "Passo a passo do simulador", html: `<p>Três premissas por tipo de dia, um dia típico para cada tipo e a média pelo calendário do mês (painel RISK-5).</p>` +
        `<h3>1 · Horas do vale no piso (n)</h3><p>Média, nos dias da janela, de quantas das 8 horas do vale ficaram no piso. É conjuntural: segue a hidrologia e o acoplamento entre submercados das últimas semanas.</p>` + eq("n<sub>tipo</sub> = horas do vale no piso / dias do tipo, na janela de 14 dias") +
        `<h3>2 · Desconto das outras horas (f)</h3><p>Quanto as outras horas ficam abaixo do DECOMP, em fração do espaço. É estrutural, por isso vem da média dos 12 meses encerrados, não da janela. É <b>um número só para os três tipos de dia</b>: por tipo, o desconto é diferente, mas o número único acertou igual ou melhor no backtest (D087). Meses com o DECOMP no piso ficam de fora.</p>` +
        eq("f<sub>mês</sub> = média(PLD − DECOMP) / max(média(DECOMP − piso), 20) nas outras horas do mês, todos os dias<br>f = média de f<sub>mês</sub> nos 12 meses encerrados com espaço ≥ R$ 20 (D087)") +
        `<h3>3 · Preço da ponta</h3><p>A conta usa o prêmio da ponta sobre o DECOMP, medido na janela; o usuário vê e pode editar o preço (DECOMP + prêmio). O prêmio é o que persiste: o preço da ponta sobe e desce com o DECOMP (correlação 0,62 nos dias úteis desde 2025), o prêmio quase não depende dele (0,02). Usar o preço da janela direto piorou o erro do mês de 15,8 para 19,7 R$/MWh (D058).</p>` +
        eq("prêmio<sub>tipo</sub> = média(PLD − DECOMP do dia) nas horas de 18h a 21h da janela<br>ponta<sub>tipo</sub> = max(D + prêmio<sub>tipo</sub>, piso)") +
        `<h3>4 · Dia típico e mês</h3><p>Com o DECOMP médio D do mês e o piso P do ano, cada tipo de dia vira um dia típico; o mês é a média pelo calendário, com os feriados nacionais. Nenhuma hora fica abaixo do piso.</p>` +
        eq("outras = max(D + f × (D − P), P)<br>PLD do dia<sub>tipo</sub> = [ n<sub>tipo</sub> × P + (20 − n<sub>tipo</sub>) × outras + 4 × ponta<sub>tipo</sub> ] / 24<br>PLD do mês = max( Σ<sub>tipo</sub> parte do mês<sub>tipo</sub> × PLD do dia<sub>tipo</sub>, P )") +
        `<p>A contribuição de cada grupo ao desvio (vale no piso, outras horas, ponta) é a mesma conta separada por parcela: colunas "No mês" e "Peso" da tabela. "Dias do mês" mostra o PLD de cada dia pelo calendário e baixa o CSV. As edições ficam guardadas neste navegador; "↺ Premissas padrão" volta à janela de 14 dias.</p>` },
      { id: "exemplo", titulo: "Exemplo: novembro de 2026 com DECOMP 150", html: `<p>Premissas de 13/10/2026 (janela de 30/09 a 13/10), piso R$ 57,31. Novembro tem 63% de dias úteis, 13% de sábados e 23% de domingos e feriados. Desconto das outras horas: f = −6,5%, o mesmo nos três tipos.</p>` +
        tabela(["Tipo de dia", "n (vale no piso)", "f", "Outras horas", "Prêmio da ponta", "Ponta", "PLD do dia"], [["Útil", "7,0", "−6,5%", "144,0", "+127", "276,9", "140,9"], ["Sábado", "8,0", "−6,5%", "144,0", "+3", "153,5", "116,7"], ["Domingo/feriado", "8,0", "−6,5%", "144,0", "+3", "152,5", "116,5"]]) +
        eq("Outras horas: 150 − 0,065 × (150 − 57,31) = 144,0<br>Dia útil: [7 × 57,31 + 13 × 144,0 + 4 × 276,9] / 24 = 140,9<br>Mês: 0,633 × 140,9 + 0,133 × 116,7 + 0,233 × 116,5 = <b>132,0</b> → desconto de −18,0 R$/MWh<br>Peso: vale no piso −28,4 · outras horas −3,2 · ponta +13,6<br><small>Com um desconto por tipo de dia (D061: −2%, −15%, −23%), o mês daria 131,1.</small>") },
      { id: "sensibilidade", titulo: "Sensibilidade de ponta", html: `<p>Responde "e se a ponta dos dias úteis ficar em R$ X durante p% do mês?". Nos outros dias úteis a ponta fica na premissa; sábados, domingos e feriados não mudam. Como o PLD do dia é linear no preço da ponta, a mistura é exata:</p>` +
        eq("PLD com sensibilidade = max( (1 − p) × PLD previsto + p × PLD com a ponta do dia útil em X, P )<br>efeito ≈ p × 4/24 × parte de dias úteis × (X − ponta da premissa)") +
        `<p>Padrão: ${PCT0}% dos dias úteis com a ponta no percentil 90 das horas de ponta do mês corrente (hoje ${rs(P90_MES, 0)}). A régua mostra o PLD do mês com 5%, 25%, 50%, 75% e 100%, e a dica diz em quantos dias úteis dos últimos 12 meses a ponta ficou nesse preço ou acima. As médias móveis de 7, 14, 30 e 60 dias da ponta, com a média de 12 meses, ajudam a calibrar (RISK-7).</p>` },
      { id: "confianca", titulo: "Antecedência, confiança e faixa 10–90%", html: lista([["Antecedência", "1 mês se a RV0 do mês já saiu; senão 1 + as RV0 ainda não publicadas até a do mês. É o lado conservador (D057). A RV0 futura é estimada como a sexta antes do sábado que abre a semana operativa do dia 1º."],
          ["Confirmou", "Das vezes em que o backtest previu essa direção nessa antecedência, quantas aconteceram."],
          ["Faixa 10–90%", `PLD previsto − p90 do erro até PLD previsto − p10 do erro, com os erros do backtest desde mar/2025 na mesma antecedência (RISK-22). Em M+1 hoje: erro de ${sn(D.confianca[0].erro_p10, 1)} a ${sn(D.confianca[0].erro_p90, 1)}. É em R$ fixos e não depende da direção.`]]) },
      { id: "backtest", titulo: "Como foi testado (backtest)", html: `<p>O backtest simula alguém na rodada da RV0 do mês-alvo (M+1) ou de meses anteriores (M+2 a M+6), desde julho de 2024. Do mês-alvo só entram o DECOMP médio realizado (o simulador mede o desvio, não prevê o DECOMP) e o calendário. Toda premissa vem de dias ou meses anteriores à data.</p>` +
        lista([["Data", "Rodada da RV0 do mês-alvo (1 mês de antecedência) ou de meses antes (2 a 6 meses)."], ["Vale e ponta", "Horas do vale no piso e prêmio da ponta: média dos 14 dias antes da data, por tipo de dia (o padrão do simulador)."],
          ["Outras horas", "Desconto: média dos 12 meses encerrados antes da data (meses com DECOMP acima do piso)."], ["DECOMP", "O DECOMP médio realizado do mês; o erro de prever o DECOMP não entra."], ["Sem ajuste", "Nenhuma edição manual e sensibilidade de ponta em 0%."],
          ["Erros e faixa", "Só de meses-alvo já encerrados na data."], ["Escolhas", "A janela de 14 dias e a forma de cada premissa foram escolhidas comparando alternativas nos mesmos meses: essa comparação é dentro da amostra."]]) +
        `<h3>Leitura das telas DES</h3><p>RISK-20: barra = desvio que aconteceu (PLD oficial − DECOMP), na cor da direção; losango = desvio previsto; faixa neutra ±5; ✓/✗ = direção certa ou errada. RISK-21: linhas = o que previu, colunas = o que veio; na diagonal, os acertos. RISK-23: "só DECOMP" é o erro de supor PLD = DECOMP. Hoje, em M+1: erro médio ${rs(m1.erro, 1)} contra ${rs(m1.dec, 1)}.</p>` +
        `<h3>Comparações que definiram o método</h3>` + tabela(["Pergunta", "Resultado (erro médio do mês, mar/2025–set/2026)", "Tipo"], [
          ["Quatro premissas ou três?", "Empatam em todos os horizontes (M+1 15,8 × 15,8); ficou com três (R45)", "Fora da amostra"],
          ["Horas no piso numa conta só (20 horas)?", "Pior a partir de M+2 (24,1 → 30,6): fora do vale o piso é raro e não persiste (R44, R45)", "Fora da amostra"],
          ["Desconto das outras horas: janela ou média longa?", "Média dos 12 meses melhor em todos os horizontes (M+1 15,8 → 14,5; M+2 24,1 → 20,8) (R46)", "Fora da amostra"],
          ["Desconto: um número ou um por tipo de dia?", "Um número igual ou melhor (M+1 14,5 → 13,7; M+2 20,8 → 20,0; M+3 25,3 → 24,4) (R51)", "Fora da amostra"],
          ["Horas no piso: janela ou média longa?", "Janela de 14 dias a melhor em M+1 (14,5); médias longas erram para cima (R47)", "Fora da amostra"],
          ["Ponta: preço ou prêmio?", "Prêmio (15,8) melhor que o preço da janela (19,7) (D058)", "Fora da amostra"],
          ["Ponta: qual janela?", "Isolando a ponta: 14 dias a melhor em M+1 (5,5), média de 12 meses a melhor em M+2 (6,3); mantida a janela de 14 dias (R48)", "Oráculo / dentro da amostra"],
          ["Qual janela de dias?", "M+1: 7 dias 16,0 · 14 dias 15,8 · 30 dias 19,4 · 60 dias 18,8", "Dentro da amostra"]]) +
        tabela(["Rótulo", "Significado"], [["Fora da amostra", "Previsão feita só com o que existia na data"], ["Dentro da amostra", "Escolha feita e avaliada no mesmo período"], ["Oráculo", "Usa um dado do futuro para medir um limite"]]) },
      { id: "onde-errou", titulo: "Onde errou: premissas na RV0", html: `<p>RISK-24 compara, mês a mês e por tipo de dia, o que o simulador usaria na rodada da RV0 do mês (média dos 14 dias anteriores: a premissa da previsão de 1 mês) com o que aconteceu no mês. Na ponta, o anel é o DECOMP realizado do mês mais o prêmio da janela: separa o erro da premissa do erro do DECOMP. Só meses encerrados.</p>` },
      { id: "nivel", titulo: "PLD do dia e revisões (MON)", html: `<p>RISK-1: em cima, a média das 24 horas de cada dia do DESSEM e o DECOMP (PLD semanal da revisão vigente, com limites); embaixo, o PLD hora a hora no mesmo eixo de dias. Na revisão e no mês, cada revisão leva um rótulo com as datas de sábado a sexta, o DECOMP e o DESSEM médio dos dias mostrados; em 3 meses, RV, o mês do PMO quando muda e DECOMP · DESSEM; no ano e no histórico, a faixa do mínimo ao máximo horário de cada dia e a média. Faixas alternadas = uma revisão.</p><p>RISK-2: as últimas revisões do DECOMP com o DECOMP, o DESSEM médio, o desvio e as horas do vale no piso por dia. A linha de decisão do Monitor traz o PLD médio de hoje, o desvio da semana em curso e o do mês até o último deck; o primeiro item é o resultado do simulador (tela SIM).</p>` },
      { id: "pld-dia-proto", titulo: "PLD do dia num gráfico só (MON, protótipo)", html: `<p>RISK-26 mostra num gráfico só o que o RISK-1 mostra em dois. Cada dia é um símbolo: a barra vai do mínimo ao máximo horário do dia; o traço azul é a média do vale (8h–15h) e o vermelho, a média da ponta (18h–21h); o ponto é a média do dia, ligado aos vizinhos. O DECOMP aparece em degraus (constante dentro da semana operativa) e o piso, tracejado. As faixas alternadas são as revisões, com o DECOMP, o DESSEM médio dos dias mostrados e o desvio no topo (seta e cor). Fundo mais escuro = fim de semana ou feriado. Dias calculados do deck (sem PLD publicado) têm a barra tracejada e o ponto vazado. Com muitos dias, os traços de vale e ponta somem; no histórico longo, cada barra é uma semana. "ver horário" troca os símbolos pela linha hora a hora, na mesma escala.</p>` },
      { id: "precos-hora", titulo: "Preços por hora (MON)", html: `<p>RISK-25: o PLD de cada hora nos quatro submercados (SE/CO, S, NE, N) e os spreads NE − SE/CO e N − SE/CO, em R$/MWh. Hoje e ontem têm 24 linhas; 7 e 30 dias, uma linha por hora de cada dia, a mais recente em cima, com rolagem dentro do painel. Em destaque, as horas no piso do ano; marca azul à esquerda = vale (8h–15h), vermelha = ponta (18h–21h). No fim, média, mínimo e máximo de cada coluna no horizonte. Hoje = ${dataBr(ULT)}; ${notaCalc || "PLD publicado pela CCEE"}.</p>` },
      { id: "blocos", titulo: "Desvio por bloco de horas (MON)", html: `<p>RISK-3 e RISK-4: DESSEM − DECOMP vigente, separado na contribuição de cada bloco à média do mês (ou do dia): vale 8h–15h, ponta 18h–21h e demais horas; o ponto é o desvio total. Mês civil; DECOMP do mês = média das semanas vigentes ponderada pelos dias. O mês em curso aparece claro e tracejado: média do realizado até o último deck. Sem fev–mar/2023 (decks ausentes).</p>` },
      { id: "resumo", titulo: "Resumo para a mesa (SIM)", html: `<p>RISK-6 resume a simulação: PLD previsto e desvio; direção com o acerto histórico (desde mar/2025, regime atual; "pouco histórico" = menos de 5 previsões da mesma direção); faixa provável 10–90%; de onde vem o desvio (vale no piso, outras horas, ponta, com o peso de cada um) e a comparação com o prêmio de ponta de 12 meses; estresse de ponta; e quando a previsão muda (RV0). Alertas: DECOMP perto do piso (com o histórico dos meses no piso), prêmio da ponta afastado da média de 12 meses e premissas editadas.</p>` },
      { id: "historico", titulo: "Histórico das premissas (SIM)", html: `<p>RISK-7, RISK-8 e RISK-9: média dos ${D.premissas_hist.janela} dias anteriores a cada data, por tipo de dia (o último ponto é hoje), e embaixo cada dia da janela. Na ponta, as médias móveis de 7, 14, 30 e 60 dias e a média dos 12 meses encerrados; cada etiqueta mostra o preço médio, o prêmio sobre o DECOMP e o preço equivalente com o DECOMP digitado, e clicar nela usa aquele prêmio no simulador. O desconto das outras horas aparece numa curva só; trecho tracejado claro = janela com DECOMP no piso (espaço médio abaixo de R$ 20 ou ao menos um quarto dos dias no piso), em que o % não é comparável. É só informativo: o simulador usa a média de 12 meses.</p>` },
      { id: "premissas-mes", titulo: "Premissas mês a mês (SIM)", html: `<p>RISK-10: média dos dias de cada mês civil, por tipo de dia: horas do vale no piso, desconto das outras horas e preço da ponta, com o DECOMP médio. No topo, a premissa no simulador agora e a média dos 12 meses encerrados (na ponta, o prêmio médio de 12 meses aplicado ao DECOMP digitado). No backtest, a média de 12 meses acertou mais no desconto das outras horas e na ponta a partir de 2 meses de antecedência; nas horas no piso e na ponta em 1 mês, a janela de 14 dias acertou mais.</p>` },
      { id: "perfis", titulo: "Perfil dia a dia e mapa de calor (PER)", html: `<p>RISK-11: uma linha por dia do mês escolhido, na cor do tipo de dia, e a média do mês tracejada, para PLD, DECOMP, carga líquida, demanda (bruta e sem MMGD) e renovável (com e sem MMGD, e gerada). RISK-12: o mesmo mês como mapa de calor, dia × hora, de um só tom; a escala vai do percentil 5 ao 95 do mês para um pico isolado não apagar o resto; à direita, a média de cada dia, embaixo, a de cada hora. Os últimos 6 meses estão disponíveis. O SIN não tem PLD: para preço, o SIN mostra o SE/CO.</p>` },
      { id: "perfil-ano", titulo: "Perfil por mês do ano (PER)", html: `<p>RISK-13: um painel por mês do ano (grade de 6 × 2), uma linha por ano (média dos dias do mês por hora), com escala comum aos 12 meses. O painel tem filtros próprios, independentes da barra da tela PER: variável, submercado (PLD e DECOMP não têm SIN: mostra o SE/CO, D084), modo e anos; clicar num ano esconde ou mostra a linha dele nos 12 gráficos, e a escala comum é recalculada com os anos visíveis; ou, na outra visão, uma barra por ano com a média de todas as horas do mês. Demanda e renovável com MMGD têm quebra em 29/04/2023 (antes, a MMGD vinha descontada da demanda): compare só de 2024 em diante. Renovável gerada é saída do DESSEM, já com cortes.</p>` },
      { id: "horas-piso", titulo: "Horas no piso por hora (PER)", html: `<p>RISK-14: % das horas de cada hora do dia em que o PLD ficou no piso (ou abaixo, ou acima, do DECOMP vigente), por tipo de dia, no mês escolhido; embaixo, por semana operativa (sábado a sexta; RV = revisão do DECOMP vigente na semana), só com os dias de cada semana que caem no mês.</p>` },
      { id: "mecanismos", titulo: "Mecanismos do vale (PER)", html: `<p>RISK-15, só SE/CO: por que o vale vai ao piso. Em cima, a folga hidráulica no vale do dia útil (SIN, GW médios de 8h a 15h): necessária = demanda − renovável prevista − térmica mínima; mínima revelada = hidráulica do DESSEM nos dias com o vale todo no piso (resultado do modelo). Quando as linhas se encostam, o vale vai ao piso e sobra renovável cortada. Embaixo, o % dos dias úteis com o SE acoplado ao Norte no vale e o valor da água de Belo Monte: na cheia do Xingu a água de Belo Monte perde valor e, com o SE acoplado ao Norte, o vale do SE vai ao piso (mar/2026). Valor da água a partir de abr/2025 (formato anterior do deck não lido).</p>` },
      { id: "indicadores", titulo: "Indicadores por ano (IND)", html: `<p>RISK-16: GW médios e PLD médio no ano inteiro ou num trimestre: carga líquida no vale e na ponta, rampa (carga líquida às 19h − às 12h), demanda sem MMGD, renovável com MMGD no vale e PLD médio, da ponta e do vale (no SIN, o PLD do SE/CO). O ano corrente é acumulado até o último deck. Demanda e renovável com MMGD não se comparam antes de 29/04/2023 (a MMGD passou a entrar como usina).</p>` },
      { id: "contribuicao", titulo: "Contribuição e horas por tipo de dia (IND)", html: `<p>RISK-17: para cada tipo de dia e faixa horária, a contribuição ao desvio médio do período = desvio médio da célula × peso das suas horas no período; a soma das células dá o desvio médio do período. À direita, as horas por dia abaixo do DECOMP (parte escura = no piso) e acima. Feriado = dia de semana sem patamar pesado no deck.</p>` },
      { id: "ponta-mes", titulo: "Preço da ponta por mês e dispersão (IND)", html: `<p>RISK-18: média das horas de 18h a 21h de cada mês, por tipo de dia, com a faixa do menor ao maior dia e o DECOMP médio; o mês corrente é parcial. RISK-19: cada hora de ponta do mês selecionado; as bolhas juntam horas de preço parecido (o tamanho é o número de horas) e as linhas marcam os percentis 10, 50 e 90 e o DECOMP médio.</p>` },
      { id: "decisoes", titulo: "Decisões que definem o método", html: tabela(["ID", "Decisão", "Motivo", "Situação"], [
          ["D017", "Desvio = PLD DESSEM médio − DECOMP médio do mês civil, com limites", "É o que a mesa compara", "Decidido"], ["D031", "Simulador v1: premissas recentes por tipo de dia aplicadas ao DECOMP informado", "Simples e melhor que as alternativas testadas", "Decidido"],
          ["D048", "Dias sem PLD publicado: calculado do deck pela regra oficial", "Diferença máxima de R$ 0,01", "Decidido"], ["D054", "Vale de 8h a 15h", "8h no piso com mais frequência que 15h", "Decidido"], ["D055", "Horas no piso numa conta só", "Pior fora da amostra", "Rejeitada"],
          ["D057", "Três premissas, janela de 14 dias, um mês por vez, antecedência pela RV0", "Mesma qualidade, mais simples", "Decidido"], ["D058", "Ponta em preço para o usuário, prêmio na conta", "Intuitivo sem perder qualidade", "Decidido"],
          ["D061", "Desconto das outras horas pela média dos 12 meses", "Estrutural; erro menor em todos os horizontes", "Decidido"], ["D087", "Desconto das outras horas: um número só para os três tipos de dia", "Uma curva para acompanhar; backtest igual ou melhor", "Decidido"],
          ["D063", "Sensibilidade de ponta só no dia útil, régua de 5% a 100% (padrão: 5% dos dias no p90 da ponta do mês)", "É onde a ponta pesa", "Decidido"], ["D064", "Ponta na janela de 14 dias, com acompanhamento das janelas de 7, 30, 60 dias e 12 meses", "14 dias é o melhor em M+1", "Decidido"],
          ["—", "Janela de 14 dias", "Escolhida na mesma amostra do backtest", "Em teste"]]) },
      { id: "limites", titulo: "Limitações conhecidas", html: lista([["Viradas", "O simulador repete o que aconteceu nas últimas semanas. Viradas de regime não são antecipadas (março de 2026: cheia de Belo Monte com o SE acoplado ao Norte)."],
          ["Viés", "Com o piso no vale crescendo em 2026, a janela fica atrasada; a ponta tem sido subestimada."], ["DECOMP no piso", "Com espaço quase zero, os descontos em % ficam instáveis; por isso o das outras horas vem da média de 12 meses e a tela mostra o efeito em R$."],
          ["Prêmio", "Quase não houve mês de prêmio no período testado: quando o simulador prevê prêmio, ainda não há acerto para mostrar."], ["Amostra", "Cerca de 20 meses no regime atual: as margens de acerto são de uns ±10 pontos."],
          ["Calendário", "Feriados nacionais dos meses ainda sem deck a conferir com o calendário de patamares da CCEE; piso de 2027 ainda não publicado."], ["Submercados", "O simulador é só SE/CO; o acompanhamento mostra os quatro submercados."]]) },
      { id: "glossario", titulo: "Glossário", html: `<dl class="glossario">${[["PLD", "Preço de Liquidação das Diferenças, calculado pela CCEE a partir do custo marginal dos seus próprios decks, limitado ao piso e ao teto do ano."], ["DESSEM", "Modelo de programação diária, semi-horário; a CCEE usa o DESSEM para o PLD horário."],
          ["DECOMP", "Modelo semanal, por patamar de carga; a CCEE publica o PLD semanal de cada revisão."], ["RV0, revisão", "Rodadas semanais do DECOMP dentro do mês operativo; a RV0 é a primeira e sai na sexta antes da semana que contém o dia 1º."],
          ["Semana operativa", "De sábado a sexta."], ["Piso", `PLD mínimo do ano (${rs(cal[0].piso, 2)} em 2026).`], ["Espaço", "DECOMP − piso: quanto o preço ainda pode cair."], ["Prêmio da ponta", "Média de PLD − DECOMP do dia nas horas de 18h a 21h."],
          ["M+1, M+2", "Antecedência da previsão: 1 mês se a RV0 do mês já saiu, e assim por diante."], ["Deck", "Conjunto de arquivos de entrada e saída de uma rodada oficial."], ["MMGD", "Micro e minigeração distribuída."]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>` },
    ]);
  }

  // =====================================================================================================
  // MESA: resumo e alertas
  // =====================================================================================================
  function resumo(el) {
    const s = simular(), lin = D.dias_nivel.SE, u = lin[lin.length - 1], dm = D.desvio_mensal.find(r => r.sub === "SE" && r.mes === ultMes);
    QC.kpis(el, [
      { r: `PLD previsto ${rot(s.c.mes)} · M+${s.c.h}`, v: n(s.r.pld, 1), d: `${seta(s.r.delta)} ${sn(s.r.delta, 1)} · faixa ${n(s.r.lo)}–${n(s.r.hi)} · DEC ${n(s.DEC)}`, tom: tomDir(s.r.dir) },
      { r: `PLD hoje ${ddmm(u[0])} · SE/CO`, v: n(u[1], 1), d: `${seta(u[1] - u[2])} ${sn(u[1] - u[2], 1)} sobre DECOMP ${n(u[2], 1)}`, tom: tom(u[1] - u[2]) },
      { r: `Desvio ${rot(ultMes)} até ${ddmm(ULT)}`, v: sn(dm.delta, 1), d: `vale ${sn(dm.vale, 0)} · ponta ${sn(dm.ponta, 0)} · demais ${sn(dm.demais, 0)}`, tom: tom(dm.delta) },
    ]);
    // PLD diário dos últimos dias: barra = média do dia; linha = máximo horário da ponta (18h–21h); DECOMP em degrau e piso
    EST.mSub = valido(EST.mSub, SUBS_PRECO, "SE");
    const ctl = mk("div", "risk-ctl risk-ctl-mesa"), gb = mk("div"), leg = mk("div");
    ctl.append(mk("span", "risk-barra-r", "PLD diário · R$/MWh"), abas(SUBS_PRECO, EST.mSub, v => { EST.mSub = v; guardar(); desenharDiario(); }, "Submercado do PLD diário"));
    el.append(ctl, gb, leg);
    legenda(leg, [["color-mix(in srgb, var(--accent) 55%, transparent)", "Média do dia"], ["var(--risk-ponta)", "Máx. da ponta", "l"], ["var(--ink-2)", "DECOMP", "t"], ["var(--ink-3)", "Piso", "t"]]);
    function desenharDiario() {
      limpar(gb);
      const sub = EST.mSub, todas = (D.dias_nivel || {})[sub] || [];
      const dias = todas.slice(-30).map(r => { const pf = perfilDia(sub, r[0]), pv = pf ? PONTA_H.map(x => pf.pld[x]).filter(v => v != null) : [];
        return { d: r[0], med: r[1], dec: r[2], piso: r[3], tipo: r[5], pmax: pv.length ? Math.max(...pv) : null, hmax: pv.length ? PONTA_H[PONTA_H.map(x => pf.pld[x]).indexOf(Math.max(...pv))] : null }; });
      G(gb, 150, (svg, w, hh) => {
        const m = { l: 34, r: 6, t: 8, b: 18 }, N = dias.length;
        if (!N) { S(svg, "text", { x: w / 2, y: hh / 2, "text-anchor": "middle" }, "sem dados"); return; }
        // um pico isolado da ponta não achata o resto: o eixo vai até ~1,15 × o percentil 85 da ponta; acima disso, ▲ no topo
        const pm = dias.map(x => x.pmax).filter(v => v != null).sort((a, b) => a - b), q85 = pm.length ? pm[Math.floor((pm.length - 1) * 0.85)] : 0;
        const teto = Math.max(...dias.flatMap(x => [x.med, x.dec]), q85 * 1.15);
        const ax = eixo(0, teto, 3), yv = v => m.t + (hh - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a)), y = v => Math.max(m.t, yv(v));
        const bw = (w - m.l - m.r) / N, x0 = i => m.l + i * bw, xc = i => x0(i) + bw / 2;
        ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 4, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
        dias.forEach((x, i) => S(svg, "rect", { x: x0(i) + bw * 0.15, y: y(x.med), width: Math.max(1, bw * 0.7), height: Math.max(0.5, y(0) - y(x.med)), fill: "color-mix(in srgb, var(--accent) 55%, transparent)" }));
        const degrau = k => dias.map((x, i) => `${i ? "L" : "M"}${x0(i)},${y(x[k])}L${x0(i + 1)},${y(x[k])}`).join("");
        S(svg, "path", { d: degrau("piso"), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1, "stroke-dasharray": "2 3" });
        S(svg, "path", { d: degrau("dec"), fill: "none", stroke: "var(--ink-2)", "stroke-width": 1.2, "stroke-dasharray": "4 3" });
        let d = "", pen = false; dias.forEach((x, i) => { if (x.pmax == null) { pen = false; return; } d += `${pen ? "L" : "M"}${xc(i)},${y(x.pmax)}`; pen = true; });
        if (d) S(svg, "path", { d, fill: "none", stroke: "var(--risk-ponta)", "stroke-width": 1.6, "stroke-linejoin": "round" });
        dias.forEach((x, i) => { if (x.pmax == null) return; if (x.pmax > ax.b) S(svg, "text", { x: xc(i), y: m.t + 7, "text-anchor": "middle", style: "fill:var(--risk-ponta);font-size:9px" }, "▲");
          else S(svg, "circle", { cx: xc(i), cy: y(x.pmax), r: Math.min(2.4, bw / 3), fill: "var(--risk-ponta)" }); });
        let ultX = -1e9;
        dias.forEach((x, i) => { const novo = i === 0 || x.d.endsWith("-01"), t = novo ? `${x.d.slice(8, 10)}/${x.d.slice(5, 7)}` : x.d.slice(8, 10);
          if ((novo || i % 5 === 0 || i === N - 1) && xc(i) - ultX > t.length * 6.4 + 4) { S(svg, "text", { x: xc(i), y: hh - 5, "text-anchor": "middle", class: novo ? "forte" : null }, t); ultX = xc(i); } });
        dias.forEach((x, i) => { const a = S(svg, "rect", { x: x0(i), y: m.t, width: bw, height: hh - m.t - m.b, fill: "transparent", class: "risk-alvo" });
          dicaEm(a, `<b>${dataBr(x.d)} ${diaSem(x.d)}</b>${x.tipo ? " · " + x.tipo : ""} · ${SUBN[sub]}<br>média do dia ${rs(x.med, 1)}<br>máx. da ponta ${x.pmax == null ? "—" : `${rs(x.pmax, 1)} (${x.hmax}h)`}<br>DECOMP ${n(x.dec, 1)} · média − DECOMP ${sn(x.med - x.dec, 1)}${x.pmax == null ? "" : `<br>máx. ponta − DECOMP ${sn(x.pmax - x.dec, 1)}`}`);
          alvoR(a, () => inspDia(sub, x.d)); });
      }, `PLD diário dos últimos ${dias.length} dias, ${SUBN[sub]}: média do dia e máximo da ponta`);
    }
    desenharDiario();
    nota(el, "Últimos 30 dias; ponta 18h–21h; ▲ = máximo acima da escala (valor na dica). Clique num dia para o perfil horário.");
  }
  function alertas() {
    const q = ESTADO.rodada.slice(0, 16), out = [];
    const lin = D.dias_nivel.SE; let k = 0; for (let i = lin.length - 1; i >= 0 && lin[i][4] >= 8; i--) k++;
    if (k >= 2) out.push({ quando: q, texto: `SE/CO: vale todo no piso (8 de 8 h) há ${k} dias seguidos, até ${ddmm(ULT)}`, tela: 1, nivel: k >= 5 ? "alto" : "normal" });
    const prox = cal.find(c => !c.rv0_publicada);
    if (prox && difDias(ULT, prox.rv0) <= 21) out.push({ quando: q, texto: `RV0 de ${rot(prox.mes)} prevista para ~${ddmm(prox.rv0)}: a previsão de ${rot(prox.mes)} passa de M+${prox.h} a M+1`, tela: 2 });
    const pj = JANS[D.janela_padrao]["útil"].premio_ponta, p12 = D.ponta_janelas["útil"].ref12.premio, forte = Math.abs(pj - p12) > Math.max(50, 0.5 * Math.abs(p12));
    if (Math.abs(pj - p12) > 0.25 * Math.abs(p12)) out.push({ quando: q, texto: `Prêmio da ponta útil em 14 dias (${sn(pj, 0)}) ${pj < p12 ? "abaixo" : "acima"} da média de 12 meses (${sn(p12, 0)})`, tela: 2, nivel: forte ? "alto" : "normal" });
    const mec = [...D.mecanismos_se].sort((a, b) => (a.mes < b.mes ? -1 : 1)), mu = mec[mec.length - 1], ma = mec[mec.length - 2];
    if (mu && ma && mu.acopl != null && ma.acopl != null && mu.acopl - ma.acopl >= 0.15) out.push({ quando: q, texto: `SE acoplado ao Norte em ${pct(mu.acopl)} dos dias úteis de ${rot(mu.mes)} (${rot(ma.mes)}: ${pct(ma.acopl)})`, tela: 3 });
    const ub = D.backtest.filter(r => r.h === 1).sort((a, b) => (a.mes < b.mes ? -1 : 1)).pop();
    if (ub) out.push({ quando: q, texto: `${rot(ub.mes)}: simulador previu ${n(ub.prev, 1)} em M+1, oficial ${n(ub.real, 1)} (erro ${sn(ub.erro, 1)})`, tela: 5, nivel: Math.abs(ub.erro) > 2 * D.desempenho[0].erro ? "alto" : "normal" });
    return out.slice(0, 4);
  }

  // fita: além do sinal (PLD previsto do mês simulado e desvio sobre o DECOMP), o que a mesa olha no dia
  function fita() {
    const lin = D.dias_nivel.SE, u = lin[lin.length - 1], gA = gruposRev("SE").slice(-1)[0], dm = D.desvio_mensal.find(r => r.sub === "SE" && r.mes === ultMes);
    return [{ r: `PLD SE/CO ${ddmm(u[0])} × DECOMP`, v: n(u[1], 2), d: u[1] - u[2] },
      { r: `Desvio SE ${gA.nome}`, v: `${n(gA.dessem, 1)} × ${n(gA.decomp, 1)}`, d: gA.dessem - gA.decomp },
      { r: `Desvio SE ${rot(ultMes)}`, v: `${n(dm.dessem, 1)} × ${n(dm.decomp, 1)}`, d: dm.delta }];
  }

  Mesa.registrar({
    cod: "RISK", nome: "Risk Lab DESSEM", desc: "PLD horário do DESSEM contra o DECOMP e simulador do PLD médio do mês",
    sinal, resumo, alertas, fita, mesa: { ordem: 5 },
    telas: [
      { cod: "MON", nome: "Monitor", decisao: false, montar: area => telaMON(area) },
      { cod: "SIM", nome: "Simulador", montar: area => telaSIM(area) },
      { cod: "PER", nome: "Perfis", decisao: false, montar: area => telaPER(area) },
      { cod: "IND", nome: "Indicadores", montar: area => telaIND(area) },
      { cod: "DES", nome: "Desempenho", montar: area => telaDES(area) },
      { cod: "MET", nome: "Metodologia", montar: area => telaMET(area) },
    ],
  });
})();
