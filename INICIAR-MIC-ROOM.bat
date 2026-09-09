@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo No encontre Node.js instalado en Windows.
  echo.
  echo Instala Node.js LTS y luego vuelve a hacer doble clic en este archivo:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$cfg = Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.IPv4Address -ne $null } ^| Select-Object -First 1; if($cfg){ $cfg.IPv4Address.IPAddress }"`) do set "LAN_IP=%%I"
if not defined LAN_IP set "LAN_IP=localhost"

set "HOST=0.0.0.0"
set "PORT=3000"
set "LOCAL_URL=http://localhost:%PORT%"
set "PHONE_URL=http://%LAN_IP%:%PORT%"

echo ============================================================
echo Mic Room se va a iniciar ahora.
echo.
echo En este PC abre:      %LOCAL_URL%
echo En tu telefono abre:  %PHONE_URL%
echo.
echo Si Windows pregunta por el firewall, pulsa PERMITIR.
echo Si tu telefono no entra, revisa que ambos esten en la misma Wi-Fi.
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Clipboard '%PHONE_URL%'" >nul 2>nul
start "" "%LOCAL_URL%"

node server.js

endlocal
