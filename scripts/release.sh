#!/bin/bash

# ====== Configuration ======

set -euo pipefail

# ====== Preparation process ======

bash scripts/test.sh

# echo -e "\x1B[36m====== No publishes before refactor tests process ====== \x1B[0m";
# exit 1

# ====== Main Process ======

if [[ "$1" == "--dev" ]]; then
  echo -e "\x1B[37mPublishing with tag 'dev'...\x1B[0m";
  if npm publish --tag dev; then
    echo -e "\x1B[32mDev publish completed successfully!\x1B[0m";
  else
    echo -e "\x1B[31mDev publish failed.\x1B[0m";
    exit 1;
  fi
else
  echo -e "\x1B[37mPublishing...\x1B[0m";
  if npm publish; then
    echo -e "\x1B[32mPublish completed successfully!\x1B[0m";
  else
    echo -e "\x1B[31mPublish failed.\x1B[0m";
    exit 1;
  fi
fi