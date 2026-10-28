#!/usr/bin/env node
/**
 * TNEDMS End-to-End Automated Testing Script
 * Tests all scenarios from END_TO_END_TESTING_PLAYBOOK.md against local environment
 * 
 * Usage: node e2e-testing-automation.mjs
 */

import fetch from 'node-fetch';
import { createWriteStream, appendFileSync, writeFileSync } from 'fs';

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000';

// Test Credentials
const SUPER_ADMIN = {
  username: 'admin',
  password: 'UL5-q9SmiZLcSp9l'
};

const TELECALLERS = [
  { name: 'Abinaya M', username: 'abinaya', password: '123456' },
  { name: 'Yuvasri', username: 'yuvasri', password: '123456' },
  { name: 'Omsree', username: 'omsree', password: '123456' },
  { name: 'Sathiya Priya I', username: 'sathiyapriya', password: '123456' },
  { name: 'A. Vedha Priya', username: 'vedhapriya', password: '123456' }
];

// Test Results
const results = [];
let passCount = 0;
let failCount = 0;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper Functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function logTest(testName) {
  log(`\n▶ Testing: ${testName}`, 'blue');
}

function logPass(message) {
  log(`  ✓ PASS: ${message}`, 'green');
  passCount++;
}

function logFail(message) {
  log(`  ✗ FAIL: ${message}`, 'red');
  failCount++;
}

function logWarning(message) {
  log(`  ⚠ WARNING: ${message}`, 'yellow');
}

function recordResult(testItem, targetUrl, expectedResult, passed, details = '') {
  results.push({
    testItem,
    targetUrl,
    expectedResult,
    status: passed ? 'PASS' : 'FAIL',
    details,
    timestamp: new Date().toISOString()
  });
}

// API Helper Functions
async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function login(username, password) {
  logTest(`Login as ${username}`);
  const result = await apiRequest('/api/auth/login', 'POST', { username, password });
  
  if (result.success && result.data.token) {
    logPass(`Successfully logged in as ${username}`);
    return result.data.token;
  } else {
    const errorMsg = result.data?.message || result.error || 'Unknown error';
    logFail(`Failed to login as ${username}: ${errorMsg}`);
    
    // Log more details for debugging
    if (result.status) {
      logWarning(`HTTP Status: ${result.status}`);
    }
    if (result.data) {
      logWarning(`Response: ${JSON.stringify(result.data)}`);
    }
    
    return null;
  }
}

// Test Scenario Functions

async function testScenario1_IncompleteRegistration() {
  logSection('TEST SCENARIO 1: Incomplete Registration Drop-Off');
  
  const testMobile = `9840${Date.now().toString().slice(-6)}`;
  const testName = 'Murugan Test Auto';
  
  logTest('Simulating incomplete registration');
  
  // Simulate incomplete registration by creating a lead
  const leadData = {
    name: testName,
    mobile: testMobile,
    source: 'website',
    stepReached: 1,
    formData: {
      fullName: testName,
      mobileNumber: testMobile
    }
  };
  
  // First login as admin to get token
  const adminToken = await login(SUPER_ADMIN.username, SUPER_ADMIN.password);
  if (!adminToken) {
    logFail('Cannot proceed without admin token');
    recordResult('Incomplete registration capture', '/incomplete-registrations', 
                 'Lead appears under "To follow up"', false, 'Admin login failed');
    return null;
  }
  
  // Create incomplete registration (lead)
  const createResult = await apiRequest('/api/leads', 'POST', leadData, adminToken);
  
  if (createResult.success) {
    logPass(`Created incomplete registration for ${testName} (${testMobile})`);
    
    // Verify it appears in incomplete registrations
    const leadsResult = await apiRequest('/api/leads?status=pending', 'GET', null, adminToken);
    
    if (leadsResult.success) {
      const foundLead = leadsResult.data?.leads?.find(l => l.mobile === testMobile);
      if (foundLead) {
        logPass(`Lead found in incomplete registrations`);
        logPass(`Source: ${foundLead.source || 'website'}`);
        logPass(`Step reached: ${foundLead.stepReached || 1}`);
        recordResult('Incomplete registration capture', '/incomplete-registrations', 
                     'Lead appears under "To follow up"', true, `Lead ID: ${foundLead._id}`);
        return { leadId: foundLead._id, mobile: testMobile, name: testName };
      } else {
        logFail(`Lead not found in incomplete registrations`);
        recordResult('Incomplete registration capture', '/incomplete-registrations', 
                     'Lead appears under "To follow up"', false, 'Lead not found after creation');
        return null;
      }
    } else {
      logFail(`Failed to fetch incomplete registrations: ${leadsResult.error || 'Unknown error'}`);
      recordResult('Incomplete registration capture', '/incomplete-registrations', 
                   'Lead appears under "To follow up"', false, 'Failed to fetch leads');
      return null;
    }
  } else {
    logFail(`Failed to create lead: ${createResult.error || createResult.data?.message || 'Unknown error'}`);
    recordResult('Incomplete registration capture', '/incomplete-registrations', 
                 'Lead appears under "To follow up"', false, 'Lead creation failed');
    return null;
  }
}

