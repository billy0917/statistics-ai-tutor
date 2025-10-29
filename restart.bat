@echo off
echo Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting server...
start cmd /k "cd /d %~dp0 && npm start"

echo Server restarting...
timeout /t 2 /nobreak >nul
