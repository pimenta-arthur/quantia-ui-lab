/* Variante 07 · Terminal (app real) · comum.js
   Fita de cotações comum a todas as páginas, com números FICTÍCIOS. No app, Terminal.fita() recebe
   os valores reais de cada funcionalidade (bandeira de M+1, PLD do dia, spread NE, ENA). */
Terminal.fita([
  { r: "Bandeira dez/26", v: "Amarela 45%", d: 0.06 },
  { r: "PLD SE/CO hoje", v: n(171.25, 2), d: 12.32 },
  { r: "PLD NE hoje", v: n(129.57, 2), d: 9.28 },
  { r: "Desvio DESSEM−DECOMP SE", v: sn(-18.4, 1), d: -6.1 },
  { r: "Spread NE−SE dez/26", v: sn(-55.0, 1), d: 2.4 },
  { r: "Spread N−SE dez/26", v: sn(-41.8, 1), d: -1.1 },
  { r: "ENA SE M+1", v: "78% MLT", d: -3.0 },
  { r: "ENA NE M+1", v: "64% MLT", d: 1.0 },
  { r: "ONI (ENSO)", v: sn(-0.6, 1), d: -0.1 },
]);
