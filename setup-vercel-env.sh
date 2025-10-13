#!/bin/bash

# Script per configurare le environment variables su Vercel
# Usage: ./setup-vercel-env.sh

set -e

echo "🔧 Configurazione Environment Variables su Vercel"
echo ""

# Variabili
SUPABASE_URL="https://sbtkymupbjyikfwjeumk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo"
SUPABASE_PROJECT_ID="sbtkymupbjyikfwjeumk"

echo "📋 Variabili da configurare:"
echo "  - VITE_SUPABASE_URL"
echo "  - VITE_SUPABASE_ANON_KEY"
echo "  - VITE_SUPABASE_PROJECT_ID"
echo "  - NODE_ENV"
echo ""

# Verifica se vercel CLI è installato
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI non trovato"
    echo "Installa con: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI trovato"
echo ""

# Configurazione manuale via dashboard
echo "⚠️  Per configurare le environment variables:"
echo ""
echo "1. Vai su: https://vercel.com/ferrarisboutique/dashboard-effe/settings/environment-variables"
echo ""
echo "2. Aggiungi le seguenti variabili per Production, Preview e Development:"
echo ""
echo "   VITE_SUPABASE_URL=$SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "   VITE_SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID"
echo "   NODE_ENV=production"
echo ""
echo "3. Salva le modifiche"
echo ""
echo "Oppure usa questi comandi (uno alla volta):"
echo ""
echo "  echo \"$SUPABASE_URL\" | vercel env add VITE_SUPABASE_URL production"
echo "  echo \"$SUPABASE_ANON_KEY\" | vercel env add VITE_SUPABASE_ANON_KEY production"
echo "  echo \"$SUPABASE_PROJECT_ID\" | vercel env add VITE_SUPABASE_PROJECT_ID production"
echo "  echo \"production\" | vercel env add NODE_ENV production"
echo ""
echo "  # Ripeti per preview e development se necessario"
echo ""
