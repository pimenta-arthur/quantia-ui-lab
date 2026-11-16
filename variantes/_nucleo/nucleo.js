/* Quantia UI Lab · núcleo navegável compartilhado pelas variantes.
   A variante dá a casca (HTML com marcadores data-q) e o tema.css; este arquivo monta navegação, páginas,
   painéis e gráficos. Gráficos medem o próprio contêiner e redesenham ao mudar de tamanho.
   Depende de ../../padrao/graficos.js (S, dicaEm, eixo, n, sn, pct, rot) e de ficticio.js (window.QD). */
(function () {
  const D = window.QD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, at = {}, html) => { const e = document.createElement(tag); for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]); if (html != null) e.innerHTML = html; return e; };
  // espaço não separável depois de "R$": o valor nunca quebra longe da moeda
  const rs = (v, c = 2) => "R$\u00a0" + n(v, c);
  const srs = (v, c = 2) => (v < 0 ? "−" : v > 0 ? "+" : "") + "R$\u00a0" + n(Math.abs(v), c);
  const cor = id => `var(--sm-${id})`;
  const nomeSub = id => D.SUBS.find(s => s.id === id).nome;
  const horaRot = h => String(h).padStart(2, "0") + "h";
  const seta = v => v > 0 ? "▲" : v < 0 ? "▼" : "■";
  const tom = v => v > 0 ? "sobe" : v < 0 ? "desce" : "neutro";
  const OPC = Object.assign({ teclas: false, aoVivo: false, rotacao: 0, notas: false }, window.QUANTIA_VARIANTE || {});

  // ---------- gráficos responsivos ----------
  const ro = new ResizeObserver(ents => ents.forEach(e => e.target._desenhar && requestAnimationFrame(e.target._desenhar)));
  function graf(pai, fn, alt) {
    const box = el("div", { class: "graf", "data-alt": alt || null });
    pai.append(box);
    let ultimo = "";
    box._desenhar = () => {
      const W = Math.round(box.clientWidth), H = Math.round(box.clientHeight);
      if (W < 40 || H < 40 || `${W}x${H}` === ultimo) return;
      ultimo = `${W}x${H}`;
      box.replaceChildren();
      const svg = S(box, "svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": pai.closest(".painel")?.querySelector(".ttl")?.textContent || "Gráfico" });
      fn(svg, W, H);
    };
    ro.observe(box);
    return box;
  }
  // rótulos do eixo X sem encostar: só desenha quando há espaço desde o último
  function rotulosX(svg, idx, x, y, txt, gap = 46) {
    let ult = -1e9;
    idx.forEach(i => { const t = txt(i); if (t == null) return; const px = x(i); if (px - ult < gap) return; S(svg, "text", { x: px, y, "text-anchor": "middle" }, t); ult = px; });
  }
  function ponteiro(svg, e, W) { const r = svg.getBoundingClientRect(); return (e.clientX - r.left) * W / r.width; }

  /** linhas: o = { n, series:[{nome,v,cor,larg,tracejado}], faixa:{lo,hi}, refs:[{v,rot}], marca:{i,rot}, rotX(i), titX(i), fmt, zero } */
  function linhas(svg, W, H, o) {
    const m = { l: 50, r: 16, t: 14, b: 24 }, fmt = o.fmt || (v => n(v));
    const vals = [];
    o.series.forEach(s => s.v.forEach(v => v != null && vals.push(v)));
    if (o.faixa) [...o.faixa.lo, ...o.faixa.hi].forEach(v => v != null && vals.push(v));
    (o.refs || []).forEach(r => vals.push(r.v));
    if (o.zero) vals.push(0);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.06;
    const e = eixo(lo - pad, hi + pad, H < 200 ? 3 : 5);
    const x = i => m.l + (o.n === 1 ? 0 : i * (W - m.l - m.r) / (o.n - 1));
    const y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    const casas = Math.max(0, Math.ceil(-Math.log10((e.t[1] - e.t[0]) || 1) - 1e-9));  // passo 0,05 → 2 casas
  e.t.forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)", "stroke-width": t === 0 ? 1.4 : 1 }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t, casas)); });
    const idx = [...Array(o.n).keys()];
    rotulosX(svg, idx, x, H - 6, o.rotX || (i => i));
    if (o.faixa) {
      const ok = idx.filter(i => o.faixa.lo[i] != null);
      const pts = [...ok.map(i => [x(i), y(o.faixa.hi[i])]), ...ok.reverse().map(i => [x(i), y(o.faixa.lo[i])])];
      S(svg, "polygon", { points: pts.map(p => p.join(",")).join(" "), fill: "var(--faixa-proj)" });
    }
    (o.refs || []).forEach(r => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(r.v), y2: y(r.v), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" }); S(svg, "text", { x: W - m.r, y: y(r.v) - 4, "text-anchor": "end" }, r.rot); });
    if (o.marca) { S(svg, "line", { x1: x(o.marca.i), x2: x(o.marca.i), y1: m.t, y2: H - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "2 3" }); S(svg, "text", { x: x(o.marca.i) + 4, y: m.t + 9 }, o.marca.rot); }
    o.series.forEach(s => {
      let seg = [], segs = [];
      s.v.forEach((v, i) => { if (v == null) { if (seg.length) segs.push(seg); seg = []; } else seg.push(`${x(i)},${y(v)}`); });
      if (seg.length) segs.push(seg);
      segs.forEach(p => S(svg, "polyline", { points: p.join(" "), fill: "none", stroke: s.cor, "stroke-width": s.larg || 2, "stroke-dasharray": s.tracejado ? "5 4" : null, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: s.opac || null }));
      const ult = s.v.map((v, i) => v == null ? -1 : i).filter(i => i >= 0).pop();
      if (ult != null && !s.semPonto) S(svg, "circle", { cx: x(ult), cy: y(s.v[ult]), r: 3.5, fill: s.cor, stroke: "var(--surface)", "stroke-width": 2 });
    });
    // camada de hover: guia vertical e tooltip com todas as séries do ponto
    const guia = S(svg, "line", { x1: 0, x2: 0, y1: m.t, y2: H - m.b, stroke: "var(--ink-2)", "stroke-width": 1, opacity: 0 });
    const alvo = S(svg, "rect", { x: m.l, y: m.t, width: Math.max(1, W - m.l - m.r), height: H - m.t - m.b, fill: "transparent" });
    const passoX = o.n > 1 ? (W - m.l - m.r) / (o.n - 1) : 1;
    dicaEm(alvo, ev => {
      const i = Math.max(0, Math.min(o.n - 1, Math.round((ponteiro(svg, ev, W) - m.l) / passoX)));
      guia.setAttribute("x1", x(i)); guia.setAttribute("x2", x(i)); guia.setAttribute("opacity", 0.5);
      const linhasDica = o.series.filter(s => s.v[i] != null).map(s => `<span class="dica-l"><i style="background:${s.cor}"></i>${s.nome}: <b>${fmt(s.v[i])}</b></span>`);
      if (o.faixa && o.faixa.lo[i] != null) linhasDica.push(`<span class="dica-l">Faixa seco–úmido: ${fmt(o.faixa.lo[i])} a ${fmt(o.faixa.hi[i])}</span>`);
      return `<b>${(o.titX || o.rotX || (k => k))(i)}</b>${linhasDica.join("")}`;
    });
    alvo.addEventListener("pointerleave", () => guia.setAttribute("opacity", 0));
  }

  /** barras agrupadas, com sinal: o = { cats, series:[{nome,v,cor}], fmt, rotX(i) } */
  function barras(svg, W, H, o) {
    const m = { l: 50, r: 12, t: 12, b: 24 }, fmt = o.fmt || (v => n(v, 1));
    const vals = [0]; o.series.forEach(s => vals.push(...s.v));
    const e = eixo(Math.min(...vals), Math.max(...vals), H < 200 ? 3 : 5);
    const y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    const bw = (W - m.l - m.r) / o.cats.length, k = o.series.length, larg = Math.max(2, Math.min(28, (bw - 6) / k - 2));
    const casas = Math.max(0, Math.ceil(-Math.log10((e.t[1] - e.t[0]) || 1) - 1e-9));  // passo 0,05 → 2 casas
  e.t.forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)", "stroke-width": t === 0 ? 1.4 : 1 }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t, casas)); });
    const cx = i => m.l + bw * (i + 0.5);
    rotulosX(svg, [...o.cats.keys()], cx, H - 6, o.rotX || (i => o.cats[i]), 40);
    o.cats.forEach((c, i) => {
      const x0 = cx(i) - (k * (larg + 2) - 2) / 2;
      o.series.forEach((s, j) => {
        const v = s.v[i], y1 = y(Math.max(0, v)), y2 = y(Math.min(0, v));
        const r = S(svg, "rect", { x: x0 + j * (larg + 2), y: y1, width: larg, height: Math.max(1, y2 - y1), fill: s.cor, rx: Math.min(3, larg / 3) });
        dicaEm(r, `<b>${c}</b><span class="dica-l"><i style="background:${s.cor}"></i>${s.nome}: <b>${fmt(v)}</b></span>`);
      });
    });
  }

  /** histograma: o = { dados, de, ate, passo, cor, fmtBin, marca:{v,rot} } */
  function histograma(svg, W, H, o) {
    const nb = Math.round((o.ate - o.de) / o.passo), cont = Array(nb).fill(0);
    o.dados.forEach(v => { const b = Math.floor((v - o.de) / o.passo); if (b >= 0 && b < nb) cont[b]++; });
    const tot = o.dados.length, m = { l: 40, r: 12, t: 12, b: 24 };
    const e = eixo(0, Math.max(...cont) / tot * 100, 3);
    const x = v => m.l + (v - o.de) / (o.ate - o.de) * (W - m.l - m.r), y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    e.t.forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t) + "%"); });
    cont.forEach((c, b) => {
      const v0 = o.de + b * o.passo, p = c / tot * 100;
      const r = S(svg, "rect", { x: x(v0) + 1, y: y(p), width: Math.max(1, x(v0 + o.passo) - x(v0) - 2), height: Math.max(0, y(0) - y(p)), fill: o.cor(v0), rx: 1.5 });
      dicaEm(r, `<b>${o.fmtBin(v0)} a ${o.fmtBin(v0 + o.passo)}</b><span class="dica-l">${n(p, 1)}% das horas</span>`);
    });
    const marcas = []; for (let v = Math.ceil(o.de / (o.passo * 4)) * o.passo * 4; v <= o.ate; v += o.passo * 4) marcas.push(v);
    rotulosX(svg, marcas.map((_, i) => i), i => x(marcas[i]), H - 6, i => n(marcas[i]), 36);
    if (o.marca) { S(svg, "line", { x1: x(o.marca.v), x2: x(o.marca.v), y1: m.t, y2: H - m.b, stroke: "var(--ink)", "stroke-dasharray": "3 3" }); S(svg, "text", { x: x(o.marca.v) + 4, y: m.t + 9, class: "forte" }, o.marca.rot); }
  }

  function sparkline(pai, v, corL) {
    const W = 84, H = 24, lo = Math.min(...v), hi = Math.max(...v);
    const svg = S(pai, "svg", { viewBox: `0 0 ${W} ${H}`, class: "spark", "aria-hidden": "true" });
    const x = i => 1 + i * (W - 4) / (v.length - 1), y = t => 2 + (H - 4) * (1 - (t - lo) / (hi - lo || 1));
    S(svg, "polyline", { points: v.map((t, i) => `${x(i)},${y(t)}`).join(" "), fill: "none", stroke: corL, "stroke-width": 1.5 });
    S(svg, "circle", { cx: x(v.length - 1), cy: y(v[v.length - 1]), r: 2.2, fill: corL });
  }

  // ---------- peças de HTML ----------
  function legenda(itens) { return `<div class="legenda-mini">${itens.map(([c, t, tipo]) => `<span><i class="${tipo || ""}" style="${tipo ? "border-color" : "background"}:${c}"></i>${t}</span>`).join("")}</div>`; }
  const legSubs = ids => legenda(ids.map(id => [cor(id), nomeSub(id), "l"]));
  function kpis(pai, itens) {
    const g = el("div", { class: "kpis" });
    g.innerHTML = itens.map(k => `<div class="kpi${k.destaque ? " destaque" : ""}"><span class="kpi-r">${k.r}</span><span class="kpi-v num">${k.v}</span>` +
      (k.d != null ? `<span class="kpi-d ${k.tom || ""}">${k.d}</span>` : "") + `</div>`).join("");
    pai.append(g);
  }
  function tabela(pai, cols, linhasT, cls) {
    const box = el("div", { class: "rolagem" });
    box.innerHTML = `<table class="${cls || ""}"><thead><tr>${cols.map(c => `<th class="${c.n ? "n" : ""}">${c.t}</th>`).join("")}</tr></thead><tbody>` +
      linhasT.map(l => `<tr>${l.map((v, j) => `<td class="${cols[j].n ? "n" : ""}">${v}</td>`).join("")}</tr>`).join("") + `</tbody></table>`;
    pai.append(box);
  }
  function medidores(pai, itens) {
    const g = el("div", { class: "medidores" });
    g.innerHTML = itens.map(([r, v, max, u]) => { const p = v / max, nivel = p >= 0.85 ? "critico" : p >= 0.7 ? "atencao" : "ok";
      return `<div class="medidor ${nivel}"><div class="med-cab"><span>${r}</span><span class="num">${n(v, u === "MWm" || u === "meses" ? 1 : 2)} de ${n(max, u === "MWm" || u === "meses" ? 0 : 1)} ${u} · <b>${pct(p)}</b></span></div><div class="med-trilho"><div class="med-barra" style="width:${Math.min(100, p * 100)}%"></div></div></div>`; }).join("");
    pai.append(g);
  }
  // frase de leitura do painel: fica fora do corpo, logo depois do cabeçalho, para a variante poder pô-la ao lado do gráfico
  function nota(pai, txt) { const p = pai.closest(".painel"); p.querySelector(".painel-nota")?.remove(); p.insertBefore(el("p", { class: "painel-nota" }, txt), pai); }
  function bandeiraTag(id, prob) { const b = D.BANDEIRAS[id]; return `<span class="band band-${id}">${b.nome}${prob != null ? ` · ${pct(prob)}` : ""}</span>`; }

  // ---------- páginas ----------
  const PAGINAS = [];
  const pagina = p => PAGINAS.push(p);
  const mediaDia = id => D.media(D.hoje[id]);
  const varDia = id => mediaDia(id) - D.media(D.ontem[id]);
  const ultimaRodada = D.rodadasBand[D.rodadasBand.length - 1][1];
  const probDez = D.probBand[1];

  pagina({
    id: "inicio", cod: "VG", nome: "Visão geral", icone: "M3 12h4l3-8 4 16 3-8h4",
    rotulo: "Domingo, 15 de novembro de 2026", titulo: "Visão geral do mercado de energia",
    premissas: ["PLD horário CCEE (fictício)", "Deck NEWAVE nov/26", "ECMWF 00z 15/11/26"],
    montar(g) {
      painel(g, { id: "kpis", tam: "full", classe: "sem-cab", corpo(c) {
        kpis(c, [
          ...D.SUBS.map(s => ({ r: `PLD médio ${s.nome}`, v: rs(mediaDia(s.id)), d: `${seta(varDia(s.id))} ${srs(varDia(s.id))} vs. ontem`, tom: tom(varDia(s.id)), destaque: s.id === "se" })),
          { r: "Spread NE−SE hoje", v: srs(mediaDia("ne") - mediaDia("se")), d: `${n(D.hoje.ne.filter(v => v <= D.PISO).length)} h no piso no NE`, tom: "neutro" },
          { r: "Bandeira dez/26", v: D.BANDEIRAS.am.nome, d: `${pct(probDez[1])} amarela · ${pct(probDez[2] + probDez[3])} vermelha`, tom: "neutro" },
        ]);
      } });
      painel(g, { id: "pld-hoje", tam: "l", titulo: "PLD horário de hoje por submercado, em R$/MWh", leg: "Média horária de 15/11/26. Tracejado: piso regulatório. Fonte: dados fictícios.", corpo(c) {
        c.insertAdjacentHTML("beforeend", legSubs(["se", "s", "ne", "n"]));
        nota(c, `O NE ficou no piso por ${D.hoje.ne.filter(v => v <= D.PISO).length} horas, com a solar do meio do dia; o pico do SE/CO veio às ${horaRot(D.hoje.se.indexOf(Math.max(...D.hoje.se)))}, em ${rs(Math.max(...D.hoje.se))}.`);
        graf(c, (svg, W, H) => linhas(svg, W, H, { n: 24, series: D.SUBS.map(s => ({ nome: s.nome, v: D.hoje[s.id], cor: cor(s.id) })), refs: [{ v: D.PISO, rot: "piso" }], rotX: i => i % 3 === 0 ? horaRot(i) : null, titX: i => `${horaRot(i)} de 15/11`, fmt: v => rs(v) }));
      } });
      painel(g, { id: "spread30", tam: "l", titulo: "Descolamento diário em relação ao SE/CO, em R$/MWh", leg: "Diferença entre a média diária de cada submercado e a do SE/CO, últimos 30 dias.", corpo(c) {
        c.insertAdjacentHTML("beforeend", legenda([[cor("ne"), "NE − SE/CO", "l"], [cor("n"), "N − SE/CO", "l"]]));
        nota(c, `O spread NE−SE/CO está em ${srs(D.spread30.ne[29])}, contra média de ${srs(D.media(D.spread30.ne))} nos 30 dias.`);
        graf(c, (svg, W, H) => linhas(svg, W, H, { n: 30, zero: true, series: [{ nome: "NE − SE/CO", v: D.spread30.ne, cor: cor("ne") }, { nome: "N − SE/CO", v: D.spread30.n, cor: cor("n") }], rotX: i => i % 5 === 4 ? D.dias30[i] : null, titX: i => D.dias30[i], fmt: v => srs(v) }));
      } });
      painel(g, { id: "band", tam: "m", titulo: "Bandeira tarifária projetada", leg: "Probabilidade de cada bandeira na rodada de 15/11/26; nov/26 já é oficial.", corpo(c) { probabilidades(c, 6); } });
      painel(g, { id: "reserv", tam: "m", titulo: "Reservatórios e afluências", leg: "EAR: energia armazenada em % da máxima. ENA em % da MLT.", corpo(c) { reservatorios(c); } });
      painel(g, { id: "eventos", tam: "m", titulo: "Rodadas e alertas recentes", corpo(c) { eventos(c); } });
    },
  });

  pagina({
    id: "pld", cod: "PLD", nome: "PLD horário", icone: "M4 19V9m5 10V5m5 14v-7m5 7V8",
    rotulo: "Domingo, 15 de novembro de 2026", titulo: "Preço de liquidação das diferenças horário",
    premissas: ["CCEE, publicação de 14/11/26 (fictício)", `Piso ${rs(D.PISO)}`, `Teto horário ${rs(D.TETO)}`],
    montar(g) {
      let sub = "se";
      const curva = painel(g, { id: "curva", tam: "xl", titulo: "Curva do dia, em R$/MWh", abas: D.SUBS.map(s => [s.id, s.nome]), abasRot: "Submercado",
        leg: "Hoje em linha cheia; ontem e média de 7 dias em tons neutros. Tracejado: piso.", corpo(c, aba) {
          sub = aba;
          c.insertAdjacentHTML("beforeend", legenda([[cor(aba), `Hoje (${nomeSub(aba)})`, "l"], ["var(--ink-3)", "Ontem", "t"], ["var(--ink-2)", "Média 7 dias", "l"]]));
          graf(c, (svg, W, H) => linhas(svg, W, H, { n: 24, series: [{ nome: "Média 7 dias", v: D.media7[aba], cor: "var(--ink-2)", larg: 1.4, semPonto: true, opac: 0.7 }, { nome: "Ontem", v: D.ontem[aba], cor: "var(--ink-3)", tracejado: true, larg: 1.5, semPonto: true }, { nome: "Hoje", v: D.hoje[aba], cor: cor(aba), larg: 2.4 }], refs: [{ v: D.PISO, rot: "piso" }], rotX: i => i % 2 === 0 ? horaRot(i) : null, titX: i => horaRot(i), fmt: v => rs(v) }), "alto");
          const est = $("#pld-est"); if (est) estatPLD(est, aba);
        } });
      painel(g, { id: "est", tam: "s", titulo: "Estatísticas do dia", corpo(c) { const d = el("div", { id: "pld-est" }); c.append(d); estatPLD(d, sub); } });
      painel(g, { id: "mapa", tam: "full", titulo: "Mapa de calor da semana, em R$/MWh", abas: D.SUBS.map(s => [s.id, s.nome]), abasRot: "Submercado", leg: "Cada célula é uma hora; mais escura, mais cara. Valores no tooltip.", corpo(c, aba) { mapaCalor(c, aba); } });
      painel(g, { id: "tab", tam: "full", titulo: "Preços por hora, em R$/MWh", corpo(c) {
        tabela(c, [{ t: "Hora" }, ...D.SUBS.map(s => ({ t: s.nome, n: 1 })), { t: "NE − SE/CO", n: 1 }, { t: "N − SE/CO", n: 1 }],
          D.hoje.se.map((_, h) => [horaRot(h), ...D.SUBS.map(s => `<span class="${D.hoje[s.id][h] <= D.PISO ? "no-piso" : ""}">${n(D.hoje[s.id][h], 2)}</span>`), sn(D.hoje.ne[h] - D.hoje.se[h], 2), sn(D.hoje.n[h] - D.hoje.se[h], 2)]), "densa");
      } });
    },
  });

  pagina({
    id: "bandeiras", cod: "BAND", nome: "Bandeiras tarifárias", icone: "M5 21V4m0 0h11l-2 4 2 4H5",
    rotulo: "Horizonte: novembro de 2026 a abril de 2027", titulo: "Projeção das bandeiras tarifárias",
    premissas: ["Deck NEWAVE nov/26", "ECMWF emissão 15/11/26", "Modelo de bandeiras v3"],
    montar(g) {
      painel(g, { id: "kpis", tam: "full", classe: "sem-cab", corpo(c) {
        kpis(c, [
          { r: "Vigente (nov/26)", v: "Amarela", d: `${rs(D.BANDEIRAS.am.custo, 3)} a cada 100 kWh`, destaque: true },
          { r: "Mais provável em dez/26", v: "Amarela", d: `${pct(probDez[1])}; vermelha soma ${pct(probDez[2] + probDez[3])}` },
          { r: "Primeira verde provável", v: "fev/27", d: `${pct(D.probBand[3][0])} de chance` },
          { r: "GSF esperado dez/26", v: n(D.gsf[1], 2), d: "▲ +0,05 vs. rodada anterior", tom: "sobe" },
        ]);
      } });
      painel(g, { id: "prob", tam: "l", titulo: "Probabilidade de cada bandeira por mês", leg: "Rodada de 15/11/26, sobre 2.000 cenários de afluência. Nov/26 já é oficial.", corpo(c) { probabilidades(c, 6, true); } });
      painel(g, { id: "gsf", tam: "l", titulo: "GSF esperado, fator de ajuste do MRE", leg: "Valor esperado da rodada; abaixo de 0,85 a bandeira tende a ficar acima da amarela.", corpo(c) {
        graf(c, (svg, W, H) => linhas(svg, W, H, { n: 6, series: [{ nome: "GSF esperado", v: D.gsf, cor: "var(--accent)", larg: 2.4 }], refs: [{ v: 0.85, rot: "0,85" }], rotX: i => rot(D.mesesBand[i]), fmt: v => n(v, 2) }));
      } });
      painel(g, { id: "hist", tam: "full", titulo: "Bandeira mais provável em cada rodada", leg: "Cada linha é uma rodada semanal; ▲▼ quando a bandeira do mês muda em relação à rodada anterior.", corpo(c) { tabelaBandeiras(c); } });
    },
  });

  pagina({
    id: "pricing", cod: "NEN", nome: "Pricing NE/N", icone: "M4 17l5-5 4 4 7-8M15 8h5v5",
    rotulo: "Compra e venda com descolamento de submercado", titulo: "Pricing do descolamento NE/N",
    premissas: ["Book indicativo de 15/11/26 06:10", "Curva SE/CO da mesa", "Modelo de spread v2"],
    montar(g) {
      const b0 = D.book[0];
      painel(g, { id: "kpis", tam: "full", classe: "sem-cab", corpo(c) {
        kpis(c, [
          { r: "SE/CO dez/26", v: rs(b0[1]), d: `${seta(b0[6])} ${srs(b0[6])} no dia`, tom: tom(b0[6]), destaque: true },
          { r: "Spread NE dez/26 (compra / venda)", v: `${n(b0[2], 1)} / ${n(b0[3], 1)}`, d: `preço NE ${rs(b0[1] + b0[2])} a ${rs(b0[1] + b0[3])}` },
          { r: "Spread N dez/26 (compra / venda)", v: `${n(b0[4], 1)} / ${n(b0[5], 1)}`, d: `preço N ${rs(b0[1] + b0[4])} a ${rs(b0[1] + b0[5])}` },
          { r: "Spread NE−SE/CO realizado em out/26", v: srs(D.spreadMensal.ne[D.i0]), d: `${seta(D.spreadMensal.ne[D.i0] - D.spreadMensal.ne[D.i0 - 1])} ${srs(D.spreadMensal.ne[D.i0] - D.spreadMensal.ne[D.i0 - 1])} vs. set/26`, tom: tom(D.spreadMensal.ne[D.i0] - D.spreadMensal.ne[D.i0 - 1]) },
        ]);
      } });
      painel(g, { id: "book", tam: "xl", titulo: "Book indicativo, em R$/MWh", leg: "Spread sobre o SE/CO; compra é o preço que a mesa paga, venda o que cobra. Valores fictícios.", corpo(c) {
        tabela(c, [{ t: "Produto" }, { t: "SE/CO", n: 1 }, { t: "NE compra", n: 1 }, { t: "NE venda", n: 1 }, { t: "N compra", n: 1 }, { t: "N venda", n: 1 }, { t: "Preço NE médio", n: 1 }, { t: "Var. dia", n: 1 }],
          D.book.map(b => [`<b>${b[0]}</b>`, n(b[1], 2), n(b[2], 1), n(b[3], 1), n(b[4], 1), n(b[5], 1), n(b[1] + (b[2] + b[3]) / 2, 2), `<span class="${tom(b[6])}">${seta(b[6])} ${sn(b[6], 1)}</span>`]), "book");
      } });
      painel(g, { id: "dist", tam: "s", titulo: "Distribuição do spread horário NE−SE/CO", leg: "Últimos 90 dias; tracejado: spread de hoje.", corpo(c) {
        graf(c, (svg, W, H) => histograma(svg, W, H, { dados: D.histSpread, de: -260, ate: 60, passo: 10, cor: v => v < -100 ? "var(--sm-ne)" : "var(--ink-3)", fmtBin: v => srs(v, 0), marca: { v: D.spread30.ne[29], rot: "hoje" } }));
      } });
      painel(g, { id: "serie", tam: "full", titulo: "Spread mensal sobre o SE/CO, em R$/MWh", abas: [["ne", "NE"], ["n", "N"]], abasRot: "Submercado", leg: "Oficial até out/26; depois, projeção do modelo com faixa seco–úmido. Linha vertical: rodada.", corpo(c, aba) {
        c.insertAdjacentHTML("beforeend", legenda([["var(--ink)", "Realizado", "l"], [cor(aba), "Projeção", "l"], ["var(--faixa-proj)", "Faixa seco–úmido"]]));
        const v = D.spreadMensal[aba], real = v.map((t, i) => i <= D.i0 ? t : null), proj = v.map((t, i) => i >= D.i0 ? t : null);
        const lo = v.map((t, i) => i >= D.i0 ? t - 6 * (i - D.i0) : null), hi = v.map((t, i) => i >= D.i0 ? t + 4 * (i - D.i0) : null);
        graf(c, (svg, W, H) => linhas(svg, W, H, { n: D.meses.length, zero: true, faixa: { lo, hi }, series: [{ nome: "Realizado", v: real, cor: "var(--ink)" }, { nome: "Projeção", v: proj, cor: cor(aba), larg: 2.4 }], marca: { i: D.i0, rot: "rodada" }, rotX: i => /-(01|04|07|10)$/.test(D.meses[i]) ? rot(D.meses[i]) : null, titX: i => rot(D.meses[i]), fmt: t => srs(t) }));
      } });
    },
  });

  pagina({
    id: "forecast", cod: "FCST", nome: "Forecast PLD", icone: "M3 17l6-6 4 4 8-8M3 21h18",
    rotulo: "Horizonte: novembro de 2026 a abril de 2027", titulo: "Projeção do PLD médio mensal",
    premissas: ["Deck NEWAVE nov/26 (v 7c1e2a90)", "ECMWF 00z 15/11/26", "Modelo Forecast v4"],
    montar(g) {
      painel(g, { id: "serie", tam: "xl", titulo: "PLD médio mensal, em R$/MWh", abas: D.SUBS.map(s => [s.id, s.nome]), abasRot: "Submercado", leg: "Oficial em linha cheia neutra; esperado na cor do submercado; faixa entre os cenários seco e úmido.", corpo(c, aba) {
        c.insertAdjacentHTML("beforeend", legenda([["var(--ink)", "Oficial", "l"], [cor(aba), "Esperado", "l"], ["var(--faixa-proj)", "Faixa seco–úmido"], ["var(--ink-3)", "Piso", "t"]]));
        const v = D.mensal[aba];
        graf(c, (svg, W, H) => linhas(svg, W, H, { n: D.meses.length, faixa: D.faixa[aba], refs: [{ v: D.PISO, rot: "piso" }], series: [{ nome: "Oficial", v: v.map((t, i) => i <= D.i0 ? t : null), cor: "var(--ink)" }, { nome: "Esperado", v: v.map((t, i) => i >= D.i0 ? t : null), cor: cor(aba), larg: 2.4 }], marca: { i: D.i0, rot: "deck" }, rotX: i => /-(01|07)$/.test(D.meses[i]) ? rot(D.meses[i]) : null, titX: i => rot(D.meses[i]), fmt: t => rs(t) }), "alto");
      } });
      painel(g, { id: "acerto", tam: "s", titulo: "Acerto por horizonte", leg: "Fora da amostra, 36 rodadas. Acerto: dentro da faixa.", corpo(c) {
        tabela(c, [{ t: "Horiz." }, { t: "Acerto", n: 1 }, { t: "MAPE", n: 1 }], D.acerto.map(a => [a[0], pct(a[1]), pct(a[2])]));
      } });
      painel(g, { id: "mult", tam: "full", titulo: "Esperado por submercado em cada mês, mesma escala", leg: "Pequenos múltiplos: barras na mesma escala para comparar meses e submercados.", corpo(c) {
        const box = el("div", { class: "multiplos" }); c.append(box);
        const vmax = Math.max(...D.SUBS.map(s => Math.max(...D.mensal[s.id].slice(D.i0 + 1)))) * 1.1;
        D.meses.slice(D.i0 + 1).forEach((mm, k) => {
          const d = el("div", { class: "mini" }, `<div class="ttl">${rot(mm)}<span>M+${k + 1}</span></div>`); box.append(d);
          graf(d, (svg, W, H) => {
            const bw = W / 4;
            D.SUBS.forEach((s, j) => {
              const v = D.mensal[s.id][D.i0 + 1 + k], hh = (H - 30) * v / vmax;
              const r = S(svg, "rect", { x: j * bw + 6, y: H - 16 - hh, width: bw - 12, height: hh, fill: cor(s.id), rx: 2 });
              S(svg, "text", { x: j * bw + bw / 2, y: H - 3, "text-anchor": "middle" }, s.nome);
              S(svg, "text", { x: j * bw + bw / 2, y: H - 20 - hh, "text-anchor": "middle", class: "valor" }, n(v));
              dicaEm(r, `<b>${rot(mm)} · ${s.nome}</b><span class="dica-l">Esperado ${rs(v)}</span><span class="dica-l">Faixa ${rs(D.faixa[s.id].lo[D.i0 + 1 + k])} a ${rs(D.faixa[s.id].hi[D.i0 + 1 + k])}</span>`);
            });
          }, "baixo");
        });
      } });
      painel(g, { id: "erros", tam: "l", titulo: "Previsto M+1 contra oficial, SE/CO", leg: "Erro em fundo divergente: azul acima do oficial, vermelho abaixo.", corpo(c) {
        tabela(c, [{ t: "Mês" }, { t: "Previsto", n: 1 }, { t: "Oficial", n: 1 }, { t: "Erro", n: 1 }], D.errosRodadas.map(r => { const e = (r.prev - r.ofi) / r.ofi; return [rot(r.mes), n(r.prev, 2), n(r.ofi, 2), `<span class="erro" style="background:${fundoErro(e, 0.15)}">${sn(e * 100, 1)}%</span>`]; }));
      } });
      painel(g, { id: "prem", tam: "l", titulo: "Premissas da rodada", corpo(c) {
        c.insertAdjacentHTML("beforeend", `<dl class="premissas"><dt>Deck</dt><dd>NEWAVE nov/26, revisão 0 (v 7c1e2a90)</dd><dt>Clima</dt><dd>ECMWF 00z de 15/11/26, 51 membros</dd><dt>Carga</dt><dd>Revisão quadrimestral set/26, +2,1% a.a.</dd><dt>Cenários</dt><dd>2.000 séries sintéticas; seco = P10, úmido = P90</dd><dt>Rodada</dt><dd>15/11/26 06:10, 41 min de processamento</dd></dl>`);
      } });
    },
  });

  pagina({
    id: "risco", cod: "RISK", nome: "Risk Lab", icone: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
    rotulo: "Carteira consolidada em 15/11/26", titulo: "Risco da carteira de energia",
    premissas: ["Posições de 14/11/26 23:59", "Curvas da mesa 15/11/26", "Simulação histórica + 2.000 cenários"],
    montar(g) {
      painel(g, { id: "kpis", tam: "full", classe: "sem-cab", corpo(c) {
        kpis(c, [
          { r: "VaR 95% (1 dia)", v: "R$\u00a01,84 mi", d: "▲ +R$ 0,12 mi vs. ontem", tom: "desce", destaque: true },
          { r: "CVaR 95%", v: "R$\u00a02,61 mi", d: "média das perdas além do VaR" },
          { r: "Exposição líquida dez/26", v: "+6,9 MWm", d: "comprado no SE/CO, vendido no NE" },
          { r: "Marcação a mercado", v: "+R$\u00a03,27 mi", d: "▲ +R$ 0,41 mi no dia", tom: "sobe" },
        ]);
      } });
      painel(g, { id: "expo", tam: "xl", titulo: "Exposição por mês e submercado, em MWm", leg: "Acima de zero, comprado; abaixo, vendido. Próximos 12 meses.", corpo(c) {
        c.insertAdjacentHTML("beforeend", legenda([[cor("se"), "SE/CO"], [cor("ne"), "NE"], [cor("n"), "N"]]));
        graf(c, (svg, W, H) => barras(svg, W, H, { cats: D.mesesRisco.map(rot), series: ["se", "ne", "n"].map(id => ({ nome: nomeSub(id), v: D.expo[id], cor: cor(id) })), fmt: v => sn(v, 1) + " MWm" }), "alto");
      } });
      painel(g, { id: "lim", tam: "s", titulo: "Uso dos limites", leg: "Atenção a partir de 70%; crítico a partir de 85%.", corpo(c) { medidores(c, D.limites); } });
      painel(g, { id: "stress", tam: "l", titulo: "Cenários de estresse", leg: "Resultado sobre a marcação a mercado de hoje.", corpo(c) {
        tabela(c, [{ t: "Cenário" }, { t: "Choque" }, { t: "Resultado", n: 1 }], D.stress.map(s => [s[0], `<span class="sutil">${s[2]}</span>`, `<span class="${tom(s[1])}">${seta(s[1])} ${srs(s[1])} mi</span>`]));
      } });
      painel(g, { id: "pnl", tam: "l", titulo: "Distribuição do resultado em 1 dia, em R$ mi", leg: "3.000 cenários. Tracejado: VaR 95%.", corpo(c) {
        graf(c, (svg, W, H) => histograma(svg, W, H, { dados: D.pnl, de: -5, ate: 4, passo: 0.25, cor: v => v < -1.84 ? "var(--desce)" : "var(--accent)", fmtBin: v => n(v, 2), marca: { v: -1.84, rot: "VaR 95%" } }));
      } });
    },
  });

  pagina({
    id: "metodologia", cod: "METO", nome: "Metodologia", icone: "M5 4h10l4 4v12H5zM9 12h6m-6 4h6",
    rotulo: "Documentação", titulo: "Metodologia das projeções",
    premissas: ["Versão do documento 2.3", "Revisada em 10/11/26"],
    montar(g) {
      painel(g, { id: "texto", tam: "full", classe: "texto-corrido", corpo(c) {
        c.insertAdjacentHTML("beforeend", `<div class="texto">
          <h3>Fontes</h3><p>O PLD horário vem da publicação diária da CCEE; as projeções usam o deck oficial do NEWAVE e do DECOMP do mês, com afluências do conjunto de 51 membros do ECMWF. Neste laboratório, todos os números são fictícios.</p>
          <h3>Descolamento NE/N</h3><p>O spread de cada submercado sobre o SE/CO é projetado a partir do limite de intercâmbio, da geração eólica e solar esperada e do histórico horário. O book indicativo soma ao spread esperado um prêmio de risco proporcional à dispersão dos cenários.</p>
          <h3>Bandeiras</h3><p>A bandeira de cada mês é a mais provável entre 2.000 cenários de GSF e PLD, com o acionamento previsto nas regras da ANEEL. A probabilidade mostrada é a fração dos cenários em cada patamar.</p>
          <h3>Risco</h3><p>O VaR de 1 dia combina simulação histórica dos últimos 500 dias com os cenários de afluência; o CVaR é a média das perdas além do VaR.</p></div>`);
      } });
    },
  });

  // ---------- componentes das páginas ----------
  function probabilidades(c, k, completo) {
    const box = el("div", { class: "probs" });
    box.innerHTML = D.mesesBand.slice(0, k).map((mm, i) => {
      const p = D.probBand[i], ids = ["vd", "am", "v1", "v2"], top = ids[p.indexOf(Math.max(...p))];
      return `<div class="prob-l"><span class="prob-m">${rot(mm)}${i === 0 ? ' <small>oficial</small>' : ""}</span><div class="prob-barra">${ids.map((id, j) => p[j] > 0 ? `<span class="seg band-${id}" style="flex:${p[j]}" data-dica="${rot(mm)} · ${D.BANDEIRAS[id].nome}: ${pct(p[j])}">${p[j] >= 0.15 ? pct(p[j]) : ""}</span>` : "").join("")}</div>` +
        (completo ? `<span class="prob-top">${D.BANDEIRAS[top].nome}</span>` : "") + `</div>`;
    }).join("");
    box.insertAdjacentHTML("afterbegin", legenda(["vd", "am", "v1", "v2"].map(id => [`var(--${id})`, D.BANDEIRAS[id].nome])));
    c.append(box);
    $$(".seg", box).forEach(s => dicaEm(s, s.dataset.dica));
  }
  function tabelaBandeiras(c) {
    const box = el("div", { class: "rolagem" });
    box.innerHTML = `<table class="celulas"><thead><tr><th>Rodada</th>${D.mesesBand.map(m => `<th>${rot(m)}</th>`).join("")}</tr></thead><tbody>` +
      D.rodadasBand.map(([dt, bs], r) => `<tr><td class="num">${dataBr(dt)}</td>${bs.map((b, j) => { const ant = r > 0 ? D.rodadasBand[r - 1][1][j] : b, ord = ["vd", "am", "v1", "v2"]; const mud = ord.indexOf(b) - ord.indexOf(ant);
        return `<td><span class="cel band-${b}${j > 0 ? " projetada" : ""}" title="${D.BANDEIRAS[b].nome}">${D.BANDEIRAS[b].sigla}${mud ? `<i>${mud > 0 ? "▲" : "▼"}</i>` : ""}</span></td>`; }).join("")}</tr>`).join("") + `</tbody></table>`;
    c.append(box);
  }
  function reservatorios(c) {
    const box = el("div", { class: "reserv" });
    box.innerHTML = D.reserv.map(r => `<div class="res-l"><span class="res-n">${nomeSub(r.id)}</span><div class="med-trilho"><div class="med-barra" style="width:${r.ear * 100}%;background:${cor(r.id)}"></div></div><span class="num res-v">${pct(r.ear)}</span><span class="num res-e ${tom(r.varSem)}">${seta(r.varSem)} ${sn(r.varSem * 100, 1)} p.p.</span><span class="num res-a">ENA ${pct(r.ena)}</span></div>`).join("");
    c.append(box);
  }
  function eventos(c) {
    const ul = el("ul", { class: "eventos" });
    ul.innerHTML = D.eventos.map(([t, tipo, txt]) => `<li class="ev-${tipo}"><span class="ev-t num">${dataHoraBr(t).slice(0, 5)} ${t.slice(11, 16)}</span><span class="ev-tipo">${tipo}</span><span class="ev-x">${txt}</span></li>`).join("");
    c.append(ul);
  }
  function estatPLD(d, id) {
    const v = D.hoje[id], m = D.media(v), dp = Math.sqrt(D.media(v.map(t => (t - m) ** 2)));
    d.innerHTML = `<dl class="estat">` + [["Média", rs(m)], ["Mínimo", `${rs(Math.min(...v))} às ${horaRot(v.indexOf(Math.min(...v)))}`], ["Máximo", `${rs(Math.max(...v))} às ${horaRot(v.indexOf(Math.max(...v)))}`], ["Desvio-padrão", rs(dp)], ["Horas no piso", n(v.filter(t => t <= D.PISO).length)], ["vs. ontem", srs(m - D.media(D.ontem[id]))]].map(([a, b]) => `<dt>${a}</dt><dd class="num">${b}</dd>`).join("") + `</dl>`;
  }
  function mapaCalor(c, id) {
    const todos = D.semana.flatMap(d => d[id]), lo = Math.min(...todos), hi = Math.max(...todos);
    const box = el("div", { class: "rolagem" });
    box.innerHTML = `<table class="calor"><thead><tr><th></th>${[...Array(24).keys()].map(h => `<th>${String(h).padStart(2, "0")}</th>`).join("")}<th class="n">Média</th></tr></thead><tbody>` +
      D.semana.map((d, k) => `<tr><td class="num">${D.diasSemana[k]}</td>${d[id].map((v, h) => { const p = Math.round((v - lo) / (hi - lo) * 100);
        return `<td class="cc" style="background:color-mix(in srgb, var(--calor) ${p}%, var(--calor-0))" data-dica="${D.diasSemana[k]} ${horaRot(h)} · ${nomeSub(id)}: ${rs(v)}"><span class="${p > 55 ? "claro" : ""}">${n(v)}</span></td>`; }).join("")}<td class="n">${n(D.media(d[id]))}</td></tr>`).join("") + `</tbody></table>`;
    c.append(box);
    $$(".cc", box).forEach(t => dicaEm(t, t.dataset.dica));
  }

  // ---------- painel genérico ----------
  function painel(grade, o) {
    const p = el("section", { class: "painel " + (o.classe || ""), "data-tam": o.tam || "m", "data-id": o.id });
    let aba = o.abas ? o.abas[0][0] : null;
    const corpo = el("div", { class: "painel-corpo" });
    if (o.titulo) {
      const cab = el("header", { class: "painel-cab" });
      cab.append(el("h2", { class: "ttl" }, o.titulo));
      if (o.abas) {
        const ga = el("div", { class: "abas", role: "group", "aria-label": o.abasRot || "Opções" });
        o.abas.forEach(([v, r]) => ga.append(el("button", { type: "button", "data-v": v, "aria-pressed": String(v === aba) }, r)));
        ga.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; aba = b.dataset.v; $$("button", ga).forEach(x => x.setAttribute("aria-pressed", String(x === b))); desenhar(); });
        cab.append(ga);
      }
      p.append(cab);
    }
    p.append(corpo);
    if (o.leg) p.append(el("p", { class: "leg" }, o.leg));
    grade.append(p);
    const desenhar = () => { $$(".graf", corpo).forEach(b => ro.unobserve(b)); corpo.replaceChildren(); o.corpo(corpo, aba); };
    desenhar();
    return p;
  }

  // ---------- casca: navegação, tema, relógio, cotações ----------
  const ICONE = d => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  function montarNav() {
    $$('[data-q="nav"]').forEach(nav => {
      nav.innerHTML = PAGINAS.map((p, i) => `<a href="#${p.id}" data-pg="${p.id}"><span class="nav-k">${i + 1}</span>${ICONE(p.icone)}<span class="nav-cod">${p.cod}</span><span class="nav-nome">${p.nome}</span></a>`).join("");
    });
  }
  let atual = null;
  function irPara(id) {
    const p = PAGINAS.find(q => q.id === id) || PAGINAS[0];
    atual = p;
    document.documentElement.dataset.pg = p.id;
    $$('[data-q="nav"] a').forEach(a => a.dataset.pg === p.id ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    $$('[data-q="titulo"]').forEach(t => t.textContent = p.nome);
    $$('[data-q="cod"]').forEach(t => t.textContent = p.cod);
    document.title = `${p.nome} · ${document.body.dataset.variante || "Quantia"}`;
    const alvo = $('[data-q="conteudo"]');
    $$(".graf", alvo).forEach(b => ro.unobserve(b));
    alvo.replaceChildren();
    const topo = el("header", { class: "pg-topo" });
    topo.innerHTML = `<span class="rotulo">${p.rotulo}</span><h1>${p.titulo}</h1><div class="meta"><span>Premissas:</span>${p.premissas.map(t => `<span>${t}</span>`).join("")}<span class="atualizado">Rodada de ${dataHoraBr(D.rodada)}</span></div>`;
    const grade = el("div", { class: "pg-grade" });
    alvo.append(topo, grade);
    p.montar(grade);
    alvo.scrollTop = 0; window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("quantia:pagina", { detail: { id: p.id, indice: PAGINAS.indexOf(p) } }));
  }
  function aplicarTema(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("quantia-tema", t); } catch (e) { /* sem armazenamento: só nesta visita */ }
    $$('[data-q="tema"]').forEach(b => { b.setAttribute("aria-pressed", String(t === "light")); b.querySelector(".tema-txt") ? b.querySelector(".tema-txt").textContent = t === "dark" ? "Claro" : "Escuro" : b.textContent = t === "dark" ? "Tema claro" : "Tema escuro"; b.title = t === "dark" ? "Mudar para o tema claro" : "Mudar para o tema escuro"; });
  }
  const cotacoes = () => [
    ...D.SUBS.map(s => ({ id: "pld-" + s.id, r: `PLD ${s.nome}`, v: mediaDia(s.id), d: varDia(s.id), f: v => n(v, 2), serie: D.hoje[s.id], cor: cor(s.id) })),
    { id: "sp-ne", r: "NE−SE/CO", v: D.spread30.ne[29], d: D.spread30.ne[29] - D.spread30.ne[28], f: v => sn(v, 2), serie: D.spread30.ne, cor: cor("ne") },
    { id: "sp-n", r: "N−SE/CO", v: D.spread30.n[29], d: D.spread30.n[29] - D.spread30.n[28], f: v => sn(v, 2), serie: D.spread30.n, cor: cor("n") },
    { id: "dez", r: "SE/CO dez/26", v: D.book[0][1], d: D.book[0][6], f: v => n(v, 2), serie: D.mensal.se.slice(12, 25), cor: cor("se") },
    { id: "cal", r: "SE/CO Cal 27", v: D.book[5][1], d: D.book[5][6], f: v => n(v, 2), serie: D.mensal.se.slice(6, 30), cor: cor("se") },
    { id: "ear", r: "EAR SE/CO", v: 48.2, d: -1.1, f: v => n(v, 1) + "%", serie: [52, 51.5, 50.8, 50.1, 49.6, 49.3, 48.2], cor: cor("se") },
    { id: "gsf", r: "GSF dez/26", v: 0.76, d: 0.05, f: v => n(v, 2), serie: D.gsf, cor: "var(--accent)" },
  ];
  let COT = cotacoes();
  function montarTicker() {
    $$('[data-q="ticker"]').forEach(t => {
      const itens = COT.map(c => `<span class="tk" data-c="${c.id}"><span class="tk-r">${c.r}</span><span class="tk-v num">${c.f(c.v)}</span><span class="tk-d num ${tom(c.d)}">${seta(c.d)} ${sn(c.d, 2)}</span></span>`).join("");
      t.innerHTML = `<div class="tk-faixa">${itens}${itens.replace(/data-c=/g, 'aria-hidden="true" data-c=')}</div>`;
    });
    $$('[data-q="watch"]').forEach(w => {
      w.innerHTML = COT.map(c => `<div class="wl" data-c="${c.id}"><span class="wl-r">${c.r}</span><span class="wl-v num">${c.f(c.v)}</span><span class="wl-d num ${tom(c.d)}">${seta(c.d)} ${sn(c.d, 2)}</span><span class="wl-s"></span></div>`).join("");
      COT.forEach(c => sparkline($(`[data-c="${c.id}"] .wl-s`, w), c.serie, c.cor));
      $$(".wl", w).forEach((linha, i) => dicaEm(linha, `<b>${COT[i].r}</b><span class="dica-l">${COT[i].f(COT[i].v)} · ${seta(COT[i].d)} ${sn(COT[i].d, 2)}</span><span class="dica-l">Cotação simulada</span>`));
    });
    $$('[data-q="kpis"]').forEach(k => { k.innerHTML = COT.slice(0, 6).map(c => `<span class="gk"><span class="gk-r">${c.r}</span><span class="gk-v num">${c.f(c.v)}</span><span class="gk-d num ${tom(c.d)}">${seta(c.d)}</span></span>`).join(""); });
  }
  function aoVivo() {
    // simulação: variação pequena de algumas cotações para dar a sensação de mesa; nada vem de fonte real
    setInterval(() => {
      const c = COT[Math.floor(D.rnd() * COT.length)], dv = (D.rnd() - 0.5) * (Math.abs(c.v) > 50 ? 1.6 : 0.4);
      c.v += dv; c.d += dv;
      $$(`[data-c="${c.id}"]`).forEach(e => {
        const v = e.querySelector(".tk-v, .wl-v, .gk-v"), d = e.querySelector(".tk-d, .wl-d");
        if (v) v.textContent = c.f(c.v);
        if (d) { d.textContent = `${seta(c.d)} ${sn(c.d, 2)}`; d.className = d.className.replace(/\b(sobe|desce|neutro)\b/, tom(c.d)); }
        e.classList.remove("pisca-sobe", "pisca-desce"); void e.offsetWidth; e.classList.add(dv > 0 ? "pisca-sobe" : "pisca-desce");
      });
    }, 2600);
  }
  function relogio() {
    const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const tick = () => $$('[data-q="relogio"]').forEach(r => r.textContent = fmt.format(new Date()));
    tick(); setInterval(tick, 1000);
  }
  function comandos() {
    const ir = txt => { const t = txt.trim().toLowerCase(); if (!t) return false; const p = PAGINAS.find(q => q.cod.toLowerCase() === t || q.id === t) || PAGINAS.find(q => q.nome.toLowerCase().includes(t) || q.cod.toLowerCase().startsWith(t)) || (/^[1-9]$/.test(t) ? PAGINAS[+t - 1] : null); if (p) { location.hash = p.id; return true; } return false; };
    $$('[data-q="cmd"]').forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault(); const inp = f.querySelector("input"); const ok = ir(inp.value);
      f.classList.toggle("erro", !ok); const msg = f.querySelector(".cmd-msg"); if (msg) msg.textContent = ok ? "" : `“${inp.value}” não encontrado. Use ${PAGINAS.map(p => p.cod).join(", ")}.`;
      if (ok) inp.value = "";
    }));
    if (OPC.teclas) document.addEventListener("keydown", ev => {
      if (ev.target.closest("input, textarea") || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (/^[1-9]$/.test(ev.key) && PAGINAS[+ev.key - 1]) { location.hash = PAGINAS[+ev.key - 1].id; ev.preventDefault(); }
      if (ev.key === "/") { const i = $('[data-q="cmd"] input'); if (i) { i.focus(); ev.preventDefault(); } }
      if (ev.key.toLowerCase() === "t") aplicarTema(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  }
  function rotacao() {
    if (!OPC.rotacao) return;
    let pausado = false, t0 = Date.now();
    const barra = $('[data-q="progresso"]');
    $$('[data-q="pausa"]').forEach(b => b.addEventListener("click", () => { pausado = !pausado; b.setAttribute("aria-pressed", String(pausado)); b.textContent = pausado ? "Retomar" : "Pausar"; t0 = Date.now(); }));
    document.addEventListener("quantia:pagina", () => { t0 = Date.now(); });
    setInterval(() => {
      if (pausado) return;
      const f = (Date.now() - t0) / (OPC.rotacao * 1000);
      if (barra) barra.style.transform = `scaleX(${Math.min(1, f)})`;
      if (f >= 1) { const i = (PAGINAS.indexOf(atual) + 1) % (PAGINAS.length - 1); location.hash = PAGINAS[i].id; }
    }, 200);
  }

  function iniciar() {
    if (!$("#dica")) document.body.append(el("div", { class: "dica", id: "dica", hidden: "" }));
    montarNav(); montarTicker(); relogio(); comandos();
    $$('[data-q="tema"]').forEach(b => b.addEventListener("click", () => aplicarTema(document.documentElement.dataset.theme === "dark" ? "light" : "dark")));
    $$('[data-q="menu"]').forEach(b => b.addEventListener("click", () => { const ab = document.documentElement.toggleAttribute("data-menu-aberto"); b.setAttribute("aria-expanded", String(ab)); }));
    aplicarTema(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    addEventListener("hashchange", () => { document.documentElement.removeAttribute("data-menu-aberto"); irPara(location.hash.slice(1)); });
    irPara(location.hash.slice(1));
    if (OPC.aoVivo) aoVivo();
    rotacao();
  }
  window.QA = { PAGINAS, irPara, aplicarTema };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
