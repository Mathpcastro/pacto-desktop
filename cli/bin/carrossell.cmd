@echo off
rem Carrossell CLI: roda cli\carrossell.mjs com o executavel do app em modo Node.
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\Carrossell.exe" "%~dp0..\app.asar\cli\carrossell.mjs" %*
endlocal & exit /b %errorlevel%
