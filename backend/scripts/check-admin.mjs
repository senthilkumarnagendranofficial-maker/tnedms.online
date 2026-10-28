#!/usr/bin/env node
/**
 * Check if admin user exists in database
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGO_APP_URL = process.env.MONGO_APP_URL || 'mongodb://127.0.0.1:27017';
const MONGO_APP_DB_NAME = process.env.MONGO_APP_DB_NAME || 'election_app';

async function checkAdmin() {
  console.log('Connecting to MongoDB...');
  console.log(`URL: ${MONGO_APP_URL}`);
  console.log(`DB: ${MONGO_APP_DB_NAME}\n`);

  const client = new MongoClient(MONGO_APP_URL);

  try {
    await client.connect();
    console.log('✓ Connected\n');

    const db = client.db(MONGO_APP_DB_NAME);
    const usersCollection = db.collection('tbl_user');

    // Check for super admin users
    const superAdmins = await usersCollection.find({ user_group_id: 1 }).toArray();
    
    console.log(`Found ${superAdmins.length} super admin user(s):\n`);
    
    if (superAdmins.length > 0) {
      superAdmins.forEach(admin => {
        console.log('Admin User:');
        console.log(`  ID: ${admin._id}`);
        console.log(`  Name: ${admin.first_name || admin.name || 'N/A'}`);
        console.log(`  Mobile: ${admin.mobile_no || 'N/A'}`);
        console.log(`  Username: ${admin.username || admin.mobile_no || 'N/A'}`);
        console.log(`  Email: ${admin.email || 'N/A'}`);
        console.log(`  Group ID: ${admin.user_group_id}`);
        console.log(`  Active: ${admin.is_active ?? 1}`);
        console.log(`  Has Password: ${admin.password ? 'Yes' : 'No'}`);
        console.log(`  Password Hash: ${admin.password ? admin.password.substring(0, 20) + '...' : 'None'}`);
        console.log('');
      });
    } else {
      console.log('No super admin users found in database.');
      console.log('\nBootstrap Admin Configuration:');
      console.log(`  Username: ${process.env.ADMIN_USERNAME}`);
      console.log(`  Password: ${process.env.ADMIN_PASSWORD ? '(set, length: ' + process.env.ADMIN_PASSWORD.length + ')' : '(not set)'}`);
      
      // Check bootstrap logic
      const bootUser = process.env.ADMIN_USERNAME;
      const bootPass = process.env.ADMIN_PASSWORD;
      const bootstrapEnabled = !!bootUser && !!bootPass && bootPass.length >= 12
        && bootPass.toLowerCase() !== 'admin' && bootUser.toLowerCase() !== 'admin';
      
      console.log(`\nBootstrap Enabled: ${bootstrapEnabled}`);
      if (!bootstrapEnabled) {
        console.log('\n❌ Bootstrap is DISABLED because:');
        if (!bootUser) console.log('   - ADMIN_USERNAME is not set');
        if (!bootPass) console.log('   - ADMIN_PASSWORD is not set');
        if (bootPass && bootPass.length < 12) console.log('   - Password is too short (< 12 chars)');
        if (bootPass && bootPass.toLowerCase() === 'admin') console.log('   - Password is "admin" (not allowed)');
        if (bootUser && bootUser.toLowerCase() === 'admin') console.log('   - Username is "admin" (not allowed for bootstrap)');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAdmin();
