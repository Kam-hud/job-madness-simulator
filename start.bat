@echo off
cd /d "%~dp0"

python --version >nul 2>&1
if errorlevel 1 (
    echo Please install Python first: https://www.python.org/downloads/
    pause
    exit
)

cd backend
pip install -r requirements.txt
start cmd /k "python -m uvicorn app.main:app --reload --port 8000"

timeout /t 5 /nobreak >nul

cd ..\frontend
start cmd /k "python -m http.server 8080"

timeout /t 3 /nobreak >nul

start http://localhost:8080