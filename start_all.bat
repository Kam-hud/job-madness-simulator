@echo off
echo 🎮 Job Madness Simulator - 一键启动脚本
echo.
echo 正在启动后端服务...
start cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo 正在启动前端服务...
start cmd /k "cd frontend && python -m http.server 8080"

echo.
echo ✅ 服务已启动！
echo 📡 后端地址: http://localhost:8000
echo 🌐 前端地址: http://localhost:8080
echo.
echo 按任意键退出...
pause >nul