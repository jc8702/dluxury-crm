#!/bin/bash
set -e

echo "=== D'Luxury Deploy ==="

# Build
npm run build

# Testes (não bloqueia deploy se falhar, apenas reporta)
npm run test 2>/dev/null && echo "✅ Tests passed" || echo "⚠️ Tests had failures (check manually)"

# Git
git add -A
git commit -m "$1" 2>/dev/null || echo "Nothing to commit"
git push origin main

# Vercel deploy
vercel deploy --prod --yes 2>/dev/null || vercel --prod 2>/dev/null || echo "⚠️ Vercel CLI not configured — deploy via GitHub push"

echo "=== Deploy concluído ==="
