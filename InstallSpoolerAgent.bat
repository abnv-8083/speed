@echo off
title Install SpeedNet Spooler Agent as Windows Startup Task
color 0B

echo ================================================
echo   SpeedNet Spooler Agent - Auto-Start Installer
echo ================================================
echo.
echo This will register the spooler agent to start
echo automatically every time Windows starts.
echo.
echo NOTE: Run this as Administrator!
echo.
pause

:: Get the full path to this project folder
set "PROJECT_DIR=%~dp0"
:: Remove trailing backslash
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

:: Find node.exe path
for /f "delims=" %%i in ('where node') do set "NODE_PATH=%%i"

if "%NODE_PATH%"=="" (
    echo ERROR: Node.js not found. Install Node.js first.
    pause
    exit /b 1
)

echo Found Node.js at: %NODE_PATH%
echo Project folder  : %PROJECT_DIR%
echo.

:: Create the scheduled task
schtasks /create /tn "SpeedNet Spooler Agent" ^
  /tr "\"%NODE_PATH%\" \"%PROJECT_DIR%\backend\printSpoolerAgent.js\"" ^
  /sc onlogon ^
  /rl highest ^
  /f

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! The agent will now start automatically on login.
    echo.
    echo To start it right now without rebooting, run:
    echo   schtasks /run /tn "SpeedNet Spooler Agent"
    echo.
    echo To stop it:
    echo   schtasks /end /tn "SpeedNet Spooler Agent"
    echo.
    echo To uninstall:
    echo   schtasks /delete /tn "SpeedNet Spooler Agent" /f
) else (
    echo.
    echo FAILED. Make sure you ran this as Administrator.
)

echo.
pause
