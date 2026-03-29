#!/usr/bin/env python3
"""Minimal static file server for IronPlan."""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", 8080))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        pass  # quiet

if __name__ == "__main__":
    os.chdir(ROOT)
    httpd = HTTPServer(("", PORT), Handler)
    print(f"IronPlan running at http://localhost:{PORT}", flush=True)
    httpd.serve_forever()
