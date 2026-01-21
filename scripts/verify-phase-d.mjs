#!/usr/bin/env node
/**
 * Phase D Invoice System Verification Script
 * 
 * Comprehensive verification harness for Phase D (invoices) end-to-end.
 * Checks environment, TypeScript compilation, and production build.
 * 
 * Usage:
 *   node scripts/verify-phase-d.mjs
 *   npm run verify-phase-d (if added to package.json)
 * 
 * Exit Codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 * 
 * Windows PowerShell Compatible: Yes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(__dirname);
const envLocalPath = path.join(rootDir, '.env.local');

// Required environment variables for Phase D
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_BASE_URL',
];

// Optional but recommended
const OPTIONAL_ENV_VARS = [
  'NODE_ENV',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
];

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
};

const symbols = {
  check: '✓',
  cross: '✗',
  dot: '•',
  line: '─',
  box: '═',
  corner: '─',
};

/**
 * Print colored text
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function header(title) {
  console.log('');
  log(symbols.box.repeat(57), 'blue');
  log(title, 'blue');
  log(symbols.box.repeat(57), 'blue');
  console.log('');
}

/**
 * Print check result
 */
function checkResult(name, passed, details = '') {
  const status = passed ? `${colors.green}${symbols.check} PASS${colors.reset}` : `${colors.red}${symbols.cross} FAIL${colors.reset}`;
  const width = 35;
  const paddedName = name.padEnd(width);
  console.log(`${paddedName} ${status}`);
  if (details) {
    log(`  ${symbols.dot} ${details}`, 'dim');
  }
}

/**
 * Load environment variables from .env.local
 */
function loadEnv() {
  const env = {};
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          let value = valueParts.join('=').trim();
          // Remove surrounding quotes
          value = value.replace(/^["']|["']$/g, '');
          env[key] = value;
        }
      }
    });
  }
  return env;
}

/**
 * Check if command exists
 */
