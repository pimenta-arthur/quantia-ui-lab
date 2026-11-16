/* Variante 08 · Mesa (terminal desde o início) · funcoes/band.js
   BAND · Forecast Bandeiras: projeção da bandeira tarifária de M+1 a M+6, cenários, histórico das rodadas,
   cálculo direto pelo relato do DECOMP, desempenho do modelo e metodologia.
   Dados FICTÍCIOS da variante 07 (window.DADOS, RELATO_DADOS, RELATO_EXEMPLOS) e a mesma conta do relato
   (window.ContaRelato, de ../07-terminal-app/forecast_bandeiras/relato_conta.js). Nada é copiado: só derivações.
   Tudo dentro desta IIFE; o único nome usado fora dela é Mesa.registrar. Preferências em localStorage "mesa.band.*". */
(function () {
  "use strict";
  const D = window.DADOS, R = window.RELATO_DADOS, EX = window.RELATO_EXEMPLOS, C = window.ContaRelato;
  if (typeof Mesa === "undefined" || !D) return;

  // ================================================================================================
  // constantes e utilitários
  // ================================================================================================
  const ORD = ["Verde", "Amarela", "Vermelha 1", "Vermelha 2"];
  const SIG = { "Verde": "vd", "Amarela": "am", "Vermelha 1": "v1", "Vermelha 2": "v2", "Escassez hídrica": "esc" };
  const AB = { "Verde": "Vd", "Amarela": "Am", "Vermelha 1": "V1", "Vermelha 2": "V2", "Escassez hídrica": "EH" };
  const COR = c => (c === "Escassez hídrica" ? "var(--band-esc)" : `var(--${SIG[c]})`);
  const TXT = c => (c === "Amarela" ? "var(--on-am)" : c === "Escassez hídrica" ? "var(--band-on-esc)" : "var(--on-flag)");
  const chip = (c, txt) => `<b class="band-chip band-${SIG[c]}" title="${c}">${txt == null ? c : txt}</b>`;
  const CEN = {
    esp: { nome: "Esperado", curto: "Esperado", cor: "var(--cen-esp)" },
  };
  const LIMX = D.limites_x, LIM = [LIMX.Verde, LIMX.Amarela, LIMX["Vermelha 1"]];
  const P = D.projecoes, H = D.historico, RD = D.rodadas, SEL = D.selecao, CG = D.calculo_gsf_cenarios;
  const real = Object.fromEntries(H.map(h => [h.mes, h.cor]));
  const histDe = m => H.find(h => h.mes === m);
  const fut = P.filter(p => !p.anunciada);
  const PROX = fut[0] || P[0];                     // próxima bandeira a anunciar
  const VIG = P.find(p => p.anunciada);           // mês já anunciado no horizonte
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const add = (pai, html) => { pai.insertAdjacentHTML("beforeend", html); return pai.lastElementChild; };
  const dataHora = s => dataBr(s) + (s.length > 10 && s.slice(11, 16) !== "00:00" ? " " + s.slice(11, 16) : "");
  const quando = D.rodada.publicada_em.slice(0, 16);
  const anoAnterior = m => `${+m.slice(0, 4) - 1}${m.slice(4)}`;
  const pp = v => sn(v * 100, 0) + " p.p.";
  const LS = {
    ler(k, d) { try { const v = localStorage.getItem("mesa.band." + k); return v == null ? d : v; } catch (e) { return d; } },
    gravar(k, v) { try { localStorage.setItem("mesa.band." + k, v); } catch (e) { /* sem armazenamento: vale só nesta visita */ } },
  };
  const segundo = pr => ORD.slice().sort((a, b) => pr[b] - pr[a])[1];

  /** cor por X e gatilhos para a cor vizinha (mesma regra da ANEEL; GSF arredondado a 2 casas) */
  function gatilhos(gsf, pld) {
    const g = Math.round(gsf * 100) / 100, x = pld * Math.max(0, 1 - g);
    let i = 0; while (i < 3 && x > LIM[i]) i++;
    const viz = j => ({ cor: ORD[j + (j >= i ? 1 : 0)], pld: g < 1 ? LIM[j] / (1 - g) : Infinity, gsf: pld > LIM[j] ? 1 - LIM[j] / pld : null });
    return { g, x, cor: ORD[i], acima: i < 3 ? viz(i) : null, abaixo: i > 0 ? viz(i - 1) : null };
  }
  const pldTxt = v => (!isFinite(v) ? "nenhum PLD" : v > D.pld_max ? `acima do teto (${rs(D.pld_max, 0)})` : rs(v, 0));
  function textoGatilho(gt, pld) {
    const L = [];
    if (gt.acima) L.push(gt.g >= 1 ? `Com GSF ≥ 1, nenhum PLD muda a cor.` : `Sobe para ${chip(gt.acima.cor)} se PLD &gt; ${pldTxt(gt.acima.pld)}${gt.acima.gsf != null ? ` ou GSF &lt; ${n(gt.acima.gsf, 2)}` : ""}.`);
    if (gt.abaixo) L.push(`Desce para ${chip(gt.abaixo.cor)} se PLD ≤ ${rs(gt.abaixo.pld, 0)} ou GSF ≥ ${n(Math.min(1, gt.abaixo.gsf ?? 1), 2)}.`);
    return L.join("<br>");
  }
  /** "Vd 69% Am 31%" → { Verde: 0,69, … }; sem probabilidade → null */
  function probDe(txt) {
    if (!txt || !/%/.test(txt)) return null;
    const o = { "Verde": 0, "Amarela": 0, "Vermelha 1": 0, "Vermelha 2": 0 }, inv = { Vd: "Verde", Am: "Amarela", V1: "Vermelha 1", V2: "Vermelha 2" };
    txt.replace(/(Vd|Am|V1|V2) (\d+)%/g, (_, a, v) => { o[inv[a]] = +v / 100; });
    return o;
  }
  /** barra empilhada de probabilidade (HTML), com tooltip em cada segmento */
  function pbar(pai, pr, rotulo) {
    const b = add(pai, `<div class="band-pbar">${ORD.filter(c => pr[c] > 0.004).map(c => `<span class="band-${SIG[c]}" style="flex:${pr[c]}" data-c="${c}">${pr[c] >= 0.14 ? pct(pr[c]) : ""}</span>`).join("")}</div>`);
    b.querySelectorAll("span").forEach(s => dicaEm(s, `<b>${rotulo}</b> · ${s.dataset.c}: ${pct(pr[s.dataset.c])}`));
    return b;
  }
  /** abas extras no cabeçalho do painel (a Mesa aceita um grupo; aqui cabem dois), sem disparo inicial */
  function abas(p, opcoes, atual, aoTrocar, rotulo) {
    const g = h("div", "abas"); g.setAttribute("role", "group"); g.setAttribute("aria-label", rotulo);
    opcoes.forEach(([v, t]) => { const b = h("button", null, t); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(String(v) === String(atual))); g.append(b); });
    g.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); aoTrocar(b.dataset.v); });
    p.acoes.insertBefore(g, p.acoes.querySelector(".p-ajuda"));
    return g;
  }
  /** painel da Mesa; o id vira band-pN para não coincidir com a rota (#BAND-2 é a tela 2) */
  function painel(g, o) { const p = Mesa.painel(g, o); p.el.id = "band-p" + o.cod.split("-")[1]; return p; }
  function grafAlt(pai, desenhar, px) { const c = grafico(pai, desenhar); c.style.height = c.style.minHeight = px + "px"; return c; }

  // ---------- rodadas ----------
  const chaveR = r => r.rodada || r.deck;
  const todosDecks = [...new Set(RD.map(chaveR))].sort().reverse();
  const pubs = todosDecks.filter(k => RD.some(r => chaveR(r) === k && r.publicada)).reverse();   // cronológica
  const RATUAL = D.rodada.id, RANT = pubs[pubs.indexOf(RATUAL) - 1];
  const daRodada = (k, alvo) => RD.find(r => chaveR(r) === k && r.alvo === alvo);
  const rotRod = k => (k.length > 10 ? `${dataBr(k).slice(0, 5)} ${k.slice(11, 16)}` : `bt ${rot(k)}`);
  const ehPub = k => RD.some(r => chaveR(r) === k && r.publicada);

  // ---------- ENA e MLT ----------
  const mltDe = Object.fromEntries([...D.insumos.realizado.map(r => [r.mes, r.mlt]), ...D.insumos.projetado.map(q => [q.mes, q.mlt])]);
  const sens = 1000 * (1 - D.fatores.perda_bruta_conexao / 100) * (1 - D.fatores.perda_conexao_cg / 100) / CG.esp[0].gf_band;

  // ================================================================================================
  // inspetor: detalhe de mês, cenário, rodada, célula, ano, execução e horizonte
  // ================================================================================================
  function inspMes(p) {
    return el => {
      const gt = gatilhos(p.gsf_esp, p.pld_esp);
      add(el, `<div class="band-i-topo">${chip(p.cor_esp)}<b class="num">${pct(p.prob[p.cor_esp])}</b><span>M+${p.h}${p.anunciada ? ` · oficial ${chip(p.anunciada, AB[p.anunciada])}${p.anunciada === p.cor_esp ? " ✓" : " ✗"}` : " · projeção"}</span></div>`);
      pbar(el, p.prob, rot(p.alvo));
      add(el, `<table class="band-i-tab"><thead><tr><th>Cenário</th><th class="n">GSF</th><th class="n">PLD</th><th class="n">X</th><th>Cor</th></tr></thead><tbody>` +
        ["esp"].map(c => `<tr><td>${CEN[c].curto}</td><td class="n">${n(p["gsf_" + c], 2)}</td><td class="n">${n(p["pld_" + c], 0)}</td><td class="n">${n(p["x_" + c], 1)}</td><td>${chip(p["cor_" + c], AB[p["cor_" + c]])}</td></tr>`).join("") + `</tbody></table>`);
      add(el, `<p class="band-i-txt">${textoGatilho(gt, p.pld_esp)}</p>`);
      const k = SEL.periodos.indexOf(p.alvo), per = SEL.periodos.slice(0, k + 1);
      add(el, `<h3>ENA do SIN, deck → ${rot(p.alvo)}</h3>`);
      grafico(el, (svg, W, Hh) => linhas(svg, W, Hh, {
        n: per.length, fmt: v => n(v, 1) + " mil MWmed",
        series: [{ nome: "MLT", v: per.map(m => mltDe[m] / 1000), cor: "var(--ink-3)", larg: 1, tracejado: true, semPonto: true },
          ...["esp"].map(c => ({ nome: CEN[c].curto, v: SEL.referencias[c].slice(0, k + 1).map(v => v / 1000), cor: CEN[c].cor }))],
        rotX: i => rot(per[i]),
      }), null, `ENA de referência por cenário até ${rot(p.alvo)}`);
      const q = D.insumos.projetado.find(x => x.mes === p.alvo), cg = CG.esp.find(c => c.alvo === p.alvo);
      const folga = cg.gh_band - 0.96 * cg.gf_band;
      QC.pares(el, [
        ["ENA esperada", `${n(q.ena_esp / 1000, 1)} mil · ${pct(q.ena_esp / q.mlt)} MLT`],
        ["GH_band · GF_band", `${n(cg.gh_band)} · ${n(cg.gf_band)} MWmed`],
        [folga < 0 ? "Falta p/ GSF 0,96" : "Sobra sobre 0,96", `${n(Math.abs(folga) / 1000, 1)} mil MWmed`],
        ["Adicional esperado", `${rs(p.adicional / 10, 3)} / 100 kWh`],
      ]);
      const hist = RD.filter(r => r.alvo === p.alvo).sort((a, b) => (chaveR(a) < chaveR(b) ? -1 : 1));
      add(el, `<h3>Rodadas para ${rot(p.alvo)}</h3><table class="band-i-tab"><tbody>` + hist.map(r => `<tr><td>${rotRod(chaveR(r))}</td><td>M+${r.h}</td><td>${chip(r.esp, AB[r.esp])}</td><td class="n">${(probDe(r.prob) || {})[r.esp] != null ? pct(probDe(r.prob)[r.esp]) : "—"}</td><td class="n">${n(r.gsf_esp, 2)}</td><td class="n">${n(r.pld_esp, 0)}</td></tr>`).join("") + `</tbody></table>`);
      const ha = histDe(anoAnterior(p.alvo));
      if (ha) add(el, `<p class="band-i-txt">Mesmo mês do ano anterior (${rot(ha.mes)}): ${chip(ha.cor)}${ha.gsf != null ? ` · GSF ${n(ha.gsf, 2)} · PLD ${rs(ha.pld, 0)}` : ""}.</p>`);
    };
  }

  function inspCenMes(p, c) {
    return el => {
      const s = SEL.alvos[p.alvo][c], cg = CG[c].find(z => z.alvo === p.alvo);
      const ser = s.series.map((id, j) => { const gt = gatilhos(s.gsf[j], s.pld[j]); return { id, gsf: s.gsf[j], pld: s.pld[j], x: gt.x, cor: gt.cor }; }).sort((a, b) => b.x - a.x);
      const cont = ORD.map(k => [k, ser.filter(x => x.cor === k).length]).filter(([, v]) => v);
      add(el, `<div class="band-i-topo">${chip(p["cor_" + c])}<span>${CEN[c].nome} · GSF ${n(p["gsf_" + c], 2)} · PLD ${rs(p["pld_" + c], 0)} · X ${n(p["x_" + c], 1)}</span></div>`);
      add(el, `<p class="band-i-txt">Cor de cada uma das 15 séries com a regra da ANEEL: ${cont.map(([k, v]) => `${chip(k, AB[k])} ${v}`).join(" · ")}. A projeção usa a média, não a contagem.</p>`);
      add(el, `<h3>X de cada série (R$/MWh)</h3>`);
      grafAlt(el, (svg, W) => {
        const x0 = 8, x1 = W - 8, top = Math.max(LIM[2] * 1.15, ...ser.map(v => v.x)) * 1.04, X = v => x0 + v / top * (x1 - x0);
        [0, ...LIM, top].forEach((a, i, arr) => { if (i === arr.length - 1) return; const b = arr[i + 1]; const r = S(svg, "rect", { x: X(a), y: 6, width: Math.max(0, X(b) - X(a)), height: 34, fill: COR(ORD[i]), opacity: 0.3 }); dicaEm(r, `<b>${ORD[i]}</b> · X de ${n(a, 2)} a ${i < 3 ? n(b, 2) : "…"}`); });
        LIM.forEach(l => S(svg, "text", { x: X(l), y: 52, "text-anchor": "middle" }, n(l, 0)));
        ser.forEach((v, j) => { const ci = S(svg, "circle", { cx: X(v.x), cy: 23 + ((j % 3) - 1) * 7, r: 3.6, fill: "var(--ink-2)", stroke: "var(--surface)", "stroke-width": 0.8 }); dicaEm(ci, `Série ${v.id}<br>GSF ${n(v.gsf, 2)} · PLD ${rs(v.pld, 0)}<br>X ${n(v.x, 1)} · ${v.cor}`); });
      }, 58);
      add(el, `<table class="band-i-tab"><thead><tr><th>Série</th><th class="n">GSF</th><th class="n">PLD</th><th class="n">X</th><th>Cor</th></tr></thead><tbody>` +
        ser.map(v => `<tr><td class="num">${v.id}</td><td class="n">${n(v.gsf, 3)}</td><td class="n">${n(v.pld, 1)}</td><td class="n">${n(v.x, 1)}</td><td>${chip(v.cor, AB[v.cor])}</td></tr>`).join("") +
        `<tr class="destaque"><td>Média</td><td class="n">${n(p["gsf_" + c], 2)}</td><td class="n">${n(p["pld_" + c], 1)}</td><td class="n">${n(p["x_" + c], 1)}</td><td>${chip(p["cor_" + c], AB[p["cor_" + c]])}</td></tr></tbody></table>`);
      add(el, `<h3>Composição do GSF (MWmed)</h3>`);
      QC.pares(el, [["Geração hidráulica", n(cg.gh_ons)], ["− ANDE e Itaipu", "−" + n(cg.ande)], ["− Perdas", "−" + n(cg.perdas)], ["+ PCH no MRE", `+${n(cg.pch_mre)} (de ${n(cg.pch)})`], ["= GH_band", n(cg.gh_band)], ["GF_band", n(cg.gf_band)], ["GSF", n(cg.gsf, 3)]]);
    };
  }

  function inspRodada(k) {
    return el => {
      const rs0 = RD.filter(r => chaveR(r) === k).sort((a, b) => a.h - b.h), r0 = rs0[0], pub = r0.publicada;
      QC.pares(el, [["Tipo", pub ? "Publicada" : "Backtest (reconstruída)"], ["Data", pub ? dataHora(k) : `deck de ${rot(r0.deck)}`], ["Deck NEWAVE", `${rot(r0.deck)} · versão ${r0.deck_versao}`], ["ECMWF", r0.ecmwf ? dataBr(r0.ecmwf) : "—"], ["Modelo", r0.modelo], ["Motivo", r0.motivo]], "premissas");
      add(el, `<table class="band-i-tab"><thead><tr><th>Mês</th><th>Esp.</th><th class="n">GSF</th><th class="n">PLD</th><th>Ofic.</th></tr></thead><tbody>` +
        rs0.map(r => { const pr = probDe(r.prob); return `<tr><td>${rot(r.alvo)}</td><td>${chip(r.esp, AB[r.esp])} ${pr ? pct(pr[r.esp]) : ""}</td><td class="n">${n(r.gsf_esp, 2)}</td><td class="n">${n(r.pld_esp, 0)}</td><td>${r.real ? chip(r.real, AB[r.real]) + (r.real === r.esp ? "✓" : "✗") : "—"}</td></tr>`; }).join("") + `</tbody></table>`);
      if (!pub || !rs0.some(r => probDe(r.prob))) add(el, `<p class="band-i-txt">${probDe(r0.prob) ? "" : "Sem probabilidade: menos de 8 erros passados disponíveis na data do deck. "}Rodadas de backtest usam só a informação disponível em cada data.</p>`);
    };
  }

  function inspCelula(r, ant) {
    return el => {
      const pr = probDe(r.prob), ofi = histDe(r.alvo), gt = gatilhos(r.gsf_esp, r.pld_esp);
      add(el, `<div class="band-i-topo">${chip(r.esp)}<b class="num">${pr ? pct(pr[r.esp]) : "—"}</b><span>${rotRod(chaveR(r))} · M+${r.h}</span></div>`);
      if (pr) pbar(el, pr, rot(r.alvo));
      const L = [["GSF · PLD", `${n(r.gsf_esp, 2)} · ${rs(r.pld_esp, 0)}`], ["X", n(gt.x, 1) + " R$/MWh"]];
      if (ant) L.push(["Rodada anterior", `${rotRod(chaveR(ant))}: ${ant.esp} · ${n(ant.gsf_esp, 2)} · ${rs(ant.pld_esp, 0)}`]);
      if (ofi) L.push(["Oficial", ofi.cor + (ofi.gsf != null ? ` · ${n(ofi.gsf, 2)} · ${rs(ofi.pld, 0)}` : "")]);
      if (ofi && ofi.gsf != null) L.push(["Erro GSF · PLD", `${sn(r.gsf_esp - ofi.gsf, 2)} · ${srs(r.pld_esp - ofi.pld, 0)}`]);
      QC.pares(el, L);
      const serie = RD.filter(x => x.alvo === r.alvo).sort((a, b) => (chaveR(a) < chaveR(b) ? -1 : 1));
      if (serie.length > 1) {
        [["gsf", "GSF projetado", v => n(v, 2), ofi && ofi.gsf], ["pld", "PLD gatilho projetado (R$/MWh)", v => rs(v, 0), ofi && ofi.pld]].forEach(([k, tit, fmt, ref]) => {
          add(el, `<h3>${tit} para ${rot(r.alvo)}</h3>`);
          grafico(el, (svg, W, Hh) => linhas(svg, W, Hh, { n: serie.length, fmt, series: [{ nome: "Esperado", v: serie.map(x => x[k + "_esp"]), cor: "var(--cen-esp)" }], refs: ref != null ? [{ v: ref, rot: "oficial" }] : [], rotX: i => { const k = chaveR(serie[i]); return k.length > 10 ? dataBr(k).slice(0, 5) : rot(k); }, titX: i => rotRod(chaveR(serie[i])) }));
        });
      }
    };
  }

  function inspOficial(m) {
    return el => {
      const o = histDe(m);
      add(el, `<div class="band-i-topo">${chip(o.cor)}<span>bandeira oficial de ${rotLongo(m)}</span></div>`);
      QC.pares(el, [["GSF", o.gsf != null ? n(o.gsf, 2) : "—"], ["PLD gatilho", o.pld != null ? rs(o.pld, 2) : "—"], ["X", o.gsf != null ? n(gatilhos(o.gsf, o.pld).x, 1) : "—"], ["Adicional", rs(o.adicional / 10, 3) + " / 100 kWh"], ["Fonte", "boletim InfoBandeira (CCEE)"]]);
    };
  }

  function inspAno(a, destaque) {
    return el => {
      const ms = [...H.map(x => ({ ...x, proj: false })), ...fut.map(p => ({ mes: p.alvo, cor: p.cor_esp, adicional: p.adicional, proj: true }))].filter(x => x.mes.startsWith(a));
      const g = add(el, `<div class="band-i-ano">${ms.map(x => `<span class="band-${SIG[x.cor]}${x.proj ? " band-proj" : ""}${x.mes === destaque ? " band-dest" : ""}" title="${rot(x.mes)} · ${x.cor}${x.proj ? " (projeção)" : ""}">${MES[+x.mes.slice(5) - 1].slice(0, 1).toUpperCase()}</span>`).join("")}</div>`);
      g.querySelectorAll("span").forEach(s => dicaEm(s, s.title));
      add(el, `<table class="band-i-tab"><thead><tr><th>Mês</th><th>Cor</th><th class="n">R$/100 kWh</th><th class="n">GSF</th><th class="n">PLD</th></tr></thead><tbody>` +
        ms.map(x => `<tr class="${x.mes === destaque ? "destaque" : ""}"><td>${rot(x.mes)}${x.proj ? " <small>proj.</small>" : ""}</td><td>${chip(x.cor, AB[x.cor])}</td><td class="n">${n(x.adicional / 10, 2)}</td><td class="n">${x.gsf != null ? n(x.gsf, 2) : "—"}</td><td class="n">${x.pld != null ? n(x.pld, 0) : "—"}</td></tr>`).join("") + `</tbody></table>`);
      if (+a < 2023) add(el, `<p class="band-i-txt">Antes de 2023 o laboratório guarda só a cor e o adicional; GSF e PLD gatilho mensais começam em jan/23.</p>`);
    };
  }

  // ================================================================================================
  // ábaco regulatório (MON e REL)
  // ================================================================================================
  /** janela do ábaco que mostra os pontos com folga, sem perder as quatro cores (ao menos GSF 0,70 e R$ 300) */
  function janela(gsfs, plds, pmax) {
    return { g0: Math.min(0.7, Math.floor((Math.min(...gsfs) - 0.05) * 20) / 20), g1: Math.max(1.12, Math.max(...gsfs) + 0.04),
      p1: Math.min(pmax || D.pld_max, 520, Math.max(300, Math.ceil(Math.max(...plds) * 1.3 / 50) * 50)) };
  }
  function abaco(svg, W, Hh, jan, marcar) {
    const m = { l: 50, r: 10, t: 10, b: 30 }, g0 = jan.g0, g1 = jan.g1, p0 = 0, p1 = jan.p1;
    const x = g => m.l + (Math.max(g0, Math.min(g1, g)) - g0) / (g1 - g0) * (W - m.l - m.r), y = p => m.t + (1 - (Math.min(p1, p) - p0) / (p1 - p0)) * (Hh - m.t - m.b);
    const L = [0, ...LIM, 1e9];
    const curva = lim => { const pts = []; for (let g = g0; g <= g1 + 1e-9; g += 0.005) pts.push([g, g >= 1 ? p1 : Math.min(p1, lim / (1 - g))]); return pts; };
    for (let k = 3; k >= 0; k--) {
      const cima = k === 3 ? [[g0, p1], [g1, p1]] : curva(L[k + 1]), baixo = k === 0 ? [[g0, p0], [g1, p0]] : curva(L[k]);
      const pol = S(svg, "polygon", { points: [...cima, ...baixo.slice().reverse()].map(([g, pl]) => `${x(g)},${y(Math.max(p0, pl))}`).join(" "), fill: COR(ORD[k]), opacity: 0.28 });
      dicaEm(pol, `<b>${ORD[k]}</b> · X ${k ? "acima de " + n(L[k], 2) : "até " + n(L[1], 2)}${k && k < 3 ? " até " + n(L[k + 1], 2) : ""} R$/MWh`);
    }
    marcas(p0, p1, p1 > 350 ? 100 : 50).forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)", opacity: 0.6 }); S(svg, "text", { x: m.l - 6, y: y(t) + 3, "text-anchor": "end" }, rs(t, 0)); });
    const pg = (W - m.l - m.r) / ((g1 - g0) / 0.05) < 34 ? 0.1 : 0.05;
    marcas(Math.ceil(g0 / pg) * pg, g1 - 0.02, pg).forEach(t => S(svg, "text", { x: x(t), y: Hh - 14, "text-anchor": "middle" }, n(t, 2)));
    S(svg, "text", { x: W - m.r, y: Hh - 1, "text-anchor": "end" }, "GSF →");
    // nome de cada cor no meio da sua faixa, a 88% da altura; faixa estreita leva a sigla ou fica sem nome
    const pr = p1 * 0.88;
    ORD.forEach((c, k) => {
      const ghi = k === 0 ? g1 : Math.min(g1, 1 - L[k] / pr), glo = k === 3 ? g0 : Math.max(g0, 1 - L[k + 1] / pr), larg = x(ghi) - x(glo);
      if (larg < 24) return;
      S(svg, "text", { x: (x(ghi) + x(glo)) / 2, y: y(pr) + 4, class: "forte", "text-anchor": "middle" }, larg > c.length * 6.6 + 8 ? c : AB[c]);
    });
    marcar({ x, y });
  }

  // ================================================================================================
  // TELA 1 · MON Monitor
  // ================================================================================================
  function decisaoMon(area) {
    const p = PROX, pr = p.prob[p.cor_esp], s2 = segundo(p.prob), gt = gatilhos(p.gsf_esp, p.pld_esp);
    const p3 = fut[1], primVerde = fut.find(q => q.cor_esp === "Verde");
    const itens = [{ r: `Próxima bandeira · ${rot(p.alvo)} · M+${p.h}`, v: `${p.cor_esp} ${pct(pr)}`, d: `${s2} ${pct(p.prob[s2])}`, principal: true }];
    if (VIG) itens.push({ r: `Vigente · ${rot(VIG.alvo)}`, v: VIG.anunciada, d: `oficial ANEEL · modelo dava ${AB[VIG.cor_esp]} ${pct(VIG.prob[VIG.cor_esp])} ${VIG.anunciada === VIG.cor_esp ? "✓" : "✗"}` });
    if (p3) { const s3 = segundo(p3.prob); itens.push({ r: `${rot(p3.alvo)} · M+${p3.h}`, v: `${p3.cor_esp} ${pct(p3.prob[p3.cor_esp])}`, d: `${s3} ${pct(p3.prob[s3])}` }); }
    itens.push({ r: "Primeira verde provável", v: primVerde ? rot(primVerde.alvo) : "fora do horizonte", d: primVerde ? `Verde ${pct(primVerde.prob.Verde)} · M+${primVerde.h}` : "nenhum mês com verde esperada" });
    if (gt.acima) itens.push({ r: `Gatilho ${rot(p.alvo)} → ${AB[gt.acima.cor]}`, v: `PLD > ${isFinite(gt.acima.pld) ? rs(gt.acima.pld, 0) : "—"}`, d: `hoje ${rs(p.pld_esp, 0)} · GSF ${n(p.gsf_esp, 2)} · ou GSF < ${gt.acima.gsf != null ? n(gt.acima.gsf, 2) : "—"}` });
    Mesa.decisao(area, itens);
  }

  function matriz(corpo) {
    const box = h("div", "rolagem");
    const t = h("table", "band-mat");
    const cel = (p, html, dica, cls = "", st = "") => `<td class="${cls}" data-alvo="${p.alvo}" data-dica="${esc(dica)}"${st ? ` style="${st}"` : ""}>${html}</td>`;
    const linha = (rotulo, f, cls = "") => `<tr class="${cls}"><th scope="row">${rotulo}</th>${P.map(f).join("")}</tr>`;
    let html = `<thead><tr><th></th>${P.map(p => `<th class="band-mcab" data-alvo="${p.alvo}"><b>${rot(p.alvo)}</b><span>M+${p.h}${p.anunciada ? ` · oficial ${AB[p.anunciada]}${p.anunciada === p.cor_esp ? " ✓" : " ✗"}` : ""}</span></th>`).join("")}</tr></thead><tbody>`;
    html += linha("Esperada", p => cel(p, `${chip(p.cor_esp, AB[p.cor_esp])} <b>${pct(p.prob[p.cor_esp])}</b>`, `<b>${rotLongo(p.alvo)}</b><br>cor esperada ${p.cor_esp} · ${pct(p.prob[p.cor_esp])}`), "band-l-top");
    [...ORD].reverse().forEach(k => {
      html += linha(`<i class="band-sw" style="background:${COR(k)}"></i>${k}`, p => {
        const v = p.prob[k];
        return cel(p, v >= 0.005 ? pct(v) : "·", `<b>${rotLongo(p.alvo)}</b> · ${k}: ${pct(v)}<br>cenário esperado · GSF ${n(p.gsf_esp, 2)} · PLD ${rs(p.pld_esp, 0)}`, "band-pc",
          `background:color-mix(in srgb, ${COR(k)} ${Math.round(v * 100)}%, var(--vazio));color:${v >= 0.62 ? TXT(k) : "var(--ink)"}`);
      }, "band-l-p");
    });
    html += linha("GSF", p => cel(p, n(p.gsf_esp, 2), `<b>${rot(p.alvo)}</b> · GSF esperado ${n(p.gsf_esp, 2)}`, "n"), "band-l-sep");
    html += linha("PLD gatilho R$", p => cel(p, n(p.pld_esp, 0), `<b>${rot(p.alvo)}</b> · PLD gatilho esperado ${rs(p.pld_esp, 2)}`, "n"));
    html += linha("X = PLD × (1 − GSF)", p => cel(p, n(p.x_esp, 1), `<b>${rot(p.alvo)}</b> · X ${n(p.x_esp, 2)} R$/MWh<br>limites: Vd ≤ ${n(LIM[0], 2)} · Am ≤ ${n(LIM[1], 2)} · V1 ≤ ${n(LIM[2], 2)}`, "n"));
    html += linha("Sobe de cor se PLD >", p => { const gt = gatilhos(p.gsf_esp, p.pld_esp), a = gt.acima; const v = !a ? "—" : !isFinite(a.pld) ? "nunca" : a.pld > D.pld_max ? "> teto" : n(a.pld, 0); return cel(p, v, `<b>${rot(p.alvo)}</b> · ${a ? `vira ${a.cor} com PLD acima de ${pldTxt(a.pld)} (GSF ${n(gt.g, 2)} fixo)${a.gsf != null ? `<br>ou com GSF abaixo de ${n(a.gsf, 2)} (PLD fixo)` : ""}` : "já na cor mais cara"}`, "n"); });
    html += linha("Adicional R$/100 kWh", p => cel(p, n(p.adicional / 10, 2), `<b>${rot(p.alvo)}</b> · adicional da cor esperada: ${rs(p.adicional / 10, 3)} por 100 kWh`, "n"), "band-l-sep");
    t.innerHTML = html + "</tbody>";
    box.append(t); corpo.append(box);
    t.querySelectorAll("td[data-dica]").forEach(td => dicaEm(td, td.dataset.dica));
    const ths = {};
    t.querySelectorAll("th.band-mcab").forEach(th => { const p = P.find(x => x.alvo === th.dataset.alvo); ths[p.alvo] = th; Mesa.alvo(th, `${rot(p.alvo)} · M+${p.h}`, inspMes(p)); });
    t.querySelectorAll("td[data-alvo]").forEach(td => td.addEventListener("click", () => ths[td.dataset.alvo].click()));
    // coluna inteira acompanha a seleção do cabeçalho
    t.addEventListener("click", () => { const sel = t.querySelector("th.selecionado"); t.querySelectorAll("td.band-col").forEach(x => x.classList.remove("band-col")); if (sel) t.querySelectorAll(`td[data-alvo="${sel.dataset.alvo}"]`).forEach(x => x.classList.add("band-col")); });
  }

  function abacoMon(corpo) {
    const jan = janela(P.map(p => p.gsf_esp), P.map(p => p.pld_esp * 1.15), D.pld_max);
    grafAlt(corpo, (svg, W, Hh) => abaco(svg, W, Hh, jan, ({ x, y }) => {
      const grupos = [], rotulos = [];
      P.forEach(p => {
        const g = S(svg, "g", {}); grupos.push(g);
        const ex = x(p.gsf_esp), ey = y(p.pld_esp), c = S(g, "g", { class: "cen-marca-svg band-marca" });
        S(c, "circle", { cx: ex, cy: ey, r: 8, style: "stroke-width:2.5px" }); S(c, "text", { x: ex, y: ey + 3, "text-anchor": "middle" }, "E");
        rotulos.push({ el: S(g, "text", { x: ex, y: ey - 12, "text-anchor": "middle", class: "forte" }, rot(p.alvo)), x: ex, y: ey - 12 });
        dicaEm(c, `${rot(p.alvo)} · esperado ${p.cor_esp}<br>GSF ${n(p.gsf_esp, 2)} · PLD ${rs(p.pld_esp, 0)} · X ${n(p.x_esp, 1)}<br>${pct(p.prob[p.cor_esp])} de chance<br><i>clique para o detalhe</i>`);
        Mesa.alvo(c, `${rot(p.alvo)} · M+${p.h}`, inspMes(p));
        g.addEventListener("pointerenter", () => grupos.forEach(o => o.setAttribute("opacity", o === g ? 1 : 0.15)));
        g.addEventListener("pointerleave", () => grupos.forEach(o => o.removeAttribute("opacity")));
      });
      empilharRotulos(rotulos, 40, 12);
    }), 330);
  }

  function mudancas(corpo) {
    if (!RANT) { add(corpo, `<p class="leg">Primeira rodada publicada: sem comparação.</p>`); return; }
    const linhas = P.map(p => ({ p, a: daRodada(RANT, p.alvo), b: daRodada(RATUAL, p.alvo) })).filter(x => x.a && x.b);
    QC.tabela(corpo, [{ t: "Mês" }, { t: `Antes · ${rotRod(RANT)}` }, { t: `Agora · ${rotRod(RATUAL)}` }, { t: "Δ prob. da cor", n: 1 }, { t: "GSF", n: 1 }, { t: "Δ GSF", n: 1 }, { t: "PLD R$", n: 1 }, { t: "Δ PLD", n: 1 }],
      linhas.map(({ p, a, b }) => {
        const pa = probDe(a.prob), pb = probDe(b.prob), NIV = ORD.indexOf(b.esp) - ORD.indexOf(a.esp);
        const dp = pa && pb ? pb[b.esp] - pa[b.esp] : null, dg = b.gsf_esp - a.gsf_esp, dl = b.pld_esp - a.pld_esp;
        return [`${rot(p.alvo)} <small>M+${p.h}</small>`, `${chip(a.esp, AB[a.esp])} ${pa ? pct(pa[a.esp]) : ""}`, `${chip(b.esp, AB[b.esp])} ${pb ? pct(pb[b.esp]) : ""} ${NIV ? `<b class="${NIV > 0 ? "desce" : "sobe"}">${NIV > 0 ? "▲ mais cara" : "▼ mais barata"}</b>` : ""}`,
          dp == null ? "—" : `<span class="${tom(dp)}">${seta(dp)} ${pp(dp)}</span>`, n(b.gsf_esp, 2), `<span class="${tom(dg)}">${sn(dg, 2)}</span>`, n(b.pld_esp, 0), `<span class="${tom(-dl)}">${sn(dl, 0)}</span>`];
      }), "band-tab densa");
    corpo.querySelectorAll("tbody tr").forEach((tr, i) => { const { p, a, b } = linhas[i]; Mesa.alvo(tr, `${rot(p.alvo)} · ${rotRod(RATUAL)}`, inspCelula(b, a)); });
  }

  function premissas(corpo) {
    const ri = D.rodada.insumos, md = D.modelo;
    QC.pares(corpo, [
      ["Rodada", `${dataHora(D.rodada.publicada_em)} · ${D.rodada.motivo}`],
      ["Deck NEWAVE", `${rot(ri.deck)} · versão ${ri.deck_versao}`],
      ["ECMWF SEAS5", `emissão ${dataBr(ri.ecmwf_emissao)}`],
      ["Modelo", `${md.versao} · ${md.k} séries · σ em 2 grupos`],
      ["Horizonte", `${rotLongo(P[0].alvo)} a ${rotLongo(P[P.length - 1].alvo)}`],
      ["GSF sempre verde", `≥ ${n(md.gsf_verde, 2)}`],
      ["PLD mín · máx", `${rs(D.pld_min, 2)} · ${rs(D.pld_max, 2)}`],
      ["Limites de X", `Vd ≤ ${n(LIM[0], 2)} · Am ≤ ${n(LIM[1], 2)} · V1 ≤ ${n(LIM[2], 2)}`],
      ["Adicional /100 kWh", `Am ${rs(D.adicional_vigente.Amarela / 10, 3)} · V1 ${rs(D.adicional_vigente["Vermelha 1"] / 10, 3)} · V2 ${rs(D.adicional_vigente["Vermelha 2"] / 10, 3)}`],
    ], "premissas");
    add(corpo, `<p class="leg" title="${esc(md.decisoes)}">Projeção estatística, não é anúncio oficial: a ANEEL define a bandeira por volta do dia 25 do mês anterior. Decisões ${esc(md.decisoes.match(/D\d{3}/g).join(", "))}.</p>`);
  }

  function montarMon(area) {
    decisaoMon(area);
    const g = Mesa.grade(area);
    const p1 = painel(g, { cod: "BAND-1", titulo: "Probabilidade por mês", unidade: "% · GSF · R$/MWh", tam: "xl", ajuda: "probabilidade",
      leg: "Clique num mês para ver tudo dele no inspetor. Quanto mais forte a cor, maior a chance. GSF e PLD são médias das 15 séries escolhidas (cenário esperado); com GSF ≥ 0,96 a bandeira é verde.",
      fonte: `Rodada ${dataHora(D.rodada.publicada_em)} · deck ${rot(D.deck)} · ECMWF ${dataBr(D.rodada.insumos.ecmwf_emissao)}` });
    matriz(p1.corpo);
    const p2 = painel(g, { cod: "BAND-2", titulo: "Ábaco regulatório", unidade: "GSF × R$/MWh", tam: "s", ajuda: "regra",
      leg: "A cor é dada por X = PLD × (1 − GSF). Cada E é um mês no cenário esperado (GSF e PLD médios das 15 séries). Clique num E para o detalhe." });
    abacoMon(p2.corpo);
    const p3 = painel(g, { cod: "BAND-3", titulo: "O que mudou desde a rodada anterior", unidade: RANT ? `${rotRod(RANT)} → ${rotRod(RATUAL)}` : "", tam: "xl", ajuda: "historico",
      leg: `Insumo que mudou: ${D.rodada.motivo}. ▲▼ na cor: mais cara ou mais barata. Δ PLD em verde quando o preço caiu (ajuda a cor). Clique numa linha para a evolução do mês em todas as rodadas.` });
    mudancas(p3.corpo);
    const p4 = painel(g, { cod: "BAND-4", titulo: "Premissas da rodada", tam: "s", ajuda: "dados" });
    premissas(p4.corpo);
  }

  // ================================================================================================
  // TELA 2 · CEN Cenários e fundamentos
  // ================================================================================================
  const cenSel = "esp";   // só o cenário esperado; mesa.band.cen de versões anteriores é ignorado
  let visSel = LS.ler("vis", "traj");

  function cartao(box, titulo) { const card = h("div", "mini band-card"); card.innerHTML = `<div class="ttl">${titulo}</div>`; box.append(card); return card; }

  function desenharTraj(box) {
    box.replaceChildren();
    const cor = CEN[cenSel].cor;
    const enaTodas = [...SEL.faixa.p10, ...SEL.faixa.p90, ...P.flatMap(p => SEL.alvos[p.alvo][cenSel].ena.flat())].map(v => v / 1000);
    const elo = Math.min(...enaTodas) * 0.95, ehi = Math.max(...enaTodas) * 1.03;
    const gsfT = P.flatMap(p => SEL.alvos[p.alvo][cenSel].gsf), pldT = P.flatMap(p => SEL.alvos[p.alvo][cenSel].pld);
    const glo = Math.min(...gsfT, 0.96) - 0.02, ghi = Math.max(...gsfT, 0.96) + 0.02, plo = Math.min(...pldT) * 0.9, phi = Math.max(...pldT) * 1.05;
    P.forEach(p => {
      const s = SEL.alvos[p.alvo][cenSel], k = SEL.periodos.indexOf(p.alvo), per = SEL.periodos.slice(0, k + 1), cm = p["cor_" + cenSel];
      const card = cartao(box, `${rot(p.alvo)}<span>M+${p.h} · ${chip(cm, AB[cm])}</span>`);
      Mesa.alvo(card, `${rot(p.alvo)} · ${CEN[cenSel].nome}`, inspCenMes(p, cenSel));
      grafAlt(card, (svg, W) => {
        svg.setAttribute("aria-label", `Trajetórias de ENA, GSF e PLD das 15 séries para ${rot(p.alvo)}`);
        const m = { l: 28, r: 6, t: 8 }, hE = 120;
        const x = i => m.l + i * (W - m.l - m.r) / Math.max(per.length - 1, 1), y = v => m.t + hE * (1 - (v / 1000 - elo) / (ehi - elo));
        marcas(elo, ehi, 20).forEach(t => { S(svg, "line", { x1: m.l, x2: W - m.r, y1: y(t * 1000), y2: y(t * 1000), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 4, y: y(t * 1000) + 3, "text-anchor": "end" }, n(t)); });
        const pts = a => a.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const p10 = SEL.faixa.p10.slice(0, k + 1), p90 = SEL.faixa.p90.slice(0, k + 1);
        const fx = S(svg, "polygon", { points: pts(p90) + " " + p10.map((v, i) => [i, v]).reverse().map(([i, v]) => `${x(i)},${y(v)}`).join(" "), fill: "var(--vazio)", stroke: "var(--rule)" });
        dicaEm(fx, `<b>${rot(p.alvo)}</b> · 2.000 séries do NEWAVE<br>P10 a P90 no mês: ${n(p10[k] / 1000, 1)} a ${n(p90[k] / 1000, 1)} mil MWmed`);
        s.ena.forEach((tr, j) => { const l = S(svg, "polyline", { points: pts(tr), fill: "none", stroke: cor, "stroke-width": 1, opacity: 0.45 }); dicaEm(l, `Série ${s.series[j]}<br>ENA ${n(tr[tr.length - 1] / 1000, 1)} mil MWmed<br>GSF ${n(s.gsf[j], 2)} · PLD ${rs(s.pld[j], 0)}`); });
        const re = SEL.referencias[cenSel].slice(0, k + 1);
        const lr = S(svg, "polyline", { points: pts(re), fill: "none", stroke: "var(--ink)", "stroke-width": 2, "stroke-dasharray": "5 3" });
        dicaEm(lr, `<b>${rot(p.alvo)}</b> · referência ECMWF: ${n(re[k] / 1000, 1)} mil MWmed`);
        [0, k].forEach(i => S(svg, "text", { x: x(i), y: m.t + hE + 12, "text-anchor": i ? "end" : "start" }, rot(per[i])));
        const X0 = 50, X1 = W - 36;
        const gMed = Math.round(p["gsf_" + cenSel] * 100) / 100;
        const fila = (y0, rotulo, arr, a, b, fmt, zonas, neutro) => {
          const X = v => X0 + (v - a) / (b - a) * (X1 - X0);
          S(svg, "text", { x: 0, y: y0 + 3 }, rotulo);
          zonas.forEach(([z0, z1, c]) => {
            const u0 = Math.max(a, z0), u1 = Math.min(b, z1);
            if (u1 > u0) { const r = S(svg, "rect", { x: X(u0), y: y0 - 9, width: X(u1) - X(u0), height: 18, fill: COR(c), opacity: 0.32 }); dicaEm(r, `${rot(p.alvo)} · com GSF ${n(gMed, 2)}: ${c}<br>PLD de ${rs(Math.max(z0, 0), 0)} ${z1 < 1e6 ? "a " + rs(z1, 0) : "em diante"}`); }
          });
          // limites entre cores e, à direita, a próxima virada fora da escala; rótulo que encostaria em outro fica de fora
          const rots = [], cabe = (x0, x1) => !rots.some(([a0, a1]) => x0 < a1 + 4 && x1 > a0 - 4);
          const fora = zonas.slice(1).find(([z0]) => z0 >= b && z0 < 1e8);
          if (fora) { const t = fora[0] > D.pld_max ? "sem virada até o teto" : `→ ${AB[fora[2]]} ${n(fora[0])}`, w = t.length * 5.4; rots.push([X1 - w, X1]); S(svg, "text", { x: X1, y: y0 - 12, "text-anchor": "end", style: "font-size:9px" }, t); }
          [...new Set(zonas.flatMap(([z0, z1]) => [z0, z1]))].filter(v => v > a && v < b).forEach(v => { const t = n(v), w = t.length * 5.4, xc = X(v); if (!cabe(xc - w / 2, xc + w / 2)) return; rots.push([xc - w / 2, xc + w / 2]); S(svg, "text", { x: xc, y: y0 - 12, "text-anchor": "middle", style: "font-size:9px" }, t); });
          arr.forEach((v, j) => { const c = S(svg, "circle", { cx: X(v), cy: y0 + ((j % 3) - 1) * 4, r: 3, fill: neutro ? "var(--ink-2)" : cor, opacity: neutro ? 0.8 : 0.6, stroke: neutro ? "var(--surface)" : null, "stroke-width": neutro ? 0.8 : null }); dicaEm(c, `Série ${s.series[j]}: ${fmt(v)}`); });
          const med = arr.reduce((t, v) => t + v, 0) / arr.length;
          const tr = S(svg, "line", { x1: X(med), x2: X(med), y1: y0 - 10, y2: y0 + 10, stroke: "var(--ink)", "stroke-width": 2.5 });
          dicaEm(tr, `${rot(p.alvo)} · média das 15: ${fmt(med)}`);
          S(svg, "text", { x: W, y: y0 + 3, "text-anchor": "end", class: "forte" }, fmt(med));
          return X;
        };
        const bp = LIM.map(l => (gMed >= 1 ? 1e7 : l / (1 - gMed)));
        const zonasPld = [[-1e9, bp[0], "Verde"], [bp[0], bp[1], "Amarela"], [bp[1], bp[2], "Vermelha 1"], [bp[2], 1e9, "Vermelha 2"]];
        const xg = fila(164, "GSF", s.gsf, glo, ghi, v => n(v, 2), [], false);
        S(svg, "line", { x1: xg(0.96), x2: xg(0.96), y1: 154, y2: 174, stroke: "var(--ink-3)", "stroke-dasharray": "2 2" });
        fila(200, "PLD R$", s.pld, plo, phi, v => n(v), zonasPld, true);
      }, 214);
    });
  }

  function desenharWf(box) {
    box.replaceChildren();
    const vmax = Math.max(...CG[cenSel].flatMap(c => [c.gh_ons, c.gf_band])) * 1.02, f = D.fatores;
    P.forEach(p => {
      const c = CG[cenSel].find(z => z.alvo === p.alvo);
      const card = cartao(box, `${rot(p.alvo)}<span>M+${p.h} · GSF ${n(c.gsf, 2)}</span>`);
      Mesa.alvo(card, `${rot(p.alvo)} · ${CEN[cenSel].nome}`, inspCenMes(p, cenSel));
      grafAlt(card, (svg, W) => {
        svg.setAttribute("aria-label", `Composição do GSF de ${rot(p.alvo)}`);
        const x0 = 60, x1 = W - 40, X = v => x0 + v / vmax * (x1 - x0), ghcg = c.gh_ons - c.ande - c.perdas;
        const lin = [
          ["Hidráulica", 0, c.gh_ons, "var(--ink-2)", n(c.gh_ons), "Geração hidráulica do SIN, média das 15 séries do NEWAVE"],
          ["− ANDE", c.gh_ons - c.ande, c.gh_ons, "var(--desce)", "−" + n(c.ande), "Parcela paraguaia de Itaipu e consumo interno, do deck"],
          ["− Perdas", ghcg, c.gh_ons - c.ande, "var(--desce)", "−" + n(c.perdas), `Perdas de ${n(f.perda_bruta_conexao, 2)}% e ${n(f.perda_conexao_cg, 2)}% até o centro de gravidade`],
          ["+ PCH MRE", ghcg, ghcg + c.pch_mre, "var(--sobe)", "+" + n(c.pch_mre), `${n(f.part_pch_mre, 1)}% das PCH (${n(c.pch)} MWmed) participam do MRE`],
          ["= GH_band", 0, c.gh_band, CEN[cenSel].cor, n(c.gh_band), "Geração hidráulica que conta para a bandeira"],
          ["GF_band", 0, c.gf_band, "var(--ink-3)", n(c.gf_band), "Garantia física das usinas do MRE no mês (boletim do mês do deck)"],
        ];
        lin.forEach(([r, a, b, corB, txt, dica], i) => {
          const y = 6 + i * 21;
          if (i === 4) S(svg, "line", { x1: 0, x2: W, y1: y - 4, y2: y - 4, stroke: "var(--rule)" });
          S(svg, "text", { x: 0, y: y + 10, style: "font-size:9px" }, r);
          const ret = S(svg, "rect", { x: X(Math.min(a, b)), y, width: Math.max(1.5, Math.abs(X(b) - X(a))), height: 12, fill: corB });
          S(svg, "text", { x: W, y: y + 10, "text-anchor": "end", class: i === 4 ? "forte" : null, style: "font-size:9.5px" }, txt);
          dicaEm(ret, `${rot(p.alvo)} · ${r.replace(/^[−+=] /, "")}: ${txt} MWmed<br>${dica}`);
        });
        const g0 = 0.6, g1 = 1.15, R0 = 40, R1 = W - 40, XG = v => R0 + (Math.min(g1, Math.max(g0, v)) - g0) / (g1 - g0) * (R1 - R0), yg = 160;
        S(svg, "text", { x: 0, y: yg + 3 }, "GSF");
        S(svg, "line", { x1: R0, x2: R1, y1: yg, y2: yg, stroke: "var(--rule)", "stroke-width": 2 });
        S(svg, "line", { x1: XG(0.96), x2: XG(0.96), y1: yg - 9, y2: yg + 9, stroke: "var(--ink-3)", "stroke-dasharray": "2 2" });
        S(svg, "text", { x: XG(0.96), y: yg + 20, "text-anchor": "middle", style: "font-size:9px" }, "0,96");
        [0.7, 1.1].forEach(v => S(svg, "text", { x: XG(v), y: yg + 20, "text-anchor": "middle", style: "font-size:9px" }, n(v, 1)));
        { const ci = S(svg, "circle", { cx: XG(c.gsf), cy: yg, r: 6, fill: CEN.esp.cor, stroke: "var(--ink)", "stroke-width": 1.5 }); dicaEm(ci, `${rot(p.alvo)} · GSF esperado ${n(c.gsf, 2)}`); }
        const ref = D.insumos.realizado.find(r => r.mes === anoAnterior(p.alvo));
        if (ref) { const xa = XG(ref.gsf); const d = S(svg, "path", { d: `M${xa} ${yg - 6} L${xa + 5} ${yg} L${xa} ${yg + 6} L${xa - 5} ${yg} Z`, fill: "var(--ink-3)", stroke: "var(--surface)", "stroke-width": 1.2 }); dicaEm(d, `${rot(anoAnterior(p.alvo))} · GSF oficial ${n(ref.gsf, 2)}`); }
        S(svg, "text", { x: W, y: yg + 4, "text-anchor": "end", class: "forte" }, n(c.gsf, 2));
        const folga = c.gh_band - 0.96 * c.gf_band;
        S(svg, "text", { x: 0, y: 204 }, folga < 0 ? `Faltam ${n(-folga / 1000, 1)} mil MWmed p/ 0,96` : `${n(folga / 1000, 1)} mil MWmed acima de 0,96`);
      }, 214);
    });
  }

  function insumo(corpo, campo, o) {
    const Rr = D.insumos.realizado, Q = D.insumos.projetado, i0 = Rr.length - 1;
    const meses = [...Rr.map(r => r.mes), ...Q.map(q => q.mes)], val = v => (o.esc ? v / 1000 : v), ult = val(Rr[i0][campo]);
    const oficial = meses.map((_, i) => (i <= i0 ? val(Rr[i][campo]) : null));
    const proj = k => meses.map((_, i) => (i < i0 ? null : i === i0 ? ult : val(Q[i - i0 - 1][campo + "_" + k])));
    const series = [{ nome: "Oficial (PMO/CCEE)", v: oficial, cor: "var(--ink)", larg: 2, semPonto: true }, { nome: "Esperado", v: proj("esp"), cor: "var(--accent)", larg: 2.2 }];
    if (o.mlt) series.unshift({ nome: "MLT", v: meses.map((_, i) => (i <= i0 ? Rr[i].mlt : Q[i - i0 - 1].mlt) / 1000), cor: "var(--ink-3)", larg: 1, tracejado: true, semPonto: true });
    grafico(corpo, (svg, W, Hh) => linhas(svg, W, Hh, {
      n: meses.length, series,
      refs: o.ref != null ? [{ v: o.ref, rot: o.refRot }] : [], marca: { i: i0, rot: "deck" }, zero: o.zero,
      rotX: i => (rotuloDeMes(meses[i]) ? rot(meses[i]) : null), titX: i => `${rot(meses[i])} · ${i <= i0 ? "oficial" : "projeção"}`, fmt: o.fmt,
    }));
  }

  function montarCen(area) {
    const p = PROX, q = D.insumos.projetado.find(x => x.mes === p.alvo), cg = CG.esp.find(c => c.alvo === p.alvo), folga = cg.gh_band - 0.96 * cg.gf_band;
    Mesa.decisao(area, [
      { r: `ENA de referência · ${rot(p.alvo)} · MWmed`, v: `${n(q.ena_esp / 1000, 1)} mil`, d: `${pct(q.ena_esp / q.mlt)} da MLT · média do ECMWF`, principal: true },
      { r: `GSF · ${rot(p.alvo)}`, v: n(p.gsf_esp, 2), d: `X ${n(p.x_esp, 1)} · ${p.cor_esp}` },
      { r: `PLD gatilho · ${rot(p.alvo)}`, v: rs(p.pld_esp, 0), d: (() => { const a = gatilhos(p.gsf_esp, p.pld_esp).acima; return a && isFinite(a.pld) ? `vira ${a.cor} acima de ${pldTxt(a.pld)}` : "média das 15 séries"; })() },
      { r: folga < 0 ? `Falta para GSF 0,96 · ${rot(p.alvo)}` : `Acima de GSF 0,96 · ${rot(p.alvo)}`, v: `${n(Math.abs(folga) / 1000, 1)} mil MWmed`, d: `+1.000 MWmed ≈ +${n(sens, 3)} de GSF` },
      { r: "Séries por mês", v: `${D.modelo.k} de 2.000`, d: "as mais parecidas com o ECMWF (D029)" },
    ]);
    const g = Mesa.grade(area);
    const p5 = painel(g, { cod: "BAND-5", titulo: "Seleção das séries do NEWAVE", unidade: "mil MWmed · GSF · R$/MWh", tam: "full", ajuda: "passos" });
    const box = h("div", "mini6 band-mini6"); p5.corpo.append(box);
    const leg = h("div", "band-legs"); p5.corpo.after(leg);
    function desenhar() {
      leg.innerHTML = visSel === "traj"
        ? QC.legenda([["var(--vazio)", "2.000 séries (P10–P90)"], [CEN[cenSel].cor, "15 escolhidas", "l"], ["var(--ink)", "ECMWF", "t"], ["var(--ink)", "Média das 15 (traço)"]]) +
          `<p class="leg">Para cada mês ficam as 15 séries do NEWAVE cuja trajetória de ENA, do deck ao mês, mais se parece com a do ECMWF. Embaixo, GSF e PLD de cada série; o fundo do PLD é a bandeira de cada preço com o GSF médio fixo. Escalas iguais nos seis meses. Clique num mês para as 15 séries.</p>`
        : QC.legenda([["var(--ink-2)", "Hidráulica (NEWAVE)"], ["var(--desce)", "Deduções"], ["var(--sobe)", "PCH no MRE"], [CEN[cenSel].cor, "GH_band"], ["var(--ink-3)", "GF_band"], [CEN.esp.cor, "GSF esperado (●)"], ["var(--ink-3)", "Ano anterior (◆)"]]) +
          `<p class="leg">Da geração hidráulica ao GSF com os fatores da CCEE, média das 15 séries; ANDE, PCH e GF_band vêm do deck e do boletim. Cada 1.000 MWmed a mais de geração elevam o GSF em cerca de ${n(sens, 3)}.</p>`;
      if (visSel === "traj") desenharTraj(box); else desenharWf(box);
    }
    abas(p5, [["traj", "Trajetórias"], ["gsf", "Composição do GSF"]], visSel, v => { visSel = v; LS.gravar("vis", v); desenhar(); }, "Visão");
    desenhar();
    const lg = QC.legenda([["var(--ink)", "Oficial", "l"], ["var(--accent)", "Esperado", "l"], ["var(--ink-3)", "Referência", "t"]]);
    const p6 = painel(g, { cod: "BAND-6", titulo: "ENA do SIN", unidade: "mil MWmed", tam: "m", ajuda: "passos", leg: "Água que chega aos reservatórios. Tracejado: MLT." });
    add(p6.corpo, lg); insumo(p6.corpo, "ena", { esc: true, mlt: true, fmt: v => n(v, 1) + " mil MWmed" });
    const p7 = painel(g, { cod: "BAND-7", titulo: "GSF", unidade: "razão", tam: "m", ajuda: "passos", leg: "Acima de 0,96 (tracejado), verde qualquer que seja o preço." });
    add(p7.corpo, lg); insumo(p7.corpo, "gsf", { ref: 0.96, refRot: "0,96", fmt: v => n(v, 2) });
    const p8 = painel(g, { cod: "BAND-8", titulo: "PLD gatilho", unidade: "R$/MWh", tam: "m", ajuda: "passos", leg: "Tracejado: PLD mínimo do ano." });
    add(p8.corpo, lg); insumo(p8.corpo, "pld", { ref: D.pld_min, refRot: "PLD mínimo", fmt: v => rs(v, 0) });
  }

  // ================================================================================================
  // TELA 3 · HIS Histórico
  // ================================================================================================
  let nRod = +LS.ler("nrod", "6") || 6, vr = LS.ler("var", "cor"), perAdic = LS.ler("adic", "rec");
  const VAR = {
    gsf: { tit: "GSF", fmt: v => n(v, 2), erro: v => sn(v, 2), escala: 0.15, limiar: 0.02, nome: "GSF" },
    pld: { tit: "PLD gatilho", fmt: v => n(v), erro: v => sn(v, 0), escala: 100, limiar: 10, nome: "PLD gatilho R$" },
  };

  function rodadas(box, legVar) {
    const NIV = c => ORD.indexOf(c), V = VAR[vr];
    box.replaceChildren(); box.classList.toggle("band-num", !!V);
    legVar.hidden = !V;
    if (V) legVar.textContent = `Valor do cenário esperado; embaixo, o erro (projetado − oficial): azul acima, vermelho abaixo. ▲▼ mudança de pelo menos ${V.fmt(V.limiar)} contra a rodada anterior exibida. As rodadas até 09/10/26 guardaram só o cenário esperado, com o PLD em reais inteiros.`;
    const decks = todosDecks.slice(0, nRod), dados = RD.filter(r => decks.includes(chaveR(r)));
    const cols = [...new Set(dados.map(r => r.alvo))].sort(), curto = cols.length > 14;
    const grade = `112px repeat(${cols.length}, minmax(${curto ? 30 : 54}px, 1fr))`;
    const oficialNum = m => { const x = histDe(m); return x && x.gsf != null ? (vr === "gsf" ? x.gsf : x.pld) : null; };
    const linha = (rotulo, celula, classe = "") => { const l = h("div", "band-lin"); l.style.gridTemplateColumns = grade; const r = h("span", "band-rot " + classe, rotulo); l.append(r); cols.forEach(m => l.append(celula(m))); box.append(l); return r; };
    const cab = h("div", "band-lin"); cab.style.gridTemplateColumns = grade;
    cab.innerHTML = '<span class="band-rot band-tcol">Rodada</span>' + cols.map(m => `<span class="band-cab${m.endsWith("-01") ? " band-ano" : ""}">${rot(m)}</span>`).join("");
    box.append(cab);
    const vazio = () => h("div", "band-c");
    linha("Oficial CCEE", m => {
      if (!real[m]) return vazio();
      const o = histDe(m);
      if (V) { const v = oficialNum(m); if (v == null) return vazio(); const c = h("div", "band-c band-ofi", V.fmt(v)); dicaEm(c, `<b>${rot(m)}</b> · oficial: ${V.nome} ${V.fmt(v)} · ${real[m]}<br>boletim InfoBandeira (CCEE)`); Mesa.alvo(c, `${rot(m)} · oficial`, inspOficial(m)); return c; }
      const c = h("div", `band-c band-${SIG[real[m]]}`, AB[real[m]]);
      dicaEm(c, `<b>${rot(m)}</b> · oficial: ${real[m]}` + (o.gsf != null ? `<br>GSF ${n(o.gsf, 2)} · PLD gatilho ${rs(o.pld, 2)}` : ""));
      Mesa.alvo(c, `${rot(m)} · oficial`, inspOficial(m));
      return c;
    }, "band-oficial");
    decks.forEach((dk, i) => {
      const daR = dados.filter(r => chaveR(r) === dk), porAlvo = Object.fromEntries(daR.map(r => [r.alvo, r]));
      const pub = daR.some(r => r.publicada), atual = dk === RATUAL, r0 = daR[0] || {};
      const antPub = todosDecks.slice(todosDecks.indexOf(dk) + 1).map(d => RD.find(x => chaveR(x) === d && x.publicada)).find(Boolean);
      let mudanca = "Backtest";
      if (pub && !antPub) mudanca = "1ª publicação";
      else if (pub) {
        const mu = [];
        if (r0.deck !== antPub.deck) mu.push(`DECK ${rot(r0.deck)}`); else if (r0.deck_versao !== antPub.deck_versao) mu.push("DECK republicado");
        if (r0.ecmwf !== antPub.ecmwf) mu.push(mu.length ? "ECMWF" : `ECMWF ${dataBr(r0.ecmwf).slice(0, 5)}`);
        if (r0.modelo !== antPub.modelo) mu.push(`<span class="band-novo">Modelo ${r0.modelo}</span>`);
        mudanca = mu.join(" + ") || "Republicada";
      }
      const qd = pub ? `${dataBr(dk)} <span class="band-hora">${dk.slice(11, 16)}</span>` : (r0.ecmwf ? dataBr(r0.ecmwf) : rot(dk));
      const rotEl = linha(`<span><b>${qd}</b><small>${mudanca}</small></span>`, m => {
        const r = porAlvo[m]; if (!r) return vazio();
        const ant = decks.slice(i + 1).map(d => dados.find(x => chaveR(x) === d && x.alvo === m)).find(Boolean);
        const c = h("div", "band-c");
        if (V) {
          const v = r[vr + "_esp"], ofi = oficialNum(m), e = ofi != null ? v - ofi : null;
          if (atual && ofi == null) c.classList.add("band-proj");
          if (e != null) c.style.background = fundoErro(e, V.escala);
          const va = ant && ant[vr + "_esp"], st = va != null && Math.abs(v - va) >= V.limiar ? (v > va ? "▲" : "▼") : "";
          c.innerHTML = `<span>${V.fmt(v)}${st ? `<span class="band-seta">${st}</span>` : ""}${e != null && !curto ? `<small>${V.erro(e)}</small>` : ""}</span>`;
          dicaEm(c, `<b>${rot(m)}</b> · ${rotRod(dk)} (M+${r.h})<br>${V.nome} projetado ${V.fmt(v)} · bandeira ${r.esp}` + (va != null ? `<br>rodada anterior: ${V.fmt(va)}` : "") + (ofi != null ? `<br>oficial ${V.fmt(ofi)} · erro ${V.erro(e)}` : ""));
        } else {
          c.classList.add("band-" + SIG[r.esp]);
          if (r.real && r.real !== r.esp) c.classList.add("band-errou");
          if (atual && !r.real) c.classList.add("band-proj");
          const pr = probDe(r.prob), st = ant && NIV(ant.esp) !== NIV(r.esp) ? (NIV(r.esp) > NIV(ant.esp) ? "▲" : "▼") : "";
          c.innerHTML = `<span>${AB[r.esp]}${pr && !curto ? " " + pct(pr[r.esp]) : ""}${st ? `<span class="band-seta">${st}</span>` : ""}</span>`;
          dicaEm(c, `<b>${rot(m)}</b> · ${rotRod(dk)} (M+${r.h})<br>esperado ${r.esp}${r.prob ? " · " + r.prob : ""}<br>${r.gp}` + (ant ? `<br>rodada anterior (${rotRod(chaveR(ant))}): ${ant.esp}` : "") + (r.real ? `<br>oficial: ${r.real}` : ""));
        }
        Mesa.alvo(c, `${rot(m)} · ${rotRod(dk)}`, inspCelula(r, ant));
        return c;
      }, atual ? "band-atual" : pub ? "" : "band-recon");
      rotEl.title = pub ? `Rodada publicada em ${dataHora(dk)} · DECK ${rot(r0.deck)} (versão ${r0.deck_versao}) · ECMWF ${dataBr(r0.ecmwf)} · modelo ${r0.modelo} · ${r0.motivo}` : `Rodada reconstruída pelo backtest · DECK ${rot(r0.deck)}`;
      Mesa.alvo(rotEl, pub ? `Rodada ${rotRod(dk)}` : `Backtest · deck ${rot(dk)}`, inspRodada(dk));
    });
  }

  function faixa(corpo) {
    const todos = [...H.map(x => ({ mes: x.mes, cor: x.cor, proj: false })), ...fut.map(p => ({ mes: p.alvo, cor: p.cor_esp, proj: true }))];
    grafAlt(corpo, (svg, W) => {
      const cw = W / todos.length;
      todos.forEach((t, i) => {
        const r = S(svg, "rect", { x: i * cw, y: 4, width: Math.max(cw - 1, 1), height: 34, fill: COR(t.cor), opacity: t.proj ? 0.55 : 1, class: "band-clicavel" });
        if (t.proj) S(svg, "rect", { x: i * cw + 0.5, y: 4.5, width: Math.max(cw - 2, 1), height: 33, fill: "none", stroke: "var(--ink)", "stroke-dasharray": "2 2", "pointer-events": "none" });
        dicaEm(r, `${rot(t.mes)} · ${t.cor}${t.proj ? " (projeção)" : ""}<br><i>clique para o ano</i>`);
        r.addEventListener("click", () => Mesa.inspecionar(`Bandeiras de ${t.mes.slice(0, 4)}`, inspAno(t.mes.slice(0, 4), t.mes)));
        const mq = +t.mes.slice(5);
        if (cw >= 6) S(svg, "text", { x: i * cw + cw / 2, y: 50, "text-anchor": "middle", style: `font-size:${Math.min(9, cw * 0.9).toFixed(1)}px` }, "JFMAMJJASOND"[mq - 1]);
        if (mq === 1) { S(svg, "line", { x1: i * cw, x2: i * cw, y1: 39, y2: 66, stroke: "var(--ink-3)" }); S(svg, "text", { x: i * cw + 3, y: 64, class: "forte" }, cw * 12 >= 30 ? t.mes.slice(0, 4) : t.mes.slice(2, 4)); }
      });
    }, 68);
  }

  function adicional(corpo) {
    corpo.replaceChildren();
    const todo = [...H.map(x => ({ mes: x.mes, v: x.adicional / 10 })), ...fut.map(p => ({ mes: p.alvo, v: p.adicional / 10, cor: p.cor_esp, proj: true }))];
    grafAlt(corpo, (svg, w, hh) => {
      const m = { l: 44, r: 10, t: 10, b: 36 }, nReais = todo.filter(s => !s.proj).length;
      const serie = perAdic === "rec" ? todo.slice(nReais - 24) : todo;
      const vmax = Math.max(5, ...serie.map(s => s.v)) * 1.08, bw = (w - m.l - m.r) / serie.length, hw = bw / 2;
      const x = i => m.l + (i + 0.5) * bw, y = v => m.t + (hh - m.t - m.b) * (1 - v / vmax);
      for (let v = 0; v <= vmax; v += vmax > 10 ? 5 : 2) { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 6, y: y(v) + 3, "text-anchor": "end" }, rs(v, 0)); }
      const i0 = serie.findIndex(s => s.proj), ult = i0 - 1;
      S(svg, "path", { d: serie.slice(0, i0).map((s, i) => (i ? `V${y(s.v)} H${x(i) + hw}` : `M${x(0) - hw},${y(s.v)} H${x(0) + hw}`)).join(" "), fill: "none", stroke: "var(--ink)", "stroke-width": 1.6 });
      S(svg, "path", { d: `M${x(ult) + hw},${y(serie[ult].v)} ` + serie.slice(i0).map((s, j) => `V${y(s.v)} H${x(i0 + j) + hw}`).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2, "stroke-dasharray": "5 3" });
      S(svg, "line", { x1: x(ult) + hw, x2: x(ult) + hw, y1: m.t, y2: hh - m.b, stroke: "var(--ink-3)", "stroke-dasharray": "2 3" });
      S(svg, "text", { x: x(ult) + hw - 4, y: m.t + 9, "text-anchor": "end" }, "projeção");
      serie.forEach((s, i) => {
        const mq = +s.mes.slice(5);
        if (perAdic === "rec") {
          S(svg, "text", { x: x(i), y: hh - m.b + 13, "text-anchor": "middle" }, "JFMAMJJASOND"[mq - 1]);
          if (mq === 1 || (i === 0 && mq < 11)) { S(svg, "line", { x1: x(i) - hw, x2: x(i) - hw, y1: hh - m.b, y2: hh - m.b + 26, stroke: "var(--ink-3)" }); S(svg, "text", { x: x(i) - hw + 3, y: hh - 2, class: "forte" }, s.mes.slice(0, 4)); }
        } else if (mq === 1) {
          S(svg, "line", { x1: x(i) - hw, x2: x(i) - hw, y1: hh - m.b, y2: hh - m.b + 26, stroke: "var(--ink-3)" });
          if (bw * 12 >= 34 || +s.mes.slice(0, 4) % 2 === 1) S(svg, "text", { x: x(i) - hw + 3, y: hh - 2, class: "forte" }, bw * 12 >= 34 ? s.mes.slice(0, 4) : s.mes.slice(2, 4));
        }
        const alvo = S(svg, "rect", { x: x(i) - hw, y: m.t, width: bw, height: hh - m.t - m.b, fill: "transparent", class: "band-clicavel" });
        dicaEm(alvo, s.proj ? `${rot(s.mes)} · projeção<br>cor esperada ${s.cor}: ${rs(s.v, 3)} por 100 kWh` : `${rot(s.mes)} · ${real[s.mes]} · ${rs(s.v, 2)} por 100 kWh`);
        alvo.addEventListener("click", () => Mesa.inspecionar(`Bandeiras de ${s.mes.slice(0, 4)}`, inspAno(s.mes.slice(0, 4), s.mes)));
      });
    }, 300);
  }

  function porAno(corpo) {
    const anos = [...new Set(H.map(x => x.mes.slice(0, 4)))];
    const linhas = anos.map(a => { const ms = H.filter(x => x.mes.startsWith(a)); return [a, ...[...ORD, "Escassez hídrica"].map(c => ms.filter(x => x.cor === c).length), ms.reduce((t, x) => t + x.adicional / 10, 0) / ms.length, ms.length]; });
    QC.tabela(corpo, [{ t: "Ano" }, { t: "Vd", n: 1 }, { t: "Am", n: 1 }, { t: "V1", n: 1 }, { t: "V2", n: 1 }, { t: "EH", n: 1 }, { t: "R$/100", n: 1 }],
      linhas.map(l => [l[0] + (l[7] < 12 ? ` <small>${l[7]}m</small>` : ""), ...l.slice(1, 6).map((v, j) => (v ? `<span class="band-cont" style="--c:${COR([...ORD, "Escassez hídrica"][j])}">${v}</span>` : "·")), n(l[6], 2)]), "band-tab densa band-anos");
    corpo.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `Bandeiras de ${linhas[i][0]}`, inspAno(linhas[i][0])));
  }

  function montarHis(area) {
    const pd = PROX, seq = pubs.map(k => daRodada(k, pd.alvo)).filter(Boolean);
    const ano = H[H.length - 1].mes.slice(0, 4), msAno = H.filter(x => x.mes.startsWith(ano));
    const cont = ORD.map(c => [c, msAno.filter(x => x.cor === c).length]).filter(([, v]) => v);
    const verm = H.filter(x => /Vermelha/.test(x.cor)).length, esc_ = H.filter(x => x.cor === "Escassez hídrica").length, ultH = H[H.length - 1];
    Mesa.decisao(area, [
      { r: `${rot(pd.alvo)} nas ${seq.length} publicações`, v: seq.map(r => AB[r.esp]).join(" → "), d: seq.map(r => { const pr = probDe(r.prob); return pr ? pct(pr[r.esp]) : "—"; }).join(" · "), principal: true },
      { r: "Última rodada", v: rotRod(RATUAL), d: `${D.rodada.motivo} · deck ${rot(D.deck)} v ${D.rodada.insumos.deck_versao}` },
      { r: `Bandeiras de ${ano} (até ${rot(ultH.mes)})`, v: cont.map(([c, v]) => `${v} ${AB[c]}`).join(" · "), d: "boletins InfoBandeira (CCEE)" },
      { r: `Adicional · ${rot(ultH.mes)}`, v: rs(ultH.adicional / 10, 2), d: `por 100 kWh · ${rot(pd.alvo)} esperado ${rs(pd.adicional / 10, 2)}` },
      { r: `Meses vermelhos desde ${H[0].mes.slice(0, 4)}`, v: `${verm} de ${H.length}`, d: `e ${esc_} de escassez hídrica` },
    ]);
    const g = Mesa.grade(area);
    const p9 = painel(g, { cod: "BAND-9", titulo: "Rodadas de projeção", unidade: "cor esperada e probabilidade", tam: "full", ajuda: "historico",
      leg: "Cada linha é uma rodada (publicada quando muda o deck do NEWAVE ou a emissão do ECMWF); lendo a coluna de baixo para cima, vê-se como a projeção do mês mudou. ▲▼ cor mais cara ou mais barata que na rodada anterior exibida; ✗ diferente da oficial; contorno tracejado: projeção da rodada atual. Backtest: reconstruída só com a informação da data (sem decks de set e out/25 nem de jun a ago/26). Clique numa data ou célula para o detalhe." });
    const rol = h("div", "rolagem"), box = h("div", "band-tempo"); rol.append(box); p9.corpo.append(rol);
    const legVar = h("p", "leg"); p9.corpo.append(legVar);
    abas(p9, [["cor", "Bandeira"], ["gsf", "GSF"], ["pld", "PLD gatilho"]], vr, v => { vr = v; LS.gravar("var", v); rodadas(box, legVar); }, "Variável");
    abas(p9, [["6", "6 rodadas"], ["12", "12"], ["99", "Todas"]], String(nRod), v => { nRod = +v; LS.gravar("nrod", v); rodadas(box, legVar); }, "Quantidade de rodadas");
    rodadas(box, legVar);
    const p10 = painel(g, { cod: "BAND-10", titulo: `Bandeiras acionadas, ${H[0].mes.slice(0, 4)}–${fut[fut.length - 1].alvo.slice(0, 4)}`, tam: "full", ajuda: "historico",
      leg: "Meses projetados (cor esperada) com contorno tracejado. Clique num mês para o ano no inspetor." });
    p10.acoes.insertAdjacentHTML("afterbegin", QC.legenda([...ORD, "Escassez hídrica"].map(c => [COR(c), c])));
    faixa(p10.corpo);
    const p11 = painel(g, { cod: "BAND-11", titulo: "Adicional tarifário na conta", unidade: "R$ por 100 kWh", tam: "xl", ajuda: "adicional",
      leg: "Valor cobrado na conta em cada bandeira. Na projeção, o tracejado é o adicional da cor esperada, com os valores vigentes." });
    abas(p11, [["rec", "24 meses + projeção"], ["todo", "Desde 2015"]], perAdic, v => { perAdic = v; LS.gravar("adic", v); adicional(p11.corpo); }, "Período");
    adicional(p11.corpo);
    const p12 = painel(g, { cod: "BAND-12", titulo: "Meses por cor e ano", unidade: "nº · R$/100 kWh", tam: "s", ajuda: "adicional", leg: "Adicional médio do ano. Clique num ano para os meses." });
    porAno(p12.corpo);
  }

  // ================================================================================================
  // TELA 4 · REL Relato do DECOMP (a mesma conta da 07, ContaRelato)
  // ================================================================================================
  const RS = { iniciado: false, mes: null, ano: null, gf: "", pmin: "", pmax: "", nota: "", execs: [], prox: 1, confSel: null, passo: "1", ult: null };
  const entradas = {};
  let relUI = null;   // referências da tela REL montada (null quando outra tela está aberta)
  const novaExec = (o = {}) => ({ id: RS.prox++, nome: "", ccee: null, ons: null, pld_manual: "", ...o });
  const mesesRel = R ? Object.keys(R.horas).sort() : [];
  function premissasDoBoletim() {
    const p = C.valoresPublicados(R.boletim, RS.mes);
    if (!p) { RS.nota = "sem boletim: informe"; return; }
    RS.gf = String(p.gf_band); RS.pmin = String(p.pld_min); RS.pmax = String(p.pld_max);
    RS.nota = `boletim de ${rot(p.origem)}` + (p.origem.slice(0, 4) !== RS.mes.slice(0, 4) ? " · limites do ano anterior, confira" : "");
  }
  function iniciarRS() {
    if (RS.iniciado || !R || !C) return;
    RS.iniciado = true;
    const ultB = Object.keys(R.boletim).sort().pop(), [a, m] = ultB.split("-").map(Number), prox = `${a + Math.floor(m / 12)}-${String(m % 12 + 1).padStart(2, "0")}`;
    RS.mes = EX && R.horas[EX.mes] ? EX.mes : R.horas[prox] ? prox : mesesRel[mesesRel.length - 1];
    RS.ano = RS.mes.slice(0, 4);
    premissasDoBoletim();
    if (EX && EX.execucoes && EX.execucoes.length) EX.execucoes.forEach(x => RS.execs.push(novaExec({ nome: x.nome, ccee: x.ccee, ons: x.ons, pld_manual: x.pld_manual || "" })));
    else RS.execs.push(novaExec());
  }
  function calcularRel() {
    iniciarRS();
    if (!RS.iniciado) return null;
    const mes = RS.mes, base = { periodo: mes, horas: R.horas[mes], fatores: R.fatores, limites_x: R.limites_x, gf_band: parseFloat(RS.gf), pld_min: parseFloat(RS.pmin), pld_max: parseFloat(RS.pmax) };
    const res = RS.execs.map((e, i) => {
      const nome = e.nome.trim() || `Execução ${i + 1}`, manual = String(e.pld_manual).trim() === "" ? null : parseFloat(e.pld_manual);
      if (!e.ccee && !e.ons) return { i, id: e.id, nome, vazio: true };
      try {
        if ([base.gf_band, base.pld_min, base.pld_max].some(v => !isFinite(v))) throw new Error("informe GF_band e PLD mín/máx");
        const alertas = [];
        for (const [r, a] of [["da CCEE", e.ccee], ["do ONS", e.ons]]) { const mr = a && C.mesDoRelato(a.texto); if (mr && mr !== +mes.slice(5, 7)) alertas.push(`o relato ${r} indica ${MESL[mr - 1]} (rótulo da semana 1), e o mês selecionado é ${MESL[+mes.slice(5, 7) - 1]}`); }
        const ent = { ...base, ccee: e.ccee && e.ccee.texto, ons: e.ons && e.ons.texto, pld_gatilho_manual: manual };
        entradas[e.id] = ent;
        return { i, id: e.id, nome, alertas, r: C.calcular(ent) };
      } catch (err) { return { i, id: e.id, nome, erro: err.message }; }
    });
    const ok = res.filter(x => x.r), prob = ok.length ? C.probabilidadeCores(ok.map(x => x.r.cor), ORD) : null;
    RS.ult = { res, ok, prob, mes };
    return RS.ult;
  }
  const topCor = pr => ORD.reduce((a, c) => (pr[c] > pr[a] ? c : a), "Verde");

  async function lerTexto(arquivo) {
    let buf = await arquivo.arrayBuffer();
    const u = new Uint8Array(buf);
    if (u[0] === 0x1f && u[1] === 0x8b) {
      if (typeof DecompressionStream === "undefined") throw new Error("este navegador não abre .gz: descompacte o arquivo antes");
      buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    }
    return new TextDecoder("latin1").decode(buf);
  }
  const tam = b => (b >= 1e6 ? n(b / 1e6, 1) + " MB" : n(b / 1e3) + " KB");
  const nomeArq = a => `${esc(a.nome)} · ${tam(a.tam)}${a.exemplo ? " · exemplo fictício" : ""}`;

  function formEntrada(corpo) {
    const anos = [...new Set(mesesRel.map(m => m.slice(0, 4)))];
    const f = h("div", "band-form"); corpo.append(f);
    function desenhar() {
      f.innerHTML = `<div class="band-mesq"><label>Ano <select class="band-in" data-k="ano">${anos.map(a => `<option${a === RS.ano ? " selected" : ""}>${a}</option>`).join("")}</select></label><span>Mês da bandeira: <b>${rotLongo(RS.mes)}</b></span></div>` +
        `<div class="band-gmes" role="group" aria-label="Mês">${MES.map((nm, i) => { const m = `${RS.ano}-${String(i + 1).padStart(2, "0")}`, tem = !!R.horas[m]; return `<button type="button" data-mes="${m}" class="${R.boletim[m] ? "band-pub" : ""}${R.horas_estimadas.includes(m) ? " band-est" : ""}" aria-pressed="${m === RS.mes}"${tem ? "" : " disabled"} title="${MESL[i]} de ${RS.ano}${R.boletim[m] ? " · boletim publicado" : ""}">${nm}</button>`; }).join("")}</div>` +
        `<small class="band-nota">${notaMes()}</small>` +
        `<div class="band-campos">${[["gf", "GF_band MWmed"], ["pmin", "PLD mín R$"], ["pmax", "PLD máx R$"]].map(([k, r]) => `<label>${r}<input class="band-in" type="number" step="any" inputmode="decimal" data-k="${k}" value="${esc(RS[k])}"></label>`).join("")}</div>` +
        `<small class="band-nota">${esc(RS.nota)}</small>` +
        `<div class="band-execs">${RS.execs.map((e, i) => `<div class="band-exec" data-id="${e.id}"><div class="band-exec-topo"><span class="band-idx">${i + 1}</span><input class="band-in" type="text" placeholder="Nome (ex.: Cenário seco)" value="${esc(e.nome)}" data-k="nome" aria-label="Nome da execução ${i + 1}">${RS.execs.length > 1 ? `<button type="button" class="band-bt leve" data-rm="${e.id}" title="Remover a execução">×</button>` : ""}</div>` +
          [["ccee", "CCEE", "PLD gatilho", "nenhum arquivo"], ["ons", "ONS", "GH_band, opcional", "sem ele, o GH vem da CCEE"]].map(([k, r, para, vaz]) => `<label class="band-arq"><span class="band-arq-r">${r}<small>${para}</small></span><span class="band-arq-c"><input class="band-file" type="file" accept=".rv0,.gz,.txt,.dat" data-k="${k}" aria-label="Relato ${r} da execução ${i + 1}"><span class="band-bt band-file-bt">Carregar…</span><span class="band-arq-n${e[k] ? " ok" : ""}">${e[k] ? nomeArq(e[k]) : vaz}</span></span></label>`).join("") +
          `<label class="band-arq"><span class="band-arq-r">PLD<small>manual</small></span><input class="band-in" type="number" step="any" data-k="pld_manual" value="${esc(e.pld_manual)}" placeholder="só sem relato da CCEE"></label></div>`).join("")}</div>` +
        `<div class="band-botoes"><button type="button" class="band-bt" data-acao="add">+ Execução</button><button type="button" class="band-bt leve" data-acao="restaurar">Restaurar premissas do boletim</button></div>`;
    }
    function notaMes() {
      const est = R.horas_estimadas.includes(RS.mes), of = R.boletim[RS.mes];
      return (est ? "patamares do ano ainda não publicados: usa os do ano anterior · " : "") + (of ? `boletim publicado: ${of.cor}` : "boletim ainda não publicado") + " · ponto = boletim publicado";
    }
    f.addEventListener("click", ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.mes && !b.disabled) { RS.mes = b.dataset.mes; premissasDoBoletim(); desenhar(); atualizarRel(); }
      else if (b.dataset.rm) { RS.execs.splice(RS.execs.findIndex(x => x.id === +b.dataset.rm), 1); desenhar(); atualizarRel(); }
      else if (b.dataset.acao === "add") { RS.execs.push(novaExec()); desenhar(); atualizarRel(); }
      else if (b.dataset.acao === "restaurar") { premissasDoBoletim(); desenhar(); atualizarRel(); }
    });
    f.addEventListener("input", ev => { const t = ev.target, ex = t.closest(".band-exec"); if (t.dataset.k === "nome" && ex) RS.execs.find(x => x.id === +ex.dataset.id).nome = t.value; });
    f.addEventListener("change", async ev => {
      const t = ev.target, k = t.dataset.k, ex = t.closest(".band-exec"), e = ex && RS.execs.find(x => x.id === +ex.dataset.id);
      if (k === "ano") { RS.ano = t.value; const mm = RS.mes.slice(5); RS.mes = R.horas[`${RS.ano}-${mm}`] ? `${RS.ano}-${mm}` : mesesRel.find(m => m.startsWith(RS.ano)); premissasDoBoletim(); desenhar(); atualizarRel(); return; }
      if (["gf", "pmin", "pmax"].includes(k)) { RS[k] = t.value; atualizarRel(); return; }
      if (!e) return;
      if (t.type === "file") {
        const arq = t.files[0], alvo = t.closest(".band-arq").querySelector(".band-arq-n");
        if (!arq) { e[k] = null; alvo.textContent = k === "ccee" ? "nenhum arquivo" : "sem ele, o GH vem da CCEE"; alvo.classList.remove("ok"); }
        else {
          alvo.textContent = "lendo…";
          try { e[k] = { nome: arq.name, tam: arq.size, texto: await lerTexto(arq) }; alvo.textContent = `${arq.name} · ${tam(arq.size)}`; alvo.classList.add("ok"); }
          catch (err) { e[k] = null; alvo.textContent = err.message; alvo.classList.remove("ok"); }
        }
      } else e[k] = t.value;
      atualizarRel();
    });
    desenhar();
  }

  const PAT = ["Pesado", "Médio", "Leve"];
  function inspExec(x) {
    return el => {
      const r = x.r, i = ORD.indexOf(r.cor), acima = ORD[i + 1], abaixo = ORD[i - 1];
      add(el, `<div class="band-i-topo"><span class="band-idx">${x.i + 1}</span>${chip(r.cor)}<span>X ${n(r.x, 2)} R$/MWh</span></div>`);
      QC.pares(el, [["GH_band", n(r.gh_band) + " MWmed"], ["GF_band", n(r.gf_band) + " MWmed"], ["GSF", n(r.gsf, 2)], ["PLD gatilho", rs(r.pld_gatilho, 2)], ["Fonte do GH", r.fontes.gh], ["Fonte do PLD", r.fontes.pld]]);
      const L = [];
      if (acima && r.gsf < 1) L.push(`${chip(acima)} se PLD &gt; ${rs(r.pld_cor_acima, 1)} ou GSF &lt; ${n(r.gsf_cor_acima, 2)}`);
      if (abaixo) L.push(`${chip(abaixo)} se PLD ≤ ${rs(r.x_limite_inferior / (1 - r.gsf), 1)} ou GSF ≥ ${n(Math.min(1 - r.x_limite_inferior / r.pld_gatilho, 1), 2)}`);
      add(el, `<h3>Muda de cor se…</h3><p class="band-i-txt">${L.join("<br>") || "—"}</p>`);
      const subs = Object.entries(r.pld_submercado);
      if (subs.length) {
        add(el, `<h3>PLD médio por submercado (R$/MWh)</h3>`);
        grafico(el, (svg, W, Hh) => barras(svg, W, Hh, { cats: subs.map(([s]) => s), series: [{ nome: "PLD médio", v: subs.map(([, v]) => v), cor: "var(--accent)" }], fmt: v => rs(v, 2) }));
      } else add(el, `<p class="band-i-txt">PLD gatilho informado à mão.</p>`);
      [...x.alertas.map(a => "⚠ " + a), ...r.avisos].forEach(a => add(el, `<p class="band-i-txt desce">${esc(a)}</p>`));
    };
  }

  function resultadoRel(corpo, u) {
    corpo.replaceChildren();
    const { res, ok, prob } = u, maior = prob ? Math.max(...ORD.map(c => prob[c])) : 0;
    const pg = add(corpo, `<div class="band-relp">${ORD.map(c => `<div class="${prob && prob[c] === maior && maior > 0 ? "band-maior" : ""}" data-c="${c}"><span>${chip(c, AB[c])} ${c}</span><strong class="band-relp-v num">${prob ? pct(prob[c]) : "—"}</strong><i style="width:${prob ? prob[c] * 100 : 0}%;background:${COR(c)}"></i></div>`).join("")}</div>`);
    pg.querySelectorAll("[data-c]").forEach(d => { const c = d.dataset.c, k = ok.filter(x => x.r.cor === c).length; dicaEm(d, prob ? `<b>${c}</b>: ${pct(prob[c])}<br>${k} de ${ok.length} execuç${ok.length > 1 ? "ões" : "ão"}` : `<b>${c}</b>: carregue ao menos um relato`); });
    const box = h("div", "rolagem"); corpo.append(box);
    const t = h("table", "band-tab densa band-res");
    t.innerHTML = `<thead><tr><th></th><th>Execução</th><th class="n">GH_band</th><th class="n">GSF</th><th class="n">PLD gatilho</th><th class="n">X</th><th>Cor</th><th>Muda de cor se…</th></tr></thead><tbody>` +
      (res.some(x => !x.vazio) ? res.map(x => {
        const idx = `<td><span class="band-idx">${x.i + 1}</span></td>`;
        if (x.vazio) return `<tr>${idx}<td>${esc(x.nome)}</td><td colspan="6" class="band-vazio">carregue o relato da CCEE (e, se houver, o do ONS)</td></tr>`;
        if (x.erro) return `<tr>${idx}<td>${esc(x.nome)}</td><td colspan="6" class="desce">${esc(x.erro)}</td></tr>`;
        const r = x.r, i = ORD.indexOf(r.cor), acima = ORD[i + 1], abaixo = ORD[i - 1], muda = [];
        if (acima && r.gsf < 1) muda.push(`${chip(acima, AB[acima])} PLD &gt; ${n(r.pld_cor_acima, 1)} ou GSF &lt; ${n(r.gsf_cor_acima, 2)}`);
        if (abaixo) muda.push(`${chip(abaixo, AB[abaixo])} PLD ≤ ${n(r.x_limite_inferior / (1 - r.gsf), 1)} ou GSF ≥ ${n(Math.min(1 - r.x_limite_inferior / r.pld_gatilho, 1), 2)}`);
        const sub = Object.keys(r.pld_submercado).length ? Object.entries(r.pld_submercado).map(([s, v]) => `${s}: ${rs(v, 2)}`).join("<br>") : "PLD informado à mão";
        return `<tr data-id="${x.id}">${idx}<td>${esc(x.nome)}<small class="band-fonte${r.fontes.gh !== "ONS" ? " desce" : ""}">GH: ${esc(r.fontes.gh)} · PLD: ${esc(r.fontes.pld)}</small>${x.alertas.map(a => `<small class="band-fonte desce">⚠ ${esc(a)}</small>`).join("")}</td>` +
          `<td class="n">${n(r.gh_band)}</td><td class="n">${n(r.gsf, 2)}</td><td class="n" data-dica="${esc(sub)}">${n(r.pld_gatilho, 2)}</td><td class="n">${n(r.x, 1)}</td><td>${chip(r.cor, AB[r.cor])}</td><td class="band-muda">${muda.join("<br>")}</td></tr>`;
      }).join("") : `<tr><td colspan="8" class="band-vazio">Carregue ao menos um relato para calcular.</td></tr>`) + `</tbody>`;
    box.append(t);
    t.querySelectorAll("td[data-dica]").forEach(td => dicaEm(td, td.dataset.dica));
    t.querySelectorAll("tr[data-id]").forEach(tr => { const x = ok.find(o => o.id === +tr.dataset.id); Mesa.alvo(tr, `${x.i + 1}. ${x.nome}`, inspExec(x)); });
    const of = R.boletim[u.mes], av = [];
    if (of) av.push(`Boletim publicado de ${rot(u.mes)}: GSF ${n(of.gsf, 2)} · PLD gatilho ${rs(of.pld_gatilho, 2)} · ${of.cor}.`);
    if (res.some(x => x.r && x.r.fontes.gh !== "ONS")) av.push("Sem o relato do ONS, o GH_band vem do relato da CCEE e pode diferir em até ~1% (cerca de 0,01 de GSF); perto de um limite de cor, use o do ONS.");
    res.forEach(x => x.r && x.r.avisos.forEach(a => av.push(`${esc(x.nome)}: ${esc(a)}`)));
    res.forEach(x => x.alertas && x.alertas.length && av.push(`⚠ ${esc(x.nome)}: confira se é o relato certo; em estudo customizado a partir de um deck existente o rótulo do mês pode continuar igual.`));
    if (R.horas_estimadas.includes(u.mes)) av.push("Patamares de carga deste ano ainda não publicados: as horas por patamar são as do mesmo mês do ano anterior (muda pouco o PLD).");
    av.push("Sem GFOM (despacho térmico fora da ordem de mérito): se o CMSE determinar, a cor final pode subir.");
    add(corpo, `<ul class="band-avisos">${av.map(a => `<li>${a}</li>`).join("")}</ul>`);
  }

  function abacoRel(corpo, u) {
    corpo.replaceChildren();
    const jan = u.ok.length ? janela(u.ok.map(e => e.r.gsf), u.ok.map(e => e.r.pld_gatilho), parseFloat(RS.pmax)) : { g0: 0.7, g1: 1.12, p1: 300 };
    grafAlt(corpo, (svg, W, Hh) => abaco(svg, W, Hh, jan, ({ x, y }) => {
      u.ok.forEach(e => {
        const r = e.r, g = S(svg, "g", { class: "cen-marca-svg band-marca" });
        S(g, "circle", { cx: x(r.gsf), cy: y(r.pld_gatilho), r: 9 }); S(g, "text", { x: x(r.gsf), y: y(r.pld_gatilho) + 3.5, "text-anchor": "middle" }, String(e.i + 1));
        dicaEm(g, `<b>${esc(e.nome)}</b> · ${r.cor}<br>GSF ${n(r.gsf, 2)} · PLD ${rs(r.pld_gatilho, 2)}<br>X = ${n(r.x, 1)}`);
        Mesa.alvo(g, `${e.i + 1}. ${e.nome}`, inspExec(e));
      });
    }), 300);
  }

  const tabPS = (t, horas, c = 1, med = true) => `<div class="rolagem"><table class="band-tab densa"><thead><tr><th></th>${t[0].map((_, w) => `<th class="n">Sem ${w + 1}</th>`).join("")}${med ? '<th class="n band-med">Média do mês</th>' : ""}</tr></thead><tbody>` +
    t.map((l, p) => `<tr><td>${PAT[p]}</td>${l.map(v => `<td class="n">${n(v, c)}</td>`).join("")}${med ? `<td class="n band-med">${n(l.reduce((a, v, w) => a + v * horas[p][w], 0) / horas[p].reduce((a, v) => a + v, 0), c)}</td>` : ""}</tr>`).join("") + "</tbody></table></div>";

  function conferencia(corpo, u) {
    corpo.replaceChildren();
    if (!u.ok.length) { add(corpo, `<p class="leg">Sem execução calculada.</p>`); return; }
    if (!u.ok.some(x => x.id === RS.confSel)) RS.confSel = u.ok[0].id;
    const x = u.ok.find(o => o.id === RS.confSel), m = C.memoria(entradas[x.id]), g = m.gh, f = g.fatores, hh = m.horas.tab, B = m.bandeira;
    let html = "";
    if (RS.passo === "1") html = `<div class="band-passo"><h3>1. Horas do mês por patamar e semana</h3>${tabPS(hh, hh, 0, false)}<p class="leg">Só as horas dentro do mês (semana operativa de sábado a sexta). Total: ${n(m.horas.total)} h. É o peso de toda média abaixo.</p></div>`;
    else if (RS.passo === "2") html = `<div class="band-passo band-2col"><div><h3>2. GH_band e GSF <small class="band-fonte${g.fonte === "ONS" ? "" : " desce"}">fonte: relato ${esc(g.fonte)}</small></h3>` +
      `<div class="band-tt">Hidráulica = Σ Ghid dos 4 subsistemas + Itaipu 60 Hz (MWmed)</div>${tabPS(g.tab_gh_ons, hh, 1)}<div class="band-tt">ANDE (MWmed)</div>${tabPS(g.tab_ande, hh, 1)}<div class="band-tt">PCH, soma dos subsistemas (MWmed)</div>${tabPS(g.tab_pch, hh, 1)}</div>` +
      `<div><div class="band-tt">Fatores da CCEE vigentes (desde ${esc(f.vigente_desde)})</div><table class="band-tab densa"><tbody><tr><td>Perda bruta na conexão</td><td class="n">${n(f.perda_bruta_conexao, 5)}</td></tr><tr><td>Perda da conexão ao centro de gravidade</td><td class="n">${n(f.perda_conexao_cg, 5)}</td></tr><tr><td>Participação das PCH no MRE</td><td class="n">${n(f.part_pch_mre, 5)}</td></tr><tr><td>Perda das PCH até o centro de gravidade</td><td class="n">${n(f.perda_pch_cg, 5)}</td></tr></tbody></table>` +
      `<div class="eq">GH_cg = (GH ONS − ANDE) × (1 − perda bruta) × (1 − perda CG)<br>&nbsp;&nbsp;= (${n(g.gh_ons, 1)} − ${n(g.ande, 1)}) × ${n(1 - f.perda_bruta_conexao, 5)} × ${n(1 - f.perda_conexao_cg, 5)} = <b>${n(g.gh_cg, 1)}</b><br>` +
      `PCH_cg = PCH × participação no MRE × (1 − perda PCH)<br>&nbsp;&nbsp;= ${n(g.pch, 1)} × ${n(f.part_pch_mre, 5)} × ${n(1 - f.perda_pch_cg, 5)} = <b>${n(g.pch_cg, 1)}</b><br>GH_band = GH_cg + PCH_cg = <b>${n(g.gh_band, 1)}</b> MWmed<br>` +
      `GSF = ${n(g.gh_band, 1)} ÷ ${n(g.gf_band, 0)} = ${n(g.gsf_bruto, 4)} → <b>${n(g.gsf, 2)}</b> (2 casas)</div></div></div>`;
    else if (RS.passo === "3") {
      const Pp = m.pld;
      if (!Pp.submercados) html = `<div class="band-passo"><h3>3. PLD gatilho</h3><div class="eq">PLD gatilho informado à mão: <b>${rs(Pp.pld_gatilho, 2)}</b>/MWh</div></div>`;
      else {
        const subs = Object.entries(Pp.submercados);
        html = `<div class="band-passo band-2col"><div><h3>3. PLD gatilho (relato da CCEE)</h3><p class="leg">Custo marginal (R$/MWh) por patamar e semana, limitado ao PLD mínimo (${n(Pp.pld_min, 2)}) e máximo (${n(Pp.pld_max, 2)}); onde o limite agiu, <span class="desce">original → limitado</span>. Média pelas horas do passo 1.</p>` +
          `<div class="rolagem"><table class="band-tab densa"><thead><tr><th>Sub.</th><th>Patamar</th>${subs[0][1].cmo[0].map((_, w) => `<th class="n">Sem ${w + 1}</th>`).join("")}<th class="n band-med">Média</th></tr></thead><tbody>` +
          subs.map(([sub, d]) => d.cmo.map((l, p) => `<tr><td>${p === 0 ? "<b>" + sub + "</b>" : ""}</td><td>${PAT[p]}</td>` + l.map((v, w) => { const lv = d.limitado[p][w]; return Math.abs(lv - v) > 1e-9 ? `<td class="n desce" title="CMO ${n(v, 2)}, limitado a ${n(lv, 2)}">${n(v, 2)}→${n(lv, 2)}</td>` : `<td class="n">${n(v, 2)}</td>`; }).join("") +
            `<td class="n band-med">${n(d.limitado[p].reduce((a, v, w) => a + v * hh[p][w], 0) / hh[p].reduce((a, v) => a + v, 0), 2)}</td></tr>`).join("")).join("") + `</tbody></table></div></div>` +
          `<div><div class="band-tt">Ponderação pela carga média do mês (MWmed, relato ${esc(Pp.fonte_carga)})</div><table class="band-tab densa"><thead><tr><th>Sub.</th><th class="n">PLD médio</th><th class="n">Carga</th><th class="n">Peso</th><th class="n">PLD × peso</th></tr></thead><tbody>` +
          subs.map(([sub, d]) => `<tr><td>${sub}</td><td class="n">${n(d.medio, 2)}</td><td class="n">${n(d.carga, 0)}</td><td class="n">${n(d.peso * 100, 2)}%</td><td class="n">${n(d.contribuicao, 2)}</td></tr>`).join("") +
          `<tr class="destaque"><td>PLD gatilho</td><td></td><td class="n">${n(Pp.carga_total, 0)}</td><td class="n">100%</td><td class="n">${n(Pp.pld_gatilho, 2)}</td></tr></tbody></table></div></div>`;
      }
    } else {
      const L = [0, ...Object.values(B.limites)];
      html = `<div class="band-passo band-2col"><div><h3>4. Bandeira</h3><div class="eq">X = PLD gatilho × (1 − GSF) = ${n(B.pld_gatilho, 2)} × (1 − ${n(B.gsf, 2)}) = <b>${n(B.x, 2)}</b> R$/MWh</div><p class="leg">Limites do Anexo I da REH 3.306/2024. Com GSF igual ou acima de 1, X é zero e a bandeira é verde.</p></div>` +
        `<table class="band-tab densa"><thead><tr><th>Cor</th><th class="n">X acima de</th><th class="n">X até</th></tr></thead><tbody>` + ORD.map((c, i) => `<tr class="${c === B.cor ? "destaque band-atual-l" : ""}"><td>${chip(c)}</td><td class="n">${n(L[i], 2)}</td><td class="n">${i < 3 ? n(L[i + 1], 2) : "—"}</td></tr>`).join("") + `</tbody></table></div>`;
    }
    corpo.innerHTML = html;
  }

  function decisaoRel(dc, u) {
    dc.replaceChildren();
    if (!u || !u.ok.length) { Mesa.decisao(dc, [{ r: `${RS.mes ? rot(RS.mes) : "—"} pelo relato`, v: "—", d: "carregue ao menos um relato", principal: true }]); return; }
    const t = topCor(u.prob), e1 = u.ok[0], of = R.boletim[u.mes], pm = P.find(p => p.alvo === u.mes);
    const itens = [{ r: `${rot(u.mes)} pelo relato do DECOMP`, v: `${t} ${pct(u.prob[t])}`, d: `${u.ok.length} execuç${u.ok.length > 1 ? "ões" : "ão"} · ${ORD.filter(c => u.prob[c]).map(c => `${Math.round(u.prob[c] * u.ok.length)} ${AB[c]}`).join(" · ")}`, principal: true },
      { r: `${e1.i + 1}. ${e1.nome}`, v: `${e1.r.cor}`, d: `GSF ${n(e1.r.gsf, 2)} · PLD ${rs(e1.r.pld_gatilho, 2)} · X ${n(e1.r.x, 1)}` }];
    if (pm) itens.push({ r: `Modelo NEWAVE · ${rot(u.mes)}`, v: `${pm.cor_esp} ${pct(pm.prob[pm.cor_esp])}`, d: pm.cor_esp === t ? "mesma cor do relato" : "cor diferente do relato" });
    itens.push({ r: "Boletim oficial", v: of ? of.cor : "não publicado", d: of ? `GSF ${n(of.gsf, 2)} · PLD ${rs(of.pld_gatilho, 2)}` : "a ANEEL anuncia por volta do dia 25" });
    Mesa.decisao(dc, itens);
  }

  function atualizarRel() {
    const u = calcularRel();
    if (!relUI || !u) return;
    decisaoRel(relUI.dc, u);
    relUI.p14.el.querySelector(".p-uni").textContent = rot(u.mes);
    resultadoRel(relUI.p14.corpo, u);
    abacoRel(relUI.p15.corpo, u);
    const grp = relUI.abasExec; grp.replaceChildren();
    if (!u.ok.some(x => x.id === RS.confSel) && u.ok.length) RS.confSel = u.ok[0].id;
    u.ok.forEach(x => { const b = h("button", null, `${x.i + 1}. ${esc(x.nome)}`); b.type = "button"; b.dataset.id = x.id; b.setAttribute("aria-pressed", String(x.id === RS.confSel)); grp.append(b); });
    conferencia(relUI.p16.corpo, u);
  }

  function montarRel(area) {
    if (!R || !C) { Mesa.decisao(area, [{ r: "Relato do DECOMP", v: "indisponível", d: "dados ou conta do relato não carregados", principal: true }]); return; }
    iniciarRS();
    const dc = h("div", "band-dc"); area.append(dc);
    const g = Mesa.grade(area);
    const p13 = painel(g, { cod: "BAND-13", titulo: "Entrada", unidade: "mês · premissas · execuções", tam: "m", ajuda: "relato", classe: "band-entrada",
      leg: "Cada execução é um relato da CCEE (deck do PLD) e, se houver, o do ONS do mesmo mês; aceita relato.rv0 puro ou .gz. Mais de uma execução dá a probabilidade de cada cor. Os arquivos ficam no seu navegador." });
    formEntrada(p13.corpo);
    const p14 = painel(g, { cod: "BAND-14", titulo: "Resultado por execução", unidade: rot(RS.mes), tam: "xl", ajuda: "relato",
      leg: "Probabilidade: fração das execuções em cada cor, com o mesmo peso. GH_band em MWmed; PLD e X em R$/MWh; passe o mouse no PLD para cada submercado. Clique numa execução para o detalhe." });
    const p15 = painel(g, { cod: "BAND-15", titulo: "Posição no ábaco", unidade: "GSF × R$/MWh", tam: "xl", ajuda: "regra", leg: "Cada número é uma execução; a cor de fundo é a bandeira do par GSF e PLD gatilho (Anexo I da REH 3.306/2024)." });
    const p16 = painel(g, { cod: "BAND-16", titulo: "Conferência das contas", unidade: "refaça à mão", tam: "full", ajuda: "relato",
      leg: "Cada número do resultado, na ordem da conta, com os valores lidos do relato; o CSV traz as mesmas tabelas em formato longo (secao;item;patamar;semana;valor)." });
    const abasExec = h("div", "abas"); abasExec.setAttribute("role", "group"); abasExec.setAttribute("aria-label", "Execução");
    p16.acoes.insertBefore(abasExec, p16.acoes.querySelector(".p-ajuda"));
    abasExec.addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; RS.confSel = +b.dataset.id; atualizarRel(); });
    abas(p16, [["1", "1 Horas"], ["2", "2 GSF"], ["3", "3 PLD"], ["4", "4 Cor"]], RS.passo, v => { RS.passo = v; LS.gravar("passo", v); if (RS.ult) conferencia(p16.corpo, RS.ult); }, "Passo da conta");
    const bt = h("button", "band-bt", "CSV"); bt.type = "button"; bt.title = "Baixar a memória de cálculo da execução (CSV)";
    p16.acoes.insertBefore(bt, p16.acoes.querySelector(".p-ajuda"));
    bt.addEventListener("click", () => {
      const x = RS.execs.find(e => e.id === RS.confSel), ent = entradas[RS.confSel]; if (!ent || !x) return;
      const csv = C.memoriaCsv(C.memoria(ent)), nome = (x.nome.trim() || "execucao").replace(/[^\w-]+/g, "_");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `memoria_${ent.periodo}_${nome}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    relUI = { dc, p14, p15, p16, abasExec };
    atualizarRel();
  }
  RS.passo = LS.ler("passo", "1");

  // ================================================================================================
  // TELA 5 · DES Desempenho do modelo
  // ================================================================================================
  const De = D.desempenho, ac = De.acerto_por_h;
  const media = (a, i, j) => a.slice(i, j).reduce((t, v) => t + v, 0) / (j - i);
  const SERIES_AC = [["modelo", "var(--bar-modelo)", "Modelo"], ["ano_anterior", "var(--bar-saz)", "Mesmo mês do ano anterior"], ["persistencia", "var(--bar-pers)", "Repetir a bandeira atual"]];
  function inspHorizonte(i) {
    return el => {
      add(el, `<div class="band-i-topo"><b class="num">${pct(ac.modelo[i])}</b><span>de acerto da cor em M+${i + 1}</span></div>`);
      QC.pares(el, [["Modelo", pct(ac.modelo[i])], ["Ano anterior", pct(ac.ano_anterior[i])], ["Repetir a atual", pct(ac.persistencia[i])], ["Teto (chuva real)", pct(ac.oraculo[i])], ["Ganho s/ repetir", pp(ac.modelo[i] - ac.persistencia[i])], ["Falta p/ o teto", pp(ac.oraculo[i] - ac.modelo[i])], ["σ do X", i < 3 ? "grupo M+1–3 (≈ R$ 16)" : "grupo M+4–6 (≈ R$ 25)"]]);
      add(el, `<h3>Comparação em M+${i + 1}</h3>`);
      grafico(el, (svg, W, Hh) => barras(svg, W, Hh, { cats: ["Modelo", "Ano ant.", "Repetir", "Teto"], series: [{ nome: "Acerto", v: [ac.modelo[i], ac.ano_anterior[i], ac.persistencia[i], ac.oraculo[i]].map(v => v * 100), cor: "var(--bar-modelo)" }], fmt: v => n(v) + "%" }));
      add(el, `<p class="band-i-txt">${i < 3 ? "Horizonte curto: use a cor esperada e a probabilidade." : "De M+4 a M+6 o acerto cai abaixo de 50%: use como cenário. O preço é o elo fraco (trocar o PLD previsto pelo real leva o acerto de 42% a 86%)."}</p>`);
    };
  }
  function montarDes(area) {
    Mesa.decisao(area, [
      { r: "Acerto da cor em M+1", v: pct(ac.modelo[0]), d: `contra ${pct(ac.persistencia[0])} de repetir a bandeira atual`, principal: true },
      { r: "M+1 a M+3", v: pct(media(ac.modelo, 0, 3)), d: `repetir ${pct(media(ac.persistencia, 0, 3))} · ano anterior ${pct(media(ac.ano_anterior, 0, 3))}` },
      { r: "M+4 a M+6", v: pct(media(ac.modelo, 3, 6)), d: "use como cenário" },
      { r: "Backtest", v: `${De.n_decks} decks`, d: `${De.n_previsoes} previsões · ${rot(De.periodo[0])} a ${rot(De.periodo[1])}` },
    ]);
    const g = Mesa.grade(area);
    const p17 = painel(g, { cod: "BAND-17", titulo: "Taxa de acerto por horizonte", unidade: "% das previsões", tam: "l", ajuda: "backtest",
      leg: `Backtest fora da amostra: ${De.n_decks} decks e ${De.n_previsoes} previsões feitas só com a informação de cada data. Clique num horizonte para o detalhe.` });
    add(p17.corpo, QC.legenda([...SERIES_AC.map(([, c, nm]) => [c, nm]), ["var(--bar-oraculo)", "Teto (chuva real)", "t"]]));
    grafico(p17.corpo, (svg, w, hh) => {
      const m = { l: 40, r: 6, t: 18, b: 24 }, y = v => m.t + (hh - m.t - m.b) * (1 - v), gw = (w - m.l - m.r) / 6;
      [0, 0.25, 0.5, 0.75, 1].forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 5, y: y(t) + 3, "text-anchor": "end" }, pct(t)); });
      for (let i = 0; i < 6; i++) {
        const bw = Math.min(22, (gw - 16) / 3), grp = S(svg, "g", { class: "band-clicavel" });
        S(grp, "rect", { x: m.l + i * gw + 2, y: m.t, width: gw - 4, height: hh - m.t - m.b, fill: "transparent" });
        SERIES_AC.forEach(([k, cor, nome], j) => {
          const x0 = m.l + i * gw + (gw - bw * 3 - 4) / 2 + j * (bw + 2), v = ac[k][i];
          const r = S(grp, "rect", { x: x0, y: y(v), width: bw, height: y(0) - y(v), fill: cor });
          if (j === 0) S(grp, "text", { x: x0 + bw / 2, y: y(v) - 4, "text-anchor": "middle", class: "forte" }, pct(v));
          dicaEm(r, `M+${i + 1} · ${nome}: ${pct(v)}`);
        });
        S(grp, "line", { x1: m.l + i * gw + 6, x2: m.l + (i + 1) * gw - 6, y1: y(ac.oraculo[i]), y2: y(ac.oraculo[i]), stroke: "var(--bar-oraculo)", "stroke-width": 1.6, "stroke-dasharray": "4 3" });
        const orA = S(grp, "line", { x1: m.l + i * gw + 6, x2: m.l + (i + 1) * gw - 6, y1: y(ac.oraculo[i]), y2: y(ac.oraculo[i]), stroke: "transparent", "stroke-width": 8 });
        dicaEm(orA, `M+${i + 1} · Teto (chuva real): ${pct(ac.oraculo[i])}`);
        S(svg, "text", { x: m.l + i * gw + gw / 2, y: hh - 6, "text-anchor": "middle" }, "M+" + (i + 1));
        Mesa.alvo(grp, `Acerto em M+${i + 1}`, inspHorizonte(i));
      }
    }, "alto");
    const p18 = painel(g, { cod: "BAND-18", titulo: "Calibração das probabilidades", unidade: "dada × observada", tam: "l", ajuda: "probabilidade",
      leg: "Quando o modelo diz X%, a cor acontece em quantos % dos casos? Na diagonal, perfeito. Tamanho do ponto: número de casos." });
    grafico(p18.corpo, (svg, w, hh) => {
      const m = { l: 44, r: 12, t: 12, b: 30 }, x = v => m.l + v * (w - m.l - m.r), y = v => m.t + (1 - v) * (hh - m.t - m.b);
      [0, 0.25, 0.5, 0.75, 1].forEach(t => { S(svg, "line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: "var(--rule)" }); S(svg, "text", { x: m.l - 5, y: y(t) + 3, "text-anchor": "end" }, pct(t)); S(svg, "text", { x: x(t), y: hh - 14, "text-anchor": "middle" }, pct(t)); });
      S(svg, "line", { x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: "var(--ink-3)", "stroke-dasharray": "4 3" });
      const nmax = Math.max(...De.confiabilidade.map(c => c.n));
      De.confiabilidade.forEach(c => { const ci = S(svg, "circle", { cx: x(c.prevista), cy: y(c.observada), r: 4 + 9 * Math.sqrt(c.n / nmax), fill: "var(--accent)", opacity: 0.75, stroke: "var(--surface)", "stroke-width": 1.5 }); dicaEm(ci, `Probabilidade dada ≈ ${pct(c.prevista)}<br>aconteceu em ${pct(c.observada)} · ${c.n} casos`); });
      S(svg, "text", { x: w - m.r, y: hh - 1, "text-anchor": "end" }, "probabilidade dada →");
    }, "alto");
    const p19 = painel(g, { cod: "BAND-19", titulo: "Acerto por horizonte, em números", unidade: "%", tam: "l", ajuda: "backtest", leg: "Ganho: pontos percentuais sobre repetir a bandeira atual. Teto: o mesmo método com a ENA real (oráculo)." });
    QC.tabela(p19.corpo, [{ t: "Horizonte" }, { t: "Modelo", n: 1 }, { t: "Ano ant.", n: 1 }, { t: "Repetir", n: 1 }, { t: "Teto", n: 1 }, { t: "Ganho", n: 1 }],
      ac.modelo.map((v, i) => [`M+${i + 1}`, `<b>${pct(v)}</b>`, pct(ac.ano_anterior[i]), pct(ac.persistencia[i]), pct(ac.oraculo[i]), `<span class="${tom(v - ac.persistencia[i])}">${pp(v - ac.persistencia[i])}</span>`]), "band-tab densa");
    p19.corpo.querySelectorAll("tbody tr").forEach((tr, i) => Mesa.alvo(tr, `Acerto em M+${i + 1}`, inspHorizonte(i)));
    const p20 = painel(g, { cod: "BAND-20", titulo: "Calibração, em números", unidade: "faixas de probabilidade", tam: "l", ajuda: "backtest", leg: "Desvio: observada − dada; negativo quer dizer que o modelo prometeu mais do que aconteceu." });
    QC.tabela(p20.corpo, [{ t: "Dada" }, { t: "Observada", n: 1 }, { t: "Desvio", n: 1 }, { t: "Casos", n: 1 }],
      De.confiabilidade.map(c => [`≈ ${pct(c.prevista)}`, pct(c.observada), `<span class="${tom(c.observada - c.prevista)}">${pp(c.observada - c.prevista)}</span>`, n(c.n)]), "band-tab densa");
  }

  // ================================================================================================
  // TELA 6 · MET Metodologia (texto do método da 07, com índice)
  // ================================================================================================
  const tabCor = `<div class="rolagem"><table><thead><tr><th>Cor</th><th class="n">Faixa de X (R$/MWh)</th><th>O que significa na prática</th></tr></thead><tbody>
    <tr><td>${chip("Verde")}</td><td class="n">X ≤ 27,48</td><td>GSF ≥ 0,96 é sempre verde, qualquer que seja o preço</td></tr>
    <tr><td>${chip("Amarela")}</td><td class="n">27,48 &lt; X ≤ 68,99</td><td>Com GSF ≥ 0,91, no máximo amarela</td></tr>
    <tr><td>${chip("Vermelha 1")}</td><td class="n">68,99 &lt; X ≤ 95,05</td><td>Com GSF ≥ 0,875, vermelha 2 é impossível</td></tr>
    <tr><td>${chip("Vermelha 2")}</td><td class="n">X &gt; 95,05</td><td>Abaixo disso, o preço decide entre todas as cores</td></tr></tbody></table></div>`;
  const SECOES = [
    { id: "regra", titulo: "A regra da bandeira", html: `<p>Por volta do dia 25 de cada mês, a ANEEL anuncia a bandeira do mês seguinte. A decisão usa projeções do Programa Mensal da Operação (PMO) do ONS para aquele mês, não valores realizados. Dois números entram na conta.</p>
      <div class="eq">GSF_band = GH_band / GF_band &nbsp;(arredondado em 2 casas)<br>X = PLD_gatilho × max(0, 1 − GSF_band)</div>
      <ul class="lista"><li><span class="tag">GH_band</span><span>Geração hidráulica que conta para o MRE: a geração hidráulica prevista pelo ONS, menos a parte da ANDE em Itaipu, descontadas as perdas até o centro de gravidade, mais a parcela das PCH que participa do MRE. Os fatores de perda e de participação são publicados pela CCEE e mudam uma vez por ano.</span></li>
      <li><span class="tag">GF_band</span><span>Garantia física das usinas do MRE no mês, já sazonalizada e descontadas perdas e indisponibilidade. É praticamente conhecida no início do ano; toda a incerteza do GSF está na geração.</span></li>
      <li><span class="tag">PLD gatilho</span><span>Preço médio do mês pelo deck do DECOMP da CCEE (não pelo custo marginal do ONS): custo marginal limitado ao PLD mínimo e máximo em cada patamar de carga, médio pelas horas de cada patamar, ponderado pela carga dos quatro submercados.</span></li></ul>
      <p>O índice X decide a cor (Anexo I da REH ANEEL 3.306/2024). No ábaco (BAND-2 e BAND-15), cada faixa colorida é uma cor; as curvas são os pares GSF e PLD com X igual a cada limite.</p>${tabCor}
      <p class="nota">Exemplo de outubro de 2026: GSF_band = 0,79 e PLD gatilho = R$&nbsp;118,40. X = 118,40 × 0,21 = 24,9, logo verde. Com esse GSF, a cor só passaria a amarela com PLD acima de R$&nbsp;130,9. Quando o CMSE manda despachar térmicas fora da ordem de mérito (GFOM), a cor pode subir conforme o despacho térmico total (Anexo II da mesma resolução); o modelo não prevê esse caso, que não ocorreu no período testado.</p>
      <p>Para conferir a regra, o cálculo foi refeito com os dados brutos para os 46 meses de janeiro de 2023 a outubro de 2026 e reproduziu o GSF publicado nos boletins da CCEE em todos eles.</p>` },
    { id: "dados", titulo: "Dados usados", html: `<div class="rolagem"><table><thead><tr><th>Fonte</th><th>O que fornece</th><th>Quando está disponível</th></tr></thead><tbody>
      <tr><td>Deck do NEWAVE da CCEE</td><td>2.000 séries hidrológicas simuladas por 5 anos: ENA, geração hidráulica e custo marginal por patamar e submercado; carga, PCH e ANDE projetadas</td><td>Início de cada mês</td></tr>
      <tr><td>ECMWF SEAS5 (sazonal)</td><td>ENA prevista por subsistema até 6 meses à frente: a média da abordagem por precipitação e 51 membros do conjunto</td><td>Por volta do dia 5</td></tr>
      <tr><td>PMO do ONS (DECOMP rv0)</td><td>ENA do mês corrente (<code>ena.pdf</code>) e o balanço completo do mês (<code>relato.rv0</code>), usados para reconstruir o histórico</td><td>Fim do mês anterior</td></tr>
      <tr><td>Boletins InfoBandeira da CCEE</td><td>GF_band, PLD mínimo e máximo, fatores de perda; e a bandeira oficial, que é o gabarito</td><td>Por volta do dia 25 do mês anterior</td></tr>
      <tr><td>Patamares de carga da CCEE</td><td>Horas de cada patamar (leve, médio, pesado) em cada semana operativa</td><td>Publicados para o ano inteiro</td></tr>
      <tr><td>Curva forward da Dcide</td><td>Preço de mercado esperado para os próximos meses; usada só como comparação</td><td>Dois decks (jan e fev de 2026)</td></tr></tbody></table></div>
      <p>Na rodada atual (BAND-4): deck NEWAVE ${rot(D.deck)} (versão ${D.rodada.insumos.deck_versao}), ECMWF emissão ${dataBr(D.rodada.insumos.ecmwf_emissao)}, modelo ${D.modelo.versao}. Adicionais vigentes: amarela ${rs(D.adicional_vigente.Amarela / 10, 3)}, vermelha 1 ${rs(D.adicional_vigente["Vermelha 1"] / 10, 3)} e vermelha 2 ${rs(D.adicional_vigente["Vermelha 2"] / 10, 3)} por 100 kWh. Patamares de carga de 2027 aproximados pelos de 2026.</p>` },
    { id: "passos", titulo: "Passo a passo da previsão", html: `<p>A previsão é feita no início de cada mês M, com o deck do NEWAVE e a rodada do ECMWF daquele mês, para os meses M+1 a M+6. Os fundamentos (BAND-6 a BAND-8) mostram ENA, GSF e PLD gatilho oficiais até o deck e projetados depois: linha cheia oficial (PMO/CCEE), âmbar o esperado.</p>
      <h3>1. Trajetória de ENA de referência</h3><p>Para o próprio mês M, usa-se a ENA do PMO, já publicada. De M+1 em diante, a média da abordagem por precipitação do ECMWF, somando os quatro subsistemas. Essa média erra entre 8% e 13% da ENA do SIN em todos os horizontes, contra 25% a 30% da média histórica (MLT).</p>
      <h3>2. Escolha das séries do NEWAVE</h3><p>Para cada mês-alvo, comparamos a trajetória de ENA de cada uma das 2.000 séries com a referência, do mês do deck até o alvo, e ficamos com as 15 mais próximas. A trajetória importa, e não só o mês-alvo, porque o preço de um mês depende de quanta água ficou guardada nos meses anteriores.</p>
      <div class="eq">d(s) = média<sub>t = M…alvo</sub> [ (ENA<sub>s,t</sub> − ENA<sub>ref,t</sub>) / ENA<sub>ref,t</sub> ]²<br>séries escolhidas = as 15 de menor d(s), com o mesmo peso para todos os meses</div>
      <h3>3. GSF de cada série</h3><p>A geração hidráulica de cada série vira GH_band com a mesma conta da CCEE. A ANDE e as PCH vêm do próprio deck. A GF_band e os fatores de perda vêm do boletim do mês do deck, porque o boletim do mês-alvo ainda não existe na data da previsão.</p>
      <div class="eq">GH_band<sub>s</sub> = (GH<sub>s</sub> − ANDE) × (1 − perda<sub>1</sub>) × (1 − perda<sub>2</sub>) + PCH × participação<sub>MRE</sub> × (1 − perda<sub>PCH</sub>)<br>GSF<sub>s</sub> = GH_band<sub>s</sub> / GF_band</div>
      <h3>4. PLD gatilho de cada série</h3><p>O custo marginal de cada série, por patamar e submercado, é limitado ao PLD mínimo e máximo do ano. Depois vira uma média mensal pelas horas de cada patamar e uma média do país pela carga projetada de cada submercado.</p>
      <div class="eq">PLD<sub>s</sub> = Σ<sub>sub</sub> [ Σ<sub>pat</sub> min(max(CMO<sub>s,sub,pat</sub>, PLD<sub>mín</sub>), PLD<sub>máx</sub>) × horas<sub>pat</sub> / horas<sub>mês</sub> ] × carga<sub>sub</sub> / carga<sub>total</sub></div>
      <h3>5. Cor esperada</h3><p>GSF e PLD de cada mês-alvo são a média das 15 séries escolhidas, e sempre das mesmas séries. Isso mantém a coerência física: uma série seca tem GSF baixo e preço alto ao mesmo tempo. A cor sai da regra da ANEEL aplicada a essas médias.</p>
      <div class="eq">X<sub>médio</sub> = PLD<sub>médio</sub> × max(0, 1 − round(GSF<sub>médio</sub>, 2)) &nbsp;→&nbsp; cor esperada</div>
      <h3>Como ler a seleção das séries (BAND-5)</h3><p><b>Trajetórias:</b> o NEWAVE simula 2.000 futuros possíveis de chuva (faixa cinza, P10–P90 das 2.000 séries). Para cada mês, ficamos com as 15 cuja trajetória de ENA, do deck até o mês, mais se parece com a média do ECMWF; o tracejado é essa referência. O GSF e o preço do mês vêm dessas mesmas 15: embaixo de cada trajetória, os pontos são o GSF e o PLD de cada série e o traço é a média usada na projeção. Escalas iguais nos seis meses. O fundo da fileira do PLD mostra a bandeira que resultaria de cada preço, com o GSF médio do mês fixo; as bordas entre cores são os gatilhos de mudança de bandeira. No GSF, o tracejado marca 0,96.</p>
      <p><b>Composição do GSF:</b> da geração hidráulica simulada ao GSF, com os fatores da CCEE, na média das 15 séries. Na régua, o ponto é o GSF esperado e o losango é o GSF oficial do mesmo mês do ano anterior; abaixo dela, a geração que falta (ou sobra) para o GSF chegar a 0,96. Cada 1.000 MWmed a mais de geração hidráulica elevam o GSF em cerca de ${n(sens, 3)}.</p>` },
    { id: "probabilidade", titulo: "Probabilidade de cada cor", html: `<p>A probabilidade (BAND-1) mede o quanto o X médio costuma errar. Supomos que o X real fica em torno do X médio, com um desvio σ igual ao desvio dos erros passados do próprio modelo. A probabilidade de cada cor é a chance de o X real cair na faixa dela.</p>
      <div class="eq">X<sub>real</sub> ~ Normal(X<sub>médio</sub>, σ) &nbsp;&nbsp; P(cor) = P(limite inferior &lt; X<sub>real</sub> ≤ limite superior)</div>
      <ul class="lista"><li><span class="tag">Só o passado</span><span>O σ usa apenas previsões cujo mês-alvo já tinha terminado na data do deck. Com menos de 8 erros disponíveis, a probabilidade não é calculada; por isso os primeiros decks de 2025 não têm probabilidade.</span></li>
      <li><span class="tag">Por horizonte</span><span>Um σ para M+1 a M+3 (cerca de R$&nbsp;16) e outro para M+4 a M+6 (cerca de R$&nbsp;25), porque o erro cresce com o horizonte.</span></li>
      <li><span class="tag">Meses úmidos</span><span>Com GSF médio ≥ 0,96 a cor é verde com 100%, porque o preço não muda a cor.</span></li>
      <li><span class="tag">Coerência</span><span>A cor mais provável é sempre a cor esperada.</span></li>
      <li><span class="tag">Gatilho</span><span>A linha “Sobe de cor se PLD &gt;” do BAND-1 é o PLD que, com o GSF esperado fixo, leva X ao limite da cor de cima: limite ÷ (1 − GSF). Também mostramos o GSF que faz o mesmo com o PLD fixo: 1 − limite ÷ PLD.</span></li></ul>
      <p>A calibração (BAND-18) compara a probabilidade dada com a frequência observada no backtest: na diagonal, perfeito.</p>` },
    { id: "historico", titulo: "Rodadas e histórico", html: `<p>Cada rodada de projeção é publicada sempre que um insumo muda (deck do NEWAVE ou emissão do ECMWF), podendo haver várias no mesmo mês. No BAND-9, cada linha é uma rodada, com a cor do cenário esperado e a probabilidade dela; lendo cada coluna de baixo para cima, vê-se como a projeção do mês mudou.</p>
      <ul class="lista"><li><span class="tag">▲ ▼</span><span>Cor mais cara ou mais barata que na rodada anterior exibida (no GSF e no PLD, mudança de pelo menos 0,02 ou R$&nbsp;10).</span></li>
      <li><span class="tag">✗</span><span>Cor diferente da oficial.</span></li>
      <li><span class="tag">Insumo</span><span>Abaixo da data, o insumo que mudou em relação à rodada publicada anterior (DECK, DECK republicado, ECMWF, Modelo).</span></li>
      <li><span class="tag">Backtest</span><span>Rodadas reconstruídas só com a informação disponível em cada data; não há decks de set e out/2025 nem de jun a ago/2026.</span></li>
      <li><span class="tag">GSF e PLD</span><span>Valor do cenário esperado e, embaixo, o erro (projetado − oficial): azul, projeção acima do oficial; vermelho, abaixo; quanto mais forte, maior o erro. As rodadas publicadas até 09/10/26 guardaram só o cenário esperado, com o PLD em reais inteiros.</span></li></ul>
      <p>O BAND-3 resume a última mudança: a rodada atual contra a publicada anterior, mês a mês. Na faixa desde 2015 (BAND-10), os meses projetados têm contorno tracejado.</p>` },
    { id: "adicional", titulo: "Adicional tarifário", html: `<p>O adicional é o valor cobrado na conta de energia em cada bandeira, em R$ por 100 kWh (BAND-11 e BAND-12). Os valores mudaram ao longo do tempo; de set/21 a abr/22 vigorou a bandeira de escassez hídrica. Na projeção, a linha tracejada é o adicional da bandeira esperada e a faixa vai do adicional no cenário úmido ao do seco, sempre com os valores vigentes: amarela ${rs(D.adicional_vigente.Amarela / 10, 3)}, vermelha 1 ${rs(D.adicional_vigente["Vermelha 1"] / 10, 3)} e vermelha 2 ${rs(D.adicional_vigente["Vermelha 2"] / 10, 3)}.</p>` },
    { id: "backtest", titulo: "Como foi testado", html: `<p>O backtest simula alguém no início de cada mês, entre janeiro de 2025 e setembro de 2026, prevendo os seis meses seguintes. São 16 decks e 89 previsões já conferidas com a bandeira oficial. Toda informação usada tinha que existir naquela data:</p>
      <ul class="lista"><li><span class="tag">Erros e σ</span><span>Só de meses-alvo já encerrados na data do deck. Nunca de meses posteriores, nem deixando só o próprio mês de fora.</span></li>
      <li><span class="tag">Insumos</span><span>ANDE, PCH e carga do próprio deck; GF_band, fatores e PLD mínimo e máximo do boletim do mês do deck.</span></li>
      <li><span class="tag">Parâmetros</span><span>O número de séries (15) e o peso igual na trajetória foram escolhidos com os alvos de 2025 e confirmados em 2026.</span></li>
      <li><span class="tag">Oráculos</span><span>Testes com a ENA real no lugar da prevista mostram o teto do método e aparecem sempre identificados assim.</span></li>
      <li><span class="tag">Comparações</span><span>Repetir a bandeira atual (persistência) e repetir a do mesmo mês do ano anterior.</span></li></ul>
      <div class="rolagem"><table><thead><tr><th>Rótulo</th><th>Significado</th><th>Exemplo</th></tr></thead><tbody>
      <tr><td>Fora da amostra</td><td>Previsão feita só com o que existia na data</td><td>Acerto do esperado: 72% em M+1–3, 42% em M+4–6</td></tr>
      <tr><td>Oráculo</td><td>Usa um dado do futuro para medir um limite</td><td>ENA real no lugar do ECMWF: 70% e 75%</td></tr></tbody></table></div>` },
    { id: "relato", titulo: "Cálculo a partir do relato do DECOMP", html: `<p>Quando o relato do DECOMP já existe (por exemplo, nas execuções do mês seguinte), a bandeira pode ser calculada direto, sem o NEWAVE. A tela REL faz a conta no próprio navegador: os arquivos não são enviados a nenhum servidor.</p>
      <ul class="lista"><li><span class="tag">PLD gatilho</span><span>Do relato do DECOMP da CCEE: custo marginal por semana, patamar e submercado, limitado ao PLD mínimo e máximo, média do mês pelas horas de cada patamar e ponderação dos quatro submercados pela carga. Nunca o CMO do relato do ONS.</span></li>
      <li><span class="tag">GH_band e GSF</span><span>Do relato do ONS, como no boletim. Sem ele, o relato da CCEE serve de aproximação e difere do GH do ONS em até cerca de 1% (0,01 de GSF); a tela avisa qual fonte usou.</span></li>
      <li><span class="tag">Premissas</span><span>GF_band e PLD mínimo e máximo, por padrão os do último boletim publicado; podem ser editados. O GF_band varia pouco ao longo do ano.</span></li>
      <li><span class="tag">Conferência</span><span>A memória de cálculo de cada execução (horas, GH ONS, ANDE, PCH, fatores, custo marginal limitado por submercado, pesos e X), com as contas escritas com os números do relato, em quatro passos (BAND-16), e o CSV com tudo.</span></li>
      <li><span class="tag">Execuções</span><span>Com mais de uma execução, a probabilidade de cada cor é a fração das execuções (peso igual). Para cada uma, a tela mostra o PLD e o GSF que levariam à bandeira vizinha.</span></li>
      <li><span class="tag">Mês</span><span>Se o rótulo da semana 1 do relato indicar outro mês, a tela alerta sem bloquear: em estudo customizado a partir de um deck existente o rótulo pode continuar igual. Ano sem patamares publicados usa as horas do ano anterior.</span></li></ul>
      <p class="nota">Conferência: a conta reproduziu o PLD gatilho dos boletins em todos os 45 meses de janeiro de 2023 a outubro de 2026 com deck da CCEE disponível, e o GSF e a cor nos quatro meses testados com o relato completo (out/26, mai/26, abr/25 e mar/25). Em set/24 e mar/25 o boletim usou a reedição do deck: é preciso carregar a publicação que a CCEE usou. GFOM não é calculado.</p>
      <p>Os relatos pré-carregados são textos fictícios no formato do <code>relato.rv0</code>; carregar um arquivo substitui o exemplo daquela execução.</p>` },
    { id: "decisoes", titulo: "Decisões que definem o método", html: `<div class="rolagem"><table><thead><tr><th>ID</th><th>Decisão</th><th>Motivo</th><th>Situação</th></tr></thead><tbody>
      <tr><td class="num">D002</td><td>Prever GSF e PLD e aplicar a regra, em vez de classificar a cor</td><td>Histórico curto; a regra é conhecida</td><td><span class="status ok">Decidido</span></td></tr>
      <tr><td class="num">D022</td><td>Histórico reconstruído só com o <code>relato.rv0</code> do PMO</td><td>Reproduz o boletim em todos os meses de 2023 a 2026</td><td><span class="status ok">Decidido</span></td></tr>
      <tr><td class="num">D025</td><td>Saída principal: probabilidade de cada cor por mês</td><td>Junta a incerteza do GSF e do preço</td><td><span class="status ok">Decidido</span></td></tr>
      <tr><td class="num">D029</td><td>15 séries, mesmo peso em toda a trajetória de ENA</td><td>Acerto de 71% para 78% no teste com ENA real</td><td><span class="status ok">Decidido</span></td></tr>
      <tr><td class="num">D030</td><td>Centro = média por precipitação do ECMWF; incerteza = 51 membros recentrados</td><td>Menor erro em todos os horizontes; faixa calibrada</td><td><span class="status teste">Em teste</span></td></tr>
      <tr><td class="num">D031</td><td>Deck do mês M com a rodada do ECMWF do mês M</td><td>Viável na operação (rodada sai por volta do dia 5)</td><td><span class="status ok">Decidido</span></td></tr>
      <tr><td class="num">—</td><td>σ separado para M+1–3 e M+4–6</td><td>Brier de 0,54 para 0,52</td><td><span class="status teste">Em teste</span></td></tr>
</tbody></table></div>` },
    { id: "limites", titulo: "Limitações conhecidas", html: `<ul class="lista"><li><span class="tag">Preço</span><span>É o elo fraco. De M+4 a M+6, trocar o PLD previsto pelo real leva o acerto de 42% para 86%; trocar o GSF, só para 49%.</span></li>
      <li><span class="tag">Fora do deck</span><span>Em alguns meses o preço real ficou acima de tudo o que o deck simulava (março de 2025 e março de 2026). Nenhuma escolha de hidrologia corrige isso.</span></li>
      <li><span class="tag">Hidrologia longa</span><span>O ECMWF pode errar várias vezes para o mesmo lado, como no segundo semestre de 2026 (previsto seco, foi úmido).</span></li>
      <li><span class="tag">Transição</span><span>Na passagem do período úmido para o seco (maio e junho), o GSF previsto tende a sair alto demais e a cor barata demais.</span></li>
      <li><span class="tag">Amostra</span><span>16 decks em dois anos secos. A avaliação fica mais confiável a cada mês novo.</span></li>
      <li><span class="tag">GFOM</span><span>O despacho térmico fora da ordem de mérito não é previsto.</span></li></ul>` },
    { id: "glossario", titulo: "Glossário", html: `<dl class="glossario"><dt>ENA</dt><dd>Energia natural afluente: a água que chega aos reservatórios, convertida em energia (MWmed).</dd><dt>MLT</dt><dd>Média de longo termo da ENA para cada mês; referência do que é um mês normal.</dd>
      <dt>GSF</dt><dd>Razão entre a geração hidráulica e a garantia física das usinas do MRE. Abaixo de 1, as hidrelétricas geram menos do que venderam.</dd><dt>MRE</dt><dd>Mecanismo de Realocação de Energia, que divide o risco hidrológico entre as hidrelétricas.</dd>
      <dt>PLD</dt><dd>Preço de Liquidação das Diferenças, calculado pela CCEE a partir do custo marginal de operação.</dd><dt>CMO</dt><dd>Custo marginal de operação. O do ONS não é o PLD gatilho; o da bandeira vem do deck da CCEE.</dd>
      <dt>NEWAVE</dt><dd>Modelo de planejamento de médio prazo que simula 2.000 cenários hidrológicos por até 5 anos.</dd><dt>DECOMP</dt><dd>Modelo de curto prazo usado no PMO e no cálculo do PLD; a revisão 0 é a base da bandeira.</dd>
      <dt>PMO</dt><dd>Programa Mensal da Operação do ONS.</dd><dt>Deck</dt><dd>O conjunto de arquivos de entrada e saída de uma rodada oficial do NEWAVE ou do DECOMP.</dd>
      <dt>ECMWF SEAS5</dt><dd>Previsão sazonal do centro europeu de meteorologia, com 51 membros, convertida em ENA por subsistema.</dd><dt>Brier</dt><dd>Erro de uma previsão probabilística: soma dos quadrados entre a probabilidade dada e o que aconteceu (0 é perfeito).</dd></dl>` },
    { id: "fontes", titulo: "Fontes e avisos", html: `<p>Fontes: deck do NEWAVE da CCEE, previsão sazonal do ECMWF SEAS5, histórico de bandeiras da ANEEL, boletins InfoBandeira da CCEE e REH ANEEL 3.306/2024. <b>Projeção estatística, não é anúncio oficial.</b> A bandeira de cada mês é definida pela ANEEL por volta do dia 25 do mês anterior.</p>
      <p>Registro completo das decisões, questões em aberto e resultados em <code>docs/metodologia.md</code> do repositório de pesquisa (forecast-bandeiras-analytics). Código de produção em <code>features/forecast_bandeiras/src/qe_forecast_bandeiras/</code> do quant-energia-app (modelo versionado em <code>modelo.py</code>).</p>
      <p>Laboratório com dados fictícios: o texto do método é o do app; o exemplo de outubro de 2026 e todos os números das telas são fictícios.</p>` },
  ];

  // ================================================================================================
  // MESA: sinal, resumo e alertas
  // ================================================================================================
  function sinal() {
    const p = PROX, s2 = segundo(p.prob);
    return { v: `${rot(p.alvo)} ${p.cor_esp} ${pct(p.prob[p.cor_esp])}`, d: `${AB[s2]} ${pct(p.prob[s2])}`, tom: "neutro" };
  }
  function resumo(el) {
    const p = PROX, s2 = segundo(p.prob), primVerde = fut.find(q => q.cor_esp === "Verde");
    QC.kpis(el, [
      { r: `Próxima · ${rot(p.alvo)}`, v: `${AB[p.cor_esp]} ${pct(p.prob[p.cor_esp])}`, d: `${s2} ${pct(p.prob[s2])}` },
      { r: `GSF · PLD ${rot(p.alvo)}`, v: `${n(p.gsf_esp, 2)} · ${n(p.pld_esp, 0)}`, d: `vira ${(gatilhos(p.gsf_esp, p.pld_esp).acima || {}).cor || "—"} com PLD > ${rs((gatilhos(p.gsf_esp, p.pld_esp).acima || {}).pld, 0)}` },
      { r: "Primeira verde provável", v: primVerde ? rot(primVerde.alvo) : "—", d: primVerde ? `${pct(primVerde.prob.Verde)} · rodada ${rotRod(RATUAL)}` : `rodada ${rotRod(RATUAL)}` },
    ]);
    // probabilidade de cada cor no cenário esperado, mês a mês (QC.probBandeiras, a BAND-1 do catálogo de exemplos);
    // sem seco e úmido: o modelo vai passar a ter só o cenário esperado. Mês já anunciado entra como 100% da cor oficial.
    const ORD = ["Verde", "Amarela", "Vermelha 1", "Vermelha 2"];
    const probs = P.map(p => p.anunciada ? ORD.map(c => (c === p.anunciada ? 1 : 0)) : ORD.map(c => p.prob[c] || 0));
    const box = QC.probBandeiras(el, P.map(p => p.alvo), probs, { oficiais: P.filter(p => p.anunciada).length, maisProvavel: true });
    box.querySelectorAll(".prob-l").forEach((linha, i) => { const p = P[i]; Mesa.alvo(linha, `${rot(p.alvo)} · M+${p.h}`, inspMes(p)); });
  }
  function alertas() {
    const L = [], p = PROX, s2 = segundo(p.prob), gt = gatilhos(p.gsf_esp, p.pld_esp);
    try {
      const u = RS.ult || calcularRel();
      if (u && u.ok.length && u.mes === p.alvo) {
        const t = topCor(u.prob);
        L.push({ quando, tela: 4, nivel: t !== p.cor_esp ? "alto" : "normal", texto: `Relato ${rot(u.mes)}: ${t} em ${Math.round(u.prob[t] * u.ok.length)} de ${u.ok.length} execuções; o modelo dá ${p.cor_esp} ${pct(p.prob[p.cor_esp])}` });
      }
    } catch (e) { /* relato inválido não derruba os alertas */ }
    if (p.prob[s2] >= 0.2) L.push({ quando, tela: 1, nivel: p.prob[s2] >= 0.3 ? "alto" : "normal", texto: `${rot(p.alvo)}: ${p.cor_esp} ${pct(p.prob[p.cor_esp])}, ${s2} ${pct(p.prob[s2])}${gt.acima && isFinite(gt.acima.pld) ? ` · vira com PLD > ${rs(gt.acima.pld, 0)}` : ""}` });
    if (RANT) {
      const ds = P.map(q => ({ q, a: daRodada(RANT, q.alvo), b: daRodada(RATUAL, q.alvo) })).filter(x => x.a && x.b && probDe(x.a.prob) && probDe(x.b.prob));
      const mud = ds.filter(x => x.a.esp !== x.b.esp);
      if (mud.length) L.push({ quando, tela: 3, nivel: "normal", texto: `Rodada ${rotRod(RATUAL)} mudou a cor de ${mud.map(x => `${rot(x.q.alvo)} (${AB[x.a.esp]}→${AB[x.b.esp]})`).join(", ")}` });
      else if (ds.length) {
        const mx = ds.map(x => ({ ...x, d: probDe(x.b.prob)[x.b.esp] - probDe(x.a.prob)[x.b.esp] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
        L.push({ quando, tela: 3, nivel: "normal", texto: `Rodada ${rotRod(RATUAL)} (${D.rodada.motivo}): sem troca de cor; maior variação ${rot(mx.q.alvo)} ${AB[mx.b.esp]} ${pp(mx.d)}` });
      }
    }
    return L.slice(0, 4);
  }

  // ================================================================================================
  // registro
  // ================================================================================================
  Mesa.registrar({
    cod: "BAND", nome: "Forecast Bandeiras", desc: "Projeção da bandeira tarifária de M+1 a M+6",
    sinal, resumo, alertas,
    telas: [
      { cod: "MON", nome: "Monitor", montar: area => { relUI = null; montarMon(area); } },
      { cod: "CEN", nome: "Cenários", montar: area => { relUI = null; montarCen(area); } },
      { cod: "HIS", nome: "Histórico", montar: area => { relUI = null; montarHis(area); } },
      { cod: "REL", nome: "Relato do DECOMP", montar: area => { relUI = null; montarRel(area); } },
      { cod: "DES", nome: "Desempenho", montar: area => { relUI = null; montarDes(area); } },
      { cod: "MET", nome: "Metodologia", montar: area => { relUI = null; Mesa.met(area, SECOES); } },
    ],
  });
})();
