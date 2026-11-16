/* Quantia UI Lab · dados fictícios compartilhados pelas variantes navegáveis.
   Gerados com semente fixa: todas as variantes mostram os mesmos números. Nada aqui vem do app real. */
(function () {
  let semente = 20261115;
  const rnd = () => { semente |= 0; semente = semente + 0x6D2B79F5 | 0; let t = Math.imul(semente ^ semente >>> 15, 1 | semente); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ruido = a => (rnd() - 0.5) * 2 * a;
  const r2 = v => Math.round(v * 100) / 100;
  const PISO = 61.07, TETO = 751.73;
  const lim = v => r2(Math.min(TETO, Math.max(PISO, v)));

  const SUBS = [
    { id: "se", nome: "SE/CO", longo: "Sudeste/Centro-Oeste" },
    { id: "s", nome: "S", longo: "Sul" },
    { id: "ne", nome: "NE", longo: "Nordeste" },
    { id: "n", nome: "N", longo: "Norte" },
  ];

  // PLD horário de um dia: pico no fim da tarde; NE e N vão ao piso no meio do dia (solar e eólica)
  function dia(f) {
    const d = { se: [], s: [], ne: [], n: [] };
    for (let h = 0; h < 24; h++) {
      const pico = Math.exp(-((h - 19.5) ** 2) / 5), sol = Math.max(0, Math.sin((h - 6) / 12 * Math.PI));
      const se = (150 + 230 * pico - 50 * sol) * f + ruido(7);
      d.se.push(lim(se));
      d.s.push(lim(se + ruido(5) + (h >= 18 && h <= 21 ? 14 : 0)));
      const ne = se - 28 - 230 * sol + ruido(9);
      d.ne.push(lim(ne));
      d.n.push(lim(ne + 16 - 25 * sol + ruido(7)));
    }
    return d;
  }
  const semana = [0.88, 0.95, 1.06, 1.1, 0.97, 0.93, 1].map(dia);  // 09/11 a 15/11; o último é hoje
  const hoje = semana[6], ontem = semana[5];
  const diasSemana = ["09/11", "10/11", "11/11", "12/11", "13/11", "14/11", "15/11"];
  const media = a => a.reduce((s, v) => s + v, 0) / a.length;
  const media7 = {}; SUBS.forEach(s => { media7[s.id] = Array.from({ length: 24 }, (_, h) => r2(media(semana.map(d => d[s.id][h])))); });

  // spread diário dos últimos 30 dias (média do dia, R$/MWh)
  const dias30 = [], spread30 = { ne: [], n: [] };
  let a = -62, b = -48;
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(2026, 10, 15 - i);
    dias30.push(`${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`);
    a += ruido(9) - (a + 70) * 0.12; b += ruido(8) - (b + 52) * 0.12;
    spread30.ne.push(r2(a)); spread30.n.push(r2(b));
  }
  spread30.ne[29] = r2(media(hoje.ne) - media(hoje.se)); spread30.n[29] = r2(media(hoje.n) - media(hoje.se));

  // PLD médio mensal: nov/24 a abr/27; out/26 é o último mês oficial (índice 23), depois projeção
  const meses = [];
  for (let i = 0; i < 30; i++) { const d = new Date(2024, 10 + i, 1); meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
  const i0 = 23;
  const mensal = { se: [], s: [], ne: [], n: [] }, faixa = { se: { lo: [], hi: [] }, ne: { lo: [], hi: [] }, s: { lo: [], hi: [] }, n: { lo: [], hi: [] } };
  meses.forEach((mm, i) => {
    const mes = +mm.slice(5, 7), seca = Math.exp(-((mes - 9) ** 2) / 4), vento = Math.exp(-((mes - 9) ** 2) / 6);
    const se = 115 + 210 * seca + (i > 11 ? 25 : 0) + ruido(14);
    const vals = { se, s: se + ruido(10) - 6, ne: se - 30 - 95 * vento + ruido(10), n: se - 22 - 70 * vento + ruido(10) };
    SUBS.forEach(s => {
      const v = lim(vals[s.id]); mensal[s.id].push(v);
      const k = Math.max(0, i - i0) * 0.07;
      faixa[s.id].lo.push(i >= i0 ? lim(v * (1 - k)) : null);
      faixa[s.id].hi.push(i >= i0 ? lim(v * (1 + k * 1.5)) : null);
    });
  });
  const spreadMensal = { ne: meses.map((_, i) => r2(mensal.ne[i] - mensal.se[i])), n: meses.map((_, i) => r2(mensal.n[i] - mensal.se[i])) };

  // distribuição do spread horário NE−SE nos últimos 90 dias (histograma)
  const histSpread = [];
  for (let k = 0; k < 2160; k++) { const sol = rnd() < 0.45; histSpread.push(sol ? -150 + ruido(60) - rnd() * 40 : -25 + ruido(35)); }

  // bandeiras: meses projetados e histórico das rodadas semanais
  const mesesBand = ["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"];
  const probBand = [  // verde, amarela, vermelha P1, vermelha P2
    [0, 1, 0, 0], [0.10, 0.45, 0.35, 0.10], [0.35, 0.40, 0.20, 0.05], [0.60, 0.28, 0.10, 0.02], [0.72, 0.20, 0.07, 0.01], [0.78, 0.17, 0.04, 0.01],
  ];
  const rodadasBand = [
    ["2026-09-27", ["v1", "v1", "am", "am", "vd", "vd"]],
    ["2026-10-04", ["v1", "v1", "am", "am", "vd", "vd"]],
    ["2026-10-11", ["am", "v1", "am", "vd", "vd", "vd"]],
    ["2026-10-18", ["am", "v1", "am", "vd", "vd", "vd"]],
    ["2026-10-25", ["am", "v1", "vd", "vd", "vd", "vd"]],
    ["2026-11-01", ["am", "am", "vd", "vd", "vd", "vd"]],
    ["2026-11-08", ["am", "am", "am", "vd", "vd", "vd"]],
    ["2026-11-15", ["am", "am", "am", "vd", "vd", "vd"]],
  ];
  const BANDEIRAS = { vd: { nome: "Verde", sigla: "VD", custo: 0 }, am: { nome: "Amarela", sigla: "AM", custo: 1.885 }, v1: { nome: "Vermelha P1", sigla: "V1", custo: 4.463 }, v2: { nome: "Vermelha P2", sigla: "V2", custo: 7.877 } };
  const gsf = [0.71, 0.76, 0.84, 0.91, 0.96, 0.98];

  const reserv = [
    { id: "se", ear: 0.482, ena: 0.82, varSem: -0.011 }, { id: "s", ear: 0.715, ena: 1.04, varSem: 0.023 },
    { id: "ne", ear: 0.559, ena: 0.61, varSem: -0.008 }, { id: "n", ear: 0.623, ena: 0.77, varSem: 0.004 },
  ];

  // book indicativo de compra e venda (preço SE/CO e spreads dos submercados descolados)
  const book = [
    ["dez/26", 214.30, -58.2, -51.8, -44.6, -38.9, 2.4],
    ["jan/27", 196.80, -47.5, -41.0, -36.2, -30.4, -1.1],
    ["1T27", 182.40, -42.8, -36.9, -33.0, -27.6, -0.6],
    ["2T27", 205.10, -55.4, -48.3, -41.9, -35.2, 1.8],
    ["2S27", 268.90, -88.1, -78.6, -69.4, -60.3, 3.1],
    ["Cal 2027", 228.40, -66.7, -58.9, -52.0, -44.8, 0.9],
  ];

  // forecast: acerto por horizonte (fora da amostra)
  const acerto = [["M+1", 0.81, 0.094], ["M+2", 0.74, 0.137], ["M+3", 0.69, 0.171], ["M+4", 0.63, 0.205], ["M+5", 0.58, 0.236], ["M+6", 0.55, 0.262]];
  const errosRodadas = meses.slice(i0 - 5, i0 + 1).map((mm, k) => ({ mes: mm, prev: r2(mensal.se[i0 - 5 + k] * (1 + ruido(0.12))), ofi: mensal.se[i0 - 5 + k] }));

  // risco: exposição líquida por mês (MWm, + comprado, − vendido)
  const mesesRisco = ["2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06", "2027-07", "2027-08", "2027-09", "2027-10", "2027-11"];
  const expo = {
    se: [12.4, 9.8, 6.1, 4.0, -2.2, -5.6, -8.3, -6.9, -3.1, 1.2, 4.8, 7.5],
    ne: [-8.6, -7.1, -6.4, -5.0, -4.2, -3.3, -2.0, -1.4, -3.8, -6.2, -7.9, -8.8],
    n: [3.1, 2.4, 2.0, 1.1, 0.4, -0.6, -1.5, -2.4, -2.9, -1.8, 0.2, 1.9],
  };
  const stress = [
    ["Seca severa no SE/CO (ENA 55% MLT)", -8.42, "PLD SE/CO +R$ 180 por 6 meses"],
    ["Descolamento NE/SE de −R$ 150", -3.97, "spread NE−SE em −R$ 150 por 3 meses"],
    ["Cortes de eólica no NE", 1.26, "geração eólica NE −20%"],
    ["PLD no piso por 3 meses", 2.84, "todos os submercados no piso"],
    ["Teto horário 10 dias", -5.11, "pico diário no teto em dez/26"],
    ["Bandeira vermelha P2 jan–mar", -0.73, "efeito indireto na demanda"],
  ];
  const pnl = []; for (let k = 0; k < 3000; k++) pnl.push((ruido(1) + ruido(1) + ruido(1)) * 1.1 + (rnd() < 0.05 ? -2 - rnd() * 2 : 0) + 0.12);
  const limites = [
    ["VaR 95% (1 dia)", 1.84, 3.0, "R$ mi"], ["Exposição NE", 19.5, 25, "MWm"], ["Perda no mês", 1.71, 5.0, "R$ mi"], ["Prazo médio da carteira", 8.1, 18, "meses"],
  ];

  const eventos = [
    ["2026-11-15T06:10", "rodada", "Rodada do Forecast concluída com o deck NEWAVE nov/26."],
    ["2026-11-14T18:02", "alerta", "Spread NE−SE abaixo de −R$ 120 por 6 horas seguidas."],
    ["2026-11-14T09:30", "insumo", "ECMWF 00z incorporado às projeções de ENA."],
    ["2026-11-13T17:45", "bandeira", "Probabilidade de vermelha em dez/26 subiu para 45%."],
    ["2026-11-12T11:20", "risco", "Exposição NE em 78% do limite."],
    ["2026-11-11T08:05", "rodada", "Rodada semanal do Pricing NE/N publicada."],
  ];

  window.QD = {
    PISO, TETO, SUBS, hoje, ontem, semana, diasSemana, media7, dias30, spread30, meses, i0, mensal, faixa, spreadMensal,
    histSpread, mesesBand, probBand, rodadasBand, BANDEIRAS, gsf, reserv, book, acerto, errosRodadas, mesesRisco, expo, stress,
    pnl, limites, eventos, rnd, media,
    rodada: "2026-11-15T06:10", hojeIso: "2026-11-15",
  };
})();
