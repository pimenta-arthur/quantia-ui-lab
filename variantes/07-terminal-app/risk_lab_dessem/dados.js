/* Variante 07 · Terminal (app real) · risk_lab_dessem/dados.js
   Dados FICTÍCIOS do Risk Lab DESSEM, gerados no navegador com semente fixa (sempre os mesmos números).
   Define window.RLD com as mesmas chaves, campos e formatos dos JSON que o app busca em
   /dados/risk_lab_dessem/<chave>.json. Nada aqui vem do app real: o PLD horário é sorteado a partir de um
   DECOMP semanal inventado, com piso e teto de cada ano, e todo o resto (desvios, premissas, backtest,
   indicadores) é calculado desse PLD sorteado, como o Python do app faz com o real.
   Rodada fictícia: deck do DESSEM até 15/11/26; PLD publicado pela CCEE até 13/11/26. */
window.RLD = (function () {
  "use strict";
  // ---------- sorteio com semente fixa ----------
  let semente = 20261115;
  const rnd = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gau = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const R = (v, c) => (v == null || !isFinite(v) ? null : Math.round(v * 10 ** c) / 10 ** c);
  const soma_ = a => a.reduce((s, v) => s + v, 0);
  const media = a => (a.length ? soma_(a) / a.length : null);
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const quantil = (a, q) => { if (!a.length) return null; const o = [...a].sort((x, y) => x - y), p = (o.length - 1) * q, i = Math.floor(p); return o[i] + (o[Math.min(i + 1, o.length - 1)] - o[i]) * (p - i); };

  // ---------- datas ----------
  const ULT = "2026-11-15", PUB = "2026-11-13", INI = "2021-01-01";
  const dt = s => new Date(s + "T12:00:00Z");
  const iso = d => d.toISOString().slice(0, 10);
  const somaDia = (s, k) => { const d = dt(s); d.setUTCDate(d.getUTCDate() + k); return iso(d); };
  const dow = s => dt(s).getUTCDay();
  const iniSem = s => somaDia(s, -((dow(s) + 1) % 7));  // semana operativa: sábado a sexta
  const mesSoma = (m, k) => { let a = +m.slice(0, 4), b = +m.slice(5, 7) - 1 + k; a += Math.floor(b / 12); b = ((b % 12) + 12) % 12; return `${a}-${String(b + 1).padStart(2, "0")}`; };
  const diasNoMes = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
  const rv0De = m => somaDia(iniSem(m + "-01"), -1);  // sexta antes do sábado que abre a semana do dia 1º
  const ULT_MES = ULT.slice(0, 7);

  // feriados nacionais (fictício o bastante: fixos + móveis pela Páscoa); feriado em dia de semana = domingo/feriado
  const PASCOA = { 2021: "2021-04-04", 2022: "2022-04-17", 2023: "2023-04-09", 2024: "2024-03-31", 2025: "2025-04-20", 2026: "2026-04-05", 2027: "2027-03-28" };
  const FERIADOS = new Set();
  for (let a = 2021; a <= 2027; a++) {
    ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"].concat(a >= 2024 ? ["11-20"] : []).forEach(x => FERIADOS.add(`${a}-${x}`));
    [-47, -2, 60].forEach(k => FERIADOS.add(somaDia(PASCOA[a], k)));
  }
  const codDia = s => { const w = dow(s); if (w === 0) return "d"; if (w === 6) return "s"; return FERIADOS.has(s) ? "f" : "u"; };
  const TIPO = { u: "útil", s: "sábado", d: "domingo/feriado", f: "domingo/feriado" };
  const TIPOS = ["útil", "sábado", "domingo/feriado"];
  const ehTipo = (d, t) => TIPO[d.c] === t;

  // limites do PLD por ano (fictícios): piso, teto estrutural (DECOMP) e teto horário
  const PISO = { 2021: 49.77, 2022: 55.70, 2023: 69.04, 2024: 61.07, 2025: 58.60, 2026: 57.31, 2027: 57.31 };
  const TETO_E = { 2021: 583.9, 2022: 646.6, 2023: 684.7, 2024: 716.8, 2025: 751.7, 2026: 785.3 };
  const TETO_H = { 2021: 1150, 2022: 1330, 2023: 1390, 2024: 1470, 2025: 1540, 2026: 1610 };

  const DIAS = []; for (let s = INI; s <= ULT; s = somaDia(s, 1)) DIAS.push(s);
  const IDX = Object.fromEntries(DIAS.map((s, i) => [s, i]));
  const MESES = [...new Set(DIAS.map(s => s.slice(0, 7)))];
  const DIAS_DO_MES = {}; DIAS.forEach((s, i) => { (DIAS_DO_MES[s.slice(0, 7)] ||= []).push(i); });

  // ---------- DECOMP semanal fictício (SE/CO), por mês; os outros submercados derivam dele ----------
  const NIVEL = {
    2021: [230, 150, 120, 140, 190, 330, 520, 580, 580, 330, 150, 100],
    2022: [60, 56, 56, 56, 56, 56, 60, 72, 85, 70, 56, 56],
    2023: [70, 70, 69, 69, 69, 69, 70, 72, 74, 80, 92, 82],
    2024: [62, 62, 62, 62, 70, 85, 100, 160, 270, 300, 190, 125],
    2025: [110, 140, 160, 220, 240, 230, 220, 260, 280, 270, 230, 180],
    2026: [150, 130, 110, 120, 170, 220, 260, 290, 300, 210, 125, 118],
  };
  const WET = [1, 1, 0.95, 0.8, 0.55, 0.35, 0.2, 0.15, 0.25, 0.5, 0.8, 0.95];  // cheia (1) a seca (0)
  const SUBS = ["SE", "S", "NE", "N"];
  const DECW = { SE: {}, S: {}, NE: {}, N: {} };
  { let e = 0; const fNE = {}, fN = {}, acS = {};
    for (let w = iniSem(INI); w <= ULT; w = somaDia(w, 7)) {
      const sexta = somaDia(w, 6), a = +sexta.slice(0, 4), m = +sexta.slice(5, 7), mes = sexta.slice(0, 7);
      e = 0.6 * e + 0.11 * gau();
      const base = NIVEL[Math.min(a, 2026)][m - 1] * Math.exp(e);
      if (!(mes in fNE)) { fNE[mes] = 0.72 + 0.26 * rnd(); fN[mes] = 1 - (0.15 + 0.45 * rnd()) * WET[m - 1]; acS[mes] = rnd() < 0.8; }
      DECW.SE[w] = base;
      DECW.S[w] = base * (acS[mes] ? 1 : 0.85 + 0.1 * rnd());
      DECW.NE[w] = base * fNE[mes] * (0.95 + 0.1 * rnd());
      DECW.N[w] = base * fN[mes] * (0.95 + 0.1 * rnd());
    } }

  // ---------- PLD horário fictício por submercado ----------
  const OUT = [0.98, 0.975, 0.97, 0.97, 0.97, 0.975, 0.985, 1.0, 1, 1, 1, 1, 1, 1, 1, 1, 1.05, 1.07, 1, 1, 1, 1, 1.04, 1.0];
  const PSH = [0.85, 1.12, 1.18, 0.85];
  const PROP_T = { u: 0, s: 0.15, d: 0.28, f: 0.26 }, FT = { u: -0.03, s: -0.13, d: -0.21, f: -0.2 }, PRT = { u: 1, s: 0.22, d: 0.18, f: 0.2 };
  const PRS = { SE: 1, S: 0.95, NE: 0.75, N: 0.65 };
  const propSub = (sub, mes, m) => (sub === "SE" ? (mes === "2026-03" ? 0.45 : mes === "2026-02" || mes === "2026-04" ? 0.2 : 0) : sub === "S" ? -0.05 : sub === "NE" ? 0.06 + 0.08 * WET[m - 1] : 0.08 + 0.25 * WET[m - 1]);
  const solarIdx = (a, m) => clamp((a + (m - 0.5) / 12 - 2022.3) / 3.5, 0, 1);  // 0 → 1: a solar empurra o vale ao piso

  function estat(d) {
    const v = d.v, D = d.D, P = d.P;
    let s = 0, mn = 1e9, mx = -1e9, hp = 0, bv = 0, bp = 0, bd = 0, od = 0, on = 0, pm = 0, pmax = -1e9;
    for (let h = 0; h < 24; h++) {
      const x = v[h], dev = x - D; s += x; if (x < mn) mn = x; if (x > mx) mx = x;
      if (h >= 8 && h <= 15) { bv += dev; if (x <= P + 0.005) hp++; else { od += dev; on++; } }
      else if (h >= 18 && h <= 21) { bp += dev; pm += x; if (x > pmax) pmax = x; }
      else { bd += dev; od += dev; on++; }
    }
    Object.assign(d, { media: s / 24, min: mn, max: mx, hp, vale: bv / 24, ponta: bp / 24, demais: bd / 24, od, on, premio: (pm - 4 * D) / 4, ponta_media: pm / 4, ponta_max: pmax, esp: Math.max(D - P, 0) });
    return d;
  }

  const H = {};
  SUBS.forEach(sub => {
    H[sub] = DIAS.map(s => {
      const a = +s.slice(0, 4), m = +s.slice(5, 7), mes = s.slice(0, 7), c = codDia(s), P = PISO[a], T = TETO_H[a];
      const D = R(clamp(DECW[sub][iniSem(s)], P, TETO_E[a]), 2), ys = solarIdx(a, m), wet = WET[m - 1], esp = Math.max(D - P, 0);
      const prop = ys * (0.45 + 0.5 * wet) + PROP_T[c] + propSub(sub, mes, m) + 0.2 * gau() + (esp < 30 ? 0.15 : 0);
      const ft = FT[c] + 0.04 * gau();
      let pr = (25 + 120 * ys) * (1.5 - 0.95 * wet) * Math.exp(0.4 * gau()) * PRT[c] * PRS[sub];
      if (c === "u" && rnd() < 0.06 * (1 - wet) * (0.3 + ys)) pr *= 2.5 + 3 * rnd();
      const v = new Array(24);
      for (let h = 0; h < 24; h++) {
        let x;
        if (h >= 18 && h <= 21) x = D + pr * PSH[h - 18] + 0.04 * D * gau();
        else if (h >= 8 && h <= 15) { const cc = 1 - Math.abs(h - 11.5) / 4.5; x = prop + 0.4 * cc + 0.08 * gau() > 0.8 ? P : D * (1 - 0.15 * ys * cc) + ft * esp + 0.03 * D * gau(); }
        else x = D * OUT[h] + ft * esp + 0.03 * D * gau();
        v[h] = R(clamp(x, P, T), 2);
      }
      return estat({ s, c, D, P, v });
    });
  });
  const SE = H.SE;

  // ---------- revisões do DECOMP (semanas operativas) ----------
  const REV = {};
  const revisoes = [];
  for (let w = iniSem(INI); w <= ULT; w = somaDia(w, 7)) {
    const pmo = somaDia(w, 6).slice(0, 7), rv = Math.round((dt(w) - dt(iniSem(pmo + "-01"))) / 864e5 / 7);
    REV[w] = [rv, pmo]; revisoes.push([w, rv, pmo]);
  }

  // ---------- acompanhamento: nível diário, perfis, blocos ----------
  const tipoNome = d => TIPO[d.c];
  const dias_nivel = {}, dias_perfil = {}, semanas_perfil = {}, dias_blocos = {};
  const MESES4 = MESES.slice(-4), MESES6 = MESES.slice(-6), MESES13 = MESES.slice(-13);
  SUBS.forEach(sub => {
    const L = H[sub];
    dias_nivel[sub] = L.map(d => [d.s, R(d.media, 1), R(d.D, 2), d.P, d.hp, tipoNome(d), R(d.min, 1), R(d.max, 1)]);
    dias_perfil[sub] = Object.fromEntries(MESES4.map(m => [m, DIAS_DO_MES[m].map(i => ({ data: L[i].s, tipo: tipoNome(L[i]), pld: L[i].v.map(x => R(x, 1)) }))]));
    semanas_perfil[sub] = {};
    revisoes.filter(r => MESES4.includes(r[2])).forEach(([w, rv, pmo]) => {
      const ds = []; for (let k = 0; k < 7; k++) { const i = IDX[somaDia(w, k)]; if (i != null) ds.push(L[i]); }
      if (!ds.length) return;
      const ut = ds.filter(d => d.c === "u"), hm = lst => (lst.length ? [...Array(24).keys()].map(h => R(media(lst.map(d => d.v[h])), 1)) : null);
      (semanas_perfil[sub][pmo] ||= []).push({ rv, inicio: w, dias: ds.length, dias_uteis: ut.length, pld: hm(ds), pld_util: hm(ut), decomp_media: R(media(ds.map(d => d.D)), 2) });
    });
    dias_blocos[sub] = L.slice(-380).map(d => ({ data: d.s, dessem: R(d.media, 2), decomp: R(d.D, 2), delta: R(d.media - d.D, 2), vale: R(d.vale, 2), ponta: R(d.ponta, 2), demais: R(d.demais, 2) }));
  });

  const SEM_DECK = new Set(["2023-02", "2023-03"]);  // "Sem fev–mar/2023 (decks ausentes)"
  const desvio_mensal = [];
  SUBS.forEach(sub => MESES.forEach(m => {
    if (SEM_DECK.has(m)) return;
    const L = DIAS_DO_MES[m].map(i => H[sub][i]);
    const mm = k => media(L.map(d => d[k]));
    desvio_mensal.push({ sub, mes: m, parcial: m === ULT_MES, dias: L.length, decomp: R(mm("D"), 2), dessem: R(mm("media"), 2), delta: R(mm("media") - mm("D"), 2), vale: R(mm("vale"), 2), ponta: R(mm("ponta"), 2), demais: R(mm("demais"), 2) });
  }));

  // contribuição por tipo de dia × faixa horária
  const FAIXAS = [["Vale 8–15h", [8, 9, 10, 11, 12, 13, 14, 15]], ["Ponta 18–21h", [18, 19, 20, 21]], ["Demais horas", [0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 22, 23]]];
  const anosC = [2024, 2025, 2026];
  const PER_C = { corrente: [ULT_MES], ultimo: [mesSoma(ULT_MES, -1)], "3m": MESES.slice(-3), "12m": MESES.slice(-12), ...Object.fromEntries(anosC.map(a => ["a" + a, MESES.filter(m => m.startsWith(a + ""))])) };
  const contribuicao = {};
  SUBS.forEach(sub => {
    contribuicao[sub] = {};
    Object.entries(PER_C).forEach(([k, ms]) => {
      const L = ms.flatMap(m => (DIAS_DO_MES[m] || []).map(i => H[sub][i])), N = L.length || 1;
      const linhas = [];
      TIPOS.forEach(t => { const Lt = L.filter(d => ehTipo(d, t)), nd = Lt.length;
        FAIXAS.forEach(([faixa, hs]) => {
          let dev = 0, piso = 0, ab = 0, ac = 0;
          Lt.forEach(d => hs.forEach(h => { const x = d.v[h], e = x - d.D; dev += e; if (x <= d.P + 0.005) piso++; if (e < -0.005) ab++; else if (e > 0.005) ac++; }));
          linhas.push({ tipo: t, faixa, nh: hs.length, contrib: R(dev / (24 * N), 2), medio: nd ? R(dev / (nd * hs.length), 2) : null, dias: nd, piso: nd ? R(piso / nd, 2) : 0, abaixo: nd ? R(ab / nd, 2) : 0, acima: nd ? R(ac / nd, 2) : 0 });
        }); });
      contribuicao[sub][k] = { meses: ms, total: R(soma_(linhas.map(l => l.contrib)), 2), linhas };
    });
  });

  // horas no piso, abaixo e acima do DECOMP, por hora e tipo de dia
  const horas = { mensal: {}, semanal: {} };
  SUBS.forEach(sub => {
    horas.mensal[sub] = {}; horas.semanal[sub] = {};
    const cont = lst => [...Array(24).keys()].map(h => { let a = 0, b = 0, c = 0, sd = 0; lst.forEach(d => { const x = d.v[h], e = x - d.D; if (x <= d.P + 0.005) a++; if (e < -0.005) b++; else if (e > 0.005) c++; sd += e; }); return [lst.length, a, b, c, R(sd, 1)]; });
    MESES.forEach(m => {
      if (SEM_DECK.has(m)) return;
      const L = DIAS_DO_MES[m].map(i => H[sub][i]);
      horas.mensal[sub][m] = Object.fromEntries(TIPOS.map(t => [t, cont(L.filter(d => ehTipo(d, t)))]));
      if (!MESES13.includes(m)) return;
      const porSem = {}; L.forEach(d => (porSem[iniSem(d.s)] ||= []).push(d));
      horas.semanal[sub][m] = Object.fromEntries(Object.entries(porSem).map(([w, ds]) => {
        const o = { rv: REV[w][0], dias: ds.length };
        TIPOS.forEach(t => { const lt = ds.filter(d => ehTipo(d, t)); if (lt.length) o[t] = cont(lt); });
        return [w, o];
      }));
    });
  });

  // ---------- variáveis físicas fictícias (MW), com o SIN como soma dos submercados ----------
  const VARS_F = ["carga_liquida", "demanda", "demanda_sem_mmgd", "renov_com_mmgd", "renov_sem_mmgd", "renov_saida"];
  const SUBS_F = ["SIN", ...SUBS];
  const DSH0 = [0.80, 0.77, 0.75, 0.74, 0.74, 0.76, 0.80, 0.86, 0.92, 0.97, 1.00, 1.02, 1.02, 1.03, 1.04, 1.04, 1.04, 1.05, 1.08, 1.10, 1.08, 1.03, 0.95, 0.87];
  const DSH = DSH0.map(x => x / media(DSH0));
  const WSH0 = [1.15, 1.18, 1.2, 1.2, 1.18, 1.12, 1.0, 0.88, 0.8, 0.75, 0.75, 0.78, 0.82, 0.86, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.18, 1.2, 1.2, 1.18];
  const WSH = WSH0.map(x => x / media(WSH0));
  const SOL = [...Array(24).keys()].map(h => (h >= 6 && h <= 18 ? Math.pow(Math.sin(Math.PI * (h - 6) / 12), 1.2) : 0));
  const SD = [1.05, 1.06, 1.05, 1.0, 0.96, 0.94, 0.94, 0.96, 1.0, 1.03, 1.04, 1.04], SS = [1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0];
  const WS = [0.7, 0.6, 0.55, 0.6, 0.8, 0.95, 1.15, 1.35, 1.45, 1.3, 1.05, 0.8];
  const SH = { D: { SE: 0.59, S: 0.17, NE: 0.16, N: 0.08 }, M: { SE: 0.5, S: 0.2, NE: 0.2, N: 0.1 }, W: { SE: 0, S: 0.1, NE: 0.86, N: 0.04 }, C: { SE: 0.4, S: 0, NE: 0.5, N: 0.1 } };
  const TF = { u: 1, s: 0.9, d: 0.83, f: 0.84 };
  const ACC = {}; VARS_F.forEach(v => { ACC[v] = {}; SUBS_F.forEach(s => { ACC[v][s] = {}; }); });
  const DIAF = {}; VARS_F.forEach(v => { DIAF[v] = {}; SUBS_F.forEach(s => { DIAF[v][s] = {}; }); });
  const MEC = {};  // vale do dia útil no SIN, por mês: demanda, renovável prevista, corte
  DIAS.forEach((s, i) => {
    const a = +s.slice(0, 4), m = +s.slice(5, 7), mes = s.slice(0, 7), c = codDia(s), anos = a + (m - 0.5) / 12 - 2021;
    const cresc = 1 + 0.02 * anos, nuvem = 0.72 + 0.3 * rnd(), vento = Math.exp(0.22 * gau()), ys = solarIdx(a, m);
    const capM = 6000 + 6500 * anos, capS = 2000 + 2800 * anos, capW = 9000 + 2200 * anos, quebra = s >= "2023-04-29";
    const dSE = SE[i], cf = [...Array(24).keys()].map(h => (h >= 8 && h <= 15 && dSE.v[h] <= dSE.P + 0.005 ? (0.05 + 0.12 * rnd()) * ys : 0));
    const sin = Object.fromEntries(VARS_F.map(v => [v, new Array(24).fill(0)]));
    let dbV = 0, rpV = 0, ctV = 0;
    SUBS.forEach(sub => {
      const out = Object.fromEntries(VARS_F.map(v => [v, new Array(24)]));
      for (let h = 0; h < 24; h++) {
        const db = 74000 * cresc * SD[m - 1] * DSH[h] * TF[c] * (1 + 0.015 * gau()) * SH.D[sub];
        const mm = capM * SOL[h] * 0.78 * SS[m - 1] * nuvem * SH.M[sub];
        const w = capW * WS[m - 1] * WSH[h] * vento * SH.W[sub] * (1 + 0.05 * gau());
        const sc = capS * SOL[h] * 0.82 * SS[m - 1] * nuvem * SH.C[sub];
        const rs = w + sc, corte = rs * cf[h];
        const val = { demanda: quebra ? db : db - mm, demanda_sem_mmgd: db - mm, renov_com_mmgd: quebra ? rs + mm : rs, renov_sem_mmgd: rs, renov_saida: rs - corte, carga_liquida: db - mm - rs };
        VARS_F.forEach(v => { out[v][h] = R(val[v], 0); sin[v][h] += val[v]; });
        if (c === "u" && h >= 8 && h <= 15) { dbV += db; rpV += rs + mm; ctV += corte; }
      }
      VARS_F.forEach(v => guardarF(v, sub, mes, s, out[v]));
    });
    VARS_F.forEach(v => guardarF(v, "SIN", mes, s, sin[v].map(x => R(x, 0))));
    if (c === "u") { const o = (MEC[mes] ||= { n: 0, db: 0, rp: 0, ct: 0 }); o.n++; o.db += dbV / 8; o.rp += rpV / 8; o.ct += ctV / 8; }
  });
  function guardarF(v, sub, mes, s, arr) {
    const o = (ACC[v][sub][mes] ||= { s: new Array(24).fill(0), n: 0 }); o.n++; arr.forEach((x, h) => { o.s[h] += x; });
    if (MESES6.includes(mes)) (DIAF[v][sub][mes] ||= []).push([s, arr]);
  }

  // perfis (média por hora), média do mês, perfil dia a dia e mapa de calor
  const VARS = ["pld", "decomp", ...VARS_F];
  const perfis = {}, media_mes = {}, perfis_dia = {}, calor = {};
  const casas = v => (v === "pld" || v === "decomp" ? 1 : 0);
  VARS.forEach(v => { perfis[v] = {}; media_mes[v] = {}; perfis_dia[v] = {}; calor[v] = {}; });
  const preco = (v, sub) => {
    const L = H[sub], val = v === "pld" ? (d, h) => d.v[h] : d => d.D;
    perfis[v][sub] = {}; media_mes[v][sub] = {}; perfis_dia[v][sub] = {}; calor[v][sub] = {};
    MESES.forEach(m => { const ds = DIAS_DO_MES[m].map(i => L[i]); const p = [...Array(24).keys()].map(h => media(ds.map(d => val(d, h))));
      perfis[v][sub][m] = p.map(x => R(x, 1)); media_mes[v][sub][m] = R(media(p), 2); });
    MESES6.forEach(m => { const ds = DIAS_DO_MES[m].map(i => L[i]);
      montarDia(v, sub, m, ds.map(d => d.s), ds.map(d => [...Array(24).keys()].map(h => R(val(d, h), 1)))); });
  };
  function montarDia(v, sub, m, dias, linhas) {
    perfis_dia[v][sub][m] = { dias, tipos: dias.map(s => TIPO[codDia(s)]), v: linhas };
    const todos = linhas.flat().filter(x => x != null), c = casas(v);
    calor[v][sub][m] = { lo: R(quantil(todos, 0.05), c), hi: R(quantil(todos, 0.95), c), dia: linhas.map(l => R(media(l), c)), nh: linhas.map(l => l.length),
      hora: [...Array(24).keys()].map(h => R(media(linhas.map(l => l[h])), c)), mes: R(media(todos), c) };
  }
  SUBS.forEach(sub => { preco("pld", sub); preco("decomp", sub); });
  VARS_F.forEach(v => SUBS_F.forEach(sub => {
    perfis[v][sub] = {}; media_mes[v][sub] = {}; perfis_dia[v][sub] = {}; calor[v][sub] = {};
    MESES.forEach(m => { const o = ACC[v][sub][m]; const p = o.s.map(x => x / o.n); perfis[v][sub][m] = p.map(x => R(x, 0)); media_mes[v][sub][m] = R(media(p), 0); });
    MESES6.forEach(m => { const L = DIAF[v][sub][m]; montarDia(v, sub, m, L.map(x => x[0]), L.map(x => x[1])); });
  }));

  // indicadores por ano (média dos perfis mensais, cada mês pesa igual)
  const indicadores = {};
  const PER_I = { ano: [1, 12], Q1: [1, 3], Q2: [4, 6], Q3: [7, 9], Q4: [10, 12] };
  const mv = (p, hs) => media(hs.map(h => p[h]));
  SUBS_F.forEach(sub => {
    indicadores[sub] = {};
    Object.entries(PER_I).forEach(([k, [a0, a1]]) => {
      indicadores[sub][k] = [2021, 2022, 2023, 2024, 2025, 2026].map(ano => {
        const ms = MESES.filter(m => +m.slice(0, 4) === ano && +m.slice(5, 7) >= a0 && +m.slice(5, 7) <= a1);
        if (!ms.length) return null;
        const sp = sub === "SIN" ? "SE" : sub, P = (v, s_) => ms.map(m => perfis[v][s_][m]);
        const cl = P("carga_liquida", sub), dm = P("demanda_sem_mmgd", sub), rn = P("renov_com_mmgd", sub), pl = P("pld", sp);
        return { ano, meses: ms.length, cl_vale: R(media(cl.map(p => mv(p, FAIXAS[0][1]))), 0), cl_ponta: R(media(cl.map(p => mv(p, FAIXAS[1][1]))), 0), rampa: R(media(cl.map(p => p[19] - p[12])), 0),
          demanda: R(media(dm.map(p => media(p))), 0), renov_vale: R(media(rn.map(p => mv(p, FAIXAS[0][1]))), 0), pld: R(media(pl.map(p => media(p))), 1), pld_ponta: R(media(pl.map(p => mv(p, FAIXAS[1][1]))), 1), pld_vale: R(media(pl.map(p => mv(p, FAIXAS[0][1]))), 1) };
      }).filter(Boolean);
    });
  });

  // mecanismos do vale (SE/CO)
  const mecanismos_se = MESES.filter(m => m >= "2024-01").map(m => {
    const mm = +m.slice(5, 7), wet = WET[mm - 1], o = MEC[m], ut = DIAS_DO_MES[m].map(i => SE[i]).filter(d => d.c === "u");
    const piso_util = media(ut.map(d => d.hp)), todoPiso = ut.some(d => d.hp === 8);
    // fictício: a necessária encosta na mínima quando o vale do dia útil vai todo ao piso
    const base = 22 + 6 * wet, hid_nec = o ? base + (8 - piso_util) * 2.4 + 0.8 * gau() : null;
    const acB = m === "2026-02" || m === "2026-03" || m === "2026-04" ? 0.45 : 0;
    const temBM = m >= "2025-04";
    return { mes: m, piso_util: R(piso_util, 2), hid_nec: R(hid_nec, 1), gh_min: todoPiso ? R(base + 0.6 * gau(), 1) : null, corte: o ? R(o.ct / o.n / 1000, 1) : null,
      acopl: R(clamp(0.03 + 0.8 * wet * (0.35 + 0.6 * rnd()) + acB, 0, 1), 2), bm_vagua: temBM ? R(Math.max(0, 390 * (1 - wet) - 30 + 25 * gau()), 1) : null,
      bm_ger: temBM ? R(clamp(0.8 + 10.4 * wet + 0.5 * gau(), 0, 11.2), 1) : null, pim_ver: temBM ? Math.round(wet > 0.7 ? 6000 + 14000 * rnd() : 25 + 300 * rnd() * wet) : null };
  });

  // ---------- simulador: premissas por janela e por mês (SE/CO) ----------
  function agg(L) {
    if (!L.length) return null;
    const esp = media(L.map(d => d.esp)), od = soma_(L.map(d => d.od)), on = soma_(L.map(d => d.on)), desv = on ? od / on : 0, pm = L.map(d => d.ponta_media);
    return { dias: L.length, horas_piso: media(L.map(d => d.hp)), frac_fora: desv / Math.max(esp, 20), desvio_fora: desv, espaco_fora: esp, premio_ponta: media(L.map(d => d.premio)), ponta_media: media(pm),
      ponta_min_dia: Math.min(...pm), ponta_max_dia: Math.max(...pm), ponta_max_hora: Math.max(...L.map(d => d.ponta_max)), decomp: media(L.map(d => d.D)), piso_dias: L.filter(d => d.esp < 1).length / L.length };
  }
  const porTipo = L => ({ "útil": agg(L.filter(d => ehTipo(d, "útil"))), "sábado": agg(L.filter(d => ehTipo(d, "sábado"))), "domingo/feriado": agg(L.filter(d => ehTipo(d, "domingo/feriado"))), todos: agg(L) });
  const janelaAte = (iFim, k) => SE.slice(Math.max(0, iFim - k + 1), iFim + 1);
  const iUlt = SE.length - 1;
  const fmtJan = g => (g ? { dias: g.dias, horas_piso: R(g.horas_piso, 3), frac_fora: R(g.frac_fora, 4), desvio_fora: R(g.desvio_fora, 2), espaco_fora: R(g.espaco_fora, 2), premio_ponta: R(g.premio_ponta, 2),
    ponta_media: R(g.ponta_media, 2), ponta_min_dia: R(g.ponta_min_dia, 2), ponta_max_dia: R(g.ponta_max_dia, 2), ponta_max_hora: R(g.ponta_max_hora, 2) } : null);
  const premissas_janelas = Object.fromEntries([7, 14, 30, 60, 90].map(k => { const L = janelaAte(iUlt, k), g = porTipo(L);
    return [String(k), { ...Object.fromEntries(Object.entries(g).map(([t, x]) => [t, fmtJan(x)])), inicio: L[0].s, fim: L[L.length - 1].s }]; }));

  // desconto das outras horas por mês (todos os dias e por tipo) e referência de 12 meses encerrados
  const F_MES = {};
  MESES.forEach(m => { const L = DIAS_DO_MES[m].map(i => SE[i]); F_MES[m] = Object.fromEntries(Object.entries(porTipo(L)).map(([t, g]) => [t, g ? { f: g.frac_fora, esp: g.espaco_fora } : null])); });
  function ref12(mesRef, t = "todos") {
    const ms = [...Array(12).keys()].map(k => mesSoma(mesRef, k - 12)).filter(m => F_MES[m] && F_MES[m][t] && F_MES[m][t].esp >= 20);
    return { valor: ms.length ? media(ms.map(m => F_MES[m][t].f)) : 0, meses: ms.length, de: ms[0] || mesSoma(mesRef, -12), ate: ms[ms.length - 1] || mesSoma(mesRef, -1) };
  }
  const rf = ref12(ULT_MES);
  const ref_fora = Object.fromEntries([...TIPOS, "todos"].map(t => [t, { valor: R(rf.valor, 4), meses: rf.meses, de: rf.de, ate: rf.ate }]));
  const ref_fora_tipo = Object.fromEntries([...TIPOS, "todos"].map(t => { const r = ref12(ULT_MES, t); return [t, { valor: R(r.valor, 4), meses: r.meses, de: r.de, ate: r.ate }]; }));

  // 12 meses encerrados: médias por tipo (premissas e ponta)
  const M12 = [...Array(12).keys()].map(k => mesSoma(ULT_MES, k - 12));
  const L12 = M12.flatMap(m => DIAS_DO_MES[m].map(i => SE[i]));
  const media12 = { de: M12[0], ate: M12[11] };
  TIPOS.forEach(t => { const g = agg(L12.filter(d => ehTipo(d, t))); media12[t] = { horas_piso: R(g.horas_piso, 2), frac_fora: ref_fora_tipo[t].valor, ponta_media: R(g.ponta_media, 1), premio_ponta: R(g.premio_ponta, 1) }; });

  const MESES_SIM = MESES.filter(m => m >= "2024-07");
  const premissas_mensal = {};
  [...TIPOS, "todos"].forEach(t => {
    premissas_mensal[t] = MESES_SIM.map(m => {
      const L = DIAS_DO_MES[m].map(i => SE[i]).filter(d => t === "todos" || ehTipo(d, t)), g = agg(L);
      const rv0 = rv0De(m), iR = IDX[rv0], J = iR != null ? janelaAte(iR - 1, 14).filter(d => t === "todos" || ehTipo(d, t)) : [], gj = agg(J);
      return { mes: m, dias: g.dias, rv0, decomp: R(g.decomp, 2), espaco: R(g.espaco_fora, 2), horas_piso: R(g.horas_piso, 2), frac_fora: R(g.frac_fora, 4), premio_ponta: R(g.premio_ponta, 2), ponta_media: R(g.ponta_media, 2), ponta_max_dia: R(g.ponta_max_dia, 2),
        rv0_horas_piso: gj ? R(gj.horas_piso, 2) : null, rv0_frac_fora: gj ? R(ref12(m).valor, 4) : null, rv0_premio: gj ? R(gj.premio_ponta, 2) : null, rv0_ponta: gj ? R(Math.max(g.decomp + gj.premio_ponta, SE[DIAS_DO_MES[m][0]].P), 2) : null };
    });
  });

  // histórico das premissas: janela móvel de 14 dias até cada data (o último ponto é hoje)
  const HP_COLS = ["data", "horas_piso", "frac_fora", "premio_ponta", "ponta_media", "decomp", "espaco", "frac_dias_piso"];
  const premissas_hist = { janela: 14, colunas: HP_COLS, tipos: { "útil": [], "sábado": [], "domingo/feriado": [], todos: [] } };
  for (let i = IDX["2024-07-01"]; i <= iUlt; i++) {
    const L = janelaAte(i, 14), pisoDias = L.filter(d => d.esp < 1).length / L.length;
    Object.entries(porTipo(L)).forEach(([t, g]) => { if (g) premissas_hist.tipos[t].push([SE[i].s, R(g.horas_piso, 3), R(g.frac_fora, 4), R(g.premio_ponta, 3), R(g.ponta_media, 3), R(g.decomp, 3), R(g.espaco_fora, 3), R(pisoDias, 3)]); });
  }

  const trajetoria = { colunas: ["data", "tipo", "horas_piso", "frac_fora", "premio_ponta", "ponta_media", "ponta_max_hora", "decomp", "espaco"],
    dias: SE.slice(-90).map(d => [d.s, tipoNome(d), d.hp, R((d.on ? d.od / d.on : 0) / Math.max(d.esp, 20), 4), R(d.premio, 2), R(d.ponta_media, 2), R(d.ponta_max, 2), R(d.D, 2), R(d.esp, 2)]) };

  // ponta: médias móveis de 7/14/30/60 dias por tipo de dia e referência de 12 meses
  const ponta_janelas = {};
  TIPOS.forEach(t => {
    const o = { datas: [] }, i0 = iUlt - 653;
    ["7", "14", "30", "60"].forEach(k => { o[k] = []; o[k + "p"] = []; o[k + "d"] = []; });
    for (let i = i0; i <= iUlt; i++) {
      o.datas.push(SE[i].s);
      [7, 14, 30, 60].forEach(k => { const L = janelaAte(i, k).filter(d => ehTipo(d, t));
        o[k].push(R(media(L.map(d => d.ponta_media)), 2)); o[k + "p"].push(R(media(L.map(d => d.premio)), 2)); o[k + "d"].push(R(media(L.map(d => d.D)), 2)); });
    }
    const L = L12.filter(d => ehTipo(d, t));
    o.ref12 = { valor: R(media(L.map(d => d.ponta_media)), 2), premio: R(media(L.map(d => d.premio)), 2), decomp: R(media(L.map(d => d.D)), 2), de: M12[0], ate: M12[11] };
    ponta_janelas[t] = o;
  });

  const ponta_mensal = {}, ponta_horas = {}, ponta_quantis = {}, ponta_dias = {};
  TIPOS.forEach(t => { ponta_mensal[t] = []; });
  MESES_SIM.forEach(m => {
    ponta_horas[m] = {}; ponta_quantis[m] = {};
    TIPOS.forEach(t => {
      const L = DIAS_DO_MES[m].map(i => SE[i]).filter(d => ehTipo(d, t)), g = agg(L), hs = L.flatMap(d => [18, 19, 20, 21].map(h => R(d.v[h], 1)));
      ponta_horas[m][t] = hs; ponta_quantis[m][t] = [0.1, 0.5, 0.9].map(q => R(quantil(hs, q), 1));
      if (g) ponta_mensal[t].push({ mes: m, ponta: R(g.ponta_media, 2), premio: R(g.premio_ponta, 2), ponta_min_dia: R(g.ponta_min_dia, 2), ponta_max_dia: R(g.ponta_max_dia, 2), ponta_max_hora: R(g.ponta_max_hora, 2), decomp: R(g.decomp, 2), dias: g.dias, dias_premio_100: L.filter(d => d.premio > 100).length });
    });
  });
  TIPOS.forEach(t => { ponta_dias[t] = SE.slice(-365).filter(d => ehTipo(d, t)).map(d => R(d.ponta_media, 1)); });

  const estresse = Object.fromEntries([...TIPOS, "todos"].map(t => { const ps = M12.map(m => { const L = DIAS_DO_MES[m].map(i => SE[i]).filter(d => t === "todos" || ehTipo(d, t)); return media(L.map(d => d.premio)); });
    return [t, { com: R(quantil(ps, 0.8), 1), sem: R(media(ps), 1), meses: 12, de: M12[0], ate: M12[11] }]; }));
  const hsUtil = DIAS_DO_MES[ULT_MES].map(i => SE[i]).filter(d => d.c === "u").flatMap(d => [18, 19, 20, 21].map(h => d.v[h]));
  const sensibilidade = { mes: ULT_MES, preco: R(quantil(hsUtil, 0.9), 1), pct: 5 };
  const piso_hist = MESES.filter(m => m < ULT_MES && !SEM_DECK.has(m)).map(m => { const L = DIAS_DO_MES[m].map(i => SE[i]); return { m, esp: media(L.map(d => d.esp)), delta: media(L.map(d => d.media - d.D)) }; })
    .filter(x => x.esp < 5).map(x => ({ mes: x.m, delta: R(x.delta, 2) }));

  // calendário dos próximos 6 meses (o corrente e os seguintes), antecedência contada pela RV0
  const calendario = []; { let pend = 0;
    [...Array(6).keys()].map(k => mesSoma(ULT_MES, k)).forEach(m => {
      const rv0 = rv0De(m), pub = rv0 <= ULT; if (!pub) pend++;
      const cods = [...Array(diasNoMes(m)).keys()].map(k => codDia(`${m}-${String(k + 1).padStart(2, "0")}`)).join(""), N = cods.length;
      const nU = [...cods].filter(x => x === "u").length, nS = [...cods].filter(x => x === "s").length, a = +m.slice(0, 4);
      calendario.push({ mes: m, h: pub ? 1 : 1 + pend, rv0, rv0_publicada: pub, piso: PISO[a], piso_estimado: a >= 2027, parte_util: R(nU / N, 4), parte_sabado: R(nS / N, 4), parte_domingo: R(1 - R(nU / N, 4) - R(nS / N, 4), 4), dias: cods });
    }); }

  // ---------- backtest fora da amostra: o simulador rodado na RV0 de cada mês (ou meses antes) ----------
  const classe = d => (d < -5 ? "desconto" : d > 5 ? "prêmio" : "neutro");
  function diaTipico(p, Dm, P, premio, f) {
    const esp = Math.max(Dm - P, 0), hh = clamp(p.horas_piso, 0, 8), pf = Math.max(Dm + f * esp, P), pp = Math.max(Dm + premio, P);
    return (hh * P + (20 - hh) * pf + 4 * pp) / 24;
  }
  const backtest = [];
  MESES.filter(m => m >= "2024-07" && m < ULT_MES).forEach(m => {
    const L = DIAS_DO_MES[m].map(i => SE[i]), Dm = media(L.map(d => d.D)), real = media(L.map(d => d.media)), P = L[0].P;
    const partes = Object.fromEntries(TIPOS.map(t => [t, L.filter(d => ehTipo(d, t)).length / L.length]));
    for (let h = 1; h <= 6; h++) {
      const data = rv0De(mesSoma(m, -(h - 1))), J = porTipo(janelaAte(IDX[data] - 1, 14)), f = ref12(data.slice(0, 7)).valor;
      const prev = Math.max(soma_(TIPOS.map(t => partes[t] * diaTipico(J[t], Dm, P, J[t].premio_ponta, f))), P);
      const dr = real - Dm, dp = prev - Dm;
      backtest.push({ mes: m, h, decomp: R(Dm, 2), real: R(real, 2), prev: R(prev, 2), erro: R(prev - real, 2), delta_real: R(dr, 2), delta_prev: R(dp, 2), direcao_prevista: classe(dp), direcao_real: classe(dr) });
    }
  });
  const REGIME = "2025-03";
  const confianca = [], desempenho = [];
  for (let h = 1; h <= 6; h++) {
    const B = backtest.filter(r => r.h === h && r.mes >= REGIME), er = B.map(r => r.erro), certos = B.filter(r => r.direcao_prevista === r.direcao_real).length;
    const base = { erro_p10: R(quantil(er, 0.1), 2), erro_p90: R(quantil(er, 0.9), 2), erro_abs: R(media(er.map(Math.abs)), 2), acerto_geral: R(certos / B.length, 4), meses_total: B.length };
    ["desconto", "neutro", "prêmio"].forEach(dp => { const Bd = B.filter(r => r.direcao_prevista === dp); if (!Bd.length) return;
      const k = c => Bd.filter(r => r.direcao_real === c).length;
      confianca.push({ h, direcao_prevista: dp, meses: Bd.length, acerto: R(k(dp) / Bd.length, 4), desconto: k("desconto"), neutro: k("neutro"), premio: k("prêmio"), ...base }); });
    if (!confianca.some(r => r.h === h)) confianca.push({ h, direcao_prevista: "neutro", meses: 0, acerto: null, desconto: 0, neutro: 0, premio: 0, ...base });
    desempenho.push({ h, erro: base.erro_abs, vies: R(media(er), 2), dir: base.acerto_geral, dec: R(media(B.map(r => Math.abs(r.real - r.decomp))), 2), meses: B.length });
  }

  // ---------- cabeçalho ----------
  const sUlt = SE[iUlt];
  const referencia = [{ ultimo_dia: ULT, ultimo_publicado: PUB, decomp_vigente: R(sUlt.D, 2) }];
  const D = {
    referencia, revisoes, dias_nivel, dias_perfil, semanas_perfil, desvio_mensal, dias_blocos, horas, contribuicao, perfis, perfis_dia, calor, media_mes, indicadores, mecanismos_se,
    calendario, confianca, backtest, janela_padrao: 14, premissas_janelas, premissas_mensal, premissas_hist, trajetoria, ponta_janelas, ponta_horas, ponta_mensal, ponta_dias,
    ref_fora, ref_fora_tipo, piso_hist, estresse, desempenho, sensibilidade, media12, ponta_quantis,
  };
  D.estado = { gerado_em: "2026-11-15T06:10:00", modelo: "v2", ultimo_deck: ULT, ultimo_publicado: PUB, calculados: [somaDia(PUB, 1), ULT], vale: [8, 15], ponta: [18, 21],
    chaves: Object.keys(D).sort(), rodada: "2026-11-15T06:10:00", nova_rodada: false };
  return D;
})();
