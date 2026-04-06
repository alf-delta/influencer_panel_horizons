#!/bin/sh
# Generates js/env.js from Vercel environment variables at build time
cat > js/env.js << EOF
// Auto-generated at build time — do not edit
export const ENV = {
  supabaseUrl:  '${SUPABASE_URL:-}',
  supabaseKey:  '${SUPABASE_ANON_KEY:-}',
  attioWebhook: '${ATTIO_WEBHOOK:-}',
};
EOF
echo "js/env.js generated"
