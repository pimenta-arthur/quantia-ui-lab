# Migração para o padrão v2.0 (terminal)

Pacote para levar o visual da variante **02 · Terminal** ao Quant Energia App (e depois aos repositórios
`*-page`). Tudo aqui é estático e com dados fictícios. Este laboratório não altera o app: a migração é feita
numa sessão aberta no repositório do app, que lê este pacote como referência.

Repositório: https://github.com/pimenta-arthur/quantia-ui-lab · na sessão do app, clonado ao lado: `../quantia-ui-lab`

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

Use **um prompt por passo** ([PROMPTS.md](PROMPTS.md)), numa sessão do Claude Code aberta no repositório do app. Em
cada passo, a sessão confere no navegador (escuro, claro e celular) e para, esperando a sua validação.

## Prompts
Os prompts de cada passo, segmentados por funcionalidade e por página, com uma parada para validar ao fim de cada
um, estão em **[PROMPTS.md](PROMPTS.md)**. Eles foram feitos para uma sessão aberta no quant-energia-app de qualquer
máquina, com este laboratório clonado ao lado (`../quantia-ui-lab`).

Depois da migração (app no padrão terminal por páginas, como a 07), a evolução para a mesa em uma tela (a 08) tem o
seu roteiro em **[PROMPTS-08.md](PROMPTS-08.md)**, no mesmo formato: um passo por vez, uma função por vez, uma tela
por vez.
