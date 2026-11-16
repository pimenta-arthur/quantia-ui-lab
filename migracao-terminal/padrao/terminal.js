/* Padrão visual Quant Energia · v2.0 (terminal) · 2026-11 · terminal.js
   Comportamento da casca do terminal, sem dados: tema (escuro padrão, claro guardado), relógio, linha de
   comando, teclas de atalho e fita de cotações. As páginas continuam sendo páginas com URL própria:
   o comando só navega para o href do link da barra de funções.

   Marcação esperada (ver modelo.html):
     <a data-cod="PLD" href="/pld">…</a> dentro de <nav class="t-fn">   → códigos de comando e teclas 1–9
     <form class="t-cmd" data-comando> <input> … <span class="t-cmd-msg"></span></form>
     <button data-tema>  ·  <span data-relogio>  ·  <div class="t-fita" data-fita> (fita de cotações, logo abaixo da barra de funções)
   No <head>, antes dos estilos, para não piscar no claro:
     <script>try{if(localStorage.getItem("quantia-tema")==="light")document.documentElement.dataset.theme="light"}catch(e){}</script> */
(function () {
  const raiz = document.documentElement;
  const links = () => [...document.querySelectorAll(".t-fn a[data-cod]")];

  // tema: escuro é o padrão (sem data-theme); claro só por escolha, guardada no navegador
  function aplicarTema(t) {
    if (t === "light") raiz.dataset.theme = "light"; else delete raiz.dataset.theme;
    try { localStorage.setItem("quantia-tema", t); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
    document.querySelectorAll("[data-tema]").forEach(b => { b.textContent = t === "light" ? "Tema escuro" : "Tema claro"; b.setAttribute("aria-pressed", String(t === "light")); });
  }
  const temaAtual = () => (raiz.dataset.theme === "light" ? "light" : "dark");

  function relogio() {
    const f = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo" });
    const tick = () => document.querySelectorAll("[data-relogio]").forEach(r => { r.textContent = f.format(new Date()); });
    tick(); setInterval(tick, 1000);
  }

  // página atual: o template pode marcar aria-current; se não marcar, compara o caminho
  function marcarAtual() {
    if (document.querySelector('.t-fn a[aria-current="page"]')) return;
    const aqui = location.pathname.replace(/\/index\.html$/, "/");
    links().forEach(a => { if (new URL(a.href).pathname.replace(/\/index\.html$/, "/") === aqui) a.setAttribute("aria-current", "page"); });
  }

  // comando: código exato (PLD), número (1–9), ou começo do nome ("band" → Bandeiras)
  function achar(txt) {
    const t = txt.trim().toLowerCase(), ls = links();
    if (!t) return null;
    if (/^[1-9]$/.test(t)) return ls[+t - 1] || null;
    return ls.find(a => a.dataset.cod.toLowerCase() === t) || ls.find(a => a.dataset.cod.toLowerCase().startsWith(t) || a.textContent.toLowerCase().includes(t)) || null;
  }
  function comando() {
    document.querySelectorAll("[data-comando]").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const inp = f.querySelector("input"), a = achar(inp.value), msg = f.querySelector(".t-cmd-msg");
      f.classList.toggle("erro", !a);
      if (msg) msg.textContent = a ? "" : `“${inp.value}” não encontrado. Use ${links().map(l => l.dataset.cod).join(", ")} ou 1–${links().length}.`;
      if (a) location.href = a.href;
    }));
  }
  function teclas() {
    document.addEventListener("keydown", ev => {
      if (ev.target.closest("input, textarea, select, [contenteditable]") || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (/^[1-9]$/.test(ev.key)) { const a = links()[+ev.key - 1]; if (a) { location.href = a.href; ev.preventDefault(); } }
      else if (ev.key === "/") { const i = document.querySelector("[data-comando] input"); if (i) { i.focus(); ev.preventDefault(); } }
      else if (ev.key.toLowerCase() === "t") aplicarTema(temaAtual() === "dark" ? "light" : "dark");
    });
  }

  /** fita de cotações. itens: [{ r: rótulo, v: valor formatado, d: variação (número, opcional) }].
   *  A página (ou o layout comum) chama Terminal.fita(itens) com os dados reais; sem itens, a fita fica escondida. */
  function fita(itens) {
    document.querySelectorAll("[data-fita]").forEach(el => {
      const html = itens.map(c => `<span class="tk"><span class="tk-r">${c.r}</span><span class="tk-v num">${c.v}</span>${c.d == null ? "" : `<span class="tk-d num ${tom(c.d)}">${seta(c.d)} ${sn(c.d, 2)}</span>`}</span>`).join("");
      el.innerHTML = `<div class="tk-faixa">${html}${html.replace(/class="tk"/g, 'class="tk" aria-hidden="true"')}</div>`;
      el.hidden = !itens.length;
    });
  }

  // tooltip (#dica) criado já ao carregar este script, antes dos scripts da página: dicaEm() procura o
  // elemento no momento em que o gráfico é desenhado, então ele precisa existir antes
  if (!document.getElementById("dica") && document.body) { const d = document.createElement("div"); d.className = "dica"; d.id = "dica"; d.hidden = true; document.body.append(d); }

  function iniciar() {
    if (!document.getElementById("dica")) { const d = document.createElement("div"); d.className = "dica"; d.id = "dica"; d.hidden = true; document.body.append(d); }
    document.querySelectorAll("[data-tema]").forEach(b => b.addEventListener("click", () => aplicarTema(temaAtual() === "dark" ? "light" : "dark")));
    aplicarTema(temaAtual());
    marcarAtual(); relogio(); comando(); teclas();
  }
  window.Terminal = { aplicarTema, fita };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
