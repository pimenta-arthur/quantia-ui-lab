# Padrão visual Quant Energia · v2.0 (terminal) · 2026-11

Guia das páginas do Quant Energia no visual de terminal de mesa (inspiração Bloomberg). Substitui o v1.3.1.
Para usar num projeto, **copiar a pasta `padrao/` inteira** no lugar da antiga, sem apontar para outro
repositório, e manter a versão no topo de cada arquivo.

## O que mudou em relação ao v1.3.1
| | v1.3.1 | v2.0 (terminal) |
|---|---|---|
| Largura | máximo de 1080 px | tela inteira, grade de 12 colunas |
| Tema | segue o sistema (claro ou escuro) | **escuro sempre**; claro só pelo botão, e a escolha fica salva |
| Fontes | IBM Plex Sans + Mono | IBM Plex Mono (títulos e números) + IBM Plex Sans Condensed (texto) |
| Destaque | azul | âmbar; azul fica para o erro acima do oficial (`--erro-acima`) |
| Cantos | arredondados | retos; painéis colados (2 px) com barra de título |
| Navegação | links no topo (`.nav`) | linha de comando, teclas de função 1–9, fita de cotações, barra de status |
| Gráficos | `viewBox` fixo (texto cresce e encolhe) | `grafico()`: desenha na largura real e redesenha ao mudar o tamanho |

**Compatibilidade:** as classes do v1.3.1 continuam valendo (`.hero`, `.meta`, `.bloco`, `.barra-abas`,
`.tiles`/`.tile`, `.mini6`/`.mini`, `.grid2`, `.duas`, `.nav`, `.aviso`, metodologia) e as funções do
`graficos.js` v1.1 têm os mesmos nomes e assinaturas. Uma página antiga que só troca a pasta `padrao/` já sai
escura, em tela cheia e com fonte mono. A casca nova e a grade de painéis entram página por página.

## Arquivos
| Arquivo | O que é |
|---|---|
| `base.css` | tokens (escuro na raiz, claro em `[data-theme="light"]`), texto, tabelas, cartões, `.nav` do v1, metodologia |
| `painel.css` | casca do terminal, topo, grade de 12 colunas, painéis, abas, números, legendas, tooltip, componentes |
| `graficos.js` | v1.1 inteiro + `rs`, `srs`, `seta`, `tom`, `grafico`, `linhas`, `barras`, `histograma`, `sparkline` |
| `componentes.js` | `QC.*`: peças prontas que recebem dados (bandeiras, mapa de calor, medidores, tabelas, números…) |
| `terminal.js` | tema, relógio, comando, teclas e `Terminal.fita(itens)`; sem dados |
| `modelo.html` | página em branco com a casca completa |

Ordem: `base.css` → `painel.css` → estilos da página; scripts `graficos.js` → `componentes.js` →
`terminal.js` → script da página. O trecho de tema vai no `<head>`, **antes** dos estilos (ver `modelo.html`),
para a página não piscar no claro.

## Estrutura da página (de cima para baixo)
1. **Topo** (`.t-topo`): marca, linha de comando (`form.t-cmd[data-comando]`), código e nome da página, relógio
   (`[data-relogio]`, horário de Brasília) e botão de tema (`[data-tema]`).
2. **Teclas de função** (`nav.t-fn`): um link por página com `data-cod` (código do comando) e `href` (rota real).
   A ordem define as teclas 1–9. Códigos atuais: VG, PLD, BAND, NEN, FCST, RISK, METO. A página atual tem
   `aria-current="page"`.
3. **Fita de cotações** (`.t-fita[data-fita]`): preenchida com `Terminal.fita([{ r, v, d }])` com os dados
   reais; corre devagar, para no mouse e fica parada com movimento reduzido. Sem itens, some.
4. **Topo da página** (`.hero`): título em caixa alta, rótulo com horizonte ou data, premissas em `.meta` e a
   rodada à direita (`.atualizado`).
5. **Grade** (`.grade`): painéis `section.painel[data-tam]` com `s`/`m` = 4 colunas, `l` = 6, `xl` = 8,
   `full` = 12. **Cada linha soma 12** (ex.: `xl` + `s`, `l` + `l`, `m` + `m` + `m`). Até 1180 px, `s`/`m`
   viram meia linha e `l`/`xl` linha inteira; no celular, tudo em uma coluna.
