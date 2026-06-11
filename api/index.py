import sys
import os

# 把 backend 加入 path，确保能 import app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# Vercel 的 Python runtime 需要的 ASGI handler
handler = app
