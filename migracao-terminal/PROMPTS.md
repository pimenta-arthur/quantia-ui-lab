# Prompts da migração para o terminal (sessão no quant-energia-app)

Roteiro para fazer a migração em outra máquina, numa sessão do Claude Code aberta no **quant-energia-app**, em passos
pequenos, cada um terminando numa parada para você validar. Uma funcionalidade só começa depois que a anterior foi
aprovada.

## Antes de começar (na máquina nova)
```bash
cd ~/projects                      # a mesma pasta onde está o quant-energia-app
git clone https://github.com/pimenta-arthur/quantia-ui-lab.git
cd quant-energia-app && git pull   # app atualizado
claude                             # abrir a sessão aqui, no app
```
O laboratório fica ao lado do app (`../quantia-ui-lab`), só para leitura. Se ele já existir, `git pull` nele.

**Decisão já tomada:** a migração segue a **variante 07** (as mesmas páginas do app, no padrão terminal v2.0).
A **variante 08** (o app numa tela só, com telas numeradas e inspetor) fica como próxima evolução, depois da 07
estabilizada, com roteiro próprio em [PROMPTS-08.md](PROMPTS-08.md). Nos prompts daqui, a 08 entra só como
referência visual, nunca como estrutura.

**Como validar cada parada:** com a chave de versão (passo 2) dá para abrir a mesma página em v1 e em v2 e comparar.
- Os números da página são os mesmos nas duas versões.
- As interações funcionam (abas, filtros, formulários, contas).
- Os tooltips aparecem.
- A página foi conferida no escuro, no claro e no celular.
- `uv run pytest` passa.

Se algo não bate, peça a correção ali mesmo, antes de seguir.

**Ritmo sugerido:** uma conversa por bloco (0–4, depois uma por funcionalidade). Ao abrir cada conversa nova, cole
primeiro o prompt de abertura (0) e depois o do passo.

---

## 0 · Abertura (colar no começo de toda conversa)
```
Vamos migrar o visual do quant-energia-app para o padrão terminal v2.0. A referência está em ../quantia-ui-lab,
que é só para leitura: nunca edite nada lá. Leia primeiro ../quantia-ui-lab/migracao-terminal/README.md,
../quantia-ui-lab/migracao-terminal/padrao/GUIA.md e ../quantia-ui-lab/migracao-terminal/quant-energia-app/LEIA-ME.md.

Regras desta migração:
- Trabalhe na branch migracao-terminal (crie se não existir). Nada de commit sem eu pedir.
- Faça só o passo que eu pedir e PARE no fim, com a lista do que mudou e do que eu devo conferir. Não comece o próximo.
- Não mude método, contas, dados nem textos de metodologia; só o visual e a estrutura das páginas. Contas que
  rodam no navegador (relato_conta.js, simulador_conta.js, descolamento_conta.js, compra_venda_conta.js) não mudam,
  e os testes de paridade têm de continuar passando.
- Cada página tem de abrir nas duas versões do padrão (v1.3.1 e v2.0) pela chave de versão, até o fim da migração.
- Antes de dizer que terminou: uv run pytest, e conferir a página no navegador em escuro, claro e celular.
- Os dados fictícios do laboratório nunca entram no app: só a estrutura, o visual e as peças (padrao/).
Responda em português do Brasil.
```

---

## 1 · Inventário e plano (só leitura)
```
Passo 1, só leitura, sem editar nada.
1. Compare o que o laboratório já levantou com o app de hoje: as páginas recriadas em
   ../quantia-ui-lab/variantes/07-terminal-app/ e os arquivos revisados em
   ../quantia-ui-lab/migracao-terminal/quant-energia-app/ (base: commit 80634e0). Liste o que mudou no app desde
   80634e0 que afete a migração (git log 80634e0..HEAD -- web/ docs/ CLAUDE.md README.md tests/ features/*/src/*/exportacao.py).
2. Proponha como escolher entre v1.3.1 e v2.0 por variável de ambiente (ex.: QE_PADRAO=v1|v2) no servidor
   (qe servir / api), sem duplicar as páginas.
3. Confirme a ordem das funcionalidades e, para cada página, quais painéis da 07 e quais códigos de
   ../quantia-ui-lab/migracao-terminal/exemplos/ (ex.: BAND-1) servem de referência.
PARE e me mostre o plano.
```

