#!/usr/bin/env node
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGO_APP_URL = process.env.MONGO_APP_URL || 'mongodb://127.0.0.1:27017';
const MONGO_APP_DB_NAME = process.env.MONGO_APP_DB_NAME || 'election_app';
const TEST_PASSWORD = process.env.ADMIN_PASSWORD || 'UL5-q9SmiZLcSp9l';

async function testLogin() {
  const client = new MongoClient(MONGO_APP_URL);

  try {
    await client.connect();
    const db = client.db(MONGO_APP_DB_NAME);
    const usersCollection = db.collection('tbl_user');

    const admin = await usersCollection.findOne({ user_group_id: 1 });

    if (!admin) {
      console.log('❌ No admin found');
      return;
    }

    console.log('Testing login for admin:');
    console.log(`  Username/Mobile: ${admin.user_name} / ${admin.mobile_no}`);
    console.log(`  Stored Hash: ${admin.password?.substring(0, 30)}...`);
    console.log(`  Test Password: ${TEST_PASSWORD}\n`);

    const match = await bcrypt.compare(TEST_PASSWORD, admin.password);
    
    if (match) {
      console.log('✓ Password matches! Login should work.');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('\nDebugging:');
      console.log(`  Password length: ${TEST_PASSWORD.length}`);
      console.log(`  Hash format: ${admin.password?.substring(0, 4)}`);
      
      // Try rehashing and comparing
      console.log('\nTrying to rehash the password...');
      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      console.log(`  New hash: ${newHash.substring(0, 30)}...`);
      const newMatch = await bcrypt.compare(TEST_PASSWORD, newHash);
      console.log(`  New hash matches: ${newMatch}`);
    }

  } finally {
    await client.close();
  }
}

testLogin();
