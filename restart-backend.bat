@echo off
echo 🔄 Restarting backend server...

REM Kill any existing Node.js processes
taskkill /f /im node.exe 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start the server
cd backend
npm start

echo ✅ Backend server restarted!
pause