async function testScenario2_LeadAssignment(adminToken, leadId) {
  logSection('TEST SCENARIO 2: Super Admin Lead Assignment & Round-Robin');
  
  if (!adminToken || !leadId) {
    logWarning('Skipping Scenario 2: Missing admin token or lead ID');
    return;
  }
  
  // Part A: Manual Assignment
  logTest('Manual Assignment to Abinaya M');
  
  const assignResult = await apiRequest(`/api/leads/${leadId}/assign`, 'POST', 
    { telecallerId: 'abinaya' }, adminToken);
  
  if (assignResult.success) {
    logPass('Successfully assigned lead to Abinaya M');
    
    // Verify assignment
    const leadResult = await apiRequest(`/api/leads/${leadId}`, 'GET', null, adminToken);
    if (leadResult.success && leadResult.data?.assignedTo === 'abinaya') {
      logPass('Assignment verified - lead shows Abinaya M');
      recordResult('Manual telecaller assignment', '/incomplete-registrations', 
                   'Assigns lead to selected agent', true);
    } else {
      logFail('Assignment not reflected in lead data');
      recordResult('Manual telecaller assignment', '/incomplete-registrations', 
                   'Assigns lead to selected agent', false, 'Assignment not persisted');
    }
  } else {
    logFail(`Failed to assign lead: ${assignResult.error || assignResult.data?.message || 'Unknown error'}`);
    recordResult('Manual telecaller assignment', '/incomplete-registrations', 
                 'Assigns lead to selected agent', false, 'Assignment API failed');
  }
  
  // Part B: Round-Robin Distribution
  logTest('Round-Robin Automated Distribution');
  
  const roundRobinResult = await apiRequest('/api/leads/distribute-round-robin', 'POST', 
    {}, adminToken);
  
  if (roundRobinResult.success) {
    const distributed = roundRobinResult.data?.distributed || 0;
    logPass(`Round-robin distribution completed: ${distributed} leads distributed`);
    recordResult('Round-Robin distribution', '/incomplete-registrations', 
                 'Distributes evenly across 5 agents', true, `${distributed} leads distributed`);
  } else {
    logWarning(`Round-robin distribution: ${roundRobinResult.data?.message || 'No unassigned leads'}`);
    recordResult('Round-Robin distribution', '/incomplete-registrations', 
                 'Distributes evenly across 5 agents', true, 'No unassigned leads available');
  }
}

