/* Variante 07 · Terminal (app real) · Hydro Inflow Similarity · dados.js
   DADOS FICTÍCIOS, gerados no navegador com semente fixa (sempre os mesmos números). Nenhum valor vem do app real.
   No app, cada página faz fetch de /dados/hydro_inflow_similarity/<k>.json; aqui os mesmos objetos (mesmos nomes de
   campos e formatos) ficam em window.HYD[<k>]: produto, clima, fundamentos, metodologia e historico_rodadas.
   Para ficar coerente entre as páginas, tudo sai de uma única história mensal inventada de 1931 a nov/26:
   ENA de cada bloco (SE-sul, SE-resto, S, NE, N) em % da MLT e um Niño 3.4 relativo com os eventos de ENSO nos
   anos em que eles de fato ocorreram (só os anos; as intensidades e as ENAs são fictícias).
   Rodada fictícia: emissão out/26, registrada 05/11/26; atualização com 14 dias de nov/26, gerada 15/11/26 06:10. */
(function () {
  "use strict";
  // ---------- sorteio com semente ----------
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20261115);
  const gauss = () => { let u = 0; while (u === 0) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
  const arr = (k, f) => Array.from({ length: k }, (_, i) => f(i));
  const r = (v, c = 1) => (v == null || !isFinite(v) ? null : Math.round(v * 10 ** c) / 10 ** c);
  const media = a => { const b = a.filter(v => v != null); return b.length ? b.reduce((s, v) => s + v, 0) / b.length : null; };
  const ordenar = a => a.filter(v => v != null).sort((x, y) => x - y);
  const quantil = (a, q) => { const b = ordenar(a); if (!b.length) return null; const p = (b.length - 1) * q, i = Math.floor(p); return b[i] + (b[Math.min(i + 1, b.length - 1)] - b[i]) * (p - i); };
  const mediana = a => quantil(a, 0.5);
  const dp = a => { const m = media(a), b = a.filter(v => v != null); return Math.sqrt(b.reduce((s, v) => s + (v - m) ** 2, 0) / (b.length - 1)); };
  const interp = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
  const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };

  // ---------- calendário: t = 0 em jan/1931 ----------
  const Y0 = 1931;
  const idx = (y, m) => (y - Y0) * 12 + (m - 1);
  const anoDe = t => Y0 + Math.floor(t / 12), mesDe = t => (t % 12) + 1;
  const per = t => `${anoDe(t)}-${String(mesDe(t)).padStart(2, "0")}`;
  const T_ENA = idx(2026, 11);   // nov/26: parcial (14 dias)
  const T_SST = idx(2026, 10);   // out/26: último mês do ERSST
  const T_EMI = idx(2026, 10);   // emissão da rodada
  const ANO_ATUAL = 2026;

  // ---------- Niño 3.4 relativo: eventos nos anos reais, intensidades fictícias ----------
  const EVENTOS = [[1940, 1.2], [1941, 0.9], [1951, 0.8], [1957, 1.25], [1963, 0.85], [1965, 1.72], [1968, 0.75], [1972, 1.82], [1976, 0.7], [1977, 0.66],
    [1982, 1.95, 13], [1986, 0.85], [1987, 0.9], [1991, 1.35, 11], [1994, 1.15], [1997, 1.86], [2002, 1.2], [2004, 0.7], [2006, 0.75], [2009, 1.3], [2015, 1.78],
    [2018, 0.75], [2023, 1.36], [1938, -0.8], [1949, -1.3], [1950, -0.85], [1954, -0.7], [1955, -1.35], [1964, -0.8], [1970, -1.22], [1971, -0.75],
    [1973, -1.72], [1975, -1.4], [1984, -0.8], [1988, -1.7], [1995, -0.85], [1998, -1.3], [1999, -1.25], [2000, -0.75], [2005, -0.7], [2007, -1.3],
    [2008, -0.8], [2010, -1.4], [2011, -0.9], [2016, -0.6], [2017, -0.8], [2020, -0.95], [2021, -0.9], [2022, -0.85], [2024, -0.6]];
  const FIM_2026 = { "2025-08": -0.35, "2025-09": -0.48, "2025-10": -0.56, "2025-11": -0.61, "2025-12": -0.52, "2026-01": -0.36, "2026-02": -0.12, "2026-03": 0.14,
    "2026-04": 0.36, "2026-05": 0.56, "2026-06": 0.86, "2026-07": 1.1, "2026-08": 1.31, "2026-09": 1.55, "2026-10": 1.6 };
  const ENSO = [];
  { let bg = 0;
    for (let t = 0; t <= T_SST; t++) {
      bg = 0.9 * bg + 0.12 * gauss();
      const b = Math.max(-0.45, Math.min(0.45, bg));
      let ev = 0;
      EVENTOS.forEach(([a, p, c = 12]) => { const d = t - idx(a, 1) - (c - 1); if (Math.abs(d) < 14) ev += p * Math.exp(-d * d / (2 * 3.5 * 3.5)); });
      ENSO[t] = FIM_2026[per(t)] ?? ev + b * (1 - Math.min(1, Math.abs(ev)));
    } }
  const tres = t => (ENSO[t] + ENSO[t - 1] + ENSO[t - 2]) / 3;
  const ond = a => (ENSO[idx(a, 10)] + ENSO[idx(a, 11)] + ENSO[idx(a, 12)]) / 3;
  const classe6 = v => v >= 1.5 ? "El Niño forte" : v >= 1.0 ? "El Niño moderado" : v >= 0.5 ? "El Niño fraco" : v > -0.5 ? "Neutro" : v > -1.0 ? "La Niña fraca" : "La Niña forte";
  const FORTES = [1965, 1972, 1982, 1997, 2015];

  // ---------- ENA mensal por bloco, % da MLT ----------
  const BLOCOS = ["SE-sul", "SE-resto", "S", "NE", "N"], NOMES = ["SE", "SE-sul", "SE-resto", "S", "NE", "N"];
  const MLT = {
    "SE-sul": [24000, 25500, 24200, 19800, 16300, 15400, 14000, 12700, 12900, 14500, 16200, 20300],
    "SE-resto": [37800, 37400, 34700, 27500, 20700, 17600, 15800, 14000, 13500, 15800, 21200, 31500],
    S: [7200, 7600, 6800, 7000, 8200, 9300, 9700, 9400, 9600, 9800, 8100, 7300],
    NE: [12500, 14000, 13600, 11800, 8200, 6400, 5900, 5300, 5200, 5600, 7400, 10200],
    N: [12500, 18500, 23500, 26500, 20500, 11000, 6800, 4900, 4100, 4300, 5600, 8400],
  };
  MLT.SE = MLT["SE-sul"].map((v, i) => v + MLT["SE-resto"][i]);
  const NIVEL = {
    "SE-sul": [[1931, 94], [1960, 97], [1975, 106], [1990, 103], [2005, 98], [2013, 86], [2026, 82]],
    "SE-resto": [[1931, 93], [1960, 95], [1975, 103], [1990, 101], [2005, 96], [2013, 82], [2026, 78]],
    S: [[1931, 73], [1960, 78], [1975, 88], [1990, 100], [2010, 114], [2026, 110]],
    NE: [[1931, 109], [1960, 112], [1990, 112], [2000, 92], [2012, 70], [2026, 55]],
    N: [[1931, 103], [1990, 102], [2005, 99], [2015, 88], [2026, 82]],
  };
  const SDB = { "SE-sul": 0.30, "SE-resto": 0.24, S: 0.45, NE: 0.30, N: 0.22 };
  const beta = (b, m) => b === "S" ? (m >= 9 ? 0.22 : m <= 5 ? 0.06 : 0) : b === "SE-sul" ? ([11, 12, 1, 2].includes(m) ? 0.10 : 0) : b === "N" ? (m >= 11 || m <= 4 ? -0.10 : 0) : 0;
  const PCT = {};
  { const ar = {}; BLOCOS.forEach(b => { ar[b] = 0; PCT[b] = []; });
    let comum = 0;
    for (let t = 0; t <= T_ENA; t++) {
      comum = 0.75 * comum + 0.66 * gauss();
      BLOCOS.forEach(b => {
        const e = b.startsWith("SE") ? 0.6 * comum + 0.8 * gauss() : gauss();
        ar[b] = 0.75 * ar[b] + Math.sqrt(1 - 0.5625) * SDB[b] * e;
        const en = ENSO[Math.min(t, T_SST)] ?? 0, ef = en > 0 ? en : 0.3 * en;
        PCT[b][t] = interp(NIVEL[b], anoDe(t) + (mesDe(t) - 0.5) / 12) * Math.exp(ar[b] - SDB[b] ** 2 / 2) * Math.exp(beta(b, mesDe(t)) * ef);
      });
    } }
  // os 5 El Niños fortes: período úmido (nov–abr) no nível escolhido para cada bloco
  const ALVO_FORTE = { 1965: [128, 118, 205, 118, 88], 1972: [112, 106, 168, 98, 76], 1982: [188, 141, 245, 86, 69], 1997: [131, 79, 198, 74, 81], 2015: [139, 72, 221, 48, 64] };
  Object.entries(ALVO_FORTE).forEach(([a, alvos]) => {
    BLOCOS.forEach((b, j) => {
      const t0 = idx(+a, 11), ts = arr(6, i => t0 + i), u = media(ts.map(t => PCT[b][t])), f = alvos[j] / u;
      ts.forEach(t => { PCT[b][t] *= f; });
      PCT[b][t0 - 1] *= Math.sqrt(f); PCT[b][t0 + 6] *= Math.sqrt(f);
      if (b === "S" || b === "SE-sul") PCT[b][t0 - 2] *= f ** 0.6;
    });
  });
  // 2026: de jul a nov (nov parcial)
  const FIM_ENA = { "SE-sul": [104.3, 108.1, 196.4, 205.2, 188.6], "SE-resto": [77.9, 73.6, 91.8, 88.4, 95.1], S: [127.6, 141.2, 238.4, 259.1, 214.3], NE: [52.4, 50.2, 55.1, 58.3, 61.0], N: [61.2, 52.3, 47.1, 45.4, 52.2] };
  BLOCOS.forEach(b => FIM_ENA[b].forEach((v, i) => { PCT[b][idx(2026, 7) + i] = v; }));
  BLOCOS.forEach(b => { PCT[b] = PCT[b].map(v => r(v, 1)); });
  PCT.SE = arr(T_ENA + 1, t => { const m = mesDe(t) - 1; return r((PCT["SE-sul"][t] * MLT["SE-sul"][m] + PCT["SE-resto"][t] * MLT["SE-resto"][m]) / MLT.SE[m], 1); });
  const gw = (nome, t, v = PCT[nome][t]) => (v == null ? null : r((v / 100 - 1) * MLT[nome][mesDe(t) - 1] / 1000, 2));

  // normal de 30 anos (anos y−30 a y−1) do mês m; "hoje" = 1996–2025
  const normal = (nome, y, m) => media(arr(30, k => PCT[nome][idx(y - 30 + k, m)]));
  const NORMAL_HOJE = {}; NOMES.forEach(k => { NORMAL_HOJE[k] = arr(12, m => normal(k, ANO_ATUAL, m + 1)); });
  const umido = (nome, a) => (idx(a + 1, 4) > T_ENA ? null : media(arr(6, i => PCT[nome][idx(a, 11) + i])));
  const regime = classe6;

  // ---------- modelo-v1 (persistência ajustada) fictício ----------
  const RHO = { "SE-sul": 0.83, "SE-resto": 0.86, S: 0.62, NE: 0.90, N: 0.85 }, SDP = { "SE-sul": 0.34, "SE-resto": 0.28, S: 0.55, NE: 0.30, N: 0.24 };
  function prever(base, v3, hs, h0) {   // base: índice t do último mês usado; v3(b) → 3 valores até base
    const out = [];
    hs.forEach(h => {
      const t = base + h, m = mesDe(t) - 1, por = {};
      BLOCOS.forEach(b => {
        let med, sd;
        if (h === 0) { med = h0[b]; sd = 0.085; }
        else {
          const v = v3(b), nr = [2, 1, 0].map(k => NORMAL_HOJE[b][mesDe(base - k) - 1]);
          const x0 = Math.log(media(v) / media(nr)), bh = RHO[b] ** h;
          sd = SDP[b] * Math.sqrt(1 - RHO[b] ** (2 * h)) + 0.04;
          med = NORMAL_HOJE[b][m] * Math.exp(-0.02 + bh * x0);
        }
        por[b] = { media: med * Math.exp(sd * sd / 2), p50: med, p10: med * Math.exp(-1.2816 * sd), p90: med * Math.exp(1.2816 * sd) };
      });
      const mw = (k, b) => por[b][k] * MLT[b][m], se = k => (mw(k, "SE-sul") + mw(k, "SE-resto")) / MLT.SE[m];
      const seMed = se("media");
      por.SE = { media: seMed, p50: se("p50"), p10: seMed - (seMed - se("p10")) * 0.9, p90: seMed + (se("p90") - seMed) * 0.9 };
      NOMES.forEach(k => out.push({ nome: k, alvo: per(t), h, media: r(por[k].media), p10: r(por[k].p10), p50: r(por[k].p50), p90: r(por[k].p90), anomalia_gw: r((por[k].media / 100 - 1) * MLT[k][m] / 1000, 2) }));
    });
    return out;
  }
  const prevRodada = prever(T_EMI, b => [2, 1, 0].map(k => PCT[b][T_EMI - k]), arr(18, i => i + 1));
  const est = {}; BLOCOS.forEach(b => { est[b] = PCT[b][T_ENA] * 1.03; });
  const prevAtual = prever(T_ENA, b => [PCT[b][T_ENA - 2], PCT[b][T_ENA - 1], est[b]], arr(12, i => i), est);

  // ---------- anos similares ----------
  const N0 = tres(T_SST), dN0 = N0 - tres(T_SST - 3);
  const cand = [];
  for (let a = 1950; a <= 2024; a++) { const nA = tres(idx(a, 10)); if (nA >= 0.5) cand.push({ ano: a, n: nA, dn: nA - tres(idx(a, 7)) }); }
  const sN = dp(cand.map(c => c.n)), sD = dp(cand.map(c => c.dn));
  cand.forEach(c => { c.distancia = Math.hypot((c.n - N0) / sN, (c.dn - dN0) / sD); });
  const SIMS = cand.sort((a, b) => a.distancia - b.distancia).slice(0, 5);
  const ANOS_SIM = SIMS.map(s => s.ano);
  const recomp = (nome, a, t) => { const desl = (ANO_ATUAL - a) * 12, ta = t - desl, m = mesDe(t); return NORMAL_HOJE[nome][m - 1] * PCT[nome][ta] / normal(nome, a, m); };
  const simPorNome = {};
  NOMES.forEach(k => {
    simPorNome[k] = arr(12, i => {
      const h = i + 1, t = T_EMI + h, anos = {};
      ANOS_SIM.forEach(a => { anos[String(a)] = r(recomp(k, a, t)); });
      const v = Object.values(anos);
      return { h, alvo: per(t), media: r(media(v)), minimo: r(Math.min(...v)), maximo: r(Math.max(...v)), anos };
    });
  });

  // ---------- desempenho (fictício) ----------
  const habil = (c0, c18, tau) => { const hh = arr(18, i => i + 1), cr = hh.map(h => r(c18 + (c0 - c18) * Math.exp(-(h - 1) / tau) + 0.008 * gauss(), 3));
    return { h: hh, crpss: cr, ic05: cr.map((c, i) => r(c - 0.045 - 0.003 * i, 3)), ic95: cr.map((c, i) => r(c + 0.042 + 0.003 * i, 3)) }; };
  const HABILIDADE = { SE: habil(0.262, -0.005, 3.6), S: habil(0.071, -0.028, 1.6), NE: habil(0.318, 0.065, 6), N: habil(0.238, 0.004, 7) };
  const SIM_DES = [];
  const CR = { // [El Niño forte, El Niño (N≥0,5), todos] contra PER; contra C30 soma um deslocamento
    S: [0.162, 0.071, 0.034], N: [0.141, 0.058, 0.021], "SE-sul": [0.063, -0.012, -0.041], SE: [-0.048, -0.066, -0.082], "SE-resto": [-0.094, -0.101, -0.108], NE: [-0.123, -0.131, -0.139] };
  Object.entries(CR).forEach(([k, v]) => ["El Niño forte", "El Niño (N≥0,5)", "todos"].forEach((rec, j) => ["C30", "PER"].forEach(ref => {
    const c = v[j] + (ref === "C30" ? 0.09 : 0), larg = j === 0 ? 0.11 : j === 1 ? 0.07 : 0.045;
    SIM_DES.push({ nome: k, recorte: rec, ref, crpss: r(c, 3), ic05: r(c - larg, 3), ic95: r(c + larg * 0.9, 3) });
  })));

  // ---------- observado (24 meses, o último parcial) ----------
  const T_OBS0 = T_ENA - 23, TS_OBS = arr(24, i => T_OBS0 + i);
  const fator = (base, sd) => TS_OBS.map(() => base * Math.exp(sd * gauss()));
  const fPP = fator(1.12, 0.06), fPR = fator(0.9, 0.06), fGR = fator(1.04, 0.05), fPB = fator(0.95, 0.05);
  const OBS = {
    meses: TS_OBS.map(per), parcial: TS_OBS.map(t => t === T_ENA),
    pct: Object.fromEntries(NOMES.map(k => [k, TS_OBS.map(t => PCT[k][t])])),
    gw: Object.fromEntries(NOMES.map(k => [k, TS_OBS.map(t => gw(k, t))])),
    bacias: {
      PARANAPANEMA: TS_OBS.map((t, i) => r(PCT["SE-sul"][t] * fPP[i])), PARANA: TS_OBS.map((t, i) => r(PCT["SE-sul"][t] * fPR[i])),
      GRANDE: TS_OBS.map((t, i) => r(PCT["SE-resto"][t] * fGR[i])), PARANAIBA: TS_OBS.map((t, i) => r(PCT["SE-resto"][t] * fPB[i])),
    },
  };
  // contribuição por bacia em GWmed (cada grupo fecha o total do bloco ou do subsistema)
  const repartir = (total, partes) => total.map(v => { const w = partes.map(p => Math.max(0.02, p * Math.exp(0.25 * gauss()))), s = w.reduce((a, b) => a + b, 0); return w.map(q => r(v * q / s, 2)); });
  const col = (m, j) => m.map(l => l[j]);
  const pSul = repartir(OBS.gw["SE-sul"], [0.46, 0.2, 0.34]), pResto = repartir(OBS.gw["SE-resto"], [0.36, 0.31, 0.33]);
  const pS = repartir(OBS.gw.S, [0.41, 0.34, 0.15, 0.1]), pNE = OBS.gw.NE.map(v => { const sf = r(v * (0.88 + 0.08 * gauss()) + 0.15 * gauss(), 2); return [sf, r(v - sf, 2)]; });
  const CONTRIB = {
    SE: { PARANAPANEMA: col(pSul, 0), TIETE: col(pSul, 1), PARANA: col(pSul, 2), GRANDE: col(pResto, 0), PARANAIBA: col(pResto, 1), demais: col(pResto, 2) },
    S: { IGUACU: col(pS, 0), URUGUAI: col(pS, 1), JACUI: col(pS, 2), demais: col(pS, 3) },
    NE: { "SAO FRANCISCO": col(pNE, 0), demais: col(pNE, 1) },
    N: { demais: OBS.gw.N.slice() },
  };

  // ---------- trajetórias (jul do ano a jun de dois anos depois) ----------
  const ARMZ = [0.62, 0.6, 0.62, 0.68, 0.74, 0.79, 0.8, 0.79, 0.77, 0.73, 0.68, 0.64];
  function trajetoria(a, comExtras) {
    const t0 = idx(a, 7), ts = arr(24, i => t0 + i).filter(t => t <= T_ENA), o = { parcial: arr(24, i => t0 + i === T_ENA) };
    NOMES.forEach(k => { o[k] = ts.map(t => PCT[k][t]); });
    if (comExtras) {
      o.gw = Object.fromEntries(NOMES.map(k => [k, arr(24, i => (t0 + i <= T_ENA ? gw(k, t0 + i) : null))]));
      o.armazenavel = a >= 2000 ? Object.fromEntries(NOMES.map(k => [k, arr(24, i => (t0 + i <= T_ENA ? r(PCT[k][t0 + i] * ARMZ[mesDe(t0 + i) - 1] * Math.exp(0.04 * gauss())) : null))])) : null;
      o.enso = arr(24, i => (t0 + i <= T_SST ? r(ENSO[t0 + i], 2) : null));
    }
    return o;
  }
  const anosTraj = [...new Set([...ANOS_SIM, ...FORTES])].sort((a, b) => a - b);
  const TRAJ = { ano_atual: ANO_ATUAL, fortes: FORTES.slice(), anos: {} };
  [...anosTraj, ANO_ATUAL].forEach(a => { TRAJ.anos[String(a)] = trajetoria(a, true); });

  // ---------- período úmido de cada ano ----------
  const ANOS_U = arr(95, i => 1931 + i);
  const UMIDO = { anos: ANOS_U, fase: ANOS_U.map(a => { const v = ond(a); return v >= 1.5 ? "El Niño forte" : v <= -1.0 ? "La Niña forte" : "outro"; }), enso: ANOS_U.map(a => r(ond(a), 2)) };
  NOMES.forEach(k => { UMIDO[k] = ANOS_U.map(a => r(umido(k, a))); });

  // ---------- ENSO recente e dos anos similares ----------
  const T_E0 = T_SST - 23;
  const ONI = arr(T_SST + 1, t => ENSO[t] + 0.006 * (anoDe(t) - 1950) + 0.05 * gauss());
  const ENSO_REC = {
    meses: arr(24, i => per(T_E0 + i)), mensal: arr(24, i => r(ENSO[T_E0 + i], 2)), tres_meses: arr(24, i => r(tres(T_E0 + i), 2)),
    oni: arr(24, i => { const t = T_E0 + i; return t + 1 > T_SST ? null : r((ONI[t - 1] + ONI[t] + ONI[t + 1]) / 3, 2); }),
  };
  const ENSO_SIM = { meses: arr(33, i => per(T_E0 + i)), anos: {} };
  ANOS_SIM.forEach(a => { ENSO_SIM.anos[String(a)] = arr(33, i => r(ENSO[T_E0 + i - (ANO_ATUAL - a) * 12], 2)); });

  // ---------- rodadas ----------
  const RODADAS = [
    { id: "2026-08_modelo-v1", emissao: "2026-08", tipo: "retroativa", registrada_em: "2026-10-21T18:40:00-03:00", versao: "modelo-v1", regime: regime(tres(idx(2026, 8))), nino3m: r(tres(idx(2026, 8)), 3) },
    { id: "2026-09_modelo-v1", emissao: "2026-09", tipo: "publicada", registrada_em: "2026-10-05T06:10:00-03:00", versao: "modelo-v1", regime: regime(tres(idx(2026, 9))), nino3m: r(tres(idx(2026, 9)), 3) },
    { id: "2026-10_modelo-v1", emissao: "2026-10", tipo: "publicada", registrada_em: "2026-11-05T06:10:00-03:00", versao: "modelo-v1", regime: regime(N0), nino3m: r(N0, 3) },
  ];

  // ---------- modelos-sombra e camada de El Niño forte ----------
  const SOMBRA = [];
  arr(6, i => i + 1).forEach(h => {
    const s = prevRodada.find(p => p.nome === "S" && p.h === h), nn = prevRodada.find(p => p.nome === "N" && p.h === h), fs = 1.16 - 0.015 * h, fn = 0.9 + 0.012 * h;
    SOMBRA.push({ modelo: "T2", nome: "S", h, media: r(s.media * fs), p10: r(s.p10 * fs), p90: r(s.p90 * fs), gatilho: "mes" });
    SOMBRA.push({ modelo: "T7", nome: "N", h, media: r(nn.media * fn), p10: r(nn.p10 * fn), p90: r(nn.p90 * fn) });
  });
  const VIES = { ativa: false, ativa_3m: N0 >= 1.5, ativa_mes: ENSO[T_SST] >= 1.5, por_nome: {
    S: { direcao: "para cima", media: 71.8, minimo: 12.6, maximo: 158.3, positivos: 6, eventos: 6 },
    "SE-sul": { direcao: "para cima", media: 26.4, minimo: -9.1, maximo: 97.2, positivos: 5, eventos: 6 },
    "SE-resto": { direcao: "sem direção", media: 4.1, minimo: -21.7, maximo: 30.4, positivos: 3, eventos: 6 },
    SE: { direcao: "sem direção", media: 12.7, minimo: -14.2, maximo: 58.9, positivos: 3, eventos: 6 },
    N: { direcao: "para baixo", media: -19.8, minimo: -40.2, maximo: -1.1, positivos: 0, eventos: 6 },
    NE: { direcao: "sem direção", media: -2.3, minimo: -27.5, maximo: 19.8, positivos: 2, eventos: 6 } } };

  const RODADA = {
    id: "2026-10_modelo-v1", emissao: "2026-10", tipo: "publicada", versao: "modelo-v1", registrada_em: "2026-11-05T06:10:00-03:00",
    insumos: { ultimo_mes_ena: "2026-10", ultimo_mes_ersst: "2026-10", nino34_rel_3m: r(N0, 3), regime_enso: regime(N0),
      hashes: { "ena_mensal.parquet": "3f9a1c07d2e84b6a", "ersst_v6.nc": "a7c20e91f4b35d18", "mlt_ons.csv": "0d6e5b2a9c41f873" } },
    previsoes: prevRodada, sombra: SOMBRA, vies_el_nino_forte: VIES,
  };

  const PRODUTO = {
    gerado_em: "2026-11-15T06:10:00-03:00",
    rodada: RODADA,
    atualizacao: { mes: "2026-11", dias: 14, ate: "2026-11-14", gerada_em: "2026-11-15T06:10:00-03:00", previsoes: prevAtual },
    observado: OBS,
    similares: { anos: SIMS.map(s => ({ ano: s.ano, mes: `${s.ano}-10`, n: r(s.n, 2), dn: r(s.dn, 2), distancia: r(s.distancia, 2) })), por_nome: simPorNome, calculado_depois: false },
    similares_desempenho: SIM_DES,
    umido: UMIDO,
    trajetorias: TRAJ,
    contribuicao: CONTRIB,
    mlt_sub: Object.fromEntries(NOMES.map(k => [k, MLT[k].slice()])),
    enso: ENSO_REC,
    enso_similares: ENSO_SIM,
    habilidade: HABILIDADE,
    rodadas: RODADAS,
  };

  // =====================================================================================================
  // clima.json
  // =====================================================================================================
  const TC0 = idx(1950, 1), NC = T_SST - TC0 + 1;
  const serieAR = (phi, sd, extra, fim, de = TC0) => { let a = 0; const v = []; for (let t = de; t <= T_SST; t++) { a = phi * a + Math.sqrt(1 - phi * phi) * sd * gauss(); v.push(a + (extra ? extra(t) : 0)); }
    const k = fim.length; fim.forEach((q, i) => { v[v.length - k + i] = q; }); if (v.length > k) v[v.length - k - 1] = (v[v.length - k - 1] + fim[0]) / 2; return v; };
  const desde = (de) => arr(T_SST - de + 1, i => de + i);
  const SER = {};
  SER.nino34_rel = desde(TC0).map(t => ENSO[t]);
  { const centr = (fn, t) => (fn(t - 1) + fn(t) + fn(Math.min(t + 1, T_SST))) / 3;
    SER.roni = desde(TC0).map(t => (t >= T_SST ? null : centr(q => ENSO[q], t)));
    SER.oni = desde(TC0).map(t => (t >= T_SST ? null : centr(q => ONI[q], t))); }
  SER.nino12 = serieAR(0.8, 0.45, t => 0.8 * ENSO[t] + [1982, 1997].reduce((s, a) => { const d = t - idx(a, 12); return s + 1.3 * Math.exp(-(d * d) / 18); }, 0),
    [1.42, 1.93, 2.41, 2.88, 3.31, 3.58]).map(v => Math.min(v, 3.5));
  SER.nino12[SER.nino12.length - 1] = 3.58;
  const TS0 = idx(1951, 1);
  SER.soi = serieAR(0.4, 0.75, t => -1.05 * ENSO[t], [-0.62, -1.08, -1.41, -1.73, -2.12, -1.94], TS0);
  SER.tna = serieAR(0.85, 0.3, t => 0.008 * (anoDe(t) - 1990), [0.36, 0.42, 0.47, 0.52, 0.5, 0.48]);
  SER.tsa = serieAR(0.85, 0.3, t => 0.007 * (anoDe(t) - 1990), [0.41, 0.48, 0.55, 0.59, 0.6, 0.57]);
  SER.grad_atl = SER.tna.map((v, i) => v - SER.tsa[i]);
  SER.atl_sul_se = serieAR(0.8, 0.3, t => 0.005 * (anoDe(t) - 1990), [0.22, 0.31, 0.38, 0.41, 0.36, 0.33]);
  SER.dmi = serieAR(0.75, 0.28, t => 0.18 * ENSO[t], [0.16, 0.33, 0.48, 0.63, 0.74, 0.79]);
  const TA0 = idx(1979, 1);
  SER.aao = serieAR(0.3, 1.0, null, [-0.61, 0.92, -0.18, 0.43, -0.52, 0.29], TA0);
  SER.pdo = serieAR(0.93, 0.85, t => 0.7 * Math.sin(2 * Math.PI * (anoDe(t) - 1962) / 48), [-1.12, -1.31, -1.42, -1.61, -1.49, -1.52]);
  SER.amo_rel = serieAR(0.97, 0.1, t => 0.17 * Math.sin(2 * Math.PI * (anoDe(t) - 1930) / 68), [0.02, 0.04, 0.07, 0.08, 0.06, 0.06]);
  SER.amo_ncei = SER.amo_rel.map((v, i) => v + Math.max(0, 0.016 * (anoDe(TC0 + i) - 1975)) - 0.1);
  { const a = SER.amo_ncei, k = a.length; [1.05, 1.12, 1.18, 1.25, 1.22, 1.21].forEach((q, i) => { a[k - 6 + i] = q; }); }
  const INICIO = { soi: TS0, aao: TA0 };
  const PESO = { nino34_rel: "cenario", roni: "referencia", oni: "referencia", nino12: "contexto", soi: "contexto", tna: "contexto", tsa: "contexto", grad_atl: "teste",
    atl_sul_se: "contexto", dmi: "contexto", aao: "contexto", pdo: "contexto", amo_rel: "contexto", amo_ncei: "referencia" };
  const md = (r1, mi, ma, h, sig, ns) => ({ r: r1, mes_indice: mi, mes_alvo: ma, h, significativo: sig, n_sig: ns });
  const MEDIDO = {
    nino34_rel: { SE: md(0.19, "set", "jan", 4, false, 0), S: md(0.55, "set", "nov", 2, true, 13), NE: md(-0.21, "out", "mar", 5, false, 0), N: md(-0.34, "set", "fev", 5, true, 7) },
    nino12: { SE: md(0.12, "ago", "dez", 4, false, 0), S: md(0.41, "set", "nov", 2, true, 6), NE: md(-0.18, "set", "mar", 6, false, 0), N: md(-0.22, "set", "jan", 4, false, 0) },
    soi: { SE: md(-0.15, "set", "jan", 4, false, 0), S: md(-0.47, "set", "nov", 2, true, 9), NE: md(0.17, "out", "mar", 5, false, 0), N: md(0.29, "set", "fev", 5, true, 3) },
    tna: { SE: md(-0.1, "jul", "dez", 5, false, 0), S: md(0.08, "ago", "nov", 3, false, 0), NE: md(-0.21, "dez", "abr", 4, false, 0), N: md(-0.18, "jan", "abr", 3, false, 0) },
    tsa: { SE: md(0.09, "set", "jan", 4, false, 0), S: md(-0.06, "out", "dez", 2, false, 0), NE: md(0.19, "jan", "abr", 3, false, 0), N: md(0.14, "fev", "abr", 2, false, 0) },
    grad_atl: { SE: md(-0.12, "out", "fev", 4, false, 0), S: md(0.07, "set", "nov", 2, false, 0), NE: md(-0.27, "jan", "abr", 3, false, 0), N: md(-0.31, "dez", "abr", 4, true, 4) },
    atl_sul_se: { SE: md(0.14, "out", "jan", 3, false, 0), S: md(0.11, "set", "dez", 3, false, 0), NE: md(0.05, "nov", "mar", 4, false, 0), N: md(-0.06, "out", "fev", 4, false, 0) },
    dmi: { SE: md(-0.11, "set", "nov", 2, false, 0), S: md(0.24, "set", "nov", 2, false, 0), NE: md(-0.16, "out", "mar", 5, false, 0), N: md(-0.2, "set", "jan", 4, false, 0) },
    aao: { SE: md(0.07, "nov", "jan", 2, false, 0), S: md(-0.12, "dez", "fev", 2, false, 0), NE: md(0.05, "out", "mar", 5, false, 0), N: md(0.06, "nov", "abr", 5, false, 0) },
    pdo: { SE: md(0.13, "set", "fev", 5, false, 0), S: md(0.21, "set", "dez", 3, false, 0), NE: md(0.18, "out", "abr", 6, false, 0), N: md(-0.09, "set", "mar", 6, false, 0) },
    amo_rel: { SE: md(-0.28, "set", "mar", 6, true, 2), S: md(0.12, "set", "dez", 3, false, 0), NE: md(-0.36, "out", "abr", 6, true, 5), N: md(-0.15, "set", "abr", 6, false, 0) },
    roni: {}, oni: {}, amo_ncei: {},
  };
  const PESOS = { SE: { N: 0.002, "N·|N|": 0.003, "ΔN": -0.001, grad_atl: 0.001, atl_sul_se: 0.0, pdo: -0.001, dmi: 0.0 },
    S: { N: 0.022, "N·|N|": 0.017, "ΔN": 0.018, grad_atl: -0.003, atl_sul_se: 0.003, pdo: 0.006, dmi: -0.002 },
    NE: { N: -0.001, "N·|N|": 0.002, "ΔN": 0.0, grad_atl: -0.004, atl_sul_se: 0.001, pdo: 0.002, dmi: -0.001 },
    N: { N: 0.007, "N·|N|": -0.029, "ΔN": -0.006, grad_atl: -0.021, atl_sul_se: -0.004, pdo: 0.006, dmi: -0.011 } };
  const pesosDe = vars => Object.fromEntries(["SE", "S", "NE", "N"].map(k => [k, Object.fromEntries(vars.map(v => [v, PESOS[k][v]]))]));
  const TRIM = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"];
  function tabelaDe(k, v, t0) {
    const crit = ["roni", "oni"].includes(k) ? "cpc" : k === "nino12" ? "icen" : "intensidade", casas = crit === "cpc" ? 1 : 2;
    const vals = v.map(q => (q == null ? null : crit === "cpc" ? r(q, 1) : q));
    let cls = vals.map(() => 0), legenda;
    if (crit === "cpc") {
      const nivel = q => q >= 2 ? 4 : q >= 1.5 ? 3 : q >= 1.0 ? 2 : q >= 0.5 ? 1 : q <= -1.5 ? -3 : q <= -1.0 ? -2 : q <= -0.5 ? -1 : 0;
      let i = 0;
      while (i < vals.length) { const s = Math.sign(nivel(vals[i] ?? 0)); if (!s) { i++; continue; } let j = i; while (j < vals.length && vals[j] != null && Math.sign(nivel(vals[j])) === s) j++; if (j - i >= 5) for (let q = i; q < j; q++) cls[q] = nivel(vals[q]); i = j; }
      legenda = [[1, "fraco", "El Niño fraco (0,5 a 0,9)"], [2, "moderado", "El Niño moderado (1,0 a 1,4)"], [3, "forte", "El Niño forte (1,5 a 1,9)"], [4, "muito forte", "El Niño muito forte (≥ 2,0)"],
        [-1, "fraca", "La Niña fraca (−0,5 a −0,9)"], [-2, "moderada", "La Niña moderada (−1,0 a −1,4)"], [-3, "forte", "La Niña forte (≤ −1,5)"]];
    } else if (crit === "icen") {
      const c3 = vals.map((_, i) => (i === 0 || vals[i + 1] == null ? null : (vals[i - 1] + vals[i] + vals[i + 1]) / 3));
      for (let i = 0; i < c3.length; i++) { const q = c3[i]; if (q == null) continue;
        const quente = c3.slice(Math.max(0, i - 2), i + 3).filter(x => x != null && x > 0.4).length >= 3 && q > 0.4, frio = c3.slice(Math.max(0, i - 2), i + 3).filter(x => x != null && x < -1).length >= 3 && q < -1;
        cls[i] = quente ? (q >= 3 ? 4 : q >= 1.7 ? 3 : q >= 1.0 ? 2 : 1) : frio ? (q < -1.4 ? -3 : q < -1.2 ? -2 : -1) : 0; }
      vals.splice(0, vals.length, ...c3);
      legenda = [[1, "débil", "El Niño costeiro débil (0,4 a 1,0)"], [2, "moderado", "El Niño costeiro moderado (1,0 a 1,7)"], [3, "forte", "El Niño costeiro forte (1,7 a 3,0)"], [4, "extraordinário", "El Niño costeiro extraordinário (≥ 3,0)"],
        [-1, "débil", "La Niña costeira débil (−1,0 a −1,2)"], [-2, "moderada", "La Niña costeira moderada (−1,2 a −1,4)"], [-3, "forte", "La Niña costeira forte (< −1,4)"]];
    } else {
      const fixo = k === "nino34_rel", s = fixo ? 1 : dp(v), inv = k === "soi" ? -1 : 1, L = fixo ? [0.5, 1.0, 1.5, 2.0] : [0.5, 1, 1.5, 2].map(x => x * s);
      cls = vals.map(q => { if (q == null) return 0; const z = q * inv; return z >= L[3] ? 4 : z >= L[2] ? 3 : z >= L[1] ? 2 : z >= L[0] ? 1 : z <= -L[2] ? -3 : z <= -L[1] ? -2 : z <= -L[0] ? -1 : 0; });
      const f = x => n2(x), lado = inv > 0 ? ["acima", "abaixo"] : ["abaixo", "acima"];
      legenda = fixo ? [[1, "fraco", "El Niño fraco (0,5 a 1,0)"], [2, "moderado", "El Niño moderado (1,0 a 1,5)"], [3, "forte", "El Niño forte (1,5 a 2,0)"], [4, "muito forte", "El Niño muito forte (≥ 2,0)"],
        [-1, "fraca", "La Niña fraca (−0,5 a −1,0)"], [-2, "moderada", "La Niña moderada (−1,0 a −1,5)"], [-3, "forte", "La Niña forte (≤ −1,5)"]] :
        [[1, `+0,5 dp`, `${lado[0]} de 0,5 desvio-padrão (${f(L[0])})`], [2, `+1 dp`, `${lado[0]} de 1 desvio-padrão (${f(L[1])})`], [3, `+1,5 dp`, `${lado[0]} de 1,5 desvio-padrão (${f(L[2])})`], [4, `+2 dp`, `${lado[0]} de 2 desvios-padrão (${f(L[3])})`],
          [-1, `−0,5 dp`, `${lado[1]} de 0,5 desvio-padrão`], [-2, `−1 dp`, `${lado[1]} de 1 desvio-padrão`], [-3, `−1,5 dp`, `${lado[1]} de 1,5 desvio-padrão`]];
    }
    const a0 = anoDe(t0), m0 = mesDe(t0) - 1, anos = [], linhas = [];
    for (let a = ANO_ATUAL; a >= a0; a--) { anos.push(a); linhas.push(arr(12, j => { const i = (a - a0) * 12 + j - m0; return i < 0 || i >= vals.length || vals[i] == null ? [null, 0] : [casas === 1 ? r(vals[i], 1) : r(vals[i], 2), cls[i]]; })); }
    const usadas = new Set(linhas.flat().map(c => c[1]));
    return { criterio: crit, colunas: crit === "intensidade" ? ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] : TRIM, anos, linhas, legenda: legenda.filter(l => usadas.has(l[0])), casas };
  }
  const n2 = x => (Math.abs(x) < 0.005 ? "0,00" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(2).replace(".", ","));
  const INDICES = {};
  Object.keys(PESO).forEach(k => {
    const t0 = INICIO[k] ?? TC0, v = SER[k];
    let ult = v.length - 1; while (v[ult] == null) ult--;
    const tUlt = t0 + ult, vals = v.filter(q => q != null);
    const m3 = i => (v[i] + v[i - 1] + v[i - 2]) / 3, valor = v[ult], tm = m3(ult);
    // anos com média de 3 meses parecida no mesmo mês e o período úmido seguinte
    const mesU = mesDe(tUlt), lista = [];
    for (let a = anoDe(t0); a <= 2025; a++) { const i = idx(a, mesU) - t0; if (i < 2 || a === ANO_ATUAL) continue; const q = m3(i); if (q == null || !isFinite(q)) continue; lista.push({ ano: a, valor: r(q, 2), d: Math.abs(q - tm) }); }
    const parecidos = lista.sort((a, b) => a.d - b.d).slice(0, 5).sort((a, b) => a.ano - b.ano).map(p => ({ ano: p.ano, valor: p.valor, umido: Object.fromEntries(["SE", "S", "NE", "N"].map(s => [s, r(umido(s, p.ano))])) }));
    const o = { ultimo_mes: per(tUlt), valor: r(valor, 2), tres_meses: r(tm, 2), variacao_3m: r(tm - m3(ult - 3), 2), percentil: Math.round(vals.filter(q => q < valor).length / vals.length * 100),
      minimo: r(Math.min(...vals), 2), maximo: r(Math.max(...vals), 2), peso: PESO[k], serie: { inicio: per(t0), valores: v.map(q => r(q, 2)) }, medido: MEDIDO[k], parecidos };
    if (k === "nino34_rel") o.pesos_t7 = pesosDe(["N", "N·|N|", "ΔN"]);
    if (["grad_atl", "atl_sul_se", "pdo", "dmi"].includes(k)) o.pesos_t7 = pesosDe([k]);
    if (k !== "atl_sul_se") o.tabela = tabelaDe(k, v, t0);
    INDICES[k] = o;
  });
  // previsão oficial do ENSO (CPC) fictícia, emitida em novembro de 2026
  const TRIM_CPC = ["OND", "NDJ", "DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA"], MU = [1.78, 1.86, 1.72, 1.43, 1.02, 0.66, 0.41, 0.26, 0.16], SG = [0.24, 0.33, 0.41, 0.48, 0.54, 0.59, 0.62, 0.65, 0.68];
  const LIM = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
  const arred100 = p => { const b = p.map(x => Math.floor(x)), f = p.map((x, i) => [x - b[i], i]).sort((a, c) => c[0] - a[0]); let falta = 100 - b.reduce((a, c) => a + c, 0); for (let i = 0; falta > 0; i++, falta--) b[f[i][1]]++; return b; };
  const forca = TRIM_CPC.map((tr, i) => { const c = LIM.map(l => Phi((l - MU[i]) / SG[i])), p = arr(9, j => 100 * ((j < 8 ? c[j] : 1) - (j > 0 ? c[j - 1] : 0))); return { trimestre: tr, valores: arred100(p) }; });
  const CLIMA = {
    indices: INDICES, anos_similares: ANOS_SIM.slice(),
    cpc_fases: { emitida: "November 2026", linhas: forca.map(l => ({ trimestre: l.trimestre, valores: [l.valores.slice(0, 4).reduce((a, b) => a + b, 0), l.valores[4], l.valores.slice(5).reduce((a, b) => a + b, 0)] })) },
    cpc_forca: { emitida: "November 2026", linhas: forca },
    gerado_em: "2026-11-15T06:10:00-03:00",
  };

  // =====================================================================================================
  // fundamentos.json
  // =====================================================================================================
  const SUBS = ["SE", "S", "NE", "N"];
  const anual = (k, a) => media(arr(12, j => PCT[k][idx(a, j + 1)]));
  const ANUAL = { anos: ANOS_U };
  SUBS.forEach(k => { ANUAL[k] = ANOS_U.map(a => r(anual(k, a))); });
  ANUAL.normal = Object.fromEntries(SUBS.map(k => [k, ANOS_U.map((a, i) => (i < 29 ? null : r(media(ANUAL[k].slice(i - 29, i + 1)))))]));
  const PERIODOS = { "1931–1960": [1931, 1960], "1961–1990": [1961, 1990], "1995–2024": [1995, 2024], "2015–2024": [2015, 2024] };
  const NORMAIS = Object.fromEntries(Object.entries(PERIODOS).map(([p, [a, b]]) => [p, Object.fromEntries(SUBS.map(k => [k, r(media(ANOS_U.filter(x => x >= a && x <= b).map(x => anual(k, x))))]))]));
  const CLASSE = ANOS_U.map(a => classe6(ond(a)));
  const UMIDO_ANUAL = { anos: ANOS_U, classe: CLASSE };
  SUBS.forEach(k => { UMIDO_ANUAL[k] = UMIDO[k].slice(); });
  const ANOS_FASE = {};
  ["El Niño forte", "El Niño moderado", "El Niño fraco", "Neutro", "La Niña fraca", "La Niña forte"].forEach(c => { ANOS_FASE[c] = ANOS_U.filter((_, i) => CLASSE[i] === c); });
  // bacias: período úmido de cada ano a partir do bloco da bacia
  const BACIA_PAI = { AMAZONAS: ["N", 0.8], ARAGUARI: ["N", 1.25], CAPIVARI: ["S", 0.9], DOCE: ["SE-resto", 1.0], GRANDE: ["SE-resto", 1.0], IGUACU: ["S", 1.05], ITABAPOANA: ["SE-resto", 0.9],
    ITAJAI: ["S", 0.95], JACUI: ["S", 1.1], JEQUITINHONHA: ["NE", 0.8], MUCURI: ["SE-resto", 0.9], PARAGUACU: ["NE", 0.9], PARAGUAI: ["SE-resto", 0.5], "PARAIBA DO SUL": ["SE-resto", 0.9],
    PARANA: ["SE-sul", 0.85], PARANAIBA: ["SE-resto", 0.95], PARANAPANEMA: ["SE-sul", 1.25], PARNAIBA: ["NE", 0.7], "SANTA MARIA VIT": ["SE-resto", 0.8], "SAO FRANCISCO": ["NE", 1.0],
    TIETE: ["SE-sul", 0.95], TOCANTINS: ["N", 1.0], URUGUAI: ["S", 1.0] };
  const UB = {};
  Object.entries(BACIA_PAI).forEach(([b, [pai, el]]) => { UB[b] = ANOS_U.map(a => { const u = umido(pai, a); return u == null ? null : 100 * (u / 100) ** el * Math.exp(0.12 * gauss()); }); });
  const mannWhitney = (x, y) => { let u = 0; x.forEach(a => y.forEach(b => { u += a > b ? 1 : a === b ? 0.5 : 0; })); const n1 = x.length, n2b = y.length, mu = n1 * n2b / 2, s = Math.sqrt(n1 * n2b * (n1 + n2b + 1) / 12); return Math.min(1, 2 * (1 - Phi(Math.abs(u - mu) / s))); };
  const BACIAS_FASE = {};
  ["El Niño forte", "El Niño moderado", "La Niña fraca", "La Niña forte"].forEach(c => {
    BACIAS_FASE[c] = Object.keys(BACIA_PAI).map(b => {
      const vc = ANOS_U.map((a, i) => (CLASSE[i] === c ? UB[b][i] : null)).filter(v => v != null), vn = ANOS_U.map((a, i) => (CLASSE[i] === "Neutro" ? UB[b][i] : null)).filter(v => v != null);
      return { nome: b, mediana: r(mediana(vc)), p10: r(quantil(vc, 0.1)), p90: r(quantil(vc, 0.9)), neutro: r(mediana(vn)), n: vc.length, p: r(mannWhitney(vc, vn), 3) };
    });
  });
  const C5 = c => (c.startsWith("La Niña") ? "La Niña" : c);
  const COMPOSTOS = { evento: {}, seguinte: {} };
  SUBS.forEach(k => {
    COMPOSTOS.evento[k] = ANOS_U.map((a, i) => ({ ano: a, classe: C5(CLASSE[i]), v: UMIDO[k][i] })).filter(p => p.v != null);
    COMPOSTOS.seguinte[k] = ANOS_U.map((a, i) => ({ ano: a, classe: C5(CLASSE[i]), v: UMIDO[k][i + 1] ?? null })).filter(p => p.v != null);
  });
  const DEC = arr(10, i => 1931 + i * 10);
  const nt = ANOS_U.map((a, i) => i).filter(i => CLASSE[i] === "Neutro");
  const FUND = {
    fortes: FORTES.slice(),
    umido_anual: UMIDO_ANUAL,
    umido_blocos: { "SE-sul": UMIDO["SE-sul"].slice(), "SE-resto": UMIDO["SE-resto"].slice() },
    anual: ANUAL,
    normais: NORMAIS,
    bacias_fase: BACIAS_FASE,
    anos_fase: ANOS_FASE,
    compostos: COMPOSTOS,
    bacias: BACIAS_FASE["El Niño forte"].map(({ n, ...b }) => b),
    decadas: Object.assign({ decadas: DEC.map(d => `${d}–${Math.min(d + 9, 2025)}`) }, Object.fromEntries(SUBS.map(k => [k, DEC.map(d => r(media(ANOS_U.filter(a => a >= d && a <= d + 9).map(a => anual(k, a)))))]))),
    blocos_eventos: Object.fromEntries(FORTES.map(a => [String(a), { "SE-sul": r(umido("SE-sul", a)), "SE-resto": r(umido("SE-resto", a)), SE: r(umido("SE", a)) }])),
    blocos_neutros: Object.fromEntries(["SE-sul", "SE-resto", "SE"].map(k => [k, r(mediana(nt.map(i => UMIDO[k][i])))])),
    trajetorias: Object.fromEntries([...FORTES, 2023, ANO_ATUAL].map(a => [String(a), trajetoria(a, false)])),
    correlacao_set: (() => {
      const R0 = { SE: [0.08, 0.14, 0.17, 0.12, 0.09, 0.06, 0.04, 0.05, 0.03, 0.02, 0.04, 0.03], S: [0.41, 0.55, 0.46, 0.21, 0.12, 0.08, 0.05, 0.1, 0.06, 0.02, 0.04, 0.03],
        NE: [-0.04, -0.08, -0.12, -0.16, -0.19, -0.21, -0.18, -0.14, -0.1, -0.08, -0.06, -0.05], N: [-0.12, -0.25, -0.31, -0.33, -0.29, -0.26, -0.22, -0.18, -0.15, -0.12, -0.1, -0.08] };
      return Object.fromEntries(SUBS.map(k => [k, { mes_alvo: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9], r: R0[k], q: R0[k].map(v => r(Math.min(0.95, Math.exp(-14 * Math.abs(v)) * 6), 3)) }]));
    })(),
    memoria: { "úmido Y → seca Y+1": { SE: 0.64, S: 0.31, NE: 0.82, N: 0.47 }, "seca Y → úmido Y": { SE: 0.39, S: 0.27, NE: 0.53, N: 0.29 }, "úmido Y → úmido Y+1": { SE: 0.33, S: -0.04, NE: 0.46, N: 0.22 } },
    pesos_t7: PESOS,
    oni_seguinte: [[1957, 1.78, -0.42], [1965, 1.91, -0.63], [1972, 2.08, -1.38], [1982, 2.21, -0.86], [1991, 1.62, 0.31], [1997, 2.36, -1.41], [2009, 1.58, -1.49], [2015, 2.52, -0.71], [2023, 1.97, -0.38]]
      .map(([ano, pico, seguinte]) => ({ ano, pico, seguinte })),
  };

  // =====================================================================================================
  // metodologia.json: exemplo do SE-sul, rodada de set/26, previsão para out/26
  // =====================================================================================================
  const tE = idx(2026, 9), tA = idx(2026, 10), b0 = "SE-sul";
  const exPct = [2, 1, 0].map(k => PCT[b0][tE - k]), exNorm = [2, 1, 0].map(k => NORMAL_HOJE[b0][mesDe(tE - k) - 1]);
  const exX = Math.log(media(exPct) / media(exNorm)), exA = -0.031, exB = 0.917, exPonto = exA + exB * r(exX, 3), exNA = NORMAL_HOJE[b0][9], exDP = 0.291;
  const exMed = exNA * Math.exp(exPonto);
  const exAnos = ANOS_SIM.map(a => { const pct = PCT[b0][idx(a, 10)], ne = normal(b0, a, 10), raz = pct / ne; return { ano: a, pct: r(pct), normal_epoca: r(ne), razao: r(raz, 3), hoje: r(raz * exNA) }; });
  const MET = {
    exemplo: { emissao: "2026-09", alvo: "2026-10", meses: ["2026-07", "2026-08", "2026-09"], pct: exPct.map(v => r(v)), normal: exNorm.map(v => r(v)), x: r(exX, 3), a: exA, b: exB, n_pares: 94,
      ponto_log: r(exPonto, 3), normal_alvo: r(exNA), mediana: r(exMed), media: r(exMed * Math.exp(exDP * exDP / 2)), p10: r(exMed * Math.exp(-1.2816 * exDP)), p90: r(exMed * Math.exp(1.2816 * exDP)),
      dp_residuos: exDP, mlt_alvo: MLT[b0][9], n3: r(tres(tE), 2), dn3: r(tres(tE) - tres(tE - 3), 2), anos: exAnos, media_similares: r(media(exAnos.map(a => a.hoje))), realizado: PCT[b0][tA], realizado_parcial: false },
    desempenho: [["CH", [0.005, -0.019, -0.102, -0.004]], ["PER", [0.127, 0.006, 0.188, 0.109]], ["SIM", [0.012, 0.029, 0.037, 0.024]]].flatMap(([metodo, v]) => SUBS.map((nome, j) => ({
      metodo, nome, crpss: v[j], ic05: r(v[j] - (metodo === "PER" ? 0.058 : 0.034), 3), ic95: r(v[j] + (metodo === "PER" ? 0.052 : 0.031), 3), cobertura: metodo === "PER" ? [74, 71, 77, 73][j] : [58, 52, 61, 56][j] }))),
    habilidade: HABILIDADE,
    similares_desempenho: SIM_DES,
    rodadas: RODADAS.map(({ emissao, registrada_em, versao, tipo, regime: rg }) => ({ emissao, registrada_em, versao, tipo, regime: rg })),
  };

  window.HYD = {
    produto: PRODUTO, clima: CLIMA, fundamentos: FUND, metodologia: MET,
    historico_rodadas: RODADAS.map(x => ({ id: x.id, emissao: x.emissao, tipo: x.tipo, versao: x.versao, registrada_em: x.registrada_em, insumos: { nino34_rel_3m: x.nino3m, regime_enso: x.regime } })),
  };
})();
