@echo off
rem Neighborhood spot admin - double-click to start the local admin server and open the browser.
rem Close this window to stop it. Runs only on this computer (this folder is not deployed).
cd /d "%~dp0.."
python tools\admin_server.py
pause