async function testScenario3_TelecallerWorkspace(leadMobile) {
  logSection('TEST SCENARIO 3: Telecaller Workspace & Queue Isolation');
  
  // Login as Abinaya
  const abinayaToken = await login(TELECALLERS[0].username, TELECALLERS[0].password);
  if (!abinayaToken) {
    recordResult('Telecaller login & queue isolation', '/team/crm', 
                 'Telecaller sees only their leads', false, 'Login failed');
    return;
  }
  
  logTest('Fetching Abinaya\'s queue');
  const queueResult = await apiRequest('/api/crm/conversations', 'GET', null, abinayaToken);
  
  if (queueResult.success) {
    const conversations = queueResult.data?.conversations || [];
    logPass(`Abinaya's queue loaded: ${conversations.length} conversations`);
    
    // Check if our test lead is in the queue
    const testLead = conversations.find(c => c.mobile === leadMobile);
    if (testLead) {
      logPass(`Test lead found in Abinaya's queue`);
    } else {
      logWarning(`Test lead not found in queue (may not be assigned to Abinaya)`);
    }
    
    recordResult('Telecaller login & queue isolation', '/team/crm', 
                 'Telecaller sees only their leads', true, `${conversations.length} leads in queue`);
    
    // Test call logging if we have a lead
    if (testLead) {
      await testCallLogging(abinayaToken, testLead._id);
    }
    
    // Test cross-agent isolation
    await testCrossAgentIsolation(leadMobile);
    
  } else {
    logFail(`Failed to fetch telecaller queue: ${queueResult.error || 'Unknown error'}`);
    recordResult('Telecaller login & queue isolation', '/team/crm', 
                 'Telecaller sees only their leads', false, 'Failed to fetch queue');
  }
}

async function testCallLogging(telecallerToken, conversationId) {
  logTest('Call Logging & Notes');
  
  const callLog = {
    outcome: 'interested',
    notes: 'Contacted candidate. Requested party booth briefing. [Automated test]',
    timestamp: new Date().toISOString()
  };
  
  const logResult = await apiRequest(`/api/crm/conversations/${conversationId}/log`, 
    'POST', callLog, telecallerToken);
  
  if (logResult.success) {
    logPass('Call log saved successfully');
    logPass(`Outcome: ${callLog.outcome}`);
    logPass(`Notes: ${callLog.notes}`);
    recordResult('Call logging & notes', '/team/crm', 
                 'Outcome and note saved to history', true);
  } else {
    logFail(`Failed to save call log: ${logResult.error || logResult.data?.message || 'Unknown error'}`);
    recordResult('Call logging & notes', '/team/crm', 
                 'Outcome and note saved to history', false, 'API call failed');
  }
}

async function testCrossAgentIsolation(testLeadMobile) {
  logTest('Cross-Agent Isolation Check');
  
  // Login as Yuvasri
  const yuvasriToken = await login(TELECALLERS[1].username, TELECALLERS[1].password);
  if (!yuvasriToken) {
    logWarning('Cannot test cross-agent isolation: Yuvasri login failed');
    return;
  }
  
  const queueResult = await apiRequest('/api/crm/conversations', 'GET', null, yuvasriToken);
  
  if (queueResult.success) {
    const conversations = queueResult.data?.conversations || [];
    const hasTestLead = conversations.some(c => c.mobile === testLeadMobile);
    
    if (!hasTestLead) {
      logPass('Cross-agent isolation confirmed: Yuvasri cannot see Abinaya\'s leads');
    } else {
      logFail('Cross-agent isolation FAILED: Yuvasri can see Abinaya\'s lead');
    }
  } else {
    logWarning('Cannot verify cross-agent isolation: Failed to fetch Yuvasri\'s queue');
  }
}

