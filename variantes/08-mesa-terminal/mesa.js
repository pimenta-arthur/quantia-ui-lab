/* Variante 08 · Mesa (terminal desde o início) · mesa.js
   Núcleo do aplicativo de uma tela: registro das funções, rotas (#MESA, #BAND-2), teclado, comando,
   painéis, linha de decisão e inspetor. Carregar depois de graficos.js, componentes.js e terminal.js
   (do padrão v2.0) e antes de funcoes/*.js.

   API PARA AS FUNÇÕES (funcoes/<cod>.js)
   Mesa.registrar({
     cod: "BAND", nome: "Forecast Bandeiras", desc: "Projeção da bandeira tarifária de M+1 a M+6",
     sinal: () => ({ v: "dez/26 Amarela 45%", d: "detalhe", tom: "neutro", dnum: 0.06 }), // barra de funções, MESA e fita (dnum: variação numérica opcional)
     fita: () => [{ r: "PLD SE/CO hoje", v: "171,25", d: 12.32 }],   // opcional: itens a mais na fita (d opcional)
     resumo: (el) => { … },                                         // conteúdo do painel da função na MESA
     alertas: () => [{ quando: "2026-11-15T06:10", texto: "…", tela: 1, nivel: "alto"|"normal" }],
     telas: [ { cod: "MON", nome: "Monitor", montar: (area, ctx) => { … } }, … ],  // a ordem define ⇧1–9
     mesa: { ordem: 1, tam: "m" },         // opcional: posição e tamanho do resumo na MESA (padrão: ordem das funções, "m"); false = fora da MESA
     decisao: false                        // opcional: as telas da função não mostram a linha de cards do topo
                                           // (ou só numa tela: { cod, nome, montar, decisao: false })
   });
   Dentro de montar(area, ctx):
     Mesa.decisao(area, [{ r, v, d, principal: true }, …])        // linha de decisão no topo da tela
     const g = Mesa.grade(area)                                    // grade de 12 colunas
     const p = Mesa.painel(g, { cod: "BAND-1", titulo, unidade, tam: "xl", ajuda: "ancora-da-met", leg, fonte,
                               abas: [[valor, texto]], aoTrocar: (v, p) => …, abasRotulo })
       → p.corpo (onde desenhar), p.el (o painel), p.cab (o cabeçalho)
       Com abas, aoTrocar(v, p) é chamado já com a primeira opção, ANTES de Mesa.painel() retornar: use o p
       recebido no segundo argumento (não a variável de retorno) e limpe p.corpo antes de redesenhar.
     Mesa.inspecionar(titulo, conteudo)   // conteudo: HTML (texto) ou função (el) => desenha; abre o inspetor
     Mesa.alvo(elemento, titulo, conteudo) // clique (ou Enter) no elemento abre o inspetor e marca a seleção
     Mesa.ir("BAND", 3)                    // navega; ctx.ir faz o mesmo
     Mesa.met(area, secoes)                // tela de metodologia: secoes = [{ id, titulo, html }]
     Mesa.atualizarSinal()                 // depois de mudar algo que altera o sinal (refaz funções e fita)
   Use grafico(), linhas(), barras(), histograma() e QC.* do padrão v2.0 dentro de p.corpo. */
