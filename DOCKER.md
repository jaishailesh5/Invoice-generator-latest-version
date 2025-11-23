# Docker Deployment Guide for Invoice Generator

This guide explains how to deploy the Invoice Generator application using Docker Desktop on your local machine.

## Prerequisites

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine
2. Basic knowledge of Docker commands

## Quick Start

### Option 1: Using the helper script

1. Make the script executable:
   \`\`\`bash
   chmod +x docker-dev.sh
   \`\`\`

2. Build the Docker image:
   \`\`\`bash
   ./docker-dev.sh build
   \`\`\`

3. Start the application:
   \`\`\`bash
   ./docker-dev.sh up
   \`\`\`

4. Access the application at [http://localhost:3000](http://localhost:3000)

5. To stop the application:
   \`\`\`bash
   ./docker-dev.sh down
   \`\`\`

### Option 2: Using Docker Compose directly

1. Build the Docker image:
   \`\`\`bash
   docker-compose build
   \`\`\`

2. Start the application:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

3. Access the application at [http://localhost:3000](http://localhost:3000)

4. To stop the application:
   \`\`\`bash
   docker-compose down
   \`\`\`

## Data Persistence

The application uses a Docker volume named `invoice-data` to persist data between container restarts. This ensures that your invoices, employee records, and other data are not lost when the container is restarted.

## Troubleshooting

If you encounter any issues:

1. Check the logs:
   \`\`\`bash
   ./docker-dev.sh logs
   \`\`\`
   or
   \`\`\`bash
   docker-compose logs -f
   \`\`\`

2. Restart the application:
   \`\`\`bash
   ./docker-dev.sh restart
   \`\`\`
   or
   \`\`\`bash
   docker-compose restart
   \`\`\`

3. If the application still doesn't work, try rebuilding the image:
   \`\`\`bash
   docker-compose build --no-cache
   docker-compose up -d
   \`\`\`

## Environment Variables

To customize the application, you can add environment variables in the `docker-compose.yml` file under the `environment` section.
