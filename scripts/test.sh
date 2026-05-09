#!/bin/bash

# ====== Configuration ======

set -euo pipefail

TEST_MAIN=build-test/test.js

# ====== Preparation process ======

bash scripts/build-test.sh

# ====== Main Process ======

if node "$TEST_MAIN"; then
    echo -e "\x1B[32mTests passed successfully!\x1B[0m";
else
    echo -e "\x1B[31mTests failed.\x1B[0m";
    exit 1;
fi