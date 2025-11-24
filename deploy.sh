#!/bin/bash

# AI Task Manager Backend Deployment Script
# This script helps deploy the backend using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${NC}ℹ $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is installed"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found"
        print_info "Creating .env from .env.docker template..."
        cp .env.docker .env
        print_warning "Please edit .env file with your configuration before continuing"
        print_info "Press Enter when ready to continue..."
        read
    else
        print_success ".env file exists"
    fi
}

# Validate required environment variables
validate_env() {
    print_info "Validating environment variables..."
    
    source .env
    
    if [ "$JWT_SECRET" == "your-super-secret-jwt-key-change-in-production" ]; then
        print_error "Please change JWT_SECRET in .env file"
        exit 1
    fi
    
    if [ -z "$CLIENT_URL" ]; then
        print_warning "CLIENT_URL is not set in .env"
    fi
    
    print_success "Environment variables validated"
}

# Create required directories
create_directories() {
    print_info "Creating required directories..."
    mkdir -p uploads logs backups
    print_success "Directories created"
}

# Build Docker images
build_images() {
    print_info "Building Docker images..."
    docker-compose build
    print_success "Docker images built successfully"
}

# Start services
start_services() {
    print_info "Starting services..."
    docker-compose up -d
    print_success "Services started"
}

# Wait for services to be healthy
wait_for_health() {
    print_info "Waiting for services to be healthy..."
    
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep -q "healthy"; then
            print_success "Services are healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "Services did not become healthy in time"
    docker-compose logs
    exit 1
}

# Check service health
check_health() {
    print_info "Checking service health..."
    
    # Check backend
    if curl -s http://localhost:5000/api/health > /dev/null; then
        print_success "Backend is responding"
    else
        print_error "Backend is not responding"
        return 1
    fi
    
    # Check MongoDB
    if docker-compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_success "MongoDB is responding"
    else
        print_error "MongoDB is not responding"
        return 1
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is responding"
    else
        print_error "Redis is not responding"
        return 1
    fi
}

# Show deployment info
show_info() {
    echo ""
    print_success "Deployment completed successfully!"
    echo ""
    print_info "Service URLs:"
    echo "  Backend API: http://localhost:5000"
    echo "  API Docs: http://localhost:5000/api/docs"
    echo "  Health Check: http://localhost:5000/api/health"
    echo ""
    print_info "Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart: docker-compose restart"
    echo "  Shell access: docker-compose exec backend sh"
    echo ""
}

# Main deployment flow
main() {
    echo "=================================="
    echo "AI Task Manager Backend Deployment"
    echo "=================================="
    echo ""
    
    # Pre-flight checks
    check_docker
    check_docker_compose
    check_env_file
    validate_env
    create_directories
    
    # Deployment
    build_images
    start_services
    wait_for_health
    
    # Post-deployment
    sleep 5
    check_health
    show_info
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    stop)
        print_info "Stopping services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    restart)
        print_info "Restarting services..."
   