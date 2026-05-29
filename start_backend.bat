@echo off
echo 🚀 正在启动后端服务...
cd backend
python -m uvicorn app.main:app --reload --port 8000
pause