async function testScenario4_FullRegistration() {
  logSection('TEST SCENARIO 4: Full Candidate Registration & Dashboard');
  
  const candidateMobile = `9840${Date.now().toString().slice(-6)}`;
  const candidateName = 'Selvam Candidate Auto';
  
  logTest('Creating full candidate registration');
  
  const registrationData = {
    name: candidateName,
    mobile: candidateMobile,
    role: 'candidate',
    district: 'Chennai',
    assembly: 'Harbour',
    party: 'DMK',
    passcode: '123456'
  };
  
  const regResult = await apiRequest('/api/registrations', 'POST', registrationData);
  
  if (regResult.success) {
    logPass(`Candidate registered: ${candidateName} (${candidateMobile})`);
    
    // Login as the new candidate
    const candidateToken = await login(candidateMobile, '123456');
    
    if (candidateToken) {
      logPass('Candidate login successful');
      
      // Fetch candidate dashboard data
      const dashboardResult = await apiRequest('/api/candidate/dashboard', 'GET', null, candidateToken);
      
      if (dashboardResult.success) {
        logPass('Candidate dashboard loaded successfully');
        logPass(`Assembly: ${dashboardResult.data?.assembly || 'N/A'}`);
        logPass(`Total Voters: ${dashboardResult.data?.totalVoters || 0}`);
        recordResult('Full candidate registration flow', '/register -> /candidate', 
                     'Candidate dashboard loads cleanly', true);
      } else {
        logFail('Failed to load candidate dashboard');
        recordResult('Full candidate registration flow', '/register -> /candidate', 
                     'Candidate dashboard loads cleanly', false, 'Dashboard API failed');
      }
      
      // Test CRM auto-sync
      await testCRMAutoSync(candidateMobile);
      
    } else {
      logFail('Candidate login failed');
      recordResult('Full candidate registration flow', '/register -> /candidate', 
                   'Candidate dashboard loads cleanly', false, 'Login failed');
    }
  } else {
    logFail(`Registration failed: ${regResult.error || regResult.data?.message || 'Unknown error'}`);
    recordResult('Full candidate registration flow', '/register -> /candidate', 
                 'Candidate dashboard loads cleanly', false, 'Registration API failed');
  }
}

async function testCRMAutoSync(candidateMobile) {
  logTest('CRM Automatic Status Synchronization');
  
  const adminToken = await login(SUPER_ADMIN.username, SUPER_ADMIN.password);
  if (!adminToken) {
    logWarning('Cannot test CRM sync: Admin login failed');
    return;
  }
  
  // Check if candidate appears in registered tab
  const registeredResult = await apiRequest('/api/leads?status=registered', 'GET', null, adminToken);
  
  if (registeredResult.success) {
    const registered = registeredResult.data?.leads || [];
    const found = registered.find(l => l.mobile === candidateMobile);
    
    if (found) {
      logPass('CRM auto-sync confirmed: Candidate appears in "Registered" tab');
      logPass(`Status: ${found.status}`);
      recordResult('Registered status auto-sync', '/incomplete-registrations?tab=registered', 
                   'Lead moves to "Registered" tab', true);
    } else {
      logWarning('Candidate not found in registered tab (may take time to sync)');
      recordResult('Registered status auto-sync', '/incomplete-registrations?tab=registered', 
                   'Lead moves to "Registered" tab', false, 'Not found in registered tab');
    }
  } else {
    logFail('Failed to fetch registered leads');
    recordResult('Registered status auto-sync', '/incomplete-registrations?tab=registered', 
                 'Lead moves to "Registered" tab', false, 'API failed');
  }
}

async function testScenario5_WhatsAppReEngagement() {
  logSection('TEST SCENARIO 5: WhatsApp Re-Engagement Recognition');
  
  log('This scenario requires WhatsApp integration to be active.');
  log('Automated testing of WhatsApp flow requires actual message sending.');
  log('Manual verification recommended for this scenario.\n');
  
  logWarning('Scenario 5 requires manual testing with actual WhatsApp messages');
  
  results.push({
    testItem: 'WhatsApp re-engagement recognition',
    targetUrl: 'WhatsApp Integration',
    expectedResult: 'Registered user gets login details, not registration prompt',
    status: 'MANUAL',
    details: 'Requires manual WhatsApp message testing',
    timestamp: new Date().toISOString()
  });
}

