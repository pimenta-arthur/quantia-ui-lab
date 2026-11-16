# Prompts da evolução 07 → 08 (a mesa em uma tela)

Para usar **depois** da migração do `PROMPTS.md`, quando o app já estiver no padrão terminal v2.0, página por página,
como a variante 07, e esse padrão estiver aprovado pela mesa. Aqui o app vira a **variante 08**: um aplicativo de uma
tela, com as funções (BAND, RISK, NEN, HYD), telas numeradas, linha de decisão, inspetor, tela MESA com sinais e
alertas, e comandos e teclas. Referência: `../quantia-ui-lab/variantes/08-mesa-terminal/` (README.md, mesa.js com a
API no topo, mesa.css, funcoes/<cod>.js).

Mesmo método da migração anterior: uma conversa por bloco, um passo por vez, parada para validar no fim de cada
passo, e uma função de cada vez.

## O que é diferente desta vez
- **Estrutura, não só visual.** As páginas viram telas de um aplicativo só (`#BAND-2`). Cada função vira um módulo
  (`Mesa.registrar`) com telas, sinal, resumo e alertas.
- **Dados sob demanda.** No laboratório, os dados fictícios das quatro funções carregam juntos. No app, cada função
  busca os seus dados (`/dados/<código>/…`) só quando é aberta pela primeira vez; a MESA busca só o necessário para
  os sinais e os resumos.
- **Endereços antigos continuam valendo.** `/forecast_bandeiras/relato.html` e os demais redirecionam para a tela
  equivalente; favoritos e links da mesa não podem quebrar.
- **Duas versões lado a lado** até o fim, por uma chave (ex.: `QE_LAYOUT=paginas|mesa`). Assim dá para comparar a
  mesma informação na página da 07 e na tela da 08.
- **Os números não mudam.** Contas, métodos e textos de metodologia são os mesmos; a 08 só reorganiza. As contas no
  navegador continuam sendo as mesmas (`*_conta.js`), com os testes de paridade passando.

**Como validar cada parada:**
- Abra a página (07) e a tela correspondente (08) lado a lado: os mesmos números.
- O inspetor abre ao clicar num mês, produto, dia ou ano; o "?" leva à seção certa da metodologia.
- As teclas funcionam: 0–4 para as funções, ← → para as telas, ⇧1–9 direto numa tela, Esc, I, ? e T.
- A tela foi conferida no escuro, no claro e no celular, e `uv run pytest` passa.

---

## 0 · Abertura (colar no começo de toda conversa)
```
Vamos evoluir o quant-energia-app do padrão terminal por páginas (variante 07) para a mesa em uma tela (variante 08).
Referência só para leitura, nunca editar: ../quantia-ui-lab/variantes/08-mesa-terminal/ (README.md, mesa.js com a
API no topo, mesa.css, funcoes/*.js) e ../quantia-ui-lab/migracao-terminal/PROMPTS-08.md.

Regras:
- Branch mesa-terminal. Nada de commit sem eu pedir.
- Só o passo que eu pedir; PARE no fim com o que mudou e o que eu devo conferir.
- Não mude método, contas, dados nem textos de metodologia. Os *_conta.js não mudam e os testes de paridade passam.
- As duas versões (páginas e mesa) convivem por uma chave até o fim; as páginas continuam funcionando.
- Os dados fictícios do laboratório nunca entram no app: os módulos da 08 leem os dados reais (/dados/<código>/…).
- Antes de dizer que terminou: uv run pytest e conferir no navegador em escuro, claro e celular.
Responda em português do Brasil.
```

## 1 · Plano (só leitura)
```
Passo 1, só leitura.
1. Leia o README e a API do mesa.js da 08 e os quatro módulos (funcoes/band.js, risk.js, nen.js, hyd.js). Para cada
   módulo, liste de que objeto de dados ele depende (no laboratório: window.DADOS/RELATO_DADOS, RLD, PD, HYD) e de
   qual JSON ou JS do app (/dados/<código>/…) cada parte vem. Aponte diferenças de formato.
2. Proponha onde ficam no app: o núcleo (sugestão: web/padrao/mesa.js e mesa.css, padrão v3.0) e os módulos
   (web/<código>/mesa.js).
3. Proponha a carga sob demanda: o que a MESA precisa logo de saída (sinais, resumos, alertas) e o que cada função
   busca só quando é aberta.
4. Proponha a tabela de redirecionamento das páginas antigas para as telas (#BAND-1 etc.), a chave QE_LAYOUT e o que
   muda na exportação do Forecast (site estático só com a BAND) e nos testes.
PARE e me mostre o plano.
```

## 2 · Núcleo e chave
```
Passo 2:
- Traga o núcleo da 08 (mesa.js, mesa.css) para o lugar aprovado no passo 1, com a carga sob demanda dos módulos e
  dos dados. Crie a página da mesa atrás da chave QE_LAYOUT=mesa, com a MESA vazia (sem funções registradas).
- Teclas e comando funcionando na casca (0–4, ← →, ⇧1–9, Esc, /, I, ?, T).
- Com a chave em "paginas", nada muda (uv run pytest).
PARE e me mostre a casca nas duas chaves.
```

## 3 · Documentação
```
Passo 3: atualize o GUIA.md do padrão (v3.0: a mesa, a API do Mesa, as regras de telas, sinal, resumo, alertas,
inspetor e o "?" ligado à metodologia), o CLAUDE.md (casca e módulo por função), docs/nova_funcionalidade.md (função
nova = módulo com telas, sinal, resumo e alertas, e a tecla/posição na barra) e docs/nova_pesquisa.md (seção 8).
Use o README da 08 como base. PARE e me mostre o diff.
```

