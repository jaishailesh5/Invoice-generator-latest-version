@echo off
setlocal

set BACKUP_DIR=backups
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\invoice-generator-backup-%TIMESTAMP%.db

echo Creating backup directory if it doesn't exist...
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

echo Creating backup of SQLite database...
copy data\invoice-generator.db %BACKUP_FILE%

if %errorlevel% equ 0 (
  echo Backup created successfully: %BACKUP_FILE%
) else (
  echo Failed to create backup!
)

echo.
echo Backup process completed.
pause
