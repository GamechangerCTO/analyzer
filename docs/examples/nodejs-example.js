/**
 * Partner API - Node.js Example
 * Complete integration example with polling and webhook handling
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

// Configuration
const API_KEY = 'pk_live_your_key_here';
const API_SECRET = 'sk_your_secret_here';
const BASE_URL = 'https://yourdomain.com/api/partner/v1';
const WEBHOOK_SECRET = 'your_webhook_secret';

// ============================================================================
// Helper Functions
// ============================================================================

function createHeaders(idempotencyKey = null) {
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'X-API-Secret': API_SECRET,
    'Content-Type': 'application/json',
  };
  
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }
  
  return headers;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 1. Create Company
// ============================================================================

async function createCompany() {
  try {
    console.log('Creating company...');
    
    const response = await axios.post(
      `${BASE_URL}/companies/create`,
      {
        name: 'Example Company',
        industry: 'retail',
        contact_email: 'admin@example.com',
        questionnaire_data: {
          company_size: '50-100',
          main_goal: 'improve_sales'
        }
      },
      { headers: createHeaders() }
    );
    
    console.log('Company created:', response.data);
    return response.data.company_id;
    
  } catch (error) {
    console.error('Error creating company:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// 2. Create Agent
// ============================================================================

async function createAgent(companyId) {
  try {
    console.log('Creating agent...');
    
    const response = await axios.post(
      `${BASE_URL}/companies/${companyId}/agents/create`,
      {
        email: `agent${Date.now()}@example.com`,
        name: 'John Doe',
        role: 'agent',
        phone: '+1-555-0123'
      },
      { headers: createHeaders() }
    );
    
    console.log('Agent created:', response.data);
    console.log('⚠️ Temporary Password:', response.data.temporary_password);
    
    return response.data.agent_id;
    
  } catch (error) {
    console.error('Error creating agent:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// 3. Analyze Call
// ============================================================================

async function analyzeCall(companyId, agentId, audioFilePath, webhookUrl = null) {
  try {
    console.log('Reading audio file...');
    const audioBuffer = fs.readFileSync(audioFilePath);
    const audioBase64 = audioBuffer.toString('base64');
    
    console.log('Submitting call for analysis...');
    
    const response = await axios.post(
      `${BASE_URL}/calls/analyze`,
      {
        audio_file: audioBase64,
        company_id: companyId,
        agent_id: agentId,
        call_type: 'sales_call',
        analysis_type: 'full',
        webhook_url: webhookUrl,
        metadata: {
          call_reference: 'REF-' + Date.now(),
          source: 'nodejs_example'
        }
      },
      { 
        headers: createHeaders(`call-${Date.now()}`)  // Idempotency key
      }
    );
    
    console.log('Analysis job created:', response.data);
    return response.data.job_id;
    
  } catch (error) {
    console.error('Error analyzing call:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// 4. Poll for Results
// ============================================================================

async function pollForResults(jobId, maxAttempts = 60) {
  console.log('Polling for results...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(
        `${BASE_URL}/jobs/${jobId}/status`,
        { headers: createHeaders() }
      );
      
      const { status, progress } = response.data;
      console.log(`Attempt ${attempt}: Status=${status}, Progress=${progress}%`);
      
      if (status === 'completed') {
        console.log('✅ Analysis completed!');
        console.log('Results:', JSON.stringify(response.data.results, null, 2));
        return response.data;
      }
      
      if (status === 'failed') {
        console.error('❌ Analysis failed:', response.data.error_message);
        throw new Error(response.data.error_message);
      }
      
      // Wait 3 seconds before next attempt
      await sleep(3000);
      
    } catch (error) {
      console.error('Error polling:', error.response?.data || error.message);
      throw error;
    }
  }
  
  throw new Error('Timeout: Analysis did not complete in time');
}

// ============================================================================
// 5. Webhook Handler (Express.js)
// ============================================================================

function verifyWebhookSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function setupWebhookHandler(app) {
  app.post('/webhook/analysis', (req, res) => {
    try {
      const signature = req.headers['x-partner-signature'];
      const payload = req.body;
      
      // Verify signature
      if (!verifyWebhookSignature(payload, signature)) {
        console.error('Invalid webhook signature');
        return res.status(401).send('Invalid signature');
      }
      
      console.log('Webhook received:', payload);
      
      if (payload.status === 'completed') {
        console.log('✅ Analysis completed via webhook!');
        console.log('Call ID:', payload.call_id);
        console.log('Results:', payload.results);
        
        // Process the results...
        // e.g., save to database, send notification, etc.
      } else if (payload.status === 'failed') {
        console.error('❌ Analysis failed:', payload.error_message);
      }
      
      // Return 200 quickly to avoid retries
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal error');
    }
  });
}

// ============================================================================
// Main Flow
// ============================================================================

async function main() {
  try {
    // 1. Create company
    const companyId = await createCompany();
    console.log('\n');
    
    // 2. Create agent
    const agentId = await createAgent(companyId);
    console.log('\n');
    
    // 3. Analyze call (replace with your audio file path)
    const audioFilePath = './sample-call.mp3';
    const jobId = await analyzeCall(companyId, agentId, audioFilePath);
    console.log('\n');
    
    // 4. Poll for results
    const results = await pollForResults(jobId);
    console.log('\n');
    
    console.log('=== Completed Successfully ===');
    console.log('Company ID:', companyId);
    console.log('Agent ID:', agentId);
    console.log('Call ID:', results.call_id);
    console.log('Overall Score:', results.results?.overall_score);
    
  } catch (error) {
    console.error('Main flow error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other modules
module.exports = {
  createCompany,
  createAgent,
  analyzeCall,
  pollForResults,
  verifyWebhookSignature,
  setupWebhookHandler,
};