## 2 · Chave de versão
```
Passo 2: implemente a chave de versão do padrão (o que aprovamos no passo 1), com v1 como padrão. Ainda sem trazer o
v2.0. Mostre como abrir uma página em v1 e em v2 (local), e confirme que com a chave desligada nada muda
(uv run pytest). PARE.
```

## 3 · Padrão v2.0 e documentação
```
Passo 3:
- Traga ../quantia-ui-lab/migracao-terminal/padrao/ para o lugar do v2.0 atrás da chave (o v1.3.1 continua).
- Aplique as mudanças de documentação de ../quantia-ui-lab/migracao-terminal/quant-energia-app/ em CLAUDE.md,
  README.md, docs/nova_funcionalidade.md e docs/nova_pesquisa.md. Use o MUDANCAS.diff de lá; se o arquivo mudou
  desde a base, reaplique à mão.
- Ponha o trecho de tema do padrao/modelo.html no <head> de cada página (antes dos estilos). Não mude a estrutura
  das páginas ainda.
- Com a chave em v2, abra cada página e me liste o que quebrou: estilos presos a 1080 px ou a prefers-color-scheme,
  gráficos com viewBox fixo. Só corrija o que for do padrão; o resto vira lista para os passos das funcionalidades.
PARE.
```

## 4 · Casca do terminal, página inicial e exportação
```
Passo 4:
- Ponha a casca do terminal (padrao/modelo.html: .t-topo, .t-fn, .t-sub, .t-fita, .t-status) nas páginas, atrás da
  chave, sem mexer no conteúdo delas.
- Na .t-fn, use as rotas reais com INI, BAND, RISK, NEN, HYD (mesma ordem em todas as páginas). Na .t-sub, use as
  páginas de cada funcionalidade com os nomes do menu de hoje.
- Troque web/index.html, tests/test_pagina_inicial.py, a exportação do Forecast e o teste dela pelas versões de
  ../quantia-ui-lab/migracao-terminal/quant-energia-app/.
- Fita: proponha, com os dados publicados que já existem, de 4 a 8 itens (PLD do dia, bandeira de M+1, spreads,
  ENA de M+1…). Me mostre antes de ligar.
- Teste as teclas 1–5, "/", "T" e o comando. Rode qe forecast_bandeiras exportar numa pasta temporária e confira
  que o site abre.
PARE.
```

---

## 5 · Uma funcionalidade por vez
Ordem sugerida: **BAND → RISK → NEN → HYD**. A BAND vem primeiro porque é a mais usada e porque testa também a
exportação. Dentro de cada funcionalidade, **uma página por vez**: cole o prompt da funcionalidade e, a cada
parada, valide antes de dizer "pode seguir para a próxima página".

### 5.1 · BAND · Forecast Bandeiras
```
Passo 5.1, Forecast Bandeiras (web/forecast_bandeiras/), uma página por vez, nesta ordem, parando depois de cada uma:
  a) index.html (Projeções)  b) relato.html (Relato do DECOMP)  c) metodologia.html
Para cada página:
- Referência de layout: ../quantia-ui-lab/variantes/07-terminal-app/forecast_bandeiras/<mesma página>, e a peça
  BAND-1/BAND-2 de ../quantia-ui-lab/migracao-terminal/exemplos/bandeiras.html.
- Cada seção (h2) vira painéis na .grade de 12 colunas; os números da decisão em cartões no topo; gráficos com
  grafico(); cores de bandeira só para bandeira; tooltips em todo valor.
- Mesmos títulos, seções, abas, filtros, colunas e textos de hoje. O relato continua com relato_conta.js, sem
  mudança, e o teste Python × JS tem de passar.
- Depois da página: uv run pytest; qe forecast_bandeiras exportar numa pasta temporária (o site tem de abrir).
- Me diga o que conferir: os mesmos números que em v1 (cole 3 deles para eu bater), as interações e os tooltips.
PARE depois de cada página.
```