const Mesa = (function () {
  const FUNCS = [];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  let atual = { cod: "MESA", n: 0 };

  function registrar(f) { FUNCS.push(f); }

  // ---------- peças das telas ----------
  function decisao(area, itens) {
    const d = el("div", "m-decisao");
    // função registrada com decisao: false não mostra a linha de cards (o elemento volta solto, para quem o redesenha)
    const f = FUNCS.find(x => x.cod === atual.cod), t = f && f.telas[atual.n - 1];
    if (f && (f.decisao === false || (t && t.decisao === false))) return d;  // por função ou só numa tela
    d.innerHTML = itens.map(i => `<div class="${i.principal ? "principal" : ""}"><span class="r">${i.r}</span><span class="v num">${i.v}</span>${i.d != null ? `<span class="d ${i.tom || ""}">${i.d}</span>` : ""}</div>`).join("");
    area.append(d); return d;
  }
  function grade(area) { const g = el("div", "grade"); area.append(g); return g; }
  function painel(g, o) {
    const p = el("section", "painel" + (o.classe ? " " + o.classe : ""));
    p.dataset.tam = o.tam || "m";
    if (o.cod) p.id = "p-" + o.cod;  // não igual ao código: "#BAND-2" é rota de tela
    const cab = el("header", "painel-cab");
    cab.append(el("h2", "ttl", `${o.cod ? `<span class="p-cod">${o.cod}</span>` : ""}${o.titulo}${o.unidade ? `<span class="p-uni">${o.unidade}</span>` : ""}`));
    const acoes = el("div", "p-acoes"); cab.append(acoes);
    if (o.ajuda) { const a = el("a", "p-ajuda", "?"); a.href = `#${atual.cod}-${metIndice()}`; a.title = "Como ler este painel (metodologia)"; a.addEventListener("click", ev => { ev.preventDefault(); irMet(o.ajuda); }); acoes.append(a); }
    const corpo = el("div", "painel-corpo");
    p.append(cab, corpo);
    if (o.leg) p.append(el("p", "leg", o.leg));
    if (o.fonte) p.append(el("p", "p-fonte", o.fonte));
    g.append(p);
    const obj = { el: p, corpo, cab, acoes };
    // aoTrocar(v, painel) recebe o próprio painel: é chamado já durante Mesa.painel(), antes do retorno
    if (o.abas) QC.abas(acoes, o.abas, v => o.aoTrocar(v, obj), o.abasRotulo || "Opções");
    if (o.abas && o.ajuda) acoes.append(acoes.querySelector(".p-ajuda"));
    return obj;
  }
  function met(area, secoes) {
    const box = el("div", "m-met");
    const nav = el("nav"); nav.setAttribute("aria-label", "Índice da metodologia");
    const txt = el("div", "m-met-texto");
    secoes.forEach(s => {
      const a = el("a", null, s.titulo); a.href = `#${atual.cod}-${atual.n}`; a.dataset.alvo = "met-" + s.id;
      a.addEventListener("click", ev => { ev.preventDefault(); irAncora(s.id); });
      nav.append(a);
      const sec = el("section", null, `<h2>${s.titulo}</h2>${s.html}`); sec.id = "met-" + s.id; txt.append(sec);
    });
    box.append(nav, txt); area.append(box); return box;
  }
  function irAncora(id) {
    const alvo = document.getElementById("met-" + id); if (!alvo) return;
    alvo.scrollIntoView({ block: "start" });
    $$(".m-met nav a").forEach(a => a.classList.toggle("ativo", a.dataset.alvo === "met-" + id));
    $$(".m-met section").forEach(s => s.removeAttribute("data-alvo")); alvo.setAttribute("data-alvo", "");
  }
  // a tela de metodologia é a que tem cod "MET"
  function metIndice() { const f = FUNCS.find(x => x.cod === atual.cod); const i = f ? f.telas.findIndex(t => t.cod === "MET") : -1; return i + 1; }
  function irMet(ancora) { const i = metIndice(); if (i < 1) return; ir(atual.cod, i); if (ancora) requestAnimationFrame(() => irAncora(ancora)); }

  // ---------- inspetor ----------
  function inspecionar(titulo, conteudo) {
    $(".mesa").dataset.insp = "aberto";
    $("#insp-titulo").textContent = titulo;
    const c = $("#insp-corpo"); c.replaceChildren();
    if (typeof conteudo === "function") conteudo(c); else c.innerHTML = conteudo;
  }
  function alvo(e, titulo, conteudo) {
    e.dataset.inspAlvo = ""; e.tabIndex = 0;
    const abrir = () => { $$(".selecionado").forEach(s => s.classList.remove("selecionado")); e.classList.add("selecionado"); inspecionar(typeof titulo === "function" ? titulo() : titulo, conteudo); };
    e.addEventListener("click", abrir);
    e.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); abrir(); } });
  }
  function inspetorPadrao() {
    $("#insp-titulo").textContent = "Alertas";
    const c = $("#insp-corpo"); c.replaceChildren();
    const lista = todosAlertas().filter(a => atual.cod === "MESA" || a.cod === atual.cod);
    if (!lista.length) { c.innerHTML = '<p class="m-insp-vazio">Sem alertas. Clique num mês, produto, dia ou linha para ver o detalhe aqui.</p>'; return; }
    c.append(listaAlertas(lista));
    c.append(el("p", "m-insp-vazio", "Clique num mês, produto, dia ou linha de tabela para ver o detalhe aqui."));
  }
  function todosAlertas() { return FUNCS.flatMap(f => (f.alertas ? f.alertas() : []).map(a => ({ ...a, cod: f.cod }))).sort((a, b) => (a.quando < b.quando ? 1 : -1)); }
  function listaAlertas(lista) {
    const ul = el("ul", "alertas");
    lista.forEach(a => {
      const li = el("li", a.nivel === "alto" ? "nivel-alto" : "", `<span class="q">${dataBr(a.quando).slice(0, 5)} ${a.quando.slice(11, 16)}</span><span class="f">${a.cod}</span><a href="#${a.cod}-${a.tela || 1}">${a.texto}</a>`);
      ul.append(li);
    });
    return ul;
  }

  // ---------- casca ----------
  function montarFuncoes() {
    const fn = $("#m-fn");
    const itens = [{ cod: "MESA", nome: "Mesa", sinal: () => ({ v: `${todosAlertas().length} alertas` }) }, ...FUNCS];
    fn.style.setProperty("--n-fn", itens.length);
    // uma linha compacta, como a barra de funções do padrão: [tecla] CÓDIGO Nome; o sinal fica na dica (e na fita)
    fn.innerHTML = itens.map((f, i) => { const s = f.sinal ? f.sinal() : { v: "" }; const dica = `Tecla ${i}${s.v ? " · " + s.v : ""}`.replace(/"/g, "&quot;"); return `<a href="#${f.cod}${f.cod === "MESA" ? "" : "-1"}" data-cod="${f.cod}" title="${dica}"><span class="k">${i}</span><b>${f.cod}</b><span class="nm">${f.nome}</span></a>`; }).join("");
  }
  function montarTelas() {
    const t = $("#m-telas");
    if (atual.cod === "MESA") { t.innerHTML = `<span class="m-func">Mesa</span><a href="#MESA" aria-current="page"><b>0</b>Visão da mesa</a><span class="m-telas-dica">0–6 funções</span>`; return; }
    const f = FUNCS.find(x => x.cod === atual.cod);
    t.innerHTML = `<span class="m-func">${f.nome}</span>` + f.telas.map((s, i) => `<a href="#${f.cod}-${i + 1}"${i + 1 === atual.n ? ' aria-current="page"' : ""} title="⇧${i + 1} · ← → para a anterior e a seguinte"><b>${i + 1}</b>${s.cod} ${s.nome}</a>`).join("") + '<span class="m-telas-dica">← → telas · ⇧1–9 direto</span>';
  }
  function telaMesa(area) {
    // sem linha de sinais aqui: o sinal de cada função já está na barra de funções, logo acima
    const g = grade(area);
    // resumos na ordem e no tamanho que cada função pede (mesa: { ordem, tam }); padrão: 3 por linha, na ordem das funções
    const naMesa = FUNCS.filter(f => f.mesa !== false).map((f, i) => ({ f, ordem: f.mesa && f.mesa.ordem != null ? f.mesa.ordem : 100 + i })).sort((a, b) => a.ordem - b.ordem).map(x => x.f);
    naMesa.forEach(f => {
      const p = painel(g, { cod: f.cod, titulo: f.nome, tam: (f.mesa && f.mesa.tam) || "m", classe: "m-resumo" });
      const ir1 = el("a", "m-resumo-ir", "abrir ›"); ir1.href = `#${f.cod}-1`; p.acoes.append(ir1);
      f.resumo(p.corpo);
    });
  }
  function rota() {
    const h = location.hash.slice(1).toUpperCase();
    const m = h.match(/^([A-Z]+)(?:-(\d+))?$/);
    let cod = m ? m[1] : "MESA", n = m && m[2] ? +m[2] : 1;
    const f = FUNCS.find(x => x.cod === cod);
    if (!f) { cod = "MESA"; n = 0; } else n = Math.min(Math.max(1, n), f.telas.length);
    atual = { cod, n };
    document.documentElement.dataset.func = cod;
    document.documentElement.dataset.tela = cod === "MESA" ? "MESA" : `${cod}-${f.telas[n - 1].cod}`;   // ex.: "RES-REU", para estilos de uma tela só
    $$("#m-fn a").forEach(a => a.dataset.cod === cod ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    montarTelas();
    const area = $("#m-area"); area.replaceChildren(); area.scrollTop = 0;
    $("#t-pg").innerHTML = cod === "MESA" ? "<b>MESA</b> Visão da mesa" : `<b>${cod} ${n}</b> ${f.telas[n - 1].nome}`;
    document.title = (cod === "MESA" ? "Mesa" : `${cod} ${f.telas[n - 1].nome}`) + " · Quant Energia";
    inspetorPadrao();
    if (cod === "MESA") telaMesa(area); else f.telas[n - 1].montar(area, { ir, cod, n });
  }
  function ir(cod, n) { const alvoH = `#${cod}${cod === "MESA" ? "" : "-" + (n || 1)}`; if (location.hash.toUpperCase() === alvoH.toUpperCase()) rota(); else location.hash = alvoH; }

  // comando: "BAND", "BAND 3", "BAND REL", "REL" (procura a tela em todas as funções), "MESA"
  function comando(txt) {
    const p = txt.trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (!p.length) return false;
    if (p[0] === "MESA") { ir("MESA"); return true; }
    const f = FUNCS.find(x => x.cod === p[0] || x.cod.startsWith(p[0]));
    if (f) {
      if (!p[1]) { ir(f.cod, 1); return true; }
      const i = /^\d+$/.test(p[1]) ? +p[1] : f.telas.findIndex(t => t.cod === p[1] || t.cod.startsWith(p[1]) || t.nome.toUpperCase().startsWith(p[1])) + 1;
      if (i >= 1 && i <= f.telas.length) { ir(f.cod, i); return true; }
      return false;
    }
    for (const g of [FUNCS.find(x => x.cod === atual.cod), ...FUNCS].filter(Boolean)) {
      const i = g.telas.findIndex(t => t.cod === p[0]) + 1;
      if (i) { ir(g.cod, i); return true; }
    }
    return false;
  }
  function iniciarComando() {
    const f = $("#m-cmd"), inp = $("#cmd"), msg = $("#m-cmd-msg");
    f.addEventListener("submit", ev => {
      ev.preventDefault();
      const ok = comando(inp.value);
      f.classList.toggle("erro", !ok);
      msg.textContent = ok ? "" : `“${inp.value}” não encontrado. Ex.: BAND, BAND 3, NEN COT, MESA.`;
      if (ok) { inp.value = ""; inp.blur(); }
    });
  }
  function iniciarTeclas() {
    document.addEventListener("keydown", ev => {
      if ((ev.target.closest && ev.target.closest("input, textarea, select, [contenteditable]")) || ev.ctrlKey || ev.metaKey || ev.altKey) {
        if (ev.key === "Escape" && ev.target.id === "cmd") ev.target.blur();
        return;
      }
      // números: funções (0 MESA, 1 BAND, 2 RISK…); ⇧ + número: tela da função atual; ← → ou [ ]: tela anterior e seguinte
      const dig = /^(?:Digit|Numpad)([0-9])$/.exec(ev.code);
      const f = FUNCS.find(x => x.cod === atual.cod);
      if (dig && !ev.shiftKey) { const i = +dig[1]; if (i === 0) ir("MESA"); else if (FUNCS[i - 1]) ir(FUNCS[i - 1].cod, 1); ev.preventDefault(); return; }
      if (dig && ev.shiftKey) { const i = +dig[1]; if (f && i >= 1 && i <= f.telas.length) ir(f.cod, i); ev.preventDefault(); return; }
      if (f && (ev.key === "ArrowRight" || ev.key === "]")) { ir(f.cod, atual.n % f.telas.length + 1); ev.preventDefault(); return; }
      if (f && (ev.key === "ArrowLeft" || ev.key === "[")) { ir(f.cod, (atual.n + f.telas.length - 2) % f.telas.length + 1); ev.preventDefault(); return; }
      if (ev.key === "Escape") { ir("MESA"); return; }
      if (ev.key === "/") { $("#cmd").focus(); ev.preventDefault(); return; }
      if (ev.key.toLowerCase() === "i") { const m = $(".mesa"); m.dataset.insp = m.dataset.insp === "fechado" ? "aberto" : "fechado"; return; }
      if (ev.key === "?") { irMet(); return; }
    });
  }
  // fita: o sinal de cada função, mais o que a função quiser acrescentar em fita() → [{ r, v, d? }]
  function montarFita() {
    Terminal.fita(FUNCS.flatMap(f => { const s = f.sinal(); return [{ r: f.cod, v: s.v, d: s.dnum }, ...(f.fita ? f.fita() : [])]; }));
  }
  function iniciar() {
    montarFuncoes(); montarFita(); iniciarComando(); iniciarTeclas();
    $("#insp-fechar").addEventListener("click", () => { $(".mesa").dataset.insp = "fechado"; });
    $("#insp-limpar").addEventListener("click", () => { $$(".selecionado").forEach(s => s.classList.remove("selecionado")); inspetorPadrao(); });
    addEventListener("hashchange", rota);
    rota();
  }
  /** a função avisa que o sinal mudou (ex.: o simulador foi editado): refaz a barra de funções e a fita */
  function atualizarSinal() { montarFuncoes(); $$("#m-fn a").forEach(a => a.dataset.cod === atual.cod ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")); montarFita(); }
  return { registrar, decisao, grade, painel, met, inspecionar, alvo, ir, iniciar, listaAlertas, atualizarSinal, FUNCS };
})();
