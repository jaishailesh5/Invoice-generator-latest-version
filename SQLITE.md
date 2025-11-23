# SQLite Integration Guide for Invoice Generator

This guide explains how to use SQLite as the database backend for the Invoice Generator application.

## Overview

The Invoice Generator app can now use SQLite as a database backend instead of localStorage. This provides several benefits:

- **Improved data persistence**: Data is stored in a proper database file
- **Better data integrity**: SQLite enforces data types and constraints
- **More powerful queries**: SQL allows for complex queries and reporting
- **Larger storage capacity**: No browser storage limits
- **Data portability**: The database file can be backed up and moved

## Getting Started

### 1. Initialize the Database

Visit the Database Migration page at `/db-migration` to initialize the SQLite database and migrate your existing data from localStorage.

### 2. Database Structure

The SQLite database includes the following tables:

- `parties`: Stores vendors, clients, and referral companies
- `employees`: Stores employee information
- `employee_referrals`: Stores employee referral relationships
- `monthly_hours`: Stores employee hours worked by month
- `invoices`: Stores invoice information
- `payment_details`: Stores invoice payment details
- `referral_payments`: Stores referral payment information

### 3. Database Location

The SQLite database file is stored in the `data` directory at the root of the application. When running in Docker, this directory is mounted as a volume to ensure data persistence.

## Docker Configuration

The Docker setup has been updated to properly handle the SQLite database:

1. A volume is created for the database file
2. The data directory has proper permissions
3. The database file is persisted between container restarts

## Backup and Restore

### Backup

To backup the SQLite database:

\`\`\`bash
# If running locally
cp data/invoice-generator.db data/invoice-generator.db.backup

# If running in Docker
docker cp invoice-generator-invoice-app-1:/app/data/invoice-generator.db ./invoice-generator.db.backup
\`\`\`

### Restore

To restore from a backup:

\`\`\`bash
# If running locally
cp data/invoice-generator.db.backup data/invoice-generator.db

# If running in Docker
docker cp ./invoice-generator.db.backup invoice-generator-invoice-app-1:/app/data/invoice-generator.db
\`\`\`

## Troubleshooting

### Database Initialization Issues

If you encounter issues initializing the database:

1. Check that the `data` directory exists and has proper permissions
2. Ensure the application has write access to the directory
3. Check the server logs for specific error messages

### Migration Issues

If data migration fails:

1. Check that your localStorage data is valid
2. Ensure all required fields are present in your data
3. Try migrating smaller batches of data if you have a large dataset

### Database Connection Issues

If the application can't connect to the database:

1. Verify the database file exists
2. Check file permissions
3. Ensure the SQLite library is properly installed
