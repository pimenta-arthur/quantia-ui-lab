/* Variante 08 · Mesa (terminal desde o início) · funcoes/hyd.js
   HYD · Hydro Inflow Similarity: ENA por subsistema, anos similares de ENSO, indicadores climáticos, fundamentos,
   desempenho e metodologia, como telas numeradas da Mesa (API no topo de mesa.js).
   Lê window.HYD (dados FICTÍCIOS da variante 07, carregados pela index.html). As utilidades do hyd.js da 07 estão
   copiadas aqui dentro: nenhum nome global além do Mesa.registrar. Estado de abas e seleções em localStorage com o
   prefixo "mesa.hyd.". Telas: 1 ENA · 2 TRJ · 3 CLI · 4 FUN · 5 DES · 6 MET. */
(function () {
  "use strict";
  const HYD = window.HYD;
  if (!HYD || typeof Mesa === "undefined") return;
  const P = HYD.produto, CL = HYD.clima, FU = HYD.fundamentos, ME = HYD.metodologia;
  const R = P.rodada, A = P.atualizacao, O = P.observado, I = R.insumos, VIES = R.vies_el_nino_forte, CI = CL.indices;

  // =====================================================================================================
  // utilidades (as do hyd.js da 07, copiadas, e algumas da casca)
  // =====================================================================================================
  const nm = (v, c = 0) => n(v, c).replace("-", "−");
  const somaMes = (p, k) => { const d = new Date(+p.slice(0, 4), +p.slice(5, 7) - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  function gradeY(svg, e, y, m, W, fmt = v => n(v)) {
    e.t.forEach(t => {
      S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: Math.abs(t) < 1e-9 ? "var(--ink-3)" : "var(--rule)" });
      S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, String(fmt(Math.abs(t) < 1e-9 ? 0 : t)).replace("-", "−"));
    });
  }
  const colunaDe = (svg, ev, W, m, k) => Math.max(0, Math.min(k - 1, Math.round((_px(svg, ev, W) - m.l) / ((W - m.l - m.r) / (k - 1)))));
  function desenhar(pai, fn, alt, rotulo) {
    pai.replaceChildren();
    const c = grafico(pai, fn, typeof alt === "string" ? alt : undefined, rotulo);
    if (typeof alt === "number") c.style.height = alt + "px";
    return c;
  }
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const ler = (k, padrao) => { try { const v = localStorage.getItem("mesa.hyd." + k); return v == null ? padrao : v; } catch (e) { return padrao; } };
  const guardar = (k, v) => { try { localStorage.setItem("mesa.hyd." + k, v); } catch (e) { /* sem armazenamento: só não lembra */ } };
  const media = a => { const b = a.filter(v => v != null); return b.length ? b.reduce((s, v) => s + v, 0) / b.length : null; };
  const mediana = a => { const b = a.filter(v => v != null).sort((x, y) => x - y); if (!b.length) return null; const k = b.length / 2; return b.length % 2 ? b[Math.floor(k)] : (b[k - 1] + b[k]) / 2; };
  const pad = (v, k) => Array.from({ length: k }, (_, i) => (v[i] == null ? null : v[i]));
  const valido = (v, ops) => (ops.some(o => o[0] === v) ? v : ops[0][0]);
  const h3 = (el, t) => { const e = mk("h3", null, t); el.append(e); return e; };
  const par = (el, html, cls = "hyd-ins-p") => { const e = mk("p", cls, html); el.append(e); return e; };
  const legHtml = itens => QC.legenda(itens);
  /** tabela densa dentro de .rolagem. cab: [[título, numérica?]]; linhas: [[html | [html, classe]]] */
  function tabela(pai, cab, linhas, cls = "") {
    const box = mk("div", "rolagem");
    const cel = v => (Array.isArray(v) ? v : [v, ""]);
    box.innerHTML = `<table class="hyd-tab ${cls}"><thead><tr>${cab.map(([t, num]) => `<th${num ? ' class="n"' : ""}>${t}</th>`).join("")}</tr></thead><tbody>` +
      linhas.map(l => `<tr>${l.map((v, j) => { const [h, c] = cel(v); const k = [cab[j] && cab[j][1] ? "n" : "", c].filter(Boolean).join(" "); return `<td${k ? ` class="${k}"` : ""}>${h}</td>`; }).join("")}</tr>`).join("") + `</tbody></table>`;
    pai.append(box); return box.querySelector("table");
  }
  /** grupo de botões no visual .abas; não chama cb na criação (quem cria desenha o estado inicial) */
  function abasEm(pai, opcoes, inicial, cb, rotulo = "Opções", antes = true) {
    const g = mk("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo);
    opcoes.forEach(([v, t]) => { const b = mk("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(v === inicial)); g.append(b); });
    g.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b || b.disabled) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); cb(b.dataset.v); });
    if (antes) pai.prepend(g); else pai.append(g);
    return g;
  }
  /** chave liga/desliga (visual da 07) */
  function chave(pai, texto, ligada, cb) {
    const l = mk("label", "hyd-chave", `<input type="checkbox"${ligada ? " checked" : ""}><span class="trilho"></span>${texto}`);
    l.querySelector("input").addEventListener("change", ev => cb(ev.target.checked));
    pai.append(l); return l;
  }
  const painel = (g, o) => Mesa.painel(g, o);   // id do painel: "p-HYD-n" (posto pela Mesa)
  const pilha = g => { const d = mk("div", "hyd-pilha"); g.append(d); return d; };
  const abrir = (titulo, conteudo) => Mesa.inspecionar(titulo, conteudo);

  // =====================================================================================================
  // nomes, cores e dados derivados
  // =====================================================================================================
  const NOME = { SE: "Sudeste", "SE-sul": "SE-sul", "SE-resto": "SE-resto", S: "Sul", NE: "Nordeste", N: "Norte" };
  const COR = { SE: "var(--sm-se)", S: "var(--sm-s)", NE: "var(--sm-ne)", N: "var(--sm-n)", "SE-sul": "var(--hyd-sesul)", "SE-resto": "var(--hyd-seresto)" };
  const SUBS = ["SE", "S", "NE", "N"], SEIS = ["SE", "SE-sul", "SE-resto", "S", "NE", "N"];
  const H_MAX = 12, PREV = A ? A.previsoes : R.previsoes, ultimoAlvo = somaMes(R.emissao, H_MAX);
  const prev = nome => PREV.filter(p => p.nome === nome && p.alvo <= ultimoAlvo).sort((a, b) => (a.alvo < b.alvo ? -1 : 1));
  const prevRod = (nome, mm) => R.previsoes.find(q => q.nome === nome && q.alvo === mm);
  const SIM = P.similares, ANOS_SIM = SIM.anos.map(a => a.ano);
  const simDe = nome => (SIM.por_nome[nome] || []).filter(p => p.h <= H_MAX);
  const MESES = [...O.meses];
  for (let k = 1; somaMes(O.meses[O.meses.length - 1], k) <= ultimoAlvo; k++) MESES.push(somaMes(O.meses[O.meses.length - 1], k));
  const iEmissao = MESES.indexOf(R.emissao);
  const MES_CURSO = A ? A.mes : somaMes(R.emissao, 1), M1 = somaMes(MES_CURSO, 1);
  const ALVOS = prev("SE").map(p => p.alvo);
  const pM = (k, mm) => prev(k).find(p => p.alvo === mm);
  const sM = (k, mm) => simDe(k).find(p => p.alvo === mm);
  const mltDe = (k, mm) => P.mlt_sub[k][+mm.slice(5, 7) - 1];
  const obsDe = (k, mm) => { const io = O.meses.indexOf(mm); return io >= 0 && O.pct[k][io] != null ? { v: O.pct[k][io], parcial: O.parcial[io], io } : null; };
  const dM1 = k => { const p = pM(k, M1), r0 = prevRod(k, M1); return p && r0 && A ? p.media - r0.media : null; };
  const E = P.enso, ES = P.enso_similares, N3 = I.nino34_rel_3m, N_MES = E.mensal[E.mensal.length - 1];
  const DN3 = N3 - E.tres_meses[E.tres_meses.length - 4];
  const faseEnso = v => (v >= 1.5 ? "El Niño forte" : v >= 1.0 ? "El Niño moderado" : v >= 0.5 ? "El Niño fraco" : v > -0.5 ? "Neutro" : v > -1.0 ? "La Niña fraca" : "La Niña forte");
  const faseCurta = f => f.replace("moderado", "mod.").replace("moderada", "mod.");
  const ATIVA3 = VIES.ativa_3m ?? VIES.ativa, ATIVAM = VIES.ativa_mes;
  const QUANDO = (A ? A.gerada_em : P.gerado_em).slice(0, 16);
  const T = P.trajetorias, ANO = T.ano_atual, U = P.umido;
  const MESES_T = ["jul", "ago", "set", "out", "nov", "dez", "jan", "fev", "mar", "abr", "mai", "jun"];
  const posT = mm => (+mm.slice(0, 4) - ANO) * 12 + (+mm.slice(5, 7) - 7);
  const mesT = (i, a = ANO) => `${MESES_T[i % 12]}/${String(a + Math.floor((i + 6) / 12)).slice(2)}`;

  // =====================================================================================================
  // inspetor: detalhes que abrem ao clicar
  // =====================================================================================================
  /** um mês de um subsistema: realizado, modelo-v1, rodada, similares, blocos e todos os subsistemas no mês */
  function mesDetalhe(nome, mm) {
    return el => {
      const o = obsDe(nome, mm), p = pM(nome, mm), r0 = A ? prevRod(nome, mm) : null, s = sM(nome, mm), mlt = mltDe(nome, mm);
      const L = [["MLT do mês", `${n(mlt)} MWmed`]];
      if (o) L.push([o.parcial ? `Realizado parcial${A ? ` (${A.dias} dias)` : ""}` : "Realizado", `${n(o.v, 1)}% · ${n(o.v / 100 * mlt)} MWmed`]);
      if (p) {
        L.push(["Modelo-v1 · média", `<b>${n(p.media, 1)}%</b> · ${n(p.media / 100 * mlt)} MWmed`], ["p10 · p50 · p90", `${n(p.p10)} · ${n(p.p50)} · ${n(p.p90)}%`], ["Anomalia", `${sn(p.anomalia_gw, 2)} GWmed`]);
        if (A && p.h === 0) L.push(["Origem", "mês em curso pelos dias observados"]);
      }
      if (r0) L.push([`Rodada de ${rot(R.emissao)}`, `${n(r0.media, 1)}% (${n(r0.p10)}–${n(r0.p90)})`]);
      if (s) L.push(["Anos similares · média", `<span class="hyd-sim">${n(s.media, 1)}%</span> (mín.–máx. ${n(s.minimo)}–${n(s.maximo)})`]);
      QC.pares(el, L);
      if (s) {
        h3(el, "Cada ano similar, sobre o normal de hoje");
        tabela(el, [["Ano"], ["% MLT", 1], ["MWmed", 1]], Object.entries(s.anos).map(([a, v]) => [a, `${n(v)}%`, n(v / 100 * mlt)]));
      }
      if (o && nome === "SE") par(el, `Blocos: SE-sul ${n(O.pct["SE-sul"][o.io])}% · SE-resto ${n(O.pct["SE-resto"][o.io])}% (realizado).`);
      if (o && nome === "SE-sul") par(el, `Bacias: Paranapanema ${n(O.bacias.PARANAPANEMA[o.io])}% · Paraná incr. ${n(O.bacias.PARANA[o.io])}% (realizado).`);
      if (o && nome === "SE-resto") par(el, `Bacias: Grande ${n(O.bacias.GRANDE[o.io])}% · Paranaíba ${n(O.bacias.PARANAIBA[o.io])}% (realizado).`);
      h3(el, `Todos os subsistemas em ${rot(mm)}`);
      tabela(el, [[""], ["Real.", 1], ["Modelo", 1], ["p10–p90", 1], ["Sim.", 1]], SEIS.map(k => {
        const ok = obsDe(k, mm), pk = pM(k, mm), sk = sM(k, mm);
        return [k === nome ? `<b>${k}</b>` : k, ok ? n(ok.v) + (ok.parcial ? "*" : "") : "—", pk ? n(pk.media) : "—", pk ? `${n(pk.p10)}–${n(pk.p90)}` : "—", sk ? [n(sk.media), "hyd-sim"] : "—"];
      }));
      par(el, "% da MLT. * parcial.", "leg");
    };
  }
  const abrirMes = (nome, mm) => abrir(`${NOME[nome]} · ${rot(mm)}`, mesDetalhe(nome, mm));

  /** um subsistema, mês a mês: gráfico, tabela e cada ano similar */
  function subDetalhe(k) {
    return el => {
      const Pv = ALVOS.map(mm => pM(k, mm)), Sv = ALVOS.map(mm => sM(k, mm));
      const g = mk("div"); el.append(g);
      desenhar(g, (svg, W, H) => linhas(svg, W, H, { n: ALVOS.length, fmt: v => n(v) + "%",
        series: [{ nome: "p90", v: Pv.map(p => p && p.p90), cor: "var(--ink-3)", larg: 1, semPonto: true, tracejado: true },
          { nome: "p10", v: Pv.map(p => p && p.p10), cor: "var(--ink-3)", larg: 1, semPonto: true, tracejado: true },
          { nome: "Modelo-v1", v: Pv.map(p => p && p.media), cor: "var(--accent)" }, { nome: "Similares", v: Sv.map(s => s && s.media), cor: "var(--hyd-sim)", tracejado: true }],
        refs: [{ v: 100, rot: "100%" }], rotX: i => (i % 3 === 0 ? rot(ALVOS[i]) : null), titX: i => `${NOME[k]} · ${rot(ALVOS[i])}` }), 170, `${NOME[k]}: modelo-v1 e similares`);
      tabela(el, [["Mês"], ["MLT", 1], ["Real.", 1], ["Modelo", 1], ["p10–p90", 1], ["Sim.", 1]], ALVOS.map((mm, i) => {
        const o = obsDe(k, mm), p = Pv[i], s = Sv[i];
        return [rot(mm), n(mltDe(k, mm)), o ? n(o.v) + (o.parcial ? "*" : "") : "—", p ? `<b>${n(p.media)}</b>` : "—", p ? `${n(p.p10)}–${n(p.p90)}` : "—", s ? [n(s.media), "hyd-sim"] : "—"];
      }));
      h3(el, "Cada ano similar (recomposição)");
      tabela(el, [["Mês"], ...ANOS_SIM.map(a => [String(a), 1])], ALVOS.map((mm, i) => [rot(mm), ...ANOS_SIM.map(a => (Sv[i] ? n(Sv[i].anos[String(a)]) : "—"))]));
      par(el, "% da MLT; MLT em MWmed. * parcial. Cada ano: a ENA daquele ano sobre o normal de hoje.", "leg");
    };
  }

  /** um ano (similar, El Niño forte ou qualquer período úmido): ENSO, úmido, trajetória, Niño 3.4 e recomposição */
  function anoDetalhe(a) {
    return el => {
      const s = SIM.anos.find(x => x.ano === a), iu = U.anos.indexOf(a), forte = T.fortes.includes(a);
      const L = [];
      if (s) L.push(["Entre os similares", `${SIM.anos.indexOf(s) + 1}º · dist. ${n(s.distancia, 2)}`], [`N · ΔN (out/${String(a).slice(2)})`, `${n(s.n, 2)} · ${sn(s.dn, 2)}`]);
      if (iu >= 0) L.push(["Fase out–dez", `${faseCurta(faseEnso(U.enso[iu]))} · ${nm(U.enso[iu], 2)}`]);
      if (forte) L.push(["El Niño forte", "1 dos 5 desde 1950"]);
      QC.pares(el, L);
      if (iu >= 0) {
        h3(el, `Úmido ${a}/${String(a + 1).slice(2)} (nov–abr), % MLT`);
        tabela(el, SEIS.map(k => [k, 1]), [SEIS.map(k => (U[k][iu] != null ? n(U[k][iu]) : "—"))]);
      }
      const Ta = T.anos[String(a)], T26 = T.anos[String(ANO)];
      if (Ta && a !== ANO) {
        h3(el, `Trajetória ${a} × ${ANO}, jul a jun+1, % MLT`);
        const box = mk("div", "hyd-ins-graf"); el.append(box);
        const ops = SEIS.map(k => [k, k]); const ini = valido(ler("ano.sub", "S"), ops);
        const g = mk("div");
        const des = k => { guardar("ano.sub", k); desenhar(g, (svg, W, H) => linhas(svg, W, H, { n: 24, fmt: v => n(v) + "%",
          series: [{ nome: String(a), v: pad(Ta[k], 24), cor: "var(--hyd-sim)" }, { nome: String(ANO), v: pad(T26[k], 24), cor: "var(--ink)", larg: 2.6 }],
          refs: [{ v: 100, rot: "100%" }], rotX: i => (i % 6 === 0 ? MESES_T[i % 12] + (i >= 12 ? "+1" : "") : null), titX: i => `${NOME[k]} · ${MESES_T[i % 12]}${i >= 12 ? " (ano seguinte)" : ""}` }), 165, `Trajetória de ${a} e ${ANO}`); };
        abasEm(box, ops, ini, des, "Subsistema", false); box.append(g); des(ini);
      }
      if (ES.anos[String(a)]) {
        h3(el, `Niño 3.4 relativo: ${a} no calendário de ${ANO}`);
        const g = mk("div"); el.append(g);
        desenhar(g, (svg, W, H) => linhas(svg, W, H, { n: ES.meses.length, fmt: v => nm(v, 2),
          series: [{ nome: `${a} (+${ANO - a} anos)`, v: ES.anos[String(a)], cor: "var(--hyd-sim)" }, { nome: String(ANO), v: pad(E.mensal, ES.meses.length), cor: "var(--accent)" }],
          refs: [{ v: 1.5, rot: "1,5" }], rotX: i => (/-(01|07)$/.test(ES.meses[i]) ? rot(ES.meses[i]) : null), titX: i => rot(ES.meses[i]) }), 150, `Niño 3.4 de ${a} e ${ANO}`);
        par(el, `Mensal. ${a} deslocado para o calendário de ${ANO}, com 9 meses a mais para ver o que o ENSO fez depois.`, "leg");
      }
      if (s) {
        h3(el, `Recomposição por ${a}, % MLT`);
        tabela(el, [["Mês"], ...SUBS.map(k => [k, 1])], ALVOS.map(mm => [rot(mm), ...SUBS.map(k => { const q = sM(k, mm); return q ? n(q.anos[String(a)]) : "—"; })]));
        par(el, "A ENA de cada mês deste ano dividida pelo normal da época e aplicada sobre o normal de hoje.", "leg");
      }
    };
  }

  /** a recomposição contra o modelo-v1 e contra a climatologia, com o intervalo */
  function recompDetalhe(k) {
    return el => {
      const D = P.similares_desempenho;
      tabela(el, [["Recorte"], ["Referência"], ["CRPSS", 1], ["IC 90%", 1]], ["El Niño forte", "El Niño (N≥0,5)", "todos"].flatMap(rec => ["PER", "C30"].map(ref => {
        const d = D.find(q => q.nome === k && q.recorte === rec && q.ref === ref);
        return d ? [rec, ref === "PER" ? "modelo-v1" : "climatologia 30 a", [`${sn(d.crpss * 100)}%`, d.ic05 > 0 ? "hyd-bom" : d.ic95 < 0 ? "hyd-ruim" : ""], `${sn(d.ic05 * 100)} a ${sn(d.ic95 * 100)}%`] : [rec, ref, "—", "—"];
      })));
      par(el, "Ganho da recomposição pelos 5 anos similares, 1 a 6 meses, previsões de 1961 a 2025 feitas só com o que existia em cada data. Acima de 0, a recomposição ganha da referência; com o intervalo todo acima de 0, ganha com folga.", "leg");
    };
  }

  // =====================================================================================================
  // gráficos (copiados da 07 e ajustados à Mesa: clique abre o inspetor)
  // =====================================================================================================
  /** ENA mensal de um subsistema: realizado, faixa e média do modelo-v1, recomposição; coluna do M+1 */
  function serieENA(svg, W, H, nome) {
    const m = { l: 36, r: 8, t: 10, b: 20 }, Pv = prev(nome), obs = O.pct[nome], PS = simDe(nome);
    const e = eixo(0, Math.max(...obs.filter(v => v != null), ...Pv.map(p => p.p90), ...PS.map(p => p.media)) * 1.05, 4);
    const x = i => m.l + i * (W - m.l - m.r) / (MESES.length - 1), y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    const bw = (W - m.l - m.r) / (MESES.length - 1), iM1 = MESES.indexOf(M1);
    if (iM1 >= 0) S(svg, "rect", { x: x(iM1) - bw / 2, y: m.t, width: bw, height: H - m.t - m.b, fill: "var(--hyd-m1)" });
    gradeY(svg, e, y, m, W);
    const ix = p => MESES.indexOf(p.alvo), vE = obs[O.meses.indexOf(R.emissao)];
    const banda = [[x(iEmissao), y(vE)], ...Pv.map(p => [x(ix(p)), y(p.p90)]), ...Pv.slice().reverse().map(p => [x(ix(p)), y(p.p10)]), [x(iEmissao), y(vE)]];
    S(svg, "polygon", { points: banda.map(q => q.join(",")).join(" "), fill: "var(--faixa-proj)" });
    S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
    S(svg, "line", { x1: x(iEmissao), x2: x(iEmissao), y1: m.t, y2: H - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "2 3" });
    const completos = obs.map((v, i) => [i, v]).filter(([i, v]) => v != null && !O.parcial[i]);
    S(svg, "polyline", { points: completos.map(([i, v]) => `${x(i)},${y(v)}`).join(" "), fill: "none", stroke: "var(--ink)", "stroke-width": 2 });
    S(svg, "polyline", { points: [[x(iEmissao), y(vE)], ...Pv.map(p => [x(ix(p)), y(p.media)])].map(q => q.join(",")).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2.2 });
    if (PS.length) S(svg, "polyline", { points: [[x(iEmissao), y(vE)], ...PS.map(p => [x(ix(p)), y(p.media)])].map(q => q.join(",")).join(" "), fill: "none", stroke: "var(--hyd-sim)", "stroke-width": 2, "stroke-dasharray": "5 3" });
    O.parcial.forEach((p, i) => { if (p) S(svg, "circle", { cx: x(i), cy: y(obs[i]), r: 4, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 1.5 }); });
    rotulosX(svg, MESES.map((_, i) => i), x, H - 5, i => (rotuloDeMes(MESES[i]) ? rot(MESES[i]) : null), 40);
    MESES.forEach((mm, i) => {
      const io = O.meses.indexOf(mm), p = Pv.find(q => q.alvo === mm), ps = PS.find(q => q.alvo === mm);
      const partes = [`<b>${rot(mm)}</b> · ${NOME[nome]}${mm === M1 ? " · M+1" : ""}`];
      if (io >= 0 && obs[io] != null) partes.push(`realizado ${n(obs[io])}%${O.parcial[io] ? " (parcial)" : ""}`);
      if (p) partes.push(`modelo-v1 ${n(p.media)}% (p10–p90 ${n(p.p10)}–${n(p.p90)}%)${A && p.h === 0 ? " · mês em curso" : ""}`);
      const pr = A ? prevRod(nome, mm) : null;
      if (pr) partes.push(`rodada de ${rot(R.emissao)}: ${n(pr.media)}%`);
      if (ps) partes.push(`<span class="hyd-sim">anos similares ${n(ps.media)}%</span>`);
      if (p || io >= 0) partes.push('<span class="hyd-dica-ir">clique: detalhe no inspetor</span>');
      const r = S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: H - m.t - m.b, fill: "transparent", style: "cursor:pointer" });
      dicaEm(r, partes.join("<br>"));
      r.addEventListener("click", () => abrirMes(nome, mm));
    });
  }

  /** 2026 ao lado dos anos de comparação (jul a jun de dois anos depois) */
  function trajetoria(svg, W, H, st, aoClicar) {
    const anos = (st.grupo === "sim" ? ANOS_SIM : T.fortes).map(String), atual = T.anos[String(ANO)];
    const Pv = prev(st.sub), PS = simDe(st.sub), m = { l: 40, r: 74, t: 12, b: 26 };
    const serieT = a => T.anos[a][st.sub], armT = a => (T.anos[a].armazenavel ? T.anos[a].armazenavel[st.sub] : null);
    const armAnos = st.arm ? [...anos, String(ANO)].filter(a => armT(a)) : [];
    const vals = [...anos.flatMap(serieT), ...serieT(String(ANO)), ...armAnos.flatMap(armT), ...Pv.map(p => p.media), ...PS.map(p => p.media), ...(st.disp ? PS.map(p => p.maximo) : [])].filter(v => v != null);
    const e = eixo(0, Math.max(...vals), 5), x = i => m.l + i * (W - m.l - m.r) / 23, y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    [[4, 9], [16, 21]].forEach(([a, b]) => S(svg, "rect", { x: x(a) - 4, y: m.t, width: x(b) - x(a) + 8, height: H - m.t - m.b, fill: "var(--vazio)" }));
    gradeY(svg, e, y, m, W);
    S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
    rotulosX(svg, [0, 3, 6, 9, 12, 15, 18, 21], i => x(i), H - 7, i => `${MESES_T[i % 12]}${i >= 12 ? "/+1" : ""}`, 34);
    const fins = [];
    anos.forEach(a => {
      const pts = serieT(a).map((q, i) => (q == null ? null : [x(i), y(q)])).filter(Boolean); if (!pts.length) return;
      const dest = String(st.ano) === a;
      S(svg, "polyline", { points: pts.map(p => p.join(",")).join(" "), fill: "none", stroke: dest ? "var(--hyd-destaque)" : "var(--bar-pers)", "stroke-width": dest ? 2.6 : 1.6 });
      const [lx, ly] = pts[pts.length - 1]; fins.push({ t: a, x: lx, y: ly, cor: dest ? "var(--hyd-destaque)" : null });
    });
    armAnos.forEach(a => {
      const ehAtual = a === String(ANO), pa = armT(a).map((q, i) => (q == null ? null : [x(i), y(q)])).filter(Boolean); if (!pa.length) return;
      S(svg, "polyline", { points: pa.map(p => p.join(",")).join(" "), fill: "none", stroke: ehAtual ? "var(--hyd-2026)" : "var(--bar-pers)", "stroke-width": ehAtual ? 2 : 1.3, "stroke-dasharray": "2 3" });
      const u = pa[pa.length - 1]; fins.push({ t: `${a} armaz.`, x: u[0], y: u[1], cor: ehAtual ? "var(--hyd-2026)" : null });
    });
    const v = serieT(String(ANO)), iR = posT(R.emissao), vR = v[iR];
    if (st.disp && PS.length) {
      const banda = [[x(iR), y(vR)], ...PS.map(p => [x(posT(p.alvo)), y(p.maximo)]), ...PS.slice().reverse().map(p => [x(posT(p.alvo)), y(p.minimo)])];
      S(svg, "polygon", { points: banda.map(q => q.join(",")).join(" "), fill: "var(--hyd-sim)", "fill-opacity": 0.14 });
    }
    const linhaProj = (L, cor, tracejado) => {
      if (!L.length) return;
      S(svg, "polyline", { points: [[x(iR), y(vR)], ...L.map(p => [x(posT(p.alvo)), y(p.media)])].map(q => q.join(",")).join(" "), fill: "none", stroke: cor, "stroke-width": 1.8, "stroke-dasharray": tracejado ? "5 3" : null });
      const u = L[L.length - 1]; fins.push({ t: tracejado ? "similares" : "modelo-v1", x: x(posT(u.alvo)), y: y(u.media), cor });
    };
    linhaProj(Pv, "var(--accent)", false); linhaProj(PS, "var(--hyd-sim)", true);
    const pts = v.map((q, i) => (q == null ? null : [x(i), y(q), i])).filter(Boolean);
    const iParcial = v.findIndex((_, i) => atual.parcial[i]);
    const cheios = iParcial > 0 ? pts.filter(p => p[2] < iParcial) : pts;
    S(svg, "polyline", { points: cheios.map(p => `${p[0]},${p[1]}`).join(" "), fill: "none", stroke: "var(--hyd-2026)", "stroke-width": 3 });
    if (iParcial > 0 && v[iParcial] != null) {
      const a = pts.find(p => p[2] === iParcial - 1), b = pts.find(p => p[2] === iParcial);
      S(svg, "line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "var(--hyd-2026)", "stroke-width": 2, "stroke-dasharray": "3 3" });
      S(svg, "circle", { cx: b[0], cy: b[1], r: 4.5, fill: "var(--surface)", stroke: "var(--hyd-2026)", "stroke-width": 2 });
    }
    const ult = cheios[cheios.length - 1];
    S(svg, "text", { x: ult[0] - 6, y: ult[1] - 8, "text-anchor": "end", class: "forte hyd-ano" }, String(ANO));
    empilharRotulos(fins.map(f => ({ el: S(svg, "text", { x: f.x + 6, y: f.y + 3, style: f.cor ? `fill:${f.cor}` : null }, f.t), x: f.x + 6, y: f.y + 3 })), 40, 11);
    const guia = S(svg, "line", { y1: m.t, y2: H - m.b, stroke: "var(--ink-3)", "stroke-width": 1, visibility: "hidden" });
    const zona = S(svg, "rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent", style: "cursor:pointer" });
    const linhasMes = i => {
      const mm = `${ANO + Math.floor((i + 6) / 12)}-${String((i + 6) % 12 + 1).padStart(2, "0")}`, L = [];
      if (v[i] != null) L.push([String(ANO), `${n(v[i])}%${atual.parcial[i] ? " (parcial)" : ""}`, "var(--hyd-2026)"]);
      if (st.arm && armT(String(ANO)) && armT(String(ANO))[i] != null) L.push([`${ANO} armazenável`, `${n(armT(String(ANO))[i])}%`, "var(--hyd-2026)"]);
      const pv = Pv.find(p => p.alvo === mm), ps = PS.find(p => p.alvo === mm);
      if (pv) L.push(["Modelo-v1", `${n(pv.media)}% (${n(pv.p10)}–${n(pv.p90)})`, "var(--accent)"]);
      if (ps) L.push(["Similares", `${n(ps.media)}% (mín.–máx. ${n(ps.minimo)}–${n(ps.maximo)})`, "var(--hyd-sim)"]);
      anos.map(a => [a, serieT(a)[i]]).filter(([, q]) => q != null).sort((p1, p2) => p2[1] - p1[1]).forEach(([a, q]) => L.push([a, `${n(q)}%`, "var(--bar-pers)"]));
      return { mm, L };
    };
    dicaEm(zona, ev => {
      const i = colunaDe(svg, ev, W, m, 24); guia.setAttribute("x1", x(i)); guia.setAttribute("x2", x(i)); guia.setAttribute("visibility", "visible");
      const { L } = linhasMes(i);
      return `<b>${mesT(i)}</b> · ${NOME[st.sub]}, % MLT` + L.map(([a, b, c]) => `<span class="dica-l"><i style="background:${c}"></i>${a}: <b>${b}</b></span>`).join("") + '<span class="hyd-dica-ir">clique: detalhe no inspetor</span>';
    });
    zona.addEventListener("pointerleave", () => guia.setAttribute("visibility", "hidden"));
    zona.addEventListener("click", ev => { const i = colunaDe(svg, ev, W, m, 24); aoClicar(i, linhasMes(i)); });
  }

  /** contribuição de cada bacia ou bloco, em GWmed acima ou abaixo da MLT */
  const NOME_B = { PARANAPANEMA: "Paranapanema", TIETE: "Tietê", PARANA: "Paraná incr.", GRANDE: "Grande", PARANAIBA: "Paranaíba", IGUACU: "Iguaçu", URUGUAI: "Uruguai", JACUI: "Jacuí", "SAO FRANCISCO": "São Francisco", demais: "Demais" };
  const CORES_G = ["var(--hyd-g1)", "var(--hyd-g2)", "var(--hyd-g3)", "var(--hyd-g4)", "var(--hyd-g5)"];
  function gruposGW(sub, modo) {
    const C = P.contribuicao;
    if (sub === "SE" && modo === "blocos") return [["SE-sul", "SE-sul", "var(--hyd-sesul)", O.gw["SE-sul"]], ["SE-resto", "SE-resto", "var(--hyd-seresto)", O.gw["SE-resto"]]];
    if (sub !== "SE" && (modo === "blocos" || sub === "N")) return [[sub, `${NOME[sub]} (subsistema)`, "var(--hyd-g1)", O.gw[sub]]];
    const G = C[sub];
    return Object.keys(G).map((k, j) => [k, k === "demais" ? `Demais do ${sub === "SE" ? "SE" : sub === "S" ? "Sul" : "NE"}` : NOME_B[k], k === "demais" ? "var(--hyd-g-demais)" : CORES_G[j % CORES_G.length], G[k]]);
  }
  function contribuicao(svg, W, H, sub, modo) {
    const grupos = gruposGW(sub, modo), m = { l: 44, r: 12, t: 12, b: 24 };
    const projTot = mm => { const p = pM(sub, mm); return p ? p.anomalia_gw : null; };
    const proj = modo === "blocos", projBT = (k, mm) => (sub === "SE" ? (pM(k, mm) ? pM(k, mm).anomalia_gw : null) : projTot(mm));
    let lo = 0, hi = 0;
    MESES.forEach(mm => {
      const io = O.meses.indexOf(mm), vals = io >= 0 ? grupos.map(g => g[3][io] ?? 0) : proj ? grupos.map(g => projBT(g[0], mm) ?? 0) : [], t = io >= 0 ? null : projTot(mm);
      hi = Math.max(hi, vals.filter(v => v > 0).reduce((a, b) => a + b, 0), t ?? 0); lo = Math.min(lo, vals.filter(v => v < 0).reduce((a, b) => a + b, 0), t ?? 0);
    });
    const e = eixo(lo, hi, 5), bw = (W - m.l - m.r) / MESES.length, x = i => m.l + (i + 0.5) * bw, y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
    gradeY(svg, e, y, m, W);
    MESES.forEach((mm, i) => {
      const io = O.meses.indexOf(mm), obs = io >= 0, parcial = obs && O.parcial[io];
      const partes = obs ? grupos.map(g => [g, g[3][io]]) : proj ? grupos.map(g => [g, projBT(g[0], mm)]) : [];
      let topo = 0, base = 0;
      partes.forEach(([g, v]) => {
        if (v == null) return; const y0 = v >= 0 ? topo : base, y1 = y0 + v; if (v >= 0) topo = y1; else base = y1;
        S(svg, "rect", { x: x(i) - bw * 0.36, y: Math.min(y(y0), y(y1)), width: bw * 0.72, height: Math.max(Math.abs(y(y1) - y(y0)) - 1, 0.5), fill: g[2], opacity: obs ? (parcial ? 0.6 : 1) : 0.35, stroke: obs ? null : g[2], "stroke-dasharray": obs ? null : "3 2" });
      });
      const tot = obs ? O.gw[sub][io] : projTot(mm);
      if (tot != null) S(svg, "circle", { cx: x(i), cy: y(tot), r: 3.2, fill: obs ? "var(--ink)" : "var(--surface)", stroke: obs ? "var(--surface)" : "var(--ink)", "stroke-width": 1.5 });
      const alvo = S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: H - m.t - m.b, fill: "transparent", style: "cursor:pointer" });
      const html = `<b>${rot(mm)}</b>${!obs ? " · projetado (modelo-v1)" : parcial ? " · parcial" : ""}` + partes.filter(([, v]) => v != null).map(([g, v]) => `<span class="dica-l"><i style="background:${g[2]}"></i>${g[1]}: <b>${sn(v, 1)}</b></span>`).join("") + (tot != null ? `<b>Total ${sn(tot, 1)} GWmed</b>` : "");
      dicaEm(alvo, html);
      alvo.addEventListener("click", () => abrir(`${NOME[sub]} · ${rot(mm)} · GWmed`, el => {
        if (!partes.length && tot == null) { par(el, "Sem dado neste mês."); return; }
        tabela(el, [["Parte"], ["GWmed", 1]], [...partes.filter(([, v]) => v != null).map(([g, v]) => [`<i class="hyd-q" style="background:${g[2]}"></i>${g[1]}`, sn(v, 2)]), ...(tot != null ? [["<b>Total do subsistema</b>", `<b>${sn(tot, 2)}</b>`]] : [])]);
        par(el, !obs ? "Projetado pelo modelo-v1 (só o total ou os blocos do SE)." : parcial ? `Mês parcial (${A ? A.dias : "—"} dias).` : "Realizado.", "leg");
        const p = pM(sub, mm); if (p) par(el, `Modelo-v1: ${n(p.media)}% da MLT (${n(p.p10)}–${n(p.p90)}).`);
      }));
    });
    rotulosX(svg, MESES.map((_, i) => i), x, H - 6, i => (/-(01|04|07|10)$/.test(MESES[i]) ? rot(MESES[i]) : null), 40);
    S(svg, "line", { x1: x(iEmissao) + bw / 2, x2: x(iEmissao) + bw / 2, y1: m.t, y2: H - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "2 3" });
  }

  /** Niño 3.4 relativo recente (mensal e 3 meses), com os anos similares no mesmo calendário */
  function ensoGraf(svg, W, H, comSim) {
    const m = { l: 34, r: comSim ? 38 : 10, t: 10, b: 20 };
    const meses = comSim ? ES.meses : E.meses, ix = mm => meses.indexOf(mm), extras = comSim ? Object.values(ES.anos).flat() : [];
    const vals = [...E.mensal, ...E.tres_meses, ...extras].filter(q => q != null), e = eixo(Math.min(0, ...vals), Math.max(1.6, ...vals), 5);
    const x = i => m.l + i * (W - m.l - m.r) / (meses.length - 1), y = q => m.t + (H - m.t - m.b) * (1 - (q - e.a) / (e.b - e.a));
    gradeY(svg, e, y, m, W, t => n(t, 1));
    S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(1.5), y2: y(1.5), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
    if (comSim) {
      const fins = [];
      Object.entries(ES.anos).forEach(([a, v]) => {
        const pts = v.map((q, i) => (q == null ? null : [x(i), y(q), i, q])).filter(Boolean);
        S(svg, "polyline", { points: pts.map(p => `${p[0]},${p[1]}`).join(" "), fill: "none", stroke: "var(--bar-pers)", "stroke-width": 1.3 });
        pts.forEach(([px, py, i, q]) => dicaEm(S(svg, "circle", { cx: px, cy: py, r: 4, fill: "transparent" }), `<b>${a}</b> · ${MES[+meses[i].slice(5, 7) - 1]}/${String(+meses[i].slice(0, 4) - (ANO - +a)).slice(2)}<br>Niño 3.4 relativo ${nm(q, 2)}`));
        const u = pts[pts.length - 1]; fins.push({ t: a, x: u[0], y: u[1] });
      });
      empilharRotulos(fins.map(f => ({ el: S(svg, "text", { x: f.x + 4, y: f.y + 3 }, f.t), x: f.x + 4, y: f.y + 3 })), 30, 10);
    }
    const pts = a => E.meses.map((mm, i) => (a[i] == null ? null : `${x(ix(mm))},${y(a[i])}`)).filter(Boolean).join(" ");
    S(svg, "polyline", { points: pts(E.mensal), fill: "none", stroke: "var(--accent)", "stroke-width": 1.8 });
    S(svg, "polyline", { points: pts(E.tres_meses), fill: "none", stroke: "var(--ink)", "stroke-width": 2 });
    rotulosX(svg, meses.map((_, i) => i), x, H - 5, i => (rotuloDeMes(meses[i]) ? rot(meses[i]) : null), 40);
    const bw = (W - m.l - m.r) / (meses.length - 1);
    meses.forEach((mm, i) => {
      const k = E.meses.indexOf(mm); if (k < 0) return;
      dicaEm(S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: H - m.t - m.b, fill: "transparent" }), `<b>${rot(mm)}</b><br>mensal ${nm(E.mensal[k], 2)} · 3 meses ${nm(E.tres_meses[k], 2)}${E.oni[k] != null ? `<br>ONI oficial (CPC) ${nm(E.oni[k], 2)}` : ""}`);
    });
  }

  /** ENA de cada período úmido (nov–abr), com os anos em destaque; clique na barra abre o ano */
  function umidoGraf(svg, W, H, serie, anos, cor, rotulo, escala, ttl) {
    const m = { l: 32, r: 6, t: 16, b: 18 }, e = eixo(0, escala, 4);
    const bw = (W - m.l - m.r) / anos.length, x = i => m.l + (i + 0.5) * bw, y = q => m.t + (H - m.t - m.b) * (1 - (q - e.a) / (e.b - e.a));
    gradeY(svg, e, y, m, W);
    const rotulos = [];
    anos.forEach((ano, i) => {
      const q = serie[i]; if (q == null) return; const c = cor(i);
      S(svg, "rect", { x: x(i) - bw * 0.4, y: y(q), width: Math.max(1, bw * 0.8), height: y(0) - y(q), fill: c || "var(--bar-pers)", opacity: c ? 1 : 0.75 });
      const alvo = S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: H - m.t - m.b, fill: "transparent", style: "cursor:pointer" });
      dicaEm(alvo, `<b>Úmido ${ano}/${String(ano + 1).slice(2)}</b> · ${ttl}<br>${n(q)}% da MLT<br>${rotulo(i)}<br><span class="hyd-dica-ir">clique: o ano no inspetor</span>`);
      alvo.addEventListener("click", () => abrir(`Ano ${ano}`, anoDetalhe(ano)));
      if (c) rotulos.push({ el: S(svg, "text", { x: x(i), y: y(q) - 3, "text-anchor": "middle", class: "hyd-ano", style: `fill:${c}` }, ano), x: x(i), y: y(q) - 3 });
    });
    rotulosX(svg, anos.map((_, i) => i), x, H - 5, i => (anos[i] % 20 === 0 ? anos[i] : null), 34);
    S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
    empilharRotulos(rotulos, 26, 10);
  }

  // =====================================================================================================
  // tela 1 · ENA Afluências
  // =====================================================================================================
  function telaENA(area) {
    Mesa.decisao(area, [
      ...SUBS.map((k, i) => {
        const p = pM(k, M1), d = dM1(k);
        return { r: `ENA ${k} ${rot(M1)} (M+1) · % MLT`, v: `${n(p.media)}%`, d: `p10–p90 ${n(p.p10)}–${n(p.p90)}${d != null ? ` · ${seta(d)} ${sn(d)} p.p. vs. rodada ${rot(R.emissao)}` : ""}`, tom: d == null ? "" : tom(d), principal: i === 0 };
      }),
      { r: "ENSO · Niño 3.4 rel. 3 meses", v: nm(N3, 2), d: `${I.regime_enso} · ${seta(DN3)} ${sn(DN3, 2)} em 3 meses` },
      { r: "Anos similares", v: `${ANOS_SIM[0]} · ${ANOS_SIM[1]}`, d: `depois ${ANOS_SIM.slice(2).join(", ")} · mesma fase do ENSO` },
    ]);
    const g = Mesa.grade(area);
    const p1 = painel(g, { cod: "HYD-1", titulo: "ENA por subsistema", unidade: "% da MLT · realizado e projeção", tam: "full", ajuda: "ler-ena",
      leg: `Coluna clara: ${rot(M1)} (M+1); pontilhado vertical: último mês fechado (rodada de ${rot(R.emissao)}). A projeção parte do mês em curso${A ? ` (${A.dias} dias de ${rot(A.mes)})` : ""}. Escala própria em cada gráfico; tracejado de 100% da MLT como referência comum. Clique num mês para o detalhe no inspetor.`,
      fonte: `Premissas: ENA ONS até ${rot(I.ultimo_mes_ena)} · ERSST v6 até ${rot(I.ultimo_mes_ersst)} · Niño 3.4 rel. ${n(N3, 2)} (${I.regime_enso.toLowerCase()}) · ${R.versao}${A ? ` · atualização com ${rot(A.mes)} parcial (${A.dias} dias, até ${dataBr(A.ate)}, gerada ${dataHoraBr(A.gerada_em)})` : ""} · rodada de ${rot(R.emissao)} registrada ${dataHoraBr(R.registrada_em)}. Fonte: ONS; projeção do modelo-v1. Dados fictícios.` });
    p1.corpo.insertAdjacentHTML("beforeend", legHtml([["var(--ink)", "Realizado", "l"], ["var(--accent)", "Modelo-v1 com o mês em curso (média)", "l"], ["var(--faixa-proj)", "Faixa p10–p90"], ["var(--hyd-sim)", "Anos similares (recomposição)", "t"], ["var(--ink-3)", "100% da MLT", "t"]]).replace("</div>", '<span><i class="hyd-circ"></i>Mês em curso (parcial)</span></div>'));
    const multi = mk("div", "hyd-multi"); p1.corpo.append(multi);
    SEIS.forEach(k => {
      const d = mk("div", "hyd-mini"); multi.append(d);
      const p = pM(k, M1), s = sM(k, M1), c = pM(k, MES_CURSO), o = obsDe(k, MES_CURSO);
      d.innerHTML = `<div class="hyd-mini-cab"><b class="hyd-marca" style="--c:${COR[k]}">${k === "SE" ? "Sudeste (agregado)" : k === "SE-sul" ? "SE-sul · Paranapanema, Tietê, Paraná" : k === "SE-resto" ? "SE-resto · Grande, Paranaíba e demais" : NOME[k]}</b>` +
        `<span class="num">${rot(M1)} <b>${n(p.media)}%</b> (${n(p.p10)}–${n(p.p90)})${s ? ` · <span class="hyd-sim">sim. ${n(s.media)}%</span>` : ""}</span></div>` +
        `<div class="hyd-mini-sub num">${rot(MES_CURSO)}${A ? ` (${A.dias} d)` : ""}: modelo ${c ? n(c.media) + "%" : "—"}${o ? ` · parcial ${n(o.v)}%` : ""}${A && prevRod(k, MES_CURSO) ? ` · rodada ${n(prevRod(k, MES_CURSO).media)}%` : ""}</div>`;
      grafico(d, (svg, W, H) => serieENA(svg, W, H, k), undefined, `ENA de ${NOME[k]}`).style.height = "150px";
    });

    // HYD-2 · mês a mês
    const p2 = painel(g, { cod: "HYD-2", titulo: "Mês a mês", unidade: "modelo-v1 e anos similares", tam: "xl", ajuda: "ler-ena",
      leg: `Média do modelo-v1 e da recomposição pelos anos similares. Coluna clara: M+1. Clique numa linha para o subsistema mês a mês (faixa, realizado e cada ano similar) ou num mês para todos os subsistemas.` });
    const caixa = mk("div"); p2.corpo.append(caixa);
    const ops = [["pct", "% MLT"], ["mw", "MWmed"]];
    const tabMes = un => {
      guardar("un", un);
      const fmt = (v, k, mm) => (v == null ? "—" : un === "mw" ? n(v / 100 * mltDe(k, mm)) : n(v));
      const cm = mm => (mm === M1 ? " hyd-m1" : "");
      caixa.innerHTML = `<div class="rolagem"><table class="hyd-tab hyd-tabmes"><thead><tr><th>${un === "mw" ? "MWmed" : "% da MLT"}</th>${ALVOS.map(mm => `<th class="n${cm(mm)}" data-mm="${mm}">${rot(mm)}</th>`).join("")}</tr></thead><tbody>` +
        SEIS.map(k => `<tr class="hyd-ini" data-k="${k}"><td><b>${k}</b> <small>modelo</small></td>${ALVOS.map(mm => `<td class="n${cm(mm)}">${fmt(pM(k, mm) && pM(k, mm).media, k, mm)}</td>`).join("")}</tr>` +
          `<tr data-k="${k}"><td><small class="hyd-sim">similares</small></td>${ALVOS.map(mm => `<td class="n hyd-sim${cm(mm)}">${fmt(sM(k, mm) && sM(k, mm).media, k, mm)}</td>`).join("")}</tr>`).join("") + "</tbody></table></div>";
      caixa.querySelectorAll("tbody tr").forEach(tr => Mesa.alvo(tr, `${NOME[tr.dataset.k]} · mês a mês`, subDetalhe(tr.dataset.k)));
      caixa.querySelectorAll("thead th[data-mm]").forEach(th => Mesa.alvo(th, `Sudeste · ${rot(th.dataset.mm)}`, mesDetalhe("SE", th.dataset.mm)));
    };
    const un0 = valido(ler("un", "pct"), ops);
    abasEm(p2.acoes, ops, un0, tabMes, "Unidade"); tabMes(un0);

    // HYD-3 e HYD-4 empilhados
    const st = pilha(g);
    const p3 = painel(st, { cod: "HYD-3", titulo: "Anos similares", unidade: "ENSO mais parecido", tam: "s", ajuda: "similares",
      leg: `Hoje (${rot(R.emissao)}): Niño 3.4 rel. ${n(N3, 2)} na média de 3 meses, ${sn(DN3, 2)} em 3 meses. Os 5 anos na mesma fase com nível (N) e subida (ΔN) mais perto na mesma época. Úmido: ENA nov–abr seguinte, % MLT. Clique num ano.${SIM.calculado_depois ? ` Calculado em ${dataBr(P.gerado_em)}, depois da rodada.` : ""}` });
    const iU = a => U.anos.indexOf(a);
    const t3 = tabela(p3.corpo, [["Ano"], ["N", 1], ["ΔN", 1], ["Dist.", 1], ["Úm. S", 1], ["Úm. N", 1]], SIM.anos.map(s => [`<b class="hyd-sim">${s.ano}</b>`, n(s.n, 2), sn(s.dn, 2), n(s.distancia, 2), n(U.S[iU(s.ano)]), n(U.N[iU(s.ano)])]));
    t3.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `Ano similar ${SIM.anos[i].ano}`, anoDetalhe(SIM.anos[i].ano)));
    const p4 = painel(st, { cod: "HYD-4", titulo: "Onde a recomposição pesa", unidade: "ganho sobre o modelo-v1", tam: "s", ajuda: "desempenho",
      leg: "CRPSS de 1 a 6 meses, 1961–2025, fora da amostra. ▲ ganha com folga estatística; ▼ perde. Clique para o intervalo e a climatologia." });
    const D = P.similares_desempenho, achar = (k, rec) => D.find(d => d.nome === k && d.recorte === rec && d.ref === "PER");
    const celC = d => (!d ? "—" : [`${d.ic05 > 0 ? "▲ " : d.ic95 < 0 ? "▼ " : ""}${sn(d.crpss * 100)}%`, d.ic05 > 0 ? "hyd-bom" : d.ic95 < 0 ? "hyd-ruim" : ""]);
    const ORD = ["S", "N", "SE-sul", "SE", "SE-resto", "NE"];
    const t4 = tabela(p4.corpo, [["Subsistema"], ["El Niño forte", 1], ["Todos os anos", 1]], ORD.map(k => [NOME[k], celC(achar(k, "El Niño forte")), celC(achar(k, "todos"))]));
    t4.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `Recomposição · ${NOME[ORD[i]]}`, recompDetalhe(ORD[i])));
  }

  // =====================================================================================================
  // tela 2 · TRJ Trajetória e histórico
  // =====================================================================================================
  const DIRS = { "para cima": ["hyd-cima", "▲ acima"], "para baixo": ["hyd-baixo", "▼ abaixo"], "sem direção": ["hyd-sem", "sem direção"] };
  const naDir = r => (r.direcao === "para cima" ? r.positivos : r.direcao === "para baixo" ? r.eventos - r.positivos : null);
  function camadaDetalhe(k) {
    return el => {
      const r = VIES.por_nome[k], na = naDir(r);
      QC.pares(el, [["Direção", DIRS[r.direcao][1]], ["Média (p.p. de % MLT)", sn(r.media, 1)], ["Faixa", `${sn(r.minimo, 1)} a ${sn(r.maximo, 1)}`], ["Eventos", na == null ? `${r.positivos} acima · ${r.eventos - r.positivos} abaixo` : `${na} de ${r.eventos} no mesmo sinal`]]);
      par(el, `Realizado menos previsto pela persistência, média de 1 a 6 meses, nas emissões com Niño 3.4 relativo ≥ 1,5. ${r.direcao === "sem direção" ? "Sem direção: menos de 5 dos 6 eventos com o mesmo sinal." : `Nos eventos fortes, o realizado veio ${r.direcao === "para cima" ? "acima" : "abaixo"} do modelo; o tamanho variou muito.`} A camada não altera o número do modelo.`);
      h3(el, `Modelo-v1 para ${NOME[k]}, próximos meses`);
      tabela(el, [["Mês"], ["Média", 1], ["p10–p90", 1], ["Sim.", 1]], ALVOS.slice(0, 6).map(mm => { const p = pM(k, mm), s = sM(k, mm); return [rot(mm), p ? n(p.media) + "%" : "—", p ? `${n(p.p10)}–${n(p.p90)}` : "—", s ? [n(s.media) + "%", "hyd-sim"] : "—"]; }));
      par(el, `Estado: ${ATIVA3 ? "ativa" : "inativa"} pela média de 3 meses (${n(N3, 2)}); ${ATIVAM ? "ativa" : "inativa"} pelo último mês (${nm(N_MES, 2)}).`, "leg");
    };
  }
  function telaTRJ(area) {
    const T26 = T.anos[String(ANO)], iUlt = (() => { let i = -1; T26.S.forEach((v, j) => { if (v != null && !T26.parcial[j]) i = j; }); return i; })();
    const contra = k => { const v = T26[k][iUlt], f = T.fortes.map(a => T.anos[String(a)][k][iUlt]).filter(q => q != null); return { v, lo: Math.min(...f), hi: Math.max(...f) }; };
    const cS = contra("S"), cN = contra("N");
    Mesa.decisao(area, [
      { r: "Camada de El Niño forte", v: ATIVA3 ? "Ativa" : ATIVAM ? "Só no mês" : "Inativa", d: `3 meses ${n(N3, 2)} · ${rot(I.ultimo_mes_ersst)} ${nm(N_MES, 2)} · limiar 1,50`, tom: ATIVA3 || ATIVAM ? "sobe" : "neutro", principal: true },
      ...["S", "SE-sul", "N"].map(k => { const r = VIES.por_nome[k], na = naDir(r); return { r: `${NOME[k]} · desvio nos fortes`, v: DIRS[r.direcao][1], d: `${na == null ? `${r.positivos}+ ${r.eventos - r.positivos}−` : `${na} de ${r.eventos}`} eventos · média ${sn(r.media, 1)} p.p.`, tom: r.direcao === "para cima" ? "sobe" : r.direcao === "para baixo" ? "desce" : "neutro" }; }),
      { r: `Sul ${mesT(iUlt)} × fortes`, v: `${n(cS.v)}%`, d: `fortes no mesmo mês: ${n(cS.lo)}–${n(cS.hi)}%` },
      { r: `Norte ${mesT(iUlt)} × fortes`, v: `${n(cN.v)}%`, d: `fortes no mesmo mês: ${n(cN.lo)}–${n(cN.hi)}%` },
    ]);
    const g = Mesa.grade(area);

    // HYD-5 · trajetória
    const ops = [["SE-sul", "SE-sul"], ["SE-resto", "SE-resto"], ["SE", "SE"], ["S", "Sul"], ["NE", "NE"], ["N", "Norte"]];
    const st = { sub: valido(ler("trj.sub", "SE"), ops), grupo: valido(ler("trj.grupo", "sim"), [["sim"], ["fortes"]]), disp: ler("trj.disp", "0") === "1", arm: ler("trj.arm", "0") === "1", ano: null };
    const p5 = painel(g, { cod: "HYD-5", titulo: "2026 ao lado dos anos de comparação", unidade: "% MLT · jul a jun+1", tam: "xl", ajuda: "ler-trj",
      leg: "Cada linha cinza é um ano de comparação, de julho do ano do evento a junho de dois anos depois. 2026 segue com o realizado e, a partir da rodada, com o modelo-v1 e a recomposição (média das mesmas linhas sobre o normal de hoje). Faixas claras: períodos úmidos. Clique num mês ou num ano para o detalhe." });
    const barra = mk("div", "hyd-barra"); p5.corpo.append(barra);
    const caixa = mk("div"); p5.corpo.append(caixa);
    const rodape = mk("div", "hyd-barra"); p5.corpo.append(rodape);
    const legT = mk("div"); p5.corpo.append(legT);
    const red = () => {
      guardar("trj.sub", st.sub); guardar("trj.grupo", st.grupo); guardar("trj.disp", st.disp ? "1" : "0"); guardar("trj.arm", st.arm ? "1" : "0");
      desenhar(caixa, (svg, W, H) => trajetoria(svg, W, H, st, (i, { L }) => abrir(`${NOME[st.sub]} · ${mesT(i)}`, el => {
        tabela(el, [["Série"], ["% MLT", 1]], L.map(([a, b, c]) => [`<i class="hyd-q" style="background:${c}"></i>${a}`, b]));
        par(el, "Anos de comparação em % da MLT da época; modelo-v1 e similares sobre o normal de hoje.", "leg");
      })), 385, "Trajetórias mensais");
      const anos = st.grupo === "sim" ? ANOS_SIM : T.fortes;
      rodape.innerHTML = `<span class="hyd-rot">${st.grupo === "sim" ? "Anos similares" : "El Niños fortes"}:</span>`;
      anos.forEach(a => {
        const b = mk("button", "hyd-chip" + (st.ano === a ? " ativo" : ""), String(a)); b.type = "button"; rodape.append(b);
        Mesa.alvo(b, `Ano ${a}`, anoDetalhe(a));
        b.addEventListener("click", () => { st.ano = st.ano === a ? null : a; red(); });
      });
      legT.innerHTML = legHtml([["var(--bar-pers)", "Anos de comparação", "l"], ["var(--hyd-2026)", "2026 (último mês parcial)", "l"], ["var(--accent)", "Modelo-v1", "l"], ["var(--hyd-sim)", "Recomposição pelos similares", "t"], ...(st.disp ? [["color-mix(in srgb, var(--hyd-sim) 25%, transparent)", "Faixa dos similares (mín.–máx.)"]] : []), ...(st.arm ? [["var(--hyd-2026)", "ENA armazenável (pontilhado)", "t"]] : []), ["var(--vazio)", "Períodos úmidos"]]);
    };
    abasEm(p5.acoes, ops, st.sub, v => { st.sub = v; red(); }, "Subsistema ou bloco");
    abasEm(barra, [["sim", "Anos similares"], ["fortes", "El Niños fortes"]], st.grupo, v => { st.grupo = v; st.ano = null; red(); }, "Anos de comparação", false);
    chave(barra, "Dispersão", st.disp, on => { st.disp = on; red(); });
    chave(barra, "ENA armazenável", st.arm, on => { st.arm = on; red(); });
    red();

    // HYD-6 · camada de El Niño forte
    const pilhaT = pilha(g);
    const p6 = painel(pilhaT, { cod: "HYD-6", titulo: "Camada de El Niño forte", unidade: "desvio da persistência, p.p.", tam: "s", ajuda: "camada",
      leg: "Realizado − persistência, média de 1 a 6 meses, nos 6 eventos com Niño 3.4 rel. ≥ 1,5. Direção com 5 ou 6 de 6 no mesmo sinal. Não altera o número. Clique numa linha." });
    p6.corpo.insertAdjacentHTML("beforeend", `<div class="hyd-estados"><span class="hyd-estado${ATIVA3 ? " ativo" : ""}">${ATIVA3 ? "Ativa" : "Inativa"} · 3 meses</span>${ATIVAM != null ? `<span class="hyd-estado${ATIVAM ? " ativo" : ""}">${ATIVAM ? "Ativa" : "Inativa"} · último mês</span>` : ""}</div>` +
      `<p class="hyd-ins-p num">Rodada ${n(N3, 2)} (3 m) · ${rot(I.ultimo_mes_ersst)} ${nm(N_MES, 2)} · limiar 1,50</p>`);
    const ORDV = ["S", "SE-sul", "SE-resto", "SE", "N", "NE"];
    const t6 = tabela(p6.corpo, [["Subsistema"], ["Direção"], ["Média", 1], ["Faixa", 1], ["Ev.", 1]], ORDV.map(k => {
      const r = VIES.por_nome[k], na = naDir(r);
      return [NOME[k], [DIRS[r.direcao][1], DIRS[r.direcao][0]], sn(r.media, 1), `${sn(r.minimo, 0)} a ${sn(r.maximo, 0)}`, na == null ? [`${r.positivos}+ ${r.eventos - r.positivos}−`, "hyd-fraco"] : `${na}/${r.eventos}`];
    }));
    t6.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `Camada · ${NOME[ORDV[i]]}`, camadaDetalhe(ORDV[i])));

    // HYD-8 · contribuição de cada bacia
    const opsG = [["SE", "Sudeste"], ["S", "Sul"], ["NE", "Nordeste"], ["N", "Norte"]];
    const sg = { sub: valido(ler("gw.sub", "SE"), opsG), modo: ler("gw.modo", "blocos") === "bacias" ? "bacias" : "blocos" };
    const p7 = painel(g, { cod: "HYD-8", titulo: "Contribuição de cada bacia", unidade: "GWmed acima ou abaixo da MLT", tam: "full", ajuda: "ler-trj" });
    const barraG = mk("div", "hyd-barra"); p7.corpo.append(barraG);
    const legG = mk("div"); p7.corpo.append(legG);
    const caixaG = mk("div"); p7.corpo.append(caixaG);
    const notaG = mk("p", "leg"); p7.el.append(notaG);
    const modoG = mk("div", "abas"); modoG.setAttribute("role", "group"); modoG.setAttribute("aria-label", "Detalhe"); barraG.append(modoG);
    modoG.innerHTML = '<button type="button" data-v="blocos"></button><button type="button" data-v="bacias">Bacias</button>';
    modoG.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b || b.disabled) return; sg.modo = b.dataset.v; redG(); });
    const NOTAS_G = {
      SE: { blocos: "SE-sul: Paranapanema, Tietê e Paraná incremental; SE-resto: o restante. Os dois blocos somam exatamente o SE, e o modelo-v1 projeta cada um.", bacias: "Bacias inteiramente no SE; \"demais\" fecha a soma (Paraíba do Sul, Doce, Paraguai e as partes do SE no Amazonas, Tocantins e São Francisco). Projeção só no total." },
      S: { blocos: "Subsistema fechado: anomalia total em GWmed, com a projeção do modelo-v1. Em \"Bacias\", a mesma anomalia aberta pelas principais bacias.", bacias: "Iguaçu, Uruguai e Jacuí ficam inteiras no Sul; \"demais\" (Capivari, Itajaí e parte do Paranapanema) fecha a soma. Projeção só no total." },
      NE: { blocos: "Subsistema fechado: anomalia total em GWmed, com a projeção do modelo-v1. Em \"Bacias\", a mesma anomalia aberta pelas principais bacias.", bacias: "São Francisco como bacia inteira (inclui Três Marias, que fica no SE); \"demais\" fecha a soma com o NE e pode ser negativo por isso. Projeção só no total." },
      N: { blocos: "O Norte não é aberto por bacia: Tocantins e Amazonas são divididos entre Norte e Sudeste, e o ONS não publica a parte de cada um. Barras = total do subsistema, com a projeção do modelo-v1." },
    };
    const redG = () => {
      if (sg.sub === "N") sg.modo = "blocos";
      guardar("gw.sub", sg.sub); guardar("gw.modo", sg.modo);
      const [b0, b1] = modoG.querySelectorAll("button");
      b0.textContent = sg.sub === "SE" ? "Blocos" : "Subsistema"; b1.disabled = sg.sub === "N";
      b1.title = sg.sub === "N" ? "Tocantins e Amazonas são divididos entre Norte e Sudeste; o ONS não publica a parte de cada um." : "";
      modoG.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === sg.modo)));
      legG.innerHTML = legHtml(gruposGW(sg.sub, sg.modo).map(([, t, c]) => [c, t])).replace("</div>", '<span><i class="hyd-circ cheio"></i>Total do subsistema</span><span><i class="hyd-tracejado"></i>Projetado (modelo-v1)</span></div>');
      notaG.textContent = (NOTAS_G[sg.sub][sg.modo] || NOTAS_G[sg.sub].blocos) + " Clique num mês para os números.";
      desenhar(caixaG, (svg, W, H) => contribuicao(svg, W, H, sg.sub, sg.modo), 230, "Contribuição de cada bacia em GWmed");
    };
    abasEm(p7.acoes, opsG, sg.sub, v => { sg.sub = v; redG(); }, "Subsistema");
    redG();

    // HYD-7 · Niño 3.4 relativo
    const opsE = [["sim", "+ similares"], ["so", "Só 2026"]];
    let eSim = valido(ler("enso", "sim"), opsE);
    const p8 = painel(pilhaT, { cod: "HYD-7", titulo: "Niño 3.4 relativo", unidade: "°C", tam: "s", ajuda: "camada",
      leg: "ERSST v6, tipo RONI. Similares no mesmo calendário, com 9 meses a mais." });
    const caixaE = mk("div"); p8.corpo.append(caixaE);
    const legE = mk("div"); p8.corpo.append(legE);
    const redE = v => { eSim = v; guardar("enso", v);
      legE.innerHTML = legHtml([["var(--accent)", "Mensal", "l"], ["var(--ink)", "Média de 3 meses", "l"], ...(v === "sim" ? [["var(--bar-pers)", "Similares (mensal)", "l"]] : []), ["var(--ink-3)", "Limiar 1,5", "t"]]);
      desenhar(caixaE, (svg, W, H) => ensoGraf(svg, W, H, v === "sim"), 165, "Niño 3.4 relativo"); };
    abasEm(p8.acoes, opsE, eSim, redE, "Anos similares no gráfico"); redE(eSim);

    // HYD-9 · cada período úmido
    const filtros = new Set((ler("umido", "sim") || "").split(",").filter(Boolean));
    const p9 = painel(g, { cod: "HYD-9", titulo: "Os anos no histórico do período úmido", unidade: "ENA nov–abr, % MLT", tam: "full", ajuda: "ler-trj",
      leg: "Cada barra é o período úmido que começa em novembro do ano indicado. Os botões escolhem os anos em destaque (pode marcar mais de um). Fase pelo Niño 3.4 relativo médio de out–dez. Clique numa barra para o ano no inspetor." });
    const fb = mk("div", "abas"); fb.setAttribute("role", "group"); fb.setAttribute("aria-label", "Anos em destaque");
    [["sim", "Anos similares"], ["enf", "El Niño forte"], ["lnf", "La Niña forte"]].forEach(([v, t]) => { const b = mk("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(filtros.has(v))); fb.append(b); });
    p9.acoes.prepend(fb);
    const multi = mk("div", "hyd-multi seis"); p9.corpo.append(multi);
    p9.corpo.insertAdjacentHTML("beforeend", legHtml([["var(--hyd-sim)", "Anos similares"], ["var(--hyd-azul)", "El Niño forte"], ["var(--hyd-laranja)", "La Niña forte (≤ −1,0)"], ["var(--ink-3)", "100% da MLT", "t"]]));
    const escala = Math.max(...SEIS.flatMap(k => U[k]).filter(v => v != null));
    const corU = i => { const a = U.anos[i]; if (filtros.has("sim") && ANOS_SIM.includes(a)) return "var(--hyd-sim)"; if (filtros.has("enf") && U.fase[i] === "El Niño forte") return "var(--hyd-azul)"; if (filtros.has("lnf") && U.fase[i] === "La Niña forte") return "var(--hyd-laranja)"; return null; };
    const rotU = i => `${ANOS_SIM.includes(U.anos[i]) ? "ano similar · " : ""}${U.fase[i] !== "outro" ? U.fase[i] + " · " : ""}Niño 3.4 out–dez ${nm(U.enso[i], 2)}`;
    const redU = () => {
      guardar("umido", [...filtros].join(","));
      multi.replaceChildren();
      SEIS.forEach(k => {
        const d = mk("div", "hyd-mini", `<div class="hyd-mini-cab"><b class="hyd-marca" style="--c:${COR[k]}">${k === "SE" ? "Sudeste (agregado)" : NOME[k]}</b></div>`); multi.append(d);
        grafico(d, (svg, W, H) => umidoGraf(svg, W, H, U[k], U.anos, corU, rotU, escala, NOME[k]), undefined, `Período úmido: ${NOME[k]}`).style.height = "150px";
      });
    };
    fb.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); if (on) filtros.add(b.dataset.v); else filtros.delete(b.dataset.v); redU(); });
    redU();
  }

  // =====================================================================================================
  // tela 3 · CLI Indicadores climáticos
  // =====================================================================================================
  const SELO = { cenario: ["hyd-selo cenario", "Entra no cenário", "cenário"], teste: ["hyd-selo teste", "Em teste (modelo-sombra)", "em teste"], contexto: ["hyd-selo", "Só contexto", "contexto"], referencia: ["hyd-selo", "Referência oficial", "referência"] };
  const F = {
    cptec: ["CPTEC/INPE, Painel El Niño (boletim mensal)", "https://clima.cptec.inpe.br/gpc/pdf/painel_el_nino_boletim_mensal_no_02.pdf"],
    ana: ["ANA, Painel El Niño (jun/2026)", "https://www.gov.br/ana/pt-br/assuntos/noticias-e-eventos/noticias/ana-reforca-monitoramento-de-rios-e-reservatorios-diante-da-chegada-do-el-nino/painel-el-nino-junho-26.pdf"],
    epcp: ["Frontiers in Earth Science (2024): El Niño do leste × do centro e a chuva na América do Sul", "https://frontiersin.org/journals/earth-science/articles/10.3389/feart.2024.1134782/full"],
    dipolo: ["Repositório UFPA: gradiente de TSM do Atlântico e chuva no Nordeste", "https://www.repositorio.ufpa.br/bitstream/2011/6310/1/Artigo_ModelosAcopladosIPCCAR4.pdf"],
    zcas: ["Annales Geophysicae (2008): TSM do Atlântico Sul subtropical e a chuva na América do Sul", "https://angeo.copernicus.org/articles/26/3457/2008"],
    iod: ["Atmosphere/MDPI (2021): Dipolo do Índico e a chuva na América do Sul", "https://www.mdpi.com/2073-4433/12/11/1437"],
    aao: ["Repositório UFSC: Oscilação Antártica e a chuva no Sul do Brasil (2001–2020)", "https://repositorio.ufsc.br/handle/123456789/233966"],
    pdo: ["International Journal of Climatology: a PDO modula as teleconexões do ENSO na América do Sul", "https://openpolar.no/Record/crwiley:10.1002%2Fjoc.1824"],
    amo: ["Water Resources Research (2024): AMO, PDO e as vazões no Brasil", "https://cris.unibo.it/bitstream/11585/1012402/1/2024_Chagas_WaterResourcesResearch_2.pdf"],
    cpc_oni: ["CPC/NOAA: ONI e RONI", "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/"],
    cpc_prob: ["CPC/NOAA: probabilidades oficiais do ENSO", "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities/"],
    psl: ["NOAA PSL: séries de índices climáticos", "https://psl.noaa.gov/data/timeseries/month/"],
    ersst: ["NOAA ERSST v6 (temperatura da superfície do mar)", "https://psl.noaa.gov/data/gridded/data.noaa.ersst.v6.html"],
  };
  const cita = (...ks) => ks.map(k => `<a href="${F[k][1]}" target="_blank" rel="noopener">${F[k][0]}</a>`).join("; ");
  const faixaF = (v, lim, alto, baixo, meio = "Perto do normal") => (v >= lim ? alto : v <= -lim ? baixo : meio);
  const INFO = [
    { k: "nino34_rel", g: "pacifico", nome: "Niño 3.4 relativo", unid: "°C", fase: faseEnso, lims: [0.5, 1.5, -0.5, -1.0],
      oque: "Anomalia da temperatura da superfície do mar no Pacífico equatorial central (5°S–5°N, 170°W–120°W) menos a anomalia média de todos os trópicos. Descontar o aquecimento comum dos trópicos é a ideia do RONI, que o CPC passou a usar para a força dos eventos. Calculado por nós na ERSST v6 desde 1850; reproduz o RONI oficial com correlação de 0,999.",
      lit: `El Niño traz chuva acima do normal no Sul do Brasil e em parte de MS, SP e sul de MG, e chuva abaixo no Norte e no Nordeste (${cita("cptec", "ana")}).`,
      papel: "É o índice central do estudo: define os anos similares, a camada de El Niño forte e o regime do modelo-sombra. No número do modelo-v1 não entra (o número é a persistência)." },
    { k: "roni", g: "pacifico", nome: "RONI (oficial)", unid: "°C", fase: faseEnso, lims: [0.5, 1.5, -0.5, -1.0],
      oque: "Índice oficial do CPC para a força do ENSO: a média de 3 meses do Niño 3.4 relativo (ERSST v6). O valor mostrado é o do trimestre centrado no mês indicado.",
      lit: `Mesma leitura do Niño 3.4 relativo (${cita("cpc_oni")}).`,
      papel: "Referência oficial para conferir o nosso cálculo e para a previsão do CPC, que é verificada pelo RONI." },
    { k: "oni", g: "pacifico", nome: "ONI (oficial)", unid: "°C", fase: faseEnso, lims: [0.5, 1.5, -0.5, -1.0],
      oque: "Índice tradicional do CPC: média de 3 meses da anomalia do Niño 3.4, sem descontar os trópicos. Com o aquecimento dos oceanos, o ONI tende a mostrar eventos mais fortes que o RONI (2026: ONI 2,16 contra RONI 1,69 em jul–set).",
      lit: `É o índice mais citado no noticiário e nos boletins (${cita("cpc_oni")}).`,
      papel: "Referência. Pelo ONI, 2023 seria El Niño forte; pelo índice relativo, moderado. O estudo usa o relativo." },
    { k: "nino12", g: "pacifico", nome: "Niño 1+2", unid: "°C", fase: v => faixaF(v, 0.5, v >= 2 ? "Pacífico leste muito quente" : "Pacífico leste quente", "Pacífico leste frio"), lims: [0.5, -0.5],
      oque: "Anomalia de temperatura do mar junto à costa do Peru e do Equador (10°S–0, 90°W–80°W). Mostra se o El Niño está concentrado no leste do Pacífico (\"El Niño costeiro\") ou no centro.",
      lit: `O El Niño do leste do Pacífico tem o padrão clássico mais marcado (chuva no sudeste da América do Sul); o El Niño do centro tem efeito mais fraco e às vezes oposto nessa região (${cita("epcp")}).`,
      papel: "Só contexto: entrou nas correlações, mas não nos modelos. Em 2026 está no maior valor desde 1950, o que indica um evento do tipo leste." },
    { k: "soi", g: "pacifico", nome: "SOI (Oscilação Sul)", unid: "padronizado", fase: v => (v <= -1 ? "Atmosfera em modo El Niño" : v <= -0.5 ? "Tendendo a El Niño" : v >= 1 ? "Atmosfera em modo La Niña" : v >= 0.5 ? "Tendendo a La Niña" : "Neutro"), lims: [0.5, -0.5],
      oque: "Diferença padronizada de pressão ao nível do mar entre Taiti e Darwin: a parte atmosférica do ENSO. Negativo = El Niño (ventos alísios enfraquecidos).",
      lit: `Confirma se a atmosfera está acoplada ao aquecimento do oceano; um El Niño com SOI muito negativo costuma ter impactos mais consistentes (${cita("cpc_oni")}).`,
      papel: "Só contexto: é redundante com o Niño 3.4 nos testes." },
    { k: "tna", g: "atlantico", nome: "Atlântico Norte tropical (TNA)", unid: "°C", fase: v => faixaF(v, 0.25, "Mais quente que o normal", "Mais frio que o normal"), lims: [0.25, -0.25],
      oque: "Anomalia de temperatura do mar no Atlântico tropical norte (5,5°N–23,5°N, 57,5°W–15°W). Calculado por nós na ERSST v6; reproduz o índice da NOAA (PSL) com correlação de 0,96.",
      lit: `Junto com o Atlântico Sul, define o gradiente que posiciona a ZCIT, a faixa de chuva tropical do Atlântico (${cita("dipolo")}).`,
      papel: "Só contexto: isolado, não teve relação significativa com a ENA. O que importa é o gradiente." },
    { k: "tsa", g: "atlantico", nome: "Atlântico Sul tropical (TSA)", unid: "°C", fase: v => faixaF(v, 0.25, "Mais quente que o normal", "Mais frio que o normal"), lims: [0.25, -0.25],
      oque: "Anomalia de temperatura do mar no Atlântico tropical sul (20°S–0, 30°W–10°E). Calculado por nós na ERSST v6.",
      lit: `Atlântico Sul mais quente puxa a ZCIT para o sul e favorece chuva no norte do Nordeste em fev–mai (${cita("dipolo")}).`,
      papel: "Só contexto, pelo mesmo motivo do TNA." },
    { k: "grad_atl", g: "atlantico", nome: "Gradiente do Atlântico (TNA − TSA)", unid: "°C", fase: v => (v > 0.25 ? "Norte mais quente: ZCIT ao norte" : v < -0.25 ? "Sul mais quente: ZCIT ao sul" : "Sem gradiente marcado"), lims: [0.25, -0.25],
      oque: "Diferença entre o Atlântico tropical norte e o sul (o \"dipolo do Atlântico\"). Positivo: norte mais quente.",
      lit: `Gradiente positivo afasta a ZCIT do Brasil e reduz a chuva no norte do Nordeste e na Amazônia oriental; negativo faz o contrário (${cita("dipolo")}).`,
      papel: "Em teste: é a segunda variável de maior peso no modelo do Norte (T7), que está no modelo-sombra de 2026/27. Positivo reduz a ENA do Norte." },
    { k: "atl_sul_se", g: "atlantico", nome: "Atlântico Sul na costa do Sudeste", unid: "°C", fase: v => faixaF(v, 0.25, "Mais quente que o normal", "Mais frio que o normal"), lims: [0.25, -0.25],
      oque: "Anomalia de temperatura do mar entre 30°S–20°S e 50°W–40°W, em frente ao Sudeste. Definição própria deste estudo (não é um índice oficial), calculada na ERSST v6.",
      lit: `A temperatura do Atlântico Sul subtropical influencia a posição da ZCAS, a faixa de chuva de verão do Sudeste, e pode pesar mais que o ENSO nesse ponto (${cita("zcas")}).`,
      papel: "Só contexto: o teste multivariado deu peso perto de zero em todos os subsistemas." },
    { k: "dmi", g: "indico", nome: "Dipolo do Índico (DMI/IOD)", unid: "°C", fase: v => (v >= 0.4 ? "IOD positivo" : v <= -0.4 ? "IOD negativo" : "Neutro"), lims: [0.4, -0.4],
      oque: "Diferença de temperatura do mar entre o oeste (50°E–70°E, 10°S–10°N) e o sudeste do Índico (90°E–110°E, 10°S–0). Positivo acima de 0,4. Calculado por nós na ERSST v6.",
      lit: `IOD positivo foi associado a déficit de chuva na primavera em grande parte do Brasil (2019) e altera a umidade que chega ao Sudeste; o negativo tende ao oposto. Costuma ocorrer junto com o ENSO, o que dificulta separar os efeitos (${cita("iod")}).`,
      papel: "Só contexto: peso pequeno no teste multivariado. Em 2026 está positivo e subindo (percentil 98), junto com o El Niño, como em 1997." },
    { k: "aao", g: "hemisferio", nome: "Oscilação Antártica (AAO/SAM)", unid: "padronizado", fase: v => (v >= 1 ? "Positiva forte" : v >= 0.5 ? "Positiva" : v <= -1 ? "Negativa forte" : v <= -0.5 ? "Negativa" : "Neutra"), lims: [0.5, -0.5],
      oque: "Padrão de pressão entre as latitudes médias e a Antártica (CPC, desde 1979). Muda a trajetória das frentes frias no Sul.",
      lit: `Fase negativa associada a chuva acima do normal no Sul do Brasil no verão e no outono; a frequência de frentes frias varia com a fase e a estação (${cita("aao")}).`,
      papel: "Só contexto: sem relação significativa com a ENA nos testes. A série começa em 1979, o que limita a amostra. Varia muito de um mês para outro." },
    { k: "pdo", g: "decadas", nome: "Oscilação Decenal do Pacífico (PDO)", unid: "padronizado", fase: v => (v >= 0.5 ? "Positiva (fase quente)" : v <= -0.5 ? "Negativa (fase fria)" : "Neutra"), lims: [0.5, -0.5],
      oque: "Padrão de temperatura do mar no Pacífico Norte que muda de fase a cada 20 a 30 anos (NCEI, ERSST v5).",
      lit: `Quando PDO e ENSO estão na mesma fase, as teleconexões do ENSO com a chuva na América do Sul ficam mais fortes; em fases opostas, mais fracas (${cita("pdo")}).`,
      papel: "Só contexto. Em 2026 a PDO está negativa (−1,55) com um El Niño forte: fases opostas, o que pela literatura atenuaria os impactos. O filtro por PDO ainda não foi testado (fila de testes)." },
    { k: "amo_rel", g: "decadas", nome: "Oscilação Multidecenal do Atlântico (AMO, relativa)", unid: "°C", fase: v => faixaF(v, 0.1, "Fase quente", "Fase fria"), lims: [0.1, -0.1],
      oque: "Temperatura do Atlântico Norte (0–60°N) menos a média global de 60°S a 60°N: remove o aquecimento global e deixa a oscilação de 60 a 80 anos. Calculada por nós na ERSST v6.",
      lit: `AMO quente associada a menos chuva no norte do Nordeste em mar–mai; secas e cheias longas nos rios brasileiros acompanham a AMO e a PDO (${cita("amo")}).`,
      papel: "Só contexto: teve correlação negativa com o Nordeste e o Sudeste, mas pode ser coincidência com a queda de ENA desde os anos 1990. Não usada." },
    { k: "amo_ncei", g: "decadas", nome: "AMO (NCEI, sem remover tendência)", unid: "°C", fase: v => faixaF(v, 0.2, "Atlântico Norte quente", "Atlântico Norte frio"), lims: [0.2, -0.2],
      oque: "Anomalia de temperatura do Atlântico Norte (0–60°N) publicada pela NCEI, sem descontar o aquecimento global. Por isso fica em recordes nos anos recentes.",
      lit: `Mesma leitura da AMO relativa, mas misturada com a tendência de aquecimento (${cita("amo")}).`,
      papel: "Referência. Para comparar anos, o estudo usa a versão relativa." },
  ];
  const GRUPOS = [
    { id: "pacifico", nome: "Pacífico", desc: "El Niño e La Niña (ENSO): o principal sinal climático para a ENA, sobretudo no Sul, no SE-sul e no Norte." },
    { id: "atlantico", nome: "Atlântico", desc: "Temperatura do Atlântico tropical e subtropical: posiciona a ZCIT (Norte e Nordeste) e influencia a ZCAS (Sudeste)." },
    { id: "indico", nome: "Índico", desc: "Dipolo do Índico (IOD): efeito remoto sobre a América do Sul, muitas vezes junto com o ENSO." },
    { id: "hemisferio", nome: "Hemisfério Sul", desc: "Oscilação Antártica (AAO): trajetória das frentes frias no Sul." },
    { id: "decadas", nome: "Décadas", desc: "PDO e AMO: oscilações lentas, de décadas, que podem reforçar ou atenuar o ENSO." },
  ];
  const info = k => INFO.find(x => x.k === k);
  const NOTA_TAB = {
    cpc: "Média de 3 meses, com 1 casa como publica o CPC. A cor marca os episódios pelo critério oficial: ±0,5 °C por pelo menos 5 trimestres seguidos; o tom é a intensidade do trimestre. Um episódio em formação só ganha cor quando completa os 5 trimestres. Fonte: CPC/NOAA (ERSST v6).",
    icen: "Média de 3 meses centrada no mês (coluna = trimestre). Cor pelo critério do Índice Costeiro El Niño (ICEN) do ENFEN, do Peru: evento com 3 meses seguidos acima de +0,4 °C (ou abaixo de −1,0 °C). Aplicado à nossa série (ERSST v6, base 1991–2020): não é o ICEN oficial, e os valores podem diferir dos publicados pelo ENFEN.",
    intensidade: "Valor mensal. Sem critério oficial de episódio: a cor só mostra o tamanho do desvio (limiares em múltiplos do desvio-padrão desde 1950, salvo indicação), para ver o histórico de relance.",
  };
  const MESES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const emitida = t => { if (!t) return "—"; const [mes, ano] = t.split(" "); const i = MESES_EN.indexOf(mes); return i < 0 ? t : `${MESL[i]} de ${ano}`; };
  const tendencia = v => (v > 0.1 ? "subindo" : v < -0.1 ? "caindo" : "estável");

  /** histórico mensal de um índice, com limiares, últimos 24 meses e os anos parecidos marcados */
  function serieIndice(svg, W, H, x, d) {
    const v = d.serie.valores, a0 = +d.serie.inicio.slice(0, 4), m0 = +d.serie.inicio.slice(5, 7) - 1;
    let ult = v.length - 1; while (v[ult] == null) ult--;
    const m = { l: 34, r: 8, t: 10, b: 20 }, vals = v.filter(q => q != null), e = eixo(Math.min(...vals, ...x.lims), Math.max(...vals, ...x.lims), 4);
    const xx = i => m.l + i * (W - m.l - m.r) / (v.length - 1), yy = q => m.t + (H - m.t - m.b) * (1 - (q - e.a) / (e.b - e.a));
    gradeY(svg, e, yy, m, W, t => n(t, Math.abs(e.b - e.a) < 4 ? 1 : 0));
    x.lims.forEach(l => S(svg, "line", { x1: m.l, x2: W - m.r, y1: yy(l), y2: yy(l), stroke: "var(--ink-3)", "stroke-dasharray": "3 3", opacity: 0.7 }));
    const decs = []; for (let ano = Math.ceil(a0 / 10) * 10; ano <= a0 + v.length / 12; ano += 10) { const i = (ano - a0) * 12 - m0; if (i >= 0) decs.push([i, ano]); }
    rotulosX(svg, decs.map((_, k) => k), k => xx(decs[k][0]), H - 5, k => decs[k][1], 34);
    S(svg, "polyline", { points: v.map((q, i) => (q == null ? null : `${xx(i)},${yy(q)}`)).filter(Boolean).join(" "), fill: "none", stroke: "var(--ink-3)", "stroke-width": 0.9 });
    S(svg, "polyline", { points: v.map((q, i) => (q == null || i < ult - 23 ? null : `${xx(i)},${yy(q)}`)).filter(Boolean).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2 });
    const mesU = +d.ultimo_mes.slice(5, 7);
    d.parecidos.forEach(p => {
      const i = (p.ano - a0) * 12 + (mesU - 1) - m0; if (i < 0 || i >= v.length || v[i] == null) return;
      const c = S(svg, "path", { d: `M${xx(i)},${yy(v[i]) - 5}l5,5l-5,5l-5,-5z`, fill: "var(--hyd-sim)", stroke: "var(--surface)", "stroke-width": 1 });
      dicaEm(c, `<b>${p.ano}</b> · ${MES[mesU - 1]}<br>média de 3 meses ${sn(p.valor, 2)} (hoje ${sn(d.tres_meses, 2)})`);
    });
    S(svg, "circle", { cx: xx(ult), cy: yy(v[ult]), r: 4, fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 1.5 });
    const guia = S(svg, "line", { y1: m.t, y2: H - m.b, stroke: "var(--ink-2)", opacity: 0 });
    const alvo = S(svg, "rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" });
    svg.insertBefore(alvo, svg.querySelector("path") || null);
    dicaEm(alvo, ev => { const i = colunaDe(svg, ev, W, m, v.length), mm = m0 + i;
      guia.setAttribute("x1", xx(i)); guia.setAttribute("x2", xx(i)); guia.setAttribute("opacity", 0.5);
      return `<b>${MES[mm % 12]}/${a0 + Math.floor(mm / 12)}</b><br>${x.nome}: ${v[i] == null ? "—" : sn(v[i], 2)}`; });
    alvo.addEventListener("pointerleave", () => guia.setAttribute("opacity", 0));
  }
  function indiceDetalhe(k) {
    return el => {
      const x = info(k), d = CI[k], SUBN = { SE: "Sudeste", S: "Sul", NE: "Nordeste", N: "Norte" };
      par(el, `<b>Hoje (${rot(d.ultimo_mes)}):</b> ${sn(d.valor, 2)} ${x.unid} · ${x.fase(d.valor)} · percentil ${n(d.percentil)} desde ${d.serie.inicio.slice(0, 4)}.`);
      QC.pares(el, [["Média de 3 meses", sn(d.tres_meses, 2)], ["Variação em 3 meses", `${seta(d.variacao_3m)} ${sn(d.variacao_3m, 2)}`], ["Mínimo · máximo", `${sn(d.minimo, 2)} · ${sn(d.maximo, 2)}`], ["Papel no estudo", SELO[d.peso][1]]]);
      const g = mk("div"); el.append(g);
      desenhar(g, (svg, W, H) => serieIndice(svg, W, H, x, d), 165, `Histórico de ${x.nome}`);
      const mesTxt = MES[+d.ultimo_mes.slice(5, 7) - 1];
      par(el, `Mensal desde ${rot(d.serie.inicio)}; âmbar: últimos 24 meses; tracejado: limiares de fase; <span class="hyd-sim">◆</span> anos parecidos.`, "leg");
      if (d.parecidos.length) {
        h3(el, `Anos parecidos em ${mesTxt} e o úmido seguinte`);
        tabela(el, [["Ano"], ["Valor", 1], ["SE", 1], ["S", 1], ["NE", 1], ["N", 1]], d.parecidos.map(p => [ANOS_SIM.includes(p.ano) ? `<b class="hyd-sim">${p.ano}</b>` : p.ano, sn(p.valor, 2), ...SUBS.map(s => (p.umido[s] != null ? n(p.umido[s]) + "%" : "—"))]));
        par(el, `Média de 3 meses até ${mesTxt} mais próxima da de hoje (${sn(d.tres_meses, 2)}); ENA de nov a abr seguinte, % da MLT. É leitura, não previsão. Em verde, os anos similares do ENSO.`, "leg");
      }
      h3(el, "O que é"); par(el, x.oque);
      h3(el, "O que a literatura associa ao Brasil"); par(el, x.lit);
      h3(el, "Papel no estudo"); par(el, x.papel);
      if (Object.keys(d.medido).length) {
        h3(el, "O que medimos");
        tabela(el, [["Subsistema"], ["r", 1], ["Índice → ENA"], ["Signif."]], SUBS.filter(s => d.medido[s]).map(s => { const r = d.medido[s]; return [SUBN[s], sn(r.r, 2), `${r.mes_indice} → ${r.mes_alvo}`, r.significativo ? `sim (${r.n_sig})` : "não"]; }));
        par(el, "Correlação de Spearman mais forte entre o índice dos 3 meses até um mês e a ENA de 1 a 6 meses depois, com correção para os milhares de testes do estudo.", "leg");
      }
      if (d.pesos_t7) par(el, `Peso no teste multivariado (T7, efeito em log da ENA por desvio-padrão): ${SUBS.map(s => `${SUBN[s]} ${Object.values(d.pesos_t7[s]).map(v => sn(v, 3)).join(" / ")}`).join(" · ")}.`, "leg");
    };
  }
  /** tabela histórica anos × meses (ou trimestres), com a cor do critério de cada índice */
  function tabelaHistorica(caixa, x, t) {
    const sim = new Set(CL.anos_similares || []), cls = c => (c > 0 ? `q${c}` : c < 0 ? `f${-c}` : "");
    const completo = new Map(t.legenda.map(([c, , r]) => [c, r]));
    const nomeClasse = c => (c ? completo.get(c) : t.criterio === "intensidade" ? "perto do normal" : "sem episódio");
    const leg = t.legenda.map(([c, r]) => `<span><i class="${cls(c)}"></i>${r}</span>`).join("") + (sim.size ? '<span><b class="hyd-sim">◆</b> ano similar</span>' : "");
    const corpo = t.anos.map((a, i) => `<tr><th class="ano${sim.has(a) ? " sim" : ""}" scope="row">${sim.has(a) ? "◆ " : ""}${a}</th>` + t.linhas[i].map(([v, c], j) => `<td class="${cls(c)}" data-i="${i}" data-j="${j}">${v == null ? "" : sn(v, t.casas)}</td>`).join("") + "</tr>").join("");
    caixa.innerHTML = `<div class="hyd-leg-tab">${leg}</div><div class="hyd-caixa-hist"><table class="hyd-hist"><thead><tr><th class="ano">Ano</th>${t.colunas.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${corpo}</tbody></table></div>` +
      `<p class="leg">${NOTA_TAB[t.criterio]}${x.k === "soi" ? " SOI negativo é o lado do El Niño, por isso a cor quente fica nos valores negativos." : ""}${x.k === "nino34_rel" ? " Limiares fixos de 0,5, 1,0, 1,5 e 2,0 °C, os mesmos do ONI." : ""} Ano mais recente no topo.</p>`;
    dicaEm(caixa.querySelector("tbody"), ev => {
      const td = ev.target.closest("td[data-i]");
      if (!td) { const th = ev.target.closest("th"); return th ? `<b>${th.textContent}</b>` : ""; }
      const [v, c] = t.linhas[+td.dataset.i][+td.dataset.j], a = t.anos[+td.dataset.i];
      return v == null ? `<b>${t.colunas[+td.dataset.j]} ${a}</b><br>sem dado` : `<b>${t.colunas[+td.dataset.j]} ${a}</b>${sim.has(a) ? " · ano similar" : ""}<br>${x.nome}: ${sn(v, t.casas)} ${x.unid}<br>${nomeClasse(c)}`;
    });
  }
  /** previsão oficial do CPC em barras empilhadas por trimestre (9 classes de força) */
  const CORES_CPC = ["var(--hyd-frio-3)", "var(--hyd-frio-3)", "var(--hyd-frio-2)", "var(--hyd-frio-1)", "var(--hyd-neutro)", "var(--hyd-quente-1)", "var(--hyd-quente-2)", "var(--hyd-quente-3)", "var(--hyd-quente-4)"];
  const NOMES_CPC = ["La Niña muito forte (≤ −2,0)", "La Niña muito forte", "La Niña forte (−1,5 a −1,0)", "La Niña fraca/moderada (−1,0 a −0,5)", "Neutro", "El Niño fraco (0,5 a 1,0)", "El Niño moderado (1,0 a 1,5)", "El Niño forte (1,5 a 2,0)", "El Niño muito forte (≥ 2,0)"];
  function cpcDetalhe(i) {
    return el => {
      const f = CL.cpc_forca.linhas[i], p = CL.cpc_fases.linhas[i];
      QC.pares(el, [["La Niña", `${p.valores[0]}%`], ["Neutro", `${p.valores[1]}%`], ["El Niño", `<b>${p.valores[2]}%</b>`]]);
      h3(el, "Por intensidade");
      tabela(el, [["Classe (RONI)"], ["Chance", 1]], f.valores.map((v, j) => [`<i class="hyd-q" style="background:${CORES_CPC[j]}"></i>${NOMES_CPC[j]}`, `${v}%`]).reverse());
      par(el, `Emitida em ${emitida(CL.cpc_forca.emitida)} pelo CPC/NOAA. Um RONI acima de 2,0 seria o maior desde 1950 (máximo de 1950–2025: 1,92, fev/1983).`, "leg");
    };
  }
  function cpcGraf(svg, W, H) {
    const FZ = CL.cpc_forca, m = { l: 36, r: 8, t: 8, b: 22 }, bw = (W - m.l - m.r) / FZ.linhas.length, y = v => m.t + (H - m.t - m.b) * (1 - v / 100);
    [0, 25, 50, 75, 100].forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, `${t}%`); });
    FZ.linhas.forEach((l, i) => {
      let base = 0; const x0 = m.l + i * bw + bw * 0.15;
      l.valores.forEach((v, j) => { if (!v) return;
        const r = S(svg, "rect", { x: x0, y: y(base + v), width: bw * 0.7, height: Math.max(0.5, y(base) - y(base + v) - 1), fill: CORES_CPC[j], style: "cursor:pointer" });
        dicaEm(r, `<b>${l.trimestre}</b><br>${NOMES_CPC[j]}: ${v}%<br><span class="hyd-dica-ir">clique: o trimestre no inspetor</span>`);
        r.addEventListener("click", () => abrir(`CPC · ${l.trimestre}`, cpcDetalhe(i)));
        base += v; });
      S(svg, "text", { x: x0 + bw * 0.35, y: H - 6, "text-anchor": "middle", class: "forte" }, l.trimestre);
    });
  }
  function telaCLI(area) {
    const n34 = CI.nino34_rel, g0 = CI.grad_atl, d0 = CI.dmi, pdo = CI.pdo, aao = CI.aao, am = CI.amo_rel;
    const iProx = CL.cpc_forca.linhas.length > 1 ? 1 : 0, prox = CL.cpc_forca.linhas[iProx], proxF = CL.cpc_fases.linhas[iProx];
    const ultEN = CL.cpc_fases.linhas.filter(l => l.valores[2] >= 50).pop();
    const oposta = (pdo.valor <= -0.5 && n34.valor >= 0.5) || (pdo.valor >= 0.5 && n34.valor <= -0.5);
    Mesa.decisao(area, [
      { r: `Niño 3.4 relativo · ${rot(n34.ultimo_mes)}`, v: sn(n34.valor, 2), d: `${faseEnso(n34.valor)} · ${tendencia(n34.variacao_3m)} · percentil ${n(n34.percentil)}`, principal: true },
      { r: `CPC · El Niño em ${prox.trimestre}`, v: `${proxF.valores[2]}%`, d: `${prox.valores[8]}% de RONI ≥ 2,0${ultEN ? ` · provável até ${ultEN.trimestre}` : ""}` },
      { r: "Atlântico · gradiente TNA − TSA", v: sn(g0.valor, 2), d: info("grad_atl").fase(g0.valor) },
      { r: "Índico · DMI", v: sn(d0.valor, 2), d: `${info("dmi").fase(d0.valor)} · percentil ${n(d0.percentil)}` },
      { r: "Décadas · PDO", v: sn(pdo.valor, 2), d: `${info("pdo").fase(pdo.valor)}${oposta ? " · oposta ao ENSO" : ""}` },
      { r: "Hemisfério Sul · AAO", v: sn(aao.valor, 2), d: info("aao").fase(aao.valor) },
    ]);
    const g = Mesa.grade(area);

    // HYD-10 · os 14 índices
    const opsG = [["todos", "Todos"], ...GRUPOS.map(x => [x.id, x.nome])];
    let grupo = valido(ler("grupo", "todos"), opsG);
    let sel = INFO.some(x => x.k === ler("indice", "")) ? ler("indice", "") : "nino34_rel";
    const p10 = painel(g, { cod: "HYD-10", titulo: "Indicadores climáticos", unidade: "14 índices · NOAA", tam: "full", ajuda: "indices",
      leg: `Valores até ${rot(n34.ultimo_mes)} (RONI e ONI: trimestre centrado no mês). Papel no estudo: cenário (define similares e camada), em teste (modelo-sombra), contexto ou referência. 24 meses: minigráfico do último ano e meio. Anos parecidos: média de 3 meses mais próxima da de hoje no mesmo mês (em verde, os anos similares do ENSO). Clique num índice para o gráfico, a literatura e o que medimos; a tabela histórica dele aparece no HYD-13.` });
    const tbox = mk("div", "rolagem"); p10.corpo.append(tbox);
    const SPK = "var(--accent)";
    tbox.innerHTML = `<table class="hyd-tab hyd-indices"><thead><tr><th>Grupo</th><th>Índice</th><th class="n">Hoje</th><th>Fase</th><th class="n">3 meses</th><th class="n">Δ 3 m</th><th class="n">Pct.</th><th>24 meses</th><th>Anos parecidos</th><th>Papel</th></tr></thead><tbody>` +
      GRUPOS.map(G => INFO.filter(x => x.g === G.id).map((x, j) => {
        const d = CI[x.k], [cl, , txt] = SELO[d.peso];
        return `<tr data-k="${x.k}" data-g="${G.id}"${j === 0 ? ' class="hyd-g1"' : ""}><td class="hyd-grp-n" title="${G.desc}">${j === 0 ? G.nome : ""}</td><td>${x.nome}</td><td class="n"><b>${sn(d.valor, 2)}</b>${d.ultimo_mes !== n34.ultimo_mes ? ` <small>${MES[+d.ultimo_mes.slice(5, 7) - 1]}</small>` : ""}</td><td>${x.fase(d.valor)}</td><td class="n">${sn(d.tres_meses, 2)}</td>` +
          `<td class="n ${tom(d.variacao_3m)}">${seta(d.variacao_3m)} ${sn(d.variacao_3m, 2)}</td><td class="n">${n(d.percentil)}</td><td class="hyd-spk"></td>` +
          `<td class="hyd-anos">${d.parecidos.map(p => `<span${ANOS_SIM.includes(p.ano) ? ' class="hyd-sim"' : ""}>${p.ano}</span>`).join(" ")}</td><td><span class="${cl}">${txt}</span></td></tr>`;
      }).join("")).join("") + "</tbody></table>";
    tbox.querySelectorAll("tr[data-k]").forEach(tr => {
      const x = info(tr.dataset.k), d = CI[x.k], v = d.serie.valores.filter(q => q != null).slice(-24);
      const spk = sparkline(tr.querySelector(".hyd-spk"), v, SPK);
      dicaEm(spk, `<b>${x.nome}</b> · últimos 24 meses<br>mín. ${sn(Math.min(...v), 2)} · máx. ${sn(Math.max(...v), 2)} · último ${sn(v[v.length - 1], 2)}`);
      Mesa.alvo(tr, x.nome, indiceDetalhe(x.k));
      tr.addEventListener("click", () => mostrarHist(x.k));
      tr.addEventListener("keydown", ev => { if (ev.key === "Enter") mostrarHist(x.k); });
    });
    const filtrar = v => { grupo = v; guardar("grupo", v); tbox.querySelectorAll("tbody tr").forEach(tr => { tr.hidden = v !== "todos" && tr.dataset.g !== v; }); };
    const abasG = abasEm(p10.acoes, opsG, grupo, filtrar, "Grupo de índices"); filtrar(grupo);

    // HYD-11 · leitura por grupo
    const p11 = painel(g, { cod: "HYD-11", titulo: "Leitura de hoje", unidade: "o que implica para a ENA", tam: "full", ajuda: "indices",
      leg: "Resumo por grupo. Clique no nome do grupo para filtrar a tabela de índices." });
    const forteEN = n34.valor >= 1.5 || (prox && prox.valores[7] + prox.valores[8] >= 50);
    const tn = CI.tna, ts = CI.tsa;
    const LEIT = [
      ["pacifico", `<b>${faseEnso(n34.valor)}</b> e ${tendencia(n34.variacao_3m)}: Niño 3.4 relativo ${sn(n34.valor, 2)} em ${rot(n34.ultimo_mes)}, maior que ${n(n34.percentil)}% dos meses desde 1950. CPC: ${prox.valores[8]}% de chance de passar de 2,0 em ${prox.trimestre}${ultEN ? `; El Niño provável até ${ultEN.trimestre}` : ""}.`,
        forteEN ? "Nos 6 El Niños fortes desde 1961, a ENA do <b>Sul</b> e do <b>SE-sul</b> veio acima do que a persistência previa e a do <b>Norte</b>, abaixo. A direção é confiável, o tamanho não. Os anos similares ganham peso no Sul e no Norte." :
          n34.valor >= 0.5 ? "El Niño mais fraco: o Sul tende a ficar acima do normal, mas o sinal é menor e menos consistente." : n34.valor <= -0.5 ? "La Niña: efeito fraco e disperso na ENA; no histórico, só o Nordeste ficou abaixo do normal na La Niña fraca." : "ENSO neutro: sem sinal climático relevante; vale a persistência.", forteEN],
      ["atlantico", `<b>${info("grad_atl").fase(g0.valor)}</b> (gradiente ${sn(g0.valor, 2)}). Os dois lados do Atlântico tropical estão ${tn.valor > 0.25 && ts.valor > 0.25 ? "quentes" : "perto do normal"} (norte ${sn(tn.valor, 2)}, sul ${sn(ts.valor, 2)}).`,
        g0.valor > 0.25 ? "Tende a reduzir a chuva no norte do Nordeste e a ENA do <b>Norte</b> (é a segunda variável do modelo do Norte em teste)." : g0.valor < -0.25 ? "Tende a favorecer a chuva no norte do Nordeste e a ENA do <b>Norte</b>." : "Sem sinal do Atlântico para o Norte e o Nordeste: nada a acrescentar ao ENSO.", Math.abs(g0.valor) > 0.25],
      ["indico", `<b>${info("dmi").fase(d0.valor)}</b> (${sn(d0.valor, 2)}, ${tendencia(d0.variacao_3m)}; percentil ${n(d0.percentil)}).`,
        d0.valor >= 0.4 ? "A literatura associa o IOD positivo a menos chuva na primavera em grande parte do Brasil; nos nossos testes o peso foi pequeno. Costuma andar junto com o El Niño (como em 1997)." : d0.valor <= -0.4 ? "A literatura associa o IOD negativo a mais chuva no norte do Brasil; nos nossos testes o peso foi pequeno." : "Sem sinal relevante.", false],
      ["hemisferio", `<b>${info("aao").fase(aao.valor)}</b> (${sn(aao.valor, 2)}).`, "Varia muito de um mês para outro e não teve efeito medido na ENA. Fase negativa persistente favoreceria chuva no Sul no verão (literatura).", false],
      ["decadas", `PDO <b>${info("pdo").fase(pdo.valor).toLowerCase()}</b> (${sn(pdo.valor, 2)}); AMO ${info("amo_rel").fase(am.valor).toLowerCase()} (${sn(am.valor, 2)}).`,
        oposta ? "PDO em fase oposta ao ENSO: pela literatura, isso tende a <b>atenuar</b> os impactos do evento. Ainda não testado nos nossos dados." : "Sem combinação que mude a leitura do ENSO.", oposta],
    ];
    const lt = mk("div", "hyd-leitura"); p11.corpo.append(lt);
    LEIT.forEach(([id, estado, implica, forte]) => {
      const G = GRUPOS.find(x => x.id === id), it = mk("div", "hyd-leit-item");
      it.innerHTML = `<button type="button" class="hyd-leit-g" title="${G.desc}">${G.nome} ›</button><p>${estado}</p><p class="hyd-implica${forte ? " forte" : ""}">${implica}</p>`;
      it.querySelector("button").addEventListener("click", () => { abasG.querySelector(`button[data-v="${id}"]`).click(); p10.el.scrollIntoView({ block: "start" }); });
      lt.append(it);
    });

    // HYD-12 · previsão oficial do CPC (gráfico e números juntos)
    const p12 = painel(g, { cod: "HYD-12", titulo: "Previsão oficial do ENSO (CPC)", unidade: "chance por trimestre", tam: "l", ajuda: "cpc",
      leg: `Emitida em ${emitida(CL.cpc_fases.emitida)} pelo CPC/NOAA. Trimestres móveis (OND = out–nov–dez…). Verificada pelo RONI; acima de 2,0 seria o maior desde 1950. Clique numa barra ou linha para o trimestre.` });
    const gb12 = mk("div"); p12.corpo.append(gb12); desenhar(gb12, cpcGraf, 175, "Previsão do CPC por trimestre");
    p12.corpo.insertAdjacentHTML("beforeend", legHtml([[CORES_CPC[3], "La Niña"], [CORES_CPC[4], "Neutro"], [CORES_CPC[5], "El Niño fraco"], [CORES_CPC[6], "moderado"], [CORES_CPC[7], "forte"], [CORES_CPC[8], "muito forte (≥ 2,0)"]]));
    const t12 = tabela(p12.corpo, [["Trim."], ...CL.cpc_fases.linhas.map(l => [l.trimestre, 1])], [["La Niña", ...CL.cpc_fases.linhas.map(l => `${l.valores[0]}%`)], ["Neutro", ...CL.cpc_fases.linhas.map(l => `${l.valores[1]}%`)],
      ["<b>El Niño</b>", ...CL.cpc_fases.linhas.map(l => `<b>${l.valores[2]}%</b>`)], ["RONI ≥ 2,0", ...CL.cpc_forca.linhas.map(l => `${l.valores[8]}%`)]], "hyd-cpc");
    t12.querySelectorAll("thead th").forEach((th, i) => { if (i) Mesa.alvo(th, `CPC · ${CL.cpc_fases.linhas[i - 1].trimestre}`, cpcDetalhe(i - 1)); });

    // HYD-13 · histórico em tabela do índice selecionado
    const p13 = painel(g, { cod: "HYD-13", titulo: "Histórico em tabela", unidade: "—", tam: "l", ajuda: "indices" });
    const hb = mk("div"); p13.corpo.append(hb);
    function mostrarHist(k) {
      sel = k; guardar("indice", k);
      const x = info(k), d = CI[k];
      p13.cab.querySelector(".p-uni").textContent = `${x.nome}${d.tabela ? ` · ${d.tabela.anos[d.tabela.anos.length - 1]}–${d.tabela.anos[0]}` : ""}`;
      tbox.querySelectorAll("tr[data-k]").forEach(tr => tr.classList.toggle("hyd-atual", tr.dataset.k === k));
      if (d.tabela) tabelaHistorica(hb, x, d.tabela);
      else hb.innerHTML = `<p class="hyd-ins-p">${x.nome}: sem tabela histórica (definição própria do estudo, sem critério de episódio). O gráfico mensal está no inspetor.</p>`;
    }
    mostrarHist(sel);
  }

  // =====================================================================================================
  // tela 4 · FUN Fundamentos
  // =====================================================================================================
  const NOME_BACIA = b => (b === "PARANA" ? "Paraná (incremental)" : b.toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase())
    .replace("Sao", "São").replace("Paraiba", "Paraíba").replace("Paranaiba", "Paranaíba").replace("Iguacu", "Iguaçu").replace("Jacui", "Jacuí")
    .replace("Itajai", "Itajaí").replace("Parnaiba", "Parnaíba").replace("Paraguacu", "Paraguaçu").replace("Tiete", "Tietê").replace("Vit", "Vitória").replace(" Do ", " do "));
  const legSvg = (svg, itens, x0, y0, passo) => itens.forEach(([t, cor], j) => { S(svg, "rect", { x: x0 + j * passo, y: y0, width: 10, height: 10, fill: cor }); S(svg, "text", { x: x0 + 14 + j * passo, y: y0 + 9 }, t); });
  const CLASSES = ["El Niño forte", "El Niño moderado", "El Niño fraco", "Neutro", "La Niña"];
  const CURTO_C = { "El Niño forte": "EN forte", "El Niño moderado": "EN mod.", "El Niño fraco": "EN fraco", Neutro: "Neutro", "La Niña": "La Niña" };
  const corUA = c => (c === "El Niño forte" ? "var(--hyd-azul)" : c === "La Niña forte" ? "var(--hyd-laranja)" : null);
  const miniF = (caixa, titulo) => { const d = mk("div", "hyd-mini", `<div class="hyd-mini-cab">${titulo}</div>`); caixa.append(d); return d; };

  const CAPS = [
    { n: 1, titulo: "O normal mudou", uni: "ENA anual e normal de 30 anos, % MLT", ajuda: "normal",
      curto: "Nordeste caiu, Sul subiu: o normal de 30 anos é a régua do modelo.",
      conclusao: "O <strong>Nordeste</strong> tinha normal de 112% da MLT até 1990; hoje (1995–2024) é <strong>73%</strong>, e a última década ficou em 57%. O <strong>Sul</strong> fez o caminho inverso: de 82% (1931–1960) para <strong>114%</strong>. O <strong>Sudeste</strong> oscilou entre 96% e 105%, mas a última década ficou em 85%; o <strong>Norte</strong> caiu para 84% na última década. Um ano \"na MLT\" hoje é um ano acima do normal no Nordeste e abaixo do normal no Sul.",
      leg: "Barras: ENA do ano (jan–dez); linha âmbar: média dos 30 anos até o ano; tracejado: 100% da MLT. A MLT é a média de 1931 a 2024. O que pode explicar (citado pelo ONS e pela literatura, não medido neste estudo): no Nordeste, a seca no São Francisco desde 2012 e o aumento do uso consuntivo; no Sul, a tendência de mais chuva desde os anos 1970; no Sudeste e no Norte, a sequência de anos secos depois de 2014.",
      montar(box, aside) {
        const Aa = FU.anual, vals = SUBS.flatMap(k => Aa[k].filter(v => v != null)), q = mk("div", "hyd-multi dois"); box.append(q);
        SUBS.forEach(k => {
          const d = miniF(q, `<b class="hyd-marca" style="--c:${COR[k]}">${NOME[k]}</b><span class="num">${n(FU.normais["1961–1990"][k])}% → ${n(FU.normais["1995–2024"][k])}%</span>`);
          grafico(d, (svg, W, H) => {
            const m = { l: 32, r: 6, t: 8, b: 18 }, e = eixo(0, Math.max(...vals), 4), bw = (W - m.l - m.r) / Aa.anos.length, x = i => m.l + (i + 0.5) * bw, y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
            gradeY(svg, e, y, m, W);
            Aa.anos.forEach((ano, i) => { const v = Aa[k][i]; if (v == null) return;
              S(svg, "rect", { x: x(i) - bw * 0.4, y: y(v), width: Math.max(1, bw * 0.8), height: y(0) - y(v), fill: "var(--bar-pers)" });
              dicaEm(S(svg, "rect", { x: x(i) - bw / 2, y: m.t, width: bw, height: H - m.t - m.b, fill: "transparent" }), `<b>${ano}</b> · ${NOME[k]}<br>ENA do ano ${n(v)}% da MLT${Aa.normal[k][i] != null ? `<br>normal (${ano - 29}–${ano}) ${n(Aa.normal[k][i])}%` : ""}`);
              if (ano % 20 === 0) S(svg, "text", { x: x(i), y: H - 5, "text-anchor": "middle" }, ano); });
            S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
            S(svg, "polyline", { points: Aa.normal[k].map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2.2, "pointer-events": "none" });
          }, undefined, `ENA anual e normal do ${NOME[k]}`).style.height = "150px";
        });
        const N = FU.normais, rotulo = { "1931–1960": "1931–60", "1961–1990": "1961–90", "1995–2024": "1995–2024 hoje", "2015–2024": "2015–24 década" };
        const t = tabela(aside, [["Normal"], ["SE", 1], ["S", 1], ["NE", 1], ["N", 1]], Object.keys(N).map(p => [rotulo[p], ...SUBS.map(k => `${n(N[p][k])}%`)]));
        t.querySelectorAll("tbody tr")[2].classList.add("destaque");
        aside.prepend(t.parentElement);
      } },
    { n: 2, titulo: "O El Niño forte separa o Sul do Norte", uni: "ENA do período úmido, % MLT", ajuda: "fundamentos",
      abas: [["umido", "Cada ano"], ["evento", "Por fase · úmido do evento"], ["seguinte", "Por fase · úmido seguinte"]],
      curto: "No El Niño forte, Sul acima e Norte abaixo do normal; no úmido seguinte o efeito some.",
      conclusao: "Nos 5 El Niños fortes (1965, 1972, 1982, 1997, 2015), o <strong>Sul ficou acima de 100% em todos</strong> (mediana 200%) e o <strong>Norte abaixo em todos</strong> (mediana 79%). Sudeste e Nordeste não mostram padrão, e a La Niña forte não tem efeito claro em nenhum subsistema (o Nordeste fica abaixo do normal na La Niña fraca, 77%). <strong>No úmido seguinte, o efeito do El Niño desaparece</strong> nos quatro.",
      leg: "Cada ano: barra = período úmido que começa em novembro do ano; azul El Niño forte, laranja La Niña forte (Niño 3.4 relativo ≤ −1,0); linha: média móvel de 10 anos. Por fase: cada ponto é um ano, traço = mediana; forte ≥ 1,5, moderado 1,0–1,5, fraco 0,5–1,0, La Niña ≤ −0,5. Úmido do evento: nov/Y–abr/Y+1; seguinte: nov/Y+1–abr/Y+2. Clique numa barra para o ano.",
      montar(box, aside, v) {
        const Ua = FU.umido_anual;
        if (v === "umido") {
          const q = mk("div", "hyd-multi dois"); box.append(q);
          const todos = [...SUBS.flatMap(k => Ua[k]), ...FU.umido_blocos["SE-sul"], ...FU.umido_blocos["SE-resto"]].filter(x => x != null), esc = Math.max(...todos);
          SEIS.forEach(k => {
            const serie = k === "SE-sul" || k === "SE-resto" ? FU.umido_blocos[k] : Ua[k];
            const d = miniF(q, `<b class="hyd-marca" style="--c:${COR[k]}">${NOME[k]}</b>`);
            grafico(d, (svg, W, H) => {
              umidoGraf(svg, W, H, serie, Ua.anos, i => corUA(Ua.classe[i]), i => Ua.classe[i], esc, NOME[k]);
              const e = eixo(0, esc, 4), m = { l: 32, r: 6, t: 16, b: 18 }, bw = (W - m.l - m.r) / Ua.anos.length, x = i => m.l + (i + 0.5) * bw, y = q2 => m.t + (H - m.t - m.b) * (1 - (q2 - e.a) / (e.b - e.a));
              const mm = serie.map((_, i) => { const jan = serie.slice(Math.max(0, i - 5), i + 5).filter(z => z != null); return jan.length >= 6 ? jan.reduce((a, b) => a + b, 0) / jan.length : null; });
              S(svg, "polyline", { points: mm.map((z, i) => (z == null ? null : `${x(i)},${y(z)}`)).filter(Boolean).join(" "), fill: "none", stroke: "var(--ink)", "stroke-width": 1.6, "pointer-events": "none" });
            }, undefined, `Período úmido: ${NOME[k]}`).style.height = "140px";
          });
          return;
        }
        const Pc = FU.compostos[v], q = mk("div", "hyd-multi dois"); box.append(q);
        SUBS.forEach(k => {
          const d = miniF(q, `<b class="hyd-marca" style="--c:${COR[k]}">${NOME[k]}</b>`);
          grafico(d, (svg, W, H) => {
            const m = { l: 32, r: 6, t: 8, b: 30 }, vals = Pc[k].map(p => p.v), e = eixo(Math.min(...vals, 40), Math.max(...vals), 4);
            const bw = (W - m.l - m.r) / CLASSES.length, x = i => m.l + (i + 0.5) * bw, y = val => m.t + (H - m.t - m.b) * (1 - (val - e.a) / (e.b - e.a));
            gradeY(svg, e, y, m, W);
            S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
            CLASSES.forEach((c, i) => {
              S(svg, "text", { x: x(i), y: H - 15, "text-anchor": "middle" }, CURTO_C[c]);
              const pts = Pc[k].filter(p => p.classe === c).sort((a, b) => a.v - b.v);
              pts.forEach((p, j) => {
                const jit = ((j * 7919) % 11 - 5) / 5 * bw * 0.22, forte = c === "El Niño forte";
                const ci = S(svg, "circle", { cx: x(i) + jit, cy: y(p.v), r: forte ? 4.5 : 3, fill: forte ? "var(--hyd-azul)" : "var(--bar-pers)", stroke: "var(--surface)", "stroke-width": 1, style: "cursor:pointer" });
                dicaEm(ci, `<b>${p.ano}${v === "seguinte" ? ` → úmido ${p.ano + 1}/${String(p.ano + 2).slice(2)}` : `/${String(p.ano + 1).slice(2)}`}</b> · ${c}<br>${NOME[k]}: ${n(p.v)}% da MLT`);
                ci.addEventListener("click", () => abrir(`Ano ${p.ano}`, anoDetalhe(p.ano)));
              });
              if (pts.length) {
                const med = mediana(pts.map(p => p.v));
                dicaEm(S(svg, "line", { x1: x(i) - bw * 0.32, x2: x(i) + bw * 0.32, y1: y(med), y2: y(med), stroke: "var(--ink)", "stroke-width": 2.2 }), `<b>${c}</b> · ${NOME[k]}<br>mediana ${n(med)}% da MLT (${pts.length} anos)`);
                S(svg, "text", { x: x(i), y: H - 3, "text-anchor": "middle" }, `n=${pts.length}`);
              }
            });
          }, undefined, `${NOME[k]} por fase do ENSO`).style.height = "180px";
        });
      } },
    { n: 3, titulo: "O sinal é geográfico, não do subsistema", uni: "ENA do período úmido por bacia, % MLT", ajuda: "fundamentos",
      abas: [["El Niño forte", "El Niño forte"], ["El Niño moderado", "EN moderado"], ["La Niña fraca", "La Niña fraca"], ["La Niña forte", "La Niña forte"]],
      curto: "As bacias do sul do SE respondem com o Sul; o efeito da La Niña é fraco e disperso.",
      conclusao: "No El Niño forte, as bacias do Sul (Jacuí, Iguaçu, Itajaí, Uruguai) chegam perto de 200%, e o <strong>Paranapanema (186%), o Paraná (124%) e o Tietê (115%) respondem junto com elas</strong>; Grande, Paranaíba e São Francisco não respondem; Amazonas e Araguari ficam abaixo. No El Niño moderado, só as bacias do Sul repetem o desenho (Iguaçu 145%, Jacuí 153%), sem chegar ao Paranapanema. <strong>Na La Niña forte, só o Araguari se afasta dos anos neutros</strong> (1 de 23 bacias, o que pode ser acaso); na La Niña fraca, São Francisco (77%) e Paranaíba (82%) ficaram abaixo. O efeito do ENSO na ENA é assimétrico: forte e claro no El Niño, fraco e disperso na La Niña.",
      leg: "Ponto: mediana dos anos da fase; barra: p10–p90; traço vertical: mediana dos anos neutros. Ponto azul: diferença com p < 0,05 (Mann-Whitney). La Niña forte: Niño 3.4 relativo ≤ −1,0. Paraná: incremental.",
      montar(box, aside, classe) {
        const B = FU.bacias_fase[classe].slice().sort((a, b) => b.mediana - a.mediana), anos = FU.anos_fase[classe];
        box.append(mk("p", "leg", `${anos.length} anos de ${classe}: ${anos.join(", ")}.`));
        const gb = mk("div"); box.append(gb);
        desenhar(gb, (svg, W, H) => {
          const m = { l: 140, r: 16, t: 6, b: 22 }, todos = Object.values(FU.bacias_fase).flat(), e = eixo(Math.min(...todos.map(b => b.p10), 40), Math.max(...todos.map(b => b.p90)), 6);
          const x = v => m.l + (W - m.l - m.r) * (v - e.a) / (e.b - e.a), dy = (H - m.t - m.b) / B.length, y = i => m.t + (i + 0.5) * dy;
          e.t.forEach(t => S(svg, "line", { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b, stroke: "var(--rule)" }));
          rotulosX(svg, e.t.map((_, i) => i), i => x(e.t[i]), H - 6, i => `${n(e.t[i])}%`, 40);
          S(svg, "line", { x1: x(100), x2: x(100), y1: m.t, y2: H - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
          B.forEach((b, i) => {
            const nome = NOME_BACIA(b.nome);
            S(svg, "text", { x: m.l - 8, y: y(i) + 3, "text-anchor": "end" }, nome);
            S(svg, "line", { x1: x(b.p10), x2: x(b.p90), y1: y(i), y2: y(i), stroke: "var(--bar-pers)", "stroke-width": 4, "stroke-linecap": "round" });
            S(svg, "line", { x1: x(b.neutro), x2: x(b.neutro), y1: y(i) - 6, y2: y(i) + 6, stroke: "var(--ink-3)", "stroke-width": 2 });
            S(svg, "circle", { cx: x(b.mediana), cy: y(i), r: 5, fill: b.p < 0.05 ? "var(--hyd-azul)" : "var(--ink-2)", stroke: "var(--surface)", "stroke-width": 1.5 });
            dicaEm(S(svg, "rect", { x: 0, y: y(i) - dy / 2, width: W, height: dy, fill: "transparent" }), `<b>${nome}</b> · ${classe}<br>mediana ${n(b.mediana)}% (p10–p90 ${n(b.p10)}–${n(b.p90)}%), ${b.n} anos<br>anos neutros: ${n(b.neutro)}% · p = ${n(b.p, 3)}`);
          });
        }, 460, "ENA por bacia na fase do ENSO escolhida");
      } },
    { n: 4, titulo: "O Sudeste tem duas metades", uni: "úmido nos El Niños fortes, % MLT", ajuda: "blocos",
      curto: "SE-sul enche nos El Niños fortes, SE-resto não; no agregado um anula o outro.",
      conclusao: "O <strong>SE-sul encheu nos 5 eventos</strong> (111% a 191%). O SE-resto foi de 70% a 144%, e em 1997 e 2015 ficou seco. Somados, um compensa o outro, e o SE agregado parece não responder ao El Niño. <strong>Por isso o modelo trata o SE em dois blocos</strong> e a tela ENA mostra o agregado e cada um.",
      leg: "SE-sul: Paranapanema, Tietê e Paraná incremental (43% da MLT do SE). SE-resto: o restante do SE (Grande, Paranaíba, Paraíba do Sul, Doce e partes do Amazonas, Tocantins e São Francisco). Última coluna: mediana dos anos neutros.",
      montar(box) {
        const gb = mk("div"); box.append(gb);
        desenhar(gb, (svg, W, H) => {
          const Ev = FU.blocos_eventos, N0 = FU.blocos_neutros, m = { l: 40, r: 12, t: 22, b: 24 };
          const grupos = [...FU.fortes.map(String), "neutros"], series = [["SE-sul", "var(--hyd-sesul)"], ["SE-resto", "var(--hyd-seresto)"], ["SE", "var(--ink-2)"]];
          const val = (gr, k) => (gr === "neutros" ? N0[k] : Ev[gr][k]);
          const e = eixo(0, Math.max(...grupos.flatMap(gr => series.map(([k]) => val(gr, k)))), 5);
          const gw = (W - m.l - m.r) / grupos.length, bw = Math.min(40, gw * 0.22), y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
          gradeY(svg, e, y, m, W);
          S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
          grupos.forEach((gr, i) => {
            const x0 = m.l + i * gw + gw / 2;
            S(svg, "text", { x: x0, y: H - 6, "text-anchor": "middle", class: gr === "neutros" ? null : "forte" }, gr === "neutros" ? "neutros" : `${gr}/${String(+gr + 1).slice(2)}`);
            series.forEach(([k, cor], j) => {
              const v = val(gr, k), xb = x0 + (j - 1) * (bw + 2) - bw / 2;
              dicaEm(S(svg, "rect", { x: xb, y: y(v), width: bw, height: y(0) - y(v), fill: cor, opacity: gr === "neutros" ? 0.55 : 1 }), `<b>${gr === "neutros" ? "Anos neutros (mediana)" : `Úmido ${gr}/${String(+gr + 1).slice(2)}`}</b><br>${k === "SE" ? "SE agregado" : k}: ${n(v)}% da MLT`);
            });
          });
          legSvg(svg, series.map(([k, cor]) => [k === "SE" ? "SE agregado" : k, cor]), m.l + 10, 4, 110);
        }, 280, "SE-sul e SE-resto nos El Niños fortes");
      } },
    { n: 5, titulo: "2026 ao lado dos El Niños fortes", uni: "ENA mensal jul a jun+1, % MLT", ajuda: "ler-trj",
      abas: [["SE-sul", "SE-sul"], ["SE-resto", "SE-resto"], ["SE", "SE"], ["S", "Sul"], ["NE", "NE"], ["N", "Norte"]],
      curto: "Até aqui, 2026 segue o padrão dos El Niños fortes, mais intenso no SE-sul.",
      conclusao: "Em setembro e outubro de 2026, o SE-sul (cerca de 200%) e o Sul (230% a 266%) estão na faixa alta dos eventos fortes, e o Norte (45%) está no ponto mais baixo entre eles para a época. <strong>Até aqui, 2026 segue o padrão dos El Niños fortes</strong>, com mais intensidade no SE-sul que em 1997 e 2015.",
      leg: "Cinza: El Niños fortes; âmbar: 2023 (moderado pelo índice relativo); linha grossa: 2026 (último mês parcial); faixas claras: períodos úmidos.",
      montar(box, aside, nome) {
        const gb = mk("div"); box.append(gb);
        desenhar(gb, (svg, W, H) => {
          const TT = FU.trajetorias, m = { l: 40, r: 46, t: 12, b: 24 };
          const vals = Object.values(TT).flatMap(t => t[nome].filter(v => v != null)), e = eixo(0, Math.max(...vals), 5);
          const x = i => m.l + i * (W - m.l - m.r) / 23, y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
          [[4, 9], [16, 21]].forEach(([a, b]) => S(svg, "rect", { x: x(a) - 4, y: m.t, width: x(b) - x(a) + 8, height: H - m.t - m.b, fill: "var(--vazio)" }));
          gradeY(svg, e, y, m, W);
          S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(100), y2: y(100), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
          rotulosX(svg, [0, 3, 6, 9, 12, 15, 18, 21], i => x(i), H - 6, i => `${MESES_T[i % 12]}${i >= 12 ? "/+1" : ""}`, 40);
          const fins = [];
          Object.entries(TT).forEach(([ano, t]) => {
            const v = t[nome], atual = ano === String(ANO), cor = atual ? "var(--hyd-2026)" : ano === "2023" ? "var(--accent)" : "var(--bar-pers)";
            const pts = v.map((q, i) => (q == null ? null : [x(i), y(q)])).filter(Boolean);
            const iPar = atual ? v.findIndex((_, i) => t.parcial[i]) : -1, linha = atual && iPar > 0 ? pts.slice(0, iPar) : pts;
            S(svg, "polyline", { points: linha.map(p => p.join(",")).join(" "), fill: "none", stroke: cor, "stroke-width": atual ? 3 : ano === "2023" ? 2 : 1.6 });
            if (atual && iPar > 0) { const [px, py] = pts[iPar]; S(svg, "line", { x1: pts[iPar - 1][0], y1: pts[iPar - 1][1], x2: px, y2: py, stroke: cor, "stroke-width": 2, "stroke-dasharray": "3 3" }); S(svg, "circle", { cx: px, cy: py, r: 4.5, fill: "var(--surface)", stroke: cor, "stroke-width": 2 }); }
            v.forEach((q, i) => { if (q == null) return; dicaEm(S(svg, "circle", { cx: x(i), cy: y(q), r: 6, fill: "transparent" }), `<b>${ano}</b> · ${mesT(i, +ano)}${t.parcial[i] ? " (parcial)" : ""}<br>${NOME[nome]}: ${n(q)}% da MLT`); });
            const [lx, ly] = pts[pts.length - 1]; fins.push({ t: ano, y: ly, x: lx });
          });
          empilharRotulos(fins.map(f => ({ el: S(svg, "text", { x: f.x + 6, y: f.y + 3, class: f.t === String(ANO) ? "forte hyd-ano" : null }, f.t), x: f.x + 6, y: f.y + 3 })), 40, 11);
        }, 300, "Trajetórias nos El Niños fortes e em 2026");
      } },
    { n: 6, titulo: "Quando o sinal aparece e quanto dura", uni: "correlação e ONI", ajuda: "fundamentos",
      curto: "O ENSO de jul–set explica nov–dez no Sul; nenhum El Niño forte continuou no ano seguinte.",
      conclusao: "No Sul, o ENSO de julho a setembro explica bem a ENA de <strong>novembro e dezembro</strong> (correlação 0,58 e 0,44) e quase nada de janeiro em diante. E <strong>nenhum El Niño forte continuou</strong> no período úmido seguinte: o ENSO voltou ao neutro ou virou La Niña. O sinal útil fica no úmido corrente.",
      leg: "Em cima: Spearman do Niño 3.4 relativo de jul–set (sem tendência) com a ENA de cada mês seguinte, 1931–2026; ponto cheio: significativo após corrigir para os 11 mil testes do estudo (q < 0,10). Embaixo: ONI oficial (CPC) no pico de cada El Niño forte (máximo de jun/Y a abr/Y+1) e no úmido seguinte (média de out/Y+1 a fev/Y+2); abaixo de −0,5 é La Niña.",
      montar(box) {
        const g1 = mk("div"), g2 = mk("div"); box.append(g1, g2);
        desenhar(g1, (svg, W, H) => {
          const C = FU.correlacao_set, m = { l: 36, r: 66, t: 10, b: 22 }, e = eixo(-0.4, 0.7, 5), meses = C.S.mes_alvo;
          const x = i => m.l + i * (W - m.l - m.r) / (meses.length - 1), y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
          gradeY(svg, e, y, m, W, v => n(v, 1));
          meses.forEach((mm, i) => { if (i % 2 === 0) S(svg, "text", { x: x(i), y: H - 6, "text-anchor": "middle" }, MES[mm - 1]); });
          const fins = [];
          SUBS.forEach(k => {
            const d = C[k];
            S(svg, "polyline", { points: d.r.map((v, i) => `${x(i)},${y(v)}`).join(" "), fill: "none", stroke: COR[k], "stroke-width": 2 });
            d.r.forEach((v, i) => { const sig = d.q[i] < 0.1; dicaEm(S(svg, "circle", { cx: x(i), cy: y(v), r: sig ? 4.5 : 3, fill: sig ? COR[k] : "var(--surface)", stroke: COR[k], "stroke-width": 1.5 }), `<b>${NOME[k]}</b> · ENA de ${MESL[meses[i] - 1]}<br>r = ${nm(v, 2)}${sig ? " (significativo)" : ""}`); });
            fins.push({ t: NOME[k], y: y(d.r[d.r.length - 1]), cor: COR[k] });
          });
          const x0 = x(meses.length - 1) + 8;
          empilharRotulos(fins.sort((a, b) => a.y - b.y).map(f => ({ el: S(svg, "text", { x: x0, y: f.y + 3, class: "forte", style: `fill:${f.cor}` }, f.t), x: x0, y: f.y + 3 })), 200, 12);
        }, 210, "Correlação do Niño 3.4 com a ENA por mês-alvo");
        desenhar(g2, (svg, W, H) => {
          const Oo = FU.oni_seguinte, m = { l: 36, r: 10, t: 20, b: 22 };
          const e = eixo(-2, 2.7, 5), gw = (W - m.l - m.r) / Oo.length, bw = gw * 0.32, y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
          gradeY(svg, e, y, m, W, v => n(v, 1));
          S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(-0.5), y2: y(-0.5), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
          S(svg, "text", { x: W - m.r, y: y(-0.5) - 4, "text-anchor": "end" }, "La Niña");
          Oo.forEach((o, i) => {
            const x0 = m.l + i * gw + gw / 2;
            [[o.pico, "var(--hyd-quente-3)", -1], [o.seguinte, "var(--hyd-frio-3)", 1]].forEach(([v, cor, lado]) => dicaEm(S(svg, "rect", { x: x0 + (lado < 0 ? -bw - 1 : 1), y: Math.min(y(v), y(0)), width: bw, height: Math.max(0.5, Math.abs(y(v) - y(0))), fill: cor }), `<b>El Niño de ${o.ano}</b><br>pico ${nm(o.pico, 2)} · úmido seguinte ${nm(o.seguinte, 2)}`));
            S(svg, "text", { x: x0, y: H - 6, "text-anchor": "middle" }, String(o.ano));
          });
          legSvg(svg, [["Pico", "var(--hyd-quente-3)"], ["Úmido seguinte", "var(--hyd-frio-3)"]], m.l + 6, 4, 80);
        }, 190, "ONI no pico e no período úmido seguinte");
      } },
    { n: 7, titulo: "A memória dos rios", uni: "correlação entre estações, 1931–2025", ajuda: "modelo",
      curto: "Um úmido forte deixa a seca seguinte alta: base da persistência.",
      conclusao: "Um período úmido forte deixa a seca seguinte alta: <strong>0,85 no Nordeste e 0,67 no Sudeste</strong>. Da seca para o próximo úmido a memória cai, e de um úmido para o outro é fraca (nula no Sul). Por isso a persistência é a base do modelo: nos primeiros meses, o estado atual dos rios pesa mais que o clima.",
      leg: "Spearman entre a ENA de uma estação e a da seguinte. Úmido = nov–abr; seca = mai–out. No Nordeste, parte da correlação vem da queda de patamar desde os anos 1990 (capítulo 1).",
      montar(box) {
        const gb = mk("div"); box.append(gb);
        desenhar(gb, (svg, W, H) => {
          const Mm = FU.memoria, pares = ["úmido Y → seca Y+1", "seca Y → úmido Y", "úmido Y → úmido Y+1"], m = { l: 40, r: 12, t: 22, b: 24 };
          const e = eixo(-0.1, 0.9, 5), gw = (W - m.l - m.r) / pares.length, bw = Math.min(44, gw * 0.17), y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
          gradeY(svg, e, y, m, W, v => n(v, 1));
          pares.forEach((p, i) => {
            const x0 = m.l + i * gw + gw / 2;
            S(svg, "text", { x: x0, y: H - 6, "text-anchor": "middle", class: "forte" }, p.replace("úmido", "Úmido").replace("seca Y", "Seca Y"));
            SUBS.forEach((k, j) => {
              const v = Mm[p][k], xb = x0 + (j - 2) * (bw + 3) + 1.5;
              dicaEm(S(svg, "rect", { x: xb, y: Math.min(y(v), y(0)), width: bw, height: Math.max(0.5, Math.abs(y(v) - y(0))), fill: COR[k] }), `<b>${NOME[k]}</b> · ${p}<br>correlação ${nm(v, 2)}`);
              S(svg, "text", { x: xb + bw / 2, y: v >= 0 ? y(v) - 4 : y(v) + 11, "text-anchor": "middle" }, nm(v, 2));
            });
          });
          legSvg(svg, SUBS.map(k => [NOME[k], COR[k]]), m.l + 6, 4, 95);
        }, 260, "Memória entre estações por subsistema");
      } },
    { n: 8, titulo: "As outras variáveis", uni: "peso na correção da persistência, 1 a 6 meses", ajuda: "testes",
      curto: "Com tudo junto, o Sul responde só ao ENSO; o Norte, ao ENSO forte e ao Atlântico.",
      conclusao: "Com todas as variáveis juntas, <strong>o Sul responde só ao ENSO</strong>, e o <strong>Norte ao ENSO forte e ao gradiente do Atlântico</strong> (Atlântico Norte mais quente que o Sul tira chuva da Amazônia). PDO, Atlântico Sul e Índico não pesam em nenhum subsistema, e Sudeste e Nordeste ficam com a persistência.",
      leg: "Coeficiente médio escolhido pelo teste multivariado (efeito em log da ENA por 1 desvio-padrão da variável), emissões de 1993 a 2025. Zero quando o modelo volta à persistência. N·|N|: intensidade do ENSO, que pesa mais nos eventos fortes. Azul: mais ENA; laranja: menos.",
      montar(box) {
        const gb = mk("div"); box.append(gb);
        desenhar(gb, (svg, W, H) => {
          const Pp = FU.pesos_t7, vars = ["N", "N·|N|", "ΔN", "grad_atl", "atl_sul_se", "pdo", "dmi"];
          const rotV = { N: "ENSO (N)", "N·|N|": "Intensidade", "ΔN": "Tendência", grad_atl: "Grad. Atlântico", atl_sul_se: "Atl. Sul (SE)", pdo: "PDO", dmi: "Índico (DMI)" };
          const m = { l: 76, r: 4, t: 28, b: 4 }, cw = (W - m.l - m.r) / vars.length, ch = (H - m.t - m.b) / SUBS.length, lim = 0.035;
          vars.forEach((v, j) => S(svg, "text", { x: m.l + (j + 0.5) * cw, y: m.t - 10, "text-anchor": "middle", class: "forte" }, cw < 78 ? rotV[v].split(" ")[0] : rotV[v]));
          SUBS.forEach((k, i) => {
            S(svg, "text", { x: m.l - 10, y: m.t + (i + 0.5) * ch + 3, "text-anchor": "end", class: "forte" }, NOME[k]);
            vars.forEach((v, j) => {
              const val = Pp[k][v], f = Math.min(1, Math.abs(val) / lim);
              const r = S(svg, "rect", { x: m.l + j * cw + 1, y: m.t + i * ch + 1, width: cw - 2, height: ch - 2, fill: `color-mix(in srgb, ${val >= 0 ? "var(--hyd-azul)" : "var(--hyd-laranja)"} ${Math.round(f * 85)}%, var(--vazio))` });
              S(svg, "text", { x: m.l + (j + 0.5) * cw, y: m.t + (i + 0.5) * ch + 4, "text-anchor": "middle", style: f > 0.55 ? "fill:var(--t-sobre);font-weight:500" : "fill:var(--ink-2)", "pointer-events": "none" }, sn(val, 3));
              dicaEm(r, `<b>${NOME[k]}</b> · ${rotV[v]}<br>peso médio ${sn(val, 3)}`);
            });
          });
        }, 230, "Peso das variáveis climáticas por subsistema");
      } },
  ];
  function telaFUN(area) {
    const ev = FU.compostos.evento, deFase = (k, c, q = ev) => q[k].filter(p => p.classe === c).map(p => p.v);
    const sF = deFase("S", "El Niño forte"), nF = deFase("N", "El Niño forte"), segS = deFase("S", "El Niño forte", FU.compostos.seguinte), NO = FU.normais;
    const sesul = FU.fortes.map(a => FU.blocos_eventos[String(a)]["SE-sul"]);
    Mesa.decisao(area, [
      { r: "Sul no El Niño forte · úmido do evento", v: `${n(mediana(sF))}%`, d: `mediana · ${sF.filter(v => v > 100).length} de ${sF.length} acima de 100%`, principal: true },
      { r: "Norte no El Niño forte · úmido do evento", v: `${n(mediana(nF))}%`, d: `mediana · ${nF.filter(v => v < 100).length} de ${nF.length} abaixo de 100%` },
      { r: "Sul no úmido seguinte", v: `${n(mediana(segS))}%`, d: "mediana dos El Niños fortes · nov/Y+1–abr/Y+2" },
      { r: "SE-sul nos El Niños fortes", v: `${n(Math.min(...sesul))}–${n(Math.max(...sesul))}%`, d: `úmido dos ${sesul.length} eventos` },
      { r: "Normal do Nordeste · 1995–2024", v: `${n(NO["1995–2024"].NE)}%`, d: `era ${n(NO["1961–1990"].NE)}% em 1961–1990` },
      { r: "Normal do Sul · 1995–2024", v: `${n(NO["1995–2024"].S)}%`, d: `era ${n(NO["1931–1960"].S)}% em 1931–1960` },
    ]);
    const g = Mesa.grade(area);
    let cap = Math.min(CAPS.length, Math.max(1, +ler("cap", "1") || 1));
    const pl = painel(g, { cod: "HYD-14", titulo: "Capítulos", unidade: "o que 95 anos de ENA mostram", tam: "s", ajuda: "fundamentos",
      leg: "Fatos descritivos com a amostra inteira (dentro da amostra): mostram o que aconteceu, não quanto o modelo acerta. Clique num capítulo." });
    const lista = mk("ol", "hyd-caps"); pl.corpo.append(lista);
    CAPS.forEach(c => {
      const li = mk("li"); const b = mk("button", null, `<span class="hyd-cap-n">${c.n}</span><span><b>${c.titulo}</b><small>${c.curto}</small></span>`); b.type = "button"; b.dataset.n = c.n;
      b.addEventListener("click", () => { cap = c.n; guardar("cap", String(cap)); montarCap(); });
      li.append(b); lista.append(li);
    });
    let pc = null;
    function montarCap() {
      lista.querySelectorAll("button").forEach(b => b.setAttribute("aria-current", String(+b.dataset.n === cap)));
      const c = CAPS[cap - 1];
      if (pc) pc.el.remove();
      pc = painel(g, { cod: "HYD-15", titulo: `${c.n} · ${c.titulo}`, unidade: c.uni, tam: "xl", ajuda: c.ajuda, leg: c.leg,
        fonte: "ENA: ONS (série oficial 1931–2024 na configuração atual + ENA diária desde 2025); clima: NOAA (ERSST v6, ONI, PDO). Os textos das conclusões são os do app e não foram recalculados com estes números fictícios." });
      pl.el.after(pc.el);
      const lay = mk("div", "hyd-cap"), col = mk("div", "hyd-cap-g"), barra = mk("div", "hyd-barra"), box = mk("div", "hyd-cap-g"), aside = mk("aside", "hyd-cap-t");
      col.append(barra, box); lay.append(col, aside); pc.corpo.append(lay);
      aside.append(mk("p", "hyd-conclusao", c.conclusao));
      const nav = mk("div", "hyd-cap-nav");
      if (cap > 1) { const a = mk("button", "hyd-chip", `‹ ${cap - 1}. ${CAPS[cap - 2].titulo}`); a.type = "button"; a.onclick = () => { cap--; guardar("cap", String(cap)); montarCap(); }; nav.append(a); }
      if (cap < CAPS.length) { const a = mk("button", "hyd-chip", `${cap + 1}. ${CAPS[cap].titulo} ›`); a.type = "button"; a.onclick = () => { cap++; guardar("cap", String(cap)); montarCap(); }; nav.append(a); }
      aside.append(nav);
      if (c.abas) {
        const chaveA = "cap" + c.n, v0 = valido(ler(chaveA, c.abas[0][0]), c.abas);
        const des = v => { guardar(chaveA, v); box.replaceChildren(); c.montar(box, aside, v); };
        abasEm(barra, c.abas, v0, des, "Recorte do capítulo", false); des(v0);
      } else { barra.remove(); c.montar(box, aside); }
    }
    montarCap();
    const pd = painel(g, { cod: "HYD-16", titulo: "Do diagnóstico ao modelo", unidade: "", tam: "full", ajuda: "resumo" });
    pd.corpo.insertAdjacentHTML("beforeend", `<div class="fluxo hyd-fluxo">
      <div class="passo"><span class="n">Capítulos 1 e 7</span><h3>Persistência como base</h3><p>O número do modelo-v1 carrega a anomalia atual sobre a média dos últimos 30 anos, com a memória medida em 95 anos.</p></div>
      <div class="passo"><span class="n">Capítulos 3 e 4</span><h3>Sudeste em dois blocos</h3><p>SE-sul e SE-resto são previstos separados e somados; a tela ENA mostra o agregado e cada bloco.</p></div>
      <div class="passo"><span class="n">Capítulos 2, 5 e 6</span><h3>Camada de El Niño forte</h3><p>A direção histórica do desvio (Sul e SE-sul para cima, Norte para baixo) aparece ao lado do número, sem alterá-lo.</p></div>
      <div class="passo"><span class="n">Capítulo 8 e limites</span><h3>Modelos-sombra</h3><p>Só 5 El Niños fortes desde 1950: os ajustes numéricos com clima ficam em teste ao vivo em 2026/27.</p></div></div>`);
  }

  // =====================================================================================================
  // tela 5 · DES Desempenho, modelos-sombra e rodadas
  // =====================================================================================================
  const HB = ME.habilidade || P.habilidade;
  const horizonte = k => { const d = HB[k]; let h = 0; while (h < d.h.length && d.ic05[h] > 0) h++; return h; };
  function rodadaDetalhe(r) {
    return el => {
      const vig = r.id === R.id, hr = (HYD.historico_rodadas || []).find(x => x.id === r.id);
      QC.pares(el, [["Emissão", rot(r.emissao)], ["Registrada em", dataHoraBr(r.registrada_em)], ["Versão", r.versao], ["Tipo", r.tipo], ["Niño 3.4 rel. (3 m)", nm(r.nino3m ?? (hr && hr.insumos.nino34_rel_3m), 2)], ["Regime do ENSO", r.regime ?? (hr && hr.insumos.regime_enso)]]);
      if (!vig) { par(el, "As previsões desta rodada não estão no produto de hoje: ele traz só a rodada vigente. Uma rodada publicada nunca é recalculada.", "leg"); return; }
      h3(el, "Insumos");
      QC.pares(el, [["Último mês de ENA", rot(I.ultimo_mes_ena)], ["Último mês da ERSST", rot(I.ultimo_mes_ersst)], ...Object.entries(I.hashes || {}).map(([a, h]) => [a, `<code>${h}</code>`])]);
      h3(el, "Previsões registradas, % MLT");
      const hs = [1, 2, 3, 4];
      tabela(el, [[""], ...hs.map(h => [rot(somaMes(R.emissao, h)), 1])], SEIS.map(k => [k, ...hs.map(h => { const p = R.previsoes.find(q => q.nome === k && q.h === h); return p ? n(p.media) : "—"; })]));
      par(el, `Média do modelo-v1 de 1 a 4 meses (até 18 na rodada), como registrada (sem os dias de ${A ? rot(A.mes) : "mês seguinte"}). Variantes em teste: ${[...new Set(R.sombra.map(s => s.modelo))].join(", ")}.`, "leg");
    };
  }
  function habDetalhe(k) {
    return el => {
      const d = HB[k];
      QC.pares(el, [["Horizonte útil (IC 90% acima de 0)", `${horizonte(k)} ${horizonte(k) === 1 ? "mês" : "meses"}`], ["Ganho a 1 mês", `${sn(d.crpss[0] * 100, 1)}%`]]);
      tabela(el, [["Meses"], ["Ganho", 1], ["IC 90%", 1]], d.h.map((h, i) => [h, [`${sn(d.crpss[i] * 100, 1)}%`, d.ic05[i] > 0 ? "hyd-bom" : d.ic95[i] < 0 ? "hyd-ruim" : ""], `${sn(d.ic05[i] * 100, 1)} a ${sn(d.ic95[i] * 100, 1)}%`]));
      par(el, "Ganho do modelo-v1 sobre a climatologia dos últimos 30 anos (CRPSS), fora da amostra, 1961–2025.", "leg");
    };
  }
  function telaDES(area) {
    const Dm = ME.desempenho, cob = Dm.filter(d => d.metodo === "PER").map(d => d.cobertura);
    Mesa.decisao(area, [
      ...SUBS.map((k, i) => ({ r: `Ganho a 1 mês · ${NOME[k]}`, v: `${sn(HB[k].crpss[0] * 100, 0)}%`, d: `horizonte útil: ${horizonte(k)} ${horizonte(k) === 1 ? "mês" : "meses"} (IC 90% > 0)`, principal: i === 0 })),
      { r: "Cobertura p10–p90 · modelo-v1", v: `${n(media(cob))}%`, d: `${n(Math.min(...cob))}–${n(Math.max(...cob))}% por subsistema · ideal 80%` },
      { r: "Rodada vigente", v: rot(R.emissao), d: `${R.tipo} · registrada ${dataHoraBr(R.registrada_em)}` },
    ]);
    const g = Mesa.grade(area);
    const p17 = painel(g, { cod: "HYD-17", titulo: "Ganho do modelo-v1 por antecedência", unidade: "CRPSS sobre a climatologia de 30 anos", tam: "xl", ajuda: "desempenho",
      leg: "Acima de 0, o modelo ganha. Fora da amostra: cada previsão de 1961 a 2025 usou só o que existia na data; faixa = IC 90%. Horizonte útil de cerca de 5 meses no Sudeste, 9 a 12 no Norte e 1 a 2 no Sul; no Nordeste, mais longo, mas puxado pela queda de patamar. No Sudeste, persistência no subsistema inteiro; a versão em blocos soma +0,005. Clique numa linha." });
    const gh = mk("div"); p17.corpo.append(gh);
    p17.corpo.insertAdjacentHTML("afterbegin", legHtml(SUBS.map(k => [COR[k], NOME[k], "l"])));
    desenhar(gh, (svg, W, H) => {
      const m = { l: 44, r: 76, t: 10, b: 32 };
      const vals = Object.values(HB).flatMap(d => [...d.crpss, ...d.ic95]), e = eixo(Math.min(-0.05, ...Object.values(HB).flatMap(d => d.ic05)), Math.max(...vals), 5);
      const x = hh => m.l + (hh - 1) * (W - m.l - m.r) / 17, y = v => m.t + (H - m.t - m.b) * (1 - (v - e.a) / (e.b - e.a));
      gradeY(svg, e, y, m, W, t => n(t, 2));
      [1, 3, 6, 9, 12, 15, 18].forEach(hh => S(svg, "text", { x: x(hh), y: H - 16, "text-anchor": "middle" }, `${hh}`));
      S(svg, "text", { x: (m.l + W - m.r) / 2, y: H - 2, "text-anchor": "middle" }, "antecedência (meses)");
      const rotulos = [];
      Object.entries(HB).forEach(([k, d]) => {
        S(svg, "polygon", { points: [...d.h.map((hh, i) => `${x(hh)},${y(d.ic95[i])}`), ...d.h.slice().reverse().map((hh, i) => `${x(hh)},${y(d.ic05[d.h.length - 1 - i])}`)].join(" "), fill: COR[k], opacity: 0.08 });
        const ln = S(svg, "polyline", { points: d.h.map((hh, i) => `${x(hh)},${y(d.crpss[i])}`).join(" "), fill: "none", stroke: COR[k], "stroke-width": 2 });
        const alvoL = S(svg, "polyline", { points: ln.getAttribute("points"), fill: "none", stroke: "transparent", "stroke-width": 10, style: "cursor:pointer" });
        alvoL.addEventListener("click", () => abrir(`Desempenho · ${NOME[k]}`, habDetalhe(k)));
        d.h.forEach((hh, i) => { const c = S(svg, "circle", { cx: x(hh), cy: y(d.crpss[i]), r: 6, fill: "transparent", style: "cursor:pointer" });
          dicaEm(c, `<b>${NOME[k]}</b> · ${hh} ${hh === 1 ? "mês" : "meses"}<br>ganho ${sn(d.crpss[i] * 100, 1)}% (IC 90% ${sn(d.ic05[i] * 100, 1)} a ${sn(d.ic95[i] * 100, 1)}%)`);
          c.addEventListener("click", () => abrir(`Desempenho · ${NOME[k]}`, habDetalhe(k))); });
        rotulos.push({ el: S(svg, "text", { x: x(18) + 8, y: y(d.crpss[d.crpss.length - 1]) + 3, class: "forte", style: `fill:${COR[k]}` }, NOME[k]), x: x(18) + 8, y: y(d.crpss[d.crpss.length - 1]) + 3 });
      });
      empilharRotulos(rotulos, 80, 12);
    }, 260, "Ganho do modelo-v1 por antecedência");

    const p18 = painel(g, { cod: "HYD-18", titulo: "Ganho, 1 a 6 meses", unidade: "sobre a climatologia de 30 anos", tam: "s", ajuda: "desempenho",
      leg: "CRPSS em %. ▲ intervalo de 90% acima de zero (reamostrando anos); ▼ abaixo. Climatologia histórica = média de todos os anos desde 1931. Cobertura: parte dos casos dentro da faixa p10–p90 (ideal 80%)." });
    const rotM = { PER: "<b>Modelo-v1</b>", SIM: "Anos similares", CH: "Climatologia hist." };
    const celD = d => [`${d.ic05 > 0 ? "▲ " : d.ic95 < 0 ? "▼ " : ""}${sn(d.crpss * 100, 1)}%`, d.ic05 > 0 ? "hyd-bom" : d.ic95 < 0 ? "hyd-ruim" : ""];
    const t18 = tabela(p18.corpo, [["Método"], ...SUBS.map(k => [k, 1])], [...["PER", "SIM", "CH"].map(mt => [rotM[mt], ...SUBS.map(k => celD(Dm.find(q => q.metodo === mt && q.nome === k)))]),
      ["Cobertura p10–p90", ...SUBS.map(k => `${Dm.find(q => q.metodo === "PER" && q.nome === k).cobertura}%`)]]);
    t18.querySelectorAll("tbody tr").forEach((tr, i) => { if (i > 2) return; const mt = ["PER", "SIM", "CH"][i];
      Mesa.alvo(tr, `Desempenho · ${rotM[mt].replace(/<[^>]+>/g, "")}`, el => tabela(el, [["Subsistema"], ["CRPSS", 1], ["IC 90%", 1], ["Cob.", 1]], SUBS.map(k => { const d = Dm.find(q => q.metodo === mt && q.nome === k); return [NOME[k], celD(d), `${sn(d.ic05 * 100, 1)} a ${sn(d.ic95 * 100, 1)}%`, `${d.cobertura}%`]; }))); });

    const opsR = [["PER", "vs. modelo-v1"], ["C30", "vs. clima 30 a"]];
    const p19 = painel(g, { cod: "HYD-19", titulo: "Recomposição", unidade: "anos similares · CRPSS, 1 a 6 meses", tam: "l", ajuda: "desempenho",
      leg: "Em El Niño forte, intervalo reamostrando os 8 eventos (|N| ≥ 1,5 desde 1961). No Sul e no Norte, a recomposição ganha do modelo-v1; no Sudeste e no Nordeste, o estado atual dos rios pesa mais. Clique numa linha." });
    const c19 = mk("div"); p19.corpo.append(c19);
    const ORD = ["S", "N", "SE-sul", "SE", "SE-resto", "NE"], Ds = ME.similares_desempenho || P.similares_desempenho;
    const red19 = ref => { guardar("rec.ref", ref); c19.replaceChildren();
      const t = tabela(c19, [["Recorte"], ...ORD.map(k => [k === "SE" ? "SE agr." : k, 1])], [["El Niño forte", "Em El Niño forte"], ["El Niño (N≥0,5)", "Em El Niño (N ≥ 0,5)"], ["todos", "Em todos os anos"]].map(([rec, tt]) => [tt, ...ORD.map(k => { const d = Ds.find(q => q.nome === k && q.recorte === rec && q.ref === ref); return d ? [`${d.ic05 > 0 ? "▲ " : d.ic95 < 0 ? "▼ " : ""}${sn(d.crpss * 100, 0)}%`, d.ic05 > 0 ? "hyd-bom" : d.ic95 < 0 ? "hyd-ruim" : ""] : "—"; })]));
      t.querySelectorAll("tbody tr").forEach((tr, i) => { const rec = ["El Niño forte", "El Niño (N≥0,5)", "todos"][i];
        Mesa.alvo(tr, `Recomposição · ${rec}`, el => tabela(el, [["Subsistema"], ["CRPSS", 1], ["IC 90%", 1]], ORD.map(k => { const d = Ds.find(q => q.nome === k && q.recorte === rec && q.ref === ref); return d ? [NOME[k], `${sn(d.crpss * 100, 1)}%`, `${sn(d.ic05 * 100, 1)} a ${sn(d.ic95 * 100, 1)}%`] : [NOME[k], "—", "—"]; }))); }); };
    const r0 = valido(ler("rec.ref", "PER"), opsR); abasEm(p19.acoes, opsR, r0, red19, "Referência"); red19(r0);

    const p20 = painel(g, { cod: "HYD-20", titulo: "Modelos-sombra 2026/27", unidade: "% MLT · não são a projeção oficial", tam: "l", ajuda: "sombra",
      leg: `Variantes registradas na rodada de ${rot(R.emissao)} (sem os dias de ${A ? rot(A.mes) : "o mês seguinte"}). T2: persistência ajustada pelos anos de ENSO mais parecidos, só em regime forte (no Sul ganhou 9% sobre a persistência nos eventos fortes, 1961–2025). T7: persistência + ENSO e gradiente do Atlântico (no Norte ganhou 1,9% em todos os anos e 9,5% nos eventos fortes). Fora do regime forte, o T2 é igual ao modelo-v1.` });
    const sh = R.sombra, hs = [1, 2, 3, 4, 5, 6], linhasS = [], gruposS = [...new Set(sh.map(s => `${s.nome}|${s.modelo}|${s.gatilho ?? ""}`))];
    ["S", "SE-sul", "SE", "N"].forEach(nome => {
      if (!gruposS.some(x => x.startsWith(nome + "|"))) return;
      linhasS.push([`${NOME[nome]} · modelo-v1`, ...hs.map(h => { const p = R.previsoes.find(q => q.nome === nome && q.h === h); return p ? n(p.media) + "%" : "—"; })]);
      gruposS.filter(x => x.startsWith(nome + "|")).forEach(x => { const [, mod, gat] = x.split("|");
        linhasS.push([`<b>${NOME[nome]} · ${mod}</b>${gat ? ` <small>(gatilho ${gat === "mes" ? "último mês" : "3 meses"})</small>` : ""}`, ...hs.map(h => { const s = sh.find(q => `${q.nome}|${q.modelo}|${q.gatilho ?? ""}` === x && q.h === h); return s ? [n(s.media) + "%", "hyd-sombra"] : "—"; })]); });
    });
    tabela(p20.corpo, [["Subsistema · modelo"], ...hs.map(h => [rot(somaMes(R.emissao, h)), 1])], linhasS);

    const p21 = painel(g, { cod: "HYD-21", titulo: "Rodadas", unidade: "registro, nunca recalculado", tam: "full", ajuda: "rodadas",
      leg: "A rodada de um mês é registrada depois do fechamento, quando a ENA e a temperatura do mar daquele mês estão publicadas (por volta do dia 5). Clique numa rodada para os insumos e as previsões." });
    const rods = P.rodadas.slice().reverse();
    const t21 = tabela(p21.corpo, [["Emissão"], ["Registrada em"], ["Versão"], ["Tipo"], ["Niño 3.4 rel. (3 m)", 1], ["Regime"]], rods.map(r => [r.id === R.id ? `<b>${rot(r.emissao)}</b> <small>vigente</small>` : rot(r.emissao), dataHoraBr(r.registrada_em), r.versao, r.tipo, nm(r.nino3m, 2), r.regime]));
    t21.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `Rodada ${rot(rods[i].emissao)}`, rodadaDetalhe(rods[i])));
  }

  // =====================================================================================================
  // tela 6 · MET Metodologia (o "?" de cada painel aponta para uma seção daqui)
  // =====================================================================================================
  function telaMET(area) {
    const EX = ME.exemplo;
    const ex = [
      ["1", "ENA do SE-sul nos 3 meses até a emissão", EX.meses.map((m, i) => `${rot(m)} ${n(EX.pct[i], 1)}%`).join(" · ")],
      ["2", "Normal de 30 anos desses meses", EX.normal.map(v => n(v, 1) + "%").join(" · ")],
      ["3", "Anomalia inicial x = log(média ÷ normal)", `log(${n(EX.pct.reduce((a, b) => a + b, 0) / 3, 1)} ÷ ${n(EX.normal.reduce((a, b) => a + b, 0) / 3, 1)}) = ${nm(EX.x, 3)}`],
      ["4", `Memória ajustada para emissões de ${MESL[+EX.emissao.slice(5, 7) - 1]}, 1 mês à frente (${EX.n_pares} pares, 1931–2025)`, `a = ${sn(EX.a, 3)} · b = ${n(EX.b, 3)}`],
      ["5", "Ponto em log: a + b · x", `${sn(EX.a, 3)} + ${n(EX.b, 3)} × ${nm(EX.x, 3)} = ${nm(EX.ponto_log, 3)}`],
      ["6", `Normal de 30 anos de ${rot(EX.alvo)}`, `${n(EX.normal_alvo, 1)}% da MLT`],
      ["7", "Mediana: normal × e^ponto", `${n(EX.normal_alvo, 1)} × e^${nm(EX.ponto_log, 3)} = ${n(EX.mediana, 1)}%`],
      ["8", `Membros = mediana × e^(erros históricos; desvio ${n(EX.dp_residuos, 3)})`, `média <b>${n(EX.media, 1)}%</b> · p10–p90 ${n(EX.p10)}–${n(EX.p90)}% · ${n(EX.media / 100 * EX.mlt_alvo)} MWmed`],
      ["9", `Anos similares (Niño 3.4 de ${n(EX.n3, 2)}, ${sn(EX.dn3, 2)} em 3 meses)`, `${EX.anos.map(a => a.ano).join(", ")} → recomposição <b>${n(EX.media_similares, 1)}%</b>`],
    ];
    if (EX.realizado != null) ex.push(["10", `Realizado em ${rot(EX.alvo)}${EX.realizado_parcial ? " (parcial)" : ""}`, `<b>${n(EX.realizado, 1)}%</b>`]);
    const tab = (cab, linhas, cls = "") => `<div class="rolagem"><table class="hyd-tab ${cls}"><thead><tr>${cab.map(([t, num]) => `<th${num ? ' class="n"' : ""}>${t}</th>`).join("")}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map((v, j) => `<td${cab[j] && cab[j][1] ? ' class="n"' : ""}>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    const lst = itens => `<ul class="lista">${itens.map(([t, x]) => `<li><span class="tag">${t}</span><span>${x}</span></li>`).join("")}</ul>`;
    const tec = html => `<details class="hyd-tecnico"><summary>Detalhe técnico</summary>${html}</details>`;
    const SECOES = [
      { id: "resumo", titulo: "Em uma tela", html: `<p>O modelo projeta a ENA de cada subsistema para os próximos 12 meses a partir do estado atual dos rios. Ao lado dele, os anos com ENSO mais parecido com o de hoje dão um segundo cenário, que pesa mais no Sul e no Norte quando o El Niño é forte.</p>
        <div class="fluxo hyd-fluxo"><div class="passo"><span class="n">1 · Normal</span><h3>Média dos últimos 30 anos</h3><p>Cada mês é comparado com a média do mesmo mês nos 30 anos anteriores, e não com a MLT de 1931–2024: o normal mudou.</p></div>
        <div class="passo"><span class="n">2 · Modelo-v1</span><h3>Persistência ajustada</h3><p>A anomalia dos últimos 3 meses é levada adiante com a memória medida em 95 anos, para cada mês do ano e cada antecedência.</p></div>
        <div class="passo"><span class="n">3 · Sudeste</span><h3>Dois blocos</h3><p>SE-sul (Paranapanema, Tietê, Paraná) e SE-resto são projetados separados e somados em MWmed.</p></div>
        <div class="passo"><span class="n">4 · Cenário</span><h3>Anos similares</h3><p>Os 5 anos com ENSO mais parecido repetem sua ENA sobre o normal de hoje. Ao lado do modelo, sem alterá-lo.</p></div></div>
        <div class="eq">ENA projetada = normal de 30 anos do mês × e<sup>a + b · log(ENA dos últimos 3 meses ÷ normal desses meses)</sup> × e<sup>erro histórico</sup></div>
        <p>Projeção em % da MLT vigente (ONS, 28/03/2026). O modelo-v1 é a persistência ajustada: carrega a anomalia atual de cada subsistema com a memória medida em 1931–2025; o clima não entra no número. Uma rodada publicada nunca é recalculada. Registro completo do raciocínio, das decisões (D001–D020) e dos testes pré-registrados: <code>docs/metodologia.md</code> no repositório da pesquisa.</p>
        <p class="leg">Laboratório com dados fictícios. Nenhum número desta tela vem do Quant Energia App; os números citados no texto corrido são os do app.</p>` },
      { id: "dados", titulo: "1 · Dados e corte de informação", html: `<p>A série de ENA vem do ONS: a série oficial de 1931 a 2024, que aplica o parque de hoje a todo o histórico (e por isso compara anos de forma justa), emendada com a ENA diária de 2025 em diante. O clima vem da NOAA. Cada rodada só usa o que estava publicado no fim do mês da emissão.</p>` +
        tec(lst([["ENA", "Planilhas \"Histórico de ENAS\" do ONS (subsistema e 23 bacias, 1931–2024) e ENA bruta diária (<code>ena_subsistema_di</code>, <code>ena_bacia_di</code>) agregada no mês desde 2025. % da MLT sobre a MLT vigente (ONS, 28/03/2026)."],
          ["Conferências", "MLT do PDF = média 1931–2024 da planilha (diferença ≤ 0,01%). Planilha × diária em 2023–2024: erro médio de 0,3% a 2%. Na planilha, o Paraná é acumulado (inclui Grande, Paranaíba, Tietê e Paranapanema); o estudo usa o incremental, e assim as 23 bacias somam o SIN."],
          ["Clima", "ERSST v6 (a mesma base do ONI do CPC): Niño 3.4 relativo (tipo RONI), Atlântico, Índico; PDO da NCEI. O Niño 3.4 calculado reproduz o ONI com correlação de 0,98 e o RONI com 0,999."],
          ["Corte", "Testes automáticos confirmam que a previsão de uma emissão não muda quando se alteram dados posteriores a ela, e que uma rodada publicada nunca é recalculada."]])) },
      { id: "normal", titulo: "2 · O normal: média dos 30 anos anteriores", html: `<p>A MLT é a média de 94 anos, mas o patamar mudou: o normal do Nordeste caiu de 112% da MLT (até 1990) para 73% (1995–2024), e o do Sul subiu de 83% para 114%. Por isso o modelo mede tudo contra a média do mesmo mês nos 30 anos anteriores à emissão. Nos testes, essa troca sozinha melhora o Nordeste em 10% sobre usar todo o histórico.</p><div class="eq">normal<sub>m</sub> = média da ENA (% MLT) do mês m nos 30 últimos anos disponíveis na emissão</div>` },
      { id: "modelo", titulo: "3 · Modelo-v1: persistência ajustada", html: `<p>Um período úmido forte deixa a seca seguinte alta (correlação de 0,85 no Nordeste e 0,67 no Sudeste): a água no solo e nos rios demora a escoar. O modelo mede quanto da anomalia de hoje sobrevive em cada antecedência, separadamente para cada mês do ano, e a leva adiante. A faixa vem dos erros que essa mesma regra cometeu no passado.</p><div class="eq">log(ENA<sub>t+h</sub> ÷ normal) = <var>a</var> + <var>b</var> · log(ENA dos 3 meses até t ÷ normal desses meses) + erro</div>` +
        tec(lst([["Ajuste", "<var>a</var> e <var>b</var> por mínimos quadrados, um par por mês de emissão e antecedência h (1 a 18), com todas as emissões anteriores do mesmo mês cujo alvo já é conhecido (~90 pares). Refeito a cada rodada."],
          ["Faixa", "Os membros são o ponto mais cada resíduo histórico do ajuste; a média dos membros é o número publicado, e p10–p90 a faixa. Cobertura medida da faixa p10–p90: 70% a 78% (o ideal seria 80%)."],
          ["Código", "<code>modelo_v1.py</code>; versão congelada, verificada por <code>tests/test_modelo_v1.py</code>."]])) },
      { id: "blocos", titulo: "4 · O Sudeste em dois blocos", html: `<p>No El Niño, as bacias do sul do Sudeste (Paranapanema, Tietê e Paraná) enchem junto com o Sul, e as do norte (Grande, Paranaíba) não respondem. No agregado, uma metade anula a outra. O modelo aplica a persistência a cada bloco e soma em MWmed; a tela ENA mostra o SE agregado e cada bloco.</p><div class="eq">SE = SE-sul + SE-resto (em MWmed) · SE-sul = Paranapanema + Tietê + Paraná incremental (17,8 GWmed de MLT) · SE-resto = SE − SE-sul</div>` },
      { id: "similares", titulo: "5 · Anos similares e recomposição", html: `<p>Os anos similares são os 5 anos, na mesma fase do ENSO, cujo Niño 3.4 estava mais perto do de hoje em nível e em subida, na mesma época do ano. A recomposição pega a ENA que cada um teve em relação ao normal da época e aplica sobre o normal de hoje. Ela não usa o estado atual dos rios: responde à pergunta "e se este ano repetir os parecidos?".</p><div class="eq">recomposição<sub>t+h</sub> = normal de hoje × média, nos 5 anos, de (ENA do ano no mês-alvo ÷ normal daquela época)</div>
        <p>Nos gráficos, a linha tracejada verde repete a ENA desses anos sobre o normal dos últimos 30 anos, inclusive no mês em curso: no começo do mês, com poucos dias observados, ela é uma referência independente do dado parcial. É um cenário ao lado do modelo-v1, não o substitui.</p>` +
        tec(lst([["Estado", "N = Niño 3.4 relativo médio dos 3 meses até a emissão; ΔN = variação de N em 3 meses. Distância euclidiana em (N, ΔN) padronizados pelos candidatos."],
          ["Candidatos", "Anos anteriores com os 18 meses seguintes conhecidos e na mesma fase: N ≥ 0,5 se hoje é El Niño; N ≤ −0,5 se La Niña. Sem a restrição de fase, anos neutros entravam entre os vizinhos e a recomposição piorava."],
          ["Código", "<code>similares.py</code>."]])) },
      { id: "camada", titulo: "6 · Camada de El Niño forte", html: `<p>Quando o Niño 3.4 relativo passa de 1,5, a Mesa mostra para que lado a persistência errou nos El Niños fortes anteriores. Ela ficou baixa no Sul em 6 de 6 eventos e no SE-sul em 5 de 6, e alta no Norte em 6 de 6. A direção é confiável, o tamanho não (no Sul, de +15 a +166 pontos), e por isso a camada não altera o número.</p>
        <p>O estado aparece de dois jeitos: pela média de 3 meses do Niño 3.4 (o critério da rodada) e pelo último mês publicado, que costuma virar antes. O Niño 3.4 relativo é calculado na ERSST v6 (NOAA), tipo RONI: desconta o aquecimento médio dos trópicos. No gráfico com anos similares, cada um aparece no mesmo calendário (1997 no lugar de 2026, e assim por diante) e com 9 meses a mais, para ver o que o ENSO deles fez depois.</p>` },
      { id: "atualizacao", titulo: "7 · Atualização com o mês em curso", html: `<p>A rodada é emitida no fim do mês, mas os dias do mês seguinte chegam todo dia. Com 20 dias observados, a média parcial já erra o mês inteiro em só 6% no Sudeste. A Mesa usa esses dias: estima o mês em curso pela média parcial, corrigida pelo padrão do mesmo mês nos anos anteriores (em outubro, o fim do mês costuma ser mais úmido que o começo), e reemite o modelo-v1 a partir dele. Em 2000–2025, isso reduziu o erro do mês em curso em 63% a 71% e o do mês seguinte em 4% a 11%, em relação à rodada do fim do mês anterior. A rodada continua registrada como estava.</p><div class="eq">mês em curso = média dos dias observados ÷ (média dos mesmos dias ÷ mês inteiro, no mesmo mês dos anos anteriores)</div>` },
      { id: "sombra", titulo: "8 · Rodadas e modelos-sombra", html: `<p>Cada rodada fica registrada com a previsão, os insumos e as variantes em teste, e nunca é recalculada. Como desde 1950 só houve 5 El Niños fortes, os ajustes com clima que mostraram ganho em parte dos subsistemas ficam em teste ao vivo neste evento: o ajuste por anos parecidos no Sul (T2) e no SE-sul (T3), o modelo com ENSO e Atlântico no Norte (T7) e a recomposição pelos anos similares.</p>
        <p>T2: persistência ajustada pelos anos de ENSO mais parecidos, só em regime forte (no Sul ganhou 9% sobre a persistência nos eventos fortes, 1961–2025); fora do regime forte, é igual ao modelo-v1. T7: persistência + ENSO e gradiente do Atlântico (no Norte ganhou 1,9% em todos os anos e 9,5% nos eventos fortes).</p>` },
      { id: "exemplo", titulo: `Exemplo com números: SE-sul, rodada de ${rot(EX.emissao)}, previsão para ${rot(EX.alvo)}`, html: tab([["#"], ["Passo"], ["Valor", 1]], ex.map(([k, t, v]) => [k, t, v]), "hyd-memorial") +
        `<h3>Os anos similares para o mesmo mês</h3>` + tab([["Ano"], [`ENA em ${MES[+EX.alvo.slice(5, 7) - 1]} (% MLT)`, 1], ["Normal da época", 1], ["Razão", 1], ["Sobre o normal de hoje", 1]], [...EX.anos.map(a => [a.ano, `${n(a.pct, 1)}%`, `${n(a.normal_epoca, 1)}%`, n(a.razao, 3), `${n(a.hoje, 1)}%`]), ["<b>Média</b>", "", "", "", `<b>${n(EX.media_similares, 1)}%</b>`]]) +
        (EX.realizado != null ? `<p class="nota">Em ${rot(EX.alvo)}${EX.realizado_parcial ? " (parcial)" : ""}, o SE-sul está em ${n(EX.realizado, 1)}%: ${EX.realizado > EX.media ? "acima" : "abaixo"} do modelo-v1 (${n(EX.media, 1)}%) e ${EX.realizado > EX.media_similares ? "acima" : "abaixo"} da recomposição (${n(EX.media_similares, 1)}%). Em ${rot(EX.emissao)} o Niño 3.4 relativo de 3 meses estava em ${n(EX.n3, 2)}${EX.n3 < 1.5 ? ", abaixo de 1,5, e a camada não estava ativa" : ""}.</p>` : "") },
      { id: "ler-ena", titulo: "Como ler · ENA por subsistema (tela ENA)", html: `<p>Cada gráfico (HYD-1) traz o realizado (linha cheia), o mês em curso parcial (círculo vazio), a média do modelo-v1 a partir do mês em curso (âmbar) com a faixa p10–p90, a recomposição pelos anos similares (tracejado verde) e 100% da MLT (tracejado cinza). A coluna clara marca o M+1; o pontilhado vertical, o último mês fechado.</p>
        <p>A projeção parte do mês em curso: o mês parcial é estimado pelos dias já observados (corrigidos pelo padrão do mesmo mês nos anos anteriores) e o modelo-v1 segue dali; com 20 dias, isso reduz o erro do mês em ~60% e o do mês seguinte em 4% a 11% em relação à rodada do fim do mês anterior. A rodada mensal fica registrada e aparece no detalhe de cada mês (inspetor). Escala própria em cada painel; a linha tracejada de 100% da MLT é a referência comum.</p>
        <p>SE-sul: Paranapanema, Tietê e Paraná incremental (43% da MLT do SE); SE-resto: Grande, Paranaíba e demais. A faixa larga do Sul reflete a habilidade baixa da persistência nesse subsistema.</p>
        <p>Na tabela mês a mês (HYD-2), a aba MWmed troca cada % por MWmed (% × MLT do mês). Clique numa linha para o subsistema com a faixa e cada ano similar.</p>` },
      { id: "ler-trj", titulo: "Como ler · trajetória, bacias e período úmido (tela TRJ)", html: `<p><b>Trajetória (HYD-5).</b> Cada linha cinza é um ano de comparação, de julho do ano do evento a junho de dois anos depois, com o ano escrito no fim. 2026 segue com o realizado e, a partir da rodada, com as duas projeções. A recomposição é a média dessas mesmas linhas sobre o normal de hoje (por isso não coincide com a média das linhas cinza, que estão em % da MLT da época).</p>
        <p><b>Dispersão.</b> Do menor ao maior valor entre os 5 anos similares, cada um recomposto sobre o normal de hoje. Com 5 anos, mínimo e máximo dizem mais que percentis; não é uma faixa de probabilidade como a p10–p90 do modelo-v1.</p>
        <p><b>ENA armazenável</b> (pontilhado fino): a parte da ENA que os reservatórios conseguem guardar; o resto passa pelas usinas a fio d'água ou é vertido. Só existe na ENA diária do ONS, de 2000 em diante: aparece para 2026 e para os anos de comparação a partir de 2000. As projeções são de ENA bruta.</p>
        <p><b>Contribuição de cada bacia (HYD-8).</b> GWmed acima ou abaixo da MLT; barras tracejadas são projeção do modelo-v1. No Sudeste, os blocos SE-sul e SE-resto somam exatamente o SE e o modelo-v1 projeta cada um; nas bacias, "demais" fecha a soma e a projeção é só do total. O Norte não é aberto por bacia: Tocantins e Amazonas são divididos entre Norte e Sudeste, e o ONS não publica a parte de cada um. No Nordeste, o São Francisco entra como bacia inteira (inclui Três Marias, no SE), e "demais" pode ser negativo por isso.</p>
        <p><b>Período úmido (HYD-9).</b> Cada barra é o período úmido que começa em novembro do ano indicado. Fase pelo Niño 3.4 relativo médio de out–dez.</p>` },
      { id: "indices", titulo: "Índices climáticos e tabelas históricas (tela CLI)", html: `<p>O que a literatura associa a cada índice é resumido de estudos publicados e não foi verificado por nós, exceto onde dito "o que medimos". As medições usam 1931–2026 (ou desde o início de cada série), correlações de Spearman entre o índice dos 3 meses até um mês e a ENA de 1 a 6 meses depois, com correção para os milhares de testes do estudo.</p>
        <p>Papel no estudo: <b>entra no cenário</b> (define anos similares e a camada), <b>em teste</b> (modelo-sombra), <b>só contexto</b> ou <b>referência oficial</b>.</p>
        <h3>Cores das tabelas históricas</h3>${lst([["CPC (RONI, ONI)", NOTA_TAB.cpc], ["ICEN (Niño 1+2)", NOTA_TAB.icen], ["Intensidade (demais)", NOTA_TAB.intensidade]])}
        <p>No SOI, negativo é o lado do El Niño, por isso a cor quente fica nos valores negativos. No Niño 3.4 relativo, limiares fixos de 0,5, 1,0, 1,5 e 2,0 °C, os mesmos do ONI.</p>` },
      { id: "cpc", titulo: "Previsão oficial do ENSO (CPC/NOAA)", html: `<p>Chance de cada fase e intensidade por trimestre móvel (SON = set–out–nov, e assim por diante), emitida pelo CPC/NOAA e atualizada na segunda quinta-feira de cada mês. O CPC verifica as previsões pelo RONI (Niño 3.4 relativo, a mesma ideia do índice que usamos). Um RONI acima de 2,0 seria o maior desde 1950: o máximo de 1950–2025 foi 1,92 (fev/1983).</p>` },
      { id: "fundamentos", titulo: "Fundamentos (tela FUN)", html: `<p>O que 95 anos de ENA mostram sobre o El Niño, a La Niña e as outras variáveis climáticas, subsistema por subsistema: descreve o que aconteceu, para quem quer entender a projeção e também criticá-la. São fatos descritivos calculados com a amostra inteira (dentro da amostra): mostram o que aconteceu, não quanto o modelo acerta. O desempenho fora da amostra está na tela DES.</p>
        <p>Fontes: ENA do ONS (série oficial 1931–2024 na configuração atual + ENA diária desde 2025); clima da NOAA (ERSST v6, ONI, PDO). Os textos das conclusões são os do app e não foram recalculados com os números fictícios deste laboratório.</p>` },
      { id: "desempenho", titulo: "Desempenho", html: `<p>Cada previsão de 1961 a 2025 foi refeita como se fosse feita na época, só com os dados que existiam. A régua é a climatologia dos últimos 30 anos; o CRPSS mede quanto o erro probabilístico cai em relação a ela (acima de 0, ganha). Intervalo de 90% reamostrando anos; em El Niño forte, reamostrando os 8 eventos (|N| ≥ 1,5 desde 1961).</p>
        <p>O horizonte útil é de cerca de 5 meses no Sudeste, 9 a 12 no Norte e 1 a 2 no Sul; no Nordeste, mais longo, mas puxado pela queda de patamar. O próximo período úmido (13 a 18 meses) não tem habilidade, exceto no Nordeste. A recomposição pelos anos similares ganha do modelo-v1 no Sul e no Norte em El Niño forte; no Sudeste e no Nordeste, o estado atual dos rios pesa mais.</p>` },
      { id: "testes", titulo: "O que foi testado e não entrou", html: `<p>Cada ideia foi testada contra a persistência, uma de cada vez, com o critério de aceite escrito antes de rodar. O padrão foi o mesmo: o clima ajuda no Sul e no Norte nos eventos fortes, e atrapalha no Sudeste e no Nordeste.</p>` + tab([["Teste"], ["O que mudou"], ["Resultado (1 a 6 meses)"], ["Decisão"]], [
        ["B1", "Análogos (7 anos parecidos em ENSO e estado dos rios) no lugar da persistência", "Sul +2,8%; Sudeste −5,5%, Nordeste −4,1%", "não entrou"],
        ["T1", "Persistência corrigida pela média dos erros dela em 7 anos de ENSO parecido", "piora os 4 subsistemas (−2% a −5%)", "não entrou"],
        ["T1b", "Persistência + termo linear de ENSO", "Sul em out–dez +6,7%; resto ≈ 0 ou negativo", "não entrou"],
        ["T2", "Correção do T1 só com El Niño forte (limiar 1,5)", "Sul +9,0%; Sudeste −6,7%", "modelo-sombra no Sul"],
        ["T3", "Sudeste em dois blocos, correção só no SE-sul", "dividir: +0,5%; corrigir o SE-sul: −4,0%", "blocos adotados; correção no modelo-sombra"],
        ["T7", "Persistência + ENSO, Atlântico, PDO e Índico com encolhimento", "Norte +1,9% (+9,5% em El Niño forte); demais ≈ 0", "modelo-sombra no Norte"],
        ["T8", "T7 nos dois blocos do Sudeste", "−1,2%", "não entrou"],
        ["Similares", "Recomposição pelos 5 anos na mesma fase do ENSO", "El Niño forte: Sul +15%, Norte +15%; SE e NE perdem", "cenário ao lado do modelo"],
        ["Similares ancorada", "Recomposição partindo do mês em curso e seguindo a variação de cada ano similar", "pior que a recomposição pura no SE (−17%), no Sul (−38%) e no Norte (−20%); só ajuda no 1º mês no NE e no N", "não entrou; a recomposição pura segue em todos os meses, inclusive o mês em curso"],
        ["Mês em curso", "Modelo-v1 reemitido com o mês parcial estimado pelos dias observados", "mês em curso +63% a +71%; mês seguinte +4% a +11%", "adotado: é o número principal da tela ENA"]]) },
      { id: "limites", titulo: "Limitações", html: lst([["Poucos eventos", "Só 5 El Niños fortes desde 1950 pelo índice relativo (1965, 1972, 1982, 1997, 2015). Qualquer ajuste específico para eles é estimado com muito pouco; 2026 pode passar do máximo histórico (1,92), fora do que o histórico viu."],
        ["Faixa estreita", "A faixa p10–p90 do modelo-v1 cobre 70% a 78% dos casos, um pouco abaixo dos 80% esperados."],
        ["Norte por bacia", "Tocantins e Amazonas são divididos entre Norte e Sudeste, e o ONS não publica a parte de cada um: o Norte não é aberto por bacia."],
        ["Revisões", "O ONI e a ENA são revisados depois de publicados; o histórico usa os valores revisados, uma aproximação do que se sabia em cada data."],
        ["Patamar", "A queda do Nordeste e do Sudeste desde os anos 1990 não está explicada no estudo (seca, usos consuntivos, uso do solo); o normal de 30 anos acompanha a mudança com atraso."],
        ["Índice", "A fase do ENSO usa o Niño 3.4 relativo (tipo RONI). Pelo ONI tradicional, 2023 seria El Niño forte; pelo relativo, moderado."]]) },
      { id: "rodadas", titulo: "Rodadas", html: `<p>A rodada de um mês é registrada depois do fechamento, quando a ENA e a temperatura do mar daquele mês estão publicadas (por volta do dia 5). Uma rodada publicada nunca é recalculada; uma retroativa é registrada depois, com os dados que existiam na data.</p>` + tab([["Emissão"], ["Registrada em"], ["Versão"], ["Tipo"], ["Regime do ENSO"]], ME.rodadas.slice().reverse().map(r => [rot(r.emissao), dataHoraBr(r.registrada_em), r.versao, r.tipo, r.regime])) },
      { id: "versoes", titulo: "Versões", html: tab([["Versão"], ["Data"], ["O que é"], ["Por quê"]], [
        ["<b>modelo-v1 (vigente)</b>", "21/10/26", "Persistência ajustada em N, NE e S; Sudeste em dois blocos somados.", "Única estrutura que ganhou da climatologia fora da amostra nos 4 subsistemas (1 a 6 meses: Norte +11,5%, Nordeste +19,3%, Sudeste +13,1%, Sul +0,3%)."],
        ["anos similares", "22/10/26", "Cenário de recomposição pelos 5 anos na mesma fase do ENSO, ao lado do modelo.", "Ganha do modelo-v1 no Sul e no Norte em El Niño forte."],
        ["atualização diária", "22/10/26", "Modelo-v1 reemitido com o mês em curso estimado pelos dias observados.", "Mês em curso 63% a 71% melhor e mês seguinte 4% a 11% melhor que a rodada do fim do mês anterior (2000–2025)."]]) },
      { id: "glossario", titulo: "Glossário", html: `<dl class="glossario">
        <dt>ENA</dt><dd>Energia natural afluente: a energia que a vazão natural dos rios produziria nas usinas, em MWmed.</dd>
        <dt>MLT</dt><dd>Média de longo termo: média da ENA de cada mês de 1931 a 2024, na configuração atual do parque (ONS, 28/03/2026).</dd>
        <dt>M+1</dt><dd>O mês seguinte ao mês em curso (hoje, ${rot(M1)}).</dd>
        <dt>Normal de 30 anos</dt><dd>Média do mesmo mês nos 30 anos anteriores à emissão; a referência do modelo.</dd>
        <dt>Persistência ajustada</dt><dd>O modelo-v1: leva a anomalia atual adiante com a memória medida no histórico, por mês e antecedência.</dd>
        <dt>Niño 3.4 relativo</dt><dd>Anomalia de temperatura do mar no Pacífico central menos a média dos trópicos (a ideia do RONI do CPC). Forte ≥ 1,5; moderado 1,0–1,5; fraco 0,5–1,0; La Niña ≤ −0,5.</dd>
        <dt>Anos similares</dt><dd>Os 5 anos na mesma fase do ENSO com Niño 3.4 mais parecido em nível e subida, na mesma época do ano.</dd>
        <dt>Recomposição</dt><dd>A ENA dos anos similares aplicada sobre o normal de hoje.</dd>
        <dt>SE-sul / SE-resto</dt><dd>Paranapanema, Tietê e Paraná incremental / o restante do Sudeste.</dd>
        <dt>CRPS / CRPSS</dt><dd>Erro de uma previsão com faixa, que pune tanto errar o centro quanto errar a largura. CRPSS = 1 − CRPS ÷ CRPS da referência.</dd>
        <dt>Fora da amostra</dt><dd>Previsão feita só com dados anteriores à data prevista, como teria sido feita na época.</dd>
        <dt>Modelo-sombra</dt><dd>Variante registrada a cada rodada para comparar com o realizado, sem ser a projeção oficial.</dd></dl>` },
      { id: "fontes", titulo: "Fontes", html: `<ul class="hyd-fontes">${Object.values(F).map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join("")}</ul>` },
    ];
    Mesa.met(area, SECOES);
  }

  // =====================================================================================================
  // registro na Mesa: sinal, resumo, alertas e telas
  // =====================================================================================================
  Mesa.registrar({
    cod: "HYD", mesa: { ordem: 6 }, decisao: false, nome: "Hydro Inflow Similarity", desc: "ENA por subsistema e anos similares de ENSO",
    sinal: () => {
      const p = pM("SE", M1), d = dM1("SE");
      return { v: `SE ${MES[+M1.slice(5, 7) - 1]} ${n(p.media)}% · ${I.regime_enso.replace(/ (forte|moderad[oa]|frac[oa])$/, "")}`, d: `${d != null ? `${seta(d)} ${sn(d)} p.p. vs. rodada ${rot(R.emissao)} · ` : ""}Niño 3.4 ${n(N3, 2)} (${I.regime_enso.split(" ").pop()})`, tom: "neutro", dnum: d == null ? undefined : Math.round(d * 10) / 10 };
    },
    fita: () => {
      const L = ["S", "NE"].map(k => { const p = pM(k, M1), d = dM1(k); return { r: `ENA ${k} ${rot(M1)}`, v: `${n(p.media)}% MLT`, d: d == null ? undefined : Math.round(d * 10) / 10 }; });
      const dN = E.mensal[E.mensal.length - 1] - E.mensal[E.mensal.length - 2];
      L.push({ r: `Niño 3.4 rel. ${rot(E.meses[E.meses.length - 1])}`, v: sn(N_MES, 2), d: Math.round(dN * 100) / 100 });
      return L;
    },
    resumo: el => {
      const box = mk("div", "hyd-resumo"); el.append(box);
      QC.kpis(box, SUBS.map(k => { const p = pM(k, M1), d = dM1(k); return { r: `ENA ${k} ${rot(M1)}`, v: `${n(p.media)}%`, d: `${n(p.p10)}–${n(p.p90)}${d != null ? ` · ${seta(d)} ${sn(d)} p.p.` : ""}`, tom: d == null ? "" : tom(d) }; }));
      box.append(mk("p", "hyd-resumo-l", `<b>ENSO</b> ${I.regime_enso} · Niño 3.4 ${n(N3, 2)} (3 m), ${nm(N_MES, 2)} em ${rot(I.ultimo_mes_ersst)} · camada forte ${ATIVA3 ? "ativa" : ATIVAM ? "ativa pelo mês" : "inativa"}`));
      box.append(mk("p", "hyd-resumo-l", `<b>Similares</b> <span class="hyd-sim">${ANOS_SIM.join(" · ")}</span> · SE ${rot(M1)} sim. ${n(sM("SE", M1).media)}%${A ? ` · ${A.dias} dias de ${rot(A.mes)}` : ""}`));
    },
    alertas: () => {
      const L = [];
      if (ATIVAM && !ATIVA3) L.push({ quando: QUANDO, texto: `Niño 3.4 de ${rot(I.ultimo_mes_ersst)} em ${nm(N_MES, 2)}: camada de El Niño forte ativa pelo mês, ainda não pela média de 3 meses (${n(N3, 2)})`, tela: 2, nivel: "alto" });
      else if (ATIVA3) L.push({ quando: QUANDO, texto: `Camada de El Niño forte ativa (Niño 3.4 de 3 meses ${n(N3, 2)}): Sul e SE-sul tendem acima do modelo, Norte abaixo`, tela: 2, nivel: "alto" });
      const ds = SUBS.map(k => [k, dM1(k)]).filter(([, d]) => d != null).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      if (ds.length && Math.abs(ds[0][1]) >= 3) { const [k, d] = ds[0], p = pM(k, M1);
        L.push({ quando: QUANDO, texto: `ENA ${k} ${rot(M1)} ${sn(d)} p.p. com ${A.dias} dias de ${rot(A.mes)}: ${n(p.media)}% da MLT (rodada de ${rot(R.emissao)}: ${n(p.media - d)}%)`, tela: 1, nivel: Math.abs(d) >= 10 ? "alto" : "normal" }); }
      const iP = CL.cpc_forca.linhas.length > 1 ? 1 : 0, pf = CL.cpc_forca.linhas[iP];
      if (pf && pf.valores[8] >= 20) L.push({ quando: CL.gerado_em.slice(0, 16), texto: `CPC: ${pf.valores[8]}% de chance de RONI ≥ 2,0 em ${pf.trimestre}, acima do máximo desde 1950`, tela: 3, nivel: "normal" });
      const extremo = INFO.filter(x => CI[x.k].peso === "contexto" && (CI[x.k].percentil >= 99 || CI[x.k].percentil <= 1)).map(x => x)[0];
      if (extremo) L.push({ quando: CL.gerado_em.slice(0, 16), texto: `${extremo.nome} em ${sn(CI[extremo.k].valor, 2)} (percentil ${n(CI[extremo.k].percentil)} desde 1950): ${extremo.fase(CI[extremo.k].valor).toLowerCase()}`, tela: 3, nivel: "normal" });
      return L.slice(0, 4);
    },
    telas: [
      { cod: "ENA", nome: "Afluências", montar: telaENA },
      { cod: "TRJ", nome: "Trajetória e histórico", montar: telaTRJ },
      { cod: "CLI", nome: "Indicadores climáticos", montar: telaCLI },
      { cod: "FUN", nome: "Fundamentos", montar: telaFUN },
      { cod: "DES", nome: "Desempenho e rodadas", montar: telaDES },
      { cod: "MET", nome: "Metodologia", montar: telaMET },
    ],
  });
})();
