/* Variante 07 · Terminal (app real) · Forecast Bandeiras · dados.js
   DADOS FICTÍCIOS, gerados no navegador com semente fixa (sempre os mesmos números). Nenhum valor vem do
   Quant Energia App: só o FORMATO é o mesmo de produto_dados.js (window.DADOS, página Projeções) e de
   relato_dados.js (window.RELATO_DADOS, página Relato do DECOMP). Os limites de X (Anexo I da REH 3.306/2024)
   são os da regra publicada, os mesmos citados na Metodologia.
   Cenário do laboratório: deck NEWAVE out/26, ECMWF emissão 01/11/26, rodada de 15/11/26 06:10, horizonte de
   nov/26 (já anunciada) a abr/27. window.RELATO_EXEMPLOS traz relatos do DECOMP fictícios de dez/26 (texto no
   formato que relato_conta.js lê), para a página do Relato abrir já calculada. */
(function () {
  // ---------- utilitários ----------
  let semente = 20261115;
  const rnd = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const arr = (v, c) => +(+v).toFixed(c);
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const addMes = (p, k) => { const [a, m] = p.split("-").map(Number), t = a * 12 + m - 1 + k; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, "0")}`; };
  const mesesEntre = (a, b) => { const r = []; for (let p = a; p <= b; p = addMes(p, 1)) r.push(p); return r; };
  const hex = () => Array.from({ length: 8 }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");
  const mm = p => +p.slice(5, 7) - 1;
  const ano = p => +p.slice(0, 4);

  const LIM = { "Verde": 27.48, "Amarela": 68.99, "Vermelha 1": 95.05 };
  const ORD = ["Verde", "Amarela", "Vermelha 1", "Vermelha 2"];
  const AB = { "Verde": "Vd", "Amarela": "Am", "Vermelha 1": "V1", "Vermelha 2": "V2" };
  const corDe = (gsf, pld) => { const x = pld * Math.max(0, 1 - Math.round(gsf * 100) / 100); for (const c of ORD.slice(0, 3)) if (x <= LIM[c]) return c; return "Vermelha 2"; };
  const xDe = (gsf, pld) => pld * Math.max(0, 1 - Math.round(gsf * 100) / 100);
  const Phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
  function probCores(gsf, pld, h) {
    const g = Math.round(gsf * 100) / 100;
    if (g >= 0.96) return { "Verde": 1, "Amarela": 0, "Vermelha 1": 0, "Vermelha 2": 0 };
    const x = pld * (1 - g), s = h <= 3 ? 16 : 25;
    const c1 = Phi((LIM.Verde - x) / s), c2 = Phi((LIM.Amarela - x) / s), c3 = Phi((LIM["Vermelha 1"] - x) / s);
    return { "Verde": arr(c1, 3), "Amarela": arr(c2 - c1, 3), "Vermelha 1": arr(c3 - c2, 3), "Vermelha 2": arr(1 - c3, 3) };
  }
  const probTexto = p => ORD.filter(c => p[c] >= 0.005).map(c => `${AB[c]} ${Math.round(p[c] * 100)}%`).join(" ");
  const nBr = (v, c) => v.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });

  // ---------- premissas regulatórias fictícias por ano ----------
  const PLD_MIN = { 2023: 67.10, 2024: 60.20, 2025: 58.10, 2026: 58.60, 2027: 58.60 };
  const PLD_MAX = { 2023: 690.20, 2024: 718.90, 2025: 742.50, 2026: 751.73, 2027: 751.73 };
  const GF_ANO = { 2023: 53480, 2024: 53120, 2025: 52870, 2026: 52640 };
  const GF_SAZ = [1.004, 1.006, 1.003, 0.999, 0.996, 0.994, 0.995, 0.997, 0.998, 1.0, 1.002, 1.0];
  const gfDe = p => Math.round(GF_ANO[ano(p)] * GF_SAZ[mm(p)]);
  const ADIC_VIG = { "Verde": 0, "Amarela": 19.37, "Vermelha 1": 45.8, "Vermelha 2": 80.94 };
  // adicional (R$/MWh) por época, fictício
  const ERAS = [
    ["2015-01", { "Verde": 0, "Amarela": 20, "Vermelha 1": 40, "Vermelha 2": 40 }],
    ["2017-01", { "Verde": 0, "Amarela": 12, "Vermelha 1": 32, "Vermelha 2": 52 }],
    ["2020-01", { "Verde": 0, "Amarela": 14, "Vermelha 1": 42, "Vermelha 2": 64 }],
    ["2021-07", { "Verde": 0, "Amarela": 19, "Vermelha 1": 40, "Vermelha 2": 95, "Escassez hídrica": 140 }],
    ["2022-07", { "Verde": 0, "Amarela": 21, "Vermelha 1": 48, "Vermelha 2": 82 }],
    ["2024-07", ADIC_VIG],
  ];
  const adicDe = (p, cor) => ERAS.filter(([d]) => d <= p).pop()[1][cor] ?? 0;

  // ---------- "verdade" mensal: ENA, GSF e PLD de 2023 a nov/26 ----------
  const MLT = [97800, 104300, 99100, 81600, 61800, 51700, 44300, 38600, 36400, 42100, 55300, 75900];
  const RAZAO_ANO = { 2023: 1.02, 2024: 0.84, 2025: 0.79, 2026: 0.74 };
  const GSF_SAZ = [1.04, 1.09, 1.08, 1.0, 0.91, 0.84, 0.78, 0.72, 0.69, 0.71, 0.79, 0.92];
  const verdade = {};
  mesesEntre("2023-01", "2026-11").forEach(p => {
    const r = lim(RAZAO_ANO[ano(p)] + 0.08 * normal(), 0.5, 1.4);
    const gsf = arr(lim(GSF_SAZ[mm(p)] * (0.86 + 0.16 * r) + 0.015 * normal(), 0.6, 1.12), 2);
    const pld = arr(lim(PLD_MIN[ano(p)] + Math.max(0, 0.98 - gsf) * 820 * (1 + 0.15 * normal()), PLD_MIN[ano(p)], 520), 2);
    verdade[p] = { ena: Math.round(MLT[mm(p)] * r), gsf, pld };
  });
  Object.assign(verdade["2026-09"], { gsf: 0.74, pld: 168.30 });
  Object.assign(verdade["2026-10"], { gsf: 0.79, pld: 118.40, ena: 31240 });
  Object.assign(verdade["2026-11"], { gsf: 0.84, pld: 176.40 });

  // ---------- histórico de bandeiras desde 2015 ----------
  const SECO_ANO = { 2015: 0.9, 2016: 0.45, 2017: 0.8, 2018: 0.6, 2019: 0.45, 2020: 0.3, 2021: 0.95, 2022: 0.2 };
  const SAZ_SECA = [0, 0, 0, 0.1, 0.3, 0.5, 0.7, 0.85, 0.95, 0.85, 0.6, 0.2];
  const historico = mesesEntre("2015-01", "2026-11").map(p => {
    let cor, gsf, pld;
    if (p >= "2023-01") { ({ gsf, pld } = verdade[p]); cor = corDe(gsf, pld); }
    else if (p >= "2021-09" && p <= "2022-04") cor = "Escassez hídrica";
    else {
      const s = SECO_ANO[ano(p)] * SAZ_SECA[mm(p)] + 0.22 * rnd();
      cor = s < 0.3 ? "Verde" : s < 0.48 ? "Amarela" : s < 0.68 ? "Vermelha 1" : "Vermelha 2";
    }
    const h = { mes: p, cor, adicional: adicDe(p, cor) };
    if (gsf != null) { h.gsf = gsf; h.pld = pld; }
    return h;
  });

  // ---------- projeções (M+1 a M+6), médias das 15 séries de cada cenário ----------
  const DECK = "2026-10";
  const ALVOS = mesesEntre("2026-11", "2027-04");
  const ALVO_CEN = {
    "2026-11": { esp: [0.84, 176.4], li: [0.80, 221.7], ls: [0.88, 139.2] },
    "2026-12": { esp: [0.88, 164.8], li: [0.83, 207.5], ls: [0.93, 117.6] },
    "2027-01": { esp: [0.95, 121.3], li: [0.89, 169.0], ls: [1.01, 88.2] },
    "2027-02": { esp: [1.02, 91.6], li: [0.94, 141.2], ls: [1.08, 70.4] },
    "2027-03": { esp: [1.04, 84.9], li: [0.93, 151.5], ls: [1.10, 64.3] },
    "2027-04": { esp: [0.94, 131.0], li: [0.85, 204.6], ls: [1.03, 79.8] },
  };
  const CENS = ["esp", "li", "ls"];

  // seleção: trajetórias de ENA do SIN (MWmed), do deck ao alvo
  const periodos = [DECK, ...ALVOS];
  const refEsp = [verdade[DECK].ena, 41200, 57900, 78600, 90300, 87700, 69800];
  const FLI = [1, 0.80, 0.77, 0.75, 0.74, 0.74, 0.75], FLS = [1, 1.22, 1.27, 1.30, 1.31, 1.30, 1.28];
  const referencias = { esp: refEsp, li: refEsp.map((v, i) => Math.round(v * FLI[i])), ls: refEsp.map((v, i) => Math.round(v * FLS[i])) };
  const faixa = {
    p10: refEsp.map((v, i) => Math.round(v * [0.93, 0.72, 0.66, 0.62, 0.60, 0.60, 0.62][i])),
    p50: refEsp.map((v, i) => Math.round(v * [1, 0.98, 0.98, 0.97, 0.97, 0.97, 0.98][i])),
    p90: refEsp.map((v, i) => Math.round(v * [1.07, 1.38, 1.50, 1.58, 1.62, 1.60, 1.55][i])),
  };
  // ajusta a média de uma lista ao alvo, respeitando um piso
  const ajustarMedia = (xs, alvo, piso = -Infinity) => { for (let k = 0; k < 8; k++) { const d = alvo - xs.reduce((a, b) => a + b, 0) / xs.length; xs = xs.map(v => Math.max(piso, v + d)); } return xs; };
  const alvosSel = {};
  ALVOS.forEach((a, k1) => {
    const k = k1 + 1; alvosSel[a] = {};
    CENS.forEach(c => {
      const [g, p] = ALVO_CEN[a][c];
      const series = []; while (series.length < 15) { const s = 1 + Math.floor(rnd() * 2000); if (!series.includes(s)) series.push(s); }
      const ena = series.map(() => { let e = 0.01 * normal(); return referencias[c].slice(0, k + 1).map((v, t) => { if (t) e = e * 0.6 + 0.055 * normal(); return Math.round(v * (1 + e)); }); });
      const gsf = ajustarMedia(series.map(() => g + 0.028 * normal()), g + 0.0004).map(v => arr(v, 3));
      const pld = ajustarMedia(series.map(() => p * Math.exp(0.14 * normal())), p, 58.6).map(v => arr(v, 1));
      alvosSel[a][c] = { series, ena, gsf, pld };
    });
  });
  const media = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  const projecoes = ALVOS.map((a, i) => {
    const o = { alvo: a, h: i + 1, anunciada: a === "2026-11" ? "Amarela" : null };
    CENS.forEach(c => {
      const s = alvosSel[a][c], g = arr(media(s.gsf), 2), p = arr(media(s.pld), 2);
      o["gsf_" + c] = g; o["pld_" + c] = p; o["x_" + c] = arr(xDe(g, p), 2); o["cor_" + c] = corDe(g, p);
    });
    const pr = probCores(o.gsf_esp, o.pld_esp, o.h);
    o.prob = pr; o.adicional = ADIC_VIG[o.cor_esp];
    return o;
  });

  // composição do GSF (mesmos fatores, ANDE, PCH e GF_band nos três cenários)
  const fatoresPct = { perda_bruta_conexao: 1.312, perda_conexao_cg: 2.387, part_pch_mre: 61.47, perda_pch_cg: 0.071 };
  const PCH = [3920, 3990, 3950, 3780, 3550, 3380, 3290, 3250, 3260, 3330, 3480, 3700];
  const ANDE = [2950, 3010, 3040, 3120, 3280, 3400, 3480, 3520, 3540, 3460, 3300, 3100];
  const GF_DECK = gfDe(DECK);
  const fp = (1 - fatoresPct.perda_bruta_conexao / 100) * (1 - fatoresPct.perda_conexao_cg / 100);
  const calculo_gsf_cenarios = {};
  CENS.forEach(c => {
    calculo_gsf_cenarios[c] = projecoes.map(p => {
      const pch = PCH[mm(p.alvo)], ande = ANDE[mm(p.alvo)], pch_mre = Math.round(pch * fatoresPct.part_pch_mre / 100);
      const gh_band = Math.round((p["gsf_" + c] + 0.0003) * GF_DECK);
      const gh_ons = Math.round((gh_band - pch_mre) / fp + ande);
      const perdas = Math.round((gh_ons - ande) - (gh_band - pch_mre));
      return { alvo: p.alvo, gh_ons, ande, perdas, pch, pch_mre, gh_band, gf_band: GF_DECK, gsf: arr(gh_band / GF_DECK, 3) };
    });
  });

  // fundamentos: 18 meses oficiais até o deck e os 6 projetados
  const insumos = {
    realizado: mesesEntre("2025-05", DECK).map(p => ({ mes: p, ena: verdade[p].ena, mlt: MLT[mm(p)], gsf: verdade[p].gsf, pld: verdade[p].pld })),
    projetado: projecoes.map((p, i) => ({ mes: p.alvo, mlt: MLT[mm(p.alvo)], ena_esp: referencias.esp[i + 1], ena_li: referencias.li[i + 1], ena_ls: referencias.ls[i + 1],
      gsf_esp: p.gsf_esp, gsf_li: p.gsf_li, gsf_ls: p.gsf_ls, pld_esp: p.pld_esp, pld_li: p.pld_li, pld_ls: p.pld_ls })),
  };

  // ---------- rodadas: 16 decks de backtest e 3 publicadas ----------
  const realDe = Object.fromEntries(historico.map(h => [h.mes, h.cor]));
  const verdadeDe = a => (verdade[a] ? verdade[a] : { gsf: ALVO_CEN[a].esp[0], pld: ALVO_CEN[a].esp[1] });
  const gp = (g, p) => `GSF ${nBr(g, 2)} · R$ ${nBr(p, 0)}`;
  const rodadas = [];
  const decksBt = [...mesesEntre("2025-01", "2025-08"), ...mesesEntre("2025-11", "2026-05"), "2026-09"];
  decksBt.forEach((d, iD) => {
    const versao = hex();
    for (let h = 1; h <= 6; h++) {
      const a = addMes(d, h), v = verdadeDe(a), pm = PLD_MIN[ano(a)] || 58.6;
      const g = arr(lim(v.gsf + (0.022 + 0.012 * h) * normal(), 0.6, 1.12), 2);
      const p = arr(Math.max(pm, v.pld * Math.exp((0.1 + 0.05 * h) * normal())), 2);
      const gl = arr(g - 0.03 - 0.01 * h, 2), pl = arr(p * (1.15 + 0.04 * h), 2), gu = arr(g + 0.04 + 0.01 * h, 2), pu = arr(Math.max(pm, p * (0.85 - 0.03 * h)), 2);
      rodadas.push({ rodada: d, tipo: "backtest", publicada: false, deck: d, deck_versao: versao, ecmwf: `${d}-01`, motivo: "rodada mensal (convertida do registro por mês)", modelo: "v1",
        publicada_em: `${d}-05`, alvo: a, h, real: realDe[a] || null, esp: corDe(g, p), li: corDe(gl, pl), ls: corDe(gu, pu),
        prob: iD < 2 ? "sem histórico para a probabilidade" : probTexto(probCores(g, p, h)), gp: gp(g, p),
        gsf_esp: g, pld_esp: p, gsf_li: gl, pld_li: pl, gsf_ls: gu, pld_ls: pu });
    }
  });
  const PUB = [
    { id: "2026-10-07T08:30:00", versao: "a91c3e07", ecmwf: "2026-10-01", motivo: "primeira publicação", ruido: 1 },
    { id: "2026-10-09T19:12:41", versao: "5d02b7f4", ecmwf: "2026-10-01", motivo: "deck republicado pela CCEE", ruido: 0.6 },
    { id: "2026-11-15T06:10:00", versao: "5d02b7f4", ecmwf: "2026-11-01", motivo: "emissão de 01/11 do ECMWF", ruido: 0 },
  ];
  PUB.forEach(u => {
    projecoes.forEach(p => {
      const atual = !u.ruido;
      let g = p.gsf_esp, pl = p.pld_esp;
      if (!atual) { g = arr(lim(g - 0.02 * u.ruido + 0.02 * normal(), 0.6, 1.12), 2); pl = Math.round(pl * (1.08 * u.ruido + 0.92 * (1 - u.ruido)) * Math.exp(0.08 * normal())); }
      const gl = atual ? p.gsf_li : arr(g - 0.04, 2), pll = atual ? p.pld_li : pl * 1.25, gu = atual ? p.gsf_ls : arr(g + 0.05, 2), plu = atual ? p.pld_ls : pl * 0.8;
      rodadas.push({ rodada: u.id, tipo: "publicada", publicada: true, deck: DECK, deck_versao: u.versao, ecmwf: u.ecmwf, motivo: u.motivo, modelo: "v1", publicada_em: u.id.slice(0, 10),
        alvo: p.alvo, h: p.h, real: realDe[p.alvo] || null, esp: corDe(g, pl), li: corDe(gl, pll), ls: corDe(gu, plu),
        prob: probTexto(atual ? p.prob : probCores(g, pl, p.h)), gp: gp(g, pl),
        gsf_esp: g, pld_esp: pl, gsf_li: atual ? gl : null, pld_li: atual ? pll : null, gsf_ls: atual ? gu : null, pld_ls: atual ? plu : null });
    });
  });

  window.DADOS = {
    gerado_em: "2026-11-15",
    rodada: { publicada_em: "2026-11-15T06:10:00", motivo: "emissão de 01/11 do ECMWF", modelo: "v1", insumos: { deck: DECK, deck_versao: "5d02b7f4", ecmwf_emissao: "2026-11-01" }, id: "2026-11-15T06:10:00" },
    modelo: { versao: "v1", decisoes: "D029 (k=15, peso igual na trajetória), D030 (centro na média por precipitação do ECMWF; incerteza nos 51 membros recentrados), D031 (deck e ECMWF do mesmo mês)",
      k: 15, meia_vida: "inf", grupos_horizonte: [[1, 2, 3], [4, 5, 6]], minimo_erros_sigma: 8, gsf_verde: 0.96, quantil_li: 0.1, quantil_ls: 0.9, horizonte: 6 },
    deck: DECK, rodada_ecmwf: "2026-11", pld_min: 58.60, pld_max: 751.73,
    limites_x: { ...LIM }, adicional_vigente: { ...ADIC_VIG }, fatores: fatoresPct,
    projecoes, historico, rodadas,
    selecao: { periodos, faixa, referencias, alvos: alvosSel },
    calculo_gsf_cenarios, calculo_gsf: calculo_gsf_cenarios.esp, insumos,
    desempenho: {
      acerto_por_h: {
        modelo: [0.786, 0.692, 0.682, 0.44, 0.467, 0.353],
        persistencia: [0.625, 0.4, 0.313, 0.25, 0.2, 0.176],
        ano_anterior: [0.5, 0.438, 0.375, 0.25, 0.267, 0.176],
        oraculo: [0.688, 0.7, 0.712, 0.733, 0.75, 0.767],
      },
      n_previsoes: 89, n_decks: 16, periodo: ["2025-01", "2026-09"], cobertura_li_ls: 0.933,
      confiabilidade: [{ prevista: 0.015, observada: 0.041, n: 88 }, { prevista: 0.188, observada: 0.31, n: 25 }, { prevista: 0.405, observada: 0.333, n: 24 },
        { prevista: 0.582, observada: 0.5, n: 18 }, { prevista: 0.79, observada: 0.714, n: 7 }, { prevista: 0.991, observada: 0.857, n: 21 }],
      previstas: {},
    },
  };

  // =====================================================================================================
  // Relato do DECOMP
  // =====================================================================================================
  // horas por patamar e semana operativa (sábado a sexta), só os dias dentro do mês
  const HORAS_DIA = { util: [5, 12, 7], sab: [0, 14, 10], dom: [0, 8, 16] };
  function horasDoMes(p) {
    const [a, m] = p.split("-").map(Number), nd = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const off = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 1) % 7;  // dias desde o sábado
    const nSem = Math.floor((nd - 1 + off) / 7) + 1, t = [0, 1, 2].map(() => Array(nSem).fill(0));
    for (let d = 1; d <= nd; d++) {
      const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay(), w = Math.floor((d - 1 + off) / 7);
      const hs = dow === 0 ? HORAS_DIA.dom : dow === 6 ? HORAS_DIA.sab : HORAS_DIA.util;
      hs.forEach((v, k) => { t[k][w] += v; });
    }
    return t;
  }
  const horas = {};
  mesesEntre("2023-01", "2027-12").forEach(p => { horas[p] = horasDoMes(p); });
  const fatores = {
    "2023-01": { perda_bruta_conexao: 0.01395, perda_conexao_cg: 0.02512, part_pch_mre: 0.6431, perda_pch_cg: 0.00118 },
    "2023-03": { perda_bruta_conexao: 0.01377, perda_conexao_cg: 0.02476, part_pch_mre: 0.6392, perda_pch_cg: 0.00104 },
    "2024-04": { perda_bruta_conexao: 0.01351, perda_conexao_cg: 0.02433, part_pch_mre: 0.6288, perda_pch_cg: 0.00092 },
    "2025-03": { perda_bruta_conexao: 0.01329, perda_conexao_cg: 0.02401, part_pch_mre: 0.6203, perda_pch_cg: 0.00079 },
    "2026-03": { perda_bruta_conexao: 0.01312, perda_conexao_cg: 0.02387, part_pch_mre: 0.6147, perda_pch_cg: 0.00071 },
  };
  const boletim = {};
  mesesEntre("2023-01", "2026-11").forEach(p => {
    const v = verdade[p], gf = gfDe(p);
    boletim[p] = { gf_band: gf, pld_min: PLD_MIN[ano(p)], pld_max: PLD_MAX[ano(p)], pld_gatilho: v.pld, gsf: v.gsf, gh_band: Math.round(gf * (v.gsf + 0.003 * (rnd() - 0.5))), cor: corDe(v.gsf, v.pld) };
  });
  window.RELATO_DADOS = { fatores, limites_x: { ...LIM }, cores: ORD.slice(), horas, horas_estimadas: mesesEntre("2027-01", "2027-12"), boletim };

  // ---------- relatos fictícios (texto no formato do relato.rv0) ----------
  const NOME_MES = ["JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  const SUBS = ["SE", "S", "NE", "N"];
  const PAT_F = [1.06, 1.0, 0.93];
  const f1 = v => v.toFixed(1).padStart(10), f2 = v => v.toFixed(2).padStart(10);
  // tabela patamar × semana (nSem + 1 estágios) com média ponderada pelas horas igual ao alvo
  function tabelaAlvo(alvoMedia, h, fPat = PAT_F, ruido = 0.03, extra = 1) {
    const nSem = h[0].length, t = [0, 1, 2].map(p => Array.from({ length: nSem + extra }, () => fPat[p] * (1 + ruido * normal())));
    let s = 0, tot = 0; for (let p = 0; p < 3; p++) for (let w = 0; w < nSem; w++) { s += t[p][w] * h[p][w]; tot += h[p][w]; }
    const k = alvoMedia / (s / tot);
    return t.map(l => l.map(v => v * k));
  }
  // o = { mes, ghid:{SE,S,NE,N}, it60, ande, pch:{SE,S,NE,N}, mercado:{…}, pld (alvo), pmin, pmax, fCmo:{SE,S,NE,N,FC} }
  function relatoTexto(o) {
    const h = horas[o.mes], nSem = h[0].length, nE = nSem + 1, nome = NOME_MES[mm(o.mes)];
    const L = [];
    L.push("", "  CEPEL - DECOMP - LABORATORIO QUANTIA (relato FICTICIO, so para demonstracao)", `  PMO DE ${nome} ${o.mes.slice(0, 4)} - REVISAO 0 - ${o.orgao}`, "");
    // custo marginal: escala que leva o PLD gatilho (limitado, médio pelas horas e pela carga) ao alvo
    const base = {}; [...SUBS, "FC"].forEach(s => { base[s] = [0, 1, 2].map(p => Array.from({ length: nE }, (_, w) => o.fCmo[s] * PAT_F[p] * (1 + 0.06 * w) * (1 + 0.05 * normal()))); });
    const totH = h.flat().reduce((a, b) => a + b, 0), totC = SUBS.reduce((a, s) => a + o.mercado[s], 0);
    const pldCom = k => SUBS.reduce((acc, s) => { let x = 0; for (let p = 0; p < 3; p++) for (let w = 0; w < nSem; w++) x += lim(base[s][p][w] * k, o.pmin, o.pmax) * h[p][w]; return acc + x / totH * o.mercado[s] / totC; }, 0);
    let k = o.pld; for (let i = 0; i < 30; i++) k *= o.pld / pldCom(k);
    L.push("  CUSTO MARGINAL DE OPERACAO  ($/MWh)", "  X--------X" + "----------X".repeat(nE),
      "     Ssis    " + Array.from({ length: nE }, (_, w) => `   Sem_${String(w + 1).padStart(2, "0")}`).join(""), "  X--------X" + "----------X".repeat(nE));
    [...SUBS, "FC"].forEach(s => {
      const t = base[s].map(l => l.map(v => v * k));
      t.forEach((l, p) => L.push(`    Pat_${p + 1}   ` + l.map(f2).join("")));
      L.push(`    Med_${s.padEnd(4)}` + t[0].map((_, w) => f2((t[0][w] + t[1][w] + t[2][w]) / 3)).join(""));
    });
    L.push("  X--------X" + "----------X".repeat(nE), "");
    // balanço energético por semana, subsistema e patamar
    const tGh = {}, tMer = {}; SUBS.forEach(s => { tGh[s] = tabelaAlvo(o.ghid[s], h); tMer[s] = tabelaAlvo(o.mercado[s], h, [1.08, 1.0, 0.9], 0.015); });
    const tIt = tabelaAlvo(o.it60, h, [1.03, 1.0, 0.96], 0.02);
    const COLS = "      Mercado     PQUsi    Cbomba      Ghid      Gter    GterAT      Geol   Deficit  Interligacao   Itaipu60";
    for (let w = 0; w < nE; w++) {
      L.push(`  ${nome} / SEMANA ${w + 1} - ESTAGIO ${w + 1}`, "  RELATORIO DO BALANCO ENERGETICO (MWmed)");
      SUBS.forEach(s => {
        L.push(`     Subsistema ${s}`, COLS);
        for (let p = 0; p < 3; p++) {
          const mer = tMer[s][p][w], gh = tGh[s][p][w], pq = mer * 0.11, gt = mer * 0.14, geol = s === "NE" ? mer * 0.55 : mer * 0.03;
          const vals = [mer, pq, 0, gh, gt, gt * 0.2, geol, 0, mer - pq - gh - gt - geol, s === "SE" ? tIt[p][w] : 0];
          L.push(`       Pat_${p + 1}` + vals.map(f1).join(""));
        }
      });
      L.push("");
    }
    // pequenas usinas (PCH, PCT, EOL e UFV de geração distribuída) por subsistema
    L.push("  Relatorio dos Dados de Pequenas Usinas", "  X------------X--------X-----X----------X----------X----------X", "     Nome          Tipo     Est      Pat_1      Pat_2      Pat_3", "  X------------X--------X-----X----------X----------X----------X");
    const SUB_PEQ = { SE: "SECO", S: "SUL", NE: "NE", N: "N" };
    SUBS.forEach(s => {
      [["PCH", o.pch[s]], ["PCT", o.pch[s] * 0.4], ["EOL", o.pch[s] * 0.2], ["UFV", o.pch[s] * 0.9, "gd"]].forEach(([tipo, alvo, gd]) => {
        const t = tabelaAlvo(alvo, h, [1.02, 1.0, 0.97], 0.02);
        for (let w = 0; w < nE; w++) {
          const v = [0, 1, 2].map(p => t[p][w].toFixed(1).padStart(10)).join(" ");
          L.push(w === 0 ? `   ${(SUB_PEQ[s] + "_" + tipo + (gd || "")).padEnd(12)} PQUSI   ${String(w + 1).padStart(3)}  ${v}` : `                         ${String(w + 1).padStart(3)}  ${v}`);
        }
      });
    });
    L.push("  X------------X--------X-----X----------X----------X----------X", "");
    // eco de Itaipu: a última coluna é a ANDE
    const tA = tabelaAlvo(o.ande, h, [1.04, 1.0, 0.95], 0.02);
    L.push("  Relatorio de eco  das informacoes de ITAIPU", "", "  X-----X-----X------------X------------X", "    Sem   Pat    Geracao60      ANDE", "  X-----X-----X------------X------------X");
    for (let w = 0; w < nE; w++) for (let p = 0; p < 3; p++) L.push(`    ${String(w + 1).padStart(3)}   ${p + 1}   ${(tIt[p][w] * 1.9).toFixed(1).padStart(12)}${tA[p][w].toFixed(1).padStart(12)}`);
    L.push("  X-----X-----X------------X------------X", "");
    return L.join("\n");
  }
  // GH do ONS que leva ao GSF desejado com os fatores vigentes, a PCH e a ANDE do mês
  const MES_EX = "2026-12", fx = fatores["2026-03"], GF_EX = boletim["2026-11"].gf_band;
  const PCH_EX = { SE: 2050, S: 860, NE: 230, N: 470 }, ANDE_EX = 3100, IT60_EX = 5600;
  const pchTot = Object.values(PCH_EX).reduce((a, b) => a + b, 0);
  const ghidPara = gsf => { const gb = (gsf + 0.002) * GF_EX, ghOns = (gb - pchTot * fx.part_pch_mre * (1 - fx.perda_pch_cg)) / ((1 - fx.perda_bruta_conexao) * (1 - fx.perda_conexao_cg)) + ANDE_EX; const g = ghOns - IT60_EX; return { SE: g * 0.62, S: g * 0.15, NE: g * 0.10, N: g * 0.13 }; };
  const MERC = { SE: 44800, S: 13900, NE: 12600, N: 7700 };
  const F_CMO = { SE: 1.0, S: 0.97, NE: 0.74, N: 0.36, FC: 0.98 };
  const relato = (orgao, gsf, pld, merc = MERC, ajusteGh = 1) => {
    const g = ghidPara(gsf); Object.keys(g).forEach(s => { g[s] *= ajusteGh; });
    return relatoTexto({ orgao, mes: MES_EX, ghid: g, it60: IT60_EX, ande: ANDE_EX, pch: PCH_EX, mercado: merc, pld, pmin: PLD_MIN[2026], pmax: PLD_MAX[2026], fCmo: F_CMO });
  };
  const merc4 = Object.fromEntries(Object.entries(MERC).map(([s, v]) => [s, v * 1.04]));
  const arq = (nome, texto) => ({ nome, tam: texto.length, texto, exemplo: true });
  window.RELATO_EXEMPLOS = {
    mes: MES_EX,
    execucoes: [
      { nome: "Deck oficial (rv0)", ccee: arq("relato_ccee_202612_rv0.rv0", relato("CCEE", 0.886, 165.2, MERC, 1.004)), ons: arq("relato_ons_202612_rv0.rv0", relato("ONS", 0.88, 171.0)), pld_manual: "" },
      { nome: "Cenário seco", ccee: arq("relato_ccee_202612_seco.rv0", relato("CCEE", 0.84, 205.3)), ons: null, pld_manual: "" },
      { nome: "Carga 4% acima", ccee: arq("relato_ccee_202612_carga.rv0", relato("CCEE", 0.874, 228.4, merc4, 1.004)), ons: arq("relato_ons_202612_carga.rv0", relato("ONS", 0.87, 232.0, merc4)), pld_manual: "" },
    ],
  };
})();
