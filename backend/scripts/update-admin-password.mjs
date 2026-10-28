#!/usr/bin/env node
/**
 * Update admin password in database to match .env
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGO_APP_URL = process.env.MONGO_APP_URL || 'mongodb://127.0.0.1:27017';
const MONGO_APP_DB_NAME = process.env.MONGO_APP_DB_NAME || 'election_app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function updateAdminPassword() {
  if (!ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD not set in .env');
    process.exit(1);
  }

  console.log('Updating admin password in database...\n');
  console.log(`MongoDB: ${MONGO_APP_URL}`);
  console.log(`Database: ${MONGO_APP_DB_NAME}`);
  console.log(`New Password: ${ADMIN_PASSWORD}\n`);

  const client = new MongoClient(MONGO_APP_URL);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(MONGO_APP_DB_NAME);
    const usersCollection = db.collection('tbl_user');

    // Find admin user
    const admin = await usersCollection.findOne({ user_group_id: 1 });

    if (!admin) {
      console.log('❌ No admin user found in database');
      process.exit(1);
    }

    console.log('Found admin user:');
    console.log(`  ID: ${admin._id}`);
    console.log(`  Username: ${admin.username || admin.mobile_no}`);
    console.log(`  Name: ${admin.first_name || 'Super Admin'}\n`);

    // Hash the new password
    console.log('Hashing new password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log(`✓ Password hashed: ${hashedPassword.substring(0, 20)}...\n`);

    // Update the password
    console.log('Updating password in database...');
    const result = await usersCollection.updateOne(
      { _id: admin._id },
      { 
        $set: { 
          password: hashedPassword,
          password_str: null // Remove plaintext password if it exists
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✓ Admin password updated successfully!\n');
      console.log('You can now login with:');
      console.log(`  Username: ${admin.username || admin.mobile_no}`);
      console.log(`  Password: ${ADMIN_PASSWORD}\n`);
    } else {
      console.log('⚠ No changes made (password may already be correct)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✓ Disconnected from MongoDB');
  }
}

updateAdminPassword();
