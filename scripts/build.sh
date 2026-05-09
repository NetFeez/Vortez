#!/bin/bash

# ====== Configuration ======

set -euo pipefail

BUILD_DIR=build
OUTPUT=compile.log

# ====== Preparation process ======

echo -e "\x1B[37mCleaning build directory...\x1B[0m";
if rm -rf "$BUILD_DIR"; then
  echo -e "\x1B[32mBuild directory cleaned.\x1B[0m";
else
  echo -e "\x1B[31mFailed to clean build directory.\x1B[0m";
  exit 1;
fi

# ====== Main Process ======

echo -e "\x1B[37mCompiling source files...\x1B[0m";
if npx tsc --pretty > "$OUTPUT" 2>&1; then
  echo -e "\x1B[32mCompilation successful.\x1B[0m";
else
  echo -e "\x1B[31mCompilation failed use \x1B[36m'cat $OUTPUT'\x1B[0m";
  echo
  echo -e "\x1B[33m====== Compilation Log Start ======\x1B[0m";
  echo
  cat "$OUTPUT";
  exit 1;
fi