@echo off
title Account Master - Backend Server
cd /d "%~dp0"
echo.
echo  ==========================================
echo   Account Master Backend Starting...
echo   Port: 5000
echo   URL:  http://localhost:5000
echo  ==========================================
echo.
npm run dev
pause
