# 08 · Mesa (terminal desde o início)

A 07 recriou o app de hoje no visual de terminal, página por página. A 08 parte das mesmas informações
(e reaproveita os dados fictícios e as contas da 07), mas reorganiza tudo como um terminal de mesa:
um aplicativo só, que ocupa a tela, em que se chega a qualquer coisa pelo teclado.

## O que muda em relação à 07
| 07 (app de hoje no terminal) | 08 (terminal desde o início) |
|---|---|
| Uma página por arquivo, com rolagem longa | Um aplicativo; cada funcionalidade tem **telas numeradas** que cabem na tela, com rolagem só dentro da área de trabalho |
| A resposta aparece no meio da página | Cada função abre com a **linha de decisão**: a resposta que a mesa precisa (bandeira de M+1, PLD do mês simulado, preço de compra e venda, ENA de M+1) |
| Detalhe em outra página ou em blocos que abrem | **Inspetor** à direita: clicar num mês, produto, dia ou ano mostra o detalhe ali, sem sair da tela |
| Metodologia como página separada, longa | Tela **MET** de cada função com índice; o **?** no cabeçalho de cada painel leva direto à seção que explica aquele painel |
| Início com links | Tela **MESA**: o sinal de cada função, os resumos lado a lado e os alertas de todas |

## Comandos e teclas
- `/` abre o comando. `BAND`, `RISK`, `NEN`, `HYD`, `MESA`; `BAND 3` ou `BAND REL` vão direto a uma tela.
- Números trocam de função: `0` MESA, `1` BAND, `2` RISK, `3` NEN, `4` HYD (são fixas e fáceis de decorar).
- Telas da função atual: `←` `→` (ou `[` `]`) para a anterior e a seguinte; `Shift`+`1`–`9` vai direto a uma tela.
  As telas mudam de quantidade e de sentido entre as funções (a 3 da BAND é Histórico, a 3 da NEN é Fundamentos),
  por isso ficam com a navegação em sequência. `Esc` volta à MESA.
- `I` mostra ou esconde o inspetor; `?` abre a metodologia da função; `T` troca o tema.

## Estrutura
- `index.html`: casca (topo com comando, funções com o sinal de cada uma, telas da função, fita, área de
  trabalho, inspetor, status).
- `mesa.css`, `mesa.js`: casca, roteamento (`#BAND-2`), teclado, painéis e inspetor. API em `mesa.js`.
- `funcoes/<cod>.js`: cada função se registra com `Mesa.registrar({...})` (telas, sinal, resumo, alertas).
- Dados e contas: os da 07 (`../07-terminal-app/<funcionalidade>/dados.js` e `*_conta.js`), sem cópia.

## Telas de cada função
| Função | Telas (tecla) |
|---|---|
| BAND · Forecast Bandeiras | 1 MON Monitor · 2 CEN Cenários · 3 HIS Histórico · 4 REL Relato do DECOMP · 5 DES Desempenho · 6 MET Metodologia |
| RISK · Risk Lab DESSEM | 1 MON Monitor · 2 SIM Simulador · 3 PER Perfis · 4 IND Indicadores · 5 DES Desempenho · 6 MET Metodologia |
| NEN · Pricing Descolamento | 1 COT Cotação · 2 DES Descolamento · 3 FUN Fundamentos e realizado · 4 FIS Física · 5 BT Backtest da cotação · 6 MOD Desempenho do modelo · 7 MET Metodologia |
| HYD · Hydro Inflow Similarity | 1 ENA Afluências · 2 TRJ Trajetória e histórico · 3 CLI Indicadores climáticos · 4 FUN Fundamentos · 5 DES Desempenho e rodadas · 6 MET Metodologia |

Toda informação da 07 está em alguma tela ou no inspetor; os blocos que a 07 deixava recolhidos ficaram abertos ou
passaram para o inspetor. Fica de fora só o Swap do Pricing, que no app também é oculto (o texto está na MET).
Os textos de conclusão vêm do app e citam números reais que não batem com os fictícios; isso é avisado nas telas.

## Levar para o app
Depois que o app estiver no padrão terminal por páginas (a 07, via `migracao-terminal/PROMPTS.md`), a evolução para
esta mesa segue `migracao-terminal/PROMPTS-08.md`.
