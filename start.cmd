@echo off
REM Jalankan server SAHARA (backend + database SQLite) lalu buka browser.
cd /d "%~dp0"
start "" http://localhost:5173/
node backend/index.js
