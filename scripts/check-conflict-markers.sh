#!/usr/bin/env bash
set -euo pipefail

if rg -n '^(<<<<<<<|=======|>>>>>>>)' README.md index.html styles.css game.js; then
  echo "❌ Trovati marker di conflitto Git non risolti."
  exit 1
fi

echo "✅ Nessun marker di conflitto trovato."
