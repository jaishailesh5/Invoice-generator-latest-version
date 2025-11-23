#!/bin/bash

# Make this script executable with: chmod +x docker-dev.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Invoice Generator Docker Development Script${NC}"
echo "----------------------------------------"

case "$1" in
  build)
    echo -e "${GREEN}Building Docker image...${NC}"
    docker-compose build
    ;;
  up)
    echo -e "${GREEN}Starting containers in detached mode...${NC}"
    docker-compose up -d
    echo -e "${GREEN}Application is running at http://localhost:3000${NC}"
    ;;
  down)
    echo -e "${GREEN}Stopping containers...${NC}"
    docker-compose down
    ;;
  logs)
    echo -e "${GREEN}Showing logs...${NC}"
    docker-compose logs -f
    ;;
  restart)
    echo -e "${GREEN}Restarting containers...${NC}"
    docker-compose restart
    ;;
  *)
    echo "Usage: $0 {build|up|down|logs|restart}"
    echo "  build   - Build the Docker image"
    echo "  up      - Start the application"
    echo "  down    - Stop the application"
    echo "  logs    - Show application logs"
    echo "  restart - Restart the application"
    exit 1
esac

exit 0
