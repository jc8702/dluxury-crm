#!/bin/bash
echo "=== D'Luxury Validate ==="

# TypeScript
echo "--- TypeScript ---"
npx tsc --noEmit && echo "✅ TypeScript OK" || echo "❌ TypeScript errors"

# Testes
echo "--- Tests ---"
npm run test 2>/dev/null && echo "✅ Tests OK" || echo "⚠️ Test failures"

# Build
echo "--- Build ---"
npm run build && echo "✅ Build OK" || echo "❌ Build failed"

# Secrets check
echo "--- Secrets check ---"
grep -r "password\|secret\|api_key" src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v ".test." | grep -v "config.ts" && echo "⚠️ Review above files for hardcoded secrets" || echo "✅ No hardcoded secrets found"

echo "=== Validação concluída ==="
