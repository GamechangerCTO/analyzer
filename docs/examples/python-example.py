"""
Partner API - Python Example
Complete integration example with polling and webhook handling
"""

import requests
import base64
import time
import json
import hmac
import hashlib
from typing import Optional, Dict, Any

# Configuration
API_KEY = 'pk_live_your_key_here'
API_SECRET = 'sk_your_secret_here'
BASE_URL = 'https://yourdomain.com/api/partner/v1'
WEBHOOK_SECRET = 'your_webhook_secret'

# ============================================================================
# Helper Functions
# ============================================================================

def create_headers(idempotency_key: Optional[str] = None) -> Dict[str, str]:
    """Create headers for API requests"""
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'X-API-Secret': API_SECRET,
        'Content-Type': 'application/json',
    }
    
    if idempotency_key:
        headers['X-Idempotency-Key'] = idempotency_key
    
    return headers

# ============================================================================
# 1. Create Company
# ============================================================================

def create_company() -> str:
    """Create a new company and return its ID"""
    print('Creating company...')
    
    response = requests.post(
        f'{BASE_URL}/companies/create',
        json={
            'name': 'Example Company',
            'industry': 'retail',
            'contact_email': 'admin@example.com',
            'questionnaire_data': {
                'company_size': '50-100',
                'main_goal': 'improve_sales'
            }
        },
        headers=create_headers()
    )
    
    response.raise_for_status()
    data = response.json()
    
    print(f"Company created: {data}")
    return data['company_id']

# ============================================================================
# 2. Create Agent
# ============================================================================

def create_agent(company_id: str) -> str:
    """Create a new agent and return its ID"""
    print('Creating agent...')
    
    response = requests.post(
        f'{BASE_URL}/companies/{company_id}/agents/create',
        json={
            'email': f'agent{int(time.time())}@example.com',
            'name': 'John Doe',
            'role': 'agent',
            'phone': '+1-555-0123'
        },
        headers=create_headers()
    )
    
    response.raise_for_status()
    data = response.json()
    
    print(f"Agent created: {data}")
    print(f"⚠️ Temporary Password: {data['temporary_password']}")
    
    return data['agent_id']

# ============================================================================
# 3. Analyze Call
# ============================================================================

def analyze_call(
    company_id: str,
    agent_id: str,
    audio_file_path: str,
    webhook_url: Optional[str] = None
) -> str:
    """Submit a call for analysis and return the job ID"""
    print('Reading audio file...')
    
    with open(audio_file_path, 'rb') as f:
        audio_data = f.read()
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
    
    print('Submitting call for analysis...')
    
    response = requests.post(
        f'{BASE_URL}/calls/analyze',
        json={
            'audio_file': audio_base64,
            'company_id': company_id,
            'agent_id': agent_id,
            'call_type': 'sales_call',
            'analysis_type': 'full',
            'webhook_url': webhook_url,
            'metadata': {
                'call_reference': f'REF-{int(time.time())}',
                'source': 'python_example'
            }
        },
        headers=create_headers(f'call-{int(time.time())}')
    )
    
    response.raise_for_status()
    data = response.json()
    
    print(f"Analysis job created: {data}")
    return data['job_id']

# ============================================================================
# 4. Poll for Results
# ============================================================================

def poll_for_results(job_id: str, max_attempts: int = 60) -> Dict[str, Any]:
    """Poll for job completion and return results"""
    print('Polling for results...')
    
    for attempt in range(1, max_attempts + 1):
        response = requests.get(
            f'{BASE_URL}/jobs/{job_id}/status',
            headers=create_headers()
        )
        
        response.raise_for_status()
        data = response.json()
        
        status = data['status']
        progress = data.get('progress', 0)
        
        print(f"Attempt {attempt}: Status={status}, Progress={progress}%")
        
        if status == 'completed':
            print('✅ Analysis completed!')
            print(f"Results: {json.dumps(data.get('results'), indent=2)}")
            return data
        
        if status == 'failed':
            error = data.get('error_message', 'Unknown error')
            print(f"❌ Analysis failed: {error}")
            raise Exception(error)
        
        # Wait 3 seconds before next attempt
        time.sleep(3)
    
    raise Exception('Timeout: Analysis did not complete in time')

# ============================================================================
# 5. Webhook Handler (Flask)
# ============================================================================

def verify_webhook_signature(payload: dict, signature: str) -> bool:
    """Verify webhook signature"""
    payload_string = json.dumps(payload, separators=(',', ':'))
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

def setup_webhook_handler(app):
    """Setup Flask webhook handler"""
    from flask import request, jsonify
    
    @app.route('/webhook/analysis', methods=['POST'])
    def webhook_handler():
        try:
            signature = request.headers.get('X-Partner-Signature')
            payload = request.json
            
            # Verify signature
            if not verify_webhook_signature(payload, signature):
                print('Invalid webhook signature')
                return jsonify({'error': 'Invalid signature'}), 401
            
            print(f"Webhook received: {payload}")
            
            if payload['status'] == 'completed':
                print('✅ Analysis completed via webhook!')
                print(f"Call ID: {payload['call_id']}")
                print(f"Results: {payload['results']}")
                
                # Process the results...
                # e.g., save to database, send notification, etc.
            elif payload['status'] == 'failed':
                print(f"❌ Analysis failed: {payload['error_message']}")
            
            # Return 200 quickly to avoid retries
            return jsonify({'status': 'ok'}), 200
            
        except Exception as e:
            print(f"Webhook error: {e}")
            return jsonify({'error': 'Internal error'}), 500

# ============================================================================
# Main Flow
# ============================================================================

def main():
    """Main execution flow"""
    try:
        # 1. Create company
        company_id = create_company()
        print()
        
        # 2. Create agent
        agent_id = create_agent(company_id)
        print()
        
        # 3. Analyze call (replace with your audio file path)
        audio_file_path = './sample-call.mp3'
        job_id = analyze_call(company_id, agent_id, audio_file_path)
        print()
        
        # 4. Poll for results
        results = poll_for_results(job_id)
        print()
        
        print('=== Completed Successfully ===')
        print(f"Company ID: {company_id}")
        print(f"Agent ID: {agent_id}")
        print(f"Call ID: {results['call_id']}")
        print(f"Overall Score: {results.get('results', {}).get('overall_score')}")
        
    except Exception as e:
        print(f"Main flow error: {e}")
        exit(1)

if __name__ == '__main__':
    main()