### 5.2 · RISK · Risk Lab DESSEM
```
Passo 5.2, Risk Lab DESSEM (web/risk_lab_dessem/), uma página por vez, parando depois de cada uma:
  a) index.html (Acompanhamento)  b) simulador.html  c) metodologia.html (e metodologia-v1.html só no visual)
Para cada página:
- Referência de layout: ../quantia-ui-lab/variantes/07-terminal-app/risk_lab_dessem/<mesma página>.
- O pagina.css de hoje vira tokens no esquema do v2.0 (escuro em :root, claro em [data-theme="light"], sem
  prefers-color-scheme); as cores de bandeira usadas fora de bandeira ganham tokens próprios.
- Os filtros de submercado por bloco (D084) e os rótulos obrigatórios do simulador continuam como estão. A conta
  é simulador_conta.js, sem mudança; o teste de paridade tem de passar.
- Blocos recolhidos continuam recolhidos (painel que abre e fecha), e o gráfico desenha ao abrir.
- uv run pytest. Me diga o que conferir: um dia do PLD médio, o resumo para a mesa do simulador com o mesmo DECOMP
  em v1 e em v2, e um tooltip de cada gráfico.
PARE depois de cada página.
```

### 5.3 · NEN · Pricing Descolamento
```
Passo 5.3, Pricing Descolamento (web/pricing_descolamento/), uma página por vez, parando depois de cada uma:
  a) compra_venda.html  b) index.html (Descolamento NE e N)  c) fundamentos.html
  d) metodologia.html e compra_venda_metodologia.html (com as abas-link entre elas)
Para cada página:
- Referência de layout: ../quantia-ui-lab/variantes/07-terminal-app/pricing_descolamento/<mesma página>.
- A curva do SE digitada, a política, "Fechar o ano", "Mostrar justo", "Conferir o ano" e "Só com perda"
  continuam iguais. As contas (descolamento_conta.js, compra_venda_conta.js) não mudam; os testes de paridade e a
  referência R16 têm de passar. O swap continua oculto.
- uv run pytest. Me diga o que conferir: com a mesma curva (ex.: SE R$ 220 em todos os anos), a compra e venda do NE
  e do N de dez/26 e de 2027 em v1 e em v2, e o descritivo de um produto.
PARE depois de cada página.
```

### 5.4 · HYD · Hydro Inflow Similarity
```
Passo 5.4, Hydro Inflow Similarity (web/hydro_inflow_similarity/), uma página por vez, parando depois de cada uma:
  a) index.html (Afluências e ENSO)  b) clima.html (Indicadores climáticos)  c) fundamentos.html  d) metodologia.html
Para cada página:
- Referência de layout: ../quantia-ui-lab/variantes/07-terminal-app/hydro_inflow_similarity/<mesma página>.
- Subsistemas com os tokens --sm-se, --sm-s, --sm-ne, --sm-n do padrão; abas e filtros iguais aos de hoje
  (inclusive o hash da URL na página de clima).
- uv run pytest. Me diga o que conferir: a ENA de M+1 de cada subsistema e os anos similares em v1 e em v2, e o
  gráfico de um índice climático.
PARE depois de cada página.
```

---

## 6 · Virar o padrão
```
Passo 6: com todas as funcionalidades aprovadas,
1. ponha a chave em v2 como padrão (v1 ainda disponível) e me diga o que conferir em staging;
2. depois de eu aprovar o uso pela mesa, remova o v1.3.1 e a chave, atualize o CHANGELOG.md (entrada do padrão
   v2.0) e confira que nada mais aponta para o v1;
3. me liste o que fazer nos repositórios *-page e *-analytics: cada um recebe a pasta padrao/ v2.0, e o
   forecast-bandeiras-page é regerado pela exportação.
PARE em cada um dos três itens.
```

## Pedido pontual (a qualquer momento, depois do passo 4)
```
Na página <NOME>, troque <o que existe hoje> pela visualização <CÓDIGO> de
../quantia-ui-lab/migracao-terminal/exemplos/<arquivo>.html#<CÓDIGO>, com os dados reais no formato do CONTRATO
DE DADOS. Só essa peça; o resto da página fica como está. PARE e me mostre.
```
