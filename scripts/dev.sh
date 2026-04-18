#!/bin/bash

# ====== Configuration ======

set -euo pipefail

BUILD_DIR=build
OUTPUT=compile.log

# ====== Preparation process ======

if rm -rf "$BUILD_DIR"; then
  echo -e "\x1B[32mBuild directory cleaned.\x1B[0m";
else
  echo -e "\x1B[31mFailed to clean build directory.\x1B[0m";
  exit 1;
fi

# ====== Main Process ======

echo -e "\x1B[37mStarting TypeScript compiler in watch mode...\x1B[0m";
tsc --watch;