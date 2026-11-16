/* Variante 07 · Terminal (app real) · Hydro Inflow Similarity · hyd.js
   Utilidades comuns às quatro páginas desta funcionalidade, por cima de graficos.js e componentes.js do padrão v2.0.
   Não guarda dados: as páginas leem window.HYD (dados.js). */
const $ = id => document.getElementById(id);
/** como n(), mas com o sinal de menos tipográfico (−) nos negativos */
const nm = (v, c = 0) => n(v, c).replace("-", "−");
const somaMes = (p, k) => { const d = new Date(+p.slice(0, 4), +p.slice(5, 7) - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

/** liga um grupo de botões (.abas) já escrito no HTML: marca aria-pressed e chama cb(valor).
 *  multi: cada botão liga e desliga sozinho (cb recebe o conjunto marcado). */
function grupo(id, cb, multi = false) {
  const g = typeof id === "string" ? $(id) : id;
  g.addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b || b.disabled) return;
    if (multi) { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); cb(new Set([...g.querySelectorAll('button[aria-pressed="true"]')].map(x => x.dataset.v))); return; }
    g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    cb(b.dataset.v);
  });
}
const marcar = (id, v) => ($(id) || id).querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v)));

/** troca o gráfico de `pai` por um novo grafico() (desenha na largura real); alt em px ou "alto"/"baixo" */
function desenhar(pai, fn, alt, rotulo) {
  pai.replaceChildren();
  const c = grafico(pai, fn, typeof alt === "string" ? alt : undefined, rotulo);
  if (typeof alt === "number") c.style.height = alt + "px";
  return c;
}
/** linhas horizontais do eixo Y com rótulos; zero mais forte */
function gradeY(svg, e, y, m, W, fmt = v => n(v)) {
  e.t.forEach(t => {
    S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: Math.abs(t) < 1e-9 ? "var(--ink-3)" : "var(--rule)" });
    S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, String(fmt(Math.abs(t) < 1e-9 ? 0 : t)).replace("-", "−"));
  });
}
/** índice da coluna mais próxima do ponteiro num eixo de `k` pontos igualmente espaçados */
const colunaDe = (svg, ev, W, m, k) => Math.max(0, Math.min(k - 1, Math.round((_px(svg, ev, W) - m.l) / ((W - m.l - m.r) / (k - 1)))));
/** marcadores de legenda no formato de .legenda-mini (i.l linha, i.t tracejado, quadrado) */
const itemLeg = (cor, txt, tipo = "", extra = "") => `<span${extra}><i class="${tipo}" style="${tipo ? "border-color" : "background"}:${cor}"></i>${txt}</span>`;
