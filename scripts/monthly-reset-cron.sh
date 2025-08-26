#!/bin/bash

# Monthly Minutes Reset Cron Job
# Runs daily and resets minutes for companies whose billing date has arrived
# Add to crontab: 0 6 * * * /path/to/scripts/monthly-reset-cron.sh

# Configuration
API_BASE_URL="https://your-domain.com"  # Replace with your actual domain
API_KEY="reset_monthly_minutes_2024_secure_key_ka_analyzer"
LOG_FILE="/var/log/ka-analyzer-monthly-reset.log"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to call API with error handling
call_api() {
    local endpoint="$1"
    local method="$2"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X "$method" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        "$API_BASE_URL/api/billing/reset-monthly-minutes$endpoint")
    
    # Extract status code and body
    http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$http_status" -eq 200 ]; then
        echo "$body"
        return 0
    else
        log "ERROR: API call failed with status $http_status"
        log "Response: $body"
        return 1
    fi
}

log "Starting monthly minutes reset check..."

# First, check status
log "Checking current billing status..."
status_response=$(call_api "" "GET")

if [ $? -ne 0 ]; then
    log "CRITICAL: Failed to check billing status. Exiting."
    exit 1
fi

# Parse response to check if any resets are needed
subscriptions_needing_reset=$(echo "$status_response" | jq -r '.subscriptionsNeedingReset // 0')
total_subscriptions=$(echo "$status_response" | jq -r '.totalActiveSubscriptions // 0')

log "Found $total_subscriptions active subscriptions, $subscriptions_needing_reset need reset"

if [ "$subscriptions_needing_reset" -gt 0 ]; then
    log "Performing monthly reset for $subscriptions_needing_reset subscription(s)..."
    
    # Perform the reset
    reset_response=$(call_api "" "POST")
    
    if [ $? -eq 0 ]; then
        companies_reset=$(echo "$reset_response" | jq -r '.companiesReset // 0')
        log "SUCCESS: Reset completed for $companies_reset companies"
        
        # Log details if available
        details=$(echo "$reset_response" | jq -r '.details[]? | "\(.company_name): \(.old_minutes) -> \(.new_minutes) minutes (next: \(.next_billing_date))"')
        if [ -n "$details" ]; then
            log "Reset details:"
            echo "$details" | while read -r line; do
                log "  - $line"
            done
        fi
    else
        log "CRITICAL: Monthly reset failed!"
        exit 1
    fi
else
    log "No subscriptions need reset at this time"
    
    # Log next reset date
    next_reset=$(echo "$status_response" | jq -r '.nextResetDue // "Unknown"')
    log "Next reset due: $next_reset"
fi

log "Monthly reset check completed successfully"