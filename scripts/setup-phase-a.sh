#!/bin/bash

# BUILDR Phase A - Installation Script
# This script sets up all Phase A dependencies and configuration

echo "🏗️ BUILDR Phase A (Foundation) - Installation"
echo "=============================================="
echo ""

# Step 1: Install npm dependencies
echo "📦 Installing dependencies..."
npm install @supabase/supabase-js @prisma/client prisma stripe
npm install -D @types/node typescript

if [ $? -ne 0 ]; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 2: Check for .env.local
echo "🔐 Checking environment variables..."
if [ ! -f ".env.local" ]; then
  echo "⚠️ .env.local not found"
  echo "📝 Creating .env.local from template..."
  cp .env.local.example .env.local
  echo "✅ .env.local created - IMPORTANT: Fill in your Supabase credentials"
else
  echo "✅ .env.local exists"
fi

echo ""

# Step 3: Generate Prisma Client
echo "🗄️ Generating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
  echo "❌ Failed to generate Prisma client"
  exit 1
fi

echo "✅ Prisma client generated"
echo ""

# Step 4: Check database connection
echo "🔗 Checking database connection..."
echo "⚠️ Make sure DATABASE_URL is set in .env.local"
echo ""

# Step 5: Instructions for next steps
echo "🚀 Installation complete!"
echo ""
echo "NEXT STEPS:"
echo "1. Fill in .env.local with your Supabase credentials:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - DATABASE_URL"
echo ""
echo "2. Run database migration:"
echo "   npx prisma migrate dev --name init"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "📖 For detailed setup instructions, see PHASE_A_SETUP.md"
echo ""
