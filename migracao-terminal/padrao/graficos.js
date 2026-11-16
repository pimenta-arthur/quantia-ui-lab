/* Padrão visual Quant Energia · v2.0 (terminal) · 2026-11 · graficos.js
   Funções pequenas para gráficos em SVG e textos em pt-BR, sem biblioteca. Regras de uso em GUIA.md.
   v2.0: tudo do v1.1 continua igual (mesmos nomes e assinaturas); entram no fim do arquivo os gráficos
   responsivos (grafico, linhas, barras, histograma, sparkline) e os textos de moeda (rs, srs, seta, tom).
   fundoErro passa a usar --erro-acima (azul) no lugar de --accent, que no terminal é âmbar.
   Carregar antes do script da página: <script src="../padrao/graficos.js"></script>
   A página precisa de <div class="dica" id="dica" hidden></div> para os tooltips (dicaEm). */

const NS_SVG = "http://www.w3.org/2000/svg";
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// ---------- textos ----------
/** "2026-10" → "out/26" */
const rot = p => `${MES[+p.slice(5, 7) - 1]}/${p.slice(2, 4)}`;
/** "2026-10" → "outubro de 2026" */
const rotLongo = p => `${MESL[+p.slice(5, 7) - 1]} de ${p.slice(0, 4)}`;
/** "2026-10-09…" → "09/10/26" */
const dataBr = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(2, 4)}`;
/** "2026-10-09T22:55:36" → "09/10/26 22:55" */
const dataHoraBr = s => dataBr(s) + (s.length > 10 ? " " + s.slice(11, 16) : "");
/** número pt-BR com c casas; vazio ou inválido → "—" */
const n = (v, c = 0) => (v == null || !isFinite(v) ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }));
/** número com sinal (+3, −0,05, 0) */
const sn = (v, c = 0) => (v == null || !isFinite(v) ? "—" : (v > 1e-7 ? "+" : v < -1e-7 ? "−" : "") + n(Math.abs(v), c));
/** fração → "72%" */
const pct = v => (v == null || !isFinite(v) ? "—" : n(v * 100) + "%");

// ---------- SVG ----------
/** cria um elemento SVG dentro de `pai`; atributos vazios (null/undefined) são ignorados */
function S(pai, tag, at = {}, txt) {
  const e = document.createElementNS(NS_SVG, tag);
  for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]);
  if (txt != null) e.textContent = txt;
  pai.appendChild(e);
  return e;
}

/** tooltip que segue o ponteiro; `txt` pode ser HTML ou função(evento) → HTML.
 *  Fica à direita e abaixo do ponteiro; perto da borda direita ou de baixo da tela, troca de lado (v1.1). */
function dicaEm(el, txt) {
  const dica = document.getElementById("dica");
  el.addEventListener("pointermove", e => {
    dica.innerHTML = typeof txt === "function" ? txt(e) : txt;
    dica.hidden = false;
    dica.style.transform = "none";
    const w = dica.offsetWidth, h = dica.offsetHeight;
    const x = e.clientX + 12 + w > innerWidth - 8 ? e.clientX - 12 - w : e.clientX + 12;
    const y = e.clientY + 12 + h > innerHeight - 8 ? e.clientY - 12 - h : e.clientY + 12;
    dica.style.left = Math.max(8, x) + "px";
    dica.style.top = Math.max(8, y) + "px";
  });
  el.addEventListener("pointerleave", () => { dica.hidden = true; });
}

// ---------- eixos ----------
/** marcas a cada `k` entre lo e hi (ex.: marcas(0, 520, 100) → 0, 100, …, 500) */
const marcas = (lo, hi, k) => { const s = []; for (let t = Math.ceil(lo / k) * k; t <= hi + 1e-9; t += k) s.push(+t.toFixed(6)); return s; };
/** passo "redondo" (1, 2 ou 5 × 10^n) para ter cerca de `alvo` marcas entre lo e hi */
const passo = (lo, hi, alvo = 5) => { const r = (hi - lo) / alvo || 1, p = Math.pow(10, Math.floor(Math.log10(r))), f = r / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; };
/** eixo com limites arredondados: { a, b, t } (início, fim, marcas). `justo` arredonda a 1/4 do passo */
function eixo(lo, hi, alvo = 5, justo = false) {
  if (hi - lo < 1e-9) hi = lo + 1;
  const s = passo(lo, hi, alvo), f = justo ? s / 4 : s;
  const a = Math.floor(lo / f) * f, b = Math.ceil(hi / f) * f, t = [];
  for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) t.push(+v.toFixed(6));
  return { a, b, t };
}
/** meses que levam rótulo num eixo de tempo estreito: só jan e jul */
const rotuloDeMes = p => /-(01|07)$/.test(p);

// ---------- rótulos e cores ----------
/** afasta para cima rótulos de texto que se encostam (lista de { el, x, y }, na ordem de prioridade) */
function empilharRotulos(rotulos, largura = 46, altura = 12) {
  const postos = [];
  rotulos.forEach(r => {
    let y = r.y;
    while (postos.some(q => Math.abs(q.x - r.x) < largura && Math.abs(q.y - y) < altura)) y -= altura;
    r.el.setAttribute("y", y);
    postos.push({ x: r.x, y });
  });
}
/** fundo divergente para erros: azul acima de zero, vermelho abaixo, mais forte quanto maior |e| / escala */
const fundoErro = (e, escala) => {
  const f = Math.round(Math.min(1, Math.abs(e) / escala) * 70);
  return `color-mix(in srgb, ${e >= 0 ? "var(--erro-acima, var(--accent))" : "var(--v1)"} ${f}%, var(--vazio))`;
};

// =====================================================================================================
// v2.0 · textos de moeda e sinal
// =====================================================================================================
/** "R$ 171,25" com espaço não separável (o valor nunca quebra longe da moeda) */
const rs = (v, c = 2) => (v == null || !isFinite(v) ? "—" : "R$ " + n(v, c));
/** "+R$ 12,32", "−R$ 41,68" */
const srs = (v, c = 2) => (v == null || !isFinite(v) ? "—" : (v < 0 ? "−" : v > 0 ? "+" : "") + "R$ " + n(Math.abs(v), c));
/** ▲ ▼ ■ conforme o sinal (cor nunca sozinha: a seta acompanha) */
const seta = v => (v > 0 ? "▲" : v < 0 ? "▼" : "■");
/** classe de cor: "sobe", "desce" ou "neutro" */
const tom = v => (v > 0 ? "sobe" : v < 0 ? "desce" : "neutro");

// =====================================================================================================
// v2.0 · gráficos responsivos
// O SVG tem viewBox igual ao tamanho real da caixa (.graf), então 11 px de texto são 11 px na tela em
// qualquer largura; ao mudar o tamanho (tela cheia, celular, painel que abre) o gráfico é redesenhado.
// =====================================================================================================
const _obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(es => es.forEach(e => e.target._desenhar && requestAnimationFrame(e.target._desenhar))) : null;
/** cria <div class="graf"> dentro de `pai` e chama desenhar(svg, W, H) na largura e altura reais.
 *  alt: "alto" | "baixo" | undefined (altura a partir de --graf-h). Devolve a caixa. */
function grafico(pai, desenhar, alt, rotulo) {
  const caixa = document.createElement("div");
  caixa.className = "graf"; if (alt) caixa.dataset.alt = alt;
  pai.appendChild(caixa);
  let ultimo = "";
  caixa._desenhar = () => {
    const W = Math.round(caixa.clientWidth), H = Math.round(caixa.clientHeight);
    if (W < 40 || H < 40 || `${W}x${H}` === ultimo) return;
    ultimo = `${W}x${H}`;
    caixa.replaceChildren();
    const svg = S(caixa, "svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": rotulo || pai.closest(".painel, .bloco")?.querySelector(".ttl, h2")?.textContent || "Gráfico" });
    desenhar(svg, W, H);
  };
  if (_obs) _obs.observe(caixa); else requestAnimationFrame(caixa._desenhar);
  return caixa;
}
/** rótulos do eixo X sem encostar: só escreve quando há `gap` px desde o último */
function rotulosX(svg, idx, x, y, txt, gap = 46) {
  let ult = -1e9;
  idx.forEach(i => { const t = txt(i); if (t == null) return; const px = x(i); if (px - ult < gap) return; S(svg, "text", { x: px, y, "text-anchor": "middle" }, t); ult = px; });
}
const _px = (svg, e, W) => { const r = svg.getBoundingClientRect(); return (e.clientX - r.left) * W / r.width; };

/** linhas com guia vertical e tooltip de todas as séries no ponto.
 *  o = { n, series:[{nome, v[], cor, larg, tracejado, semPonto, opac}], faixa:{lo[], hi[]}, refs:[{v, rot}],
 *        marca:{i, rot}, rotX(i)→texto|null, titX(i)→texto, fmt(v)→texto, zero:bool } */
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
    let seg = []; const segs = [];
    s.v.forEach((v, i) => { if (v == null) { if (seg.length) segs.push(seg); seg = []; } else seg.push(`${x(i)},${y(v)}`); });
    if (seg.length) segs.push(seg);
    segs.forEach(p => S(svg, "polyline", { points: p.join(" "), fill: "none", stroke: s.cor, "stroke-width": s.larg || 2, "stroke-dasharray": s.tracejado ? "5 4" : null, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: s.opac || null }));
    const ult = s.v.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0).pop();
    if (ult != null && !s.semPonto) S(svg, "circle", { cx: x(ult), cy: y(s.v[ult]), r: 3.5, fill: s.cor, stroke: "var(--surface)", "stroke-width": 2 });
  });
  const guia = S(svg, "line", { x1: 0, x2: 0, y1: m.t, y2: H - m.b, stroke: "var(--ink-2)", "stroke-width": 1, opacity: 0 });
  const alvo = S(svg, "rect", { x: m.l, y: m.t, width: Math.max(1, W - m.l - m.r), height: H - m.t - m.b, fill: "transparent" });
  const passoX = o.n > 1 ? (W - m.l - m.r) / (o.n - 1) : 1;
  dicaEm(alvo, ev => {
    const i = Math.max(0, Math.min(o.n - 1, Math.round((_px(svg, ev, W) - m.l) / passoX)));
    guia.setAttribute("x1", x(i)); guia.setAttribute("x2", x(i)); guia.setAttribute("opacity", 0.5);
    const ls = o.series.filter(s => s.v[i] != null).map(s => `<span class="dica-l"><i style="background:${s.cor}"></i>${s.nome}: <b>${fmt(s.v[i])}</b></span>`);
    if (o.faixa && o.faixa.lo[i] != null) ls.push(`<span class="dica-l">Faixa seco–úmido: ${fmt(o.faixa.lo[i])} a ${fmt(o.faixa.hi[i])}</span>`);
    return `<b>${(o.titX || o.rotX || (k => k))(i)}</b>${ls.join("")}`;
  });
  alvo.addEventListener("pointerleave", () => guia.setAttribute("opacity", 0));
}

/** barras agrupadas, aceitam negativos (ex.: exposição comprada/vendida).
 *  o = { cats:[texto], series:[{nome, v[], cor}], fmt(v), rotX(i) } */
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
      const r = S(svg, "rect", { x: x0 + j * (larg + 2), y: y1, width: larg, height: Math.max(1, y2 - y1), fill: s.cor });
      dicaEm(r, `<b>${c}</b><span class="dica-l"><i style="background:${s.cor}"></i>${s.nome}: <b>${fmt(v)}</b></span>`);
    });
  });
}

/** histograma em % das observações.
 *  o = { dados:[número], de, ate, passo, cor(inicioDaFaixa)→cor, fmtBin(v)→texto, marca:{v, rot} } */
function histograma(svg, W, H, o) {
  const nb = Math.round((o.ate - o.de) / o.passo), cont = Array(nb).fill(0);
  o.dados.forEach(v => { const b = Math.floor((v - o.de) / o.passo); if (b >= 0 && b < nb) cont[b]++; });
  const tot = o.dados.length, m = { l: 40, r: 12, t: 12, b: 24 };
  const e = eixo(0, Math.max(...cont) / tot * 100, 3);
  const x = v => m.l + (v - o.de) / (o.ate - o.de) * (W - m.l - m.r), y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
  e.t.forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t) + "%"); });
  cont.forEach((c, b) => {
    const v0 = o.de + b * o.passo, p = c / tot * 100;
    const r = S(svg, "rect", { x: x(v0) + 1, y: y(p), width: Math.max(1, x(v0 + o.passo) - x(v0) - 2), height: Math.max(0, y(0) - y(p)), fill: o.cor(v0) });
    dicaEm(r, `<b>${o.fmtBin(v0)} a ${o.fmtBin(v0 + o.passo)}</b><span class="dica-l">${n(p, 1)}% das observações</span>`);
  });
  const ms = []; for (let v = Math.ceil(o.de / (o.passo * 4)) * o.passo * 4; v <= o.ate; v += o.passo * 4) ms.push(v);
  rotulosX(svg, ms.map((_, i) => i), i => x(ms[i]), H - 6, i => n(ms[i]), 36);
  if (o.marca) { S(svg, "line", { x1: x(o.marca.v), x2: x(o.marca.v), y1: m.t, y2: H - m.b, stroke: "var(--ink)", "stroke-dasharray": "3 3" }); S(svg, "text", { x: x(o.marca.v) + 4, y: m.t + 9, class: "forte" }, o.marca.rot); }
}

/** minigráfico de linha (84 × 24) com o último ponto destacado */
function sparkline(pai, v, cor) {
  const W = 84, H = 24, lo = Math.min(...v), hi = Math.max(...v);
  const svg = S(pai, "svg", { viewBox: `0 0 ${W} ${H}`, class: "spark", "aria-hidden": "true" });
  const x = i => 1 + i * (W - 4) / (v.length - 1), y = t => 2 + (H - 4) * (1 - (t - lo) / (hi - lo || 1));
  S(svg, "polyline", { points: v.map((t, i) => `${x(i)},${y(t)}`).join(" "), fill: "none", stroke: cor, "stroke-width": 1.5 });
  S(svg, "circle", { cx: x(v.length - 1), cy: y(v[v.length - 1]), r: 2.2, fill: cor });
  return svg;
}
