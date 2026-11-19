/* Variante 08 · Mesa (terminal desde o início) · funcoes/res.js
   RES · Cenários do research: cadastro dos cenários de PLD médio mensal (R$/MWh) por submercado, de M+1 a M+6,
   feitos pelo time de research da mesa (esperado, superior, inferior e sensibilidades), comparação entre eles,
   versões semanais e o que mudou de uma para outra. Não calcula bandeira.
   Dados FICTÍCIOS de exemplo (semente fixa): o research ainda não enviou cenários. A referência de comparação é o
   PLD mensal do deck que a BAND usa (window.DADOS.projecoes[].pld_esp), só para o SE/CO e só nos meses em comum.
   Piso e teto para a validação: os do Pricing (window.PD.meta), também fictícios.
   O cadastro fica no navegador (localStorage "mesa.res.*"); no app irá para o servidor, com autor e histórico.
   Tudo dentro desta IIFE; o único nome usado fora dela é Mesa.registrar. */
(function () {
  "use strict";
  if (typeof Mesa === "undefined") return;
  const D = window.DADOS, PD = window.PD;

  // ================================================================================================
  // constantes e utilitários
  // ================================================================================================
  const MESES = ["2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"];   // M+1 a M+6 (nov/26 = M)
  const SUBS = [
    { k: "SE", nome: "SE/CO", cor: "var(--sm-se)" }, { k: "S", nome: "S", cor: "var(--sm-s)" },
    { k: "NE", nome: "NE", cor: "var(--sm-ne)" }, { k: "N", nome: "N", cor: "var(--sm-n)" },
  ];
  const SUBN = Object.fromEntries(SUBS.map(s => [s.k, s.nome]));
  const TIPOS = {
    esp: { nome: "Esperado", curto: "Esp.", ordem: 0 },
    sup: { nome: "Superior", curto: "Sup.", ordem: 1 },
    inf: { nome: "Inferior", curto: "Inf.", ordem: 2 },
    sen: { nome: "Sensibilidade", curto: "Sens.", ordem: 3 },
  };
  const COR_SEN = ["var(--res-s1)", "var(--res-s2)", "var(--res-s3)", "var(--res-s4)"];
  const PISO = (PD && PD.meta && PD.meta.piso) || 57.31, TETO = (PD && PD.meta && PD.meta.teto) || 785.27;
  // referência do modelo: PLD mensal do deck que a BAND usa (fictício), por mês
  const REF = {}; if (D && Array.isArray(D.projecoes)) D.projecoes.forEach(p => { if (isFinite(p.pld_esp)) REF[p.alvo] = p.pld_esp; });
  const refSE = MESES.map(m => (REF[m] != null ? REF[m] : null));
  const TEM_REF = refSE.some(v => v != null);
  const DECK = D && D.rodada && D.rodada.insumos ? rot(D.rodada.insumos.deck) : "out/26";
  const REF_NOME = `Deck BAND (NEWAVE ${DECK})`;
  const FICT = "Exemplo fictício: o research ainda não enviou cenários.";
  const SERVIDOR = "No laboratório o cadastro fica salvo neste navegador; no app irá para o servidor, com autor e histórico de versões.";

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const num = x => (typeof x === "number" && isFinite(x) ? x : null);
  const r2 = v => Math.round(v * 100) / 100;
  const clone = o => JSON.parse(JSON.stringify(o));
  const chave = (cid, sub, i) => `${cid}|${sub}|${i}`;
  const agora = () => { const d = new Date(), p = x => String(x).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const LS = {
    ler(k, d) { try { const v = localStorage.getItem("mesa.res." + k); return v == null ? d : v; } catch (e) { return d; } },
    gravar(k, v) { try { localStorage.setItem("mesa.res." + k, v); } catch (e) { /* sem armazenamento: vale só nesta visita */ } },
    json(k, d) { try { const v = localStorage.getItem("mesa.res." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    apagar(k) { try { localStorage.removeItem("mesa.res." + k); } catch (e) { /* nada */ } },
  };
  const subPref = (k, d = "SE") => { const v = LS.ler(k, d); return SUBN[v] ? v : d; };
  /** "186,40", "186.40", "1.234,5", "R$ 186" → número; vazio → null; texto inválido → NaN */
  function lerNum(t) {
    let s = String(t == null ? "" : t).replace(/R\$|\s| /g, "");
    if (!s) return null;
    s = s.replace(/[−–]/g, "-");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const v = Number(s);
    return isFinite(v) ? r2(v) : NaN;
  }
  /** variação com seta e cor (cor nunca sozinha) */
  const dl = (d, c = 0) => (d == null ? "" : Math.abs(d) < 0.5 * Math.pow(10, -c) ? '<i class="res-d neutro">=</i>' : `<i class="res-d ${tom(d)}">${seta(d)}${n(Math.abs(d), c)}</i>`);
  const dTxt = (d, c = 0) => (d == null ? "—" : `${seta(d)} ${sn(d, c)}`);

  // ================================================================================================
  // dados de exemplo (semente fixa) e versões
  // ================================================================================================
  function gerarExemplo() {
    let s = 20261114;
    const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const val = x => (x <= PISO ? PISO : r2(x + (rnd() - 0.5) * 0.8));
    const dS = [4, 2, -1, -3, 1, 6], dNE = [-18, -42, -55, -58, -35, -8], dN = [-10, -35, -50, -60, -40, -5];
    const BASE = [
      { id: "v20261024", data: "2026-10-24T17:40", nota: "Primeira versão do horizonte dez/26–mai/27.", se: [172, 150, 128, 118, 140, 196], kd: 0.92, carga: false },
      { id: "v20261031", data: "2026-10-31T18:05", nota: "Inclui a sensibilidade Carga +3%, com a carga do PMO de novembro.", se: [178, 152, 127, 117, 142, 199], kd: 0.95, carga: true },
      { id: "v20261107", data: "2026-11-07T17:20", nota: "ENA de novembro abaixo do previsto no SE/CO; descolamento do NE e do N revisto.", se: [181, 155, 130, 120, 146, 203], kd: 1, carga: true },
      { id: "v20261114", data: "2026-11-14T16:45", nota: "Chuva da 1ª quinzena de novembro abaixo do previsto: esperado do SE/CO sobe em dez/26 e jan/27.", se: [186, 158, 132, 121, 148, 205], kd: 1, carga: true },
    ];
    const CEN = [
      { id: "esp", tipo: "esp", nome: "Esperado", f: [1, 1, 1, 1, 1, 1], k: 1, prem: "ENA na média do ECMWF de 01/11 (cerca de 85% da MLT no SE/CO em dez/26); carga do PMO de novembro; deck NEWAVE out/26." },
      { id: "sup", tipo: "sup", nome: "Superior", f: [1.22, 1.26, 1.3, 1.32, 1.3, 1.28], k: 0.55, prem: "Chuva abaixo da média no SE/CO até fevereiro (ENA perto de 65% da MLT); térmicas acima do PMO." },
      { id: "inf", tipo: "inf", nome: "Inferior", f: [0.84, 0.8, 0.76, 0.74, 0.77, 0.8], k: 1.35, prem: "Período úmido forte (ENA perto de 110% da MLT no SE/CO e no NE); NE e N no piso de fev a mar/27." },
      { id: "sen-seca", tipo: "sen", nome: "Seca no SE −10% ENA", f: [1.06, 1.1, 1.13, 1.15, 1.14, 1.12], k: 0.8, prem: "Esperado com ENA do SE/CO 10% menor em todos os meses." },
      { id: "sen-carga", tipo: "sen", nome: "Carga +3%", f: [1.04, 1.05, 1.05, 1.06, 1.05, 1.05], k: 0.95, prem: "Esperado com carga do SIN 3% acima do PMO de novembro." },
    ];
    return BASE.map(b => ({
      id: b.id, horizonte: "LP", data: b.data, autor: "Research", nota: b.nota, origem: "exemplo", meses: MESES.slice(),
      cen: CEN.filter(c => b.carga || c.id !== "sen-carga").map(c => {
        const se = b.se.map((x, i) => x * c.f[i]);
        return { id: c.id, tipo: c.tipo, nome: c.nome, prem: c.prem, v: {
          SE: se.map(val), S: se.map((x, i) => val(x + dS[i] * c.f[i])),
          NE: se.map((x, i) => val(x + dNE[i] * c.k * b.kd)), N: se.map((x, i) => val(x + dN[i] * c.k * b.kd)) } };
      }),
    })).map((v, _, todas) => {
      // a sensibilidade de carga não foi refeita em 14/11: repete os valores da rodada de 07/11
      if (v.id !== "v20261114") return v;
      const de = todas.find(x => x.id === "v20261107").cen.find(c => c.id === "sen-carga");
      return { ...v, cen: v.cen.map(c => (c.id === "sen-carga" ? { ...c, v: JSON.parse(JSON.stringify(de.v)) } : c)) };
    });
  }
  const EXEMPLO = gerarExemplo();
  const versaoValida = v => v && typeof v.id === "string" && typeof v.data === "string" && Array.isArray(v.cen) && v.cen.length &&
    v.cen.every(c => c && TIPOS[c.tipo] && c.v && SUBS.every(s => Array.isArray(c.v[s.k]) && c.v[s.k].length === MESES.length));
  let VERS = [];
  // horizonte de cada versão: "LP" (longo prazo, hoje o único). Fica pronto para um futuro "CP" (curto prazo, por
  // revisão do DECOMP): o seletor LP/CP só aparece quando houver versões de mais de um horizonte.
  const HORIZ_NOME = { LP: "longo prazo", CP: "curto prazo" };
  let TODAS = [], HORIZ = ["LP"], HOR = "LP";
  function carregar() {
    TODAS = EXEMPLO.concat((LS.json("versoes", []) || []).filter(versaoValida)).map(v => ({ ...v, horizonte: v.horizonte || "LP" }));
    HORIZ = [...new Set(TODAS.map(v => v.horizonte))].sort();
    const pref = LS.ler("horizonte", "LP");
    HOR = HORIZ.includes(pref) ? pref : HORIZ.includes("LP") ? "LP" : HORIZ[0];
    VERS = TODAS.filter(v => v.horizonte === HOR);
  }
  carregar();
  /** seletor LP/CP no topo da tela, só com mais de um horizonte */
  function seletorHorizonte(area, refazer) {
    if (HORIZ.length < 2) return;
    const b = h("div", "res-barra res-hor", '<span class="res-r">Horizonte</span>');
    const g = h("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", "Horizonte");
    HORIZ.forEach(k => { const x = h("button", null, `${k} · ${HORIZ_NOME[k] || k}`); x.type = "button"; x.setAttribute("aria-pressed", String(k === HOR)); x.addEventListener("click", () => { LS.gravar("horizonte", k); RASC = null; carregar(); Mesa.atualizarSinal(); refazer(); }); g.append(x); });
    b.append(g); area.append(b);
  }
  const VIG = () => VERS[VERS.length - 1];
  const antDe = v => { const i = VERS.indexOf(v); return i > 0 ? VERS[i - 1] : null; };
  const verPorId = id => VERS.find(v => v.id === id);
  const ordenar = cen => cen.map((c, i) => [c, i]).sort((a, b) => TIPOS[a[0].tipo].ordem - TIPOS[b[0].tipo].ordem || a[1] - b[1]).map(x => x[0]);
  const doTipo = (v, t) => v.cen.find(c => c.tipo === t) || null;
  const espDe = v => doTipo(v, "esp") || v.cen[0];
  const nomeDe = c => (c.nome && c.nome.trim()) || `${TIPOS[c.tipo].nome} sem nome`;
  /** o mesmo cenário em outra versão: pelo id, senão pelo nome, senão (esperado, superior, inferior) pelo tipo */
  function par(c, v) {
    if (!c || !v) return null;
    return v.cen.find(x => x.id === c.id) || v.cen.find(x => nomeDe(x).toLowerCase() === nomeDe(c).toLowerCase()) ||
      (c.tipo !== "sen" ? v.cen.find(x => x.tipo === c.tipo) : null) || null;
  }
  /** rótulo curto (resumo e tabelas estreitas): Esp., Sup., Inf., S1, S2… */
  function curto(c, v) {
    if (c.tipo === "sen") return "S" + (v.cen.filter(x => x.tipo === "sen").indexOf(c) + 1);
    const mesmo = v.cen.filter(x => x.tipo === c.tipo);
    return TIPOS[c.tipo].curto + (mesmo.length > 1 ? mesmo.indexOf(c) + 1 : "");
  }
  function corDe(c, v) {
    if (c.tipo === "esp") return "var(--t-ambar)";
    if (c.tipo === "sup" || c.tipo === "inf") return "var(--res-faixa)";
    return COR_SEN[v.cen.filter(x => x.tipo === "sen").indexOf(c) % COR_SEN.length];
  }
  const vDe = (c, sub, i) => (c ? num(c.v[sub][i]) : null);
  const delta = (c, ant, sub, i) => { const a = vDe(par(c, ant), sub, i), b = vDe(c, sub, i); return a == null || b == null ? null : r2(b - a); };
  const rotVer = v => `${v.horizonte || "LP"} ${dataBr(v.data)} · ${v.autor || "—"}`;
  const verLP = v => `Versão ${v.horizonte || "LP"} ${dataBr(v.data)}`;

  /** o que mudou de A para B: maior revisão do esperado, cenários novos e removidos */
  function mudancas(A, B) {
    if (!A || !B) return { txt: "Primeira versão.", maior: null };
    const EB = espDe(B), L = [];
    let maior = null;
    SUBS.forEach(s => MESES.forEach((m, i) => { const d = delta(EB, A, s.k, i); if (d != null && (!maior || Math.abs(d) > Math.abs(maior.d) + 0.5)) maior = { d, sub: s.k, i, de: vDe(par(EB, A), s.k, i), para: vDe(EB, s.k, i) }; }));
    if (maior && Math.abs(maior.d) >= 0.5) L.push(`esperado ${SUBN[maior.sub]} ${rot(MESES[maior.i])} ${sn(maior.d, 0)}`);
    else L.push("esperado sem mudança");
    const novos = B.cen.filter(c => !par(c, A)), fora = A.cen.filter(c => !par(c, B));
    if (novos.length) L.push(`novo: ${novos.map(nomeDe).join(", ")}`);
    if (fora.length) L.push(`removido: ${fora.map(nomeDe).join(", ")}`);
    return { txt: L.join(" · "), maior };
  }

  // ================================================================================================
  // validação (não bloqueia, exceto texto que não é número)
  // ================================================================================================
  function validar(cen) {
    const cel = {}, lista = [];
    let vazios = 0;
    const marca = (k, nivel) => { if (cel[k] !== "erro") cel[k] = nivel; };
    const nomes = {};
    cen.forEach(c => {
      const nm = (c.nome || "").trim().toLowerCase();
      if (!nm) lista.push({ nivel: "aviso", txt: `Cenário sem nome (${TIPOS[c.tipo].nome})` });
      else if (nomes[nm]) lista.push({ nivel: "aviso", txt: `Nome repetido: ${esc(c.nome)}` });
      nomes[nm] = 1;
      SUBS.forEach(s => c.v[s.k].forEach((x, i) => {
        const k = chave(c.id, s.k, i), onde = `${esc(nomeDe(c))} · ${s.nome} ${rot(MESES[i])}`;
        if (typeof x === "string") { marca(k, "erro"); lista.push({ nivel: "erro", txt: `${onde}: “${esc(x)}” não é número`, k }); }
        else if (x == null) { marca(k, "vazio"); vazios++; }
        else if (x < PISO - 0.005 || x > TETO + 0.005) { marca(k, "aviso"); lista.push({ nivel: "aviso", txt: `${onde}: ${rs(x)} fora do piso–teto`, k }); }
      }));
    });
    ["esp", "sup", "inf"].forEach(t => { const q = cen.filter(c => c.tipo === t).length; if (q > 1) lista.push({ nivel: "aviso", txt: `${q} cenários do tipo ${TIPOS[t].nome}: comparação e resumo usam o primeiro` }); });
    if (!cen.some(c => c.tipo === "esp")) lista.push({ nivel: "aviso", txt: "Sem cenário Esperado: o sinal e o resumo usam o primeiro cenário da lista" });
    const E = cen.find(c => c.tipo === "esp"), Su = cen.find(c => c.tipo === "sup"), In = cen.find(c => c.tipo === "inf");
    SUBS.forEach(s => MESES.forEach((m, i) => {
      const e = vDe(E, s.k, i), su = vDe(Su, s.k, i), inf = vDe(In, s.k, i), onde = `${s.nome} ${rot(m)}`;
      if (inf != null && e != null && inf > e + 0.005) { marca(chave(In.id, s.k, i), "aviso"); marca(chave(E.id, s.k, i), "aviso"); lista.push({ nivel: "aviso", txt: `${onde}: Inferior (${n(inf, 2)}) acima do Esperado (${n(e, 2)})`, k: chave(In.id, s.k, i) }); }
      if (su != null && e != null && e > su + 0.005) { marca(chave(Su.id, s.k, i), "aviso"); marca(chave(E.id, s.k, i), "aviso"); lista.push({ nivel: "aviso", txt: `${onde}: Esperado (${n(e, 2)}) acima do Superior (${n(su, 2)})`, k: chave(E.id, s.k, i) }); }
      if (e == null && inf != null && su != null && inf > su + 0.005) { marca(chave(In.id, s.k, i), "aviso"); lista.push({ nivel: "aviso", txt: `${onde}: Inferior acima do Superior`, k: chave(In.id, s.k, i) }); }
    }));
    if (vazios) lista.push({ nivel: "aviso", txt: `${vazios} ${vazios === 1 ? "célula vazia" : "células vazias"} (o cenário fica sem valor nesses meses)` });
    lista.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "erro" ? -1 : 1));
    return { cel, lista, erros: lista.filter(x => x.nivel === "erro").length, avisos: lista.filter(x => x.nivel === "aviso").length };
  }
  /** inconsistências de ordem numa versão salva (para os alertas) */
  function foraDeOrdem(v) {
    const E = doTipo(v, "esp"), Su = doTipo(v, "sup"), In = doTipo(v, "inf"), L = [];
    SUBS.forEach(s => MESES.forEach((m, i) => {
      const e = vDe(E, s.k, i), su = vDe(Su, s.k, i), inf = vDe(In, s.k, i);
      if (inf != null && e != null && inf > e + 0.005) L.push(`Inferior acima do Esperado em ${s.nome} ${rot(m)}`);
      if (su != null && e != null && e > su + 0.005) L.push(`Esperado acima do Superior em ${s.nome} ${rot(m)}`);
    }));
    return L;
  }

  // ================================================================================================
  // rascunho do cadastro (em edição; vira versão ao salvar)
  // ================================================================================================
  let RASC = null;
  function rascunho() {
    if (RASC && RASC.base === VIG().id) return RASC;
    const r = LS.json("rascunho", null);
    const ok = r && r.base === VIG().id && Array.isArray(r.cen) && r.cen.length && r.cen.every(c => c && TIPOS[c.tipo] && c.v && SUBS.every(s => Array.isArray(c.v[s.k]) && c.v[s.k].length === MESES.length));
    RASC = ok ? r : { base: VIG().id, cen: clone(VIG().cen) };
    return RASC;
  }
  const guardarRascunho = () => LS.gravar("rascunho", JSON.stringify(RASC));
  function descartarRascunho() { RASC = { base: VIG().id, cen: clone(VIG().cen) }; LS.apagar("rascunho"); }
  /** células e textos diferentes da versão vigente */
  function alteracoes(cen) {
    const V = VIG(); let cel = 0, texto = 0;
    cen.forEach(c => {
      const o = V.cen.find(x => x.id === c.id);
      if (!o) { cel += SUBS.reduce((t, s) => t + c.v[s.k].filter(x => x != null).length, 0); texto++; return; }
      if (o.nome !== c.nome || o.tipo !== c.tipo || (o.prem || "") !== (c.prem || "")) texto++;
      SUBS.forEach(s => c.v[s.k].forEach((x, i) => { if (x !== o.v[s.k][i]) cel++; }));
    });
    const removidos = V.cen.filter(o => !cen.some(c => c.id === o.id)).length;
    return { cel, texto, removidos, total: cel + texto + removidos };
  }
  function salvarVersao(autor, nota) {
    const R = rascunho(), val = validar(R.cen);
    if (val.erros) return { ok: false, msg: `Corrija ${val.erros} ${val.erros === 1 ? "célula" : "células"} que não ${val.erros === 1 ? "é número" : "são números"} antes de salvar.` };
    const cen = clone(R.cen).map(c => ({ ...c, nome: (c.nome || "").trim() || nomeDe(c), prem: (c.prem || "").trim() }));
    const nova = { id: "u" + Date.now(), horizonte: HOR, data: agora(), autor: (autor || "").trim() || "Research", nota: (nota || "").trim(), origem: "navegador", meses: MESES.slice(), cen };
    if (!nova.nota) nova.nota = "Sem nota. " + mudancas(VIG(), nova).txt.replace(/^./, c => c.toUpperCase()) + ".";
    const salvas = (LS.json("versoes", []) || []).filter(versaoValida);
    salvas.push(nova);
    LS.gravar("versoes", JSON.stringify(salvas));
    LS.gravar("autor", nova.autor);
    carregar(); descartarRascunho();
    LS.gravar("verA", VERS[VERS.length - 2].id); LS.gravar("verB", nova.id);
    return { ok: true, versao: nova, aviso: val.avisos };
  }
  function restaurarExemplo() { LS.apagar("versoes"); LS.apagar("rascunho"); LS.apagar("verA"); LS.apagar("verB"); RASC = null; carregar(); }

  // ================================================================================================
  // peças comuns: abas, inspetor do mês, leque
  // ================================================================================================
  /** abas no cabeçalho do painel sem disparo inicial (a de QC sempre começa na primeira) */
  function abas(p, opcoes, atual, aoTrocar, rotulo) {
    const g = h("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo);
    opcoes.forEach(([v, t]) => { const b = h("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(v === atual)); g.append(b); });
    g.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); aoTrocar(b.dataset.v); });
    const alvo = p.acoes || p;
    alvo.insertBefore(g, alvo.querySelector(".p-ajuda, .m-resumo-ir"));
    return g;
  }
  const abasSub = (p, atual, aoTrocar) => abas(p, SUBS.map(s => [s.k, s.nome]), atual, aoTrocar, "Submercado");
  function painel(g, o) { const p = Mesa.painel(g, o); p.el.id = "res-p-" + o.cod.split("-").slice(1).join("-"); return p; }

  /** inspetor: todos os cenários de um mês, com a diferença para a versão anterior */
  function inspMes(v, sub, i) {
    return el => {
      const ant = antDe(v), E = espDe(v), e = vDe(E, sub, i);
      el.append(h("p", "res-insp-cab", `Versão <b>${rotVer(v)}</b>${ant ? ` · Δ contra ${dataBr(ant.data)}` : " · primeira versão"}`));
      el.append(h("h3", null, `${SUBN[sub]} · ${rot(MESES[i])} · R$/MWh`));
      QC.tabela(el, [{ t: "Cenário" }, { t: "PLD", n: true }, { t: "Δ ant.", n: true }, { t: "− Esp.", n: true }],
        ordenar(v.cen).map(c => { const x = vDe(c, sub, i), d = delta(c, ant, sub, i);
          return [`<i class="res-sw" style="background:${corDe(c, v)}"></i>${esc(nomeDe(c))}`, n(x, 2), d == null ? (par(c, ant) || !ant ? "—" : "novo") : dl(d, 2), c === E || x == null || e == null ? "" : sn(x - e, 2)]; }), "densa res-tab-insp");
      if (sub === "SE" && refSE[i] != null) el.append(h("p", "leg", `${REF_NOME}: <b>${rs(refSE[i])}</b>${e != null ? ` · esperado − deck: <b>${srs(e - refSE[i])}</b>` : ""}. Referência sem bandeira: só o PLD do deck.`));
      el.append(h("h3", null, `Esperado nos quatro submercados · ${rot(MESES[i])}`));
      QC.tabela(el, [{ t: "Sub." }, { t: "Esp.", n: true }, { t: "Δ ant.", n: true }, { t: "− SE/CO", n: true }],
        SUBS.map(s => { const x = vDe(E, s.k, i), se = vDe(E, "SE", i), d = delta(E, ant, s.k, i); return [s.nome, n(x, 2), d == null ? "—" : dl(d, 2), s.k === "SE" || x == null || se == null ? "" : sn(x - se, 2)]; }), "densa res-tab-insp");
      const prem = ordenar(v.cen).filter(c => (c.prem || "").trim());
      if (prem.length) { el.append(h("h3", null, "Premissas")); QC.pares(el, prem.map(c => [esc(curto(c, v)), esc(c.prem)]), "premissas res-prem-insp"); }
      const a = h("a", "res-link", "Abrir na comparação ›"); a.href = `#RES-${T("CMP")}`;
      a.addEventListener("click", ev => { ev.preventDefault(); LS.gravar("subCmp", sub); LS.gravar("mesCmp", String(i)); LS.gravar("abrirCmp", "1"); Mesa.ir("RES", T("CMP")); });
      el.append(a);
    };
  }

  /** leque: faixa inferior–superior, esperado em destaque, sensibilidades tracejadas, esperado da versão anterior
   *  pontilhado e o PLD do deck (só SE/CO). Colunas de mês clicáveis (abrem no inspetor). */
  function leque(svg, W, H, o) {
    const V = o.ver, sub = o.sub, ant = antDe(V);
    const E = espDe(V), Su = doTipo(V, "sup"), In = doTipo(V, "inf"), sens = V.cen.filter(c => c.tipo === "sen");
    const serie = c => MESES.map((_, i) => vDe(c, sub, i));
    const EA = ant ? par(E, ant) : null, ref = sub === "SE" && TEM_REF ? refSE : null;
    const vals = [];
    [...V.cen, EA].filter(Boolean).forEach(c => serie(c).forEach(x => x != null && vals.push(x)));
    if (ref) ref.forEach(x => x != null && vals.push(x));
    if (!vals.length) { S(svg, "text", { x: W / 2, y: H / 2, "text-anchor": "middle" }, "Sem valores neste submercado"); return; }
    const m = { l: 46, r: 12, t: 16, b: 24 }, lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.08 || 10;
    const e = eixo(lo - pad, hi + pad, H < 200 ? 3 : 5);
    const pX = (W - m.l - m.r) / MESES.length, x = i => m.l + pX * (i + 0.5), y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    e.t.forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, n(t)); });
    rotulosX(svg, MESES.map((_, i) => i), x, H - 6, i => rot(MESES[i]), 40);
    // colunas clicáveis (atrás das linhas; as linhas não recebem o ponteiro)
    MESES.forEach((mes, i) => {
      const r = S(svg, "rect", { x: m.l + pX * i + 1, y: m.t, width: Math.max(1, pX - 2), height: H - m.t - m.b, class: "res-col" + (o.sel === i ? " selecionado" : "") });
      r.setAttribute("aria-label", `${SUBN[sub]} ${rot(mes)}`);
      dicaEm(r, () => `<b>${SUBN[sub]} · ${rot(mes)}</b>` + ordenar(V.cen).map(c => { const v = vDe(c, sub, i), d = delta(c, ant, sub, i); return `<span class="dica-l"><i style="background:${corDe(c, V)}"></i>${esc(nomeDe(c))}: <b>${n(v)}</b>${d != null ? ` (${seta(d)} ${sn(d)})` : ""}</span>`; }).join("") +
        (ref && ref[i] != null ? `<span class="dica-l"><i style="background:var(--res-ref)"></i>${REF_NOME}: <b>${n(ref[i])}</b></span>` : ""));
      Mesa.alvo(r, `${SUBN[sub]} · ${rot(mes)}`, el => { o.sel = i; if (o.aoSel) o.aoSel(i); inspMes(V, sub, i)(el); });
    });
    const g = S(svg, "g", { class: "res-tracos" });
    if (PISO >= e.a && PISO <= e.b) { S(g, "line", { x1: m.l, x2: W - m.r, y1: y(PISO), y2: y(PISO), stroke: "var(--ink-3)", "stroke-dasharray": "2 4" }); S(g, "text", { x: W - m.r - 2, y: y(PISO) - 4, "text-anchor": "end" }, `piso ${n(PISO, 2)}`); }
    if (Su && In) {
      const ok = MESES.map((_, i) => i).filter(i => vDe(Su, sub, i) != null && vDe(In, sub, i) != null);
      if (ok.length > 1) S(g, "polygon", { points: [...ok.map(i => `${x(i)},${y(vDe(Su, sub, i))}`), ...ok.slice().reverse().map(i => `${x(i)},${y(vDe(In, sub, i))}`)].join(" "), fill: "var(--faixa-proj)" });
    }
    const linha = (v, at) => { let seg = []; const segs = []; v.forEach((t, i) => { if (t == null) { if (seg.length) segs.push(seg); seg = []; } else seg.push(`${x(i)},${y(t)}`); }); if (seg.length) segs.push(seg); segs.forEach(p => S(g, p.length > 1 ? "polyline" : "circle", p.length > 1 ? { points: p.join(" "), fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round", ...at } : { cx: p[0].split(",")[0], cy: p[0].split(",")[1], r: 2.5, fill: at.stroke })); };
    if (ref) linha(ref, { stroke: "var(--res-ref)", "stroke-width": 1.4, "stroke-dasharray": "6 3 1 3" });
    [Su, In].filter(Boolean).forEach(c => linha(serie(c), { stroke: "var(--res-faixa)", "stroke-width": 1.2 }));
    sens.forEach(c => linha(serie(c), { stroke: corDe(c, V), "stroke-width": 1.6, "stroke-dasharray": "5 4" }));
    if (EA) linha(serie(EA), { stroke: "var(--t-ambar)", "stroke-width": 1.4, "stroke-dasharray": "1 3", opacity: 0.85 });
    if (E) {
      const se = serie(E); linha(se, { stroke: "var(--t-ambar)", "stroke-width": 2.6 });
      se.forEach((v, i) => { if (v == null) return; S(g, "circle", { cx: x(i), cy: y(v), r: o.sel === i ? 4.5 : 3, fill: "var(--t-ambar)", stroke: "var(--surface)", "stroke-width": 1.5 }); if (pX >= 34) S(g, "text", { x: x(i), y: y(v) - 8, "text-anchor": "middle", class: "res-rot-esp" }, n(v)); });
    }
  }
  function legendaLeque(V, sub) {
    const ant = antDe(V), L = [["var(--t-ambar)", "Esperado", "l"]];
    if (doTipo(V, "sup") && doTipo(V, "inf")) L.push(["var(--faixa-proj)", "Faixa inferior–superior"]);
    V.cen.filter(c => c.tipo === "sen").forEach(c => L.push([corDe(c, V), esc(nomeDe(c)), "t"]));
    if (ant) L.push(["var(--t-ambar)", `Esperado de ${dataBr(ant.data)}`, "t"]);
    if (sub === "SE" && TEM_REF) L.push(["var(--res-ref)", REF_NOME, "t"]);
    return QC.legenda(L);
  }

  // ================================================================================================
  // tela 1 · REU Morning Call: a rodada vigente numa tela só, para a reunião de 15 minutos
  // ================================================================================================
  // Hidrologia e mercado de EXEMPLO (FICTÍCIOS, semente fixa). No app: a ENA (% MLT) e o armazenamento de partida
  // de cada cenário vêm do cadastro do research; o histórico de armazenamento, do ONS; a curva, da BBCE (a mesma do MKT).
  const HID = (function () {
    let s = 20261119;
    const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
    const r1 = v => Math.round(v * 10) / 10, lim = v => Math.max(3, Math.min(99, v));
    // armazenamento médio de fim de mês (% da EARmáx), jan a dez, por submercado
    const CLIMA = {
      SE: [46, 55, 62, 66, 66, 63, 58, 52, 45, 38, 33, 37], S: [62, 59, 56, 55, 60, 68, 75, 77, 75, 72, 67, 63],
      NE: [48, 58, 65, 69, 69, 66, 61, 54, 46, 39, 35, 39], N: [52, 70, 87, 96, 97, 92, 82, 68, 52, 40, 35, 40],
    };
    const OFF26 = { SE: -8, S: 7, NE: -11, N: -5 };
    const ear = {};
    SUBS.forEach(({ k }) => {
      ear[k] = {};
      for (let a = 2001; a <= 2026; a++) {
        let o = a === 2026 ? OFF26[k] : gauss() * 9;
        ear[k][a] = CLIMA[k].map(c => { o = o * 0.96 + gauss() * (a === 2026 ? 1 : 2.6); return r1(lim(c + o)); });
      }
      ear[k][2026] = ear[k][2026].slice(0, 11);   // 2026 até novembro: o de nov é a partida (30/11) da rodada
    });
    // ENA de cada cenário de exemplo, % MLT, dez/26 a mai/27
    const ESP = { SE: [85, 88, 92, 95, 96, 98], S: [104, 97, 94, 100, 110, 116], NE: [70, 74, 80, 85, 88, 90], N: [80, 84, 88, 92, 95, 98] };
    const FAT = { esp: () => 1, sup: () => 0.76, inf: () => 1.29, "sen-seca": k => (k === "SE" ? 0.9 : 1), "sen-carga": () => 1 };
    const ena = (c, k) => (FAT[c.id] ? ESP[k].map(v => Math.round(v * FAT[c.id](k))) : null);
    return { CLIMA, ear, ena, lim, r1 };
  })();
  // eixo do armazenamento: jan/26 a mai/27 (observado até nov/26, partida em 30/11, projeção de dez/26 a mai/27)
  const EAR_X = []; for (let i = 0; i < 17; i++) { const a = 2026 + Math.floor(i / 12), m = i % 12; EAR_X.push({ a, m, p: `${a}-${String(m + 1).padStart(2, "0")}` }); }
  const I_PART = 10;   // nov/26
  const partida = k => HID.ear[k][2026][10];
  const pctl = (a, p) => { const o = a.slice().sort((x, y) => x - y), i = (o.length - 1) * p, f = Math.floor(i); return o[f] + (o[Math.min(f + 1, o.length - 1)] - o[f]) * (i - f); };
  /** faixa histórica (2001–2025) do mês do calendário */
  const histMes = (k, m) => { const v = []; for (let a = 2001; a <= 2025; a++) v.push(HID.ear[k][a][m]); return { min: Math.min(...v), max: Math.max(...v), med: pctl(v, 0.5) }; };
  /** recomposição: a partida somada à variação de cada um dos últimos 10 anos (nov → dez…mai seguinte) */
  const REC_ANOS = Array.from({ length: 10 }, (_, i) => 2016 + i);
  function recomposicao(k) {
    const p = partida(k);
    const traj = REC_ANOS.map(y => MESES.map((_, j) => { const v = j === 0 ? HID.ear[k][y][11] : HID.ear[k][y + 1][j - 1]; return HID.lim(p + v - HID.ear[k][y][10]); }));
    return MESES.map((_, j) => { const c = traj.map(t => t[j]); return { med: HID.r1(c.reduce((s, v) => s + v, 0) / c.length), p10: HID.r1(pctl(c, 0.1)), p90: HID.r1(pctl(c, 0.9)) }; });
  }
  /** trajetória do armazenamento num cenário: média do mês + 0,12 p.p. por p.p. de ENA acima/abaixo da MLT */
  function earCen(c, k) {
    const e = HID.ena(c, k); if (!e) return null;
    let v = partida(k);
    return MESES.map((_, j) => { const m = (11 + j) % 12, ant = (10 + j) % 12; v = HID.lim(v + HID.CLIMA[k][m] - HID.CLIMA[k][ant] + 0.12 * (e[j] - 100) - (c.id === "sen-carga" ? 0.5 : 0)); return HID.r1(v); });
  }
  // curva de mercado SE (BBCE, fechamento de 14/11/26, fictícia, na mesma base do MKT); mar/27 sai do 1T27 e
  // abr–mai do 2T27, porque esses meses não são negociados sozinhos
  const MERC = [
    { v: 214, o: "produto dez/26" }, { v: 222, o: "produto jan/27" }, { v: 205, o: "produto fev/27" },
    { v: 3 * 212 - 222 - 205, o: "implícito: 1T27 a R$ 212 menos jan e fev" }, { v: 188, o: "2T27 (trimestre)" }, { v: 188, o: "2T27 (trimestre)" },
  ];
  const MERC_FONTE = "BBCE, fechamento de 14/11/26 (fictício)";
  /** preço de mercado digitado na tela (R$/MWh, um por mês; null = usa o de exemplo). No app irá para o servidor. */
  let MERC_USR = (() => { const a = LS.json("merc", null); return Array.isArray(a) && a.length === MESES.length ? a.map(v => (typeof v === "number" && isFinite(v) ? v : null)) : MESES.map(() => null); })();
  const mercV = i => (MERC_USR[i] != null ? MERC_USR[i] : MERC[i].v);
  const nMerc = v => n(v, Number.isInteger(v) ? 0 : 2);
  const mercDigitado = () => MERC_USR.some(v => v != null);
  const mercInfo = () => { const q = LS.ler("mercQuando", ""); return mercDigitado() ? `digitado na tela${q ? ` em ${dataBr(q)} ${q.slice(11, 16)}` : ""}` : MERC_FONTE; };
  /** data do cenário: a primeira versão, voltando a partir de v, em que ele já tinha os mesmos valores */
  function dataCen(c, v) {
    let i = VERS.indexOf(v), d = v.data;
    while (i > 0) { const a = par(c, VERS[i - 1]); if (!a || JSON.stringify(a.v) !== JSON.stringify(c.v)) break; d = VERS[i - 1].data; i--; }
    return d;
  }
  const ehBase = c => c.tipo !== "sen";
  const T = cod => TELAS.findIndex(t => t.cod === cod) + 1;
  const corEna = v => v == null ? "transparent" : `color-mix(in srgb, ${v >= 100 ? "var(--res-umido)" : "var(--res-seco)"} ${Math.round(Math.min(1, Math.abs(v - 100) / 40) * 55)}%, transparent)`;

  /** inspetor de um cenário: premissa, data, PLD nos quatro submercados, ENA e armazenamento */
  function inspCen(c, V) {
    return el => {
      const ant = antDe(V), d = dataCen(c, V);
      el.append(h("p", "res-insp-cab", `${ehBase(c) ? "Cenário base" : "Sensibilidade"} · atualizado em <b>${dataBr(d)}</b>${d !== V.data ? ` (repetido na rodada de ${dataBr(V.data)})` : ""}`));
      if ((c.prem || "").trim()) el.append(h("p", null, esc(c.prem)));
      el.append(h("h3", null, "PLD · R$/MWh"));
      QC.tabela(el, [{ t: "Sub." }, ...MESES.map(m => ({ t: rot(m), n: true }))],
        SUBS.map(s => [s.nome, ...MESES.map((_, i) => `${n(vDe(c, s.k, i))}${ant ? dl(delta(c, ant, s.k, i)) : ""}`)]).concat([["Merc. SE", ...MESES.map((_, i) => nMerc(mercV(i)))]]), "densa res-tab-insp");
      el.append(h("h3", null, "ENA · % MLT"));
      const tem = HID.ena(c, "SE");
      if (tem) QC.tabela(el, [{ t: "Sub." }, ...MESES.map(m => ({ t: rot(m), n: true }))], SUBS.map(s => [s.nome, ...HID.ena(c, s.k).map(v => n(v))]), "densa res-tab-insp");
      else el.append(h("p", "leg", "Sem premissa de ENA no cadastro deste cenário."));
      el.append(h("h3", null, "Armazenamento · % EARmáx"));
      if (tem) QC.tabela(el, [{ t: "Sub." }, { t: "Partida 30/11", n: true }, { t: `Fim ${rot(MESES[5])}`, n: true }, { t: "Rec. média", n: true }],
        SUBS.map(s => [s.nome, n(partida(s.k), 1), n(earCen(c, s.k)[5], 1), n(recomposicao(s.k)[5].med, 1)]), "densa res-tab-insp");
      const a = h("a", "res-link", "Abrir no cadastro ›"); a.href = `#RES-${T("CAD")}`;
      el.append(a);
      el.append(h("p", "leg", FICT));
    };
  }

  /** RES-16: armazenamento de um submercado, jan/26 a mai/27, contra o histórico e a recomposição */
  function earSub(svg, W, H, k, V) {
    const m = { l: 30, r: 46, t: 10, b: 20 }, nX = EAR_X.length;
    const x = i => m.l + (W - m.l - m.r) * i / (nX - 1), y = v => m.t + (H - m.t - m.b) * (1 - v / 100);
    [0, 25, 50, 75, 100].forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 4, y: y(t) + 3, "text-anchor": "end" }, t); });
    rotulosX(svg, EAR_X.map((_, i) => i).filter(i => i % 4 === 0), x, H - 5, i => rot(EAR_X[i].p), 34);
    const hist = EAR_X.map(p => histMes(k, p.m)), rec = recomposicao(k), obs = HID.ear[k][2026];
    const cs = ordenar(V.cen).filter(c => HID.ena(c, k)), E = cs.find(c => c.tipo === "esp");
    // colunas com dica e inspetor
    EAR_X.forEach((p, i) => {
      const w = (W - m.l - m.r) / (nX - 1), r = S(svg, "rect", { x: x(i) - w / 2, y: m.t, width: w, height: H - m.t - m.b, class: "res-col" });
      const j = i - I_PART - 1;
      dicaEm(r, () => `<b>${SUBN[k]} · ${rot(p.p)}</b><span class="dica-l">Histórico 2001–2025: ${n(hist[i].min)}–${n(hist[i].max)}% (mediana ${n(hist[i].med)}%)</span>` +
        (i <= I_PART ? `<span class="dica-l">${i === I_PART ? "Partida (30/11)" : "Observado"}: <b>${n(obs[i], 1)}%</b></span>` :
          `<span class="dica-l">Recomposição: média <b>${n(rec[j].med)}%</b> · p10–p90 ${n(rec[j].p10)}–${n(rec[j].p90)}%</span>` + cs.map(c => `<span class="dica-l"><i style="background:${corDe(c, V)}"></i>${esc(nomeDe(c))}: <b>${n(earCen(c, k)[j], 1)}%</b></span>`).join("")));
      Mesa.alvo(r, `Armazenamento ${SUBN[k]}`, el => inspEar(el, k, V));
    });
    const g = S(svg, "g", { class: "res-tracos" });
    S(g, "polygon", { points: [...hist.map((h2, i) => `${x(i)},${y(h2.max)}`), ...hist.slice().reverse().map((h2, i) => `${x(nX - 1 - i)},${y(h2.min)}`)].join(" "), fill: "var(--res-hist)" });
    const xs = [I_PART, ...MESES.map((_, j) => I_PART + 1 + j)], p0 = partida(k);
    S(g, "polygon", { points: [...xs.map((i, q) => `${x(i)},${y(q ? rec[q - 1].p90 : p0)}`), ...xs.slice().reverse().map((i, q) => { const qq = xs.length - 1 - q; return `${x(i)},${y(qq ? rec[qq - 1].p10 : p0)}`; })].join(" "), fill: "var(--res-rec)" });
    const lin = (pts, at) => S(g, "polyline", { points: pts.map(([i, v]) => `${x(i)},${y(v)}`).join(" "), fill: "none", "stroke-linejoin": "round", ...at });
    lin(xs.map((i, q) => [i, q ? rec[q - 1].med : p0]), { stroke: "var(--ink-2)", "stroke-width": 1.3, "stroke-dasharray": "2 3" });
    cs.filter(c => c !== E).forEach(c => lin(xs.map((i, q) => [i, q ? earCen(c, k)[q - 1] : p0]), c.tipo === "sen" ? { stroke: corDe(c, V), "stroke-width": 1.3, "stroke-dasharray": "5 4" } : { stroke: "var(--res-faixa)", "stroke-width": 1.1 }));
    lin(obs.map((v, i) => [i, v]), { stroke: "var(--ink)", "stroke-width": 1.8 });
    if (E) lin(xs.map((i, q) => [i, q ? earCen(E, k)[q - 1] : p0]), { stroke: "var(--t-ambar)", "stroke-width": 2.2 });
    S(g, "circle", { cx: x(I_PART), cy: y(p0), r: 3.5, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1.5 });
    S(g, "text", { x: x(I_PART), y: y(p0) + (p0 > 50 ? 15 : -8), "text-anchor": "middle", class: "res-rot-part" }, `${n(p0, 0)}%`);
    // rótulos no fim: esperado e recomposição média, afastados se encostarem
    const fim = [...(E ? [{ t: `Esp. ${n(earCen(E, k)[5])}`, v: earCen(E, k)[5], cls: "res-rot-esp" }] : []), { t: `Rec. ${n(rec[5].med)}`, v: rec[5].med, cls: "res-rot-lin" }].map(o => ({ ...o, py: y(o.v) + 3 })).sort((a, b) => a.py - b.py);
    if (fim.length > 1 && fim[1].py - fim[0].py < 11) { const c = (fim[0].py + fim[1].py) / 2; fim[0].py = c - 5.5; fim[1].py = c + 5.5; }
    fim.forEach(o => S(g, "text", { x: W - m.r + 4, y: o.py, class: o.cls }, o.t));
  }
  function inspEar(el, k, V) {
    const rec = recomposicao(k), cs = ordenar(V.cen).filter(c => HID.ena(c, k));
    el.append(h("p", "res-insp-cab", `Partida em 30/11: <b>${n(partida(k), 1)}% da EARmáx</b> · histórico de nov (2001–2025): ${n(histMes(k, 10).min)}–${n(histMes(k, 10).max)}%`));
    el.append(h("h3", null, `${SUBN[k]} · % EARmáx no fim do mês`));
    QC.tabela(el, [{ t: "Mês" }, { t: "Hist. mín–máx", n: true }, { t: "Rec. p10–p90", n: true }, { t: "Rec. méd.", n: true }, ...cs.map(c => ({ t: esc(curto(c, V)), n: true }))],
      MESES.map((mes, j) => { const hm = histMes(k, (11 + j) % 12); return [rot(mes), `${n(hm.min)}–${n(hm.max)}`, `${n(rec[j].p10)}–${n(rec[j].p90)}`, n(rec[j].med), ...cs.map(c => n(earCen(c, k)[j], 1))]; }), "densa res-tab-insp");
    el.append(h("p", "leg", `Recomposição: a partida somada à variação, de novembro a cada mês seguinte, de cada um dos anos de ${REC_ANOS[0]} a ${REC_ANOS[REC_ANOS.length - 1]}. Cenários: armazenamento que resulta da ENA de cada um. ${FICT}`));
  }

  // MLT mensal por submercado (MWmed), a mesma da HYD; ENA em MWmed = % MLT × MLT do mês
  const MLT_SUB = (window.HYD && window.HYD.produto && window.HYD.produto.mlt_sub) || null;
  const mltMes = (k, j) => (MLT_SUB && MLT_SUB[k] ? MLT_SUB[k][(11 + j) % 12] : null);
  const mwmed = (k, j, pct) => { const m = mltMes(k, j); return m == null || pct == null ? null : pct / 100 * m; };
  const UMIDO = [0, 1, 2, 3, 4];   // dez a abr
  const media = a => a.reduce((s2, v) => s2 + v, 0) / a.length;
  /** posição da partida entre os novembros de 2001 a 2025: % dos anos com armazenamento menor */
  const posHist = k => { let c = 0; for (let a = 2001; a <= 2025; a++) if (HID.ear[k][a][10] < partida(k)) c++; return Math.round(c / 25 * 100); };
  const cabMeses = (extra = []) => [{ t: "Sub." }, ...MESES.map(m => ({ t: rot(m), n: true })), ...extra];

  function telaREU(area) {
    const V = VIG(), ant = antDe(V), E = espDe(V), cs = ordenar(V.cen), Su = doTipo(V, "sup"), In = doTipo(V, "inf");
    const redesenhar = () => { area.replaceChildren(); telaREU(area); };
    seletorHorizonte(area, redesenhar);
    const g = Mesa.grade(area);

    // ---- RES-12 · preço e ENA na mesma linha, numa tabela só (os meses ficam sempre nas mesmas colunas) ----
    const p1 = painel(g, { cod: "RES-12", titulo: `ENA e preço · rodada ${V.horizonte} ${dataBr(V.data)}`, unidade: "ENA % MLT e MWmed · PLD R$/MWh", tam: "full", ajuda: "reuniao",
      leg: `${ant ? `▲▼ contra a rodada de ${dataBr(ant.data)}. ` : ""}ENA: laranja abaixo da MLT, azul acima; embaixo, em MWmed (MLT da HYD). Úmido: média de dez a abr. Mercado: digite o preço de cada mês (Enter passa ao próximo; vazio volta ao exemplo); o exemplo usa mar/27 implícito do 1T27 e abr–mai/27 pelo 2T27. Clique numa célula para o detalhe.` });
    const nM = MESES.length;
    const celP = (v, d) => `<span class="num">${n(v)}</span>${d === undefined ? "" : dl(d)}`;
    const celE = (k, j, v) => v == null ? "" : `<span class="res-ena" style="background:${corEna(v)}"><b>${n(v)}</b>${j == null ? "" : `<small>${n(mwmed(k, j, v))}</small>`}</span>`;
    const umido = e => media(UMIDO.map(j => e[j]));
    const difMerc = i => { const d = mercV(i) - vDe(E, "SE", i); return `<span class="res-d ${tom(d)}">${seta(d)} ${sn(d)}</span>`; };
    const linhas = [];   // { cls, rot, ena: [html] (nM + 1), pld: [html], alvoE, alvoP }
    const grupo = t => linhas.push({ grupo: t });
    grupo("Esperado · todos os submercados");
    SUBS.forEach(s2 => { const e = HID.ena(E, s2.k);
      linhas.push({ rot: s2.nome, ena: [...e.map((v, j) => celE(s2.k, j, v)), celE(s2.k, null, umido(e))], pld: MESES.map((_, i) => celP(vDe(E, s2.k, i), ant ? delta(E, ant, s2.k, i) : undefined)),
        alvoE: j => [`ENA ${s2.nome} · ${rot(MESES[j])}`, inspEna(s2.k, j, V)], alvoP: i => [`${s2.nome} · ${rot(MESES[i])}`, inspMes(V, s2.k, i)] }); });
    grupo("SE/CO · cenários e mercado");
    cs.forEach(c => { const e = HID.ena(c, "SE");
      linhas.push({ cls: c === E ? "destaque" : "", rot: `<span title="${esc(nomeDe(c))}"><i class="res-sw" style="background:${corDe(c, V)}"></i>${esc(curto(c, V))}${c.tipo === "sen" ? ` <small class="res-cen-mini">${esc(nomeDe(c))}</small>` : ""}</span>`,
        ena: e ? [...e.map((v, j) => celE("SE", j, v)), celE("SE", null, umido(e))] : Array(nM + 1).fill("—"), pld: MESES.map((_, i) => celP(vDe(c, "SE", i))),
        alvoE: j => [`ENA SE/CO · ${rot(MESES[j])}`, inspEna("SE", j, V)], alvoP: i => [`SE/CO · ${rot(MESES[i])}`, inspMes(V, "SE", i)] }); });
    linhas.push({ cls: "res-tr-merc", rot: `Mercado <small class="res-cen-mini">digite</small>`, ena: Array(nM + 1).fill(""),
      pld: MESES.map((m, i) => `<input class="res-merc-in${MERC_USR[i] != null ? " digitado" : ""}" data-i="${i}" inputmode="decimal" aria-label="Preço de mercado SE/CO ${rot(m)}" title="Exemplo: ${n(MERC[i].v)} (${MERC[i].o})" value="${nMerc(mercV(i))}">`) });
    linhas.push({ cls: "res-tr-merc res-tr-dif", rot: "Merc − Esp.", ena: Array(nM + 1).fill(""), pld: MESES.map((_, i) => difMerc(i)) });
    const thM = (bordaNo0) => MESES.map((m, j) => `<th class="n${bordaNo0 && j === 0 ? " res-pe-div" : ""}">${rot(m)}</th>`).join("");
    const rol = h("div", "rolagem"); p1.corpo.append(rol);
    const t = h("table", "densa res-pe");
    t.innerHTML = `<colgroup><col class="res-pe-rot">${"<col>".repeat(2 * nM + 1)}</colgroup>` +
      `<thead><tr class="res-pe-blocos"><th></th><th colspan="${nM + 1}">ENA · % MLT <small>e MWmed</small></th><th colspan="${nM}" class="res-pe-div">PLD · R$/MWh</th></tr>` +
      `<tr><th>Sub. / cenário</th>${thM(false)}<th class="n">Úmido</th>${thM(true)}</tr></thead><tbody>` +
      linhas.map(l => l.grupo ? `<tr class="res-pe-grupo"><td colspan="${2 * nM + 2}">${l.grupo}</td></tr>` :
        `<tr class="${l.cls || ""}"><td>${l.rot}</td>${l.ena.map(x => `<td class="n">${x}</td>`).join("")}${l.pld.map((x, i) => `<td class="n${i === 0 ? " res-pe-div" : ""}">${x}</td>`).join("")}</tr>`).join("") + "</tbody>";
    rol.append(t);
    let r = 0;
    t.querySelectorAll("tbody tr").forEach(tr => {
      if (tr.classList.contains("res-pe-grupo")) { r++; return; }
      const l = linhas[r++]; const tds = tr.querySelectorAll("td");
      if (l.alvoE) for (let j = 0; j < nM; j++) Mesa.alvo(tds[1 + j], ...l.alvoE(j));
      if (l.alvoP) for (let i = 0; i < nM; i++) Mesa.alvo(tds[2 + nM + i], ...l.alvoP(i));
    });
    // preço de mercado digitado: grava no navegador, refaz a linha Merc − Esp. e o rodapé, sem redesenhar a tabela
    const linhaDif = t.querySelector("tr.res-tr-dif"), fonteM = h("p", "res-merc-fonte");
    const atualizarFonte = () => { fonteM.innerHTML = `Mercado: <b>${mercInfo()}</b>${mercDigitado() ? ' · <button type="button" class="res-btn" data-volta>Voltar ao exemplo</button>' : ""}`; };
    p1.corpo.insertBefore(fonteM, p1.corpo.querySelector(".leg"));
    atualizarFonte();
    const gravar = inp => {
      const i = +inp.dataset.i, v = lerNum(inp.value);
      if (Number.isNaN(v)) { inp.classList.add("erro"); inp.title = "Não é um número: use 214 ou 214,50"; return; }
      inp.classList.remove("erro");
      MERC_USR[i] = v == null ? null : v;
      inp.classList.toggle("digitado", MERC_USR[i] != null);
      inp.value = nMerc(mercV(i));
      LS.gravar("merc", JSON.stringify(MERC_USR)); LS.gravar("mercQuando", agora());
      linhaDif.querySelectorAll("td")[2 + nM + i].innerHTML = difMerc(i);
      atualizarFonte();
    };
    t.querySelectorAll(".res-merc-in").forEach((inp, i, todos) => {
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("change", () => gravar(inp));
      inp.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || (ev.key === "Tab" && !ev.shiftKey && i < todos.length - 1)) { ev.preventDefault(); gravar(inp); (todos[i + 1] || inp).focus(); }
        else if (ev.key === "Escape") { inp.value = nMerc(mercV(i)); inp.blur(); }
        ev.stopPropagation();   // números e setas são do campo, não atalhos da mesa
      });
    });
    fonteM.addEventListener("click", ev => { if (!ev.target.closest("[data-volta]")) return; MERC_USR = MESES.map(() => null); LS.apagar("merc"); LS.apagar("mercQuando"); redesenhar(); });

    // ---- RES-13 · armazenamento: partida, mesma data do ano anterior e fim do período úmido ----
    const p2 = painel(g, { cod: "RES-13", titulo: "Armazenamento: partida e fim do período úmido", unidade: "% EARmáx", tam: "xl", ajuda: "reuniao-ear",
      leg: `A partida é a mesma em todos os cenários da rodada (condição inicial do deck); se uma sensibilidade mudar a partida, ela aparece na coluna do cenário. Recomposição: partida + variação de cada ano de ${REC_ANOS[0]} a ${REC_ANOS[REC_ANOS.length - 1]}. Clique numa linha para o mês a mês.` });
    const rolA = h("div", "rolagem"); p2.corpo.append(rolA);
    const sens = cs.filter(c => c.tipo === "sen" && HID.ena(c, "SE"));
    const ta = QC.tabela(rolA, [{ t: "Sub." }, { t: "Partida 30/11/26", n: true }, { t: "30/11/25", n: true }, { t: "Δ ano", n: true }, { t: "Na história", n: true },
      { t: `Fim ${rot(MESES[4])} · Esp.`, n: true }, { t: "Sup. – Inf.", n: true }, ...sens.map(c => ({ t: `<span title="${esc(nomeDe(c))}">${esc(curto(c, V))}</span>`, n: true })), { t: "Recomp. méd.", n: true }, { t: "p10–p90", n: true }],
      SUBS.map(s2 => { const p0 = partida(s2.k), a25 = HID.ear[s2.k][2025][10], rc = recomposicao(s2.k)[4], dA = p0 - a25;
        return [s2.nome, `<b>${n(p0, 1)}</b>`, n(a25, 1), `<span class="res-d ${tom(dA)}">${seta(dA)} ${sn(dA, 1)}</span>`, `<span title="Novembros de 2001 a 2025 com armazenamento menor">acima de ${posHist(s2.k)}%</span>`,
          `<b>${n(earCen(E, s2.k)[4], 1)}</b>`, `${n(earCen(Su, s2.k)[4])}–${n(earCen(In, s2.k)[4])}`, ...sens.map(c => n(earCen(c, s2.k)[4], 1)), n(rc.med, 1), `${n(rc.p10)}–${n(rc.p90)}`]; }), "densa res-tab-ear");
    ta.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `Armazenamento ${SUBS[i].nome}`, el => inspEar(el, SUBS[i].k, V)));

    // ---- RES-14 · cenários da rodada: tipo e data, no canto ----
    const p3 = painel(g, { cod: "RES-14", titulo: "Cenários e datas", tam: "s", ajuda: "reuniao",
      leg: "Data: rodada em que o cenário mudou pela última vez; cinza = repetido. Clique para a premissa." });
    const tc = QC.tabela(p3.corpo, [{ t: "Cenário" }, { t: "Tipo" }, { t: "Data", n: true }],
      cs.map(c => { const d = dataCen(c, V);
        return [`<span class="res-cen-n" title="${esc(c.prem || "")}"><i class="res-sw" style="background:${corDe(c, V)}"></i>${c.tipo === "sen" ? `${esc(curto(c, V))} · ` : ""}${esc(nomeDe(c))}</span>`,
          ehBase(c) ? "Base" : '<span class="res-sens">Sensib.</span>',
          `<span class="${d !== V.data ? "res-antiga" : ""}" title="${d !== V.data ? "Repetido de uma rodada anterior" : "Atualizado nesta rodada"}">${dataBr(d).slice(0, 5)}</span>`]; }), "densa res-tab-cen");
    tc.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, nomeDe(cs[i]), inspCen(cs[i], V)));

    // ---- RES-15 · trajetórias do armazenamento ----
    const p5 = painel(g, { cod: "RES-15", titulo: "Armazenamento: trajetória", unidade: "% EARmáx, fim do mês", tam: "full", ajuda: "reuniao-ear",
      leg: `Faixa fraca = mínimo a máximo de 2001 a 2025 em cada mês; faixa forte = recomposição (partida + variação de cada ano de ${REC_ANOS[0]} a ${REC_ANOS[REC_ANOS.length - 1]}), p10 a p90, média pontilhada. Clique num gráfico para a tabela mês a mês.` });
    p5.corpo.insertAdjacentHTML("beforeend", QC.legenda([["var(--ink)", "2026 observado e partida", "l"], ["var(--t-ambar)", "Esperado", "l"], ["var(--res-faixa)", "Superior e inferior", "l"],
      ...sens.map(c => [corDe(c, V), esc(nomeDe(c)), "t"]), ["var(--res-hist)", "Histórico mín–máx"], ["var(--res-rec)", "Recomposição p10–p90"], ["var(--ink-2)", "Recomposição média", "t"]]));
    const gr = h("div", "res-ear"); p5.corpo.append(gr);
    SUBS.forEach(s2 => {
      const b = h("div", "res-ear-sub", `<p class="res-ear-t"><b>${s2.nome}</b> partida <b>${n(partida(s2.k), 1)}%</b> <span>· 30/11/25 ${n(HID.ear[s2.k][2025][10], 1)}% · mediana de nov ${n(histMes(s2.k, 10).med, 0)}%</span></p>`);
      gr.append(b);
      grafico(b, (svg, W, H) => earSub(svg, W, H, s2.k, V), null, `Armazenamento ${s2.nome}`);
    });
  }
  /** inspetor da ENA: todos os cenários num submercado e mês */
  function inspEna(k, j, V) {
    return el => {
      const mlt = mltMes(k, j);
      el.append(h("p", "res-insp-cab", `MLT de ${rot(MESES[j]).slice(0, 3)}: <b>${n(mlt)} MWmed</b>`));
      QC.tabela(el, [{ t: "Cenário" }, { t: "% MLT", n: true }, { t: "MWmed", n: true }],
        ordenar(V.cen).filter(c => HID.ena(c, k)).map(c => { const v = HID.ena(c, k)[j]; return [`<i class="res-sw" style="background:${corDe(c, V)}"></i>${esc(nomeDe(c))}`, n(v), n(mwmed(k, j, v))]; }), "densa res-tab-insp");
      el.append(h("p", "leg", FICT));
    };
  }

  // ================================================================================================
  // tela 2 · CAD Cadastro
  // ================================================================================================
  function telaCAD(area) {
    const R = rascunho();
    let sub = subPref("subCad"), val = validar(R.cen), decEl = null, msg = null, msgColar = "";
    const itensDec = () => {
      const a = alteracoes(R.cen), V = VIG(), E = R.cen.find(c => c.tipo === "esp") || R.cen[0], EV = par(E, V);
      const x = vDe(E, "SE", 0), d = EV && x != null && vDe(EV, "SE", 0) != null ? x - vDe(EV, "SE", 0) : null;
      return [
        { r: "Rascunho", v: a.total ? `${a.total} ${a.total === 1 ? "alteração" : "alterações"}` : "Igual à vigente", d: `sobre a versão ${rotVer(V)}`, principal: true },
        { r: "Validação", v: `${val.erros} ${val.erros === 1 ? "erro" : "erros"} · ${val.avisos} ${val.avisos === 1 ? "aviso" : "avisos"}`, d: val.erros ? "texto que não é número impede salvar" : "avisos não impedem salvar", tom: val.erros ? "desce" : "" },
        { r: `Esperado SE/CO ${rot(MESES[0])}`, v: rs(x, 2), d: d == null ? "sem valor na vigente" : `${dTxt(d, 2)} contra a vigente`, tom: d ? tom(d) : "" },
        { r: "Cenários no rascunho", v: String(R.cen.length), d: ordenar(R.cen).map(c => esc(curto(c, { cen: R.cen }))).join(" · ") },
      ];
    };
    const refazerDec = () => { const t = h("div"); const novo = Mesa.decisao(t, itensDec()); if (decEl) decEl.replaceWith(novo); else if (novo.childElementCount) area.prepend(novo); decEl = novo; };
    seletorHorizonte(area, () => { area.replaceChildren(); telaCAD(area); });
    refazerDec();
    const g = Mesa.grade(area);

    // ---- RES-1 · tabela editável
    const p1 = painel(g, { cod: "RES-1", titulo: "PLD médio mensal por cenário", unidade: "R$/MWh · editável", tam: "xl", ajuda: "cadastro",
      leg: "Cada linha é um cenário; cada coluna, um mês (M+1 a M+6). Células com fundo âmbar mudaram em relação à versão vigente; borda vermelha: não é número; tracejada: aviso (fora do piso–teto ou fora da ordem inferior ≤ esperado ≤ superior). ↑ ↓ e Enter andam entre as linhas; colar do Excel numa célula preenche para a direita e para baixo.",
      fonte: `${FICT} Piso ${rs(PISO)} e teto ${rs(TETO)} (os do Pricing, fictícios).` });
    abasSub(p1, sub, v => { sub = v; LS.gravar("subCad", v); desenharTabela(); });
    const corpo1 = p1.corpo;

    function desenharTabela() {
      corpo1.replaceChildren();
      const barra = h("div", "res-barra");
      const bSen = h("button", "res-btn", "+ Sensibilidade"); bSen.type = "button"; bSen.title = "Nova linha que parte dos valores do esperado (em todos os submercados)";
      const bVaz = h("button", "res-btn", "+ Cenário vazio"); bVaz.type = "button";
      const bCol = h("button", "res-btn", "Colar do Excel…"); bCol.type = "button"; bCol.setAttribute("aria-expanded", "false");
      barra.append(bSen, bVaz, bCol, h("span", "res-r", `Submercado <b>${SUBN[sub]}</b> · ${R.cen.length} cenários · os nomes, tipos e premissas valem para os quatro submercados`));
      corpo1.append(barra);
      const novo = (base) => { const E = R.cen.find(c => c.tipo === "esp"); R.cen.push({ id: "c" + Date.now().toString(36), tipo: base ? "sen" : "sen", nome: base ? "Nova sensibilidade" : "Novo cenário", prem: "", v: Object.fromEntries(SUBS.map(s => [s.k, base && E ? E.v[s.k].slice() : MESES.map(() => null)])) }); mudouEstrutura(); requestAnimationFrame(() => { const ins = corpo1.querySelectorAll(".res-nome"); const u = ins[ins.length - 1]; if (u) { u.focus(); u.select(); } }); };
      bSen.addEventListener("click", () => novo(true));
      bVaz.addEventListener("click", () => novo(false));

      const colar = h("div", "res-colar");
      colar.hidden = true;
      colar.innerHTML = `<label class="res-r" for="res-colar-txt">Cole linhas copiadas do Excel: <b>nome</b> e até 6 valores (dez/26 a mai/27), separados por tabulação. Vale para o submercado <b>${SUBN[sub]}</b>; nome que não existe vira sensibilidade nova.</label>
        <textarea id="res-colar-txt" rows="3" spellcheck="false" placeholder="Esperado&#9;186,40&#9;158,10&#9;132,00&#9;121,50&#9;148,00&#9;205,30"></textarea>
        <div class="res-barra"><button type="button" class="res-btn prim">Aplicar</button><span class="res-r res-colar-msg" aria-live="polite">${esc(msgColar)}</span></div>`;
      msgColar = "";
      bCol.addEventListener("click", () => { colar.hidden = !colar.hidden; bCol.setAttribute("aria-expanded", String(!colar.hidden)); if (!colar.hidden) colar.querySelector("textarea").focus(); });
      colar.querySelector(".prim").addEventListener("click", () => {
        const txt = colar.querySelector("textarea").value, r = aplicarColagem(txt);
        colar.querySelector(".res-colar-msg").textContent = r;
        if (/aplicad/.test(r)) { msgColar = r; mudouEstrutura(true); }
      });

      const box = h("div", "rolagem res-rol");
      const t = h("table", "res-cad");
      t.innerHTML = `<thead><tr><th>Tipo</th><th>Cenário</th>${MESES.map(m => `<th class="n">${rot(m)}</th>`).join("")}<th><span class="res-oculto">Remover</span></th></tr></thead>`;
      const tb = h("tbody");
      R.cen.forEach((c, r) => {
        const tr = h("tr"); tr.dataset.cid = c.id;
        const tdT = h("td"), sel = h("select", "res-sel");
        sel.setAttribute("aria-label", "Tipo do cenário");
        sel.innerHTML = Object.entries(TIPOS).map(([k, o]) => `<option value="${k}"${k === c.tipo ? " selected" : ""}>${o.nome}</option>`).join("");
        sel.addEventListener("change", () => { c.tipo = sel.value; mudou(); desenharPremissas(); });
        tdT.append(sel);
        const tdN = h("td"), inN = h("input", "res-nome");
        inN.value = c.nome || ""; inN.setAttribute("aria-label", "Nome do cenário"); inN.dataset.r = r; inN.dataset.i = -1; inN.spellcheck = false;
        inN.addEventListener("input", () => { c.nome = inN.value; mudou(); });
        inN.addEventListener("change", desenharPremissas);
        inN.addEventListener("paste", ev => colarNaCelula(ev, r, -1));
        inN.addEventListener("keydown", ev => andar(ev, r, -1));
        tdN.append(inN);
        tr.append(tdT, tdN);
        MESES.forEach((m, i) => {
          const td = h("td", "n"), inp = h("input", "res-in num");
          const x = c.v[sub][i];
          inp.value = typeof x === "string" ? x : x == null ? "" : n(x, 2);
          inp.inputMode = "decimal"; inp.dataset.k = chave(c.id, sub, i); inp.dataset.r = r; inp.dataset.i = i;
          inp.setAttribute("aria-label", `${nomeDe(c)} · ${SUBN[sub]} ${rot(m)}`);
          inp.addEventListener("input", () => { const v = lerNum(inp.value); c.v[sub][i] = v == null ? null : isNaN(v) ? inp.value.trim() : v; mudou(); });
          inp.addEventListener("blur", () => { const v = c.v[sub][i]; if (typeof v === "number") inp.value = n(v, 2); });
          inp.addEventListener("paste", ev => colarNaCelula(ev, r, i));
          inp.addEventListener("keydown", ev => andar(ev, r, i));
          td.append(inp); tr.append(td);
        });
        const tdX = h("td"), bx = h("button", "res-x", "×"); bx.type = "button"; bx.title = `Remover ${nomeDe(c)}`; bx.setAttribute("aria-label", `Remover ${nomeDe(c)}`);
        bx.disabled = R.cen.length < 2;
        bx.addEventListener("click", () => { R.cen.splice(R.cen.indexOf(c), 1); mudouEstrutura(); });
        tdX.append(bx); tr.append(tdX);
        tb.append(tr);
      });
      t.append(tb);
      // linhas de referência (só leitura): vigente do esperado e deck da BAND
      const tf = h("tfoot");
      const EV = espDe(VIG());
      tf.innerHTML = `<tr class="res-ref-l"><td>Vigente</td><td>${esc(nomeDe(EV))} · ${dataBr(VIG().data)}</td>${MESES.map((m, i) => `<td class="n">${n(vDe(EV, sub, i), 2)}</td>`).join("")}<td></td></tr>` +
        (sub === "SE" && TEM_REF ? `<tr class="res-ref-l"><td>Modelo</td><td>${REF_NOME}</td>${refSE.map(v => `<td class="n">${v == null ? "—" : n(v, 2)}</td>`).join("")}<td></td></tr>` : "");
      t.append(tf);
      box.append(t); corpo1.append(box, colar);
      marcarCelulas();
    }
    function marcarCelulas() {
      const V = VIG();
      corpo1.querySelectorAll(".res-in").forEach(inp => {
        const [cid, s, i] = inp.dataset.k.split("|"), st = val.cel[inp.dataset.k];
        const c = R.cen.find(x => x.id === cid), o = V.cen.find(x => x.id === cid);
        const mud = !o || (c && c.v[s][+i] !== o.v[s][+i]);
        inp.classList.toggle("mud", !!mud); ["erro", "aviso", "vazio"].forEach(k => inp.classList.toggle(k, st === k));
        const ov = o ? o.v[s][+i] : null;
        inp.title = (o ? `Vigente: ${typeof ov === "number" ? rs(ov) : "—"}` : "Cenário novo") + (st === "erro" ? " · não é número" : st === "aviso" ? " · ver avisos" : "");
      });
    }
    function andar(ev, r, i) {
      if (!["ArrowUp", "ArrowDown", "Enter"].includes(ev.key)) return;
      const nr = r + (ev.key === "ArrowUp" ? -1 : 1), alvo = corpo1.querySelector(`[data-r="${nr}"][data-i="${i}"]`);
      if (alvo) { ev.preventDefault(); alvo.focus(); alvo.select(); }
    }
    /** colar do Excel numa célula: tabulação anda para a direita, quebra de linha para baixo */
    function colarNaCelula(ev, r0, i0) {
      const txt = (ev.clipboardData || window.clipboardData).getData("text");
      if (!/[\t\n]/.test(txt.trim())) return;
      ev.preventDefault();
      txt.replace(/\r/g, "").replace(/\n+$/, "").split("\n").forEach((linha, k) => {
        const c = R.cen[r0 + k]; if (!c) return;
        let cols = linha.split("\t"), i = i0;
        if (i0 === -1) { c.nome = cols.shift().trim() || c.nome; i = 0; }
        cols.forEach((t, j) => { if (i + j >= MESES.length) return; const v = lerNum(t); c.v[sub][i + j] = v == null ? null : isNaN(v) ? t.trim() : v; });
      });
      mudouEstrutura(true);
    }
    function aplicarColagem(txt) {
      const linhas = txt.replace(/\r/g, "").split("\n").filter(l => l.trim());
      if (!linhas.length) return "Nada para aplicar.";
      let apl = 0, novos = 0; const ign = [];
      linhas.forEach((l, k) => {
        const cols = l.split("\t");
        if (cols.length < 2 || !isNaN(lerNum(cols[0])) && lerNum(cols[0]) != null) { ign.push(k + 1); return; }
        const nome = cols.shift().trim();
        let c = R.cen.find(x => nomeDe(x).toLowerCase() === nome.toLowerCase());
        if (!c) { c = { id: "c" + Date.now().toString(36) + k, tipo: "sen", nome, prem: "", v: Object.fromEntries(SUBS.map(s => [s.k, MESES.map(() => null)])) }; R.cen.push(c); novos++; }
        cols.slice(0, MESES.length).forEach((t, j) => { const v = lerNum(t); c.v[sub][j] = v == null ? null : isNaN(v) ? t.trim() : v; });
        apl++;
      });
      return apl ? `${apl} ${apl === 1 ? "linha aplicada" : "linhas aplicadas"} em ${SUBN[sub]}${novos ? `, ${novos} ${novos === 1 ? "cenário novo" : "cenários novos"}` : ""}${ign.length ? `; ignoradas (sem nome): ${ign.join(", ")}` : ""}.` : "Nenhuma linha com nome e valores separados por tabulação.";
    }
    function mudou() { guardarRascunho(); val = validar(R.cen); marcarCelulas(); refazerDec(); desenharAvisos(); }
    function mudouEstrutura(manterColar) { const aberto = manterColar && corpo1.querySelector(".res-colar") && !corpo1.querySelector(".res-colar").hidden; guardarRascunho(); val = validar(R.cen); desenharTabela(); if (aberto) { corpo1.querySelector(".res-colar").hidden = false; } desenharPremissas(); refazerDec(); desenharAvisos(); }

    // ---- RES-2 · validação e salvar
    const p2 = painel(g, { cod: "RES-2", titulo: "Validar e salvar versão", tam: "s", ajuda: "validacao", fonte: SERVIDOR });
    const avisosBox = h("div", "res-avisos"); p2.corpo.append(avisosBox);
    function desenharAvisos() {
      avisosBox.replaceChildren();
      if (!val.lista.length) { avisosBox.append(h("p", "res-ok", "✓ Sem erros nem avisos.")); return; }
      const ul = h("ul", "res-lista-av");
      val.lista.slice(0, 8).forEach(a => {
        const li = h("li", "res-av-" + a.nivel, `<span class="res-av-n">${a.nivel === "erro" ? "erro" : "aviso"}</span><span>${a.txt}</span>`);
        if (a.k) { li.tabIndex = 0; li.title = "Ir para a célula"; const ir = () => irCelula(a.k); li.addEventListener("click", ir); li.addEventListener("keydown", ev => { if (ev.key === "Enter") ir(); }); }
        ul.append(li);
      });
      avisosBox.append(ul);
      if (val.lista.length > 8) avisosBox.append(h("p", "leg", `e mais ${val.lista.length - 8}.`));
    }
    function irCelula(k) {
      const s = k.split("|")[1];
      if (s !== sub) { sub = s; LS.gravar("subCad", s); p1.acoes.querySelectorAll(".abas button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === s))); desenharTabela(); }
      const inp = corpo1.querySelector(`.res-in[data-k="${CSS.escape(k)}"]`); if (inp) { inp.focus(); inp.select(); }
    }
    desenharAvisos();
    const form = h("form", "res-form");
    form.innerHTML = `<label>Autor<input name="autor" maxlength="60" value="${esc(LS.ler("autor", "Research"))}"></label>
      <label>O que mudou<textarea name="nota" rows="3" maxlength="400" placeholder="Ex.: ENA de dezembro revista para baixo; esperado do SE/CO sobe."></textarea></label>
      <div class="res-barra"><button type="submit" class="res-btn prim">Salvar como nova versão</button><button type="button" class="res-btn" data-acao="descartar">Descartar rascunho</button></div>
      <p class="res-r res-msg" aria-live="polite"></p>`;
    p2.corpo.append(form);
    msg = form.querySelector(".res-msg");
    msg.textContent = `Data e hora entram ao salvar. Vigente: ${rotVer(VIG())}.`;
    form.addEventListener("submit", ev => {
      ev.preventDefault();
      if (!alteracoes(R.cen).total) { msg.textContent = "Nada mudou em relação à versão vigente."; return; }
      const r = salvarVersao(form.autor.value, form.nota.value);
      if (!r.ok) { msg.textContent = r.msg; msg.className = "res-r res-msg desce"; return; }
      Mesa.atualizarSinal();
      const area2 = area; area2.replaceChildren(); telaCAD(area2);
      Mesa.inspecionar("Versão salva", el => {
        el.append(h("p", null, `Versão <b>${rotVer(r.versao)}</b> salva${r.aviso ? ` com ${r.aviso} ${r.aviso === 1 ? "aviso" : "avisos"}` : ""}. Ela passa a ser a vigente: sinal, resumo da MESA e alertas já usam os novos valores.`));
        el.append(h("p", "leg", esc(r.versao.nota)));
        el.append(h("p", "leg", SERVIDOR));
        const a = h("a", "res-link", "Ver o que mudou (VER) ›"); a.href = `#RES-${T("VER")}`; el.append(a);
      });
    });
    form.querySelector('[data-acao="descartar"]').addEventListener("click", () => { descartarRascunho(); area.replaceChildren(); telaCAD(area); });
    if (VERS.some(v => v.origem === "navegador")) {
      const b = h("button", "res-btn res-btn-disc", "Apagar versões salvas e voltar ao exemplo"); b.type = "button";
      b.addEventListener("click", () => { restaurarExemplo(); Mesa.atualizarSinal(); area.replaceChildren(); telaCAD(area); });
      p2.corpo.append(b);
    }

    // ---- RES-3 · premissas
    const p3 = painel(g, { cod: "RES-3", titulo: "Premissas de cada cenário", unidade: "valem para os quatro submercados", tam: "full", ajuda: "tipos" });
    function desenharPremissas() {
      p3.corpo.replaceChildren();
      const gr = h("div", "res-prems");
      ordenar(R.cen).forEach(c => {
        const b = h("label", "res-prem");
        b.innerHTML = `<span class="res-prem-c"><i class="res-sw" style="background:${corDe(c, { cen: R.cen })}"></i><b>${esc(nomeDe(c))}</b> <span class="res-tipo">${TIPOS[c.tipo].nome}</span></span>`;
        const ta = h("textarea"); ta.rows = 3; ta.maxLength = 400; ta.value = c.prem || ""; ta.placeholder = "Premissas em uma ou duas linhas (ENA, carga, deck, térmicas…)";
        ta.addEventListener("input", () => { c.prem = ta.value; guardarRascunho(); refazerDec(); });
        b.append(ta); gr.append(b);
      });
      p3.corpo.append(gr);
    }
    desenharTabela(); desenharPremissas();
  }

  // ================================================================================================
  // tela 2 · CMP Comparação
  // ================================================================================================
  function telaCMP(area) {
    const V = VIG(), ant = antDe(V), sub = subPref("subCmp");
    const selLS = LS.ler("mesCmp", null);
    let sel = selLS == null ? null : Math.min(MESES.length - 1, Math.max(0, +selLS || 0));
    const E = espDe(V), Su = doTipo(V, "sup"), In = doTipo(V, "inf"), sens = V.cen.filter(c => c.tipo === "sen");
    const redesenhar = () => { area.replaceChildren(); telaCMP(area); };
    const e0 = vDe(E, sub, 0), d0 = delta(E, ant, sub, 0);
    const maiorSen = sens.map(c => ({ c, d: vDe(c, sub, 0) != null && e0 != null ? vDe(c, sub, 0) - e0 : null })).filter(x => x.d != null).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    const dec = [
      { r: `Esperado ${SUBN[sub]} ${rot(MESES[0])}`, v: rs(e0, 2), d: ant ? `${dTxt(d0, 2)} contra ${dataBr(ant.data)}` : "primeira versão", tom: d0 ? tom(d0) : "", principal: true },
      { r: `Faixa ${rot(MESES[0])}`, v: Su && In ? `${n(vDe(In, sub, 0))}–${n(vDe(Su, sub, 0))}` : "—", d: Su && In ? `inferior a superior · amplitude ${rs(vDe(Su, sub, 0) - vDe(In, sub, 0), 0)}` : "sem superior ou inferior" },
      { r: `Maior sensibilidade ${rot(MESES[0])}`, v: maiorSen ? srs(maiorSen.d, 0) : "—", d: maiorSen ? `${esc(nomeDe(maiorSen.c))} contra o esperado` : "sem sensibilidades" },
    ];
    if (sub === "SE" && TEM_REF && refSE[0] != null && e0 != null) dec.push({ r: `Esperado − deck ${rot(MESES[0])}`, v: srs(e0 - refSE[0], 0), d: `${REF_NOME} ${rs(refSE[0], 0)}` });
    else dec.push({ r: "Versão", v: `${V.horizonte} ${dataBr(V.data)}`, d: `${esc(V.autor)} · ${V.cen.length} cenários` });
    seletorHorizonte(area, redesenhar);
    Mesa.decisao(area, dec);
    const g = Mesa.grade(area);

    const p1 = painel(g, { cod: "RES-4", titulo: `Leque dos cenários · ${SUBN[sub]}`, unidade: "R$/MWh", tam: "xl", ajuda: "comparacao",
      leg: `Clique num mês para ver todos os cenários e a diferença para a versão anterior no inspetor. Valores sobre o esperado em R$/MWh.`,
      fonte: `Versão ${rotVer(V)}. ${FICT}` });
    abasSub(p1, sub, v => { LS.gravar("subCmp", v); redesenhar(); });
    p1.corpo.classList.add("res-leque");
    p1.corpo.insertAdjacentHTML("beforeend", legendaLeque(V, sub));
    let tabMes = null;
    const marcarLinha = i => {
      if (tabMes) tabMes.querySelectorAll("tbody tr").forEach((tr, k) => tr.classList.toggle("res-tr-sel", k === i));
      p1.corpo.querySelectorAll(".res-col").forEach((r, k) => r.classList.toggle("selecionado", k === i));
    };
    const o = { ver: V, sub, sel, aoSel: i => { sel = i; LS.gravar("mesCmp", String(i)); marcarLinha(i); } };
    grafico(p1.corpo, (svg, W, H) => leque(svg, W, H, o), "alto");

    const p2 = painel(g, { cod: "RES-5", titulo: `Mês a mês · ${SUBN[sub]}`, unidade: "R$/MWh", tam: "s", ajuda: "comparacao",
      leg: ant ? `Δ: esperado contra a versão de ${dataBr(ant.data)}.` : "Primeira versão: sem Δ." });
    const cols = [{ t: "Mês" }, { t: "Esp.", n: true }, { t: "Δ", n: true }, { t: "Inf.–Sup.", n: true }];
    if (sub === "SE" && TEM_REF) cols.push({ t: "− deck", n: true });
    tabMes = QC.tabela(p2.corpo, cols, MESES.map((m, i) => {
      const e = vDe(E, sub, i), L = [rot(m), n(e), dl(delta(E, ant, sub, i)), Su && In ? `${n(vDe(In, sub, i))}–${n(vDe(Su, sub, i))}` : "—"];
      if (sub === "SE" && TEM_REF) L.push(refSE[i] == null || e == null ? "—" : sn(e - refSE[i]));
      return L;
    }), "densa res-tab-mes");
    tabMes.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `${SUBN[sub]} · ${rot(MESES[i])}`, el => { o.sel = i; sel = i; LS.gravar("mesCmp", String(i)); marcarLinha(i); inspMes(V, sub, i)(el); }));
    marcarLinha(sel);
    if (sub !== "SE" || !TEM_REF) p2.corpo.append(h("p", "leg", sub === "SE" ? "Sem referência do modelo." : `Referência do modelo só no SE/CO (${REF_NOME}).`));

    // descolamento contra o SE/CO, por cenário
    ["S", "NE", "N"].forEach((k, j) => {
      const p = painel(g, { cod: "RES-" + (6 + j), titulo: `${SUBN[k]} − SE/CO por cenário`, unidade: "R$/MWh", tam: "m", ajuda: "descolamento",
        leg: j === 0 ? "Diferença de preço do submercado contra o SE/CO no mesmo cenário e mês. ⌊ = no piso." : null });
      const box = QC.tabela(p.corpo, [{ t: "Cen." }, ...MESES.map(m => ({ t: rot(m).replace("/", "<small>/") + "</small>", n: true }))],
        ordenar(V.cen).map(c => [`<span title="${esc(nomeDe(c))}"><i class="res-sw" style="background:${corDe(c, V)}"></i>${esc(curto(c, V))}</span>`,
          ...MESES.map((m, i) => { const a = vDe(c, k, i), b = vDe(c, "SE", i); if (a == null || b == null) return "—"; return `<span class="${a <= PISO + 0.005 ? "no-piso" : ""}" title="${esc(nomeDe(c))} · ${SUBN[k]} ${rs(a)}${a <= PISO + 0.005 ? " (piso)" : ""}">${a <= PISO + 0.005 ? "⌊" : ""}${sn(Math.round(a - b))}</span>`; })]), "densa res-tab-desc");
      box.querySelectorAll("tbody tr").forEach((tr, r) => { const c = ordenar(V.cen)[r]; if (c.tipo === "esp") tr.classList.add("destaque"); });
      if (j === 2 && sens.length) p.corpo.append(h("p", "leg", sens.map(c => `${esc(curto(c, V))} ${esc(nomeDe(c))}`).join(" · ")));
    });
    if (sel != null) {
      // volta com o mês escolhido aberto no inspetor (ex.: vindo do resumo da MESA ou do inspetor)
      const tr = tabMes.querySelectorAll("tbody tr")[sel];
      if (tr && LS.ler("abrirCmp", "") === "1") { LS.apagar("abrirCmp"); tr.click(); }
    }
  }

  // ================================================================================================
  // tela 4 · VER Versões
  // ================================================================================================
  function telaVER(area) {
    const V = VIG(), ant = antDe(V), mud = mudancas(ant, V);
    let A = verPorId(LS.ler("verA", "")) || ant || V, B = verPorId(LS.ler("verB", "")) || V, sub = subPref("subVer");
    seletorHorizonte(area, () => { area.replaceChildren(); telaVER(area); });
    Mesa.decisao(area, [
      { r: "Versão vigente", v: `${V.horizonte} ${dataBr(V.data)}`, d: `${esc(V.autor)} · ${V.cen.length} cenários${V.origem === "navegador" ? " · salva neste navegador" : " · exemplo"}`, principal: true },
      { r: "Maior revisão do esperado", v: mud.maior ? `${SUBN[mud.maior.sub]} ${rot(MESES[mud.maior.i])} ${sn(mud.maior.d, 0)}` : "—", d: mud.maior && ant ? `R$ ${n(mud.maior.de, 0)} → ${n(mud.maior.para, 0)} contra ${dataBr(ant.data)}` : "primeira versão", tom: mud.maior ? tom(mud.maior.d) : "" },
      { r: "Versões", v: String(VERS.length), d: `desde ${dataBr(VERS[0].data)} · semanais` },
    ]);
    const g = Mesa.grade(area);

    const p1 = painel(g, { cod: "RES-9", titulo: "Versões publicadas", tam: "l", ajuda: "versoes",
      leg: "Clique numa versão para compará-la com a anterior e ver os detalhes no inspetor.", fonte: `${FICT} ${SERVIDOR}` });
    const lista = QC.tabela(p1.corpo, [{ t: "Data" }, { t: "Autor" }, { t: "Cen.", n: true }, { t: "O que mudou" }],
      VERS.slice().reverse().map(v => [`<span class="num">${dataHoraBr(v.data)}</span><b class="res-tag res-tag-hor">${v.horizonte}</b>${v === V ? ' <b class="res-tag">vigente</b>' : ""}${v.origem === "navegador" ? ' <b class="res-tag res-tag-nav">navegador</b>' : ""}`,
        esc(v.autor), String(v.cen.length), `${esc(v.nota)}<br><span class="res-r">${esc(mudancas(antDe(v), v).txt)}</span>`]), "densa res-tab-ver");
    lista.querySelectorAll("tbody tr").forEach((tr, k) => {
      const v = VERS[VERS.length - 1 - k];
      if (v === B) tr.classList.add("res-tr-sel");
      Mesa.alvo(tr, verLP(v), el => {
        B = v; A = antDe(v) || v; LS.gravar("verA", A.id); LS.gravar("verB", B.id);
        lista.querySelectorAll("tbody tr").forEach(x => x.classList.toggle("res-tr-sel", x === tr));
        desenharDif(); detalheVersao(el, v);
      });
    });

    const p2 = painel(g, { cod: "RES-10", titulo: "Diferença entre duas versões", unidade: "R$/MWh", tam: "l", ajuda: "versoes" });
    abasSub(p2, sub, v => { sub = v; LS.gravar("subVer", v); desenharDif(); desenharEvol(); });
    const sels = h("div", "res-barra");
    const opc = sel => VERS.slice().reverse().map(v => `<option value="${esc(v.id)}"${v === sel ? " selected" : ""}>${dataHoraBr(v.data)} · ${esc(v.autor)}</option>`).join("");
    sels.innerHTML = `<label class="res-r">De <select class="res-sel" data-q="A">${opc(A)}</select></label><label class="res-r">para <select class="res-sel" data-q="B">${opc(B)}</select></label>`;
    sels.querySelectorAll("select").forEach(s => s.addEventListener("change", () => { const v = verPorId(s.value); if (s.dataset.q === "A") A = v; else B = v; LS.gravar("verA", A.id); LS.gravar("verB", B.id); desenharDif(); }));
    p2.corpo.append(sels);
    const difBox = h("div", "res-dif"); p2.corpo.append(difBox);
    function desenharDif() {
      sels.querySelector('[data-q="A"]').value = A.id; sels.querySelector('[data-q="B"]').value = B.id;
      difBox.replaceChildren();
      const linhasB = ordenar(B.cen).map(c => ({ c, a: par(c, A) }));
      const fora = A.cen.filter(c => !par(c, B));
      const corpo = [
        ...linhasB.map(({ c, a }) => [`<span title="${esc(nomeDe(c))}">${esc(nomeDe(c))}</span>${a ? "" : ' <b class="res-tag">novo</b>'}`,
          ...MESES.map((m, i) => { const vb = vDe(c, sub, i), va = vDe(a, sub, i); return `<span class="num">${n(vb)}</span>${a && va != null && vb != null ? dl(vb - va) : ""}`; })]),
        ...fora.map(c => [`<s>${esc(nomeDe(c))}</s> <b class="res-tag">removido</b>`, ...MESES.map((m, i) => `<s class="res-r">${n(vDe(c, sub, i))}</s>`)]),
      ];
      const t = QC.tabela(difBox, [{ t: "Cenário" }, ...MESES.map(m => ({ t: rot(m), n: true }))], corpo, "densa res-tab-dif");
      t.querySelectorAll("tbody tr").forEach((tr, r) => { if (linhasB[r] && linhasB[r].c.tipo === "esp") tr.classList.add("destaque"); });
      const m = mudancas(A, B);
      difBox.append(h("p", "leg", A === B ? "Mesma versão nos dois lados: escolha outra para ver a diferença." :
        `Valores de ${dataBr(B.data)}; ▲▼ = ${dataBr(B.data)} − ${dataBr(A.data)} em R$/MWh. Nos quatro submercados: ${esc(m.txt)}${m.maior && Math.abs(m.maior.d) >= 0.5 ? ` (R$ ${n(m.maior.de, 0)} → ${n(m.maior.para, 0)})` : ""}.`));
    }
    desenharDif();

    const p3 = painel(g, { cod: "RES-11", titulo: "Revisões do esperado, versão a versão", unidade: "R$/MWh", tam: "full", ajuda: "versoes",
      leg: "Cada barra é quanto o esperado mudou de uma versão para a seguinte, no mês e no submercado escolhido (acima de zero: subiu). A vigente em âmbar." });
    const evolBox = h("div"); p3.corpo.append(evolBox);
    function desenharEvol() {
      evolBox.replaceChildren();
      const pares = VERS.slice(1).map((v, j) => ({ de: VERS[j], para: v })).slice(-5);
      if (!pares.length) { evolBox.append(h("p", "leg", "Só há uma versão.")); return; }
      const tons = ["var(--res-v1)", "var(--res-v2)", "var(--res-v3)", "var(--res-v4)"];
      const series = pares.map((p, j) => ({ nome: `${dataBr(p.de.data).slice(0, 5)} → ${dataBr(p.para.data).slice(0, 5)}`, cor: p.para === V ? "var(--t-ambar)" : tons[Math.max(0, tons.length - (pares.length - 1) + j)] || tons[0],
        v: MESES.map((_, i) => { const d = delta(espDe(p.para), p.de, sub, i); return d == null ? 0 : d; }) }));
      evolBox.insertAdjacentHTML("beforeend", QC.legenda(series.map(x => [x.cor, x.nome])) );
      grafico(evolBox, (svg, W, H) => barras(svg, W, H, { cats: MESES.map(rot), series, fmt: v => srs(v, 2) }), "baixo");
    }
    desenharEvol();
  }
  function detalheVersao(el, v) {
    const ant = antDe(v);
    QC.pares(el, [["Data", dataHoraBr(v.data)], ["Autor", esc(v.autor)], ["Origem", v.origem === "navegador" ? "salva neste navegador" : "exemplo fictício"], ["Anterior", ant ? dataBr(ant.data) : "—"]]);
    el.append(h("p", null, esc(v.nota)));
    el.append(h("p", "leg", esc(mudancas(ant, v).txt)));
    el.append(h("h3", null, `Esperado · R$/MWh`));
    const E = espDe(v);
    QC.tabela(el, [{ t: "Mês" }, ...SUBS.map(s => ({ t: s.nome, n: true }))], MESES.map((m, i) => [rot(m), ...SUBS.map(s => `${n(vDe(E, s.k, i))}${ant ? dl(delta(E, ant, s.k, i)) : ""}`)]), "densa res-tab-insp");
    el.append(h("h3", null, "Cenários e premissas"));
    QC.pares(el, ordenar(v.cen).map(c => [`${esc(curto(c, v))}`, `<b>${esc(nomeDe(c))}</b>${c.prem ? ` · ${esc(c.prem)}` : ""}`]), "premissas res-prem-insp");
  }

  // ================================================================================================
  // tela 4 · MET Como usar
  // ================================================================================================
  const SECOES = [
    { id: "reuniao", titulo: "Morning Call (tela REU)", html: `<p>A rodada vigente em uma tela, para a reunião, sempre com os quatro submercados de uma vez. RES-12 junta ENA (à esquerda) e preço (à direita) numa tabela só, com o preço de mercado digitado na própria tela,, com cada mês sempre na mesma coluna: o esperado dos quatro submercados e, embaixo, o SE/CO em todos os cenários contra o mercado. RES-13 traz o armazenamento de partida, a mesma data do ano anterior e o fim do período úmido; RES-14, o tipo e a data de cada cenário; RES-15, as trajetórias. O detalhe fica no inspetor; cadastro, comparação e versões, nas outras telas.</p>
      <p><b>Mercado</b>: curva da BBCE no SE/CO (a mesma do MKT). Meses que não são negociados sozinhos saem dos produtos maiores: mar/27 = 3 × 1T27 − jan − fev; abr e mai/27 = 2T27. <b>Data do cenário</b>: a rodada em que os valores dele mudaram pela última vez; uma sensibilidade repetida de uma rodada anterior aparece com a data antiga, em cinza.</p>
      <p class="leg">${FICT} ENA, armazenamento e curva de mercado também são fictícios; no app, ENA e partida virão do cadastro do research e o histórico, do ONS.</p>` },
    { id: "reuniao-ear", titulo: "Armazenamento (RES-16)", html: `<p>Armazenamento de fim de mês em % da EARmáx, de jan/26 a mai/27, por submercado. Até novembro, o observado; o ponto em 30/11 é a <b>partida</b> da rodada.</p>
      <p><b>Faixa fraca, ao fundo</b>: mínimo a máximo de 2001 a 2025 em cada mês do ano. <b>Recomposição</b> (faixa forte e linha pontilhada): a partida somada à variação de novembro até cada mês seguinte observada em cada ano de ${REC_ANOS[0]} a ${REC_ANOS[REC_ANOS.length - 1]}; mostra a faixa p10–p90 e a média, isto é, onde o armazenamento chegaria se os próximos meses se comportassem como nos últimos anos. <b>Cenários</b>: a trajetória que resulta da ENA de cada um (aqui, uma regra simples de exemplo: a variação média do mês mais 0,12 p.p. por p.p. de ENA acima ou abaixo da MLT).</p>` },
    { id: "resumo", titulo: "Em uma tela", html: `<p>A RES guarda os cenários de PLD que o time de research da mesa monta toda semana: o PLD médio mensal, em R$/MWh, de cada submercado (SE/CO, S, NE e N) nos próximos seis meses (M+1 a M+6, hoje ${rot(MESES[0])} a ${rot(MESES[5])}). Cada publicação é uma <b>versão</b>, com data, autor e uma nota do que mudou; a última é a vigente, que alimenta o sinal, o resumo da MESA e os alertas.</p>
      <p>A RES não calcula bandeira nem roda modelo: guarda e compara o que o research cadastrou. A única referência externa é o PLD do deck que a BAND usa, no SE/CO.</p>
      <p class="leg">${FICT} Premissas do laboratório ainda não confirmadas com o research: PLD médio mensal por submercado, horizonte de M+1 a M+6, cadastro feito pelo próprio research.</p>` },
    { id: "horizonte", titulo: "LP e, depois, CP", html: `<p><b>LP</b> quer dizer <b>longo prazo</b>: os cenários que o research monta para os próximos meses (hoje M+1 a M+6, ${rot(MESES[0])} a ${rot(MESES[5])}), com PLD médio mensal por submercado. Toda versão tem o horizonte gravado (as do exemplo e as salvas aqui são LP; versões salvas antes sem esse campo contam como LP), e o sinal, a fita e o resumo da MESA levam o prefixo “LP”.</p>
      <p><b>CP</b> (curto prazo, cenários por revisão do DECOMP) poderá entrar depois, com as próprias versões. Quando houver versões de mais de um horizonte, um seletor LP/CP aparece no topo das telas CAD, CMP e VER; com só LP, como hoje, ele fica escondido.</p>` },
    { id: "tipos", titulo: "Tipos de cenário", html: `<ul>
      <li><b>Esperado</b>: o cenário central do research, o mais provável. É o que aparece no sinal (“LP Esp. SE ${rot(MESES[0])}”) e em destaque nos gráficos. Deve haver um só.</li>
      <li><b>Superior</b> e <b>Inferior</b>: os limites de cima e de baixo que o research considera plausíveis (ex.: seco e úmido). Formam a faixa clara do leque. Espera-se inferior ≤ esperado ≤ superior em todo mês e submercado; quando não acontece, a tela avisa, sem impedir.</li>
      <li><b>Sensibilidade</b>: o esperado com uma premissa trocada, para medir o efeito dela (ex.: “Seca no SE −10% ENA”, “Carga +3%”). Pode haver quantas forem precisas; aparecem tracejadas e, nas tabelas estreitas, como S1, S2…</li></ul>
      <p>As <b>premissas</b> (painel RES-3) são texto curto por cenário: ENA, carga, deck, térmicas. Valem para os quatro submercados.</p>` },
    { id: "cadastro", titulo: "Como cadastrar", html: `<ol>
      <li>Na tela <b>CAD</b>, escolha o submercado nas abas do painel RES-1. A tabela tem um cenário por linha e um mês por coluna.</li>
      <li>Digite os valores em R$/MWh, com vírgula (186,40) ou ponto (186.40). Fundo âmbar mostra o que mudou em relação à versão vigente; passe o mouse para ver o valor vigente.</li>
      <li>“+ Sensibilidade” cria uma linha que já parte dos valores do esperado, nos quatro submercados; “+ Cenário vazio” cria uma linha em branco. O × remove a linha.</li>
      <li>Tipo e nome ficam na própria linha; as premissas, no painel RES-3.</li>
      <li>Em RES-2, informe o autor e o que mudou e clique em <b>Salvar como nova versão</b>. A data e a hora entram sozinhas. Sem nota, a tela escreve uma com a maior revisão do esperado.</li></ol>
      <p>O rascunho fica guardado enquanto se edita (pode fechar a página e voltar). “Descartar rascunho” volta à vigente. ${SERVIDOR}</p>` },
    { id: "colar", titulo: "Colar do Excel", html: `<p>Duas formas:</p><ul>
      <li><b>Numa célula</b>: copie uma ou mais linhas de valores no Excel e cole na célula do primeiro mês. A tabulação anda para a direita e cada linha do Excel desce um cenário. Colar no nome com a linha inteira (nome + valores) troca o nome e preenche a partir de ${rot(MESES[0])}.</li>
      <li><b>Colar do Excel…</b>: cole várias linhas com o nome na primeira coluna e até seis valores. O nome encontra o cenário (sem diferenciar maiúsculas); nome novo vira sensibilidade. Vale para o submercado aberto.</li></ul>` },
    { id: "validacao", titulo: "Validação", html: `<ul>
      <li><b>Erro</b> (borda vermelha): texto que não é número. É o único que impede salvar.</li>
      <li><b>Aviso</b> (borda tracejada): valor fora do piso e do teto do PLD (${rs(PISO)} e ${rs(TETO)}, os do Pricing, fictícios); inferior acima do esperado ou esperado acima do superior no mesmo mês e submercado; nomes vazios ou repetidos; mais de um esperado, superior ou inferior.</li>
      <li><b>Vazia</b> (borda pontilhada): o cenário fica sem valor naquele mês; o gráfico interrompe a linha.</li></ul>
      <p>Clique num aviso de RES-2 para ir à célula, mesmo que esteja em outro submercado.</p>` },
    { id: "comparacao", titulo: "Como ler a comparação", html: `<p>O <b>leque</b> (RES-4) mostra, para o submercado escolhido: o esperado em linha âmbar grossa, com o valor em cada mês; a faixa clara entre o inferior e o superior; as sensibilidades tracejadas, cada uma numa cor; o esperado da versão anterior em âmbar pontilhado (quanto mudou de uma semana para outra) e, no SE/CO, o PLD do deck da BAND em traço e ponto. A linha pontilhada cinza é o piso, quando ele entra na escala.</p>
      <p>Clique num mês (no gráfico ou na tabela RES-5) para ver no inspetor todos os cenários daquele mês, a diferença de cada um para a versão anterior (Δ ant.) e para o esperado (− Esp.), o esperado nos quatro submercados e as premissas.</p>` },
    { id: "descolamento", titulo: "Descolamento contra o SE/CO", html: `<p>Os painéis RES-6 a RES-8 mostram, em cada cenário, a diferença entre o PLD do S, do NE e do N e o do SE/CO no mesmo mês. No período úmido o NE e o N costumam ficar abaixo do SE/CO; “⌊” marca o mês em que o submercado está no piso, quando o descolamento passa a depender só do SE/CO. Útil para conferir os cenários com a NEN (Pricing Descolamento), que precifica esse descolamento.</p>` },
    { id: "versoes", titulo: "Versões e o que mudou", html: `<p>Toda vez que se salva, nasce uma versão nova; as anteriores não mudam. A tela <b>VER</b> lista as versões com data, autor, a nota do research e um resumo automático (maior revisão do esperado, cenários novos e removidos).</p>
      <p>Em RES-10, escolha duas versões (“de” e “para”) e o submercado: cada célula mostra o valor da versão mais nova e a diferença (▲ subiu, ▼ caiu, = igual). Cenários são casados pelo identificador, depois pelo nome e, para esperado, superior e inferior, pelo tipo. RES-11 mostra, em barras, quanto o esperado mudou de cada versão para a seguinte, mês a mês: barras do mesmo lado em semanas seguidas indicam uma tendência de revisão.</p>` },
    { id: "referencia", titulo: "Referência do modelo", html: `<p>No SE/CO, a referência é o PLD mensal do deck que a BAND usa (${REF_NOME}, dados fictícios da página), nos meses em comum com o horizonte da RES (${MESES.filter((m, i) => refSE[i] != null).map(rot).join(", ") || "nenhum"}). Não há bandeira aqui: a RES não calcula bandeira para os cenários do research. Nos outros submercados não há referência carregada na página.</p>` },
    { id: "laboratorio", titulo: "Neste laboratório", html: `<ul>
      <li>Os quatro cenários de exemplo (${EXEMPLO.length} versões, de ${dataBr(EXEMPLO[0].data)} a ${dataBr(EXEMPLO[EXEMPLO.length - 1].data)}) são fictícios, gerados com semente fixa; o autor é genérico (“Research”).</li>
      <li>O cadastro e as versões salvas ficam no <code>localStorage</code> deste navegador (chaves <code>mesa.res.*</code>); “Apagar versões salvas e voltar ao exemplo” limpa tudo. No app, isso irá para o servidor, com autor (o usuário logado) e histórico.</li>
      <li>A confirmar com o research: unidade e granularidade (PLD médio mensal por submercado), horizonte (M+1 a M+6), quem cadastra, quais sensibilidades são fixas e se as versões são semanais.</li></ul>` },
  ];

  // ================================================================================================
  // MESA: sinal, fita, resumo e alertas
  // ================================================================================================
  function sinal() {
    const V = VIG(), ant = antDe(V), E = espDe(V), x = vDe(E, "SE", 0), d = delta(E, ant, "SE", 0), Su = doTipo(V, "sup"), In = doTipo(V, "inf");
    return { v: `${HOR} Esp. SE ${rot(MESES[0])} ${rs(x, 0)}`, d: `${ant ? `${dTxt(d, 0)} vs ${dataBr(ant.data).slice(0, 5)}` : "primeira versão"}${Su && In ? ` · faixa ${n(vDe(In, "SE", 0))}–${n(vDe(Su, "SE", 0))}` : ""}`, tom: "neutro", dnum: d == null ? undefined : d };
  }
  function fita() {
    const V = VIG(), ant = antDe(V), E = espDe(V), Su = doTipo(V, "sup"), In = doTipo(V, "inf"), L = [];
    const ne = vDe(E, "NE", 0), dne = delta(E, ant, "NE", 0);
    if (ne != null) L.push({ r: `RES ${HOR} Esp. NE ${rot(MESES[0])}`, v: n(ne, 0), d: dne == null ? undefined : dne });
    if (Su && In) L.push({ r: `RES ${HOR} faixa SE ${rot(MESES[0])}`, v: `${n(vDe(In, "SE", 0))}–${n(vDe(Su, "SE", 0))}` });
    return L;
  }
  function resumo(el) {
    const box = h("div", "res-resumo"); el.append(box);
    let sub = subPref("subRes");
    const desenhar = () => {
      box.replaceChildren();
      const V = VIG(), ant = antDe(V), E = espDe(V), cs = ordenar(V.cen);
      const topo = h("div", "res-rtopo", `<span>Versão <b>${V.horizonte} ${dataBr(V.data)}</b> · ${esc(V.autor)}${ant ? ` · ▲▼ vs ${dataBr(ant.data).slice(0, 5)}` : ""}</span>`);
      const ab = h("div", "abas res-abas-mini"); ab.setAttribute("role", "group"); ab.setAttribute("aria-label", "Submercado");
      SUBS.forEach(s => { const b = h("button", null, s.k === "SE" ? "SE" : s.nome); b.type = "button"; b.title = s.nome; b.setAttribute("aria-pressed", String(s.k === sub)); b.addEventListener("click", () => { sub = s.k; LS.gravar("subRes", sub); desenhar(); }); ab.append(b); });
      topo.append(ab); box.append(topo);
      const ref = sub === "SE" && TEM_REF;
      const t = h("table", "res-rt");
      t.innerHTML = `<thead><tr><th>R$/MWh</th>${MESES.map(m => `<th class="n">${rot(m)}</th>`).join("")}</tr></thead><tbody>` +
        cs.map(c => `<tr class="${c === E ? "destaque" : ""}"><td title="${esc(nomeDe(c))}"><i class="res-sw" style="background:${corDe(c, V)}"></i>${esc(curto(c, V))}</td>${MESES.map((m, i) => `<td class="n" data-i="${i}"><span class="num">${n(vDe(c, sub, i))}</span>${ant ? dl(delta(c, ant, sub, i)) : ""}</td>`).join("")}</tr>`).join("") +
        (ref ? `<tr class="res-ref-l"><td title="${REF_NOME}">Deck</td>${refSE.map(v => `<td class="n"><span class="num">${v == null ? "—" : n(v)}</span></td>`).join("")}</tr>` : "") + "</tbody>";
      box.append(t);
      t.querySelectorAll("th.n").forEach((th, i) => Mesa.alvo(th, `${SUBN[sub]} · ${rot(MESES[i])}`, inspMes(V, sub, i)));
      t.querySelectorAll("td[data-i]").forEach(td => { const i = +td.dataset.i; Mesa.alvo(td, `${SUBN[sub]} · ${rot(MESES[i])}`, inspMes(V, sub, i)); td.tabIndex = -1; });
      const sens = V.cen.filter(c => c.tipo === "sen"), e0 = vDe(E, sub, 0), Su = doTipo(V, "sup"), In = doTipo(V, "inf");
      const lin = [];
      if (Su && In && e0 != null) lin.push(`<b>${SUBN[sub]} ${rot(MESES[0])}</b> esperado ${rs(e0, 0)} na faixa ${n(vDe(In, sub, 0))}–${n(vDe(Su, sub, 0))}${ref && refSE[0] != null ? ` · ${srs(e0 - refSE[0], 0)} sobre o deck` : ""}`);
      if (sens.length) lin.push(sens.map(c => `<b>${esc(curto(c, V))}</b> ${esc(nomeDe(c))}`).join(" · "));
      lin.push(`Clique num mês para o detalhe · ${ref ? "Deck = PLD do deck da BAND · " : ""}exemplo fictício`);
      lin.forEach(x => box.append(h("p", "res-rlin", x)));
    };
    desenhar();
  }
  function alertas() {
    const V = VIG(), ant = antDe(V), L = [], quando = V.data.slice(0, 16);
    const hoje = quando.slice(0, 10) === agora().slice(0, 10);
    L.push({ quando, tela: T("VER"), nivel: hoje ? "alto" : "normal", texto: `${hoje ? `Nova versão ${V.horizonte} publicada hoje` : `${verLP(V)} vigente`} (${esc(V.autor)}): ${V.cen.length} cenários · ${esc(mudancas(ant, V).txt)}` });
    const inc = foraDeOrdem(V);
    if (inc.length) L.push({ quando, tela: T("CAD"), nivel: "alto", texto: `${inc[0]}${inc.length > 1 ? ` e mais ${inc.length - 1}` : ""}: confira com o research` });
    const m = mudancas(ant, V).maior;
    if (ant && m && Math.abs(m.d) >= 3) L.push({ quando, tela: T("CMP"), nivel: Math.abs(m.d) >= 15 ? "alto" : "normal", texto: `Maior revisão do esperado ${V.horizonte}: ${SUBN[m.sub]} ${rot(MESES[m.i])} ${sn(m.d, 0)} (R$ ${n(m.de, 0)} → ${n(m.para, 0)})` });
    else if (TEM_REF) {
      const E = espDe(V), i = refSE.findIndex(v => v != null), e = vDe(E, "SE", i);
      if (i >= 0 && e != null) L.push({ quando, tela: T("CMP"), nivel: "normal", texto: `Esperado SE/CO ${rot(MESES[i])} ${srs(e - refSE[i], 0)} contra o PLD do deck da BAND (${rs(refSE[i], 0)})` });
    }
    return L.slice(0, 3);
  }

  // ================================================================================================
  // registro
  // ================================================================================================
  // a ordem define o número (tecla) de cada tela; referências internas usam T("<código>")
  const TELAS = [
    { cod: "REU", nome: "Morning Call", montar: telaREU },
    { cod: "CAD", nome: "Cadastro", montar: telaCAD },
    { cod: "CMP", nome: "Comparação", montar: telaCMP },
    { cod: "VER", nome: "Versões", montar: telaVER },
    { cod: "MET", nome: "Como usar", montar: area => Mesa.met(area, SECOES) },
  ];
  Mesa.registrar({
    cod: "RES", decisao: false, mesa: { ordem: 2 }, nome: "Cenários do research LP", desc: "PLD médio mensal de M+1 a M+6 por submercado, nos cenários de longo prazo do research",
    sinal, fita, resumo, alertas,
    telas: TELAS,
  });
})();
