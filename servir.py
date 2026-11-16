"""Servidor local do laboratório: python3 servir.py [porta] (padrão 8787).

Igual ao `python3 -m http.server`, com duas diferenças: não deixa o navegador guardar cache (cada recarga
mostra a versão atual dos arquivos) e aceita uma fila maior de conexões. A fila padrão do Python é 5, e
cada variante pede 7 arquivos de uma vez; no macOS as conexões a mais eram recusadas e a página abria
sem os scripts.
"""
import functools
import http.server
import pathlib
import sys


class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Servidor(http.server.ThreadingHTTPServer):
    request_queue_size = 128


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    raiz = pathlib.Path(__file__).resolve().parent
    print(f"Quantia UI Lab em http://127.0.0.1:{porta}/  (Ctrl+C para parar)")
    Servidor(("127.0.0.1", porta), functools.partial(SemCache, directory=str(raiz))).serve_forever()
