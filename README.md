# quantia-ui-lab

Laboratório isolado para testar variações de front-end (layout e visual) das páginas do Quantia Energia App.
Só HTML, CSS e JS estáticos, com dados fictícios: não depende de, nem altera, `quant-energia-app` nem os
repositórios `*-page` e `*-analytics`.

## Estrutura
- `padrao/`: **cópia congelada** do padrão visual Quant Energia (v1.3.1). Referência; não editar.
- `variantes/00-padrao/`: o catálogo atual, como ponto de comparação.
- `variantes/_modelo/`: molde para uma variante nova (`tema.css` carrega depois do padrão e sobrescreve tokens e layout).
- `variantes/_nucleo/`: base navegável comum às variantes 01 em diante (páginas do app com dados fictícios,
  rotas por `#pagina`, gráficos que se ajustam à largura). Cada variante dá só a casca (`index.html` com
  marcadores `data-q`) e o `tema.css`. O tema escuro é o padrão; a escolha do claro fica salva no navegador.
- `migracao-terminal/`: pacote para levar a variante 02 · Terminal ao app: padrão v2.0 limpo (`padrao/`, com
  `GUIA.md`), páginas de exemplo com códigos de referência (`exemplos/`) e os prompts de cada etapa (`README.md`).
- `index.html`: galeria que lista as variantes e o pacote de migração.

## Nova variante
```
cp -r variantes/_modelo variantes/NN-nome
```
Depois registrar em `index.html` (lista `variantes`) e editar `tema.css` e o HTML da pasta.

## Ver
`python3 servir.py` na raiz e abrir http://127.0.0.1:8787/. O `servir.py` é o `http.server` do Python sem cache
e com fila de conexões maior (com a fila padrão, as variantes às vezes abriam sem os scripts).

## Levar uma variante aprovada para o app
Feito à mão no `quant-energia-app`, fora deste repositório: aqui nada é sincronizado.
