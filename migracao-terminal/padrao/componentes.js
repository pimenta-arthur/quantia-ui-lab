/* Padrão visual Quant Energia · v2.0 (terminal) · 2026-11 · componentes.js
   Peças de página prontas, em HTML, que recebem os dados por parâmetro (nada global, nada fictício).
   Carregar depois de graficos.js. Cada função escreve dentro de `el` e devolve o elemento criado.
   Formatos de dados documentados em cada função; exemplos de uso em ../exemplos/. */
const QC = (function () {
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const BAND = { vd: "Verde", am: "Amarela", v1: "Vermelha P1", v2: "Vermelha P2" };
  const SIGLA = { vd: "VD", am: "AM", v1: "V1", v2: "V2" };
  const ORDEM = ["vd", "am", "v1", "v2"];

  /** legenda curta. itens: [[cor, texto, tipo?]] com tipo "l" (linha), "t" (tracejado) ou vazio (quadrado) */
  function legenda(itens) {
    return `<div class="legenda-mini">${itens.map(([c, t, tipo]) => `<span><i class="${tipo || ""}" style="${tipo ? "border-color" : "background"}:${c}"></i>${t}</span>`).join("")}</div>`;
  }

  /** cartões de número. itens: [{ r: rótulo, v: valor já formatado, d?: detalhe, tom?: "sobe"|"desce"|"neutro" }] */
  function kpis(el, itens) {
    const g = h("div", "kpis", itens.map(k => `<div class="kpi"><span class="kpi-r">${k.r}</span><span class="kpi-v num">${k.v}</span>` +
      (k.d != null ? `<span class="kpi-d ${k.tom || ""}">${k.d}</span>` : "") + `</div>`).join(""));
    el.append(g); return g;
  }

  /** tabela com rolagem própria. colunas: [{ t: título, n?: true se numérica }]; linhas: [[html por célula]] */
  function tabela(el, colunas, linhas, classe) {
    const box = h("div", "rolagem", `<table class="${classe || ""}"><thead><tr>${colunas.map(c => `<th class="${c.n ? "n" : ""}">${c.t}</th>`).join("")}</tr></thead><tbody>` +
      linhas.map(l => `<tr>${l.map((v, j) => `<td class="${colunas[j].n ? "n" : ""}">${v}</td>`).join("")}</tr>`).join("") + `</tbody></table>`);
    el.append(box); return box;
  }

  /** BAND-1 · probabilidade de cada bandeira por mês, em barra empilhada.
   *  meses: ["2026-11", …]; probs: [[verde, amarela, vermelha P1, vermelha P2]] (frações que somam 1);
   *  opc: { oficiais: nº de meses iniciais já oficiais (default 0), maisProvavel: mostra a coluna da bandeira mais provável } */
  function probBandeiras(el, meses, probs, opc = {}) {
    const box = h("div", "probs");
    box.innerHTML = legenda(ORDEM.map(id => [`var(--${id})`, BAND[id]])) + meses.map((mm, i) => {
      const p = probs[i], top = ORDEM[p.indexOf(Math.max(...p))];
      return `<div class="prob-l"><span class="prob-m">${rot(mm)}${i < (opc.oficiais || 0) ? " <small>oficial</small>" : ""}</span><div class="prob-barra">` +
        ORDEM.map((id, j) => (p[j] > 0 ? `<span class="seg band-${id}" style="flex:${p[j]}" data-dica="${rot(mm)} · ${BAND[id]}: ${pct(p[j])}">${p[j] >= 0.15 ? pct(p[j]) : ""}</span>` : "")).join("") +
        `</div>${opc.maisProvavel ? `<span class="prob-top">${BAND[top]}</span>` : ""}</div>`;
    }).join("");
    el.append(box);
    box.querySelectorAll(".seg").forEach(s => dicaEm(s, s.dataset.dica));
    return box;
  }

  /** BAND-2 · bandeira mais provável em cada rodada (linhas) e mês (colunas), com ▲▼ quando muda.
   *  meses: ["2026-11", …]; rodadas: [["2026-11-15", ["am", "am", "vd", …]]] em ordem cronológica;
   *  opc: { oficiais: nº de meses iniciais já oficiais (os demais ganham contorno tracejado de projeção) } */
  function tabelaBandeiras(el, meses, rodadas, opc = {}) {
    const box = h("div", "rolagem");
    box.innerHTML = `<table class="celulas"><thead><tr><th>Rodada</th>${meses.map(m => `<th>${rot(m)}</th>`).join("")}</tr></thead><tbody>` +
      rodadas.map(([dt, bs], r) => `<tr><td class="num">${dataBr(dt)}</td>${bs.map((b, j) => {
        const ant = r > 0 ? rodadas[r - 1][1][j] : b, mud = ORDEM.indexOf(b) - ORDEM.indexOf(ant);
        return `<td><span class="cel band-${b}${j >= (opc.oficiais ?? 1) ? " projetada" : ""}" title="${BAND[b]}">${SIGLA[b]}${mud ? `<i>${mud > 0 ? "▲" : "▼"}</i>` : ""}</span></td>`;
      }).join("")}</tr>`).join("") + `</tbody></table>`;
    el.append(box); return box;
  }

  /** PLD-3 · mapa de calor (linhas × colunas), uma cor só: mais escuro, maior.
   *  linhas: ["09/11", …]; colunas: ["00", …, "23"]; valores: [[número]] (linhas × colunas);
   *  opc: { fmt(v), dica(i, j, v)→texto, media: true para a coluna de média } */
  function mapaCalor(el, linhas, colunas, valores, opc = {}) {
    const fmt = opc.fmt || (v => n(v)), todos = valores.flat(), lo = Math.min(...todos), hi = Math.max(...todos);
    const box = h("div", "rolagem");
    box.innerHTML = `<table class="calor"><thead><tr><th></th>${colunas.map(c => `<th>${c}</th>`).join("")}${opc.media ? '<th class="n">Média</th>' : ""}</tr></thead><tbody>` +
      valores.map((lin, i) => `<tr><td class="num">${linhas[i]}</td>${lin.map((v, j) => {
        const p = Math.round((v - lo) / (hi - lo || 1) * 100);
        return `<td class="cc" style="background:color-mix(in srgb, var(--calor) ${p}%, var(--calor-0))" data-dica="${opc.dica ? opc.dica(i, j, v) : `${linhas[i]} ${colunas[j]}: ${fmt(v)}`}"><span class="${p > 55 ? "claro" : ""}">${fmt(v)}</span></td>`;
      }).join("")}${opc.media ? `<td class="n">${fmt(lin.reduce((s, v) => s + v, 0) / lin.length)}</td>` : ""}</tr>`).join("") + `</tbody></table>`;
    el.append(box);
    box.querySelectorAll(".cc").forEach(t => dicaEm(t, t.dataset.dica));
    return box;
  }

  /** RISK-3 · uso de limites. itens: [{ r: rótulo, v: usado, max: limite, u: unidade, casas?: 1 }]
   *  atenção a partir de 70%, crítico a partir de 85% (texto + cor, nunca só cor) */
  function medidores(el, itens) {
    const g = h("div", "medidores", itens.map(it => {
      const p = it.v / it.max, nivel = p >= 0.85 ? "critico" : p >= 0.7 ? "atencao" : "ok", c = it.casas ?? 2;
      return `<div class="medidor ${nivel}"><div class="med-cab"><span>${it.r}</span><span class="num">${n(it.v, c)} de ${n(it.max, c > 0 ? c - 1 : 0)} ${it.u} · <b>${pct(p)}</b></span></div><div class="med-trilho"><div class="med-barra" style="width:${Math.min(100, p * 100)}%"></div></div></div>`;
    }).join(""));
    el.append(g); return g;
  }

  /** VG-4 · reservatórios. itens: [{ nome: "SE/CO", ear: 0,482, varSem: −0,011, ena: 0,82, cor: "var(--sm-se)" }] (frações) */
  function reservatorios(el, itens) {
    const g = h("div", "reserv", itens.map(r => `<div class="res-l"><span class="res-n">${r.nome}</span><div class="med-trilho"><div class="med-barra" style="width:${r.ear * 100}%;background:${r.cor}"></div></div><span class="num res-v">${pct(r.ear)}</span><span class="num res-e ${tom(r.varSem)}">${seta(r.varSem)} ${sn(r.varSem * 100, 1)} p.p.</span><span class="num res-a">ENA ${pct(r.ena)} da MLT</span></div>`).join(""));
    el.append(g); return g;
  }

  /** VG-5 · lista de eventos. itens: [{ quando: "2026-11-15T06:10", tipo: "rodada"|"alerta"|"insumo"|"bandeira"|"risco", texto }] */
  function eventos(el, itens) {
    const ul = h("ul", "eventos", itens.map(e => `<li class="ev-${e.tipo}"><span class="ev-t num">${dataBr(e.quando).slice(0, 5)} ${e.quando.slice(11, 16)}</span><span class="ev-tipo">${e.tipo}</span><span class="ev-x">${e.texto}</span></li>`).join(""));
    el.append(ul); return ul;
  }

  /** pares rótulo/valor alinhados. pares: [[rótulo, valor formatado]]; classe "estat" (valores à direita) ou "premissas" */
  function pares(el, lista, classe = "estat") {
    const dl = h("dl", classe, lista.map(([a, b]) => `<dt>${a}</dt><dd class="num">${b}</dd>`).join(""));
    el.append(dl); return dl;
  }

  /** abas que redesenham o corpo. el: .painel-cab; opcoes: [[valor, texto]]; aoTrocar(valor) */
  function abas(el, opcoes, aoTrocar, rotulo = "Opções") {
    const g = h("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo);
    opcoes.forEach(([v, t], i) => { const b = h("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(i === 0)); g.append(b); });
    g.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); aoTrocar(b.dataset.v); });
    el.append(g); aoTrocar(opcoes[0][0]); return g;
  }

  return { legenda, kpis, tabela, probBandeiras, tabelaBandeiras, mapaCalor, medidores, reservatorios, eventos, pares, abas, BAND };
})();
