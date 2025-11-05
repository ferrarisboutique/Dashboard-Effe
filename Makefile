SHELL := /bin/bash

.PHONY: env db functions vercel all

env:
	PROJECT_REF="$${VITE_SUPABASE_PROJECT_ID}" SUPABASE_URL="$${VITE_SUPABASE_URL}" SUPABASE_ANON_KEY="$${VITE_SUPABASE_ANON_KEY}" VERCEL_TOKEN="$${VERCEL_TOKEN}" ./setup-vercel-env.sh

db:
	SUPABASE_ACCESS_TOKEN="$${SUPABASE_ACCESS_TOKEN}" PROJECT_REF="$${VITE_SUPABASE_PROJECT_ID}" supabase db push --project-ref "$$PROJECT_REF"

functions:
	PROJECT_REF="$${VITE_SUPABASE_PROJECT_ID}" SUPABASE_ACCESS_TOKEN="$${SUPABASE_ACCESS_TOKEN}" SUPABASE_SERVICE_ROLE_KEY="$${SUPABASE_SERVICE_ROLE_KEY}" ./deploy-edge-functions.sh

vercel:
	VERCEL_TOKEN="$${VERCEL_TOKEN}" vercel deploy --prod --yes

all: env db functions vercel



