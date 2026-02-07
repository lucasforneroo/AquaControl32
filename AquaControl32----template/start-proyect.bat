@echo off
REM Abrir VS Code en la carpeta del proyecto
code "C:\ruta\a\tu\proyecto"

REM Backend
start cmd /k "cd C:\ruta\a\tu\proyecto\backend && npm start"

REM Frontend
start cmd /k "cd C:\ruta\a\tu\proyecto\frontend && npm start"

echo Proyecto iniciado: backend + frontend
pause
