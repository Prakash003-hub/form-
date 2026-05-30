@echo off
echo ==========================================
echo Starting Subi TNService Application Stack
echo ==========================================

:: Start Express Backend on network host 0.0.0.0
start "Subi Backend (Express)" cmd /c "npm run start --prefix backend"

:: Wait 2 seconds robustly in Windows batch
ping 127.0.0.1 -n 3 >nul

:: Start React Frontend exposed on network host
start "Subi Frontend (Vite)" cmd /c "npm run dev -- --host"

echo Application launched! 
echo Express API: http://localhost:8000
echo React UI: http://localhost:5173
echo ==========================================
