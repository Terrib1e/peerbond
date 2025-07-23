#!/bin/bash

# PeerBond Production Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-peerbond}"
SERVICE_NAME="peerbond-orchestration-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required environment files exist
    if [[ "$ENVIRONMENT" == "production" && ! -f "$PROJECT_DIR/.env.production" ]]; then
        log_error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image for $ENVIRONMENT..."
    
    cd "$PROJECT_DIR"
    
    # Build the image
    docker build \
        -t "$DOCKER_REGISTRY/$SERVICE_NAME:$VERSION" \
        -t "$DOCKER_REGISTRY/$SERVICE_NAME:latest" \
        --target production \
        .
    
    log_success "Docker image built successfully"
}

# Run tests in container
run_tests() {
    log_info "Running tests in container..."
    
    # Build test image
    docker build \
        -t "$DOCKER_REGISTRY/$SERVICE_NAME:test" \
        --target development \
        .
    
    # Run tests
    if docker run --rm \
        -v "$PROJECT_DIR:/app" \
        "$DOCKER_REGISTRY/$SERVICE_NAME:test" \
        npm test; then
        log_success "All tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

# Security scan
security_scan() {
    log_info "Running security scan..."
    
    # Check if Trivy is available for vulnerability scanning
    if command -v trivy &> /dev/null; then
        trivy image --exit-code 1 --severity HIGH,CRITICAL "$DOCKER_REGISTRY/$SERVICE_NAME:$VERSION"
        log_success "Security scan passed"
    else
        log_warning "Trivy not found, skipping security scan"
    fi
}

# Deploy to environment
deploy() {
    log_info "Deploying to $ENVIRONMENT environment..."
    
    cd "$PROJECT_DIR"
    
    # Copy environment file
    if [[ -f ".env.$ENVIRONMENT" ]]; then
        cp ".env.$ENVIRONMENT" .env
        log_info "Environment file copied"
    fi
    
    # Deploy based on environment
    case "$ENVIRONMENT" in
        "production")
            deploy_production
            ;;
        "staging")
            deploy_staging
            ;;
        "development")
            deploy_development
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Production deployment
deploy_production() {
    log_info "Starting production deployment..."
    
    # Backup current database
    log_info "Creating database backup..."
    ./scripts/backup.sh
    
    # Pull latest images
    docker-compose -f docker-compose.production.yml pull
    
    # Deploy with zero-downtime strategy
    log_info "Deploying with rolling update..."
    
    # Start new containers
    docker-compose -f docker-compose.production.yml up -d --remove-orphans
    
    # Wait for health check
    log_info "Waiting for service to be healthy..."
    timeout 120 bash -c '
        while ! curl -f http://localhost:3001/health > /dev/null 2>&1; do
            echo "Waiting for service..."
            sleep 5
        done
    '
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T peerbond-api npm run migrate
    
    # Clean up old images
    docker image prune -f
    
    log_success "Production deployment completed successfully"
}

# Staging deployment
deploy_staging() {
    log_info "Starting staging deployment..."
    
    # Deploy to staging environment
    docker-compose -f docker-compose.staging.yml up -d --build
    
    # Run integration tests
    log_info "Running integration tests..."
    sleep 30  # Wait for services to start
    ./scripts/integration-tests.sh
    
    log_success "Staging deployment completed successfully"
}

# Development deployment
deploy_development() {
    log_info "Starting development deployment..."
    
    docker-compose -f docker-compose.yml up -d --build
    
    log_success "Development deployment completed successfully"
}

# Health check
health_check() {
    log_info "Performing post-deployment health check..."
    
    local max_attempts=12
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    # Get previous image tag
    local previous_tag=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "$DOCKER_REGISTRY/$SERVICE_NAME" | sed -n '2p' | cut -d':' -f2)
    
    if [[ -n "$previous_tag" ]]; then
        log_info "Rolling back to version: $previous_tag"
        
        # Update docker-compose to use previous version
        sed -i.bak "s/:$VERSION/:$previous_tag/g" docker-compose.production.yml
        
        # Redeploy
        docker-compose -f docker-compose.production.yml up -d
        
        log_success "Rollback completed"
    else
        log_error "No previous version found for rollback"
        exit 1
    fi
}

# Monitoring setup
setup_monitoring() {
    log_info "Setting up monitoring stack..."
    
    # Start monitoring services
    docker-compose -f docker-compose.production.yml up -d prometheus grafana jaeger
    
    # Wait for services
    sleep 30
    
    # Import Grafana dashboards
    if command -v curl &> /dev/null; then
        log_info "Importing Grafana dashboards..."
        curl -X POST \
            -H "Content-Type: application/json" \
            -d @monitoring/grafana/dashboards/peerbond-orchestration.json \
            http://admin:${GRAFANA_PASSWORD}@localhost:3000/api/dashboards/db
    fi
    
    log_success "Monitoring stack deployed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up deployment artifacts..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused volumes (be careful in production)
    if [[ "$ENVIRONMENT" != "production" ]]; then
        docker volume prune -f
    fi
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting PeerBond deployment (Environment: $ENVIRONMENT, Version: $VERSION)"
    
    # Set error handling
    trap 'log_error "Deployment failed at line $LINENO"' ERR
    
    # Check prerequisites
    check_prerequisites
    
    # Build and test
    build_image
    
    if [[ "${SKIP_TESTS:-false}" != "true" ]]; then
        run_tests
    fi
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        security_scan
    fi
    
    # Deploy
    deploy
    
    # Health check
    if ! health_check; then
        log_error "Deployment verification failed"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            rollback
        fi
        exit 1
    fi
    
    # Setup monitoring for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        setup_monitoring
    fi
    
    # Cleanup
    cleanup
    
    log_success "Deployment completed successfully! 🎉"
    log_info "API available at: http://localhost:3001"
    log_info "Health check: http://localhost:3001/health"
    log_info "Metrics: http://localhost:9464/metrics"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Grafana dashboard: http://localhost:3000"
        log_info "Prometheus: http://localhost:9090"
        log_info "Jaeger: http://localhost:16686"
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi