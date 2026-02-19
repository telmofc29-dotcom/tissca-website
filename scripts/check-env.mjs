#!/usr/bin/env node
/**
 * Environment Variables Check Script
 * 
 * This script verifies that all required environment variables are set.
 * Run with: npm run check-env
 * 
 * It does NOT print actual values (security).
 * It only confirms whether each var exists.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(__dirname);
const envLocalPath = path.join(rootDir, '.env.local');

// Load .env.local if it exists
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        const value = valueParts.join('=').trim();
        // Remove surrounding quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key] = cleanValue;
      }
    }
  });
}

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const optionalVars = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'DATABASE_URL',
  'NEXT_PUBLIC_BASE_URL',
  'NODE_ENV',
];

console.log('\n🔍 Environment Variables Check\n');
console.log('REQUIRED VARIABLES:');
console.log('─'.repeat(50));

let requiredMissing = 0;
requiredVars.forEach((varName) => {
  const exists = process.env[varName];
  const status = exists ? '✓' : '✗';
  const color = exists ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${status}${reset} ${varName}`);
  if (!exists) requiredMissing++;
});

console.log('\nOPTIONAL VARIABLES:');
console.log('─'.repeat(50));

optionalVars.forEach((varName) => {
  const exists = process.env[varName];
  const status = exists ? '✓' : '◦';
  const color = exists ? '\x1b[32m' : '\x1b[36m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${status}${reset} ${varName}`);
});

console.log('\n' + '─'.repeat(50));

if (requiredMissing === 0) {
  console.log(
    '\x1b[32m✓ All required environment variables are set!\x1b[0m\n'
  );
  process.exit(0);
} else {
  console.log(
    `\x1b[31m✗ Missing ${requiredMissing} required variable(s).\x1b[0m`
  );
  console.log(
    '\x1b[33mℹ Run: cp .env.local.example .env.local, then fill in actual values.\x1b[0m\n'
  );
  process.exit(1);
}
