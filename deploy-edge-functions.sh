#!/bin/bash

# Script per il deploy delle Edge Functions su Supabase
# Usage: ./deploy-edge-functions.sh

set -e

PROJECT_REF="sbtkymupbjyikfwjeumk"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwMDQxNSwiZXhwIjoyMDc0NDc2NDE1fQ.-V_j_BVtYJUXz8sf2vfBkKK63PQjjAu0ASwuKSwmqAs"
FUNCTION_NAME="make-server-49468be0"

echo "🚀 Deploying Edge Function: $FUNCTION_NAME"
echo "📍 Project: $PROJECT_REF"

# Note: Per il deploy delle Edge Functions via API REST, è necessario utilizzare
# la Supabase CLI o il dashboard web.
#
# Le Edge Functions non possono essere deployate direttamente via REST API.
#
# Segui questi passi:
# 1. Vai su https://supabase.com/dashboard/project/$PROJECT_REF/functions
# 2. Crea una nuova funzione chiamata "$FUNCTION_NAME"
# 3. Copia il contenuto dei file da supabase/functions/$FUNCTION_NAME/
# 4. Deploy dalla dashboard

echo ""
echo "⚠️  Le Edge Functions devono essere deployate manualmente o con Supabase CLI"
echo ""
echo "📋 Passi per il deploy manuale:"
echo "1. Vai su: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "2. Crea funzione: $FUNCTION_NAME"
echo "3. Copia i file da: supabase/functions/$FUNCTION_NAME/"
echo "4. Click su Deploy"
echo ""
echo "🔧 Oppure installa Supabase CLI:"
echo "   brew install supabase/tap/supabase"
echo "   supabase login"
echo "   supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF"
echo ""

# Verifica se la funzione esiste già
echo "🔍 Verificando se la funzione esiste..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/health" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ La funzione è già deployata e funzionante!"
  echo "Response: $BODY"
else
  echo "❌ La funzione non è ancora deployata o non risponde"
  echo "HTTP Code: $HTTP_CODE"
  echo "Procedi con il deploy manuale seguendo i passi sopra"
fi
