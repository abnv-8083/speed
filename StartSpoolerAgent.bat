@echo off
title SpeedNet Print Spooler Agent
color 0A

echo ================================================
echo   SpeedNet Print Spooler Bridge Agent
echo ================================================
echo.
echo Starting agent... Keep this window open.
echo Close this window to stop monitoring prints.
echo.

cd /d "%~dp0"
node backend/printSpoolerAgent.js

echo.
echo Agent stopped. Press any key to exit.
pause >nul