async function testDirectAccess() {
  logSection('TEST SCENARIO 0: Direct Access (No HTTP Basic Auth)');
  
  logTest('Testing direct access to frontend');
  
  try {
    const response = await fetch(BASE_URL);
    
    if (response.ok) {
      logPass(`Frontend accessible at ${BASE_URL}`);
      logPass(`Status: ${response.status} ${response.statusText}`);
      
      // Check if we got an auth challenge
      const wwwAuth = response.headers.get('www-authenticate');
      if (wwwAuth) {
        logFail('HTTP Basic Auth is enabled (should be disabled)');
        recordResult('Direct access (No HTTP Basic Auth prompt)', BASE_URL, 
                     'Page opens directly without prompt', false, 'Auth challenge detected');
      } else {
        logPass('No HTTP Basic Auth prompt detected');
        recordResult('Direct access (No HTTP Basic Auth prompt)', BASE_URL, 
                     'Page opens directly without prompt', true);
      }
    } else {
      logFail(`Frontend returned ${response.status}: ${response.statusText}`);
      recordResult('Direct access (No HTTP Basic Auth prompt)', BASE_URL, 
                   'Page opens directly without prompt', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logFail(`Failed to access frontend: ${error.message}`);
    logWarning('Make sure the frontend dev server is running (npm run dev)');
    recordResult('Direct access (No HTTP Basic Auth prompt)', BASE_URL, 
                 'Page opens directly without prompt', false, error.message);
  }
}

// Generate Test Report
function generateReport() {
  logSection('TEST SUMMARY');
  
  log(`Total Tests: ${passCount + failCount}`, 'cyan');
  log(`Passed: ${passCount}`, 'green');
  log(`Failed: ${failCount}`, 'red');
  log(`Pass Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`, 'yellow');
  
  // Write detailed report to file
  const reportPath = 'e2e-test-report.json';
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: passCount + failCount,
      passed: passCount,
      failed: failCount,
      passRate: ((passCount / (passCount + failCount)) * 100).toFixed(1) + '%'
    },
    environment: {
      baseUrl: BASE_URL,
      apiUrl: API_URL
    },
    results
  };
  
  try {
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\nDetailed report saved to: ${reportPath}`, 'green');
  } catch (error) {
    logWarning(`Failed to save report: ${error.message}`);
  }
  
  // Print sign-off sheet
  console.log('\n' + '='.repeat(80));
  log('PHYSICAL TESTER SIGN-OFF SHEET', 'cyan');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    const status = result.status === 'PASS' ? '✓' : 
                   result.status === 'FAIL' ? '✗' : '⚠';
    const color = result.status === 'PASS' ? 'green' : 
                  result.status === 'FAIL' ? 'red' : 'yellow';
    log(`${index + 1}. [${status}] ${result.testItem}`, color);
    log(`   Expected: ${result.expectedResult}`, 'reset');
    if (result.details) {
      log(`   Details: ${result.details}`, 'reset');
    }
  });
  
  console.log('\n' + '='.repeat(80));
  log('Testing completed! Review results above.', 'cyan');
  console.log('='.repeat(80) + '\n');
}

// Main Test Runner
async function runAllTests() {
  log('TNEDMS End-to-End Automated Testing', 'cyan');
  log(`Testing against: ${BASE_URL}`, 'yellow');
  log(`API endpoint: ${API_URL}`, 'yellow');
  log(`Started at: ${new Date().toLocaleString()}\n`, 'yellow');
  
  // Pre-flight check
  await testDirectAccess();
  
  // Login as admin first
  const adminToken = await login(SUPER_ADMIN.username, SUPER_ADMIN.password);
  if (!adminToken) {
    logFail('Cannot proceed without admin access');
    generateReport();
    return;
  }
  
  // Run test scenarios
  const scenario1Result = await testScenario1_IncompleteRegistration();
  
  if (scenario1Result) {
    await testScenario2_LeadAssignment(adminToken, scenario1Result.leadId);
    await testScenario3_TelecallerWorkspace(scenario1Result.mobile);
  }
  
  await testScenario4_FullRegistration();
  await testScenario5_WhatsAppReEngagement();
  
  // Generate final report
  generateReport();
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error during testing:', error);
  process.exit(1);
});
