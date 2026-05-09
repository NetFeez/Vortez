#!/bin/bash

# ====== Configuration ======

set -euo pipefail

BUILD_DIR=build-tests
TEST_PROJECT=tsconfig.tests.json
OUTPUT=output.log

# ====== Preparation process ======

bash scripts/build.sh

# ====== Main Process ======

echo -e "\x1B[37mCleaning build directory...\x1B[0m";
if rm -rf "$BUILD_DIR"; then
  echo -e "\x1B[32mBuild directory cleaned.\x1B[0m";
else
  echo -e "\x1B[31mFailed to clean build directory.\x1B[0m";
  exit 1;
fi

echo -e "\x1B[37mCompiling source files...\x1B[0m";
if npx tsc -p "$TEST_PROJECT" --pretty > "$OUTPUT" 2>&1; then
  echo -e "\x1B[32mCompilation successful.\x1B[0m";
else
  echo -e "\x1B[31mCompilation failed use \x1B[36m'cat $OUTPUT'\x1B[0m";
  echo
  echo -e "\x1B[33m====== Compilation Log Start ======\x1B[0m";
  echo
  cat "$OUTPUT";
  exit 1;
fi