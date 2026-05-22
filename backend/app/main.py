from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from app.services.game_logic import game_manager
from starlette.responses import JSONResponse
import json

app = FastAPI(title="职场发疯生存模拟器 API", version="1.0.0")

# 自定义 JSONResponse 确保 UTF-8 编码
class UTF8JSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(content, ensure_ascii=False, allow_nan=False).encode("utf-8")

# 设置默认响应编码
@app.middleware("http")
async def set_encoding_header(request, call_next):
    response = await call_next(request)
    if isinstance(response, JSONResponse):
        response.headers["Content-Type"] = "application/json; charset=utf-8"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost", "http://127.0.0.1"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type"],
)


class ActionRequest(BaseModel):
    player_input: str


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/start", response_class=UTF8JSONResponse)
async def start_game():
    return await game_manager.reset_game()


@app.post("/api/action", response_class=UTF8JSONResponse)
async def submit_action(request: ActionRequest):
    try:
        return await game_manager.play_turn(request.player_input)
    except Exception as e:
        import traceback
        print(f"❌ API 异常：{traceback.format_exc()}")
        raise


# 静态文件挂载放在最后（API路由优先匹配）
import os
# 从 app/main.py 向上三级目录到项目根目录，然后找到 frontend
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")