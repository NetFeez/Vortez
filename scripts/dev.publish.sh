#!/bin/bash
set -e;

echo "Starting dev publish process...";
bash scripts/compile.sh;

echo "Publishing to npm with dev tag...";
npm publish --tag dev;

echo "Dev publish completed successfully!";