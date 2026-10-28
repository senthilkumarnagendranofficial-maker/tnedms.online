#!/usr/bin/env node
/**
 * Cleanup Test Data from E2E Testing
 * Removes test leads and users created during automated testing
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: join(__dirname, 'backend', '.env') });

const MONGO_APP_URL = process.env.MONGO_APP_URL || 'mongodb://127.0.0.1:27017';
const MONGO_APP_DB_NAME = process.env.MONGO_APP_DB_NAME || 'election_app';

// Test data patterns to identify and remove
const TEST_PATTERNS = {
  mobile: /^9840\d{6}$/,  // Test mobiles like 9840123456
  name: /(Test|Auto|Automated|Murugan Test|Selvam Candidate)/i,
  notes: /\[Automated test\]/i
};

async function cleanupTestData() {
  console.log('🧹 TNEDMS Test Data Cleanup\n');
  console.log(`Connecting to: ${MONGO_APP_URL}`);
  console.log(`Database: ${MONGO_APP_DB_NAME}\n`);

  const client = new MongoClient(MONGO_APP_URL);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(MONGO_APP_DB_NAME);

    // Cleanup leads (incomplete registrations)
    console.log('🔍 Searching for test leads...');
    const leadsCollection = db.collection('tbl_leads');
    
    const testLeads = await leadsCollection.find({
      $or: [
        { mobile: TEST_PATTERNS.mobile },
        { name: TEST_PATTERNS.name },
        { notes: TEST_PATTERNS.notes }
      ]
    }).toArray();

    if (testLeads.length > 0) {
      console.log(`Found ${testLeads.length} test lead(s):`);
      testLeads.forEach(lead => {
        console.log(`  - ${lead.name} (${lead.mobile}) - ${lead.source || 'N/A'}`);
      });

      const deleteLeadsResult = await leadsCollection.deleteMany({
        $or: [
          { mobile: TEST_PATTERNS.mobile },
          { name: TEST_PATTERNS.name },
          { notes: TEST_PATTERNS.notes }
        ]
      });

      console.log(`✓ Deleted ${deleteLeadsResult.deletedCount} test lead(s)\n`);
    } else {
      console.log('No test leads found\n');
    }

    // Cleanup users (registered candidates)
    console.log('🔍 Searching for test users...');
    const usersCollection = db.collection('tbl_user');
    
    const testUsers = await usersCollection.find({
      $or: [
        { mobile: TEST_PATTERNS.mobile },
        { name: TEST_PATTERNS.name }
      ]
    }).toArray();

    if (testUsers.length > 0) {
      console.log(`Found ${testUsers.length} test user(s):`);
      testUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.mobile}) - ${user.role || 'N/A'}`);
      });

      const deleteUsersResult = await usersCollection.deleteMany({
        $or: [
          { mobile: TEST_PATTERNS.mobile },
          { name: TEST_PATTERNS.name }
        ]
      });

      console.log(`✓ Deleted ${deleteUsersResult.deletedCount} test user(s)\n`);
    } else {
      console.log('No test users found\n');
    }

    // Cleanup CRM conversations
    console.log('🔍 Searching for test CRM conversations...');
    const conversationsCollection = db.collection('tbl_crm_conversations');
    
    if (conversationsCollection) {
      const testConversations = await conversationsCollection.find({
        $or: [
          { mobile: TEST_PATTERNS.mobile },
          { 'callLogs.notes': TEST_PATTERNS.notes }
        ]
      }).toArray();

      if (testConversations.length > 0) {
        console.log(`Found ${testConversations.length} test conversation(s)`);

        const deleteConversationsResult = await conversationsCollection.deleteMany({
          $or: [
            { mobile: TEST_PATTERNS.mobile },
            { 'callLogs.notes': TEST_PATTERNS.notes }
          ]
        });

        console.log(`✓ Deleted ${deleteConversationsResult.deletedCount} test conversation(s)\n`);
      } else {
        console.log('No test conversations found\n');
      }
    }

    // Summary
    console.log('━'.repeat(60));
    console.log('✓ Cleanup completed successfully!');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('✗ Error during cleanup:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Interactive confirmation
console.log('━'.repeat(60));
console.log('⚠️  WARNING: This will delete test data from the database');
console.log('━'.repeat(60));
console.log('This script will remove:');
console.log('  • Leads with mobile numbers matching: 9840XXXXXX');
console.log('  • Users with test names (Test, Auto, Automated)');
console.log('  • CRM conversations with test data');
console.log('');
console.log('Database:', MONGO_APP_DB_NAME);
console.log('Connection:', MONGO_APP_URL);
console.log('━'.repeat(60));

// Check for --force flag
const forceMode = process.argv.includes('--force');

if (forceMode) {
  console.log('Running in FORCE mode (no confirmation)\n');
  cleanupTestData();
} else {
  console.log('\nTo proceed, run with --force flag:');
  console.log('  node cleanup-test-data.mjs --force\n');
}
