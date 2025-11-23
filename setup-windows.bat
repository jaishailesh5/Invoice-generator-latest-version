@echo off
echo Setting up Docker environment for Invoice Generator...

echo Creating data directory...
if not exist data mkdir data

echo Setting permissions...
icacls "data" /grant Everyone:(OI)(CI)F

echo Stopping any existing containers...
docker-compose -f "%~dp0docker-compose.yml" down

echo Building and starting containers...
docker-compose -f "%~dp0docker-compose.yml" build
docker-compose -f "%~dp0docker-compose.yml" up -d

echo Setup complete!
echo Please visit http://localhost:3001/db-migration to initialize the database.
pause
