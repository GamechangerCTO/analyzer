#!/bin/bash
# Partner API - cURL Examples
# Quick reference for all API endpoints

# Configuration - UPDATE THESE VALUES
API_KEY="pk_sandbox_your_key_here"
API_SECRET="sk_your_secret_here"
BASE_URL="http://localhost:3000/api/partner/v1"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# 1. Health Check
# ============================================================================

echo -e "${BLUE}=== Health Check ===${NC}"
curl -X GET "$BASE_URL/health" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET"
echo -e "\n"

# ============================================================================
# 2. Create Company
# ============================================================================

echo -e "${BLUE}=== Create Company ===${NC}"
COMPANY_RESPONSE=$(curl -s -X POST "$BASE_URL/companies/create" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "industry": "retail",
    "contact_email": "admin@testcompany.com",
    "questionnaire_data": {
      "company_size": "50-100",
      "main_goal": "improve_sales"
    }
  }')

echo $COMPANY_RESPONSE | jq '.'
COMPANY_ID=$(echo $COMPANY_RESPONSE | jq -r '.company_id')
echo -e "${GREEN}Company ID: $COMPANY_ID${NC}\n"

# ============================================================================
# 2b. List All Companies (Discovery)
# ============================================================================

echo -e "${BLUE}=== List All Companies (Discovery) ===${NC}"
echo -e "${YELLOW}📍 This helps discover existing company IDs${NC}"
COMPANIES_LIST=$(curl -s -X GET "$BASE_URL/companies?limit=10&offset=0" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET")

echo $COMPANIES_LIST | jq '.'
TOTAL_COMPANIES=$(echo $COMPANIES_LIST | jq -r '.total')
echo -e "${GREEN}Total companies available: $TOTAL_COMPANIES${NC}\n"

# If we didn't create a company above, use the first one from the list
if [ -z "$COMPANY_ID" ] || [ "$COMPANY_ID" = "null" ]; then
  COMPANY_ID=$(echo $COMPANIES_LIST | jq -r '.companies[0].id')
  echo -e "${YELLOW}Using first company from list: $COMPANY_ID${NC}\n"
fi

# ============================================================================
# 3. Get Company Details
# ============================================================================

echo -e "${BLUE}=== Get Company ===${NC}"
curl -s -X GET "$BASE_URL/companies/$COMPANY_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET" | jq '.'
echo -e "\n"

# ============================================================================
# 4. Update Company Questionnaire
# ============================================================================

echo -e "${BLUE}=== Update Questionnaire ===${NC}"
curl -s -X PUT "$BASE_URL/companies/$COMPANY_ID/questionnaire" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "questionnaire_data": {
      "company_size": "100-200",
      "main_goal": "improve_customer_service",
      "call_volume": "500_per_day"
    }
  }' | jq '.'
echo -e "\n"

# ============================================================================
# 5. Create Agent
# ============================================================================

echo -e "${BLUE}=== Create Agent ===${NC}"
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/companies/$COMPANY_ID/agents/create" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent'$(date +%s)'@testcompany.com",
    "name": "John Doe",
    "role": "agent",
    "phone": "+1-555-0123"
  }')

echo $AGENT_RESPONSE | jq '.'
AGENT_ID=$(echo $AGENT_RESPONSE | jq -r '.agent_id')
TEMP_PASSWORD=$(echo $AGENT_RESPONSE | jq -r '.temporary_password')
echo -e "${GREEN}Agent ID: $AGENT_ID${NC}"
echo -e "${RED}⚠️  Temporary Password: $TEMP_PASSWORD${NC}\n"

# ============================================================================
# 6. List Agents
# ============================================================================

echo -e "${BLUE}=== List Agents ===${NC}"
curl -s -X GET "$BASE_URL/companies/$COMPANY_ID/agents" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET" | jq '.'
echo -e "\n"

# ============================================================================
# 7. Analyze Call (with Base64 audio)
# ============================================================================

echo -e "${BLUE}=== Analyze Call ===${NC}"
# For real usage, replace this with actual base64 encoded audio
AUDIO_BASE64="UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA="

JOB_RESPONSE=$(curl -s -X POST "$BASE_URL/calls/analyze" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-API-Secret: $API_SECRET" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: call-$(date +%s)" \
  -d '{
    "audio_file": "'$AUDIO_BASE64'",
    "company_id": "'$COMPANY_ID'",
    "agent_id": "'$AGENT_ID'",
    "call_type": "sales_call",
    "analysis_type": "full",
    "webhook_url": "https://webhook.site/your-unique-url",
    "metadata": {
      "call_reference": "REF-12345",
      "source": "curl_example"
    }
  }')

echo $JOB_RESPONSE | jq '.'
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.job_id')
echo -e "${GREEN}Job ID: $JOB_ID${NC}\n"

# ============================================================================
# 8. Poll Job Status
# ============================================================================

echo -e "${BLUE}=== Poll Job Status ===${NC}"
MAX_ATTEMPTS=20
for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "Attempt $i..."
  
  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/jobs/$JOB_ID/status" \
    -H "Authorization: Bearer $API_KEY" \
    -H "X-API-Secret: $API_SECRET")
  
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
  PROGRESS=$(echo $STATUS_RESPONSE | jq -r '.progress')
  
  echo "Status: $STATUS, Progress: $PROGRESS%"
  
  if [ "$STATUS" = "completed" ]; then
    echo -e "${GREEN}✅ Analysis completed!${NC}"
    echo $STATUS_RESPONSE | jq '.results'
    break
  fi
  
  if [ "$STATUS" = "failed" ]; then
    echo -e "${RED}❌ Analysis failed${NC}"
    echo $STATUS_RESPONSE | jq '.error_message'
    break
  fi
  
  sleep 3
done

# ============================================================================
# Summary
# ============================================================================

echo -e "\n${BLUE}=== Summary ===${NC}"
echo -e "Company ID: ${GREEN}$COMPANY_ID${NC}"
echo -e "Agent ID: ${GREEN}$AGENT_ID${NC}"
echo -e "Job ID: ${GREEN}$JOB_ID${NC}"
echo -e "\n${GREEN}✓ All examples completed!${NC}"

# ============================================================================
# Additional Examples
# ============================================================================

# Analyze call from file
# AUDIO_BASE64=$(base64 -i ./sample-call.mp3)
# Then use in the analyze call request above

# Analyze call from URL
# curl -X POST "$BASE_URL/calls/analyze" \
#   -H "Authorization: Bearer $API_KEY" \
#   -H "X-API-Secret: $API_SECRET" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "audio_file": "https://example.com/sample-call.mp3",
#     "company_id": "'$COMPANY_ID'",
#     "agent_id": "'$AGENT_ID'",
#     "call_type": "sales_call"
#   }'

