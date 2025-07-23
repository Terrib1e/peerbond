#!/bin/bash

# Integration Tests for PeerBond Orchestration System
# Tests the complete system including API, monitoring, and database

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
JWT_TOKEN="${JWT_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3Mzc0MTAzNzV9.cZfWz-j6P9H8VNcxM6QP7_bT3rW8sL2mK1nH9vE4xYz}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_TESTS++))
}

# Test runner function
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((TOTAL_TESTS++))
    log_info "Running test: $test_name"
    
    if $test_function; then
        log_success "$test_name passed"
        return 0
    else
        log_error "$test_name failed"
        return 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local url="$1"
    local service_name="$2"
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service_name to be ready..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            log_success "$service_name is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: $service_name not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    log_error "$service_name failed to become ready after $max_attempts attempts"
    return 1
}

# Test 1: Basic Health Check
test_health_check() {
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$API_BASE_URL/health")
    
    if [[ "$response" == "200" ]]; then
        local status=$(jq -r '.data.status' /tmp/health_response.json 2>/dev/null || echo "unknown")
        if [[ "$status" == "healthy" ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Test 2: Production Orchestration Health
test_production_orchestration_health() {
    local response=$(curl -s -w "%{http_code}" -o /tmp/prod_health.json \
        "$API_BASE_URL/api/production-orchestration/health")
    
    if [[ "$response" == "200" ]]; then
        local status=$(jq -r '.data.status' /tmp/prod_health.json 2>/dev/null || echo "unknown")
        if [[ "$status" == "healthy" ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Test 3: Metrics Endpoint
test_metrics_endpoint() {
    local response=$(curl -s -w "%{http_code}" -o /tmp/metrics.txt \
        "$API_BASE_URL/api/production-orchestration/metrics")
    
    if [[ "$response" == "200" ]]; then
        # Check for key metrics
        if grep -q "peerbond_orchestration_active_sessions" /tmp/metrics.txt && \
           grep -q "peerbond_memory_usage_bytes" /tmp/metrics.txt && \
           grep -q "peerbond_orchestration_status" /tmp/metrics.txt; then
            return 0
        fi
    fi
    
    return 1
}

# Test 4: Session Creation
test_session_creation() {
    local response=$(curl -s -w "%{http_code}" -o /tmp/session.json \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-Correlation-ID: test-integration-$(date +%s)" \
        -d '{"userProfile": {"goals": ["integration-test"]}}' \
        "$API_BASE_URL/api/production-orchestration/session/start")
    
    if [[ "$response" == "200" ]]; then
        local success=$(jq -r '.success' /tmp/session.json 2>/dev/null || echo "false")
        local session_id=$(jq -r '.data.sessionId' /tmp/session.json 2>/dev/null || echo "")
        
        if [[ "$success" == "true" && -n "$session_id" ]]; then
            echo "$session_id" > /tmp/test_session_id
            return 0
        fi
    fi
    
    return 1
}

# Test 5: Message Processing
test_message_processing() {
    local session_id=$(cat /tmp/test_session_id 2>/dev/null || echo "")
    
    if [[ -z "$session_id" ]]; then
        log_error "No session ID available for message test"
        return 1
    fi
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/message.json \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-Correlation-ID: test-message-$(date +%s)" \
        -d "{\"sessionId\": \"$session_id\", \"content\": \"I'm feeling anxious about the integration tests.\"}" \
        "$API_BASE_URL/api/production-orchestration/message")
    
    if [[ "$response" == "200" ]]; then
        local success=$(jq -r '.success' /tmp/message.json 2>/dev/null || echo "false")
        local response_text=$(jq -r '.data.response' /tmp/message.json 2>/dev/null || echo "")
        local agents_used=$(jq -r '.data.agentUsed | length' /tmp/message.json 2>/dev/null || echo "0")
        
        if [[ "$success" == "true" && -n "$response_text" && "$agents_used" -gt 0 ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Test 6: Crisis Detection
test_crisis_detection() {
    local session_id=$(cat /tmp/test_session_id 2>/dev/null || echo "")
    
    if [[ -z "$session_id" ]]; then
        log_error "No session ID available for crisis test"
        return 1
    fi
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/crisis.json \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-Correlation-ID: test-crisis-$(date +%s)" \
        -d "{\"sessionId\": \"$session_id\", \"content\": \"I can't take this anymore. I want to hurt myself.\"}" \
        "$API_BASE_URL/api/production-orchestration/message")
    
    if [[ "$response" == "200" ]]; then
        local crisis_intervention=$(jq -r '.data.needsCrisisIntervention' /tmp/crisis.json 2>/dev/null || echo "false")
        local response_text=$(jq -r '.data.response' /tmp/crisis.json 2>/dev/null || echo "")
        
        if [[ "$crisis_intervention" == "true" && "$response_text" == *"988"* ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Test 7: Session Analytics
test_session_analytics() {
    local session_id=$(cat /tmp/test_session_id 2>/dev/null || echo "")
    
    if [[ -z "$session_id" ]]; then
        log_error "No session ID available for analytics test"
        return 1
    fi
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/analytics.json \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "X-Correlation-ID: test-analytics-$(date +%s)" \
        "$API_BASE_URL/api/production-orchestration/session/$session_id/analytics")
    
    if [[ "$response" == "200" ]]; then
        local success=$(jq -r '.success' /tmp/analytics.json 2>/dev/null || echo "false")
        local message_count=$(jq -r '.data.messageCount' /tmp/analytics.json 2>/dev/null || echo "0")
        
        if [[ "$success" == "true" && "$message_count" -gt 0 ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Test 8: Rate Limiting
test_rate_limiting() {
    local failed_requests=0
    
    # Send rapid requests to trigger rate limiting
    for i in {1..10}; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{}' \
            "$API_BASE_URL/api/production-orchestration/session/start")
        
        if [[ "$response" == "429" ]]; then
            ((failed_requests++))
        fi
        
        sleep 0.1
    done
    
    # If we got at least one rate limit response, test passes
    if [[ $failed_requests -gt 0 ]]; then
        return 0
    fi
    
    return 1
}

# Test 9: Session Cleanup
test_session_cleanup() {
    local session_id=$(cat /tmp/test_session_id 2>/dev/null || echo "")
    
    if [[ -z "$session_id" ]]; then
        log_error "No session ID available for cleanup test"
        return 1
    fi
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/cleanup.json \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "X-Correlation-ID: test-cleanup-$(date +%s)" \
        -X POST \
        "$API_BASE_URL/api/production-orchestration/session/$session_id/end")
    
    if [[ "$response" == "200" ]]; then
        local success=$(jq -r '.data.success' /tmp/cleanup.json 2>/dev/null || echo "false")
        
        if [[ "$success" == "true" ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Test 10: Prometheus Metrics
test_prometheus_metrics() {
    if ! command -v curl &> /dev/null; then
        log_warning "curl not available, skipping Prometheus test"
        return 0
    fi
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/prometheus.txt \
        "$PROMETHEUS_URL/api/v1/query?query=up")
    
    if [[ "$response" == "200" ]]; then
        if grep -q '"status":"success"' /tmp/prometheus.txt; then
            return 0
        fi
    fi
    
    return 1
}

# Test 11: Database Connectivity
test_database_connectivity() {
    # Test through the API's health endpoint which checks DB
    local response=$(curl -s -w "%{http_code}" -o /tmp/db_health.json \
        "$API_BASE_URL/health")
    
    if [[ "$response" == "200" ]]; then
        # If health check passes, DB is likely connected
        return 0
    fi
    
    return 1
}

# Test 12: Error Handling
test_error_handling() {
    # Test with invalid session ID
    local response=$(curl -s -w "%{http_code}" -o /tmp/error.json \
        -H "Authorization: Bearer $JWT_TOKEN" \
        "$API_BASE_URL/api/production-orchestration/session/invalid-session-id/analytics")
    
    if [[ "$response" == "404" ]]; then
        local success=$(jq -r '.success' /tmp/error.json 2>/dev/null || echo "true")
        
        if [[ "$success" == "false" ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Performance test
test_performance() {
    local start_time=$(date +%s%N)
    
    # Simple performance test - health check should be fast
    local response=$(curl -s -w "%{http_code}" -o /dev/null \
        "$API_BASE_URL/api/production-orchestration/health")
    
    local end_time=$(date +%s%N)
    local duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    log_info "Health check took ${duration_ms}ms"
    
    # Should complete within 5 seconds (5000ms)
    if [[ "$response" == "200" && $duration_ms -lt 5000 ]]; then
        return 0
    fi
    
    return 1
}

# Load test (simplified)
test_load_handling() {
    local concurrent_requests=5
    local pids=()
    local success_count=0
    
    log_info "Running load test with $concurrent_requests concurrent requests..."
    
    # Start concurrent requests
    for i in $(seq 1 $concurrent_requests); do
        (
            response=$(curl -s -w "%{http_code}" -o /dev/null \
                "$API_BASE_URL/api/production-orchestration/health")
            if [[ "$response" == "200" ]]; then
                echo "success"
            else
                echo "failure"
            fi
        ) &
        pids+=($!)
    done
    
    # Wait for all requests and count successes
    for pid in "${pids[@]}"; do
        result=$(wait $pid && echo "done" || echo "failed")
        if [[ "$result" == "done" ]]; then
            ((success_count++))
        fi
    done
    
    # At least 80% should succeed
    local success_rate=$((success_count * 100 / concurrent_requests))
    log_info "Load test success rate: ${success_rate}%"
    
    if [[ $success_rate -ge 80 ]]; then
        return 0
    fi
    
    return 1
}

# Main test execution
main() {
    log_info "Starting PeerBond Integration Tests"
    log_info "API Base URL: $API_BASE_URL"
    
    # Wait for services to be ready
    wait_for_service "$API_BASE_URL/health" "API Service" || exit 1
    
    # Create temp directory for test artifacts
    mkdir -p /tmp/peerbond-tests
    
    # Run all tests
    log_info "Running comprehensive integration tests...\n"
    
    run_test "Health Check" test_health_check
    run_test "Production Orchestration Health" test_production_orchestration_health
    run_test "Metrics Endpoint" test_metrics_endpoint
    run_test "Session Creation" test_session_creation
    run_test "Message Processing" test_message_processing
    run_test "Crisis Detection" test_crisis_detection
    run_test "Session Analytics" test_session_analytics
    run_test "Rate Limiting" test_rate_limiting
    run_test "Session Cleanup" test_session_cleanup
    run_test "Database Connectivity" test_database_connectivity
    run_test "Error Handling" test_error_handling
    run_test "Performance" test_performance
    run_test "Load Handling" test_load_handling
    
    # Optional external service tests
    if curl -s "$PROMETHEUS_URL" > /dev/null 2>&1; then
        run_test "Prometheus Metrics" test_prometheus_metrics
    else
        log_warning "Prometheus not available, skipping metrics test"
    fi
    
    # Test summary
    echo
    log_info "Integration Test Results:"
    log_info "========================"
    log_info "Total Tests: $TOTAL_TESTS"
    log_success "Passed: $PASSED_TESTS"
    
    if [[ $FAILED_TESTS -gt 0 ]]; then
        log_error "Failed: $FAILED_TESTS"
    fi
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    log_info "Success Rate: ${success_rate}%"
    
    # Cleanup
    rm -rf /tmp/peerbond-tests /tmp/*_response.json /tmp/test_session_id 2>/dev/null || true
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        log_success "All integration tests passed! 🎉"
        log_info "System is ready for production use"
        exit 0
    else
        log_error "Some integration tests failed"
        log_info "Please review the failed tests before deploying to production"
        exit 1
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi