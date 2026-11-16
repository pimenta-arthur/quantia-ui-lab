/* Exemplos da migração para o terminal · comum.js
   Atalhos usados pelas páginas de exemplo e a fita de cotações com os dados FICTÍCIOS de dados-ficticios.js.
   No app real, a fita recebe os dados reais pelo mesmo Terminal.fita(itens). */
const D = window.QD;
const cor = id => `var(--sm-${id})`;
const nomeSub = id => D.SUBS.find(s => s.id === id).nome;
const horaRot = h => String(h).padStart(2, "0") + "h";
const mediaDia = id => D.media(D.hoje[id]);
/** corpo do painel pelo código de referência (ex.: corpo("BAND-1")) */
const corpo = ref => document.querySelector(`#${ref} .painel-corpo`);
/** cabeçalho do painel, onde entram as abas */
const cab = ref => document.querySelector(`#${ref} .painel-cab`);

Terminal.fita([
  ...D.SUBS.map(s => ({ r: `PLD ${s.nome}`, v: n(mediaDia(s.id), 2), d: mediaDia(s.id) - D.media(D.ontem[s.id]) })),
  { r: "NE−SE/CO", v: sn(D.spread30.ne[29], 2), d: D.spread30.ne[29] - D.spread30.ne[28] },
  { r: "N−SE/CO", v: sn(D.spread30.n[29], 2), d: D.spread30.n[29] - D.spread30.n[28] },
  { r: "SE/CO dez/26", v: n(D.book[0][1], 2), d: D.book[0][6] },
  { r: "SE/CO Cal 27", v: n(D.book[5][1], 2), d: D.book[5][6] },
  { r: "EAR SE/CO", v: "48,2%", d: -1.1 },
  { r: "GSF dez/26", v: n(D.gsf[1], 2), d: 0.05 },
]);