6. **Painel**: `header.painel-cab` com `h2.ttl` (título que diz o que mostra, com unidade) e abas à direita;
   `div.painel-corpo`; `p.leg` com a legenda curta. Números do topo usam `.painel.sem-cab`.
7. **Aviso** (`.aviso`) e **status** (`.t-status`) no fim.

## Atalhos
`1`–`9` vão para a página da tecla de função; `/` foca o comando; `T` troca o tema. No comando: código
exato (`PLD`), número (`3`) ou começo do nome (`band`). Atalhos não disparam enquanto se digita num campo.

## Texto
- Português do Brasil, com acentuação; números pt-BR (`n`, `sn`, `pct`, `rs`, `srs`). Moeda sempre com
  `rs()`/`srs()`: o espaço depois de "R$" não quebra.
- Títulos de painel em caixa alta (o CSS cuida disso), com o que o gráfico mostra e a unidade
  ("PLD horário de hoje por submercado, em R$/MWh").
- Datas `15/11/26`, meses `nov/26`; sinal com `−` (menos tipográfico) e `+`.
- Alta e baixa sempre com seta (▲▼) além da cor (`tom()` + `seta()`).

## Cores com função
- **Neutros**: `--bg` (preto), `--surface`, `--ink`, `--ink-2`, `--ink-3`, `--rule`.
- **Âmbar** (`--accent`, `--t-ambar`): rótulos, títulos de painel, seleção, valor esperado de série única.
- **Submercados**, ordem fixa: `--sm-se`, `--sm-s`, `--sm-ne`, `--sm-n` (validados para daltonismo).
- **Alta/baixa**: `--sobe`, `--desce`. **Erro com sinal**: `fundoErro()` (azul acima, vermelho abaixo).
- **Bandeiras**: `--vd`, `--am`, `--v1`, `--v2` (texto `--on-flag`, e `--on-am` sobre o amarelo); só para bandeira.
- **Mapa de calor**: de `--calor-0` a `--calor`, uma cor só.
- Toda cor nova entra como token em `:root` (escuro) e é redefinida em `:root[data-theme="light"]`.
  **Não** usar `@media (prefers-color-scheme)`: o tema não segue o sistema.

## Gráficos
- Sempre por `grafico(caixa, (svg, W, H) => …)`: o SVG tem o tamanho real da caixa, texto de 10,5 px na tela
  em qualquer largura, e redesenha ao mudar o tamanho. Altura por `--graf-h` (210 px), `"alto"` (×1,35) ou
  `"baixo"` (×0,62).
- `linhas()` já traz guia vertical e tooltip com todas as séries do ponto, ponto final destacado, faixa,
  referências tracejadas e marca vertical (ex.: "deck"). `barras()` aceita negativos. `histograma()` mostra %
  e marca um valor.
- Tooltip em todo elemento com valor (`dicaEm`); a página não precisa criar `#dica` (terminal.js cria).
- Mesmas regras do v1: nada de marcador colorido sobre fundo colorido; pequenos múltiplos com a mesma escala;
  projeção tracejada nas tabelas de células; faixa clara para o intervalo de cenários; eixo de tempo com
  rótulos sem encostar (`rotulosX` faz isso).

## Migrar uma página do v1.3.1
1. Trocar a pasta `padrao/` e adicionar o trecho de tema no `<head>`.
2. Trocar `nav.nav` pela casca (`.terminal` com `.t-topo`, `.t-fn`, `.t-fita`, `main`, `.t-status`).
3. Trocar as seções soltas (`section > h2 + .bloco`) por painéis na `.grade`; o título da seção vira o
   `h2.ttl` do painel.
4. Trocar `viewBox` fixo por `grafico()` nos gráficos que devem acompanhar a largura.
5. Remover estilos próprios que dependiam de 1080 px ou de `prefers-color-scheme`.

## Conferência antes de publicar
- Escuro (padrão) e claro (botão), e numa largura de celular: sem rolagem horizontal da página.
- Passar o mouse pelos gráficos: todo elemento com valor tem tooltip.
- Teclas 1–9, `/` e `T`; comando com código, número e nome.
- Rótulos sem sobreposição; números dos cartões sem cortar.

## Versões
- v2.0 (2026-11-15): visual de terminal, tela cheia, escuro padrão sem seguir o sistema, casca com comando,
  teclas de função e fita, gráficos responsivos, `componentes.js` e `terminal.js`. Nasceu da variante
  02-terminal do quantia-ui-lab.
- v1.3.1 (2026-10-20) e anteriores: ver o GUIA.md do v1.3.1.
