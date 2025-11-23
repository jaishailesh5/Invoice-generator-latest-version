@echo off
echo Starting Invoice Generator Docker container manually...

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

REM Stop and remove any existing container
echo Stopping any existing container...
docker stop invoice-app 2>nul
docker rm invoice-app 2>nul

REM Build the Docker image
echo Building Docker image...
docker build -t invoice-generator-image .

REM Run the container
echo Starting container...
docker run -d --name invoice-app -p 3001:3000 -e NODE_ENV=production -e DB_PATH=/app/data -v "%CURRENT_DIR%data:/app/data" invoice-generator-image

echo Docker container started!
echo Please visit http://localhost:3001/db-init to initialize the database.

pause
