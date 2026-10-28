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

async function checkAdminFields() {
  const client = new MongoClient(MONGO_APP_URL);

  try {
    await client.connect();
    const db = client.db(MONGO_APP_DB_NAME);
    const usersCollection = db.collection('tbl_user');

    const admin = await usersCollection.findOne({ user_group_id: 1 });

    if (admin) {
      console.log('Admin user fields:');
      console.log(JSON.stringify(admin, null, 2));
    } else {
      console.log('No admin found');
    }

  } finally {
    await client.close();
  }
}

checkAdminFields();
