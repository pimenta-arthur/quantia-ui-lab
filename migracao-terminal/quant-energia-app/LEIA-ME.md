# Arquivos do quant-energia-app revisados para o padrão terminal

Versões revisadas de todos os arquivos do app que **ensinam ou exigem o layout**. Depois da migração, eles garantem
que a manutenção e as funcionalidades novas sigam o terminal: as instruções para o Claude (`CLAUDE.md`), os guias de
nova funcionalidade e de nova pesquisa, a página inicial, a exportação do site estático e os testes que conferem tudo
isso. Os caminhos espelham os do app.

- **Base:** commit `80634e0` do quant-energia-app (27/10/26). Os originais dessa versão estão em `_originais/`.
- **O que muda:** `MUDANCAS.diff` (diff unificado, original → revisado), arquivo por arquivo.
- Se o app tiver mudado desde a base, não copie os arquivos por cima: reaplique as mudanças do `MUDANCAS.diff`
  (`git apply --3way` na raiz do app, ou à mão) e confira.

## O que substitui o quê
| No app | Aqui | O que muda | Etapa da migração (README do pacote) |
|---|---|---|---|
| `web/padrao/` (v1.3.1) | `../padrao/` (v2.0) | o padrão inteiro; entram `componentes.js` e `terminal.js` | 3 |
| `CLAUDE.md` | `CLAUDE.md` | seção "Padrão visual": v2.0, tela cheia, escuro sem seguir o sistema, casca igual em todas as páginas, barra de funções com códigos e rotas reais, painéis, gráficos e tokens | 3 |
| `README.md` | `README.md` | a descrição de `web/padrao/` | 3 |
| `docs/nova_funcionalidade.md` | `docs/nova_funcionalidade.md` | ligar a funcionalidade nova na barra de funções de todas as páginas; seção 5 (Página) reescrita para o terminal | 3 |
| `docs/nova_pesquisa.md` | `docs/nova_pesquisa.md` | o padrão copiado para a pesquisa é o v2.0; visual do terminal no modelo de CLAUDE.md; seção 8 (Páginas) com o layout do terminal | 3 |
| `web/index.html` | `web/index.html` | página inicial com a casca do terminal: uma linha por funcionalidade (código, nome, descrição, páginas), sem largura máxima e sem `prefers-color-scheme` | 4 |
| `tests/test_pagina_inicial.py` | `tests/test_pagina_inicial.py` | o teste lia a largura máxima da `main` (que deixa de existir): agora usa limite fixo de 60 caracteres, confere a barra de funções contra a lista e exige o padrão terminal | 4 |
| `features/forecast_bandeiras/src/qe_forecast_bandeiras/exportacao.py` | mesmo caminho | o site estático (forecast-bandeiras-page) leva `componentes.js` e `terminal.js`; a marca e o link da própria funcionalidade viram `./`; os links das outras funcionalidades e do Início saem da barra (o site só tem a BAND e a exportação recusa caminhos absolutos) | 4 |
| `tests/test_forecast_bandeiras_exportacao.py` | mesmo caminho | espera os dois arquivos novos do padrão e uma barra só com BAND | 4 |

Conferido aqui, sem tocar no app: o teste novo da página inicial passa contra o `web/index.html` revisado, e a troca da
exportação deixa só BAND na barra, sem caminho absoluto. Os testes do app só rodam lá (`uv run pytest`), na etapa 4.

## O que fica fora deste pacote, e por quê
- **As páginas de cada funcionalidade** (`web/<código>/*.html`, `pagina.css`, `app.js`…): migram uma a uma na etapa 5,
  a partir das referências `../exemplos/` (códigos como BAND-2) e das variantes 07 e 08 do laboratório.
- **Os repositórios `*-page` e `*-analytics`:** têm cópias próprias do `padrao/`. Não foram lidos (a leitura autorizada
  é só a do quant-energia-app). Na etapa 6, cada um recebe a pasta `padrao/` v2.0; o forecast-bandeiras-page é gerado
  pela exportação acima.
- **`CHANGELOG.md`:** ganha uma entrada na própria migração, por exemplo:
  `### Alterado — Padrão visual v2.0 (terminal): tela cheia, escuro padrão, casca com comando, funções e fita; docs e testes atualizados.`

## Manutenção deste pacote
Quando o padrão v2.0 mudar de regra (`../padrao/GUIA.md`), revise aqui o `CLAUDE.md` e os dois guias para dizerem o
mesmo. Para refazer o diff depois de editar um arquivo:
```
cd migracao-terminal/quant-energia-app
for f in $(cd _originais && find . -type f | sed 's#^\./##'); do diff -u --label "a/$f" --label "b/$f" "_originais/$f" "$f"; done > MUDANCAS.diff
```
