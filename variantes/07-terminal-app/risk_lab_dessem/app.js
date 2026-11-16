/* Variante 07 · Terminal (app real) · risk_lab_dessem/app.js
   Porta do web/risk_lab_dessem/app.js do Quant Energia App para o visual de terminal (padrão v2.0). Mesmas contas,
   abas, filtros, tooltips e legendas; o que muda: os dados vêm de window.RLD (dados.js, FICTÍCIOS) em vez de fetch,
   e cada gráfico é desenhado por grafico() na largura real da caixa (redesenha ao mudar o tamanho), em vez de um
   viewBox fixo. As funções de texto e SVG (n, sn, pct, rot, rotLongo, dataBr, S, eixo, dicaEm, grafico) vêm de
   migracao-terminal/padrao/graficos.js. */
(function () {
  const PAGINA = document.getElementById("simulador") ? "simulador" : "acompanhamento";
  // a caixa da dica: terminal.js só a cria no DOMContentLoaded, e este script já liga dicas antes disso
  if (!document.getElementById("dica")) { const d = document.createElement("div"); d.className = "dica"; d.id = "dica"; d.hidden = true; document.body.append(d); }
  const D = window.RLD;
  if (!D) {
    const el = document.getElementById("erro");
    el.hidden = false;
    el.textContent = "Dados da página indisponíveis (dados.js não carregou). Rode: uv run qe risk_lab_dessem publicar";
    return;
  }
  const SUBN = { SIN: "SIN", SE: "SE/CO", S: "S", NE: "NE", N: "N" };
  // filtro de submercado por bloco (D084): preço só por submercado (padrão SE/CO); variáveis físicas também no SIN
  const SUBS_PRECO = [["SE", "SE/CO"], ["S", "S"], ["NE", "NE"], ["N", "N"]], SUBS_FIS = [["SIN", "SIN"], ...SUBS_PRECO];
  const ehPreco = v => v === "pld" || v === "decomp";
  const subDe = (sub, v) => (sub === "SIN" && ehPreco(v) ? "SE" : sub);
  const rotSub = (sub, v) => (sub === "SIN" && ehPreco(v) ? "SE/CO (SIN não tem PLD)" : SUBN[sub]);
  const DIR = { desconto: "Desconto", neutro: "Neutro", "prêmio": "Prêmio" };
  // vale 8h–15h (8 horas; D054) e ponta 18h–21h
  const VALE_H = [8, 9, 10, 11, 12, 13, 14, 15], PONTA_H = [18, 19, 20, 21], NV = VALE_H.length, NP = PONTA_H.length;
  const BLOCOS = [["vale", "Vale 8h–15h", "var(--b-vale)"], ["ponta", "Ponta 18h–21h", "var(--b-ponta)"], ["demais", "Demais horas", "var(--b-demais)"]];
  const TIPOS = [["útil", "Dia útil", "var(--t-util)"], ["sábado", "Sábado", "var(--t-sab)"], ["domingo/feriado", "Domingo/feriado", "var(--t-dom)"]];
  const FAIXAS = [["Vale 8–15h", VALE_H], ["Ponta 18–21h", PONTA_H], ["Demais horas", [...Array(24).keys()].filter(hh => !VALE_H.includes(hh) && !PONTA_H.includes(hh))]];
  const classe = d => (d < -5 ? "desconto" : d > 5 ? "prêmio" : "neutro");
  const corAno = a => `var(--a${a}, var(--ink))`;

  function abas(id, itens, atual, aoMudar) {
    const box = document.getElementById(id); box.replaceChildren();
    itens.forEach(([v, rotulo]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = rotulo; b.dataset.v = v; b.setAttribute("aria-pressed", String(String(v) === String(atual))); box.appendChild(b); });
    box.onclick = e => { const b = e.target.closest("button"); if (!b) return; box.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); aoMudar(b.dataset.v); };
  }
  // gráfico responsivo: troca o conteúdo da caixa por um grafico() de altura `h` (px); desenhar(svg, W, H) na largura real
  function G(alvo, h, desenhar) {
    const box = typeof alvo === "string" ? document.getElementById(alvo) : alvo;
    box.querySelectorAll(":scope > .graf").forEach(c => { if (typeof _obs !== "undefined" && _obs) _obs.unobserve(c); });
    box.replaceChildren();
    const c = grafico(box, desenhar, null, box.getAttribute("aria-label") || undefined);
    c.style.height = h + "px";
    return c;
  }
  const meses = D.perfis ? Object.keys(D.perfis.pld.SE).sort() : [D.referencia[0].ultimo_dia.slice(0, 7)];
  const ultMes = meses[meses.length - 1];
  const anos = [...new Set(meses.map(m => +m.slice(0, 4)))];
  const ref = D.referencia[0];
  // dias com deck do DESSEM ainda sem PLD publicado pela CCEE: PLD calculado do CMO do deck pela regra oficial (D048)
  const diaSeguinte = s => { const t = new Date(s + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
  const notaCalc = ref.ultimo_publicado && ref.ultimo_publicado < ref.ultimo_dia
    ? ` · PLD de ${dataBr(diaSeguinte(ref.ultimo_publicado)).slice(0, 5)} a ${dataBr(ref.ultimo_dia).slice(0, 5)} calculado do deck pela regra da CCEE (publicação oficial pendente)` : "";

  // ---------- premissas no topo: datas da base e versão do modelo ----------
  const E = D.estado;
  document.getElementById("meta").innerHTML = [
    `<span>Dados até <b>${dataBr(E.ultimo_deck)}</b></span>`,
    `<span>PLD publicado pela CCEE até <b>${dataBr(E.ultimo_publicado)}</b></span>`,
    E.calculados ? `<span>${dataBr(E.calculados[0]).slice(0, 5)} a ${dataBr(E.calculados[1]).slice(0, 5)}: PLD calculado do deck</span>` : null,
    `<span>Modelo ${E.modelo} · vale ${E.vale[0]}h–${E.vale[1]}h · ponta ${E.ponta[0]}h–${E.ponta[1]}h</span>`,
    PAGINA === "simulador" && E.rodada ? `<span>Rodada de ${dataBr(E.rodada.slice(0, 10))} ${E.rodada.slice(11, 16)}</span>` : null,
    `<span class="atualizado">publicado em ${dataBr(E.gerado_em.slice(0, 10))} ${E.gerado_em.slice(11, 16)}</span>`,
  ].filter(Boolean).join("");

  // ---------- gráfico de linhas genérico (o do app, com rótulos do eixo X que não se encostam) ----------
  // series: [{nome, cor, pts: [[x, y]...], larg, tracejado, opac}]; xs: valores de x; rotX(x) rótulo
  function linhasA(svg, o) {
    const w = o.w, h = o.h, m = { l: o.ml ?? 42, r: o.mr ?? 8, t: o.mt ?? 10, b: 24 };
    const ys = o.series.flatMap(s => s.pts.map(p => p[1])).filter(v => v != null && isFinite(v));
    if (!ys.length) { S(svg, "text", { x: w / 2, y: h / 2, "text-anchor": "middle" }, "sem dados no período"); return; }
    const ax = eixo(o.y0 != null ? Math.min(o.y0, ...ys) : Math.min(...ys), o.y1 != null ? Math.max(o.y1, ...ys) : Math.max(...ys), o.nt || 5, o.justo);
    const xs = o.xs, ix = new Map(xs.map((v, i) => [String(v), i]));
    const x = o.centro ? (v => m.l + (ix.get(String(v)) + 0.5) * (w - m.l - m.r) / xs.length)
      : (v => m.l + (xs.length === 1 ? 0.5 : ix.get(String(v)) / (xs.length - 1)) * (w - m.l - m.r));
    const y = v => m.t + (h - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
    (o.sombras || []).forEach(([a, b, cor]) => S(svg, "rect", { x: x(a) - 4, y: m.t, width: x(b) - x(a) + 8, height: h - m.t - m.b, fill: cor }));
    ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, (o.fmtY || n)(t)); });
    let ultX = -1e9;
    xs.forEach((v, i) => { const r = o.rotX(v, i); if (!r) return; const t = r.t ?? r, px = x(v);
      if (px - ultX < Math.max(14, String(t).length * 6.4 + 4)) return;
      S(svg, "text", { x: px, y: h - 6, "text-anchor": "middle", class: r.forte ? "forte" : null }, t); ultX = px; });
    if (o.antes) o.antes({ x, y, m, w, h, ix });
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
    const bw = o.centro ? (w - m.l - m.r) / xs.length : (w - m.l - m.r) / Math.max(1, xs.length - 1);
    const foco = S(svg, "line", { y1: m.t, y2: h - m.b, stroke: "var(--ink-3)", opacity: 0 });
    xs.forEach(v => {
      const a = S(svg, "rect", { x: x(v) - bw / 2, y: m.t, width: bw, height: h - m.t - m.b, fill: "transparent" });
      a.addEventListener("pointerenter", () => { foco.setAttribute("x1", x(v)); foco.setAttribute("x2", x(v)); foco.setAttribute("opacity", 0.6); });
      a.addEventListener("pointerleave", () => foco.setAttribute("opacity", 0));
      dicaEm(a, () => o.dica(v));
      if (o.clique) { a.style.cursor = "pointer"; a.addEventListener("click", () => o.clique(v)); }
    });
  }

  const VARS = [["pld", "PLD", "R$/MWh"], ["decomp", "DECOMP vigente", "R$/MWh"], ["carga_liquida", "Carga líquida", "MW"], ["demanda", "Demanda bruta", "MW"], ["demanda_sem_mmgd", "Demanda sem MMGD", "MW"],
    ["renov_com_mmgd", "Renovável com MMGD", "MW"], ["renov_sem_mmgd", "Renovável sem MMGD", "MW"], ["renov_saida", "Renovável gerada (saída)", "MW"]];
  let VAR = "pld";
  const HORAS = [...Array(24).keys()];
  const SOMBRAS = [[8, 15, "var(--sombra-vale)"], [18, 21, "var(--sombra-ponta)"]];
  const mesAnt = (() => { const a = +ultMes.slice(0, 4), m = +ultMes.slice(5, 7); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`; })();
  const DSEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const diaSem = s => DSEM[new Date(s + "T12:00:00Z").getUTCDay()];

  // semana operativa (sábado a sexta) e revisão em curso
  const inicioSemana = d => { const t = new Date(d + "T12:00:00Z"); const k = (t.getUTCDay() + 1) % 7; t.setUTCDate(t.getUTCDate() - k); return t.toISOString().slice(0, 10); };
  const semAtual = inicioSemana(ref.ultimo_dia);
  const infoSemana = ini => { for (const sb of ["SE"]) for (const m of [ultMes, mesAnt]) { const s = (((D.semanas_perfil || {})[sb] || {})[m] || []).find(x => x.inicio === ini); if (s) return s; } return null; };
  const rvAtual = (infoSemana(semAtual) || {}).rv;
  const cartao = (box, titulo, dir) => { const card = document.createElement("div"); card.className = "mini"; card.innerHTML = `<div class="mini-ttl"><b>${titulo}</b>${dir ? `<span>${dir}</span>` : ""}</div>`; const g = document.createElement("div"); card.appendChild(g); box.appendChild(card); return g; };

  function paginaAcompanhamento() {
    let SUB_N = "SE", SUB_M = "SE", SUB_H = "SE", SUB_PD = "SIN", SUB_P = "SIN", SUB_I = "SIN";
    const notaSub = (id, sub, v) => { document.getElementById("nota-sub-" + id).textContent = sub === "SIN" && ehPreco(v) ? "PLD e DECOMP não têm SIN: mostrando o SE/CO." : ""; };
    abas("abas-sub-nivel", SUBS_PRECO, SUB_N, v => { SUB_N = v; desenharNivel(); });
    abas("abas-sub-mes", SUBS_PRECO, SUB_M, v => { SUB_M = v; desenharMensal(); desenharContrib(); });
    abas("abas-sub-hora", SUBS_PRECO, SUB_H, v => { SUB_H = v; desenharHora(); });
    abas("abas-sub-pdia", SUBS_FIS, SUB_PD, v => { SUB_PD = v; desenharPerfilDia(); });
    abas("abas-sub-perfil", SUBS_FIS, SUB_P, v => { SUB_P = v; desenharPerfil(); });
    abas("abas-sub-ind", SUBS_FIS, SUB_I, v => { SUB_I = v; desenharIndicadores(); });

    abas("abas-var", VARS.map(v => [v[0], v[1]]), VAR, v => { VAR = v; desenharPerfil(); });
    // ---------- perfil horário por mês do ano, todos os anos (recolhido) ----------
    let VISAO = "hora";  // D077: "hora" = perfil horário por ano; "mes" = média do mês, uma barra por ano
    abas("abas-visao", [["hora", "Por hora do dia"], ["mes", "Média do mês por ano"]], VISAO, v => { VISAO = v; desenharPerfil(); });
    function painelMesAnos(box, mm, o) {
      const [, , un] = VARS.find(v => v[0] === VAR), sub = subDe(SUB_P, VAR);
      const fmtV = v => (un === "MW" ? n(v / 1000, 1) : n(v, 0));
      G(cartao(box, o.titulo), 170, (svg, w, h) => {
        const m = { l: 34, r: 6, t: 14, b: 20 };
        const ax = eixo(o.y0, o.y1, 3, true), y = v => m.t + (h - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
        ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 4, y: y(t) + 3, "text-anchor": "end" }, un === "MW" ? n(t / 1000, t % 1000 ? 1 : 0) : n(t)); });
        const bw = (w - m.l - m.r) / anos.length, base = y(Math.max(ax.a, Math.min(0, ax.b)));
        anos.forEach((a, i) => {
          const k = `${a}-${String(mm).padStart(2, "0")}`, v = (D.media_mes[VAR][sub] || {})[k], xc = m.l + (i + 0.5) * bw;
          S(svg, "text", { x: xc, y: h - 6, "text-anchor": "middle" }, String(a).slice(2));
          if (v == null) return;
          const parcial = k === ultMes;
          const r = S(svg, "rect", { x: xc - bw * 0.32, y: Math.min(y(v), base), width: bw * 0.64, height: Math.max(1, Math.abs(y(v) - base)), fill: corAno(a), opacity: parcial ? 0.5 : 0.9, stroke: parcial ? corAno(a) : null, "stroke-dasharray": parcial ? "3 2" : null });
          S(svg, "text", { x: xc, y: Math.min(y(v), base) - 3, "text-anchor": "middle", class: "valor", style: "font-size:9px" }, fmtV(v));
          dicaEm(r, `<b>${o.titulo} de ${a}</b>${parcial ? " (parcial)" : ""}<br>média do mês: ${un === "MW" ? n(v / 1000, 1) + " GW" : "R$ " + n(v, 1)}`);
        });
      });
    }
    function painelMes(box, mm, o) {
      const dd = D.perfis[VAR][subDe(SUB_P, VAR)] || {}, [, , un] = VARS.find(v => v[0] === VAR);
      const ss = anos.map(a => { const k = `${a}-${String(mm).padStart(2, "0")}`; const v = dd[k]; if (!v) return null;
        return { nome: String(a), cor: corAno(a), pts: HORAS.map(hh => [hh, v[hh]]), larg: 1.6 }; }).filter(Boolean);
      const fmtY = un === "MW" ? (v => n(v / 1000, v % 1000 ? 1 : 0)) : n;
      G(cartao(box, o.titulo), 170, (svg, w, h) => linhasA(svg, { w, h, ml: 34, mr: 6, xs: HORAS, series: ss, sombras: SOMBRAS, fmtY, y0: o.y0, y1: o.y1, nt: 3, justo: true, rotX: hh => (hh % 6 === 0 ? hh + "h" : null),
        dica: hh => `<b>${o.titulo} · ${hh}h</b><br>` + [...ss].reverse().map(s => { const v = s.pts[hh][1]; return `${s.nome}: ${v == null ? "—" : un === "MW" ? n(v / 1000, 1) + " GW" : "R$ " + n(v, 1)}`; }).join("<br>") }));
    }
    // ---------- perfil horário do mês, dia a dia (D068): uma linha por dia, cor pelo tipo de dia, média do mês ----------
    const PDIA = D.perfis_dia || {};
    let VARD = "carga_liquida", MES_PD = null, UltimoAuto = true;  // padrão: carga líquida e o último dia disponível destacado
    const DESTAQUE = new Set();
    abas("abas-var-dia", VARS.map(v => [v[0], v[1]]), VARD, v => { VARD = v; desenharPerfilDia(); });
    const selPD = document.getElementById("sel-mes-pdia");
    selPD.addEventListener("change", () => { MES_PD = selPD.value; DESTAQUE.clear(); UltimoAuto = true; desenharPerfilDia(); });
    document.getElementById("leg-pdia").addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (!b) return;
      const i = +b.dataset.i; if (i < 0) DESTAQUE.clear(); else if (DESTAQUE.has(i)) DESTAQUE.delete(i); else DESTAQUE.add(i); desenharPerfilDia(); });
    function desenharPerfilDia() {
      const [, nomeV, un] = VARS.find(v => v[0] === VARD), porMes = ((PDIA[VARD] || {})[subDe(SUB_PD, VARD)]) || {};
      const ms = Object.keys(porMes).sort().reverse();
      if (!ms.length) return;
      if (!MES_PD || !ms.includes(MES_PD)) MES_PD = ms[0];
      selPD.replaceChildren(...ms.map(m => { const o = document.createElement("option"); o.value = m; o.textContent = rot(m) + (m === ultMes ? " (corrente)" : ""); o.selected = m === MES_PD; return o; }));
      const M = porMes[MES_PD], ND = M.dias.length;
      if (UltimoAuto) { DESTAQUE.clear(); DESTAQUE.add(ND - 1); UltimoAuto = false; }
      const corT = t => (TIPOS.find(x => x[0] === t) || [, , "var(--ink-3)"])[2];
      const C = D.calor[VARD][subDe(SUB_PD, VARD)][MES_PD], media = C.hora;  // médias prontas do Python (publicacao.calor)
      const temD = DESTAQUE.size > 0;
      const series = M.dias.map((d, i) => ({ nome: d, cor: corT(M.tipos[i]), larg: DESTAQUE.has(i) ? 2.6 : 1.1, opac: temD ? (DESTAQUE.has(i) ? 1 : 0.15) : 0.55, pts: HORAS.map(hh => [hh, M.v[i][hh]]), rotFim: DESTAQUE.has(i) ? d.slice(8, 10) : null }));
      series.push({ nome: "Média", cor: "var(--ink)", larg: 2.4, tracejado: true, pts: HORAS.map(hh => [hh, media[hh]]), rotFim: "média" });
      const fmtY = un === "MW" ? (v => n(v / 1000, v % 1000 ? 1 : 0)) : n, fmtV = v => (v == null ? "—" : un === "MW" ? n(v / 1000, 1) + " GW" : "R$ " + n(v, 1));
      document.getElementById("tt-pdia").textContent = `Perfil horário do mês, dia a dia · ${nomeV} (${un === "MW" ? "GW" : un}) · ${rotSub(SUB_PD, VARD)}`;
      notaSub("pdia", SUB_PD, VARD);
      G("g-pdia", 320, (svg, w, h) => linhasA(svg, { w, h, ml: 44, mr: 52, xs: HORAS, series, sombras: SOMBRAS, fmtY, y0: VARD === "pld" || VARD === "decomp" ? 0 : null, nt: 5, justo: true, rotFim: true,
        rotX: hh => (hh % 3 === 0 ? hh + "h" : null),
        dica: hh => { const vs = M.v.map((r, i) => [r[hh], i]).filter(([v]) => v != null); if (!vs.length) return `<b>${hh}h</b>`;
          const mx = vs.reduce((a, b) => (b[0] > a[0] ? b : a)), mn = vs.reduce((a, b) => (b[0] < a[0] ? b : a));
          return `<b>${rot(MES_PD)} · ${hh}h</b><br>média ${fmtV(media[hh])}<br>maior: ${fmtV(mx[0])} (dia ${M.dias[mx[1]].slice(8, 10)}) · menor: ${fmtV(mn[0])} (dia ${M.dias[mn[1]].slice(8, 10)})` +
            [...DESTAQUE].map(i => `<br>dia ${M.dias[i].slice(8, 10)} ${diaSem(M.dias[i])}: ${fmtV(M.v[i][hh])}`).join(""); } }));
      document.getElementById("leg-pdia").innerHTML = M.dias.map((d, i) => `<button type="button" data-i="${i}" style="--c:${corT(M.tipos[i])}" aria-pressed="${DESTAQUE.has(i)}" title="${dataBr(d)} ${diaSem(d)} · ${M.tipos[i] || ""}">${d.slice(8, 10)}</button>`).join("") +
        (temD ? '<button type="button" class="media" data-i="-1">limpar</button>' : "");
      desenharCalor(M, C, un, fmtV, nomeV);
      document.getElementById("leg-pdia-nota").innerHTML = `Cor do dia: <span style="color:var(--t-util)">dia útil</span> · <span style="color:var(--t-sab)">sábado</span> · <span style="color:var(--t-dom)">domingo/feriado</span>; tracejado = média dos ${ND} dias. Faixas: vale 8h–15h e ponta 18h–21h.` + (MES_PD === ultMes ? ` Mês corrente até ${dataBr(ref.ultimo_dia)}.` : "") + ` Últimos 6 meses disponíveis.`;
    }

    // mapa de calor do mês selecionado (D078): linhas = dias, colunas = horas, valor em cada célula; escala de um só tom
    // (de --calor-0 a --calor, como no padrão v2.0) cortada nos percentis 5 e 95 do mês para um pico isolado não apagar o resto
    function desenharCalor(M, C, un, fmtV, nomeV) {
      // à direita, separada por uma linha vertical, a coluna da média do dia (D080)
      const ND = M.dias.length, m = { l: 62, r: 6, t: 30, b: 6 }, ch = 17, hT = m.t + (ND + 1) * ch + 8 + m.b;
      const lo = C.lo, hi = C.hi, tt = v => Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1)));
      const cor = v => `color-mix(in srgb, var(--calor) ${Math.round(8 + 80 * tt(v))}%, var(--calor-0))`;
      const txt = v => (un === "MW" ? n(v / 1000, 1) : n(v, 0));
      const corT = t => (TIPOS.find(x => x[0] === t) || [, , "var(--ink-3)"])[2];
      G("g-calor", hT, (svg, w, h) => {
        const vao = 10, cwM = 56, cw = (w - m.l - m.r - vao - cwM) / 24, xM = w - m.r - cwM;
        HORAS.forEach(hh => { const vale = VALE_H.includes(hh), ponta = PONTA_H.includes(hh);
          S(svg, "text", { x: m.l + (hh + 0.5) * cw, y: m.t - 8, "text-anchor": "middle", class: vale || ponta ? "forte" : null, style: ponta ? "fill:var(--b-ponta)" : vale ? "fill:var(--b-vale)" : null }, hh + "h"); });
        S(svg, "text", { x: xM + cwM / 2, y: m.t - 8, "text-anchor": "middle", class: "forte" }, "média");
        S(svg, "line", { x1: xM - vao / 2, x2: xM - vao / 2, y1: m.t - 4, y2: h - m.b, stroke: "var(--ink-3)" });
        const celula = (x, yy, larg, v, dica) => {
          const r = S(svg, "rect", { x: x + 0.5, y: yy + 0.5, width: larg - 1, height: ch - 1, fill: cor(v) });
          S(svg, "text", { x: x + larg / 2, y: yy + ch * 0.7, "text-anchor": "middle", style: `font-size:9.5px;pointer-events:none;fill:${tt(v) > 0.6 ? "var(--surface)" : "var(--ink)"}` }, txt(v));
          dicaEm(r, dica);
        };
        const linha = (rotulo, corRot, vals, yy, dica, forte, dicaM, vm, nh) => {
          S(svg, "text", { x: m.l - 6, y: yy + ch * 0.68, "text-anchor": "end", class: forte ? "forte" : null, style: corRot ? `fill:${corRot}` : null }, rotulo);
          vals.forEach((v, hh) => { if (v != null) celula(m.l + hh * cw, yy, cw, v, dica(hh, v)); });
          if (vm != null) celula(xM, yy, cwM, vm, dicaM(vm, nh));
        };
        M.dias.forEach((d, i) => linha(`${d.slice(8, 10)} ${diaSem(d)}`, corT(M.tipos[i]), M.v[i], m.t + i * ch, (hh, v) => `<b>${dataBr(d)} ${diaSem(d)} · ${hh}h</b> · ${M.tipos[i] || ""}<br>${nomeV}: ${fmtV(v)}`, DESTAQUE.has(i),
          (v, nh) => `<b>${dataBr(d)} ${diaSem(d)} · média do dia</b> · ${M.tipos[i] || ""}<br>${nomeV}: ${fmtV(v)}` + (nh < 24 ? ` (${nh} horas)` : ""), C.dia[i], C.nh[i]));
        const media = C.hora, nTot = C.nh.reduce((a, b) => a + b, 0);
        const ym = m.t + ND * ch + 8;
        S(svg, "line", { x1: m.l, x2: w - m.r, y1: ym - 4, y2: ym - 4, stroke: "var(--ink-3)" });
        linha("média", "var(--ink)", media, ym, (hh, v) => `<b>Média do mês · ${hh}h</b><br>${nomeV}: ${fmtV(v)}`, true,
          () => `<b>Média do mês</b> · todas as horas<br>${nomeV}: ${fmtV(C.mes)} (${nTot} horas)`, C.mes, nTot);
        [...DESTAQUE].forEach(i => { if (i < ND) S(svg, "rect", { x: m.l, y: m.t + i * ch, width: w - m.l - m.r, height: ch, fill: "none", stroke: "var(--ink)", "stroke-width": 1.4, "pointer-events": "none" }); });
      });
      document.getElementById("tt-calor").textContent = `Mapa de calor: dia × hora · ${nomeV} · ${rotLongo(MES_PD)}`;
      document.getElementById("leg-calor").textContent = `${un === "MW" ? "GW" : "R$/MWh"}. Cor de um só tom, do mais fraco (≤ ${txt(lo)}) ao âmbar forte (≥ ${txt(hi)}): a escala vai do percentil 5 ao 95 do mês, para um pico isolado não apagar o resto. Dia da semana na cor do tipo de dia; o dia destacado no gráfico acima aparece contornado. Horas do vale (8h–15h) em azul e da ponta (18h–21h) em vermelho no cabeçalho. À direita, a média das horas de cada dia; na última linha, a média de cada hora no mês, e no canto a média de todas as horas do mês.`;
    }

    function desenharPerfil() {
      const [, nomeV, un] = VARS.find(v => v[0] === VAR);
      document.getElementById("tt-perfil").textContent = `Perfil horário por mês do ano, todos os anos · ${nomeV} (${un === "MW" ? "GW" : un}) · ${rotSub(SUB_P, VAR)}`;
      notaSub("perfil", SUB_P, VAR);
      const dd = D.perfis[VAR][subDe(SUB_P, VAR)] || {};
      const todos = Object.values(dd).flat().filter(v => v != null);
      const y0 = VAR === "pld" || VAR === "decomp" ? 0 : Math.min(...todos), y1 = Math.max(...todos);
      const box = document.getElementById("g-perfil"); box.replaceChildren();
      if (VISAO === "mes") {
        const ms = Object.values(D.media_mes[VAR][subDe(SUB_P, VAR)] || {}).filter(v => v != null);
        const z0 = VAR === "pld" || VAR === "decomp" ? 0 : Math.min(...ms) * 0.9, z1 = Math.max(...ms);
        for (let mm = 1; mm <= 12; mm++) painelMesAnos(box, mm, { y0: z0, y1: z1, titulo: MES[mm - 1] });
      } else for (let mm = 1; mm <= 12; mm++) painelMes(box, mm, { y0, y1, titulo: MES[mm - 1] });
      document.getElementById("sub-perfil").textContent = VISAO === "mes" ? "Um painel por mês, uma barra por ano com a média do mês (todas as horas), escala comum a todos os painéis." : "Um painel por mês, uma linha por ano, escala comum a todos os painéis.";
      document.getElementById("leg-perfil").innerHTML = anos.map(a => `<span><i class="l" style="border-color:${corAno(a)}"></i>${a}</span>`).join("") +
        '<span><i style="background:var(--sombra-vale);outline:1px solid var(--rule)"></i>Vale 8h–15h</span><span><i style="background:var(--sombra-ponta);outline:1px solid var(--rule)"></i>Ponta 18h–21h</span>';
      const avisos = [`${rot(ultMes)} parcial: dados até ${dataBr(ref.ultimo_dia)}.`];
      if (["demanda", "renov_com_mmgd"].includes(VAR)) avisos.push("Quebra em 29/04/2023: antes, a MMGD vinha descontada da demanda e não aparecia na renovável. Compare só de 2024 em diante.");
      document.getElementById("aviso-perfil").textContent = avisos.join(" ");
      document.getElementById("leg-perfil-nota").textContent = (VISAO === "mes" ? "Média de todas as horas do mês; barra clara e tracejada = mês parcial. " : "Média dos dias do mês por hora do dia. ") + (VAR === "renov_saida" ? "Renovável gerada é saída do DESSEM, já com cortes; a prevista é entrada do modelo." : "");
    }

    // ---------- indicadores por ano (P02) ----------
    const PERIODOS_IND = [["ano", "Ano inteiro"], ["Q1", "Q1 jan–mar"], ["Q2", "Q2 abr–jun"], ["Q3", "Q3 jul–set"], ["Q4", "Q4 out–dez"]];
    let PERI = "ano";
    abas("abas-per-ind", PERIODOS_IND, PERI, v => { PERI = v; desenharIndicadores(); });
    function desenharIndicadores() {
      notaSub("ind", SUB_I, "pld");
      document.getElementById("tt-ind").textContent = `Indicadores por ano · ${SUBN[SUB_I]}${SUB_I === "SIN" ? " (PLD do SE/CO)" : ""} · ${PERIODOS_IND.find(p => p[0] === PERI)[1]}`;
      const Gw = v => (v == null ? "—" : n(v / 1000, 1)), P = v => (v == null ? "—" : n(v, 1));
      const linhasI = D.indicadores[SUB_I][PERI], ultAno = anos[anos.length - 1];
      document.querySelector("#t-ind tbody").innerHTML = linhasI.map(r => {
        const ult = r.ano === ultAno;
        return `<tr class="${ult ? "destaque" : ""}"><td>${r.ano}${ult ? "<small>acumulado</small>" : ""}</td><td class="n">${r.meses}</td><td class="n">${Gw(r.cl_vale)}</td><td class="n">${Gw(r.cl_ponta)}</td><td class="n">${r.rampa == null ? "—" : sn(r.rampa / 1000, 1)}</td><td class="n">${Gw(r.demanda)}</td><td class="n">${Gw(r.renov_vale)}</td><td class="n">${P(r.pld)}</td><td class="n">${P(r.pld_ponta)}</td><td class="n">${P(r.pld_vale)}</td></tr>`;
      }).join("");
    }

    // ---------- PLD médio do dia: DESSEM × DECOMP, com as revisões marcadas (D044, D045) ----------
    let PER_N = "mes";
    const REV = Object.fromEntries((D.revisoes || []).map(r => [r[0], r]));
    const somaDias = (ini, k) => { const t = new Date(ini + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
    abas("abas-nivel", [["rev", `Revisão atual (RV${rvAtual ?? "?"})`], ["mes", `Mês corrente (${rot(ultMes)})`], ["3m", "Últimos 3 meses"], ["ano", `No ano (${ultMes.slice(0, 4)})`], ["todo", "Todo o histórico"]], PER_N, v => { PER_N = v; desenharNivel(); });
    function desenharNivel() {
      let rs = (D.dias_nivel || {})[SUB_N] || [];
      const ult = rs.length ? rs[rs.length - 1][0] : ref.ultimo_dia;
      if (PER_N === "rev") { const sa = inicioSemana(ult); rs = rs.filter(r => inicioSemana(r[0]) === sa); }
      else if (PER_N === "mes") rs = rs.filter(r => r[0].startsWith(ult.slice(0, 7)));
      else if (PER_N === "ano") rs = rs.filter(r => r[0].startsWith(ult.slice(0, 4)));
      else if (PER_N === "3m") { const d = new Date(ult + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 3); const c = d.toISOString().slice(0, 10); rs = rs.filter(r => r[0] > c); }
      document.getElementById("tt-nivel").textContent = `PLD médio do dia: DESSEM e DECOMP · ${SUBN[SUB_N]}`;
      const xs = rs.map(r => r[0]), u = rs[rs.length - 1] || [];
      // revisões do período: índices do primeiro e do último dia, médias de DECOMP e DESSEM nos dias mostrados
      const grupos = [];
      rs.forEach((r, i) => { const ini = inicioSemana(r[0]); let g = grupos[grupos.length - 1];
        if (!g || g.ini !== ini) { g = { ini, i0: i, i1: i, dias: [] }; grupos.push(g); }
        g.i1 = i; g.dias.push(r); });
      grupos.forEach(g => { const rv = REV[g.ini]; g.rv = rv ? rv[1] : null; g.pmo = rv ? rv[2] : null; g.fim = somaDias(g.ini, 6);
        g.decomp = g.dias.reduce((a, r) => a + r[2], 0) / g.dias.length; g.dessem = g.dias.reduce((a, r) => a + r[1], 0) / g.dias.length;
        g.emCurso = g.fim > ult; g.nome = g.rv == null ? "RV ?" : `RV${g.rv}`; });
      const porDia = new Map(); grupos.forEach(g => g.dias.forEach(r => porDia.set(r[0], g)));
      const modo = PER_N === "mes" || PER_N === "rev" ? "completo" : PER_N === "3m" ? "compacto" : "nenhum";
      const longo = xs.length > 400;
      const passoX = Math.max(1, Math.ceil(xs.length / 12));
      const rotXN = (d, i) => (longo ? (d.slice(5, 10) === "01-01" || i === 0 ? { t: d.slice(0, 4), forte: true } : null)
        : modo === "nenhum" ? (i % passoX === 0 ? dataBr(d).slice(0, 5) + "/" + d.slice(2, 4) : null)
        : modo === "compacto" ? (d.endsWith("-01") || i === 0 ? { t: rot(d.slice(0, 7)), forte: true } : null)
        : d.slice(8, 10));
      const descr = g => `${g.nome} · ${dataBr(g.ini).slice(0, 5)}–${dataBr(g.fim).slice(0, 5)}${g.emCurso ? ` · em curso (${g.dias.length} ${g.dias.length === 1 ? "dia" : "dias"})` : ""}`;
      G("g-nivel", modo === "nenhum" ? 270 : 320, (svg, W, Hh) => linhasA(svg, { w: W, h: Hh, mt: modo === "nenhum" ? 10 : 58, mr: 80, xs, y0: 0,
        antes: ({ x, m, w, h }) => {
          if (modo === "nenhum") return;
          const meio = xs.length > 1 ? (x(xs[1]) - x(xs[0])) / 2 : 20;
          divisoesDia(svg, xs.map(d => x(d) - meio), m, h);
          const niveis = [-1e9, -1e9];
          grupos.forEach((g, k) => {
            const xa = Math.max(m.l, x(xs[g.i0]) - meio), xb = Math.min(w - m.r, x(xs[g.i1]) + meio);
            if (k % 2 === 0) S(svg, "rect", { x: xa, y: m.t, width: xb - xa, height: h - m.t - m.b, fill: "var(--vazio)", opacity: 0.55 });
            S(svg, "line", { x1: xa, x2: xa, y1: 4, y2: h - m.b, stroke: "var(--ink-3)", opacity: 0.7 });
            S(svg, "line", { x1: xa, x2: xa, y1: h - m.b, y2: h - m.b + 12, stroke: "var(--ink-2)", "stroke-width": 1.6 });
            let l1, l2;
            if (modo === "completo") { l1 = descr(g); l2 = `DECOMP ${n(g.decomp, 0)} · DESSEM ${n(g.dessem, 0)}`; }
            else { const mudou = k === 0 || (grupos[k - 1].pmo !== g.pmo); l1 = g.nome + (mudou && g.pmo ? " " + MES[+g.pmo.slice(5, 7) - 1] : ""); l2 = `${n(g.decomp, 0)}·${n(g.dessem, 0)}`; }
            const larg = Math.max(l1.length, l2.length) * (modo === "completo" ? 6.3 : 5.9);
            let xt = xa + 3, anc = null; if (xt + larg > w - m.r) { xt = w - m.r; anc = "end"; }
            const ini = anc ? xt - larg : xt;
            const nv = ini > niveis[0] + 6 ? 0 : 1; niveis[nv] = anc ? xt : xt + larg;
            const y0 = 12 + nv * 24;
            S(svg, "text", { x: xt, y: y0, class: "forte", "text-anchor": anc }, l1);
            S(svg, "text", { x: xt, y: y0 + 11, "text-anchor": anc }, l2);
          });
        },
        series: [{ nome: "Piso", cor: "var(--ink-3)", larg: 1, tracejado: true, pts: rs.map(r => [r[0], r[3]]) },
          { nome: "DECOMP", cor: "var(--ink-3)", larg: longo ? 1.2 : 2, pts: rs.map(r => [r[0], r[2]]), rotFim: "DECOMP " + n(u[2]) },
          { nome: "DESSEM", cor: "var(--accent)", larg: longo ? 1.2 : 2, pts: rs.map(r => [r[0], r[1]]), rotFim: "DESSEM " + n(u[1]) }],
        rotFim: true,
        rotX: rotXN, centro: true,
        dica: d => { const r = rs.find(x => x[0] === d), g = porDia.get(d);
          return `<b>${dataBr(d)} ${diaSem(d)}</b>${r[5] ? " · " + r[5] : ""}<br>DESSEM ${n(r[1], 1)} · DECOMP ${n(r[2], 1)}<br>desvio ${sn(r[1] - r[2], 1)} · ${r[4]} h do vale no piso` +
            (g ? `<br><b>${descr(g)}</b><br>média da revisão no período: DECOMP ${n(g.decomp, 1)} · DESSEM ${n(g.dessem, 1)}` : ""); } }));
      desenharNivelHora(rs, grupos, modo, rotXN, descr, porDia);
      document.getElementById("leg-nivel").textContent = modo === "completo" ? "Rótulo de cada revisão: datas de sábado a sexta, DECOMP (PLD semanal da revisão) e DESSEM médio dos dias mostrados. Faixas alternadas = uma revisão."
        : modo === "compacto" ? "Rótulo de cada revisão: RV (e o mês do PMO quando muda) e DECOMP · DESSEM médios dos dias mostrados. Datas e detalhes na dica. Faixas alternadas = uma revisão."
        : "Revisão de cada dia na dica.";
    }

    // divisão entre dias no eixo X (como no gráfico do topo): tique curto; com até ~45 dias, também linha pontilhada clara (D049)
    function divisoesDia(svg, xsDia, m, h) {
      const linha = xsDia.length <= 45;
      xsDia.forEach((xx, i) => {
        if (i === 0) return;
        if (linha) S(svg, "line", { x1: xx, x2: xx, y1: m.t, y2: h - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "2 3", opacity: 0.35 });
        S(svg, "line", { x1: xx, x2: xx, y1: h - m.b, y2: h - m.b + (linha ? 8 : 5), stroke: "var(--ink-2)", "stroke-width": 1 });
      });
    }

    // gráfico horário alinhado embaixo do diário: cada dia ocupa a mesma largura, dividida em 24 horas (D046)
    function desenharNivelHora(rs, grupos, modo, rotX, descr, porDia) {
      const horas = new Map(); Object.values((D.dias_perfil || {})[SUB_N] || {}).flat().forEach(d => horas.set(d.data, d.pld));
      G("g-nivel-hora", 250, (svg, w, h) => {
        const m = { l: 42, r: 80, t: 10, b: 24 }, N = rs.length;
        if (!N) { S(svg, "text", { x: w / 2, y: h / 2, "text-anchor": "middle" }, "sem dados no período"); return; }
        const curto = modo !== "nenhum";
        const dw = (w - m.l - m.r) / N, xd = i => m.l + i * dw, xc = i => xd(i) + dw / 2, xh = (i, hh) => xd(i) + (hh + 0.5) * dw / 24;
        let vals = [];
        if (curto) rs.forEach(r => { const v = horas.get(r[0]); if (v) vals.push(...v); }); else rs.forEach(r => vals.push(r[6], r[7]));
        vals = vals.filter(v => v != null);
        const ax = eixo(0, Math.max(100, ...vals)), y = v => m.t + (h - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
        if (curto) grupos.forEach((g, k) => {
          const xa = xd(g.i0), xb = xd(g.i1 + 1);
          if (k % 2 === 0) S(svg, "rect", { x: xa, y: m.t, width: xb - xa, height: h - m.t - m.b, fill: "var(--vazio)", opacity: 0.55 });
          S(svg, "line", { x1: xa, x2: xa, y1: m.t, y2: h - m.b, stroke: "var(--ink-3)", opacity: 0.7 });
          S(svg, "line", { x1: xa, x2: xa, y1: h - m.b, y2: h - m.b + 12, stroke: "var(--ink-2)", "stroke-width": 1.6 });
        });
        ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
        if (curto) divisoesDia(svg, rs.map((_, i) => xd(i)), m, h);
        S(svg, "path", { d: rs.map((r, i) => `${i ? "L" : "M"}${xd(i)},${y(r[3])}L${xd(i + 1)},${y(r[3])}`).join(""), fill: "none", stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
        let fim = null;
        if (curto) {
          let d = "", pen = false;
          rs.forEach((r, i) => { const v = horas.get(r[0]); if (!v) { pen = false; return; }
            v.forEach((z, hh) => { if (z == null) { pen = false; return; } d += `${pen ? "L" : "M"}${xh(i, hh)},${y(z)}`; pen = true; fim = [xh(i, hh), z]; }); });
          S(svg, "path", { d, fill: "none", stroke: "var(--accent)", "stroke-width": N > 40 ? 0.9 : 1.3, "stroke-linejoin": "round" });
        } else {
          const ok = rs.map((r, i) => [i, r]).filter(([, r]) => r[6] != null && r[7] != null);
          S(svg, "path", { d: ok.map(([i, r], k) => `${k ? "L" : "M"}${xc(i)},${y(r[7])}`).join("") + [...ok].reverse().map(([i, r]) => `L${xc(i)},${y(r[6])}`).join("") + "Z", fill: "color-mix(in srgb, var(--accent) 22%, transparent)" });
          S(svg, "path", { d: rs.map((r, i) => `${i ? "L" : "M"}${xc(i)},${y(r[1])}`).join(""), fill: "none", stroke: "var(--accent)", "stroke-width": 1.2 });
          fim = [xc(N - 1), rs[N - 1][1]];
        }
        if (fim) S(svg, "text", { x: w - m.r + 6, y: y(fim[1]) + 3, class: "forte", style: "fill:var(--accent)" }, "DESSEM " + n(fim[1]));
        let ultX = -1e9;
        rs.forEach((r, i) => { const lab = rotX(r[0], i); if (!lab) return; const t = lab.t ?? lab; if (xc(i) - ultX < Math.max(14, String(t).length * 6.4 + 4)) return;
          S(svg, "text", { x: xc(i), y: h - 6, "text-anchor": "middle", class: lab.forte ? "forte" : null }, t); ultX = xc(i); });
        const foco = S(svg, "line", { y1: m.t, y2: h - m.b, stroke: "var(--ink-3)", opacity: 0 });
        rs.forEach((r, i) => {
          const a = S(svg, "rect", { x: xd(i), y: m.t, width: dw, height: h - m.t - m.b, fill: "transparent" });
          const horaDe = e => { const b = svg.getBoundingClientRect(); const px = (e.clientX - b.left) / b.width * w; return Math.max(0, Math.min(23, Math.floor((px - xd(i)) / dw * 24))); };
          a.addEventListener("pointermove", e => { const xx = curto ? xh(i, horaDe(e)) : xc(i); foco.setAttribute("x1", xx); foco.setAttribute("x2", xx); foco.setAttribute("opacity", 0.6); });
          a.addEventListener("pointerleave", () => foco.setAttribute("opacity", 0));
          const g = porDia.get(r[0]);
          dicaEm(a, e => {
            if (!curto) return `<b>${dataBr(r[0])} ${diaSem(r[0])}</b><br>PLD horário: mínimo ${n(r[6], 1)} · média ${n(r[1], 1)} · máximo ${n(r[7], 1)}`;
            const hh = horaDe(e), v = (horas.get(r[0]) || [])[hh];
            return `<b>${dataBr(r[0])} ${diaSem(r[0])} · ${hh}h</b>${VALE_H.includes(hh) ? " · vale" : PONTA_H.includes(hh) ? " · ponta" : ""}<br>PLD ${v == null ? "—" : "R$ " + n(v, 1)}${v != null && v <= r[3] + 0.005 ? " (piso)" : ""}` + (g ? `<br>${descr(g)}` : "");
          });
        });
      });
    }

    // ---------- barras empilhadas por bloco ----------
    function legendaBlocos(id) { document.getElementById(id).innerHTML = BLOCOS.map(([, nome, cor]) => `<span><i style="background:${cor}"></i>${nome}</span>`).join("") + '<span><i class="p" style="background:var(--ink)"></i>Desvio total</span>'; }
    function empilhado(svg, rows, w, h, rotX, titulo) {
      const m = { l: 40, r: 6, t: 10, b: 24 };
      if (!rows.length) { S(svg, "text", { x: w / 2, y: h / 2, "text-anchor": "middle" }, "sem dados no período"); return; }
      const segs = rows.map(r => { let pos = 0, neg = 0; const s = BLOCOS.map(([k, , cor]) => { const v = r[k] || 0; let a, b; if (v >= 0) { a = pos; b = pos += v; } else { a = neg; b = neg += v; } return { a, b, cor }; }); return { r, s, pos, neg }; });
      const ax = eixo(Math.min(0, ...segs.map(d => Math.min(d.neg, d.r.delta))), Math.max(0, ...segs.map(d => Math.max(d.pos, d.r.delta))));
      const y = v => m.t + (h - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
      const bw = (w - m.l - m.r) / rows.length, x = i => m.l + i * bw;
      ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
      const larg = Math.max(1, bw * 0.72);
      let ultX = -1e9;
      segs.forEach((d, i) => {
        d.s.forEach(s => { if (s.a !== s.b) S(svg, "rect", { x: x(i) + (bw - larg) / 2, y: y(Math.max(s.a, s.b)), width: larg, height: Math.max(0.5, Math.abs(y(s.a) - y(s.b))), fill: s.cor, opacity: d.r.parcial ? 0.45 : null }); });
        if (d.r.parcial) { const topo = y(Math.max(d.pos, 0)), base = y(Math.min(d.neg, 0)); S(svg, "rect", { x: x(i) + (bw - larg) / 2, y: topo, width: larg, height: Math.max(1, base - topo), fill: "none", stroke: "var(--ink-2)", "stroke-dasharray": "3 2" }); }
        S(svg, "circle", { cx: x(i) + bw / 2, cy: y(d.r.delta), r: Math.max(1.6, Math.min(3, bw / 3)), fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1 });
        const lab = rotX(d.r, i), px = x(i) + bw / 2;
        if (lab && px - ultX >= Math.max(14, String(lab.t).length * 6.4 + 4)) { S(svg, "text", { x: px, y: h - 6, "text-anchor": "middle", class: lab.forte ? "forte" : null }, lab.t); ultX = px; }
        const alvo = S(svg, "rect", { x: x(i), y: m.t, width: bw, height: h - m.t - m.b, fill: "transparent" });
        dicaEm(alvo, `<b>${titulo(d.r)}</b><br>desvio ${sn(d.r.delta, 1)} R$/MWh<br>vale ${sn(d.r.vale, 1)} · ponta ${sn(d.r.ponta, 1)} · demais ${sn(d.r.demais, 1)}` + (d.r.extra || ""));
      });
    }
    legendaBlocos("leg-mes");
    let HIST = "todo", MES_DIAS = ultMes;
    abas("abas-hist", [["ano", `No ano (${ultMes.slice(0, 4)})`], ["12m", "Últimos 12 meses"], ["todo", "Todo o histórico"]], HIST, v => { HIST = v; desenharMensal(); });
    const selMes = document.getElementById("sel-mes-dias");
    selMes.addEventListener("change", () => { MES_DIAS = selMes.value; desenharMensal(); });
    function desenharMensal() {
      document.getElementById("tt-mes").textContent = `Desvio por bloco de horas · ${SUBN[SUB_M]}`;
      let dm = D.desvio_mensal.filter(r => r.sub === SUB_M).sort((a, b) => (a.mes < b.mes ? -1 : 1));
      if (HIST === "ano") dm = dm.filter(r => r.mes.startsWith(ultMes.slice(0, 4)));
      if (HIST === "12m") dm = dm.slice(-12);
      const curto = HIST !== "todo";
      const rowsM = dm.map(r => ({ ...r, extra: `<br>DECOMP ${n(r.decomp, 1)} · DESSEM ${n(r.dessem, 1)}` + (r.parcial ? `<br>mês em curso: realizado de ${r.dias} dias, até ${dataBr(ref.ultimo_dia)}` : "") }));
      G("g-mes", 260, (svg, w, h) => empilhado(svg, rowsM, w, h,
        r => (curto ? { t: rot(r.mes) + (r.parcial ? "*" : ""), forte: r.mes.endsWith("-01") } : r.mes.endsWith("-01") ? { t: r.mes.slice(0, 4), forte: true } : null), r => rotLongo(r.mes) + (r.parcial ? " (parcial)" : "")));
      const todosDias = ((D.dias_blocos || {})[SUB_M] || []);
      const mesesDias = [...new Set(todosDias.map(r => r.data.slice(0, 7)))].sort().reverse();
      if (!mesesDias.includes(MES_DIAS)) MES_DIAS = mesesDias[0] || ultMes;
      selMes.replaceChildren(...mesesDias.map(m => { const o = document.createElement("option"); o.value = m; o.textContent = rot(m) + (m === ultMes ? " (corrente)" : ""); o.selected = m === MES_DIAS; return o; }));
      const dd = todosDias.filter(r => r.data.startsWith(MES_DIAS)).sort((a, b) => (a.data < b.data ? -1 : 1));
      document.getElementById("tt-mes-dias").textContent = `${MESL[+MES_DIAS.slice(5, 7) - 1]} de ${MES_DIAS.slice(0, 4)}, por dia` + (MES_DIAS === ultMes ? ` · até ${dataBr(ref.ultimo_dia)}` : "");
      const rowsD = dd.map(r => ({ ...r, extra: `<br>DECOMP ${n(r.decomp, 1)} · DESSEM ${n(r.dessem, 1)}` }));
      G("g-mes-dias", 260, (svg, w, h) => empilhado(svg, rowsD, w, h,
        (r, i) => (i % Math.max(1, Math.ceil(dd.length / 8)) === 0 ? { t: r.data.slice(8, 10) } : null), r => `${dataBr(r.data)} · ${diaSem(r.data)}`));
    }

    // ---------- contribuição por faixa e tipo; contagem de horas ----------
    const PER_C = [["corrente", `Mês corrente (${rot(ultMes)})`], ["ultimo", "Último mês fechado"], ["3m", "Últimos 3 meses"], ["12m", "Últimos 12 meses"], ...Object.keys(D.contribuicao.SE).filter(k => k.startsWith("a")).map(k => [k, k.slice(1)])];
    let PERC = "3m";
    abas("abas-per-c", PER_C, PERC, v => { PERC = v; desenharContrib(); });
    // contribuição por tipo de dia × faixa (D067): conta feita no Python (publicacao.contribuicao)
    function desenharContrib() {
      const C = D.contribuicao[SUB_M][PERC], ms = C.meses;
      const per = ms.length ? (ms.length === 1 ? rotLongo(ms[0]) : `${rot(ms[0])} a ${rot(ms[ms.length - 1])}`) : "—";
      document.getElementById("tt-contrib").textContent = `Desvio por faixa horária e tipo de dia · ${SUBN[SUB_M]} · ${per}`;
      const COR = Object.fromEntries(TIPOS.map(([t, nomeT, cor]) => [t, { nomeT, cor }]));
      const linhasC = C.linhas.map(r => ({ ...r, t: r.tipo, f: r.faixa, ...COR[r.tipo] }));
      document.getElementById("tot-c").textContent = `total ${sn(C.total, 1)}`;
      G("g-contrib", 330, (g1, w, h) => {
        const m = { l: w < 480 ? 168 : 200, r: 46, t: 6, b: 18 }, rh = (h - m.t - m.b) / linhasC.length;
        const ax = eixo(Math.min(0, ...linhasC.map(r => r.contrib)), Math.max(0, ...linhasC.map(r => r.contrib)), 4);
        const xC = v => m.l + (w - m.l - m.r) * (v - ax.a) / (ax.b - ax.a);
        ax.t.forEach(t => { S(g1, "line", { x1: xC(t), x2: xC(t), y1: m.t, y2: h - m.b, stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(g1, "text", { x: xC(t), y: h - 4, "text-anchor": "middle" }, n(t)); });
        linhasC.forEach((r, i) => {
          const yy = m.t + i * rh;
          if (i % FAIXAS.length === 0) S(g1, "text", { x: 0, y: yy + rh * 0.7, class: "forte", style: `fill:${r.cor}` }, r.nomeT.replace("Domingo/feriado", "Dom./feriado"));
          S(g1, "text", { x: m.l - 6, y: yy + rh * 0.7, "text-anchor": "end" }, r.f);
          S(g1, "rect", { x: Math.min(xC(0), xC(r.contrib)), y: yy + rh * 0.18, width: Math.max(0.5, Math.abs(xC(r.contrib) - xC(0))), height: rh * 0.64, fill: r.cor });
          S(g1, "text", { x: r.contrib >= 0 ? xC(r.contrib) + 4 : xC(r.contrib) - 4, y: yy + rh * 0.7, "text-anchor": r.contrib >= 0 ? "start" : "end", class: "forte" }, sn(r.contrib, 1));
          const a = S(g1, "rect", { x: 0, y: yy, width: w, height: rh, fill: "transparent" });
          dicaEm(a, `<b>${r.nomeT} · ${r.f}</b><br>contribuição ${sn(r.contrib, 1)} R$/MWh<br>desvio médio da célula ${sn(r.medio, 1)} R$/MWh<br>${n(r.dias)} dias`);
        });
      });
      G("g-cont", 330, (g2, w, h) => {
        const m2 = { l: w < 480 ? 168 : 200, r: 30, t: 6, b: 18 }, rh = (h - m2.t - m2.b) / linhasC.length, maxH = Math.max(...FAIXAS.map(f => f[1].length));
        const xH = v => m2.l + (w - m2.l - m2.r) * v / maxH;
        for (let t = 0; t <= maxH; t += 2) { S(g2, "line", { x1: xH(t), x2: xH(t), y1: m2.t, y2: h - m2.b, stroke: "var(--rule)" }); S(g2, "text", { x: xH(t), y: h - 4, "text-anchor": "middle" }, t + "h"); }
        linhasC.forEach((r, i) => {
          const yy = m2.t + i * rh;
          if (i % FAIXAS.length === 0) S(g2, "text", { x: 0, y: yy + rh * 0.7, class: "forte", style: `fill:${r.cor}` }, r.nomeT.replace("Domingo/feriado", "Dom./feriado"));
          S(g2, "text", { x: m2.l - 6, y: yy + rh * 0.7, "text-anchor": "end" }, r.f);
          S(g2, "rect", { x: xH(0), y: yy + rh * 0.12, width: xH(r.nh) - xH(0), height: rh * 0.76, fill: "var(--vazio)" });
          S(g2, "rect", { x: xH(0), y: yy + rh * 0.12, width: xH(r.abaixo) - xH(0), height: rh * 0.36, fill: `color-mix(in srgb, ${r.cor} 45%, transparent)` });
          S(g2, "rect", { x: xH(0), y: yy + rh * 0.12, width: xH(r.piso) - xH(0), height: rh * 0.36, fill: r.cor });
          S(g2, "rect", { x: xH(0), y: yy + rh * 0.52, width: xH(r.acima) - xH(0), height: rh * 0.36, fill: "none", stroke: r.cor, "stroke-width": 1.2 });
          const a = S(g2, "rect", { x: 0, y: yy, width: w, height: rh, fill: "transparent" });
          dicaEm(a, `<b>${r.nomeT} · ${r.f}</b> (${r.nh} h por dia)<br>abaixo do DECOMP: ${n(r.abaixo, 1)} h/dia<br>no piso: ${n(r.piso, 1)} h/dia<br>acima do DECOMP: ${n(r.acima, 1)} h/dia`);
        });
      });
    }

    // ---------- horas no piso por hora e tipo ----------
    let MEDIDA = "piso", MESH = ultMes;
    abas("abas-medida", [["piso", "No piso"], ["abaixo", "Abaixo do DECOMP"], ["acima", "Acima do DECOMP"]], MEDIDA, v => { MEDIDA = v; desenharHora(); });
    function serieHora(a, idx) { return HORAS.map(hh => [hh, a && a[hh] && a[hh][0] ? 100 * a[hh][idx] / a[hh][0] : null]); }
    function desenharHora() {
      const idx = { piso: 1, abaixo: 2, acima: 3 }[MEDIDA], nomeM = { piso: "no piso", abaixo: "abaixo do DECOMP", acima: "acima do DECOMP" }[MEDIDA];
      const Hm = D.horas.mensal[SUB_H] || {}, ms = Object.keys(Hm).sort();
      if (!Hm[MESH]) MESH = ms[ms.length - 1];
      abas("abas-mes-h", ms.slice(-13).reverse().map(m => [m, rot(m)]), MESH, v => { MESH = v; desenharHora(); });
      document.getElementById("tt-hora").textContent = `Horas ${nomeM} por hora e tipo de dia · ${SUBN[SUB_H]} · ${rotLongo(MESH)}`;
      const ss = TIPOS.map(([t, nome, cor]) => ({ nome, cor, pts: serieHora(Hm[MESH] && Hm[MESH][t], idx), pontos: true }));
      G("g-hora", 240, (svg, w, h) => linhasA(svg, { w, h, xs: HORAS, series: ss, sombras: SOMBRAS, y0: 0, y1: 100, fmtY: v => v + "%", rotX: hh => hh + "h",
        dica: hh => `<b>${hh}h · ${rot(MESH)}</b><br>` + TIPOS.map(([t, nome]) => { const a = Hm[MESH] && Hm[MESH][t] && Hm[MESH][t][hh]; return `${nome}: ${a && a[0] ? n(100 * a[idx] / a[0]) + "% de " + a[0] + " h" : "—"}`; }).join("<br>") }));
      const Ws = (D.horas.semanal[SUB_H] || {})[MESH] || {}, sems = Object.keys(Ws).sort();
      const box = document.getElementById("g-semanas"); box.replaceChildren();
      document.getElementById("tt-sem-hora").textContent = `${rotLongo(MESH)} por semana operativa (revisão do DECOMP) · só os dias de cada semana que caem no mês`;
      if (!sems.length) { const p = document.createElement("p"); p.className = "leg"; p.textContent = "Sem revisões disponíveis para este mês."; box.appendChild(p); }
      sems.forEach(sm => {
        const Wk = Ws[sm];
        G(cartao(box, `RV${Wk.rv} · ${dataBr(sm).slice(0, 5)}`, `${Wk.dias} ${Wk.dias === 1 ? "dia" : "dias"}`), 150, (svg, w, h) => linhasA(svg, { w, h, ml: 34, xs: HORAS, series: TIPOS.map(([t, , cor]) => ({ cor, pts: serieHora(Wk[t], idx), larg: 1.8 })), sombras: SOMBRAS, y0: 0, y1: 100, nt: 2, fmtY: v => v + "%", rotX: hh => (hh % 6 === 0 ? hh + "h" : null),
          dica: hh => `<b>RV${Wk.rv} · semana de ${dataBr(sm)} · ${hh}h</b><br>` + TIPOS.map(([t, nome]) => { const a = Wk[t] && Wk[t][hh]; return `${nome}: ${a && a[0] ? n(100 * a[idx] / a[0]) + "% de " + a[0] + " h" : "—"}`; }).join("<br>") }));
      });
    }

    // ---------- mecanismos (SE/CO) ----------
    const MC = [...D.mecanismos_se].sort((a, b) => (a.mes < b.mes ? -1 : 1)).filter(r => r.mes >= "2024-07");
    const mxs = MC.map(r => r.mes), rotM = (mm, i) => (mm.endsWith("-01") || i === 0 ? { t: rot(mm), forte: true } : +mm.slice(5, 7) % 3 === 1 ? MES[+mm.slice(5, 7) - 1] : null);
    G("g-folga", 240, (svg, w, h) => linhasA(svg, { w, h, xs: mxs, y0: 0, rotX: rotM,
      barras: MC.filter(r => r.corte != null).map(r => ({ x: r.mes, v: r.corte, lw: 10, cor: "color-mix(in srgb, var(--ink-3) 45%, transparent)" })),
      series: [{ nome: "Necessária", cor: "var(--accent)", pts: MC.map(r => [r.mes, r.hid_nec]), pontos: true }, { nome: "Mínima revelada", cor: "var(--rl-verm)", pts: MC.map(r => [r.mes, r.gh_min]), pontos: true }],
      dica: mm => { const r = MC.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b><br>necessária ${n(r.hid_nec, 1)} GW · mínima revelada ${n(r.gh_min, 1)} GW<br>folga ${r.hid_nec != null && r.gh_min != null ? sn(r.hid_nec - r.gh_min, 1) + " GW" : "—"} · renovável cortada ${n(r.corte, 1)} GW<br>dia útil: ${n(r.piso_util, 1)} h do vale no piso`; } }));
    {
      const vmax = Math.max(400, ...MC.map(r => r.bm_vagua || 0));
      G("g-acopl", 240, (svg, w, h) => {
        linhasA(svg, { w, h, xs: mxs, y0: 0, y1: 100, fmtY: v => v + "%", rotX: rotM,
          barras: MC.filter(r => r.acopl != null).map(r => ({ x: r.mes, v: 100 * r.acopl, lw: 10, cor: "color-mix(in srgb, var(--accent) 30%, transparent)" })),
          series: [{ nome: "Valor da água BM", cor: "var(--rl-verm)", pts: MC.map(r => [r.mes, r.bm_vagua == null ? null : 100 * Math.max(0, r.bm_vagua) / vmax]), pontos: true }],
          dica: mm => { const r = MC.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b><br>SE acoplado ao N em ${pct(r.acopl)} dos dias úteis (vale)<br>Belo Monte: valor da água ${r.bm_vagua == null ? "—" : "R$ " + n(r.bm_vagua, 1)} · geração ${n(r.bm_ger, 1)} GW<br>vertimento em Pimental ${r.pim_ver == null ? "—" : n(r.pim_ver) + " m³/s"}`; } });
        S(svg, "text", { x: w - 6, y: 14, "text-anchor": "end", style: "fill:var(--rl-verm)" }, `valor da água: 100% = R$ ${n(vmax)}`);
      });
    }

    desenharPerfilDia(); desenharPerfil(); desenharIndicadores(); desenharMensal(); desenharContrib(); desenharHora(); desenharNivel();
  }

  // ========== página do simulador (simulador.html): simulador e desempenho ==========
  function paginaSimulador() {
    // ---------- simulador: v1 simplificada, um mês por vez (mesma conta de simulador.dia_s; D056, D057) ----------
    const cal = [...D.calendario].sort((a, b) => a.mes < b.mes ? -1 : 1);
    const TIPOS_SIM = [["útil", "parte_util", "Dia útil"], ["sábado", "parte_sabado", "Sábado"], ["domingo/feriado", "parte_domingo", "Domingo/feriado"]];
    const CAMPOS = ["horas_piso", "frac_fora", "premio_ponta"];
    const JANS = D.premissas_janelas;
    let JAN = String(D.janela_padrao);
    // valor padrão de cada premissa: horas no piso e prêmio da janela; desconto das outras horas = média dos 12 meses,
    // um número só para os três tipos de dia (modelo v2, D087; D.ref_fora traz o mesmo valor em cada tipo)
    const padrao = (t, k) => (k === "frac_fora" && D.ref_fora && D.ref_fora[t].valor != null ? D.ref_fora[t].valor : JANS[JAN][t][k]);
    const copiaJan = () => Object.fromEntries(TIPOS_SIM.map(([t]) => [t, Object.fromEntries(CAMPOS.map(k => [k, padrao(t, k)]))]));
    const editouPrem = () => TIPOS_SIM.some(([t]) => CAMPOS.some(k => Math.abs(PREM[t][k] - padrao(t, k)) > 1e-6) || Object.values(FIX[t]).some(v => v != null));
    let PREM = copiaJan();
    // sensibilidade de ponta (D062)
    const ESTR = Object.fromEntries(TIPOS_SIM.map(([t]) => [t, { com: D.estresse[t].com, sem: D.estresse[t].sem, sens: D.estresse[t].com }]));
    // padrão (D073): 5% dos dias úteis com a ponta no p90 das horas de ponta do mês corrente
    const P90_MES = D.sensibilidade.preco, PCT0 = D.sensibilidade.pct;
    let PCT = PCT0;
    let LEG_SENS = "", FORA_DICA = "", FORA_EF = "";
    const escolherPct = e => { const b = e.target.closest("[data-q]"); if (!b || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return; e.preventDefault(); PCT = +b.dataset.q; atualizar(); };
    // preço da ponta: por padrão acompanha o DECOMP (DECOMP + prêmio da janela ou do cenário); se o usuário digitar um
    // preço, ele fica fixo e o prêmio passa a ser preço − DECOMP (D058)
    const FIX = Object.fromEntries(TIPOS_SIM.map(([t]) => [t, { ponta: null, sens: null }]));
    const premioEf = (t, k, Dm) => (k === "sens" && t !== "útil" ? premioEf(t, "ponta", Dm) : k === "sens" && FIX[t][k] == null && P90_MES != null ? P90_MES - Dm : FIX[t][k] != null ? FIX[t][k] - Dm : k === "ponta" ? PREM[t].premio_ponta : ESTR[t][k]);
    const precoEf = (t, k, Dm, P) => Math.max(Dm + premioEf(t, k, Dm), P);
    const premios = (k, Dm) => Object.fromEntries(TIPOS_SIM.map(([t]) => [t, premioEf(t, k, Dm)]));
    // mês padrão: o primeiro cuja RV0 ainda não saiu (o próximo mês a ser decidido)
    let MES_I = Math.max(0, cal.findIndex(c => !c.rv0_publicada));
    let DEC = Math.round(ref.decomp_vigente);
    // conta do mês, do resumo e dos dias: simulador_conta.js (a mesma do app, com teste de paridade com o Python)
    const CONTA = window.ContaSimulador.criar(NV, NP);
    function prever(c, Dm, cenario) {
      const P = c.piso;
      const { tot, pld, vpiso, fora, ponta, porTipo } = CONTA.somar(c, Dm, t => PREM[t], t => premioEf(t, cenario || "ponta", Dm));
      const delta = pld - Dm, dir = classe(delta);
      const conf = D.confianca.filter(r => r.h === c.h), k = conf.find(r => r.direcao_prevista === dir), e = conf[0];
      return { pld, tot, delta, vpiso, fora, ponta, porTipo, dir, acerto: k ? k.acerto : null, meses: k ? k.meses : 0, lo: Math.max(pld - e.erro_p90, P), hi: pld - e.erro_p10, e };
    }
    // linha de entrada: mês, DECOMP, janela e premissas padrão (D090)
    const selMesSim = document.getElementById("sel-mes"), inpDec = document.getElementById("inp-decomp");
    cal.forEach((c, i) => { const o = document.createElement("option"); o.value = i; o.textContent = `${rot(c.mes)} · ${c.h === 1 ? "1 mês" : c.h + " meses"} de antecedência`; selMesSim.appendChild(o); });
    selMesSim.value = MES_I; inpDec.value = DEC;
    selMesSim.addEventListener("change", () => { MES_I = +selMesSim.value; HF = cal[MES_I].h; atualizar(); desenharFaixaSinc(); });
    inpDec.addEventListener("input", () => { const v = Number(inpDec.value); if (inpDec.value !== "" && isFinite(v) && v >= 0) { DEC = v; atualizar(); } });
    inpDec.addEventListener("blur", () => { inpDec.value = DEC; });
    document.getElementById("btn-decomp").addEventListener("click", () => { DEC = Math.round(ref.decomp_vigente); inpDec.value = DEC; atualizar(); });

    // tabela única (D090): premissa × útil, sábado, domingo/feriado, "No mês", "Peso" e a linha "Desvio do mês"
    const tPrem = document.querySelector("#t-prem tbody");
    const LINHAS_PREM = [
      { k: "horas_piso", rot: "Vale no piso", un: "h/dia, de 8", dica: "Horas do vale (8h–15h) no piso por dia: média dos dias da janela, por tipo de dia.", passo: 0.1, de: v => v, para: v => Math.min(Math.max(v, 0), NV), casas: 1 },
      { k: "frac_fora", rot: "Outras horas", un: "% do espaço · todos os dias", unico: true, dica: "Desconto das horas fora do piso e da ponta sobre o DECOMP, em % do espaço DECOMP − piso, um número só para os três tipos de dia. Padrão: média dos 12 meses encerrados (com DECOMP acima do piso), sem separar tipo de dia; dá o mesmo resultado que os três valores por tipo no backtest (D087).", passo: 0.5, de: v => v * 100, para: v => v / 100, casas: 1,
        extra: () => { const c = cal[MES_I], esp = Math.max(DEC - c.piso, 0), v = PREM["útil"].frac_fora * esp, jt = JANS[JAN].todos, rt = D.ref_fora_tipo;
          // D089: com a janela no piso (espaço < R$ 20) o % não é comparável; mostra o desvio em R$/h
          const jan = jt.espaco_fora != null && jt.espaco_fora < 20 ? `janela ${JAN}d no piso: ${sn(jt.desvio_fora, 0)} R$/h` : `janela ${JAN}d ${sn(jt.frac_fora * 100, 0)}%`;
          const efeito = esp > 0 ? `${sn(v, 1)} R$/h sobre o DECOMP` : "DECOMP no piso: sem efeito", porTipo = rt ? `12 meses por tipo: útil ${sn(rt["útil"].valor * 100, 0)}% · sáb. ${sn(rt["sábado"].valor * 100, 0)}% · dom. ${sn(rt["domingo/feriado"].valor * 100, 0)}%` : "";
          FORA_DICA = `<b>${efeito}</b><br>${jan}${porTipo ? "<br>" + porTipo : ""}<br>Padrão: média dos 12 meses encerrados, um número para todos os dias (D087).`;
          return efeito; } },
      { k: "ponta", rot: "Preço da ponta", un: "R$/MWh 18h–21h", dica: "Preço médio da ponta = DECOMP digitado + prêmio da janela (preço − DECOMP dos mesmos dias). Digite um preço para fixá-lo.", passo: 1, preco: true, casas: 0 },
    ];
    const inpPrem = {}, extraPrem = {};
    function montarPrem() {
      tPrem.replaceChildren();
      LINHAS_PREM.forEach(L => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><span class="rotulo-prem" title="${L.dica || ""}">${L.rot}</span>${L.un ? `<small class="un">${L.un}</small>` : ""}<small class="peso-lbl" data-pl="${L.k}"></small></td>`;
        dicaEm(tr.querySelector(".rotulo-prem"), L.dica);
        TIPOS_SIM.forEach(([t]) => {
          if (L.unico && t !== "útil") return;
          const td = document.createElement("td"); td.className = "n";
          if (L.unico) td.colSpan = 3;
          const inp = document.createElement("input"); inp.type = "number"; inp.step = String(L.passo);
          inp.setAttribute("aria-label", L.unico ? `${L.rot} · todos os dias` : `${L.rot} · ${t}`);
          const ler = () => (L.preco ? precoEf(t, L.k, DEC, cal[MES_I].piso) : L.de(PREM[t][L.k]));
          inp.value = +ler().toFixed(L.casas);
          inp.addEventListener("input", () => { const v = Number(inp.value); if (inp.value === "" || !isFinite(v)) return;
            if (L.preco) FIX[t][L.k] = Math.max(v, 0); else if (L.unico) TIPOS_SIM.forEach(([u]) => { PREM[u][L.k] = L.para(v); }); else PREM[t][L.k] = L.para(v);
            atualizar(); });
          inp.addEventListener("blur", () => { inp.value = +ler().toFixed(L.casas); });
          inpPrem[L.k + "|" + t] = inp;
          if (L.unico) {
            // desconto único (D087) num campo só, no eixo da coluna Útil, com os detalhes na dica
            const w = document.createElement("div"); w.className = "lin-campo centro"; w.append(inp);
            w.insertAdjacentHTML("beforeend", '<span class="info" tabindex="0" aria-label="Detalhes do desconto das outras horas">ⓘ</span>');
            dicaEm(w.lastElementChild, () => FORA_DICA + (FORA_EF ? "<br>" + FORA_EF : "")); td.appendChild(w);
          } else td.appendChild(inp);
          if (L.extra || L.preco) { const sm = document.createElement("small"); sm.className = "extra"; td.appendChild(sm); extraPrem[L.k + "|" + t] = sm; }
          if (!L.unico) td.insertAdjacentHTML("beforeend", `<small class="contrib" data-c="${L.k}|${t}"></small>`);
          tr.appendChild(td);
        });
        tr.insertAdjacentHTML("beforeend", `<td class="n col-mes" data-m="${L.k}"></td><td class="n col-mes" data-p="${L.k}"></td>`);
        tPrem.appendChild(tr);
      });
      tPrem.insertAdjacentHTML("beforeend", `<tr class="destaque"><td>Desvio do mês<small class="peso-lbl" data-pl="tot"></small></td>${TIPOS_SIM.map(([t]) => `<td class="n" data-dt="${t}"></td>`).join("")}<td class="n col-mes" data-m="tot"></td><td class="n col-mes">100%</td></tr>`);
    }
    function marcarEditados() {
      const j = JANS[JAN];
      LINHAS_PREM.forEach(L => TIPOS_SIM.forEach(([t]) => {
        const inp = inpPrem[L.k + "|" + t];
        if (!inp) return;
        if (L.preco) {
          const outroPremio = L.k === "ponta" && Math.abs(PREM[t].premio_ponta - padrao(t, "premio_ponta")) > 0.05;
          inp.classList.toggle("editado", FIX[t][L.k] != null || outroPremio);
          if (document.activeElement !== inp) inp.value = Math.round(precoEf(t, L.k, DEC, cal[MES_I].piso));
          const pr = premioEf(t, L.k, DEC);
          extraPrem[L.k + "|" + t].textContent = FIX[t][L.k] != null ? `fixado · prêmio ${sn(pr, 0)}` : `${n(DEC)} ${pr < 0 ? "−" : "+"} ${n(Math.abs(pr), 0)}${L.k === "ponta" && outroPremio ? " (gráfico)" : ""}`;
          if (L.k === "ponta") { const jt = JANS[JAN][t]; inp.title = `Na janela: média ${n(jt.ponta_media)} · menor dia ${n(jt.ponta_min_dia)} · maior dia ${n(jt.ponta_max_dia)} · hora mais cara ${n(jt.ponta_max_hora)}`; }
          return;
        }
        inp.classList.toggle("editado", Math.abs(padrao(t, L.k) - PREM[t][L.k]) > 1e-6);
        if (document.activeElement !== inp) inp.value = +L.de(PREM[t][L.k]).toFixed(L.casas);
        if (L.extra) extraPrem[L.k + "|" + t].innerHTML = L.extra(t);
      }));
      const c = cal[MES_I];
      [["útil", "th-util", "Útil", "parte_util"], ["sábado", "th-sab", "Sábado", "parte_sabado"], ["domingo/feriado", "th-dom", "Dom./<wbr>feriado", "parte_domingo"]].forEach(([t, id, nome, col]) => { document.getElementById(id).innerHTML = `${nome}<small>${pct(c[col])} do mês<br>${n(j[t].dias)} dias</small>`; });
    }
    function voltarPadrao() {
      PREM = copiaJan(); TIPOS_SIM.forEach(([t]) => { FIX[t] = { ponta: null, sens: null }; }); PCT = PCT0; montarPrem(); atualizar();
    }
    abas("abas-jan", Object.keys(JANS).filter(x => /^\d+$/.test(x)).map(x => [x, `${x}d${+x === D.janela_padrao ? " (padrão)" : ""}`]), JAN, v => { JAN = v; PREM = copiaJan(); TIPOS_SIM.forEach(([t]) => { FIX[t].ponta = null; }); montarPrem(); atualizar(); });
    // "↺ Premissas padrão" volta também a janela de 14 dias
    document.getElementById("btn-prem").addEventListener("click", () => {
      JAN = String(D.janela_padrao); document.querySelectorAll("#abas-jan button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === JAN)));
      voltarPadrao(); });
    montarPrem();
    // sensibilidade presa à tabela (D090, D093): preço da ponta útil no cenário (FIX["útil"].sens) e régua do %
    {
      const inp = document.getElementById("inp-sens"), ler = () => precoEf("útil", "sens", DEC, cal[MES_I].piso);
      inp.value = Math.round(ler());
      inp.addEventListener("input", () => { const v = Number(inp.value); if (inp.value === "" || !isFinite(v)) return; FIX["útil"].sens = Math.max(v, 0); atualizar(); });
      inp.addEventListener("blur", () => { inp.value = Math.round(ler()); });
      inpPrem["sens|útil"] = inp; extraPrem["sens|útil"] = document.getElementById("sens-extra");
      const rg = document.getElementById("regua-sens"); rg.addEventListener("click", escolherPct); rg.addEventListener("keydown", escolherPct);
      dicaEm(document.getElementById("info-sens"), () => LEG_SENS);
      // a grade da sensibilidade copia as larguras reais das colunas da tabela (campo no eixo da coluna Útil)
      const grade = document.querySelector(".sim-sens.sgrade"), tabela = document.getElementById("t-prem");
      if (grade && tabela && window.ResizeObserver) {
        const ajustar = () => { const ths = [...tabela.querySelectorAll("thead th")].filter(th => getComputedStyle(th).display !== "none");
          grade.style.gridTemplateColumns = ths.map(th => th.getBoundingClientRect().width + "px").join(" "); };
        new ResizeObserver(ajustar).observe(tabela); ajustar();
      }
    }
    function marcarSens() {
      const inp = inpPrem["sens|útil"], sm = extraPrem["sens|útil"];
      inp.classList.toggle("editado", FIX["útil"].sens != null);
      if (document.activeElement !== inp) inp.value = Math.round(precoEf("útil", "sens", DEC, cal[MES_I].piso));
      const pr = premioEf("útil", "sens", DEC);
      sm.textContent = FIX["útil"].sens == null && P90_MES != null ? `p90 de ${rot(D.sensibilidade.mes)}` : FIX["útil"].sens != null ? `fixado · prêmio ${sn(pr, 0)}` : `${n(DEC)} ${pr < 0 ? "−" : "+"} ${n(Math.abs(pr), 0)}`;
    }
    let HP_PER = "6m";  // período comum aos três gráficos do histórico (D073)
    const ponta = acompanharPonta(() => HP_PER, (t, p) => { PREM[t].premio_ponta = p; FIX[t].ponta = null; atualizar(); },
      t => ({ premio: PREM[t].premio_ponta, livre: FIX[t].ponta == null, dec: DEC, piso: cal[MES_I].piso }));
    const marcarChips = ponta.chips;

    // os dias da janela (trajetória compacta)
    const TR = D.trajetoria, iT = Object.fromEntries(TR.colunas.map((c, i) => [c, i]));
    const corTipo = t => (TIPOS.find(x => x[0] === t) || [, , "var(--ink-3)"])[2];
    function desenharTraj() {
      const j = JANS[JAN], dias = TR.dias.filter(r => r[0] >= j.inicio && r[0] <= j.fim);
      const jan_ = `${dias.length} dias da janela (${dataBr(j.inicio).slice(0, 5)} a ${dataBr(j.fim).slice(0, 5)}), cor = tipo de dia`;
      document.getElementById("tt-traj-ponta").textContent = `Preço da ponta em cada dia, últimos ${Math.min(60, TR.dias.length)} dias · em destaque, os ${dias.length} dias da janela (${dataBr(j.inicio).slice(0, 5)} a ${dataBr(j.fim).slice(0, 5)}) · cor = tipo de dia`;
      document.querySelectorAll("#g-tr-piso, #g-tr-fora").forEach(el => { const t = el.previousElementSibling; if (t) t.firstElementChild.textContent = `Cada um dos ${jan_}`; });
      // estendido: os últimos 60 dias, com a janela em destaque à direita (D075)
      const mini = (id, hgt, col, fmt, y0, y1, barras, ref2, estendido) => G(id, hgt, (svg, w, h) => {
        const diasJ = dias, dias_ = estendido ? TR.dias.slice(-60) : dias, naJan = r => r[0] >= j.inicio && r[0] <= j.fim;
        const m = { l: 34, r: 6, t: estendido ? 18 : 8, b: 16 }, N = dias_.length;
        if (!N) return;
        // D089: no desconto, dias com DECOMP no piso (espaço < R$ 20) não definem a escala; aparecem vazados e limitados
        const fracEsp = col === "frac_fora";
        const vals = dias_.filter(r => !fracEsp || r[iT.espaco] >= 20).flatMap(r => [r[iT[col]], ref2 ? r[iT[ref2]] : null]).filter(v => v != null);
        const ax = eixo(Math.min(y0 ?? Infinity, ...vals), Math.max(y1 ?? -Infinity, ...vals), 2);
        const bw = (w - m.l - m.r) / N, x = i => m.l + (i + 0.5) * bw, y = v => m.t + (h - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
        ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 4, y: y(t) + 3, "text-anchor": "end" }, fmt(t)); });
        const base = y(Math.max(ax.a, Math.min(0, ax.b)));
        if (estendido) { const i0 = dias_.findIndex(naJan);
          if (i0 > 0) { const xs_ = x(i0) - bw / 2; S(svg, "line", { x1: xs_, x2: xs_, y1: m.t - 12, y2: h - m.b, stroke: "var(--accent)", "stroke-width": 1.2, "stroke-dasharray": "3 3" });
            S(svg, "text", { x: xs_ + 4, y: m.t - 4, class: "forte", style: "fill:var(--accent)" }, `janela de ${diasJ.length} dias →`); } }
        let ultX = -1e9;
        dias_.forEach((r, i) => {
          const v0 = r[iT[col]], cor = corTipo(r[1]), piso = fracEsp && r[iT.espaco] < 20, v = piso && v0 != null ? Math.max(Math.min(v0, ax.b), ax.a) : v0;
          if (v != null) {
            if (barras) S(svg, "rect", { x: x(i) - Math.min(bw * 0.35, 7), y: Math.min(y(v), base), width: Math.min(bw * 0.7, 14), height: Math.max(1, Math.abs(y(v) - base)), fill: cor, opacity: estendido && !naJan(r) ? 0.4 : 1 });
            else if (piso) S(svg, "circle", { cx: x(i), cy: y(v), r: N > 45 ? 2 : 3.2, fill: "none", stroke: cor, "stroke-width": 1.2, opacity: 0.5 });
            else S(svg, "circle", { cx: x(i), cy: y(v), r: N > 45 ? 2 : 3.2, fill: cor });
          }
          if ((i === 0 || i === N - 1 || (r[0].endsWith("-01") && i > Math.max(2, N * 0.06) && i < Math.min(N - 3, N * 0.94))) && (x(i) - ultX > 40 || i === N - 1)) { S(svg, "text", { x: x(i), y: h - 4, "text-anchor": i === N - 1 ? "end" : "middle" }, dataBr(r[0]).slice(0, 5)); ultX = x(i); }
          const a = S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: h - m.t - m.b, fill: "transparent" });
          dicaEm(a, `<b>${dataBr(r[0])} ${diaSem(r[0])}</b> · ${r[1] || "—"}<br>vale no piso ${n(r[iT.horas_piso], 0)} de 8 h · outras horas ${r[iT.espaco] < 20 ? `${sn(r[iT.frac_fora] * 20, 1)} R$/h sobre o DECOMP (no piso)` : `${sn(r[iT.frac_fora] * 100, 0)}% do espaço`}<br>ponta média R$ ${n(r[iT.ponta_media], 0)} (prêmio ${sn(r[iT.premio_ponta], 0)}) · hora mais cara ${n(r[iT.ponta_max_hora], 0)}<br>DECOMP ${n(r[iT.decomp], 1)} · espaço ${n(r[iT.espaco], 1)}`);
        });
        if (ref2) S(svg, "path", { d: dias_.map((r, i) => `${i ? "L" : "M"}${x(i) - bw / 2},${y(r[iT[ref2]])}L${x(i) + bw / 2},${y(r[iT[ref2]])}`).join(""), fill: "none", stroke: "var(--ink)", "stroke-width": 1.4, "stroke-dasharray": "3 2", "pointer-events": "none" });
      });
      mini("g-tr-piso", 96, "horas_piso", v => n(v), 0, 8, true);
      mini("g-tr-fora", 96, "frac_fora", v => sn(v * 100) + "%", -1, 0, false);
      mini("g-tr-ponta", 110, "ponta_media", v => n(v), 0, null, true, "decomp", true);
    }

    // peso de cada premissa no desvio do mês escolhido, dentro da tabela (colunas "No mês" e "Peso")
    const GRUPOS = [["vpiso", "Vale no piso", "var(--b-vale)", 1], ["fora", "Outras horas", "var(--b-demais)", 1], ["ponta", "Ponta", "var(--b-ponta)", 1]];
    const G_DE = { horas_piso: "vpiso", frac_fora: "fora", ponta: "ponta" };
    function desenharPeso(r) {
      const tipos = TIPOS_SIM.filter(([t]) => r.porTipo[t]), absTot = GRUPOS.reduce((a, [k]) => a + Math.abs(r[k]), 0) || 1;
      const curtoT = { "útil": "útil", "sábado": "sáb.", "domingo/feriado": "dom." }, q = sel => tPrem.querySelector(sel);
      Object.entries(G_DE).forEach(([k, g]) => {
        const m = q(`[data-m="${k}"]`), p = q(`[data-p="${k}"]`), pl = q(`[data-pl="${k}"]`), peso = pct(Math.abs(r[g]) / absTot);
        if (m) m.innerHTML = `<b>${sn(r[g], 1)}</b>`;
        if (p) p.textContent = peso;
        if (pl) pl.textContent = `no mês ${sn(r[g], 1)} · peso ${peso}`;
        if (k === "frac_fora") FORA_EF = "Efeito no mês por tipo: " + tipos.map(([t]) => `${curtoT[t]} ${sn(r.porTipo[t].s * r.porTipo[t][g], 1)}`).join(" · ");
        else TIPOS_SIM.forEach(([t]) => { const cc = q(`[data-c="${k}|${t}"]`); if (cc) cc.textContent = r.porTipo[t] ? `efeito ${sn(r.porTipo[t].s * r.porTipo[t][g], 1)}` : "—"; });
      });
      TIPOS_SIM.forEach(([t]) => { const cc = q(`[data-dt="${t}"]`), d = r.porTipo[t]; if (cc) cc.textContent = d ? sn(d.s * (d.vpiso + d.fora + d.ponta), 1) : "—"; });
      const mt = q('[data-m="tot"]'); if (mt) mt.innerHTML = `<b>${sn(r.delta, 1)}</b>`;
      const pt = q('[data-pl="tot"]'); if (pt) pt.textContent = `no mês ${sn(r.delta, 1)} · peso 100%`;
    }

    // régua da sensibilidade (0–100%) e âncora no histórico de 12 meses da ponta dos dias úteis
    function desenharSens(r, c, mix, pu) {
      document.getElementById("regua-sens").innerHTML = [5, 25, 50, 75, 100].map(q => `<span role="button" tabindex="0" data-q="${q}" class="${q === PCT ? "sel" : ""}"><b>${q}%</b>${n(mix(q / 100), 1)}</span>`).join("");
      const dias = (D.ponta_dias || {})["útil"] || [], k = dias.filter(v => v >= pu).length;
      LEG_SENS = `PLD do mês por % dos dias úteis com a ponta em R$ ${n(pu)} (clique para escolher). Nos últimos 12 meses, a ponta ficou em R$ ${n(pu)} ou mais em ${pct(dias.length ? k / dias.length : null)} dos dias úteis (${k} de ${dias.length}).`;
    }

    // dias do mês (D095): cada dia recebe o dia típico do seu tipo; a média dos dias é o PLD previsto do mês
    let DIAS_CSV = null;
    function desenharDias(r, c, sensMes, pu) {
      const L = CONTA.diasMes(c, DEC, PREM, premios("ponta", DEC), premios("sens", DEC), PCT), N = L.length || 1;
      const pldMes = Math.max(L.reduce((a, x) => a + x.pld_dia, 0) / N, c.piso), confere = Math.abs(pldMes - r.pld) < 0.05;
      const estU = (L.find(x => x._cod === "u") || {}).pld_dia_ponta_estressada;
      document.querySelector("#t-dias thead").innerHTML = `<tr><th>Data</th><th>Tipo</th><th class="n">Piso<small>h/dia</small></th><th class="n">Outras<small>R$</small></th><th class="n">Ponta<small>R$</small></th><th class="n">PLD dia<small>R$/MWh</small></th><th class="n" title="PLD esperado do dia útil com a ponta em R$ ${n(pu)} em ${n(PCT)}% dos dias úteis: (1 − ${n(PCT)}%) × PLD do dia + ${n(PCT)}% × PLD do dia com essa ponta. Com a ponta em R$ ${n(pu)} o dia todo: ${n(estU, 1)}.">Estresse ${n(PCT)}%<small>ponta ${n(pu)}</small></th></tr>`;
      document.querySelector("#t-dias tbody").innerHTML = L.map(x => `<tr class="${x._cod === "u" ? "" : "fds"}"><td>${dataBr(x.data).slice(0, 5)} ${x.dia}</td><td>${x.tipo}</td><td class="n">${n(x.horas_piso, 1)}</td><td class="n">${n(x.outras_horas, 1)}</td><td class="n">${n(x.ponta, 1)}</td><td class="n"><b>${n(x.pld_dia, 1)}</b></td><td class="n">${n(x.pld_dia_esperado_com_pct, 1)}</td></tr>`).join("") +
        `<tr class="destaque"><td colspan="5">Média dos ${L.length} dias${confere ? " = PLD previsto ✓" : ""}</td><td class="n"><b>${n(pldMes, 1)}</b></td><td class="n">${n(Math.max(L.reduce((a, x) => a + x.pld_dia_esperado_com_pct, 0) / N, c.piso), 1)}</td></tr>`;
      const nU = L.filter(x => x._cod === "u").length, nS = L.filter(x => x._cod === "s").length, nD = L.length - nU - nS;
      document.getElementById("dias-txt").innerHTML = `${nU} úteis, ${nS} sábados, ${nD} domingos e feriados · média dos dias <b>${n(pldMes, 1)}</b>${confere ? " = PLD previsto ✓" : ""}`;
      document.getElementById("dias-leg").textContent = `No modelo, todos os dias do mesmo tipo têm o mesmo preço: a tabela mostra como o PLD do mês se forma pelo calendário, não uma previsão de cada dia. PLD do dia = [horas do vale no piso × piso + (20 − horas no piso) × outras horas + 4 × ponta] / 24. A última coluna é o PLD esperado de cada dia útil com a ponta em R$ ${n(pu)} em ${n(PCT)}% dos dias úteis, (1 − p) × PLD do dia + p × PLD do dia com essa ponta; a média dela é o PLD com a sensibilidade (não são dias específicos).`;
      DIAS_CSV = { c, L, pldMes, sensMes, pu };
    }
    // CSV para o Excel em português: separador ";", vírgula decimal, BOM para os acentos
    function baixarCsv() {
      if (!DIAS_CSV) return;
      const { c, L, pldMes, sensMes, pu } = DIAS_CSV, j = JANS[JAN], f = (v, k = 2) => v == null || !isFinite(v) ? "" : v.toFixed(k).replace(".", ",");
      const meta = [["Simulação do PLD médio do mês (SE/CO)", ""], ["Mês", c.mes], ["DECOMP médio digitado (R$/MWh)", f(DEC)], ["Piso (R$/MWh)", f(c.piso)],
        ["Premissas", `janela de ${JAN} dias (${dataBr(j.inicio)} a ${dataBr(j.fim)})${editouPrem() ? ", editadas" : ""}`],
        ["Desconto das outras horas (% do espaço)", f(PREM["útil"].frac_fora * 100, 1)], ["PLD previsto do mês (R$/MWh)", f(pldMes)],
        ["Sensibilidade", `ponta útil a R$ ${f(pu, 0)} em ${PCT}% dos dias úteis: ${f(sensMes)} R$/MWh`]];
      const cab = ["Data", "Dia", "Tipo", "Vale no piso (h/dia)", "Outras horas (R$/MWh)", "Ponta 18h-21h (R$/MWh)", "PLD do dia (R$/MWh)", `PLD do dia com a ponta útil a R$ ${f(pu, 0)} o dia todo (R$/MWh)`, `PLD esperado do dia com a ponta útil a R$ ${f(pu, 0)} em ${PCT}% dos dias úteis (R$/MWh)`];
      const linhasCsv = L.map(x => [`${x.data.slice(8, 10)}/${x.data.slice(5, 7)}/${x.data.slice(0, 4)}`, x.dia, x.tipo, f(x.horas_piso, 1), f(x.outras_horas), f(x.ponta), f(x.pld_dia), x._cod === "u" ? f(x.pld_dia_ponta_estressada) : "", f(x.pld_dia_esperado_com_pct)]);
      const csv = "﻿" + [...meta.map(mm => mm.join(";")), "", cab.join(";"), ...linhasCsv.map(l => l.join(";")), ["Média", "", "", "", "", "", f(pldMes), "", f(sensMes)].join(";")].join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `simulacao_pld_${c.mes}_decomp${Math.round(DEC)}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    document.getElementById("btn-csv").addEventListener("click", baixarCsv);

    // resumo para a mesa (D091): cada item com o valor, uma linha de leitura e o método na dica (ⓘ)
    function desenharResumo(res, c, ante, editado) {
      const R = CONTA.resumo(D, c, DEC, PREM, premios("ponta", DEC), premios("sens", DEC), PCT, editado), r = R._r;
      const h = c.h, nomeDir = DIR[R.direcao].toLowerCase(), H = R.direcao_hist, inicioBt = rot((D.backtest.filter(x => x.h === h).map(x => x.mes).sort()[0]) || "2024-07");
      const sens = R.sensibilidade.pld, pu = R.sensibilidade.preco_ponta_util, [lo, hi] = R.faixa_10_90;
      const pesos = GRUPOS.map(([k, nome]) => [nome.toLowerCase(), R.de_onde_vem[k].valor, R.de_onde_vem[k].peso]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const p12 = R.premio_ponta.media_12m, p12t = TIPOS_SIM.map(([t]) => sn(p12[t], 0)).join(" / "), pjt = TIPOS_SIM.map(([t]) => sn(PREM[t].premio_ponta, 0)).join(" / ");
      const Em = R.erro_medio, A = R.alertas;
      const dPld = `Média do PLD de ${rotLongo(c.mes)} se o DECOMP médio do mês for R$ ${n(DEC)}; se o DECOMP esperado for outro, digite-o no topo. Conta: vale no piso, outras horas e ponta por tipo de dia, ponderados pelo calendário; nenhuma hora abaixo do piso (metodologia, passo 4).`;
      const itens = [
        { l: "Direção", v: H.pouco_historico ? `${DIR[R.direcao]} · pouco histórico` : `${DIR[R.direcao]} · acertou ${pct(H.acertos_desde_mar25 / H.previsoes_desde_mar25)}`,
          c: H.pouco_historico ? (H.previsoes_desde_jul24 ? `Previu ${nomeDir} ${H.previsoes_desde_jul24}× com ${ante}; acertou ${H.acertos_desde_jul24}.` : `O modelo nunca previu ${nomeDir} com ${ante}.`) + `<br>${DIR[R.direcao]} ocorreu em ${H.meses_com_a_direcao.length} de ${H.meses_total} meses desde ${inicioBt}.`
            : `Previu ${nomeDir} ${H.previsoes_desde_mar25}× com ${ante}; veio ${nomeDir} em ${H.acertos_desde_mar25}.`,
          d: (H.pouco_historico ? `Pouco histórico = menos de 5 previsões da mesma direção desde mar/2025, poucas para medir a confiança. ${H.meses_com_a_direcao.length ? `Meses com ${nomeDir}: ${H.meses_com_a_direcao.map(rot).join(", ")}. ` : ""}Contagem desde ${inicioBt}, com ${ante} de antecedência.` : `Previsões de ${nomeDir} com ${ante} desde mar/2025 (regime atual).`) + " Backtest fora da amostra com o DECOMP realizado; direção pela zona neutra de ±5 R$/MWh sobre o DECOMP." },
        { l: "Faixa provável", v: `${n(lo)} a ${n(hi)}`, c: "",
          d: `Do 10º ao 90º percentil dos erros (previsto − oficial) dos meses já encerrados com ${ante} de antecedência, somados ao previsto${lo <= c.piso + 0.5 ? `; o limite de baixo é o piso (${n(c.piso, 2)})` : ""}. Erro médio = média do erro absoluto desde mar/2025${h > 1 && Em.um_mes != null ? ` (com 1 mês de antecedência: R$ ${n(Em.um_mes, 0)})` : ""}.` },
        { l: "De onde vem", leve: true, v: pesos.map(([nm, v, p]) => `${nm} ${sn(v, 1)} (${pct(p)})`).join(" · "), c: "",
          d: `Contribuição de cada grupo de horas ao desvio do mês (R$/MWh), já ponderada pelo calendário: ${pesos.map(([nm, v, p]) => `${nm} ${sn(v, 1)} (${pct(p)})`).join(" · ")}. Comparação: mesma conta trocando só o prêmio da ponta de cada tipo de dia pela média dos 12 meses encerrados (útil / sáb. / dom.: ${p12t} em vez de ${pjt}) dá ${n(R.pld_ponta_na_media_12m, 1)}.` },
        { l: "Estresse de ponta", leve: true, v: PCT > 0 ? `ponta útil a R$ ${n(pu)} em ${n(PCT)}% dos dias → <b>${n(sens, 1)}</b> (${sn(sens - R.pld_previsto, 1)})` : "escolha o % na régua ao lado", c: "",
          d: (FIX["útil"].sens == null && P90_MES != null ? `R$ ${n(pu)} = p90 das horas de ponta (18h–21h) dos dias úteis do mês corrente. ` : "") + LEG_SENS + " Conta: (1 − p) × previsto + p × cenário com a ponta no preço escolhido." },
        { l: "Quando muda", v: c.rv0_publicada ? `RV0 publicada em ${dataBr(c.rv0).slice(0, 5)}` : `RV0 ~${dataBr(c.rv0).slice(0, 5)}`,
          c: c.rv0_publicada ? `Erro médio de 1 mês: R$ ${n(Em.um_mes, 0)}.` : `Erro médio R$ ${n(Em.antecedencia, 0)} → R$ ${n(Em.apos_rv0, 0)} após a RV0.`,
          d: (c.rv0_publicada ? "" : `Até a RV0 de ${rot(c.mes)} sair, vale a precisão de ${ante}; depois, a de ${h - 1} ${h - 1 === 1 ? "mês" : "meses"}. `) + "Antecedência contada pela RV0: 1 mês se a RV0 do mês já saiu; senão, 1 + as RV0 ainda não publicadas até a do mês (D057). Data da RV0 futura estimada como a sexta antes do sábado que abre a semana operativa do dia 1º." },
      ];
      const corD = `var(--${R.direcao === "desconto" ? "t-dom" : R.direcao === "prêmio" ? "rl-verm" : "ink-2"})`;
      // alertas no fim do card, cada um só quando vale
      const alertas = [], hp = A.historico_no_piso, esp = DEC - c.piso;
      if (A.decomp_perto_do_piso) alertas.push(`DECOMP ${esp < 5 ? "no piso" : "perto do piso"}: só há espaço para prêmio; o desconto das outras horas não atua.` + (hp ? ` Nos ${hp.meses} meses no piso desde 2021: média ${sn(hp.media, 1)}, máx. ${sn(hp.max, 1)} (${rot(hp.mes_max)})${hp.previsao_acima_de_todos ? `; ${sn(R.desvio, 1)} fica acima de todos` : ""}.` : ""));
      const pju = R.premio_ponta.janela["útil"], p12u = p12["útil"];
      if (A.ponta_afastada_da_media_12m) alertas.push(`Prêmio da ponta útil na janela (${sn(pju, 0)}) ${pju > p12u ? "bem acima" : "bem abaixo"} da média de 12 meses (${sn(p12u, 0)}): o resultado depende disso.`);
      if (A.premissas_editadas) alertas.push("Premissas editadas: o histórico e a faixa valem para as premissas padrão.");
      document.getElementById("tt-res").textContent = `Resumo para a mesa · ${rot(c.mes)} · ${ante}`;
      res.innerHTML = `<div class="res-num"><b>${n(R.pld_previsto, 1)}</b><span>R$/MWh previsto · DECOMP ${n(DEC)} <span class="info" id="info-pld" tabindex="0" aria-label="O que é o PLD previsto">ⓘ</span></span></div>
        <div class="res-dir" style="color:${corD}">${R.direcao === "neutro" ? `Neutro: ${sn(R.desvio, 1)} R$/MWh sobre o DECOMP` : `${DIR[R.direcao]} de ${sn(R.desvio, 1)} R$/MWh`}</div>
        <div class="res-itens">${itens.map(it => `<div class="res-item"><div class="res-l">${it.l} <span class="info" tabindex="0" aria-label="Como é calculado">ⓘ</span></div><div class="res-v${it.leve ? " leve" : ""}">${it.v}</div>${it.c ? `<div class="res-c">${it.c}</div>` : ""}</div>`).join("")}</div>` +
        (alertas.length ? `<ul class="res-alertas">${alertas.map(a => `<li>${a}</li>`).join("")}</ul>` : "");
      res.querySelectorAll(".res-item .info").forEach((el, i) => dicaEm(el, itens[i].d));
      dicaEm(res.querySelector("#info-pld"), dPld);
      return r;
    }
    function atualizar() {
      const c = cal[MES_I], r = prever(c, DEC), cen = prever(c, DEC, "sens");
      const mix = q => Math.max((1 - q) * r.tot + q * cen.tot, c.piso), p = PCT / 100, sens = mix(p);
      const pu = precoEf("útil", "sens", DEC, c.piso);
      const ante = c.h === 1 ? "1 mês" : `${c.h} meses`;
      document.getElementById("tt-simmes").textContent = `Simulação de ${rotLongo(c.mes)}`;
      const j = JANS[JAN], editado = editouPrem();
      const longo = `${rotLongo(c.mes)}: ${pct(c.parte_util)} dias úteis, ${pct(c.parte_sabado)} sábados, ${pct(c.parte_domingo)} domingos e feriados; piso R$ ${n(c.piso, 2)}${c.piso_estimado ? " (piso do ano ainda não publicado: usado o último)" : ""}. Premissas: ${JAN} dias, ${dataBr(j.inicio)} a ${dataBr(j.fim)}${editado ? " (editadas)" : ""}. ` +
        (c.rv0_publicada ? `A RV0 do mês saiu em ${dataBr(c.rv0)}: confiança medida como previsão de 1 mês.` : `RV0 do mês ainda não publicada (prevista para ~${dataBr(c.rv0)}): confiança medida como previsão de ${ante}, o lado conservador; passa a ${c.h - 1 === 1 ? "1 mês" : (c.h - 1) + " meses"} quando a RV0 ${c.h === 2 ? "do mês" : "anterior"} sair.`) +
        (MES_I === 0 && c.rv0_publicada ? " O mês já está em curso: parte dele já foi realizada e não entra na conta." : "");
      // rodapé curto (D090); o texto completo vai para a dica
      const lg = document.getElementById("leg-sim");
      lg.innerHTML = `Piso R$ ${n(c.piso, 2)}${c.piso_estimado ? " (estimado)" : ""} · premissas de ${JAN} dias (${dataBr(j.inicio).slice(0, 5)}–${dataBr(j.fim).slice(0, 5)})${editado ? ", editadas" : ""} · ${c.rv0_publicada ? `RV0 publicada em ${dataBr(c.rv0).slice(0, 5)}` : `RV0 prevista ~${dataBr(c.rv0).slice(0, 5)}`} <span class="info" tabindex="0" aria-label="Detalhes">ⓘ</span>`;
      dicaEm(lg.querySelector(".info"), `${longo}<br>Campos editáveis: borda âmbar = editado; detalhes na dica de cada linha e na metodologia.`);
      document.getElementById("sub-prem").textContent = `Janela ${dataBr(j.inicio).slice(0, 5)}–${dataBr(j.fim).slice(0, 5)}`;
      desenharSens(r, c, mix, pu);
      desenharResumo(document.getElementById("sim-resumo"), c, ante, editado);
      desenharDias(r, c, sens, pu);
      marcarEditados(); marcarSens(); desenharPeso(r); desenharTraj(); desenharHMTodos();
      marcarChips();
      document.getElementById("veredito").innerHTML = r.acerto === null
        ? `Com DECOMP de R$ ${n(DEC)} em ${rotLongo(c.mes)}, o modelo indica <strong>${DIR[r.dir].toLowerCase()}</strong> de ${sn(r.delta, 1)} R$/MWh, sem histórico de acerto para essa direção.` + ` Faixa 10–90% pelo erro do backtest: ${n(r.lo)} a ${n(r.hi)}.` + (PCT > 0 ? ` Com a ponta do dia útil em R$ ${n(pu)} em ${n(PCT)}% dos dias úteis, ${n(sens, 1)}.` : "")
        : `Com DECOMP de R$ ${n(DEC)} em ${rotLongo(c.mes)}, o modelo indica <strong>${DIR[r.dir].toLowerCase()} de ${sn(r.delta, 1)} R$/MWh</strong>; no backtest, essa direção se confirmou em ${pct(r.acerto)} ${r.meses === 1 ? "do único mês" : `dos ${r.meses} meses`} em que foi prevista com ${c.h === 1 ? "1 mês" : c.h + " meses"} de antecedência.` + ` Faixa 10–90% pelo erro do backtest: ${n(r.lo)} a ${n(r.hi)}.` + (PCT > 0 ? ` Com a ponta do dia útil em R$ ${n(pu)} em ${n(PCT)}% dos dias úteis, ${n(sens, 1)}.` : "");
    }

    // histórico das premissas (janela móvel padrão)
    const HP = D.premissas_hist, iCol = Object.fromEntries(HP.colunas.map((c, i) => [c, i]));
    abas("abas-hp", [["6m", "6 meses"], ["12m", "12 meses"], ["todo", "Desde jan/2025"]], HP_PER, v => { HP_PER = v; desenharHP(); ponta.desenhar(); });
    function desenharHP() {
      document.getElementById("tt-hp").textContent = `Histórico das premissas · janela móvel de ${HP.janela} dias`;
      const todas = HP.tipos["útil"].map(r => r[0]);
      const ini = HP_PER === "todo" ? "2025-01-01" : (() => { const d = new Date(todas[todas.length - 1] + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - (HP_PER === "6m" ? 6 : 12)); return d.toISOString().slice(0, 10); })();
      const xs = todas.filter(d => d >= ini);
      const porT = Object.fromEntries(TIPOS.map(([t]) => [t, new Map(HP.tipos[t].map(r => [r[0], r]))]));
      const rotXd = (d, i) => (d.endsWith("-01") && (d.slice(5, 7) === "01" || i === 0) ? { t: rot(d.slice(0, 7)), forte: true } : d.endsWith("-01") && (HP_PER === "6m" || +d.slice(5, 7) % 3 === 1) ? MES[+d.slice(5, 7) - 1] : null);
      const graf = (id, col, fmt, y0, y1, ref2) => G(id, 210, (svg, w, h) => linhasA(svg, { w, h, ml: 40, mr: 44, xs, y0, y1, nt: 4, fmtY: fmt, rotX: rotXd, rotFim: true,
        series: (ref2 ? [{ nome: "DECOMP", cor: "var(--ink-3)", larg: 1.2, tracejado: true, pts: xs.map(d => { const r = porT["útil"].get(d); return [d, r ? r[iCol[ref2]] : null]; }) }] : []).concat(TIPOS.map(([t, nome, cor]) => { const pts = xs.map(d => { const r = porT[t].get(d); return [d, r ? r[iCol[col]] : null]; }); const u = [...pts].reverse().find(p => p[1] != null);
          return { nome, cor, larg: t === "útil" ? 1.8 : 1.1, pts, rotFim: u ? fmt(u[1]) : null }; })),
        dica: d => `<b>${dataBr(d)}</b> · ${HP.janela} dias antes<br>` + TIPOS.map(([t, nome]) => { const r = porT[t].get(d); return r ? `${nome}: ${fmt(r[iCol[col]])}${ref2 ? ` (prêmio ${sn(r[iCol.premio_ponta], 0)} sobre DECOMP ${n(r[iCol.decomp], 0)})` : ` · espaço ${n(r[iCol.espaco])}`}` : ""; }).join("<br>") }));
      graf("g-hp-piso", "horas_piso", v => n(v, 1), 0, 8);
      // desconto das outras horas (D087): uma curva só, todas as horas fora da ponta e do piso, e a média de 12 meses
      // D089: janela com DECOMP no piso (espaço médio < R$ 20 ou ≥ 25% dos dias no piso) = trecho esmaecido
      { const fmtF = v => sn(v * 100, 0) + "%", porTd = new Map((HP.tipos.todos || []).map(r => [r[0], r])), ESP_MIN = 20;
        const val = d => { const r = porTd.get(d); return r ? r[iCol.frac_fora] : null; };
        const baixo = d => { const r = porTd.get(d); return r != null && (r[iCol.espaco] < ESP_MIN || (r[iCol.frac_dias_piso] ?? 0) >= 0.25); };
        const ptsOk = xs.map(d => [d, baixo(d) ? null : val(d)]);
        const ptsBaixo = xs.map((d, i) => [d, baixo(d) || (i > 0 && baixo(xs[i - 1])) || (i + 1 < xs.length && baixo(xs[i + 1])) ? Math.min(val(d), 0.5) : null]);
        const u = [...xs].reverse().find(d => val(d) != null);
        G("g-hp-fora", 210, (svg, w, h) => linhasA(svg, { w, h, ml: 40, mr: 52, xs, y0: -0.5, y1: 0.2, nt: 4, fmtY: fmtF, rotX: rotXd, rotFim: true,
          series: (D.ref_fora ? [{ nome: "média 12m", cor: "var(--ink-3)", larg: 1.2, tracejado: true, opac: 0.9, pts: xs.map(d => [d, D.ref_fora.todos.valor]) }] : [])
            .concat([{ nome: "DECOMP no piso", cor: TIPOS[0][2], larg: 1.4, tracejado: true, opac: 0.35, pts: ptsBaixo, rotFim: u && baixo(u) ? "no piso" : null },
              { nome: "todos os dias", cor: TIPOS[0][2], larg: 1.8, pts: ptsOk, rotFim: u && !baixo(u) ? fmtF(val(u)) : null }]),
          dica: d => { const r = porTd.get(d); if (!r) return `<b>${dataBr(d)}</b>`;
            const cab = `<b>${dataBr(d)}</b> · ${HP.janela} dias antes · espaço ${n(r[iCol.espaco])}<br>`;
            const nPiso = Math.round((r[iCol.frac_dias_piso] ?? 0) * HP.janela);
            if (baixo(d)) return cab + `${nPiso} de ${HP.janela} dias com DECOMP no piso: ${fmtF(r[iCol.frac_fora])} não é comparável (o desvio desses dias entra sem espaço; abaixo de R$ 20 a conta divide por 20)` + (r[iCol.espaco] < ESP_MIN ? `<br>desvio de ${sn(r[iCol.frac_fora] * ESP_MIN, 1)} R$/h sobre o DECOMP` : "");
            return cab + `todos os dias: ${fmtF(r[iCol.frac_fora])}<br>` + TIPOS.map(([t, nome]) => { const x = porT[t].get(d); return x ? `${nome}: ${fmtF(x[iCol.frac_fora])}` : ""; }).join(" · "); } })); }
      if (D.ref_fora) { const rt = D.ref_fora_tipo, cur = { "útil": "útil", "sábado": "sáb.", "domingo/feriado": "dom." };
        document.getElementById("ref12-fora").innerHTML = `<b>Padrão do simulador = ${sn(D.ref_fora.todos.valor * 100, 1)}%</b>, média de 12 meses (${rot(D.ref_fora.todos.de)}–${rot(D.ref_fora.todos.ate)}, meses com DECOMP acima do piso), um número para todos os dias` + (rt ? `<br><small>Por tipo de dia, só para leitura: ` + TIPOS.map(([t, , cor]) => `<span style="color:${cor}">${cur[t]} ${sn(rt[t].valor * 100, 0)}%</span>`).join(" · ") + `</small>` : ""); }
      document.getElementById("leg-hp").textContent = `Linhas: média dos ${HP.janela} dias anteriores a cada data, por tipo de dia (o último ponto é hoje); embaixo, cada dia da janela. As horas no piso são premissa do simulador; o desconto das outras horas aparece numa curva só (todas as horas fora da ponta e do piso; por tipo de dia na dica; trecho tracejado claro = janela com DECOMP no piso, espaço médio abaixo de R$ 20 ou ao menos um quarto dos dias no piso, em que o % não é comparável) e é só informativo: o simulador usa a média de 12 meses (tracejado), um número para todos os dias, que acertou mais no backtest. O período no topo vale para todos os gráficos do bloco; o tipo de dia, só para o preço da ponta.`;
    }
    desenharHP();

    // premissas mês a mês (D059): no desempenho, a premissa na RV0 do mês (janela padrão, previsão de 1 mês) × o realizado
    const HMT = { hm: "útil", hd: "útil" };
    abas("abas-hd", TIPOS.map(([t, nome]) => [t, nome]), HMT.hd, v => { HMT.hd = v; desenharHM("hd"); });
    function desenharHM(pref) {
      const T = HMT[pref], rv0 = pref === "hd";
      let rows = (D.premissas_mensal[T] || []).slice().sort((a, b) => (a.mes < b.mes ? -1 : 1));
      const parcialMes = ref.ultimo_dia.slice(0, 7);
      if (rv0) rows = rows.filter(r => r.mes < parcialMes && r.rv0_horas_piso != null);
      const xs = rows.map(r => r.mes), ult = xs[xs.length - 1], parcial = !rv0 && ult === parcialMes;
      const nomeT = TIPOS.find(x => x[0] === T)[1];
      const atual = rv0 ? null : { horas_piso: PREM[T].horas_piso, frac_fora: PREM[T].frac_fora, ponta_media: precoEf(T, "ponta", DEC, cal[MES_I].piso) };
      const rotM3 = (mm, i) => (mm.endsWith("-01") || i === 0 ? { t: rot(mm), forte: true } : +mm.slice(5, 7) % 3 === 1 ? MES[+mm.slice(5, 7) - 1] : null);
      const dicaHM = mm => { const r = rows.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b>${mm === ult && parcial ? " (parcial)" : ""} · ${nomeT}, ${r.dias} dias<br>DECOMP médio ${n(r.decomp, 0)} · espaço ${n(r.espaco, 0)}<br>` +
        (rv0 ? `horas do vale no piso: RV0 ${n(r.rv0_horas_piso, 1)} → real ${n(r.horas_piso, 1)}<br>outras horas: RV0 ${sn(r.rv0_frac_fora * 100, 0)}% → real ${sn(r.frac_fora * 100, 0)}%<br>ponta: RV0 R$ ${n(r.rv0_ponta, 0)} → real R$ ${n(r.ponta_media, 0)}<br><small>RV0 rodada em ${dataBr(r.rv0)}; ponta na RV0 = DECOMP do mês + prêmio da janela</small>`
          : `horas do vale no piso ${n(r.horas_piso, 1)} · outras horas ${sn(r.frac_fora * 100, 0)}%<br>ponta média R$ ${n(r.ponta_media, 0)} (prêmio ${sn(r.premio_ponta, 0)}) · maior dia ${n(r.ponta_max_dia, 0)}`); };
      const graf = (sufixo, colReal, colRv0, fmt, y0, y1, comDecomp) => G(`g-${pref}-${sufixo}`, 190, (svg, w, h) => {
        const m = { l: 40, r: rv0 ? 8 : 52, t: 10, b: 24 };
        const refF = !rv0 && sufixo === "fora" && D.ref_fora ? D.ref_fora[T].valor : null;
        const extra = rv0 ? rows.map(r => [r.mes, r[colRv0]]) : xs.flatMap(mm => [[mm, atual[colReal]], [mm, refF]]);
        linhasA(svg, { w, h, ml: m.l, mr: m.r, xs, y0, y1, nt: 4, fmtY: fmt, centro: true, rotX: rotM3,
          series: [...(comDecomp ? [{ nome: "DECOMP", cor: "var(--ink-3)", larg: 1.3, tracejado: true, pts: rows.map(r => [r.mes, r.decomp]) }] : []),
            { nome: "Realizado", cor: "var(--accent)", larg: 2, pts: rows.map(r => [r.mes, r[colReal]]).filter(p => !(parcial && p[0] === ult)) },
            { nome: "eixo", cor: "transparent", pts: [...extra, ...rows.map(r => [r.mes, r[colReal]])] }],
          dica: dicaHM });
        // mesmo eixo do gráfico de linhas (mesmos valores)
        const ys = [...rows.flatMap(r => [r[colReal], comDecomp ? r.decomp : null]), ...extra.map(p => p[1])].filter(v => v != null && isFinite(v));
        const ax = eixo(Math.min(y0 ?? Infinity, ...ys), Math.max(y1 ?? -Infinity, ...ys), 4);
        const x = i => m.l + (i + 0.5) * (w - m.l - m.r) / xs.length, y = v => m.t + (h - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a));
        rows.forEach((r, i) => {
          if (rv0 && r[colRv0] != null) S(svg, "circle", { cx: x(i), cy: y(r[colRv0]), r: 3.2, fill: "none", stroke: "var(--rl-verm)", "stroke-width": 1.6, "pointer-events": "none" });
          if (r[colReal] != null) S(svg, "circle", { cx: x(i), cy: y(r[colReal]), r: 2.4, fill: "var(--accent)", stroke: "var(--accent)", "stroke-width": 1.6, "pointer-events": "none" });
        });
      });
      graf("piso", "horas_piso", "rv0_horas_piso", v => n(v, 1), 0, 8);
      graf("fora", "frac_fora", "rv0_frac_fora", v => sn(v * 100, 0) + "%", -0.5, 0.2);
      graf("ponta", "ponta_media", "rv0_ponta", v => n(v, 0), 0, null, true);
      document.querySelector(`#t-${pref} tbody`).innerHTML = rows.slice().reverse().map(r => `<tr><td>${rot(r.mes)}</td><td class="n">${r.dias}</td><td class="n">${n(r.decomp, 0)}</td>` +
        `<td class="n">${n(r.rv0_horas_piso, 1)} → ${n(r.horas_piso, 1)}</td><td class="n">${sn(r.rv0_frac_fora * 100, 0)}% → ${sn(r.frac_fora * 100, 0)}%</td><td class="n">${n(r.rv0_ponta, 0)} → ${n(r.ponta_media, 0)}</td></tr>`).join("");
      document.getElementById(`leg-${pref}`).textContent = `${nomeT}. Linha: o que aconteceu no mês. Anel: o que o simulador usaria na rodada da RV0 do mês (média dos ${D.janela_padrao} dias anteriores), ou seja, a premissa da previsão de 1 mês. Na ponta, o anel é o DECOMP realizado do mês mais o prêmio da janela: separa o erro da premissa do erro do DECOMP. Só meses encerrados.`;
    }
    desenharHM("hd");

    // premissas mês a mês, os três tipos de dia (D071): no app atual só a tabela aparece (os gráficos não têm lugar no HTML)
    function desenharHMTodos() {
      const parcialMes = ref.ultimo_dia.slice(0, 7);
      const Rm = Object.fromEntries(TIPOS.map(([t]) => [t, Object.fromEntries((D.premissas_mensal[t] || []).map(r => [r.mes, r]))]));
      const xs = Object.keys(Rm["útil"]).sort(), ult = xs[xs.length - 1], parcial = ult === parcialMes;
      const atual = t => ({ horas_piso: PREM[t].horas_piso, frac_fora: PREM[t].frac_fora, ponta_media: precoEf(t, "ponta", DEC, cal[MES_I].piso) });
      const fech12 = [D.media12.de, D.media12.ate];
      const med12 = (t, k) => D.media12[t][k];
      const linhaResumo = (rot_, f) => `<tr class="destaque"><td>${rot_}</td><td class="n">${n(DEC, 0)}</td>` + TIPOS.map(([t]) => `<td class="n">${n(f(t, "horas_piso"), 1)}</td>`).join("") + TIPOS.map(([t]) => { const v = f(t, "frac_fora"); return `<td class="n">${v == null ? "—" : sn(v * 100, 0) + "%"}</td>`; }).join("") + TIPOS.map(([t]) => `<td class="n">${n(f(t, "ponta_media"), 0)}</td>`).join("") + "</tr>";
      const resumo = linhaResumo("Simulador agora", (t, k) => atual(t)[k]) +
        linhaResumo(`Média 12 meses (${rot(fech12[0])}–${rot(fech12[fech12.length - 1])})`, (t, k) => (k === "frac_fora" && D.ref_fora ? D.ref_fora[t].valor : k === "ponta_media" ? Math.max(DEC + med12(t, "premio_ponta"), cal[MES_I].piso) : med12(t, k)));
      document.querySelector("#t-hm tbody").innerHTML = resumo + xs.slice().reverse().map(mm => { const c = k => TIPOS.map(([t]) => Rm[t][mm] ? Rm[t][mm][k] : null);
        return `<tr><td>${rot(mm)}${mm === ult && parcial ? " (parcial)" : ""}</td><td class="n">${n(Rm["útil"][mm] && Rm["útil"][mm].decomp, 0)}</td>` +
          c("horas_piso").map(v => `<td class="n">${n(v, 1)}</td>`).join("") + c("frac_fora").map(v => `<td class="n">${v == null ? "—" : sn(v * 100, 0) + "%"}</td>`).join("") + c("ponta_media").map(v => `<td class="n">${n(v, 0)}</td>`).join("") + "</tr>"; }).join("");
      document.getElementById("leg-hm").textContent = `Média dos dias de cada mês civil, por tipo de dia${parcial ? `; ${rot(ult)} é parcial, até ${dataBr(ref.ultimo_dia)}` : ""}. No topo: a premissa no simulador agora e a média dos 12 meses encerrados (na ponta, o prêmio médio de 12 meses aplicado ao DECOMP de ${n(DEC)}). No backtest, a média de 12 meses acertou mais no desconto das outras horas (é o padrão) e na ponta a partir de 2 meses de antecedência; nas horas no piso e na ponta em 1 mês, a janela de 14 dias acertou mais.`;
    }
    let HF = cal[MES_I].h;
    function desenharFaixaSinc() { hSel = HF; document.querySelectorAll("#abas-h button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === HF))); desenharBt(); desenharFaixa(); }

    // ponta por mês e dispersão
    let PM_T = "útil";
    abas("abas-pm", TIPOS.map(([t, nome]) => [t, nome]), PM_T, v => { PM_T = v; desenharPM(); });
    let PM_MES = null;
    function desenharPM() {
      const rows = D.ponta_mensal[PM_T], xs = rows.map(r => r.mes), nomeT = TIPOS.find(x => x[0] === PM_T)[1];
      if (!PM_MES || !xs.includes(PM_MES)) PM_MES = xs[xs.length - 1];
      const rotM2 = (mm, i) => (mm.endsWith("-01") || i === 0 ? { t: rot(mm), forte: true } : +mm.slice(5, 7) % 3 === 1 ? MES[+mm.slice(5, 7) - 1] : null);
      const dicaPM = mm => { const r = rows.find(x => x.mes === mm); return `<b>${rotLongo(mm)}</b> · ${nomeT} (${r.dias} dias)<br>ponta média R$ ${n(r.ponta, 0)} · DECOMP ${n(r.decomp, 0)} · prêmio ${sn(r.premio, 0)}<br>menor dia ${n(r.ponta_min_dia, 0)} · maior dia ${n(r.ponta_max_dia, 0)} · hora mais cara ${n(r.ponta_max_hora, 0)}<br><i>clique para ver a dispersão</i>`; };
      G("g-pm-preco", 230, (svg, W, Hh) => linhasA(svg, { w: W, h: Hh, ml: 46, mr: 8, xs, y0: 0, nt: 5, centro: true, justo: true, rotX: rotM2,
        antes: ({ x, y, m, w, h }) => { const meio = (w - m.l - m.r) / xs.length / 2;
          S(svg, "rect", { x: x(PM_MES) - meio, y: m.t, width: 2 * meio, height: h - m.t - m.b, fill: "var(--vazio)", stroke: "var(--accent)", "stroke-width": 1, opacity: 0.9 });
          S(svg, "path", { d: rows.map((r, i) => `${i ? "L" : "M"}${x(r.mes)},${y(r.ponta_max_dia)}`).join("") + [...rows].reverse().map(r => `L${x(r.mes)},${y(r.ponta_min_dia)}`).join("") + "Z", fill: "color-mix(in srgb, var(--accent) 22%, transparent)" }); },
        series: [{ nome: "Máx", cor: "transparent", pts: rows.map(r => [r.mes, r.ponta_max_dia]) }, { nome: "DECOMP", cor: "var(--ink-3)", larg: 1.4, tracejado: true, pts: rows.map(r => [r.mes, r.decomp]) }, { nome: "Ponta", cor: "var(--accent)", pts: rows.map(r => [r.mes, r.ponta]), pontos: true }],
        dica: dicaPM, clique: mm => { PM_MES = mm; desenharPM(); } }));
      desenharDispersao(rows.find(r => r.mes === PM_MES), nomeT);
      document.getElementById("leg-pm").textContent = `${nomeT}. Em cima, a média das horas de 18h a 21h de cada mês, com a faixa do menor ao maior dia e o DECOMP médio. Embaixo, cada hora de ponta do mês selecionado: as bolhas juntam horas de preço parecido (o tamanho é o número de horas) e as linhas marcam os percentis 10, 50 e 90 e o DECOMP médio. O mês corrente é parcial.`;
    }
    // dispersão das horas de ponta do mês escolhido: bolhas por faixa de preço, tamanho = número de horas
    function desenharDispersao(r, nomeT) {
      const vs = ((D.ponta_horas || {})[PM_MES] || {})[PM_T] || [];
      document.getElementById("tt-pm-disp").textContent = `Dispersão das horas de ponta · ${rotLongo(PM_MES)}${PM_MES === ref.ultimo_dia.slice(0, 7) ? " (parcial)" : ""} · ${nomeT.toLowerCase()} · ${vs.length} horas`;
      G("g-pm-disp", 170, (svg, w, h) => {
        const m = { l: 20, r: 20, t: 34, b: 26 };
        if (!vs.length) { S(svg, "text", { x: w / 2, y: h / 2, "text-anchor": "middle" }, "sem horas de ponta para esse tipo de dia no mês"); return; }
        const ord = [...vs].sort((a, b) => a - b), Q = D.ponta_quantis[PM_MES][PM_T], q = p => Q[{ 0.1: 0, 0.5: 1, 0.9: 2 }[p]];
        const amp = ord[ord.length - 1] - ord[0], passoB = amp > 600 ? 25 : amp > 250 ? 10 : 5;
        const ax = eixo(Math.min(ord[0], r ? r.decomp : ord[0]), Math.max(ord[ord.length - 1], r ? r.decomp : ord[0]), w < 600 ? 5 : 10);
        const x = v => m.l + (w - m.l - m.r) * (v - ax.a) / (ax.b - ax.a), yc = (m.t + h - m.b) / 2 + 6;
        ax.t.forEach(t => { S(svg, "line", { x1: x(t), x2: x(t), y1: m.t - 4, y2: h - m.b, stroke: "var(--rule)" }); S(svg, "text", { x: x(t), y: h - 8, "text-anchor": "middle" }, n(t)); });
        const mcs = [[q(0.1), "p10", "var(--ink-2)"], [q(0.5), "p50", "var(--accent)"], [q(0.9), "p90", "var(--ink-2)"]];
        if (r) mcs.push([r.decomp, "DECOMP", "var(--ink-3)"]);
        const usados = [];
        mcs.forEach(([v, t, cor]) => { const xx = x(v); S(svg, "line", { x1: xx, x2: xx, y1: m.t - 6, y2: h - m.b, stroke: cor, "stroke-width": t === "DECOMP" ? 1.2 : 1.6, "stroke-dasharray": t === "DECOMP" ? "4 3" : null });
          const nivel = usados.filter(u => Math.abs(u - xx) < 70).length; usados.push(xx);
          S(svg, "text", { x: xx, y: m.t - 10 - nivel * 11, "text-anchor": "middle", class: "forte", style: `fill:${cor}` }, `${t} ${n(v)}`); });
        const bins = new Map(); vs.forEach(v => { const k = Math.floor(v / passoB) * passoB; bins.set(k, (bins.get(k) || 0) + 1); });
        const maxC = Math.max(...bins.values());
        [...bins.entries()].sort((a, b) => a[0] - b[0]).forEach(([k, c]) => {
          const cx = x(k + passoB / 2), rr = 3 + 13 * Math.sqrt(c / maxC);
          const bol = S(svg, "circle", { cx, cy: yc, r: rr, fill: "color-mix(in srgb, var(--accent) 55%, transparent)", stroke: "var(--accent)", "stroke-width": 1 });
          dicaEm(bol, `<b>R$ ${n(k)} a ${n(k + passoB)}</b><br>${c} ${c === 1 ? "hora" : "horas"} (${pct(c / vs.length)} das horas de ponta do mês)`); });
      });
    }
    desenharPM();

    // faixa 10–90%: erros do backtest usados
    const REG = "2025-03", bt1 = D.backtest.filter(r => r.h === 1 && r.mes >= REG).map(r => r.mes).sort();
    const perReg = bt1.length ? `${MES[+bt1[0].slice(5, 7) - 1]}/${bt1[0].slice(0, 4)}–${MES[+bt1[bt1.length - 1].slice(5, 7) - 1]}/${bt1[bt1.length - 1].slice(0, 4)}` : "—";
    function desenharFaixa() {
      const rs = D.backtest.filter(r => r.h === HF && r.mes >= REG).sort((a, b) => a.erro - b.erro), e = D.confianca.find(r => r.h === HF);
      G("g-faixa", 150, (svg, w, h) => {
        const m = { l: 20, r: 20, t: 34, b: 30 };
        const ax = eixo(Math.min(...rs.map(r => r.erro), e.erro_p10), Math.max(...rs.map(r => r.erro), e.erro_p90), w < 600 ? 5 : 10);
        const x = v => m.l + (w - m.l - m.r) * (v - ax.a) / (ax.b - ax.a), yb = h - m.b;
        S(svg, "rect", { x: x(e.erro_p10), y: m.t - 6, width: x(e.erro_p90) - x(e.erro_p10), height: yb - m.t + 6, fill: "var(--faixa-proj)" });
        ax.t.forEach(t => { S(svg, "line", { x1: x(t), x2: x(t), y1: m.t - 6, y2: yb, stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: x(t), y: h - 10, "text-anchor": "middle" }, sn(t)); });
        [[e.erro_p10, "p10 " + sn(e.erro_p10, 1)], [e.erro_p90, "p90 " + sn(e.erro_p90, 1)]].forEach(([v, t]) => { S(svg, "line", { x1: x(v), x2: x(v), y1: m.t - 10, y2: yb, stroke: "var(--accent)", "stroke-width": 1.6 }); S(svg, "text", { x: x(v), y: m.t - 14, "text-anchor": "middle", class: "forte" }, t); });
        const niv = {}; rs.forEach(r => { const k = Math.round(x(r.erro) / 9); niv[k] = (niv[k] || 0) + 1; const yy = yb - 10 - (niv[k] - 1) * 11;
          const c = S(svg, "circle", { cx: x(r.erro), cy: yy, r: 4.5, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1.5 });
          dicaEm(c, `<b>${rotLongo(r.mes)}</b> · M+${HF}<br>DECOMP ${n(r.decomp, 1)} → previsto ${n(r.prev, 1)}<br>oficial ${n(r.real, 1)} · erro ${sn(r.erro, 1)}`); });
      });
      document.getElementById("tt-faixa").textContent = `Como a faixa 10–90% é calculada (${HF === 1 ? "1 mês" : HF + " meses"} de antecedência)`;
      document.getElementById("leg-faixa").textContent = `Cada ponto é um mês do backtest fora da amostra (${perReg}, ${rs.length} meses): erro = previsto − PLD oficial, em R$/MWh, na mesma antecedência. A faixa do simulador vai de PLD previsto − p90 (${sn(e.erro_p90, 1)}) a PLD previsto − p10 (${sn(e.erro_p10, 1)}): se o erro do mês repetir o histórico, o oficial cai nela 8 em 10 vezes. Com ${rs.length} meses, p10 e p90 são quase o 2º menor e o 2º maior erro. É em R$ fixos: tem o mesmo tamanho com o DECOMP a 60 ou a 380, e não depende da direção prevista.`;
    }
    desenharFaixa();
    atualizar();

    // ---------- desempenho ----------
    const metr = D.desempenho;
    const conf1 = D.confianca.find(r => r.h === 1 && r.direcao_prevista === "desconto");
    const h1 = D.backtest.filter(r => r.h === 1).sort((a, b) => (a.mes < b.mes ? -1 : 1));
    document.getElementById("sub-desemp").textContent = `Teste fora da amostra, ${perReg.replace("–", " a ")} (${bt1.length} meses): em cada mês, o simulador foi rodado como se estivesse na data da previsão, só com o que existia naquele dia, e comparado com o PLD oficial.`;
    const prH1 = h1.filter(r => r.direcao_real === "prêmio"), anosPr = [...new Set(prH1.map(r => r.mes.slice(0, 4)))];
    document.getElementById("tiles-desemp").innerHTML = [
      [n(metr[0].erro, 1), `R$/MWh de erro médio no PLD do mês, com 1 mês de antecedência — contra ${n(metr[0].dec, 1)} supondo PLD = DECOMP`],
      [pct(metr[0].dir), "dos meses com a direção certa (desconto, neutro ou prêmio), com 1 mês de antecedência"],
      [conf1 ? pct(conf1.acerto) : "—", `das vezes em que previu desconto, o desconto veio${conf1 ? ` (${conf1.meses} meses)` : ""}`],
      (() => { const ac = prH1.filter(r => r.direcao_prevista === "prêmio").length, des = prH1.filter(r => r.direcao_prevista === "desconto").length;
        return [`${ac} de ${prH1.length}`, `meses de prêmio (PLD acima do DECOMP) que o simulador previu como prêmio, desde ${rot(h1[0].mes)}; nos outros, previu neutro${des ? ` (${des} como desconto)` : ", nunca desconto"}.` + (anosPr.length ? ` Amostra pequena: ${anosPr.length === 1 ? `todos em ${anosPr[0]}` : `em ${anosPr.join(" e ")}`}` : "")]; })(),
    ].map(([v, d]) => `<div class="tile"><span class="v">${v}</span><span class="d">${d}</span></div>`).join("");
    let hSel = HF;
    abas("abas-h", [1, 2, 3, 4, 5, 6].map(hh => [hh, hh === 1 ? "1 mês" : hh + " meses"]), hSel, v => { hSel = +v; desenharBt(); HF = hSel; desenharFaixa(); });
    // mês a mês (D076): barra = desvio que aconteceu (PLD oficial − DECOMP), na cor da direção; losango = desvio previsto;
    // faixa neutra ±5; ✓/✗ = direção certa ou errada; ao lado, a matriz "previu × veio"
    function desenharBt() {
      const rows = D.backtest.filter(r => r.h === hSel).sort((a, b) => (a.mes < b.mes ? -1 : 1));
      const ante = hSel === 1 ? "1 mês" : `${hSel} meses`;
      document.getElementById("tt-bt").textContent = `Mês a mês: o que o simulador disse × o que aconteceu · previsão com ${ante} de antecedência`;
      const cor = c => (c === "desconto" ? "var(--b-vale)" : c === "prêmio" ? "var(--rl-verm)" : "var(--ink-3)");
      G("g-bt", 300, (svg, w, h) => {
        const m = { l: 40, r: 8, t: 14, b: 44 };
        const vals = rows.flatMap(r => [r.delta_real, r.delta_prev]);
        const ax = eixo(Math.min(-10, ...vals), Math.max(10, ...vals), 6);
        const y = v => m.t + (h - m.t - m.b) * (1 - (v - ax.a) / (ax.b - ax.a)), bw = (w - m.l - m.r) / rows.length, x = i => m.l + (i + 0.5) * bw;
        const i0 = rows.findIndex(r => r.mes >= REG);
        if (i0 > 0) { S(svg, "rect", { x: x(i0) - bw / 2, y: m.t, width: w - m.r - (x(i0) - bw / 2), height: h - m.t - m.b, fill: "var(--vazio)", opacity: 0.35 });
          S(svg, "text", { x: x(i0) - bw / 2 + 4, y: m.t + 10, style: "fill:var(--ink-3)" }, "regime atual (desde mar/25)"); }
        S(svg, "rect", { x: m.l, y: y(5), width: w - m.l - m.r, height: y(-5) - y(5), fill: "var(--vazio)", opacity: 0.9 });
        ax.t.forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--ink-3)" : "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, sn(t)); });
        let ultX = -1e9;
        rows.forEach((r, i) => {
          const yb = y(Math.max(0, r.delta_real)), hb = Math.abs(y(r.delta_real) - y(0));
          S(svg, "rect", { x: x(i) - bw * 0.32, y: yb, width: bw * 0.64, height: Math.max(1, hb), fill: cor(r.direcao_real), opacity: 0.85 });
          const yp = y(r.delta_prev);
          S(svg, "rect", { x: x(i) - 4, y: yp - 4, width: 8, height: 8, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1.2, transform: `rotate(45 ${x(i)} ${yp})` });
          const ok = r.direcao_prevista === r.direcao_real;
          S(svg, "text", { x: x(i), y: h - m.b + 14, "text-anchor": "middle", class: "forte", style: `fill:${ok ? "var(--accent)" : "var(--rl-verm)"}` }, ok ? "✓" : "✗");
          const mm = +r.mes.slice(5, 7), lab = mm === 1 || i === 0 ? [rot(r.mes), "forte"] : mm % 3 === 1 ? [MES[mm - 1], null] : null;
          if (lab && x(i) - ultX >= lab[0].length * 6.4 + 4) { S(svg, "text", { x: x(i), y: h - 6, "text-anchor": "middle", class: lab[1] }, lab[0]); ultX = x(i); }
          const a = S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: h - m.t - m.b + 18, fill: "transparent" });
          dicaEm(a, `<b>${rotLongo(r.mes)}</b> · previsão com ${ante} de antecedência<br>DECOMP ${n(r.decomp, 1)} · PLD oficial ${n(r.real, 1)} · previsto ${n(r.prev, 1)}<br>desvio que aconteceu ${sn(r.delta_real, 1)} (${DIR[r.direcao_real].toLowerCase()}) · previsto ${sn(r.delta_prev, 1)} (${DIR[r.direcao_prevista].toLowerCase()})<br>${ok ? "direção certa" : "direção errada"} · erro no PLD ${sn(r.erro, 1)}`);
        });
      });
      // matriz previu × veio
      const cls = ["desconto", "neutro", "prêmio"];
      document.getElementById("per-mat").textContent = `${rot(rows[0].mes)}–${rot(rows[rows.length - 1].mes)} · ${rows.length} meses`;
      document.querySelector("#t-mat tbody").innerHTML = cls.map(p => { const lin = rows.filter(r => r.direcao_prevista === p), tot = lin.length;
        return `<tr><td>${DIR[p]}<small>${tot} ${tot === 1 ? "vez" : "vezes"}</small></td>` + cls.map(v => { const k = lin.filter(r => r.direcao_real === v).length;
          return `<td class="n${p === v && k ? " ok" : ""}"><b>${k}</b><small>${tot ? pct(k / tot) : "—"}</small></td>`; }).join("") + "</tr>"; }).join("");
      const certos = rows.filter(r => r.direcao_prevista === r.direcao_real).length, premiosR = rows.filter(r => r.direcao_real === "prêmio");
      document.getElementById("leg-mat").textContent = `Linhas: o que o simulador previu; colunas: o que veio. Na diagonal, os acertos (${certos} de ${rows.length}). Meses em que veio prêmio: ${premiosR.length}${premiosR.length ? ` (${premiosR.map(r => rot(r.mes)).join(", ")}), dos quais o simulador previu prêmio em ${premiosR.filter(r => r.direcao_prevista === "prêmio").length}` : ""}.`;
      const prReg = rows.filter(r => r.mes >= REG && r.direcao_real === "prêmio"), anosAntes = [...new Set(premiosR.filter(r => r.mes < REG).map(r => r.mes.slice(0, 4)))];
      document.getElementById("leg-bt").textContent = `Desvio = PLD médio do mês − DECOMP médio, R$/MWh. Barra: o que aconteceu, na cor da direção (abaixo de −5 desconto, acima de +5 prêmio, entre os dois neutro). Losango: o que o simulador previu com as premissas do quadro acima. Quanto mais perto o losango do topo da barra, menor o erro. ` +
        (prReg.length ? `Desde mar/2025, ${prReg.length === 1 ? "um mês de prêmio" : `${prReg.length} meses de prêmio`} (${prReg.map(r => rot(r.mes)).join(", ")}); os demais foram de desconto ou neutro${anosAntes.length ? `; antes, prêmio em ${anosAntes.join(" e ")}` : ""}.` : `Desde mar/2025 todos os meses foram de desconto ou neutro${anosAntes.length ? `; os meses de prêmio são de ${anosAntes.join(" e ")}` : ""}.`);
      document.querySelectorAll("#t-metr tbody tr").forEach(tr => tr.classList.toggle("destaque", +tr.dataset.h === hSel));
    }
    document.querySelector("#t-metr tbody").innerHTML = metr.map(r => { const k = D.confianca.find(x => x.h === r.h && x.direcao_prevista === "desconto");
      return `<tr data-h="${r.h}"><td>${r.h === 1 ? "1 mês" : r.h + " meses"}</td><td class="n"><b>${n(r.erro, 1)}</b></td><td class="n">${n(r.dec, 1)}</td><td class="n">${sn(r.vies, 1)}</td><td class="n">${pct(r.dir)}</td><td class="n">${k ? `${pct(k.acerto)} <small>(${k.meses})</small>` : "—"}</td></tr>`; }).join("");
    { const regH1 = h1.filter(r => r.mes >= REG), nReal = regH1.filter(r => r.direcao_real === "prêmio").length, nPrev = regH1.filter(r => r.direcao_prevista === "prêmio").length;
      document.getElementById("leg-metr").textContent = `"Só DECOMP" é o erro de supor PLD = DECOMP: o ganho do simulador é a diferença.` + (nPrev ? "" : nReal ? ` Houve ${nReal === 1 ? "um mês" : nReal + " meses"} de prêmio no período, mas o simulador não previu prêmio em nenhum mês: ainda não há como medir o acerto quando ele prevê prêmio.` : " Não houve mês de prêmio no período, então ainda não há como medir o acerto quando o simulador prevê prêmio."); }
    desenharBt();
  }

  // ---------- acompanhamento do preço da ponta (D064, D065): médias móveis de 7/14/30/60 dias e referência de 12 meses,
  // por tipo de dia; cada etiqueta mostra o preço médio, o prêmio sobre o DECOMP e o preço equivalente com o DECOMP digitado
  function acompanharPonta(periodo, usarPremio, estado) {
    const PJA = D.ponta_janelas; if (!PJA || !document.getElementById("g-pj")) return { chips: () => {}, desenhar: () => {} };
    const JN = [["7", "7 dias", "var(--t-dom)", 1.2], ["14", "14 dias · premissa", "var(--accent)", 2.4], ["30", "30 dias", "var(--t-sab)", 1.4], ["60", "60 dias", "var(--ink-2)", 1.4]];
    let T = "útil";
    abas("abas-pj-tipo", TIPOS.map(([t, nome]) => [t, nome]), T, v => { T = v; desenhar(); });
    function chips() {
      const PJ = PJA[T], ult = k => PJ[k][PJ[k].length - 1], st = estado(T);
      const itens = JN.map(([k, nome, cor]) => [nome, ult(k), ult(k + "p"), ult(k + "d"), cor]);
      document.getElementById("chips-pj").innerHTML = itens.map(([nome, v, p, dcp, cor]) =>
        `<button type="button" style="--c:${cor}" data-p="${p}" aria-pressed="${st.livre && Math.abs(st.premio - p) < 0.05}" title="Média R$ ${n(v)} com DECOMP médio ${n(dcp)} nesses dias; prêmio ${sn(p)}; com o DECOMP digitado (${n(st.dec)}): R$ ${n(Math.max(st.dec + p, st.piso))}"><small>${nome}</small>R$ ${n(v)}<small>prêmio ${sn(p)} → ${n(Math.max(st.dec + p, st.piso))}</small></button>`).join("");
    }
    document.getElementById("chips-pj").addEventListener("click", e => { const b = e.target.closest("button[data-p]"); if (b) usarPremio(T, +b.dataset.p); });
    function desenhar() {
      const PJ = PJA[T], Rf = PJ.ref12, ult = k => PJ[k][PJ[k].length - 1], nomeT = TIPOS.find(x => x[0] === T)[1];
      const PER = periodo(), N = PJ.datas.length, ini = PER === "todo" ? 0 : Math.max(0, N - (PER === "6m" ? 183 : 365));
      const xs = PJ.datas.slice(ini);
      const rotXd = (d, i) => (d.endsWith("-01") && (d.slice(5, 7) === "01" || i === 0) ? { t: rot(d.slice(0, 7)), forte: true } : d.endsWith("-01") && (PER === "6m" || +d.slice(5, 7) % 3 === 1) ? MES[+d.slice(5, 7) - 1] : null);
      const serie = k => xs.map((d, i) => [d, PJ[k][ini + i]]);
      document.getElementById("tt-pj").textContent = `Preço da ponta (${nomeT.toLowerCase()}): médias móveis de 7, 14, 30 e 60 dias`;
      G("g-pj", 230, (svg, w, h) => linhasA(svg, { w, h, ml: 46, mr: 80, xs, y0: 0, nt: 5, justo: true, rotX: rotXd, rotFim: true,
        series: [{ nome: "DECOMP", cor: "var(--ink-3)", larg: 1.2, tracejado: true, pts: serie("14d"), rotFim: "DEC " + n(ult("14d")) },
          { nome: "ref", cor: "var(--rl-ref)", larg: 1.6, tracejado: true, pts: xs.map(d => [d, Rf.valor]), rotFim: "12m " + n(Rf.valor) },
          ...JN.map(([k, nome, cor, larg]) => ({ nome, cor, larg, pts: serie(k), rotFim: `${k}d ${n(ult(k))}` }))],
        dica: d => { const i = PJ.datas.indexOf(d); return `<b>${dataBr(d)}</b> · ${nomeT.toLowerCase()}, dias anteriores<br>` + JN.map(([k, nome]) => `${nome}: R$ ${n(PJ[k][i])} (prêmio ${sn(PJ[k + "p"][i])} sobre DECOMP ${n(PJ[k + "d"][i])})`).join("<br>"); } }));
      document.getElementById("leg-pj").textContent = `${nomeT}: preço médio das horas de 18h a 21h, R$/MWh; cada ponto usa só os dias anteriores à data. O simulador usa o prêmio sobre o DECOMP (preço − DECOMP médio dos mesmos dias) e soma ao DECOMP digitado: a média de 14 dias é R$ ${n(ult("14"))} com DECOMP médio ${n(ult("14d"))} nesses dias, prêmio de ${sn(ult("14p"))}. Amarelo: média dos 12 meses encerrados (${rot(Rf.de)} a ${rot(Rf.ate)}), com DECOMP médio de R$ ${n(Rf.decomp)}. Clique numa etiqueta para usar aquele prêmio no simulador.`;
      chips();
    }
    desenhar();
    return { chips, desenhar };
  }

  if (PAGINA === "acompanhamento") paginaAcompanhamento(); else paginaSimulador();
  const bt = D.backtest || [];
  const bt1 = bt.filter(r => r.h === 1);
  document.getElementById("fontes").textContent =
    `Fontes: decks do DESSEM e do DECOMP da CCEE, PLD horário publicado pela CCEE e limites do PLD de cada ano. ` +
    `Dados até ${dataBr(ref.ultimo_dia)}${notaCalc}` + (PAGINA === "simulador" && bt1.length ? `; backtest de ${rot(bt1[0].mes)} a ${rot(bt1[bt1.length - 1].mes)}, feito só com a informação disponível na data de cada previsão. Feriados nacionais dos meses ainda sem deck a conferir com o calendário de patamares da CCEE.` : ".");
})();
