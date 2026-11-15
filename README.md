# quantia-ui-lab

Laboratório isolado para testar variações de front-end (layout e visual) das páginas do Quantia Energia App.
Só HTML, CSS e JS estáticos, com dados fictícios: não depende de, nem altera, `quant-energia-app` nem os
repositórios `*-page` e `*-analytics`.

## Estrutura
- `padrao/`: **cópia congelada** do padrão visual Quant Energia (v1.3.1). Referência; não editar.
- `variantes/00-padrao/`: o catálogo atual, como ponto de comparação.
- `variantes/_modelo/`: molde para uma variante nova (`tema.css` carrega depois do padrão e sobrescreve tokens e layout).
- `index.html`: galeria que lista as variantes.

## Nova variante
```
cp -r variantes/_modelo variantes/NN-nome
```
Depois registrar em `index.html` (lista `variantes`) e editar `tema.css` e o HTML da pasta.

## Ver
Abrir `index.html` no navegador, ou `python3 -m http.server 8000` na raiz.

## Levar uma variante aprovada para o app
Feito à mão no `quant-energia-app`, fora deste repositório: aqui nada é sincronizado.
