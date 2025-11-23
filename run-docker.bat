@echo off
echo Starting Invoice Generator Docker setup...

REM Get the full path to the current directory
set CURRENT_DIR=%~dp0
echo Current directory: %CURRENT_DIR%

REM Create data directory if it doesn't exist
if not exist "%CURRENT_DIR%data" (
    echo Creating data directory...
    mkdir "%CURRENT_DIR%data"
    echo Data directory created at: %CURRENT_DIR%data
) else (
    echo Data directory already exists at: %CURRENT_DIR%data
)

REM Set permissions
echo Setting permissions on data directory...
icacls "%CURRENT_DIR%data" /grant Everyone:(OI)(CI)F

REM Check if docker-compose.yml exists
if not exist "%CURRENT_DIR%docker-compose.yml" (
    echo ERROR: docker-compose.yml not found in %CURRENT_DIR%
    echo Please make sure the file exists and try again.
    goto :end
) else (
    echo Found docker-compose.yml at: %CURRENT_DIR%docker-compose.yml
)

REM Stop any running containers
echo Stopping any existing containers...
docker-compose -f "%CURRENT_DIR%docker-compose.yml" down

REM Build and start containers
echo Building and starting containers...
docker-compose -f "%CURRENT_DIR%docker-compose.yml" build
docker-compose -f "%CURRENT_DIR%docker-compose.yml" up -d

echo Docker setup complete!
echo Please visit http://localhost:3001/db-init to initialize the database.

:end
pause
