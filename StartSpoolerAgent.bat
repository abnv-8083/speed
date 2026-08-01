@echo off
title SpeedNet Print Spooler Agent
color 0A

echo ================================================
echo   SpeedNet Print Spooler Bridge Agent
echo ================================================
echo.

cd /d "%~dp0"

:: Check if API_URL is still set to localhost
findstr /C:"API_URL=http://localhost" .env >nul 2>&1
if %errorlevel% equ 0 (
    color 0E
    echo  WARNING: API_URL in .env is still set to localhost:5000
    echo.
    echo  If your backend is deployed on Render/Railway/etc.,
    echo  open .env and change API_URL to your backend URL.
    echo  Example:
    echo    API_URL=https://your-app.onrender.com
    echo.
    echo  If you are running the backend locally, ignore this.
    echo.
    pause
    color 0A
)

echo Starting agent... Keep this window open.
echo Close this window to stop monitoring prints.
echo.

node backend/printSpoolerAgent.js

echo.
echo Agent stopped. Press any key to exit.
pause >nul