function commandExists(cmd) {
  try {
    const result = execSync(`where ${cmd}`, { encoding: 'utf-8', stdio: 'pipe' });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Execute command and return result
 */
function runCommand(cmd, options = {}) {
  const {
    silent = false,
    failFast = true,
    cwd = rootDir,
  } = options;

  try {
    const result = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    return { success: true, output: result };
  } catch (error) {
    if (failFast) {
      return { success: false, output: error.message, error };
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Check Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check 1: Environment Variables
 */
function checkEnvironment() {
  log('Environment Variables', 'bright');
  console.log(symbols.line.repeat(57));

  const env = loadEnv();
  let allPassed = true;

  for (const varName of REQUIRED_ENV_VARS) {
    const exists = env[varName] && env[varName].length > 0;
    checkResult(varName, exists, exists ? 'configured' : 'NOT FOUND');
    if (!exists) allPassed = false;
  }

  console.log('');

  for (const varName of OPTIONAL_ENV_VARS) {
    const exists = env[varName] && env[varName].length > 0;
    const status = exists ? `${symbols.check}` : `${colors.dim}(optional)${colors.reset}`;
    console.log(`${varName.padEnd(35)} ${status}`);
  }

  console.log('');

  if (!fs.existsSync(envLocalPath)) {
    log(`⚠ Warning: .env.local not found at ${envLocalPath}`, 'yellow');
    allPassed = false;
  }

  return allPassed;
}

/**
 * Check 2: Node.js Version
 */
function checkNodeVersion() {
  log('Node.js Environment', 'bright');
  console.log(symbols.line.repeat(57));

  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.split('.')[0].slice(1));
  const passed = nodeMajor >= 18;

  checkResult('Node.js version', passed, `${nodeVersion} (requires v18+)`);

  if (commandExists('npm')) {
    const npmOutput = execSync('npm --version', { encoding: 'utf-8' }).trim();
    checkResult('npm installed', true, `v${npmOutput}`);
  } else {
    checkResult('npm installed', false, 'npm not found in PATH');
  }

  console.log('');
  return passed;
}

/**
 * Check 3: Dependencies Installed
 */
function checkDependencies() {
  log('Project Dependencies', 'bright');
  console.log(symbols.line.repeat(57));

  const packageJsonPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log('✗ package.json not found', 'red');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  const hasNodeModules = fs.existsSync(nodeModulesPath);

  checkResult('package.json exists', true);
  checkResult('node_modules installed', hasNodeModules, hasNodeModules ? 'ready' : 'run: npm install');

  const criticalDeps = [
    'next',
    'react',
    'typescript',
    '@supabase/supabase-js',
    'pdfkit',
    'zod',
  ];

  let allPassed = hasNodeModules;
  for (const dep of criticalDeps) {
    const installed = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
    checkResult(`  ${dep}`, !!installed, installed ? packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep] : 'NOT FOUND');
    if (!installed) allPassed = false;
  }

  console.log('');
  return allPassed;
}

/**
 * Check 4: TypeScript Compilation
 */
function checkTypeScript() {
  log('TypeScript Compilation', 'bright');
  console.log(symbols.line.repeat(57));

  console.log('Running: npx tsc --noEmit');
  console.log('');

  const result = runCommand('npx tsc --noEmit', { silent: true, failFast: true });

  const passed = result.success;
  checkResult('Type checking', passed, passed ? 'no errors' : 'see details below');

  if (!passed) {
    console.log('');
    log('TypeScript Error Output:', 'red');
    console.log(result.output);
  }

  console.log('');
  return passed;
}

/**
 * Check 5: Production Build
 */
function checkBuild() {
  log('Production Build', 'bright');
  console.log(symbols.line.repeat(57));

  console.log('Running: npm run build');
  console.log('(This may take 1-2 minutes...)');
  console.log('');

  const result = runCommand('npm run build', { failFast: true, cwd: rootDir });

  const passed = result.success;
  checkResult('Production build', passed, passed ? 'successful' : 'failed');

  if (!passed) {
    console.log('');
    log('Build Error Output:', 'red');
    console.log(result.output.slice(-2000)); // Last 2000 chars
  }

  console.log('');
  return passed;
}

/**
 * Check 6: ESLint (Optional)
 */
function checkLinting() {
  log('Code Quality (ESLint)', 'bright');
  console.log(symbols.line.repeat(57));

  if (!commandExists('eslint')) {
    log('(eslint not found - skipping)', 'dim');
    console.log('');
    return true; // Optional check
  }

  console.log('Running: npx eslint .');
  console.log('');

  const result = runCommand('npx eslint . --max-warnings 5', { silent: true, failFast: true });

  const passed = result.success;
  checkResult('ESLint check', passed, passed ? 'no critical errors' : 'see details below');

  if (!passed && result.output) {
    console.log('');
    log('Linting issues (warnings are ok):', 'yellow');
    console.log(result.output.slice(-1000));
  }

  console.log('');
  return true; // Don't fail overall on lint
}

/**
 * Generate Summary Report
 */
function generateSummary(results) {
  console.log('');
  log(symbols.box.repeat(57), 'blue');
  log('Phase D Verification Summary', 'blue');
  log(symbols.box.repeat(57), 'blue');
  console.log('');

  const checks = [
    { name: 'Environment Variables', result: results.env },
    { name: 'Node.js Version', result: results.nodeVersion },
    { name: 'Dependencies', result: results.dependencies },
    { name: 'TypeScript Compilation', result: results.typeScript },
    { name: 'Production Build', result: results.build },
  ];

  for (const check of checks) {
    checkResult(check.name, check.result);
  }

  console.log('');
  log(symbols.box.repeat(57), 'blue');

  const allPassed = Object.values(results).every((v) => v === true);
  const statusColor = allPassed ? 'green' : 'red';
  const statusSymbol = allPassed ? symbols.check : symbols.cross;
  const statusText = allPassed ? 'PASS' : 'FAIL';

  log(`Overall Status: ${statusSymbol} ${statusText}`, statusColor);
  log(symbols.box.repeat(57), 'blue');
  console.log('');

  if (allPassed) {
    log('✓ Phase D is ready for deployment', 'green');
    log('Next steps:', 'green');
    log('  1. Review PHASE_D_VERIFICATION.md for manual test plan', 'green');
    log('  2. Run local manual tests to verify functionality', 'green');
    log('  3. Test on staging environment before production', 'green');
  } else {
    log('✗ Fix the issues above before proceeding', 'red');
    log('Detailed troubleshooting: docs/PHASE_D_VERIFICATION.md', 'red');
  }

  console.log('');

  return allPassed;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  header('Phase D Invoice System Verification');

  const results = {
    env: checkEnvironment(),
    nodeVersion: checkNodeVersion(),
    dependencies: checkDependencies(),
    typeScript: checkTypeScript(),
    build: checkBuild(),
    lint: checkLinting(),
  };

  const passed = generateSummary(results);

  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
}

// Run main
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