---

## 4 · Uma função por vez
Ordem sugerida: **BAND → RISK → NEN → HYD**, a mesma da migração. Dentro de cada função, **uma tela por vez**,
comparando com a página da 07 que tinha a mesma informação.

### 4.1 · BAND
```
Passo 4.1, BAND: porte ../quantia-ui-lab/variantes/08-mesa-terminal/funcoes/band.js (e band.css) para o módulo da
BAND no app, ligado aos dados reais, uma tela por vez, parando depois de cada uma:
  1 MON Monitor · 2 CEN Cenários · 3 HIS Histórico · 4 REL Relato do DECOMP · 5 DES Desempenho · 6 MET Metodologia
- Atenção: o módulo do laboratório já não mostra os cenários seco e úmido (LI/LS), porque o modelo vai deixar de
  tê-los. Se o modelo do app ainda tiver LI/LS, me pergunte antes: mostrar ou não.
- REL usa o relato_conta.js do app, sem mudança.
- Por tela: me diga 3 números para eu bater com a página da 07 (Projeções, Relato ou Metodologia).
- Ao fim das 6 telas: sinal, resumo da MESA e alertas da BAND com dados reais. Me mostre o texto de cada alerta.
PARE depois de cada tela.
```

### 4.2 · RISK
```
Passo 4.2, RISK: porte funcoes/risk.js (e risk.css) da 08 para o módulo do Risk Lab DESSEM no app, ligado aos dados
reais, uma tela por vez, parando depois de cada uma:
  1 MON Monitor · 2 SIM Simulador · 3 PER Perfis · 4 IND Indicadores · 5 DES Desempenho · 6 MET Metodologia
- SIM usa o simulador_conta.js do app, sem mudança. O sinal acompanha o simulador (Mesa.atualizarSinal).
- Mantenha os filtros por bloco (D084) e os rótulos obrigatórios do simulador.
- Por tela: os números para eu bater com o Acompanhamento ou o Simulador da 07 (mesmo DECOMP).
- Ao fim: sinal, resumo, fita e alertas com dados reais; me mostre os alertas.
PARE depois de cada tela.
```

### 4.3 · NEN
```
Passo 4.3, NEN: porte funcoes/nen.js (e nen.css) da 08 para o módulo do Pricing Descolamento no app, ligado aos
dados reais, uma tela por vez, parando depois de cada uma:
  1 COT Cotação · 2 DES Descolamento · 3 FUN Fundamentos e realizado · 4 FIS Física · 5 BT Backtest da cotação ·
  6 MOD Desempenho do modelo · 7 MET Metodologia
- As contas são descolamento_conta.js e compra_venda_conta.js do app, sem mudança. A curva do SE digitada fica salva
  como hoje; sem curva, a tela diz como informar (no app, nada de curva de exemplo fictícia).
- Por tela: com a mesma curva, a compra e venda do NE e do N de dez/26 e de 2027 iguais às da página da 07.
- Ao fim: sinal, resumo, fita e alertas com dados reais.
PARE depois de cada tela.
```

### 4.4 · HYD
```
Passo 4.4, HYD: porte funcoes/hyd.js (e hyd.css) da 08 para o módulo do Hydro Inflow Similarity no app, ligado aos
dados reais, uma tela por vez, parando depois de cada uma:
  1 ENA Afluências · 2 TRJ Trajetória e histórico · 3 CLI Indicadores climáticos · 4 FUN Fundamentos ·
  5 DES Desempenho e rodadas · 6 MET Metodologia
- Os textos de conclusão vêm do app com os números reais (no laboratório eram fictícios e havia um aviso disso: o aviso
  sai).
- Por tela: a ENA de M+1 e os anos similares iguais aos da página da 07.
- Ao fim: sinal, resumo, fita e alertas com dados reais.
PARE depois de cada tela.
```

---

## 5 · MESA, endereços antigos e exportação
```
Passo 5:
1. Tela MESA com as quatro funções: sinais, resumos e alertas de todas, com os dados reais. Me mostre os alertas.
2. Fita montada dos sinais e do fita() de cada função (nenhum valor fixo).
3. Redirecionamento das páginas antigas para as telas, conforme a tabela do passo 1; teste que cada endereço antigo
   chega à tela certa.
4. Exportação do Forecast: site estático com a mesa só com a BAND, com caminhos relativos; ajuste o teste.
PARE depois de cada item.
```

## 6 · Virar o padrão
```
Passo 6:
1. QE_LAYOUT=mesa como padrão (as páginas ainda disponíveis pela chave). Diga o que conferir em staging com a mesa.
2. Depois da minha aprovação: remova as páginas antigas (os redirecionamentos ficam), a chave e o que só servia a
   elas; CHANGELOG.md com a entrada do padrão v3.0 (mesa).
3. Liste o que fazer nos repositórios *-page e *-analytics (as pesquisas continuam com páginas próprias? padrão v2.0
   ou v3.0?). Essa decisão é minha.
PARE em cada item.
```

## Pedido pontual (a qualquer momento, depois do passo 2)
```
Na tela <FUNÇÃO>-<n>, traga o painel <CÓDIGO, ex.: BAND-3> da 08
(../quantia-ui-lab/variantes/08-mesa-terminal/funcoes/<cod>.js) ligado aos dados reais. Só esse painel. PARE e me mostre.
```
