"""Arranque para Railway: un solo socket que acepta IPv4 e IPv6.

La red privada de Railway llega por IPv6 y el healthcheck por IPv4; `uvicorn --host ::`
solo escucha IPv6, así que el healthcheck nunca respondía."""
import os
import socket

import uvicorn

sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
sock.bind(("::", int(os.environ.get("PORT", "8000"))))

uvicorn.Server(uvicorn.Config("app.main:app")).run(sockets=[sock])
