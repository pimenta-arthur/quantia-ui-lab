"""Página inicial (web/index.html), padrão terminal v2.0.

Cada funcionalidade é uma linha (`section.func`) com código, nome, descrição curta e páginas. A página não tem mais
largura máxima (tela cheia), então o limite da descrição é fixo: ela tem de caber em uma linha na coluna da
esquerda em 1280 px (cerca de 60 caracteres). O detalhe de cada funcionalidade fica no topo da página dela.
A barra de funções (`.t-fn`) tem de listar as mesmas funcionalidades, na mesma ordem, com código de comando.
"""

import re
from pathlib import Path

import pytest

INDEX = Path(__file__).resolve().parents[1] / "web" / "index.html"
LIMITE_DESCRICAO = 60  # caracteres; ver o docstring


def _funcionalidades(html: str) -> list[tuple[str, str, str, str]]:
    """(código, rota, nome, descrição) de cada linha da página."""
    return re.findall(
        r'<span class="cod">([A-Z]+)</span><a href="([^"]+)">([^<]+)</a></h2>\s*<p class="func-desc">([^<]*)</p>', html
    )


def _barra(html: str) -> list[tuple[str, str]]:
    """(código, rota) de cada item da barra de funções, sem o Início."""
    nav = re.search(r'<nav class="t-fn"[^>]*>(.*?)</nav>', html, re.S).group(1)
    return [(c, r) for c, r in re.findall(r'<a data-cod="([A-Z]+)" href="([^"]+)"', nav) if c != "INI"]


@pytest.fixture(scope="module")
def html() -> str:
    return INDEX.read_text(encoding="utf-8")


def test_a_pagina_lista_as_funcionalidades(html):
    nomes = [n for _, _, n, _ in _funcionalidades(html)]
    assert len(nomes) >= 4 and len(set(nomes)) == len(nomes)


def test_barra_de_funcoes_igual_a_lista(html):
    assert [(c, r) for c, r, _, _ in _funcionalidades(html)] == _barra(html)


def test_descricao_cabe_em_uma_linha(html):
    longas = [(n, len(d)) for _, _, n, d in _funcionalidades(html) if len(d) > LIMITE_DESCRICAO]
    assert not longas, f"descrição acima de {LIMITE_DESCRICAO} caracteres; o detalhe vai no topo da página: {longas}"


def test_sem_quebra_de_linha_forcada_nas_descricoes(html):
    for _, _, n, d in _funcionalidades(html):
        assert "<br" not in d.lower() and "\n" not in d, n


def test_usa_o_padrao_terminal(html):
    for arq in ("base.css", "painel.css", "graficos.js", "componentes.js", "terminal.js"):
        assert f"/padrao/{arq}" in html, arq
    assert "prefers-color-scheme" not in html  # o tema não segue o sistema: escuro padrão, claro pelo botão
