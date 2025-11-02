<?php
/**
 * Partner API - PHP Example
 * Complete integration example with polling
 */

// Configuration
define('API_KEY', 'pk_live_your_key_here');
define('API_SECRET', 'sk_your_secret_here');
define('BASE_URL', 'https://yourdomain.com/api/partner/v1');
define('WEBHOOK_SECRET', 'your_webhook_secret');

// ============================================================================
// Helper Functions
// ============================================================================

function createHeaders($idempotencyKey = null) {
    $headers = [
        'Authorization: Bearer ' . API_KEY,
        'X-API-Secret: ' . API_SECRET,
        'Content-Type: application/json',
    ];
    
    if ($idempotencyKey) {
        $headers[] = 'X-Idempotency-Key: ' . $idempotencyKey;
    }
    
    return $headers;
}

function makeRequest($method, $endpoint, $data = null, $idempotencyKey = null) {
    $ch = curl_init(BASE_URL . $endpoint);
    
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, createHeaders($idempotencyKey));
    
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    if ($httpCode >= 400) {
        throw new Exception("API Error ($httpCode): " . ($result['error']['message'] ?? 'Unknown error'));
    }
    
    return $result;
}

// ============================================================================
// 1. Create Company
// ============================================================================

function createCompany() {
    echo "Creating company...\n";
    
    $result = makeRequest('POST', '/companies/create', [
        'name' => 'Example Company',
        'industry' => 'retail',
        'contact_email' => 'admin@example.com',
        'questionnaire_data' => [
            'company_size' => '50-100',
            'main_goal' => 'improve_sales'
        ]
    ]);
    
    echo "Company created: " . json_encode($result) . "\n";
    return $result['company_id'];
}

// ============================================================================
// 2. Create Agent
// ============================================================================

function createAgent($companyId) {
    echo "Creating agent...\n";
    
    $result = makeRequest('POST', "/companies/$companyId/agents/create", [
        'email' => 'agent' . time() . '@example.com',
        'name' => 'John Doe',
        'role' => 'agent',
        'phone' => '+1-555-0123'
    ]);
    
    echo "Agent created: " . json_encode($result) . "\n";
    echo "⚠️ Temporary Password: " . $result['temporary_password'] . "\n";
    
    return $result['agent_id'];
}

// ============================================================================
// 3. Analyze Call
// ============================================================================

function analyzeCall($companyId, $agentId, $audioFilePath, $webhookUrl = null) {
    echo "Reading audio file...\n";
    
    $audioData = file_get_contents($audioFilePath);
    $audioBase64 = base64_encode($audioData);
    
    echo "Submitting call for analysis...\n";
    
    $result = makeRequest('POST', '/calls/analyze', [
        'audio_file' => $audioBase64,
        'company_id' => $companyId,
        'agent_id' => $agentId,
        'call_type' => 'sales_call',
        'analysis_type' => 'full',
        'webhook_url' => $webhookUrl,
        'metadata' => [
            'call_reference' => 'REF-' . time(),
            'source' => 'php_example'
        ]
    ], 'call-' . time());
    
    echo "Analysis job created: " . json_encode($result) . "\n";
    return $result['job_id'];
}

// ============================================================================
// 4. Poll for Results
// ============================================================================

function pollForResults($jobId, $maxAttempts = 60) {
    echo "Polling for results...\n";
    
    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        $result = makeRequest('GET', "/jobs/$jobId/status");
        
        $status = $result['status'];
        $progress = $result['progress'] ?? 0;
        
        echo "Attempt $attempt: Status=$status, Progress=$progress%\n";
        
        if ($status === 'completed') {
            echo "✅ Analysis completed!\n";
            echo "Results: " . json_encode($result['results']) . "\n";
            return $result;
        }
        
        if ($status === 'failed') {
            $error = $result['error_message'] ?? 'Unknown error';
            echo "❌ Analysis failed: $error\n";
            throw new Exception($error);
        }
        
        // Wait 3 seconds before next attempt
        sleep(3);
    }
    
    throw new Exception('Timeout: Analysis did not complete in time');
}

// ============================================================================
// 5. Webhook Handler
// ============================================================================

function verifyWebhookSignature($payload, $signature) {
    $expectedSignature = hash_hmac('sha256', json_encode($payload), WEBHOOK_SECRET);
    return hash_equals($signature, $expectedSignature);
}

function handleWebhook() {
    $payload = json_decode(file_get_contents('php://input'), true);
    $signature = $_SERVER['HTTP_X_PARTNER_SIGNATURE'] ?? '';
    
    // Verify signature
    if (!verifyWebhookSignature($payload, $signature)) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid signature']);
        return;
    }
    
    echo "Webhook received: " . json_encode($payload) . "\n";
    
    if ($payload['status'] === 'completed') {
        echo "✅ Analysis completed via webhook!\n";
        echo "Call ID: " . $payload['call_id'] . "\n";
        echo "Results: " . json_encode($payload['results']) . "\n";
        
        // Process the results...
    } else if ($payload['status'] === 'failed') {
        echo "❌ Analysis failed: " . $payload['error_message'] . "\n";
    }
    
    // Return 200 quickly to avoid retries
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
}

// ============================================================================
// Main Flow
// ============================================================================

function main() {
    try {
        // 1. Create company
        $companyId = createCompany();
        echo "\n";
        
        // 2. Create agent
        $agentId = createAgent($companyId);
        echo "\n";
        
        // 3. Analyze call (replace with your audio file path)
        $audioFilePath = './sample-call.mp3';
        $jobId = analyzeCall($companyId, $agentId, $audioFilePath);
        echo "\n";
        
        // 4. Poll for results
        $results = pollForResults($jobId);
        echo "\n";
        
        echo "=== Completed Successfully ===\n";
        echo "Company ID: $companyId\n";
        echo "Agent ID: $agentId\n";
        echo "Call ID: " . $results['call_id'] . "\n";
        echo "Overall Score: " . ($results['results']['overall_score'] ?? 'N/A') . "\n";
        
    } catch (Exception $e) {
        echo "Main flow error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

// Run if executed directly
if (php_sapi_name() === 'cli') {
    main();
}
?>

