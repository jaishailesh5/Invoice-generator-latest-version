@echo off
echo Checking Docker setup for Invoice Generator...

REM Check if Docker is running
echo Checking if Docker is running...
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed.
    echo Please start Docker Desktop and try again.
    goto :end
)
echo Docker is running.

REM Get the full path to the current directory
set CURRENT_DIR=%~dp0
echo Current directory: %CURRENT_DIR%

REM Check if docker-compose.yml exists
if not exist "%CURRENT_DIR%docker-compose.yml" (
    echo ERROR: docker-compose.yml not found in %CURRENT_DIR%
    echo Please make sure the file exists and try again.
    goto :end
) else (
    echo Found docker-compose.yml at: %CURRENT_DIR%docker-compose.yml
    echo Content of docker-compose.yml:
    type "%CURRENT_DIR%docker-compose.yml"
)

REM Check if data directory exists
if not exist "%CURRENT_DIR%data" (
    echo WARNING: Data directory does not exist at %CURRENT_DIR%data
) else (
    echo Data directory exists at: %CURRENT_DIR%data
)

REM Check Docker Compose version
echo Checking Docker Compose version...
docker-compose --version

REM List running containers
echo Listing running containers...
docker ps

echo Docker setup check complete.

:end
pause
