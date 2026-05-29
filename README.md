直接双击 start.bat 文件即可启动所有服务
如果不能直接一键启动，需要先确保安装了Python环境，然后在终端打开项目文件，执行一下命令:cd backend && python -m uvicorn app.main:app --reload --port 8000