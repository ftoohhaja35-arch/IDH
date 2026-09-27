@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not defined INITIAL_ADMIN_USERNAME set "INITIAL_ADMIN_USERNAME=ENGFTO7"
if not defined INITIAL_ADMIN_PASSWORD set "INITIAL_ADMIN_PASSWORD=MyStrongPassword123"

set "LOCAL_NODE=%~dp0tools\node-v18.20.8-win-x64\node.exe"
set "LOCAL_NPM=%~dp0tools\node-v18.20.8-win-x64\npm.cmd"
if exist "%LOCAL_NODE%" set "PATH=%~dp0tools\node-v18.20.8-win-x64;%PATH%"
set "NODE_EXE="
set "NPM_CMD="

if exist "%LOCAL_NODE%" (
    set "NODE_EXE=%LOCAL_NODE%"
    if exist "%LOCAL_NPM%" set "NPM_CMD=%LOCAL_NPM%"
)

if not defined NODE_EXE for %%I in (node.exe) do set "NODE_EXE=%%~$PATH:I"
if not defined NPM_CMD if exist "%~dp0tools\node-v18.20.8-win-x64\npm.cmd" set "NPM_CMD=%~dp0tools\node-v18.20.8-win-x64\npm.cmd"
if not defined NPM_CMD (
    where npm >nul 2>nul
    if not errorlevel 1 for /f "delims=" %%I in ('where npm 2^>nul') do set "NPM_CMD=%%I"
)
if not defined NPM_CMD goto :npm_missing
if not defined NODE_EXE goto :node_missing

"%NODE_EXE%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)"
if errorlevel 1 goto :node_version

if not exist "node_modules" (
    echo Installing project dependencies...
    call "%NPM_CMD%" install --no-fund --no-audit
    if errorlevel 1 goto :start_failed
)

if not exist "node_modules\express-rate-limit" (
    echo Updating project dependencies...
    call "%NPM_CMD%" install --no-fund --no-audit
    if errorlevel 1 goto :start_failed
)

echo Starting IDH Charity Control at http://localhost:3000
echo Login username: ENGFTO7
echo Login password: MyStrongPassword123
call "%NPM_CMD%" start
if errorlevel 1 goto :start_failed
exit /b 0

:node_missing
echo Node.js 18 or newer is required. Install it from https://nodejs.org/ and run start.bat again.
pause
exit /b 1

:npm_missing
echo npm was not found. Reinstall Node.js 18 or newer from https://nodejs.org/ and run start.bat again.
pause
exit /b 1

:node_version
echo Node.js 18 or newer is required. Update Node.js, then run start.bat again.
pause
exit /b 1

:start_failed
echo The server could not start. Review the error above.
pause
exit /b 1
