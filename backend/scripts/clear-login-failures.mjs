#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGO_APP_URL = process.env.MONGO_APP_URL || 'mongodb://127.0.0.1:27017';
const MONGO_APP_DB_NAME = process.env.MONGO_APP_DB_NAME || 'election_app';

async function clearLoginFailures() {
  const client = new MongoClient(MONGO_APP_URL);

  try {
    await client.connect();
    const db = client.db(MONGO_APP_DB_NAME);
    
    // Clear any login failure records
    const result = await db.collection('tbl_login_fails').deleteMany({});
    
    console.log(`✓ Cleared ${result.deletedCount} login failure record(s)`);
    console.log('Admin account is no longer locked');

  } finally {
    await client.close();
  }
}

clearLoginFailures();
