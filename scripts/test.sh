#!/bin/bash
set -euo pipefail

echo "Running tests...";
npx tsc --pretty false
npx tsc -p tsconfig.tests.json --pretty false
node build-tests/test.js