# Migração para o padrão v2.0 (terminal)

Pacote para levar o visual da variante **02 · Terminal** ao Quant Energia App (e depois aos repositórios
`*-page`). Tudo aqui é estático e com dados fictícios. Este laboratório não altera o app: a migração é feita
numa sessão aberta no repositório do app, que lê este pacote como referência.

Repositório: https://github.com/pimenta-arthur/quantia-ui-lab · local: `/Users/arthur/projects/quantia-ui-lab`

## O que tem aqui
| Pasta | Para quê |
|---|---|
| `padrao/` | **o padrão v2.0 limpo**, para copiar no lugar do `padrao/` v1.3.1 do app. Sem dados, sem maquete. Regras em `padrao/GUIA.md`. |
| `exemplos/` | **referências**, uma página por página do app, com cada visualização marcada por um código (`BAND-2`, `PLD-3`…). Servem para pegar peças pontuais, não para substituir páginas inteiras. Índice em `exemplos/index.html`. |
| `quant-energia-app/` | **os arquivos do app que ensinam ou exigem o layout**, já revisados para o terminal (CLAUDE.md, README, guias de nova funcionalidade e de nova pesquisa, página inicial, exportação do site estático e os testes), com os originais e o diff. Ver `quant-energia-app/LEIA-ME.md`. |

Cada página de exemplo traz no topo um bloco **CONTRATO DE DADOS** dizendo o formato que cada visualização
espera; no app, é só trocar os dados fictícios pelos reais nesse formato.

## Ver
Na raiz do laboratório: `python3 servir.py` e abrir
- http://127.0.0.1:8787/migracao-terminal/exemplos/ (catálogo com os códigos)
- http://127.0.0.1:8787/migracao-terminal/padrao/modelo.html (página em branco)

## Etapas
| # | Etapa | Risco | Onde |
|---|---|---|---|
| 0 | Padrão v2.0 e exemplos prontos | — | aqui (feito) |
| 1 | Inventário do app e plano por página, só leitura | nenhum | app |
| 2 | Branch e chave para escolher v1.3.1 ou v2.0 sem deploy de código (variável de ambiente do container) | baixo | app |
| 3 | Trocar a pasta `padrao/` (tokens, tema escuro, tela cheia); páginas antigas já saem no visual novo. Aplicar junto o CLAUDE.md, o README e os guias de `quant-energia-app/` | baixo | app |
| 4 | Casca do terminal num layout comum: comando, teclas de função com as rotas reais, fita, status. Aplicar a página inicial, a exportação e os testes de `quant-energia-app/` | médio | app |
| 5 | Página por página: grade de painéis e visualizações pontuais dos exemplos | médio | app |
| 6 | Staging com a mesa por 1–2 semanas, ajustes, virar padrão; depois os `*-page` | — | app |

Use **um prompt por etapa**, numa sessão do Claude Code aberta no repositório do app, começando em modo de
planejamento (`/plan`). Em cada etapa, a sessão deve conferir no navegador (escuro, claro e celular) antes de
dizer que terminou.

## Prompts

### Etapa 1 · inventário e plano (só leitura)
```
Vou migrar este app para o padrão visual Quant Energia v2.0 (terminal). O pacote pronto está em
/Users/arthur/projects/quantia-ui-lab/migracao-terminal (também em
https://github.com/pimenta-arthur/quantia-ui-lab). Leia migracao-terminal/README.md e padrao/GUIA.md.
Use o pacote só como referência: não edite nada no quantia-ui-lab e não traga os dados fictícios.

Nesta etapa, só leitura, nada de editar:
1. Liste páginas e rotas do app e como o padrão v1.3.1 (pasta padrao/) entra em cada uma (templates,
   includes, estáticos).
2. Aponte: o max-width de 1080 px, a lógica de tema e qualquer prefers-color-scheme, estilos próprios de
   página que dependem de largura, e os gráficos (graficos.js v1.1 ou outros).
3. Diga como o app é servido no container (build, templates, estáticos) e proponha como escolher entre
   v1.3.1 e v2.0 por variável de ambiente, para voltar atrás sem deploy de código.
4. Proponha o plano por etapas do README do pacote, com risco e ordem das páginas, começando pela mais
   usada na mesa. Para cada página, diga quais visualizações dos exemplos (códigos como BAND-2) se encaixam.
Responda em português do Brasil.
```

### Etapa 2 · chave de versão
```
Execute a etapa 2 do plano: crie a branch e a chave (variável de ambiente do container) que escolhe entre o
padrão v1.3.1 e o v2.0, com v1.3.1 como valor padrão. Ainda sem copiar o v2.0. Mostre como ligar em local e
em staging e confirme que, desligada, nada muda.
```

### Etapa 3 · trocar o padrão
```
Execute a etapa 3: copie /Users/arthur/projects/quantia-ui-lab/migracao-terminal/padrao/ para o lugar do v2.0
atrás da chave, sem mexer no v1.3.1. Adicione no <head> de cada página o trecho de tema do modelo.html (antes
dos estilos). Não mude a estrutura das páginas ainda. Com a chave ligada, abra cada página no navegador em
escuro, claro (botão) e celular e liste o que quebrou (estilos próprios presos a 1080 px ou a
prefers-color-scheme, gráficos com viewBox fixo). Corrija só o que for do padrão; o resto vira lista para a etapa 5.
```

### Etapa 4 · casca do terminal
```
Execute a etapa 4: coloque a casca do terminal (padrao/modelo.html: .t-topo, .t-fn, .t-fita, .t-status) no
layout comum das páginas, atrás da chave. Na barra de funções, use as rotas reais com os códigos VG, PLD,
BAND, NEN, FCST, RISK, METO (ajuste se o app tiver outras páginas) e marque a atual com aria-current. Preencha
a fita com Terminal.fita(itens) usando dados reais que o app já tem (PLD médio por submercado, spreads,
GSF…); se algum não existir, deixe de fora e me diga. Teste teclas 1–9, "/", "T" e o comando.
```

### Etapa 5 · uma página
```
Execute a etapa 5 para a página <NOME>: troque as seções soltas por painéis na .grade (GUIA.md, "Migrar uma
página do v1.3.1") e use grafico() nos gráficos. Aplique as visualizações <CÓDIGOS, ex.: BAND-1 e BAND-2> de
/Users/arthur/projects/quantia-ui-lab/migracao-terminal/exemplos/, seguindo o CONTRATO DE DADOS no topo da
página de exemplo e ligando aos dados reais. Mantenha o que a página já mostra e não está nos exemplos.
Confira escuro, claro, celular e tooltips antes de terminar.
```

### Pedido pontual (a qualquer momento)
```
Na página <NOME>, troque <o que existe hoje> pela visualização <CÓDIGO> de
/Users/arthur/projects/quantia-ui-lab/migracao-terminal/exemplos/<arquivo>.html#<CÓDIGO>, com os dados reais
no formato do CONTRATO DE DADOS. Só essa peça; o resto da página fica como está.
```
