#!/usr/bin/env bash
set -e

echo "=== Render Build Script ==="
npm install
npm run build
echo "=== Build Complete ==="
